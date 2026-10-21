import type { ReactNode } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ShieldAlert } from "lucide-react-native";
import type { Permission } from "@/shared/permissions";
import { Button, Card, Text, useTheme } from "@/ui";
import { useSession } from "./session";

/** UI-only guard (the API enforces the same permission server-side). */
export function RequirePerm({ perm, admin, children }: { perm?: Permission | Permission[]; admin?: boolean; children: ReactNode }) {
  const { can, isAdmin } = useSession();
  const t = useTheme();
  const perms = perm ? (Array.isArray(perm) ? perm : [perm]) : [];
  const allowed = (!admin || isAdmin) && perms.every((p) => can(p));
  if (allowed) return <>{children}</>;
  return (
    <View style={{ padding: 16, alignItems: "center" }}>
      <Card padded style={{ maxWidth: 420, width: "100%", alignItems: "center", marginTop: 40, paddingVertical: 32 }}>
        <ShieldAlert size={32} color={t.c.warning} />
        <Text size="md" weight="semibold" style={{ marginTop: 12 }}>
          Access restricted
        </Text>
        <Text size="sm" color="muted" center style={{ marginTop: 4 }}>
          You do not have permission to view this page. Contact an administrator if you need access.
        </Text>
        <Button variant="secondary" style={{ marginTop: 18 }} onPress={() => router.replace("/dashboard")}>
          Back to dashboard
        </Button>
      </Card>
    </View>
  );
}
