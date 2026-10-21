// Full-screen states used by layouts.
import { View, ActivityIndicator } from "react-native";
import { WifiOff } from "lucide-react-native";
import { Button, Text, useTheme } from "@/ui";

export function LoadingScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.c.bg }}>
      <ActivityIndicator color={t.c.muted} />
    </View>
  );
}

export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.c.bg, padding: 24, gap: 10 }}>
      <WifiOff size={30} color={t.c.muted} />
      <Text size="lg" weight="semibold">
        You&apos;re offline
      </Text>
      <Text size="sm" color="muted" center style={{ maxWidth: 320 }}>
        Budget Pro couldn&apos;t reach the server. Check your internet connection and try again.
      </Text>
      <Button style={{ marginTop: 10 }} onPress={onRetry}>
        Try again
      </Button>
    </View>
  );
}
