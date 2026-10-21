// Charts drawn with react-native-svg — identical on web, Android and iOS (no web-only chart library).
// Tap / hover a bar or point to see the exact values (same tooltip data as before).
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { useTheme, Text } from "@/ui";
import { FONT } from "@/ui/fonts";
import { useSessionOptional } from "./session";
import { formatMoney } from "@/shared/money";

// ---------- helpers ----------
function useMoney() {
  const s = useSessionOptional();
  return (v: number, compact?: boolean) => (s ? s.money(v, compact) : formatMoney(v, "INR", compact));
}

function useWidth(initial = 320): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(initial);
  return [w, (e) => setW(Math.max(120, Math.round(e.nativeEvent.layout.width)))];
}

/** "nice" axis ticks */
function ticks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    max = min + 1;
  }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(step0) || 1)));
  const norm = step0 / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (!pts.length) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 4, marginBottom: 10 }}>
      {items.map((i) => (
        <View key={i.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i.color }} />
          <Text size="xs" color="muted">
            {i.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Tooltip({ title, rows, x, width }: { title?: string; rows: { label: string; color: string; value: string }[]; x: number; width: number }) {
  const t = useTheme();
  const w = 176;
  const left = Math.max(0, Math.min(width - w, x - w / 2));
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left, width: w, borderRadius: 12, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface", 0.97), paddingHorizontal: 10, paddingVertical: 8, gap: 3, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
      {title ? (
        <Text size="xs" weight="medium">
          {title}
        </Text>
      ) : null}
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: r.color }} />
            <Text size="xs" color="muted">
              {r.label}
            </Text>
          </View>
          <Text size="xs" weight="medium" tabular>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const PAD = { top: 10, right: 8, bottom: 22, left: 56 };

interface Series {
  key: string;
  name: string;
  color: string;
}

// ---------- grouped bars ----------
function BarsBase({ data, series, height, xKey = "label", currency = true, yWidth = PAD.left }: { data: Record<string, unknown>[]; series: Series[]; height: number; xKey?: string; currency?: boolean; yWidth?: number }) {
  const t = useTheme();
  const money = useMoney();
  const [w, onLayout] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const fmt = (v: number) => (currency ? money(v) : v.toLocaleString("en-IN"));
  const fmtAxis = (v: number) => (currency ? money(v, true) : String(v));

  const { yTicks, y0, y1 } = useMemo(() => {
    let lo = 0;
    let hi = 0;
    for (const d of data) for (const s of series) {
      const v = Number(d[s.key] ?? 0);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const tk = ticks(lo, hi || 1);
    return { yTicks: tk, y0: tk[0], y1: tk[tk.length - 1] };
  }, [data, series]);

  const plotW = Math.max(10, w - yWidth - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + plotH - ((v - y0) / (y1 - y0 || 1)) * plotH;
  const n = Math.max(1, data.length);
  const band = plotW / n;
  const groupW = Math.min(band * 0.78, series.length * 26 + (series.length - 1) * 2);
  const barW = Math.max(2, (groupW - (series.length - 1) * 2) / series.length);
  const labelEvery = Math.max(1, Math.ceil((n * 34) / plotW));

  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={w} height={height}>
        {yTicks.map((v) => (
          <G key={v}>
            <Line x1={yWidth} x2={w - PAD.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? t.c.border : t.grid} strokeWidth={1} />
            <SvgText x={yWidth - 6} y={y(v) + 3.5} fontSize={10} fontFamily={FONT.regular} fill={t.c.muted} textAnchor="end">
              {fmtAxis(v)}
            </SvgText>
          </G>
        ))}
        {data.map((d, i) => {
          const gx = yWidth + band * i + (band - groupW) / 2;
          return (
            <G key={i} opacity={active === null || active === i ? 1 : 0.45}>
              {series.map((s, k) => {
                const v = Number(d[s.key] ?? 0);
                const top = y(Math.max(0, v));
                const bottom = y(Math.min(0, v));
                const h = Math.max(v === 0 ? 0 : 1, bottom - top);
                const r = Math.min(4, barW / 2, h);
                const x = gx + k * (barW + 2);
                return v >= 0 ? (
                  <Path key={s.key} d={`M${x},${top + h} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + barW - r},${top} Q${x + barW},${top} ${x + barW},${top + r} L${x + barW},${top + h} Z`} fill={s.color} />
                ) : (
                  <Rect key={s.key} x={x} y={top} width={barW} height={h} rx={2} fill={s.color} />
                );
              })}
              {i % labelEvery === 0 ? (
                <SvgText x={yWidth + band * i + band / 2} y={height - 6} fontSize={10} fontFamily={FONT.regular} fill={t.c.muted} textAnchor="middle">
                  {String(d[xKey] ?? "")}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Svg>
      {/* touch / hover targets */}
      <View style={{ position: "absolute", left: yWidth, top: 0, right: PAD.right, bottom: PAD.bottom, flexDirection: "row" }}>
        {data.map((_, i) => (
          <Pressable key={i} style={{ flex: 1 }} onPressIn={() => setActive(i)} onPressOut={() => setTimeout(() => setActive((a) => (a === i ? null : a)), 1600)} onHoverIn={() => setActive(i)} onHoverOut={() => setActive(null)} />
        ))}
      </View>
      {active !== null && data[active] ? (
        <Tooltip title={String(data[active][xKey] ?? "")} x={yWidth + band * active + band / 2} width={w} rows={series.map((s) => ({ label: s.name, color: s.color, value: fmt(Number(data[active][s.key] ?? 0)) }))} />
      ) : null}
    </View>
  );
}

export function IncomeExpenseBars({ data, height = 280, showSavings = false, xKey = "label" }: { data: { income: number; expense: number; savings?: number; [k: string]: unknown }[]; height?: number; showSavings?: boolean; xKey?: string }) {
  const t = useTheme();
  const series: Series[] = [
    { key: "income", name: "Income", color: t.series[0] },
    { key: "expense", name: "Expenses", color: t.series[1] },
    ...(showSavings ? [{ key: "savings", name: "Net savings", color: t.series[2] }] : []),
  ];
  return (
    <View>
      <Legend items={series.map((s) => ({ label: s.name, color: s.color }))} />
      <BarsBase data={data} series={series} height={height} xKey={xKey} />
    </View>
  );
}

export function SimpleBars({ data, dataKey, name, height = 220, color, currency = false }: { data: Record<string, unknown>[]; dataKey: string; name: string; height?: number; color?: string; currency?: boolean }) {
  const t = useTheme();
  return <BarsBase data={data} series={[{ key: dataKey, name, color: color ?? t.series[0] }]} height={height} currency={currency} yWidth={currency ? PAD.left : 40} />;
}

// ---------- lines / areas ----------
function LinesBase({ data, series, height, xKey = "label", currency = true, area = false }: { data: Record<string, unknown>[]; series: Series[]; height: number; xKey?: string; currency?: boolean; area?: boolean }) {
  const t = useTheme();
  const money = useMoney();
  const [w, onLayout] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const fmt = (v: number) => (currency ? money(v) : String(v));
  const fmtAxis = (v: number) => (currency ? money(v, true) : String(v));
  const { yTicks, y0, y1 } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const d of data) for (const s of series) {
      const v = Number(d[s.key] ?? 0);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    lo = Math.min(0, lo);
    const tk = ticks(lo, hi === lo ? lo + 1 : hi);
    return { yTicks: tk, y0: tk[0], y1: tk[tk.length - 1] };
  }, [data, series]);
  const plotW = Math.max(10, w - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const n = data.length;
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v: number) => PAD.top + plotH - ((v - y0) / (y1 - y0 || 1)) * plotH;
  const labelEvery = Math.max(1, Math.ceil((n * 40) / plotW));
  const gid = useMemo(() => `g${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={w} height={height}>
        <Defs>
          {series.map((s, k) => (
            <LinearGradient key={s.key} id={`${gid}${k}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity={0.26} />
              <Stop offset="1" stopColor={s.color} stopOpacity={0} />
            </LinearGradient>
          ))}
        </Defs>
        {yTicks.map((v) => (
          <G key={v}>
            <Line x1={PAD.left} x2={w - PAD.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? t.c.border : t.grid} strokeWidth={1} />
            <SvgText x={PAD.left - 6} y={y(v) + 3.5} fontSize={10} fontFamily={FONT.regular} fill={t.c.muted} textAnchor="end">
              {fmtAxis(v)}
            </SvgText>
          </G>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <SvgText key={i} x={x(i)} y={height - 6} fontSize={10} fontFamily={FONT.regular} fill={t.c.muted} textAnchor="middle">
              {String(d[xKey] ?? "")}
            </SvgText>
          ) : null,
        )}
        {series.map((s, k) => {
          const pts = data.map((d, i) => ({ x: x(i), y: y(Number(d[s.key] ?? 0)) }));
          const line = smoothPath(pts);
          return (
            <G key={s.key}>
              {area && pts.length > 1 ? <Path d={`${line} L${pts[pts.length - 1].x},${y(Math.max(0, y0))} L${pts[0].x},${y(Math.max(0, y0))} Z`} fill={`url(#${gid}${k})`} /> : null}
              <Path d={line} stroke={s.color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {active !== null && pts[active] ? <Circle cx={pts[active].x} cy={pts[active].y} r={4} fill={s.color} stroke={t.c.surface} strokeWidth={2} /> : null}
            </G>
          );
        })}
        {active !== null ? <Line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke={t.c.muted} strokeDasharray="3 3" strokeWidth={1} /> : null}
      </Svg>
      <View style={{ position: "absolute", left: PAD.left - plotW / Math.max(1, (n - 1) * 2), top: 0, right: PAD.right - plotW / Math.max(1, (n - 1) * 2), bottom: PAD.bottom, flexDirection: "row" }}>
        {data.map((_, i) => (
          <Pressable key={i} style={{ flex: 1 }} onPressIn={() => setActive(i)} onPressOut={() => setTimeout(() => setActive((a) => (a === i ? null : a)), 1600)} onHoverIn={() => setActive(i)} onHoverOut={() => setActive(null)} />
        ))}
      </View>
      {active !== null && data[active] ? <Tooltip title={String(data[active][xKey] ?? "")} x={x(active)} width={w} rows={series.map((s) => ({ label: s.name, color: s.color, value: fmt(Number(data[active][s.key] ?? 0)) }))} /> : null}
    </View>
  );
}

export function TrendArea({ data, height = 260 }: { data: { label: string; income: number; expense: number }[]; height?: number }) {
  const t = useTheme();
  const series: Series[] = [
    { key: "income", name: "Income", color: t.series[0] },
    { key: "expense", name: "Expenses", color: t.series[1] },
  ];
  return (
    <View>
      <Legend items={series.map((s) => ({ label: s.name, color: s.color }))} />
      <LinesBase data={data} series={series} height={height} area />
    </View>
  );
}

export function SingleLine({ data, dataKey, name, height = 240, color, xKey = "label", currency = true }: { data: Record<string, unknown>[]; dataKey: string; name: string; height?: number; color?: string; xKey?: string; currency?: boolean }) {
  const t = useTheme();
  return <LinesBase data={data} series={[{ key: dataKey, name, color: color ?? t.series[2] }]} height={height} xKey={xKey} currency={currency} />;
}

// ---------- donut ----------
export function CategoryDonut({ data, height = 200, emptyText = "No data yet" }: { data: { category: string; total: number; share: number }[]; height?: number; emptyText?: string }) {
  const t = useTheme();
  const money = useMoney();
  const [active, setActive] = useState<number | null>(null);
  const [w, onLayout] = useWidth(600);
  // never more than 8 hues: fold the tail into "Other"
  const rows = data.length > 8 ? [...data.slice(0, 7), data.slice(7).reduce((acc, r) => ({ category: "Other", total: acc.total + r.total, share: Math.round((acc.share + r.share) * 10) / 10 }), { category: "Other", total: 0, share: 0 })] : data;
  const total = rows.reduce((s, r) => s + r.total, 0);
  if (!rows.length || total <= 0)
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <Text size="sm" color="muted">
          {emptyText}
        </Text>
      </View>
    );
  const size = height;
  const R = size / 2 - 2;
  const r = R * 0.68;
  const cx = size / 2;
  const cy = size / 2;
  const gap = rows.length > 1 ? 0.025 : 0;
  let a0 = -Math.PI / 2;
  const arcs = rows.map((row, i) => {
    const sweep = (row.total / total) * Math.PI * 2;
    const s = a0 + gap / 2;
    const e = a0 + Math.max(gap, sweep) - gap / 2;
    a0 += sweep;
    const large = e - s > Math.PI ? 1 : 0;
    const p = (ang: number, rad: number) => `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
    const d =
      rows.length === 1
        ? `M${cx - R},${cy} A${R},${R} 0 1 1 ${cx + R},${cy} A${R},${R} 0 1 1 ${cx - R},${cy} M${cx - r},${cy} A${r},${r} 0 1 0 ${cx + r},${cy} A${r},${r} 0 1 0 ${cx - r},${cy} Z`
        : `M${p(s, R)} A${R},${R} 0 ${large} 1 ${p(e, R)} L${p(e, r)} A${r},${r} 0 ${large} 0 ${p(s, r)} Z`;
    return { d, color: t.series[i % t.series.length], i };
  });
  const focus = active !== null ? rows[active] : null;
  const side = w >= 460;
  return (
    <View onLayout={onLayout} style={{ flexDirection: side ? "row" : "column", alignItems: "center", gap: 18 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {arcs.map((a) => (
            <Path key={a.i} d={a.d} fill={a.color} fillRule="evenodd" opacity={active === null || active === a.i ? 1 : 0.35} onPress={() => setActive((x) => (x === a.i ? null : a.i))} />
          ))}
        </Svg>
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text size="xs" color="muted" numberOfLines={1} style={{ maxWidth: r * 1.6 }}>
            {focus ? focus.category : "Total"}
          </Text>
          <Text size="md" weight="semibold" tabular>
            {money(focus ? focus.total : total, true)}
          </Text>
          {focus ? (
            <Text size="xs" color="muted">
              {focus.share}%
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ flex: side ? 1 : undefined, width: side ? undefined : "100%", gap: 2 }}>
        {rows.map((row, i) => (
          <Pressable
            key={row.category}
            onPress={() => setActive((x) => (x === i ? null : i))}
            onHoverIn={() => setActive(i)}
            onHoverOut={() => setActive(null)}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 7, backgroundColor: active === i ? t.c.surface2 : "transparent" }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.series[i % t.series.length] }} />
            <Text size="xs" color="muted" numberOfLines={1} style={{ flex: 1 }}>
              {row.category}
            </Text>
            <Text size="xs" weight="medium" tabular>
              {money(row.total, true)}
            </Text>
            <Text size="xs" color="muted" tabular style={{ width: 44, textAlign: "right" }}>
              {row.share}%
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------- horizontal comparison bars ----------
export function CategoryComparison({ data }: { data: { category: string; current: number; previous: number }[] }) {
  const t = useTheme();
  const money = useMoney();
  const rows = data.slice(0, 8);
  const max = Math.max(1, ...rows.flatMap((r) => [r.current, r.previous]));
  const prevColor = t.a("muted", 0.45);
  return (
    <View>
      <Legend items={[{ label: "This month", color: t.series[1] }, { label: "Last month", color: prevColor }]} />
      <View style={{ gap: 12 }}>
        {rows.map((r) => (
          <View key={r.category} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text size="xs" numberOfLines={1} style={{ flex: 1 }}>
                {r.category}
              </Text>
              <Text size="xs" tabular color="muted">
                {money(r.current, true)} <Text size="xs" color="muted">vs</Text> {money(r.previous, true)}
              </Text>
            </View>
            <View style={{ height: 7, borderRadius: 4, backgroundColor: t.c.surface2, overflow: "hidden" }}>
              <View style={{ width: `${(100 * r.current) / max}%`, height: "100%", backgroundColor: t.series[1], borderRadius: 4 }} />
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: t.c.surface2, overflow: "hidden" }}>
              <View style={{ width: `${(100 * r.previous) / max}%`, height: "100%", backgroundColor: prevColor, borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- health gauge ----------
export function HealthGauge({ score }: { score: number | null }) {
  const t = useTheme();
  const v = score ?? 0;
  const tone = score === null ? t.c.muted : v >= 70 ? t.c.success : v >= 45 ? t.c.warning : t.c.danger;
  const label = score === null ? "No data" : v >= 70 ? "Healthy" : v >= 45 ? "Fair" : "Needs attention";
  const c = Math.PI * 52;
  return (
    <View style={{ width: 150, alignSelf: "center" }}>
      <Svg width={150} height={85} viewBox="0 0 120 68">
        <Path d="M8 60 A52 52 0 0 1 112 60" fill="none" stroke={t.c.surface2} strokeWidth={10} strokeLinecap="round" />
        <Path d="M8 60 A52 52 0 0 1 112 60" fill="none" stroke={tone} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} />
      </Svg>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" }}>
        <Text size="2xl" weight="semibold" tabular>
          {score ?? "—"}
        </Text>
        <Text size="xs" color="muted">
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Placeholder with a fixed height (kept for API parity with the old lazy charts). */
export function ChartBox({ height, children }: { height: number; children: ReactNode }) {
  return <View style={{ minHeight: height }}>{children}</View>;
}
