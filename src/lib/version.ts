// Native: "update available" from Google Play (in-app update dialog) / App Store (alert → App Store),
// plus a server-side minimum version (APP_MIN_ANDROID / APP_MIN_IOS) that forces an update.
import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import { getAppConfig } from "./app-config";
import { APP_VERSION, compareVersions, type UpdateState } from "./version-common";

/* eslint-disable @typescript-eslint/no-explicit-any */
function loadInAppUpdates(): any | null {
  try {
    // native module — present in store / EAS builds (not in Expo Go)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("sp-react-native-in-app-updates");
  } catch {
    return null;
  }
}

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

export function useUpdateCheck(): UpdateState {
  const [state, setState] = useState<{ available: boolean; required: boolean; latest?: string | null; storeUrl?: string | null }>({ available: false, required: false });
  const [dismissed, setDismissed] = useState(false);
  const lastCheck = useRef(0);
  const handledByStore = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      let latest: string | null = null;
      let min: string | null = null;
      let storeUrl: string | null = null;
      try {
        const cfg = await getAppConfig();
        const v = Platform.OS === "ios" ? cfg.version.ios : cfg.version.android;
        latest = v.latest;
        min = v.min;
        storeUrl = v.storeUrl;
      } catch {
        /* offline — the store check below still works */
      }
      const required = !!min && compareVersions(APP_VERSION, min) < 0;

      // 1) the stores' own update UI
      const mod = loadInAppUpdates();
      if (mod && !handledByStore.current) {
        try {
          const Sp = mod.default ?? mod;
          const iau = new Sp(false);
          const res = await iau.checkNeedsUpdate({ curVersion: APP_VERSION });
          if (res?.shouldUpdate) {
            handledByStore.current = true;
            if (Platform.OS === "android") {
              const kind = mod.IAUUpdateKind ?? { FLEXIBLE: 0, IMMEDIATE: 1 };
              const status = mod.IAUInstallStatus ?? { DOWNLOADED: 11 };
              iau.addStatusUpdateListener?.((s: { status: number }) => {
                if (s?.status === status.DOWNLOADED) iau.installUpdate?.();
              });
              await iau.startUpdate({ updateType: required ? kind.IMMEDIATE : kind.FLEXIBLE });
            } else {
              await iau.startUpdate({
                title: "Update available",
                message: "A new version of Budget Pro is on the App Store. Update now for the latest features and fixes.",
                buttonUpgradeText: "Update",
                buttonCancelText: required ? undefined : "Later",
                forceUpgrade: required,
              });
            }
          }
        } catch {
          /* not installed from a store (dev build / sideloaded) */
        }
      }

      // 2) our own check (backup + "force update")
      const available = !!latest && compareVersions(APP_VERSION, latest) < 0;
      setState({ available: available && !handledByStore.current, required, latest, storeUrl });
    };
    void check();
    const sub = AppState.addEventListener("change", (s) => s === "active" && void check());
    return () => sub.remove();
  }, []);

  return {
    available: state.available && !dismissed,
    required: state.required,
    latest: state.latest,
    storeUrl: state.storeUrl,
    apply: () => {
      if (state.storeUrl) void Linking.openURL(state.storeUrl);
    },
    dismiss: () => setDismissed(true),
  };
}
