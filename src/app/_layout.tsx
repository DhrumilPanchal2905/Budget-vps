import "@/lib/polyfills";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Providers } from "@/components/providers";
import { useAuth } from "@/components/session";
import { UpdateNotice } from "@/components/update-notice";
import { CheckoutHost } from "@/components/checkout-host";
import { listenForNotificationTaps } from "@/lib/push";
import { useTheme } from "@/ui";

if (Platform.OS !== "web") void SplashScreen.preventAutoHideAsync().catch(() => null);

function Root() {
  const t = useTheme();
  const { status } = useAuth();
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const ready = fontsLoaded && status !== "loading";

  useEffect(() => {
    if (ready && Platform.OS !== "web") void SplashScreen.hideAsync().catch(() => null);
  }, [ready]);

  useEffect(() => {
    if (Platform.OS !== "web") void SystemUI.setBackgroundColorAsync(t.c.bg).catch(() => null);
  }, [t.c.bg]);

  // tapping a push notification opens its page (only once the navigator + session check are ready, so a
  // cold-start tap doesn't navigate before the root layout has mounted)
  useEffect(() => (ready ? listenForNotificationTaps((url) => router.push(url as never)) : undefined), [ready]);

  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.bg }, animation: Platform.OS === "ios" ? "default" : "fade" }} />
      <UpdateNotice />
      <CheckoutHost />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Providers>
      <Root />
    </Providers>
  );
}
