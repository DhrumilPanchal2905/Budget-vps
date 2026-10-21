import { View } from "react-native";
import { router, Stack } from "expo-router";
import { Button, Text, useTheme } from "@/ui";
import { useAuth } from "@/components/session";

export default function NotFound() {
  const t = useTheme();
  const { status } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: t.c.bg, gap: 8 }}>
      <Stack.Screen options={{ title: "Page not found" }} />
      <Text size="4xl" weight="bold" color="muted">
        404
      </Text>
      <Text size="lg" weight="semibold">
        This page doesn&apos;t exist
      </Text>
      <Text size="sm" color="muted" center>
        The link may be broken or the page was moved.
      </Text>
      <Button style={{ marginTop: 16 }} onPress={() => router.replace(status === "in" ? "/dashboard" : "/")}>
        {status === "in" ? "Go to dashboard" : "Go home"}
      </Button>
    </View>
  );
}
