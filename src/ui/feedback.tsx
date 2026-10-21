import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, View, type StyleProp, type ViewStyle } from "react-native";
import { AlertTriangle, Inbox } from "lucide-react-native";
import { useTheme } from "./theme";
import { Text } from "./text";
import { Button } from "./button";

export type Tone = "default" | "primary" | "success" | "danger" | "warning" | "info";

export function Badge({ children, tone = "default", icon }: { children: ReactNode; tone?: Tone; icon?: ReactNode }) {
  const t = useTheme();
  const color = tone === "default" ? t.c.muted : t.c[tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        backgroundColor: tone === "default" ? t.c.surface2 : t.a(tone, 0.12),
        borderColor: tone === "default" ? t.c.border : t.a(tone, 0.28),
      }}
    >
      {icon}
      <Text size="2xs" weight="medium" style={{ color }} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export function Spinner({ size = "small" }: { size?: "small" | "large" }) {
  const t = useTheme();
  return <ActivityIndicator size={size} color={t.c.muted} accessibilityLabel="Loading" />;
}

/** Pulsing placeholder while data loads. */
export function Skeleton({ height = 16, width, radius = 10, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ height, width: width ?? "100%", borderRadius: radius, backgroundColor: t.c.surface2, opacity: v }, style]} />;
}

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 36 }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface2, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        {icon ?? <Inbox size={20} color={t.c.muted} />}
      </View>
      <Text size="sm" weight="medium" center>
        {title}
      </Text>
      {message ? (
        <Text size="sm" color="muted" center style={{ marginTop: 4, maxWidth: 360 }}>
          {message}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 24, paddingVertical: 32 }}>
      <AlertTriangle size={24} color={t.c.danger} />
      <Text size="sm" weight="medium" style={{ marginTop: 8 }}>
        Couldn&apos;t load this
      </Text>
      <Text size="sm" color="muted" center style={{ marginTop: 4 }}>
        {message || "Please try again."}
      </Text>
      {onRetry ? (
        <Button variant="secondary" size="sm" onPress={onRetry} style={{ marginTop: 14 }}>
          Retry
        </Button>
      ) : null}
    </View>
  );
}

export function Progress({ value, tone = "primary", height = 8, marker }: { value: number; tone?: "primary" | "success" | "warning" | "danger"; height?: number; marker?: number | null }) {
  const t = useTheme();
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(v) }} style={{ height: Math.max(height, marker != null ? 14 : 0), justifyContent: "center" }}>
      <View style={{ height, borderRadius: height, backgroundColor: t.c.surface2, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${v}%`, borderRadius: height, backgroundColor: t.c[tone] }} />
      </View>
      {marker != null ? <View style={{ position: "absolute", left: `${Math.min(100, Math.max(0, marker))}%`, top: 0, bottom: 0, width: 2, borderRadius: 1, backgroundColor: t.a("fg", 0.6) }} /> : null}
    </View>
  );
}

/** Small coloured dot (legend / unread). */
export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/** Inline alert box. */
export function Notice({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "success"; title?: string; children?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: t.a(tone, 0.3), backgroundColor: t.a(tone, 0.08), paddingHorizontal: 14, paddingVertical: 10, gap: 2 }}>
      {title ? (
        <Text size="sm" weight="semibold" style={{ color: t.c[tone] }}>
          {title}
        </Text>
      ) : null}
      {typeof children === "string" ? (
        <Text size="sm" style={{ color: title ? t.c.fg : t.c[tone] }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
