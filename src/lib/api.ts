// API client for web + Android + iOS. Every request/response body is end-to-end encrypted (see secure-channel.ts).
//   Web    → cookies (HttpOnly, set by the API on budbackend… — same site as the frontend), credentials: "include"
//   Native → the same cookies kept in the encrypted device store (cookie-jar.ts), sent as "x-bp-cookie"
import { API_URL, IS_NATIVE } from "./config";
import { applySetCookie, cookieHeader, loadJar } from "./cookie-jar";
import { resetSecureChannel, secureChannel } from "./secure-channel";
import { emit } from "./events";

export class ApiClientError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export interface ApiResult<T> {
  data: T;
  message?: string;
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /** ms before giving up (default 30 s) */
  timeout?: number;
  keepalive?: boolean;
}

const NO_LOGOUT = ["/api/auth/login", "/api/auth/register", "/api/auth/passkey/login", "/api/auth/password/", "/api/track", "/api/auth/me"];

/** Headers that identify this client to the API (cookie bridge on native). */
export async function baseHeaders(): Promise<Record<string, string>> {
  if (!IS_NATIVE) return {};
  await loadJar();
  const h: Record<string, string> = { "x-bp-client": "native" };
  const c = cookieHeader();
  if (c) h["x-bp-cookie"] = c;
  return h;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}, retried = false): Promise<ApiResult<T>> {
  const chan = path.startsWith("/api/") ? await secureChannel() : null;
  const headers: Record<string, string> = await baseHeaders();
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (chan) {
    headers["x-bp-key"] = chan.pub;
    if (body !== undefined) body = JSON.stringify({ __e: await chan.seal(body) });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout ?? 30_000);
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener("abort", onAbort);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method || "GET",
      credentials: IS_NATIVE ? "omit" : "include",
      headers,
      body,
      signal: ctrl.signal,
      keepalive: opts.keepalive,
      // RN's fetch polyfill turns cache:"no-store" into an extra "?_=<timestamp>" query param — web only
      ...(IS_NATIVE ? {} : { cache: "no-store" as RequestCache }),
    });
  } catch {
    if (opts.signal?.aborted) throw new ApiClientError(0, "Request cancelled.");
    throw new ApiClientError(0, "Network error — check your connection and try again.");
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
  if (IS_NATIVE) applySetCookie(res.headers.get("x-bp-set-cookie"));

  if (res.headers.get("x-bp-rekey") === "1") {
    // The server couldn't open our encrypted body (new key after a deploy) — nothing ran, so retrying is safe.
    resetSecureChannel();
    if (!retried) return api<T>(path, opts, true);
  }
  let json: { success?: boolean; message?: string; data?: T; errors?: Record<string, string>; __e?: string } = {};
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (chan && typeof json.__e === "string") {
    try {
      json = JSON.parse(await chan.open(json.__e));
    } catch {
      resetSecureChannel();
      // Only read-only requests are retried — a write may already have happened on the server.
      if (!retried && (!opts.method || opts.method === "GET")) return api<T>(path, opts, true);
      throw new ApiClientError(0, "Secure connection failed — please try again.");
    }
  }
  if (res.status === 401 && !NO_LOGOUT.some((p) => path.startsWith(p))) emit("unauthorized");
  if (!res.ok || json.success === false) {
    throw new ApiClientError(res.status, json.message || "Something went wrong. Please try again.", json.errors);
  }
  return { data: json.data as T, message: json.message };
}

/** SWR fetcher → returns `data` only. */
export const fetcher = async <T = unknown>(path: string): Promise<T> => (await api<T>(path)).data;

export function qs(params: Record<string, string | number | undefined | null | false>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "" && v !== false) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}
