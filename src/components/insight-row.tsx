import { View } from "react-native";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from "lucide-react-native";
import { Text, useTheme } from "@/ui";

export interface InsightView {
  id: string;
  severity: "positive" | "info" | "warning" | "critical";
  title: string;
  message: string;
  advanced: boolean;
  metric?: string;
}

const META = {
  positive: { icon: CheckCircle2, tone: "success", label: "Good" },
  info: { icon: Info, tone: "info", label: "Info" },
  warning: { icon: AlertTriangle, tone: "warning", label: "Attention" },
  critical: { icon: AlertOctagon, tone: "danger", label: "Critical" },
} as const;

export function InsightRow({ insight, compact }: { insight: InsightView; compact?: boolean }) {
  const t = useTheme();
  const m = META[insight.severity] ?? META.info;
  const Icon = m.icon;
  return (
    <View style={[{ flexDirection: "row", gap: 12 }, compact ? { paddingVertical: 12 } : { borderRadius: 14, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface, padding: 16 }]}>
      <View accessibilityLabel={m.label} style={{ width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: t.a(m.tone, 0.2), backgroundColor: t.a(m.tone, 0.1), alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={t.c[m.tone]} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <Text size="sm" weight="medium">
            {insight.title}
          </Text>
          {insight.metric ? (
            <View style={{ borderRadius: 6, backgroundColor: t.c.surface2, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text size="2xs" color="muted" tabular>
                {insight.metric}
              </Text>
            </View>
          ) : null}
          {insight.advanced && !compact ? (
            <View style={{ borderRadius: 6, borderWidth: 1, borderColor: t.a("primary", 0.25), backgroundColor: t.a("primary", 0.1), paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text size="2xs" weight="medium" color="primary">
                ADVANCED
              </Text>
            </View>
          ) : null}
        </View>
        <Text size="sm" color="muted" style={{ marginTop: 2 }}>
          {insight.message}
        </Text>
      </View>
    </View>
  );
}
