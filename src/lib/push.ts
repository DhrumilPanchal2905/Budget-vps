// Native push (Android / iOS): Expo push token → our API → Expo push service → FCM / APNs.
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./api";
import { kv } from "./storage";

export type PushStatus = "unsupported" | "denied" | "enabled" | "disabled";

const TOKEN_KEY = "bp-native-push-token";

// Show notifications while the app is open too (banner + sound).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Budget Pro",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: "#3987e5",
    });
  }
}

function projectId(): string | undefined {
  const c = Constants as unknown as { expoConfig?: { extra?: { eas?: { projectId?: string } } }; easConfig?: { projectId?: string } };
  return c.expoConfig?.extra?.eas?.projectId ?? c.easConfig?.projectId;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!Device.isDevice) return "unsupported";
  const p = await Notifications.getPermissionsAsync();
  if (p.status === "denied" && !p.canAskAgain) return "denied";
  if (p.status !== "granted") return "disabled";
  return (await kv.get(TOKEN_KEY)) ? "enabled" : "disabled";
}

/** Ask permission (if needed), get the token and register it for the signed-in user. */
export async function enablePush(): Promise<PushStatus> {
  if (!Device.isDevice) return "unsupported";
  await ensureChannel();
  let p = await Notifications.getPermissionsAsync();
  if (p.status !== "granted" && p.canAskAgain) p = await Notifications.requestPermissionsAsync();
  if (p.status !== "granted") return p.canAskAgain ? "disabled" : "denied";
  const pid = projectId();
  const { data: token } = await Notifications.getExpoPushTokenAsync(pid ? { projectId: pid } : undefined);
  await api("/api/push/native", {
    method: "POST",
    body: { token, platform: Platform.OS === "ios" ? "ios" : "android", deviceName: (Device.deviceName || Device.modelName || "").slice(0, 120) || undefined, appVersion: Constants.expoConfig?.version },
  });
  await kv.set(TOKEN_KEY, token);
  return "enabled";
}

export async function disablePush(): Promise<PushStatus> {
  const token = await kv.get(TOKEN_KEY);
  if (token) await api("/api/push/native", { method: "DELETE", body: { token } }).catch(() => null);
  await kv.remove(TOKEN_KEY);
  return "disabled";
}

/** Sign-out: stop pushes for this device (the token belongs to the account that registered it). */
export async function unregisterOnSignOut() {
  const token = await kv.get(TOKEN_KEY);
  if (!token) return;
  await api("/api/push/native", { method: "DELETE", body: { token }, timeout: 6000 }).catch(() => null);
  await kv.remove(TOKEN_KEY);
}

/** Re-register silently on every start (tokens can rotate). Asks for permission only the first time. */
export async function syncPushOnStart(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const asked = await kv.get("bp-push-asked");
    const p = await Notifications.getPermissionsAsync();
    if (p.status === "granted" || (!asked && p.canAskAgain)) {
      await kv.set("bp-push-asked", "1");
      await enablePush();
    }
  } catch (e) {
    console.warn("[push] sync failed", (e as Error)?.message);
  }
}

/** Opening a notification → go to its page. Returns an unsubscribe function. */
const handledTaps = new Set<string>();
export function listenForNotificationTaps(go: (url: string) => void): () => void {
  const open = (r: Notifications.NotificationResponse | null) => {
    // the cold-start tap is reported by BOTH getLastNotificationResponseAsync and the listener → open it once
    const id = r?.notification.request.identifier;
    if (id) {
      if (handledTaps.has(id)) return;
      handledTaps.add(id);
    }
    const url = (r?.notification.request.content.data as { url?: string } | undefined)?.url;
    if (typeof url === "string" && url.startsWith("/")) go(url);
  };
  void Notifications.getLastNotificationResponseAsync().then(open).catch(() => null);
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}

export const pushKind = "native" as const;
