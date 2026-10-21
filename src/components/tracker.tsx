// Web page-view beacon → Admin → Visitors (same as before; approximate city from the server's IP lookup).
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { usePathname } from "expo-router";
import { api } from "@/lib/api";

export function VisitTracker() {
  const pathname = usePathname();
  const last = useRef("");
  useEffect(() => {
    if (Platform.OS !== "web" || !pathname || pathname === last.current) return;
    last.current = pathname;
    const send = () => void api("/api/track", { method: "POST", body: { path: pathname, referrer: typeof document !== "undefined" ? document.referrer || "" : "" }, keepalive: true }).catch(() => null);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(send, { timeout: 4000 });
    else setTimeout(send, 1500);
  }, [pathname]);
  return null;
}
