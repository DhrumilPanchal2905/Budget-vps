// Public website (SEO pages). Plain stack, no app chrome — PublicShell draws the header/footer per page.
import { Stack } from "expo-router";
import { useTheme } from "@/ui";

export default function PublicLayout() {
  const t = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.bg } }} />;
}
