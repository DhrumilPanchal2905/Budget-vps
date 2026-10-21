import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import useSWR from "swr";
import Svg, { Circle, G, Line, Text as SvgText } from "react-native-svg";
import { Globe, Laptop, MapPin, Monitor, Radio, Smartphone, Tablet, Users } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { StatCard } from "@/components/stat-card";
import { SimpleBars } from "@/components/charts";
import { Badge, Card, CardBody, CardHeader, ErrorState, Grid, PageHeader, Screen, Skeleton, Tabs, Text, useBreakpoint, useTheme } from "@/ui";
import { timeAgo } from "@/lib/format";

interface Resp {
  range: string;
  onlineNow: number;
  totals: { views: number; visitors: number; signedIn: number };
  countries: { country: string; code: string | null; visitors: number; views: number }[];
  cities: { place: string; code: string | null; visitors: number; lat: number | null; lon: number | null }[];
  devices: { name: string; n: number }[];
  browsers: { name: string; n: number }[];
  pages: { path: string; n: number }[];
  referrers: { source: string; n: number }[];
  daily: { label: string; views: number; visitors: number }[];
  recent: { id: string; at: string; path: string; place: string; code: string | null; device: string; browser: string; os: string; ip: string | null; referrer: string | null; user: { id: string; name: string; email: string } | null; visitor: string }[];
}

type Range = "today" | "7d" | "30d" | "90d";
const MONO = { fontFamily: "monospace" };

