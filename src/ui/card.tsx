import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "./theme";
import { Text } from "./text";

export function Card({ children, style, padded, onPress, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; onPress?: () => void; tone?: "warning" | "danger" | "primary" | "success" }) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: tone ? t.a(tone, 0.06) : t.c.surface,
    borderColor: tone ? t.a(tone, 0.35) : t.c.border,
    borderWidth: 1,
    borderRadius: 16,
    ...(padded ? { padding: 16 } : null),
    ...(t.dark ? null : { boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }),
  };
  if (onPress)
    return (
      <Pressable onPress={onPress} style={(s) => [base, { opacity: s.pressed ? 0.9 : 1 }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[base, style]}>{children}</View>;
}

export function CardHeader({ title, subtitle, action, style }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingHorizontal: 18, paddingTop: 16 }, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === "string" ? (
          <Text size="sm" weight="semibold" numberOfLines={1}>
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === "string" ? (
            <Text size="xs" color="muted" style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function CardBody({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 }, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ height: 1, backgroundColor: t.c.border }, style]} />;
}
