// Web: after `npm run build:web` + upload, every open tab notices the new /version.json (checked on focus and
// every 5 minutes) and shows "New version available — Refresh". No stale app after a deploy.
import { useEffect, useState } from "react";
import { APP_BUILD, APP_VERSION, type UpdateState } from "./version-common";

const EVERY_MS = 5 * 60 * 1000;

export function useUpdateCheck(): UpdateState {
  const [latest, setLatest] = useState<{ version: string; build: number } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let stop = false;
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const v = (await res.json()) as { version?: string; build?: number };
        if (!stop && v.version) setLatest({ version: v.version, build: Number(v.build ?? 0) });
      } catch {
        /* offline */
      }
    };
    const t0 = setTimeout(check, 4000);
    const iv = setInterval(check, EVERY_MS);
    const onVis = () => !document.hidden && void check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      clearTimeout(t0);
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const key = latest ? `${latest.version}+${latest.build}` : null;
  const available = !!latest && (latest.version !== APP_VERSION || latest.build !== APP_BUILD) && dismissed !== key;
  return {
    available,
    required: false,
    latest: latest?.version ?? null,
    storeUrl: null,
    apply: () => {
      void (async () => {
        try {
          const reg = await navigator.serviceWorker?.getRegistration("/");
          await reg?.update();
        } catch {
          /* ignore */
        }
        window.location.reload();
      })();
    },
    dismiss: () => setDismissed(key),
  };
}
