// Web push (browsers / installed web app): service worker + VAPID — same as the old site, same subscriptions.
import { api } from "./api";
import { getAppConfig } from "./app-config";

export type PushStatus = "unsupported" | "denied" | "enabled" | "disabled";

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!supported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "enabled" : "disabled";
}

export async function enablePush(): Promise<PushStatus> {
  if (!supported()) return "unsupported";
  const cfg = await getAppConfig();
  if (!cfg.vapidPublicKey) throw new Error("Push notifications are not configured on the server yet.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "disabled";
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(cfg.vapidPublicKey) as BufferSource });
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  await api("/api/push/subscribe", { method: "POST", body: { endpoint: json.endpoint, keys: json.keys } });
  return "enabled";
}

export async function disablePush(): Promise<PushStatus> {
  if (!supported()) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api("/api/push/subscribe", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => null);
    await sub.unsubscribe().catch(() => null);
  }
  return "disabled";
}

/** Sign-out: remove this browser's subscription from the account. */
export async function unregisterOnSignOut() {
  if (!supported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await api("/api/push/subscribe", { method: "DELETE", body: { endpoint: sub.endpoint }, timeout: 6000 }).catch(() => null);
  } catch {
    /* ignore */
  }
}

/**
 * Web: never asks for permission on its own (browsers penalise that) — the user enables it in Settings.
 * If this browser already allowed notifications, its subscription is (re)linked to the signed-in account.
 */
export async function syncPushOnStart(): Promise<void> {
  const reg = await registerServiceWorker();
  try {
    if (!reg || Notification.permission !== "granted") return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    await api("/api/push/subscribe", { method: "POST", body: { endpoint: json.endpoint, keys: json.keys } });
  } catch {
    /* push not configured / offline — ignore */
  }
}

/** The service worker opens / focuses the right page itself on web. */
export function listenForNotificationTaps(_go: (url: string) => void): () => void {
  return () => {};
}

export const pushKind = "web" as const;
