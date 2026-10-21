import Constants from "expo-constants";

export const APP_VERSION: string = Constants.expoConfig?.version ?? "0.0.0";
export const APP_BUILD: number = Number((Constants.expoConfig?.extra as { build?: number } | undefined)?.build ?? 0);

/** -1 / 0 / 1 like a normal compare ("4.0.10" > "4.0.9"). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

export interface UpdateState {
  /** a newer version exists (web: newer deploy; app: newer store release) */
  available: boolean;
  /** this version is below the minimum supported one → must update */
  required: boolean;
  latest?: string | null;
  storeUrl?: string | null;
  /** apply: web reloads, app opens the store / starts the in-app update */
  apply: () => void;
  dismiss: () => void;
}
