// "New version available" — web: refresh banner after a deploy · app: store update (or forced update screen).
import { Modal, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Download, RefreshCw, X } from "lucide-react-native";
import { useUpdateCheck } from "@/lib/version";
import { Button, IconButton, Text, useBreakpoint, useTheme } from "@/ui";

export function UpdateNotice() {
  const t = useTheme();
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const u = useUpdateCheck();

  if (u.required) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 380, borderRadius: 18, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface, padding: 22, gap: 10, alignItems: "center" }}>
            <Download size={28} color={t.c.primary} />
            <Text size="lg" weight="semibold" center>
              Update required
            </Text>
            <Text size="sm" color="muted" center>
              This version of Budget Pro is no longer supported. Please update to {u.latest ? `version ${u.latest}` : "the latest version"} to continue.
            </Text>
            <Button icon={Download} full onPress={u.apply} style={{ marginTop: 8 }}>
              {Platform.OS === "ios" ? "Open App Store" : "Open Google Play"}
            </Button>
          </View>
        </View>
      </Modal>
    );
  }
  if (!u.available) return null;
  const web = Platform.OS === "web";
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 12, right: 12, bottom: (bp.compact ? 84 : 20) + insets.bottom, alignItems: bp.sm ? "flex-start" : "stretch", zIndex: 900 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, maxWidth: 440, borderRadius: 14, borderWidth: 1, borderColor: t.a("primary", 0.4), backgroundColor: t.c.surface, paddingLeft: 14, paddingRight: 6, paddingVertical: 10, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
        <RefreshCw size={18} color={t.c.primary} />
        <View style={{ flex: 1 }}>
          <Text size="sm" weight="semibold">
            New version available{u.latest ? ` (${u.latest})` : ""}
          </Text>
          <Text size="xs" color="muted">
            {web ? "Refresh to get the latest Budget Pro." : "Update from the store for the latest features and fixes."}
          </Text>
        </View>
        <Button size="sm" onPress={u.apply}>
          {web ? "Refresh" : "Update"}
        </Button>
        <IconButton icon={X} label="Dismiss" size={32} onPress={u.dismiss} />
      </View>
    </View>
  );
}
