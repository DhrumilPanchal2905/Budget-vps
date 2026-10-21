// "Auto login" in the Android / iOS app: platform passkeys (fingerprint / Face ID / screen lock) through
// Android Credential Manager / iOS AuthenticationServices. Same server endpoints as the website.
// Requires the domain association files (assetlinks.json / apple-app-site-association) — see DEPLOY.md.
import { api } from "./api";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mod(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-passkeys");
  } catch {
    return null;
  }
}

export async function deviceLoginSupported(): Promise<boolean> {
  const m = mod();
  if (!m?.isSupported) return false;
  try {
    return Boolean(await Promise.resolve(m.isSupported()));
  } catch {
    return false;
  }
}

function friendly(e: unknown): Error {
  const msg = String((e as Error)?.message ?? "");
  if (/cancel/i.test(msg)) return new Error("Device verification was cancelled.");
  if (/exist|already/i.test(msg)) return new Error("This device is already set up for auto login.");
  return new Error("Device verification failed. Make sure a screen lock (fingerprint / face / PIN) is set up.");
}

export async function enableDeviceLogin(): Promise<void> {
  const m = mod();
  if (!m) throw new Error("Auto login isn't available in this build.");
  const { data } = await api<{ options: Record<string, unknown> }>("/api/auth/passkey/register/options", { method: "POST", body: {} });
  let response: unknown;
  try {
    response = await m.create(data.options);
  } catch (e) {
    throw friendly(e);
  }
  if (!response) throw new Error("Device verification was cancelled.");
  await api("/api/auth/passkey/register/verify", { method: "POST", body: { response } });
}

export async function loginWithDevice<U = { id: string; email: string; name: string }>(email?: string): Promise<U> {
  const m = mod();
  if (!m) throw new Error("Auto login isn't available in this build.");
  const { data } = await api<{ options: Record<string, unknown> }>("/api/auth/passkey/login/options", { method: "POST", body: email ? { email } : {} });
  let response: unknown;
  try {
    response = await m.get(data.options);
  } catch (e) {
    throw friendly(e);
  }
  if (!response) throw new Error("Device verification was cancelled.");
  const res = await api<{ user: U }>("/api/auth/passkey/login/verify", { method: "POST", body: { response } });
  return res.data.user;
}
