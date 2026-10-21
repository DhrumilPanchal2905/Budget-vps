// "Remember me" on this device: only the email + display name and whether auto login is set up.
// Nothing secret is stored here (the session is an HttpOnly cookie on web / Keychain-Keystore in the app).
import { kv } from "./storage";

const KEY = "bp-device";

export interface RememberedDevice {
  email: string;
  name: string;
  passkey: boolean;
}

export async function getRememberedDevice(): Promise<RememberedDevice | null> {
  const raw = await kv.get(KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<RememberedDevice>;
    if (typeof v.email !== "string" || !v.email) return null;
    return { email: v.email, name: typeof v.name === "string" ? v.name : "", passkey: Boolean(v.passkey) };
  } catch {
    return null;
  }
}

export function rememberDevice(d: RememberedDevice) {
  return kv.setJSON(KEY, { email: d.email, name: d.name.slice(0, 80), passkey: d.passkey });
}

export function forgetDevice() {
  return kv.remove(KEY);
}
