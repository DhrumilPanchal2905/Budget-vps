import { Children, isValidElement, type ReactNode } from "react";
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "./theme";
import { Text } from "./text";
import { useBreakpoint } from "./responsive";

/**
 * Scrollable page body with the app's max width and padding. Pull-to-refresh on phones when onRefresh is given.
 * `bottomInset` leaves room for the phone bottom bar.
 */
export function Screen({ children, onRefresh, refreshing = false, maxWidth = 1400, padded = true, style }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; maxWidth?: number; padded?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const bp = useBreakpoint();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.c.bg }}
      contentContainerStyle={{ paddingBottom: bp.compact ? 110 : 48 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.c.muted} colors={[t.c.primary]} progressBackgroundColor={t.c.surface} /> : undefined}
    >
      <View style={[{ width: "100%", maxWidth, alignSelf: "center", paddingHorizontal: padded ? (bp.sm ? 24 : 16) : 0, paddingTop: padded ? (bp.sm ? 24 : 16) : 0, gap: 16 }, style]}>{children}</View>
    </ScrollView>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const bp = useBreakpoint();
  return (
    <View style={{ flexDirection: bp.sm ? "row" : "column", alignItems: bp.sm ? "flex-end" : "stretch", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
      <View style={{ flexShrink: 1 }}>
        <Text accessibilityRole="header" size={bp.sm ? "2xl" : "xl"} weight="semibold" tight>
          {title}
        </Text>
        {subtitle ? (
          <Text size="sm" color="muted" style={{ marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{actions}</View> : null}
    </View>
  );
}

type Cols = { base: number; sm?: number; md?: number; lg?: number; xl?: number };

function pick(c: Partial<Cols> & { base?: number }, bp: ReturnType<typeof useBreakpoint>, fallback: number): number {
  if (bp.xl && c.xl) return c.xl;
  if (bp.lg && c.lg) return c.lg;
  if (bp.md && c.md) return c.md;
  if (bp.sm && c.sm) return c.sm;
  if (bp.lg && c.md) return c.md;
  if (bp.lg && c.sm) return c.sm;
  if (bp.md && c.sm) return c.sm;
  return c.base ?? fallback;
}

type Span = number | (Partial<Cols> & { base?: number });

/** A grid cell that spans several columns: <Grid.Item span={{ base: 1, lg: 2 }}>. */
function GridItem({ children }: { span?: Span; children: ReactNode }) {
  return <>{children}</>;
}

/** Responsive grid: columns per breakpoint, e.g. <Grid cols={{ base: 2, lg: 4 }}>. */
export function Grid({ cols, gap = 12, children, style }: { cols: Cols; gap?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const bp = useBreakpoint();
  const n = pick(cols, bp, 1);
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -gap / 2, rowGap: gap }, style]}>
      {items.map((child, i) => {
        let span = 1;
        if (isValidElement(child) && child.type === GridItem) {
          const sp = (child.props as { span?: Span }).span;
          span = typeof sp === "number" ? sp : sp ? pick(sp, bp, 1) : 1;
        }
        span = Math.max(1, Math.min(n, span));
        return (
          <View key={(isValidElement(child) && child.key) || i} style={{ width: `${(100 * span) / n}%`, paddingHorizontal: gap / 2 }}>
            {child}
          </View>
        );
      })}
    </View>
  );
}
Grid.Item = GridItem;

export function Row({ children, gap = 8, style, wrap, center = true, between }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean; center?: boolean; between?: boolean }) {
  return <View style={[{ flexDirection: "row", gap, alignItems: center ? "center" : "flex-start", flexWrap: wrap ? "wrap" : "nowrap", justifyContent: between ? "space-between" : "flex-start" }, style]}>{children}</View>;
}

export function Stack({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

/** Section label (uppercase small heading). */
export function Overline({ children }: { children: ReactNode }) {
  return (
    <Text size="2xs" weight="semibold" color="muted" uppercase>
      {children}
    </Text>
  );
}
