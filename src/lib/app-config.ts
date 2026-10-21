import useSWR from "swr";
import { api } from "./api";

export interface AppConfig {
  vapidPublicKey: string | null;
  nativePush: boolean;
  payments: { razorpay: boolean; ios: boolean; android: boolean };
  angel: boolean;
  version: { android: { latest: string | null; min: string | null; storeUrl: string | null }; ios: { latest: string | null; min: string | null; storeUrl: string | null } };
  business: { name: string; owner: string; email: string; phone: string; address: string; gstin: string | null };
}

let cached: Promise<AppConfig> | null = null;
/** Public runtime config from the API (cached for the app session). */
export function getAppConfig(): Promise<AppConfig> {
  cached ??= api<AppConfig>("/api/app/config")
    .then((r) => r.data)
    .catch((e) => {
      cached = null;
      throw e;
    });
  return cached;
}

export function useAppConfig() {
  return useSWR<AppConfig>("app-config", () => getAppConfig(), { revalidateOnFocus: false, dedupingInterval: 60_000 });
}
