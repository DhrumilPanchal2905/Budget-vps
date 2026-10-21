// Signed-in area. Every screen inside needs a valid session (the API checks it on every request too).
import { useEffect } from "react";
import { Platform } from "react-native";
import { Redirect, Stack, usePathname } from "expo-router";
import Head from "expo-router/head";
import { onBeforeSignOut, SessionProvider, useAuth } from "@/components/session";
import { RealtimeProvider } from "@/components/realtime";
import { AppShell } from "@/components/shell";
import { AngelProvider } from "@/components/angel/angel-provider";
import { LoadingScreen, OfflineScreen } from "@/components/screens";
import { VisitTracker } from "@/components/tracker";
import { syncPushOnStart, unregisterOnSignOut } from "@/lib/push";
import { useTheme } from "@/ui";

function PushSync() {
  useEffect(() => {
    const t = setTimeout(() => void syncPushOnStart(), 1500);
    const off = onBeforeSignOut(() => unregisterOnSignOut());
    return () => {
      clearTimeout(t);
      off();
    };
  }, []);
  return null;
}

export default function AppLayout() {
  const t = useTheme();
  const { status, retry } = useAuth();
  const pathname = usePathname();
  const head =
    Platform.OS === "web" ? (
      <Head>
        <title>Budget Pro</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
    ) : null;
  if (status === "loading")
    return (
      <>
        {head}
        <LoadingScreen />
      </>
    );
  if (status === "offline") return <OfflineScreen onRetry={retry} />;
  if (status === "out") return <Redirect href={(Platform.OS === "web" && pathname && pathname !== "/dashboard" ? `/login?next=${encodeURIComponent(pathname)}` : "/login") as never} />;
  return (
    <SessionProvider>
      {head}
      <RealtimeProvider>
        <AngelProvider>
          <PushSync />
          <VisitTracker />
          <AppShell>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.bg }, animation: Platform.OS === "ios" ? "default" : "fade" }} />
          </AppShell>
        </AngelProvider>
      </RealtimeProvider>
    </SessionProvider>
  );
}
