// Native app only: the session lives in an HttpOnly cookie on the web. In the app the API returns the same
// cookies in the "x-bp-set-cookie" header and we keep them in the device's encrypted store (iOS Keychain /
// Android Keystore via expo-secure-store), then send them back in "x-bp-cookie". Same server logic, same security.
import * as SecureStore from "expo-secure-store";
import { IS_WEB } from "./config";
import { fromB64url, utf8Decode } from "./bytes";

const KEY = "bp_cookie_jar_v1";
let jar: Record<string, string> = {};
let loaded: Promise<void> | null = null;

export function loadJar(): Promise<void> {
  if (IS_WEB) return Promise.resolve();
  return (loaded ??= SecureStore.getItemAsync(KEY)
    .then((raw) => {
      jar = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    })
    .catch(() => {
      jar = {};
    }));
}

function persist() {
  void SecureStore.setItemAsync(KEY, JSON.stringify(jar)).catch(() => null);
}

/** Value for the "x-bp-cookie" request header. */
export function cookieHeader(): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");
}

/** Apply the server's "x-bp-set-cookie" header. */
export function applySetCookie(header: string | null) {
  if (!header || IS_WEB) return;
  try {
    const list = JSON.parse(utf8Decode(fromB64url(header))) as { name: string; value: string; maxAge: number | null }[];
    let changed = false;
    for (const c of list) {
      if (!c?.name) continue;
      if (c.maxAge !== null && c.maxAge <= 0) {
        if (c.name in jar) {
          delete jar[c.name];
          changed = true;
        }
      } else if (jar[c.name] !== c.value) {
        jar[c.name] = c.value;
        changed = true;
      }
    }
    if (changed) persist();
  } catch {
    /* malformed header — ignore */
  }
}

export function hasSessionCookie(): boolean {
  return Object.keys(jar).some((k) => k.endsWith("bp_session") && Boolean(jar[k]));
}

export function clearJar() {
  jar = {};
  if (!IS_WEB) void SecureStore.deleteItemAsync(KEY).catch(() => null);
}
