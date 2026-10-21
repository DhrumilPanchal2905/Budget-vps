// Realtime: one WebSocket to the API (web, Android, iOS). Keeps every SWR cache in sync — same events as before.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { useSWRConfig } from "swr";
import { API_URL, IS_NATIVE } from "@/lib/config";
import { baseHeaders } from "@/lib/api";
import { secureChannel, type Channel } from "@/lib/secure-channel";
import { useToast } from "@/ui";
import { useAuth, useSession } from "./session";

type Mode = "connecting" | "live" | "offline";
const RealtimeContext = createContext<{ mode: Mode }>({ mode: "connecting" });
export const useRealtime = () => useContext(RealtimeContext);

const startsWithAny = (prefixes: string[]) => (key: unknown) => typeof key === "string" && prefixes.some((p) => key.startsWith(p));

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { signOut } = useAuth();
  const { mutate } = useSWRConfig();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("connecting");

  const handle = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      switch (event) {
        case "finance:changed":
          void mutate(startsWithAny(["/api/finance", "/api/dashboard", "/api/analytics", "/api/insights", "/api/plan", "/api/admin/users", "/api/budgets", "/api/goals"]));
          break;
        case "notification:new":
          void mutate(startsWithAny(["/api/notifications", "/api/dashboard"]));
          if (!payload.silent && payload.id !== "sync" && typeof payload.title === "string") toast.info(payload.title, typeof payload.message === "string" ? payload.message : undefined);
          break;
        case "admin:activity":
          void mutate(startsWithAny(["/api/admin/stats", "/api/admin/audit", "/api/admin/users", "/api/admin/database", "/api/admin/payments"]));
          break;
        case "visitor:new":
          void mutate(startsWithAny(["/api/admin/visitors", "/api/admin/stats"]));
          break;
        case "profile:changed":
          void mutate(startsWithAny(["/api/auth/me", "/api/plan", "/api/insights", "/api/dashboard", "/api/billing"]));
          break;
        case "session:revoked":
          void signOut({ expired: true });
          break;
      }
    },
    [mutate, toast, signOut],
  );
  const handleRef = useRef(handle);
  handleRef.current = handle;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let chan: Channel | null = null;
    let disposed = false;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let lastMs = 0;
    let wasLive = false;
    let opening = false; // an open() is awaiting the key / headers — don't start a second socket
    let paused = false; // closed on purpose (background / hidden tab) — don't auto-reconnect

    const parse = async (s: string): Promise<Record<string, unknown>> => {
      try {
        if (chan && s && s[0] !== "{") return JSON.parse(await chan.open(s)) as Record<string, unknown>;
        return JSON.parse(s) as Record<string, unknown>;
      } catch {
        return {};
      }
    };

    const open = async () => {
      if (ws || disposed || opening) return;
      opening = true;
      try {
        await connect();
      } finally {
        opening = false;
      }
    };

    const connect = async () => {
      setMode("connecting");
      chan = await secureChannel();
      if (ws || disposed || paused) return;
      const q: string[] = [];
      if (chan) q.push(`k=${encodeURIComponent(chan.pub)}`);
      if (lastMs) q.push(`since=${lastMs}`);
      const url = `${API_URL.replace(/^http/, "ws")}/api/realtime/ws${q.length ? `?${q.join("&")}` : ""}`;
      let sock: WebSocket;
      try {
        if (IS_NATIVE) {
          const headers = await baseHeaders();
          if (ws || disposed || paused) return;
          // React Native's WebSocket accepts headers (3rd argument); the cookie jar authenticates the socket.
          sock = new (WebSocket as unknown as new (u: string, p: undefined, o: { headers: Record<string, string> }) => WebSocket)(url, undefined, { headers });
        } else sock = new WebSocket(url);
      } catch {
        schedule();
        return;
      }
      ws = sock;
      sock.onmessage = (m) => {
        void (async () => {
          let msg: { id?: string; event?: string; data?: string };
          try {
            msg = JSON.parse(String(m.data));
          } catch {
            return;
          }
          if (msg.event === "ready") {
            retry = 0;
            setMode("live");
            // after a reconnect, refetch everything once so nothing missed is shown stale
            if (wasLive) void mutate(() => true);
            wasLive = true;
            return;
          }
          if (msg.id) {
            const ms = Number(String(msg.id).split("-")[0]);
            if (Number.isFinite(ms)) lastMs = Math.max(lastMs, ms);
          }
          if (msg.event) handleRef.current(msg.event, await parse(msg.data ?? "{}"));
        })();
      };
      sock.onclose = () => {
        if (ws === sock) ws = null;
        if (!disposed && !paused) {
          setMode("offline");
          schedule();
        }
      };
      sock.onerror = () => {
        try {
          sock.close();
        } catch {
          /* already closed */
        }
      };
    };

    const schedule = () => {
      clearTimeout(retryTimer);
      if (disposed || paused) return;
      const delay = Math.min(30_000, 1000 * 2 ** retry) + Math.random() * 500;
      retry += 1;
      retryTimer = setTimeout(() => void open(), delay);
    };

    const close = () => {
      clearTimeout(retryTimer);
      const s = ws;
      ws = null;
      try {
        s?.close();
      } catch {
        /* ignore */
      }
    };

    // pause while the app is in the background / the tab is hidden (saves battery and server work)
    const onActive = () => {
      clearTimeout(hideTimer);
      paused = false;
      if (!ws) {
        retry = 0;
        void open();
      }
    };
    const onHidden = () => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        paused = true;
        close();
      }, 30_000);
    };

    void open();
    let cleanupVis = () => {};
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const fn = () => (document.hidden ? onHidden() : onActive());
      document.addEventListener("visibilitychange", fn);
      cleanupVis = () => document.removeEventListener("visibilitychange", fn);
    } else {
      const sub = AppState.addEventListener("change", (s) => (s === "active" ? onActive() : onHidden()));
      cleanupVis = () => sub.remove();
    }
    return () => {
      disposed = true;
      clearTimeout(hideTimer);
      cleanupVis();
      close();
    };
  }, [user.id, user.role, mutate]);

  return <RealtimeContext.Provider value={{ mode }}>{children}</RealtimeContext.Provider>;
}
