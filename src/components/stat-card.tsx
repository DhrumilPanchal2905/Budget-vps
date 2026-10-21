import type { ReactNode } from "react";
import { View } from "react-native";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react-native";
import { Card, Text, useTheme } from "@/ui";

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  changeGoodWhenUp = true,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  change?: number | null;
  changeGoodWhenUp?: boolean;
  hint?: ReactNode;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const t = useTheme();
  const up = (change ?? 0) >= 0;
  const good = change === null || change === undefined ? null : up === changeGoodWhenUp;
  return (
    <Card style={{ padding: 16, minHeight: 116 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <Text size="xs" weight="medium" color="muted" style={{ flex: 1 }} numberOfLines={2}>
          {label}
        </Text>
        {Icon ? (
          <View style={{ width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface2, alignItems: "center", justifyContent: "center" }}>
            <Icon size={16} color={t.c.muted} />
          </View>
        ) : null}
      </View>
      <Text size="xl" weight="semibold" tabular tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} color={tone && tone !== "default" ? tone : "fg"} style={{ marginTop: 8 }}>
        {value}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 6, minHeight: 18 }}>
        {change !== null && change !== undefined ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            {up ? <ArrowUpRight size={14} color={good ? t.c.success : t.c.danger} /> : <ArrowDownRight size={14} color={good ? t.c.success : t.c.danger} />}
            <Text size="xs" weight="medium" color={good ? "success" : "danger"}>
              {Math.abs(change)}%
            </Text>
          </View>
        ) : null}
        {hint ? (
          typeof hint === "string" ? (
            <Text size="xs" color="muted" style={{ flexShrink: 1 }}>
              {hint}
            </Text>
          ) : (
            hint
          )
        ) : null}
      </View>
    </Card>
  );
}
