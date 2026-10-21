// "Auto login" on the web: WebAuthn passkeys (fingerprint / Face ID / Windows Hello / device PIN). Same as before.
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { api } from "./api";

export async function deviceLoginSupported(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function friendly(e: unknown): Error {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError") return new Error("Device verification was cancelled or timed out.");
  if (name === "InvalidStateError") return new Error("This device is already set up for auto login.");
  if (name === "SecurityError") return new Error("Auto login only works on the official site address (HTTPS).");
  return e instanceof Error ? e : new Error("Device verification failed.");
}

export async function enableDeviceLogin(): Promise<void> {
  const { data } = await api<{ options: Record<string, unknown> }>("/api/auth/passkey/register/options", { method: "POST", body: {} });
  let response;
  try {
    response = await startRegistration({ optionsJSON: data.options as never });
  } catch (e) {
    throw friendly(e);
  }
  await api("/api/auth/passkey/register/verify", { method: "POST", body: { response } });
}

export async function loginWithDevice<U = { id: string; email: string; name: string }>(email?: string): Promise<U> {
  const { data } = await api<{ options: Record<string, unknown> }>("/api/auth/passkey/login/options", { method: "POST", body: email ? { email } : {} });
  let response;
  try {
    response = await startAuthentication({ optionsJSON: data.options as never });
  } catch (e) {
    throw friendly(e);
  }
  const res = await api<{ user: U }>("/api/auth/passkey/login/verify", { method: "POST", body: { response } });
  return res.data.user;
}