/** 🇮🇳 from "IN" */
function flag(cc?: string | null): string {
  if (!cc || cc.length !== 2) return "🌐";
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function DeviceIcon({ d }: { d: string }) {
  const t = useTheme();
  const Icon = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : d === "desktop" ? Monitor : Laptop;
  return <Icon size={14} color={t.c.muted} />;
}

/** Tiny dependency-free world dot map (equirectangular). Bigger dot = more visitors. */
function DotMap({ cities }: { cities: Resp["cities"] }) {
  const t = useTheme();
  const [w, setW] = useState(600);
  const pts = cities.filter((c) => c.lat !== null && c.lon !== null);
  const max = Math.max(1, ...pts.map((p) => p.visitors));
  const h = w / 2;
  const s = w / 360;
  return (
    <View onLayout={(e) => setW(Math.max(200, e.nativeEvent.layout.width))} accessibilityLabel="Visitor locations map" style={{ borderRadius: 12, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.4), overflow: "hidden" }}>
      <Svg width={w} height={h} viewBox="0 0 360 180">
        {Array.from({ length: 11 }).map((_, i) => (
          <Line key={`v${i}`} x1={i * 36} y1={0} x2={i * 36} y2={180} stroke={t.c.border} strokeWidth={0.4} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * 30} x2={360} y2={i * 30} stroke={t.c.border} strokeWidth={0.4} />
        ))}
        {pts.map((p) => {
          const x = p.lon! + 180;
          const y = 90 - p.lat!;
          const r = 2 + (p.visitors / max) * 6;
          return (
            <G key={p.place}>
              <Circle cx={x} cy={y} r={r + 3} fill={t.c.primary} opacity={0.15} />
              <Circle cx={x} cy={y} r={r} fill={t.c.primary} opacity={0.85} />
            </G>
          );
        })}
        {!pts.length ? (
          <SvgText x={180} y={95} textAnchor="middle" fontSize={9 / Math.max(0.6, s / 1.6)} fill={t.c.muted}>
            Locations appear here once visitors arrive
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

function ListRow({ left, right, first }: { left: ReactNode; right: ReactNode; first?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 8, borderTopWidth: first ? 0 : 1, borderTopColor: t.c.border }}>
      <View style={{ flex: 1, minWidth: 0 }}>{left}</View>
      {typeof right === "string" || typeof right === "number" ? (
        <Text size="sm" color="muted" tabular>
          {right}
        </Text>
      ) : (
        right
      )}
    </View>
  );
}

function Inner() {
  const t = useTheme();
  const bp = useBreakpoint();
  const [range, setRange] = useState<Range>("7d");
  const { data, error, isLoading, mutate } = useSWR<Resp>(`/api/admin/visitors?range=${range}`, { refreshInterval: 30_000 });
  return (
    <Screen onRefresh={() => mutate()} refreshing={false}>
      <PageHeader
        title="Visitors"
        subtitle="Who opens Budget Pro, from where and on what device — updates live."
        actions={
          <Tabs
            value={range}
            onChange={setRange}
            items={[
              { value: "today" as Range, label: "Today" },
              { value: "7d" as Range, label: "7 days" },
              { value: "30d" as Range, label: "30 days" },
              { value: "90d" as Range, label: "90 days" },
            ]}
          />
        }
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <Grid cols={{ base: 2, lg: 4 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={112} />
          ))}
        </Grid>
      ) : (
        <View style={{ gap: 16 }}>
          <Grid cols={{ base: 2, lg: 4 }}>
            <StatCard label="Online now" value={data.onlineNow} icon={Radio} hint="active in the last 5 minutes" tone={data.onlineNow ? "success" : "default"} />
            <StatCard label="Unique visitors" value={data.totals.visitors.toLocaleString("en-IN")} icon={Users} />
            <StatCard label="Page views" value={data.totals.views.toLocaleString("en-IN")} icon={Globe} />
            <StatCard label="Signed-in users" value={data.totals.signedIn.toLocaleString("en-IN")} hint="visited while logged in" />
          </Grid>

          <Grid cols={{ base: 1, lg: 3 }} gap={16}>
            <Grid.Item span={{ base: 1, lg: 2 }}>
              <Card>
                <CardHeader title="Where visitors are" subtitle="Approximate city from the visitor's IP (no GPS, no permission prompt)" />
                <CardBody>
                  <DotMap cities={data.cities} />
                </CardBody>
              </Card>
            </Grid.Item>
            <Card>
              <CardHeader title="Top countries" />
              <CardBody style={{ paddingTop: 6 }}>
                {data.countries.length ? (
                  data.countries.map((c, i) => <ListRow key={`${c.country}-${c.code}`} first={!i} left={<Text size="sm" numberOfLines={1}>{`${flag(c.code)} ${c.country}`}</Text>} right={c.visitors} />)
                ) : (
                  <Text size="sm" color="muted" center style={{ paddingVertical: 20 }}>
                    No visits yet.
                  </Text>
                )}
              </CardBody>
            </Card>
          </Grid>

          <Grid cols={{ base: 1, lg: 3 }} gap={16}>
            <Grid.Item span={{ base: 1, lg: 2 }}>
              <Card>
                <CardHeader title="Daily visitors" />
                <CardBody>
                  <SimpleBars data={data.daily} dataKey="visitors" name="Visitors" />
                </CardBody>
              </Card>
            </Grid.Item>
            <Card>
              <CardHeader title="Top cities" />
              <CardBody style={{ paddingTop: 6 }}>
                {data.cities.map((c, i) => (
                  <ListRow
                    key={c.place}
                    first={!i}
                    left={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <MapPin size={14} color={t.c.muted} />
                        <Text size="sm" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {c.place}
                        </Text>
                      </View>
                    }
                    right={c.visitors}
                  />
                ))}
                {!data.cities.length ? (
                  <Text size="sm" color="muted" center style={{ paddingVertical: 20 }}>
                    No city data yet.
                  </Text>
                ) : null}
              </CardBody>
            </Card>
          </Grid>

          <Grid cols={{ base: 1, md: 3 }} gap={16}>
            <Card>
              <CardHeader title="Devices" />
              <CardBody style={{ paddingTop: 6 }}>
                {data.devices.map((d, i) => (
                  <ListRow
                    key={d.name}
                    first={!i}
                    left={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <DeviceIcon d={d.name} />
                        <Text size="sm" style={{ textTransform: "capitalize" }}>
                          {d.name}
                        </Text>
                      </View>
                    }
                    right={d.n}
                  />
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Browsers" />
              <CardBody style={{ paddingTop: 6 }}>
                {data.browsers.map((d, i) => (
                  <ListRow key={d.name} first={!i} left={<Text size="sm">{d.name}</Text>} right={d.n} />
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Top pages & sources" />
              <CardBody style={{ paddingTop: 6 }}>
                {data.pages.slice(0, 5).map((p, i) => (
                  <ListRow key={p.path} first={!i} left={<Text size="xs" numberOfLines={1} style={MONO}>{p.path}</Text>} right={p.n} />
                ))}
                {data.referrers.slice(0, 3).map((r) => (
                  <ListRow key={r.source} left={<Text size="xs" color="muted" numberOfLines={1}>{`↗ ${r.source}`}</Text>} right={r.n} />
                ))}
              </CardBody>
            </Card>
          </Grid>

          <Card>
            <CardHeader title="Latest visits" subtitle="Live — newest first. IPs are partly masked." />
            <CardBody style={{ paddingTop: 6 }}>
              {data.recent.map((v, i) => {
                const who = v.user ? (
                  <Text size="sm" weight="medium" color="primary" numberOfLines={1} onPress={() => router.push(`/admin/users/${v.user!.id}` as never)}>
                    {v.user.name}
                  </Text>
                ) : (
                  <Badge>{`guest · ${v.visitor}`}</Badge>
                );
                const loc = (
                  <View>
                    <Text size="sm" numberOfLines={1}>{`${flag(v.code)} ${v.place}`}</Text>
                    {v.ip ? (
                      <Text size="2xs" color="muted" style={MONO}>
                        {v.ip}
                      </Text>
                    ) : null}
                  </View>
                );
                const dev = (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <DeviceIcon d={v.device} />
                    <Text size="xs" color="muted" numberOfLines={1}>{`${v.browser} · ${v.os}`}</Text>
                  </View>
                );
                return bp.md ? (
                  <View key={v.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                    <Text size="xs" color="muted" style={{ width: 70 }}>
                      {timeAgo(v.at)}
                    </Text>
                    <View style={{ flex: 1.3, minWidth: 0 }}>{loc}</View>
                    <View style={{ flex: 1, minWidth: 0 }}>{who}</View>
                    <Text size="xs" numberOfLines={1} style={[MONO, { flex: 1 }]}>
                      {v.path}
                    </Text>
                    <View style={{ flex: 1.2, minWidth: 0 }}>{dev}</View>
                  </View>
                ) : (
                  <View key={v.id} style={{ paddingVertical: 10, gap: 4, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>{loc}</View>
                      <Text size="2xs" color="muted">
                        {timeAgo(v.at)}
                      </Text>
                    </View>
                    {who}
                    <Text size="xs" numberOfLines={1} style={MONO}>
                      {v.path}
                    </Text>
                    {dev}
                  </View>
                );
              })}
              {!data.recent.length ? (
                <Text size="sm" color="muted" center style={{ paddingVertical: 28 }}>
                  No visits in this period.
                </Text>
              ) : null}
            </CardBody>
          </Card>
        </View>
      )}
    </Screen>
  );
}

export default function VisitorsPage() {
  return (
    <RequirePerm admin perm="users.view">
      <Inner />
    </RequirePerm>
  );
}
