// Session: who is signed in (the server is the source of truth — /api/auth/me), permissions, money formatting.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { router } from "expo-router";
import useSWR, { useSWRConfig } from "swr";
import { api, ApiClientError } from "@/lib/api";
import { clearJar, hasSessionCookie, loadJar } from "@/lib/cookie-jar";
import { IS_NATIVE } from "@/lib/config";
import { on } from "@/lib/events";
import { formatMoney } from "@/shared/money";
import type { Permission } from "@/shared/permissions";
import { useThemeCtl, type ThemeId } from "@/ui";
import { THEMES } from "@/shared/themes";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  plan: "free" | "plus" | "pro" | "unlimited";
  planExpiresAt: string | null;
  planSource: string | null;
  status: string;
  currency: string;
  theme: string;
  language: string;
  emailVerified: boolean;
  permissions: Permission[];
  createdAt: string;
  lastLoginAt: string | null;
}

type Status = "loading" | "in" | "out" | "offline";

interface AuthCtx {
  status: Status;
  /** retry the start-up check (after "offline") */
  retry: () => void;
  user: PublicUser | null;
  /** call after a successful sign-in / sign-up (the API already set the session cookie) */
  signedIn: (user: PublicUser) => void;
  signOut: (opts?: { expired?: boolean; silent?: boolean }) => Promise<void>;
  setUser: (u: PublicUser) => void;
}
const AuthContext = createContext<AuthCtx>({ status: "loading", retry: () => {}, user: null, signedIn: () => {}, signOut: async () => {}, setUser: () => {} });
export const useAuth = () => useContext(AuthContext);

/** Hooks that run around sign-out (push token removal etc.), registered by other providers. */
const beforeSignOut = new Set<() => Promise<unknown> | void>();
export function onBeforeSignOut(fn: () => Promise<unknown> | void) {
  beforeSignOut.add(fn);
  return () => beforeSignOut.delete(fn);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUserState] = useState<PublicUser | null>(null);
  const { mutate } = useSWRConfig();
  const { setTheme, themeId } = useThemeCtl();
  const signingOut = useRef(false);

  const applyUser = useCallback(
    (u: PublicUser) => {
      setUserState(u);
      setStatus("in");
      // the account's theme follows the user across devices
      if (u.theme && u.theme !== themeId && THEMES.some((x) => x.id === u.theme)) setTheme(u.theme as ThemeId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setTheme],
  );

  // boot: ask the server who we are
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (IS_NATIVE) {
        await loadJar();
        if (!hasSessionCookie()) {
          if (!cancelled) setStatus("out");
          return;
        }
      }
      try {
        const { data } = await api<{ user: PublicUser }>("/api/auth/me", { timeout: 15_000 });
        if (!cancelled) applyUser(data.user);
      } catch (e) {
        if (cancelled) return;
        const st = (e as ApiClientError).status;
        // no connection / server unreachable: don't throw the user out — show "offline, retry"
        setStatus(st === 0 || st >= 500 ? "offline" : "out");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUser, attempt]);
  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((a) => a + 1);
  }, []);

  const clearLocal = useCallback(() => {
    clearJar();
    setUserState(null);
    setStatus("out");
    // drop every cached response of the previous user
    void mutate(() => true, undefined, { revalidate: false });
  }, [mutate]);

  const signOut = useCallback(
    async (opts: { expired?: boolean; silent?: boolean } = {}) => {
      if (signingOut.current) return;
      signingOut.current = true;
      try {
        if (!opts.expired) {
          await Promise.allSettled([...beforeSignOut].map((fn) => fn()));
          await api("/api/auth/logout", { method: "POST", timeout: 8000 }).catch(() => null);
        }
      } finally {
        clearLocal();
        signingOut.current = false;
        if (!opts.silent) router.replace(opts.expired ? "/login?expired=1" : "/login");
      }
    },
    [clearLocal],
  );

  // any API call answering 401 → the session is gone (only while signed in — otherwise a 401 on a public / auth
  // page would bounce the user to /login?expired=1 again and again)
  const statusRef = useRef(status);
  statusRef.current = status;
  useEffect(
    () =>
      on("unauthorized", () => {
        if (statusRef.current === "in") void signOut({ expired: true });
      }),
    [signOut],
  );

  const value = useMemo<AuthCtx>(() => ({ status, retry, user, signedIn: applyUser, signOut, setUser: setUserState }), [status, retry, user, applyUser, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------- Session (signed-in area) ----------------
interface SessionCtx {
  user: PublicUser;
  can: (p: Permission) => boolean;
  isAdmin: boolean;
  refresh: () => void;
  money: (v: number, compact?: boolean) => string;
}
const SessionContext = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const initial = auth.user!;
  const { data, mutate } = useSWR<{ user: PublicUser }>("/api/auth/me", { fallbackData: { user: initial }, revalidateOnMount: false });
  const user = data?.user ?? initial;
  const setAuthUser = auth.setUser;
  useEffect(() => {
    if (data?.user) setAuthUser(data.user);
  }, [data?.user, setAuthUser]);

  const value = useMemo<SessionCtx>(
    () => ({
      user,
      can: (p) => user.permissions.includes(p),
      isAdmin: user.role === "admin",
      refresh: () => void mutate(),
      money: (v, compact) => formatMoney(v, user.currency, compact),
    }),
    [user, mutate],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** null on public pages (no session). */
export function useSessionOptional(): SessionCtx | null {
  return useContext(SessionContext);
}

export function useSession(): SessionCtx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
