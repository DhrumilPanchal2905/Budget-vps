import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import useSWR from "swr";
import { Activity, Bot, Crown, Database, IndianRupee, Mail, Radio, ScrollText, UserCheck, UserPlus, UserX, Users, Wallet } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { useSession } from "@/components/session";
import { StatCard } from "@/components/stat-card";
import { SimpleBars } from "@/components/charts";
import { Card, CardBody, CardHeader, ErrorState, Grid, PageHeader, Screen, Skeleton, Text, useTheme } from "@/ui";
import { timeAgo } from "@/lib/format";

interface Stats {
  users: { total: number; active: number; inactive: number; free: number; plus: number; pro: number; unlimited: number; admins: number; activeLast30: number };
  collections: Record<string, number>;
  finance: { totalIncome: number; totalExpense: number; avgIncomePerUser: number };
  signups: { label: string; users: number }[];
  recent: { id: string; action: string; actorEmail: string; resource: string | null; createdAt: string }[];
  live?: { onlineNow: number; visitors24h: number; newUsers7d: number; unverified: number };
  angel?: { conversations: number; questions7d: number };
  revenue?: { all: number; payments: number; month: number; monthPayments: number };
  email?: { ready: boolean; source: string; from: string };
}

interface MyDash {
  monthLabel: string;
  summary: { income: number; expense: number; balance: number; totalSavings: number; freeBalance: number; goalSaved: number; totalDebt: number; savingsRate: number };
  health: { score: number | null };
}

const LABELS: Record<string, string> = {
  users: "Users",
  sessions: "Sessions",
  incomes: "Income records",
  expenses: "Expense records",
  debts: "Debt records",
  goals: "Goals",
  notifications: "Notifications",
  auditlogs: "Audit logs",
  pushsubscriptions: "Push subscriptions (web)",
  nativepushtokens: "Push tokens (app)",
  realtimeevents: "Realtime events",
  ratelimits: "Rate-limit buckets",
  passkeys: "Passkeys (device login)",
  webauthnchallenges: "Passkey challenges",
  angelconversations: "Angel AI chats",
  angelmessages: "Angel AI messages",
  budgets: "Budgets",
  goalcontributions: "Goal contributions",
  visits: "Website visits",
  emailotps: "Pending email codes",
  appsettings: "App settings",
};

function LinkText({ label, href }: { label: string; href: string }) {
  return (
    <Text size="xs" weight="medium" color="primary" onPress={() => router.push(href as never)}>
      {label}
    </Text>
  );
}

function TitleIcon({ icon: Icon, title, color }: { icon: typeof Wallet; title: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon size={16} color={color} />
      <Text size="sm" weight="semibold">
        {title}
      </Text>
    </View>
  );
}

/** The admin's OWN money (admins are users too) — same numbers as their dashboard. */
function MyFinances() {
  const t = useTheme();
  const { money, can } = useSession();
  const { data } = useSWR<MyDash>(can("finance.read") ? "/api/dashboard" : null);
  if (!can("finance.read")) return null;
  const cells = data
    ? [
        { l: "Income", v: money(data.summary.income, true), c: "success" as const },
        { l: "Expenses", v: money(data.summary.expense, true) },
        { l: "Left this month", v: money(data.summary.balance, true) },
        { l: "Total balance", v: money(data.summary.totalSavings, true) },
        { l: "Health", v: `${data.health.score ?? "—"}/100` },
      ]
    : [];
  return (
    <Card>
      <CardHeader title={<TitleIcon icon={Wallet} title="Your own finances" color={t.c.primary} />} subtitle={data ? data.monthLabel : "This month"} action={<LinkText label="My dashboard" href="/dashboard" />} />
      <CardBody>
        {!data ? (
          <Skeleton height={64} />
        ) : (
          <Grid cols={{ base: 2, sm: 5 }}>
            {cells.map((c) => (
              <View key={c.l}>
                <Text size="xs" color="muted">
                  {c.l}
                </Text>
                <Text weight="semibold" tabular color={c.c ?? "fg"}>
                  {c.v}
                </Text>
              </View>
            ))}
          </Grid>
        )}
      </CardBody>
    </Card>
  );
}

function PlanBars({ data }: { data: { category: string; total: number; share: number }[] }) {
  const t = useTheme();
  const total = data.reduce((s, d) => s + d.total, 0);
  if (!total)
    return (
      <Text size="sm" color="muted" center style={{ paddingVertical: 40 }}>
        No users yet
      </Text>
    );
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: t.c.surface2 }}>
        {data.map((d, i) => (d.total ? <View key={d.category} style={{ width: `${(d.total / total) * 100}%`, height: "100%", backgroundColor: t.series[i], borderRightWidth: 2, borderRightColor: t.c.surface }} /> : null))}
      </View>
      <View style={{ gap: 8 }}>
        {data.map((d, i) => (
          <View key={d.category} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: t.series[i] }} />
            <Text size="sm" color="muted" style={{ flex: 1 }}>
              {d.category}
            </Text>
            <Text size="sm" weight="medium" tabular>
              {d.total.toLocaleString("en-IN")}
            </Text>
            <Text size="xs" color="muted" tabular style={{ width: 48, textAlign: "right" }}>
              {d.share}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Tap({ href, children }: { href: string; children: ReactNode }) {
  return <Pressable onPress={() => router.push(href as never)}>{children}</Pressable>;
}

function Inner() {
  const t = useTheme();
  const { money, can } = useSession();
  const { data, error, isLoading, mutate } = useSWR<Stats>("/api/admin/stats");
  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (isLoading || !data)
    return (
      <Grid cols={{ base: 2, lg: 4 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={112} />
        ))}
      </Grid>
    );
  const u = data.users;
  const total = u.free + u.plus + u.pro + (u.unlimited ?? 0);
  const share = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  const planData = [
    { category: "Free", total: u.free, share: share(u.free) },
    { category: "Plus", total: u.plus, share: share(u.plus) },
    { category: "Pro", total: u.pro, share: share(u.pro) },
    { category: "Unlimited", total: u.unlimited ?? 0, share: share(u.unlimited ?? 0) },
  ];
  const n = (v: number | undefined) => (v ?? 0).toLocaleString("en-IN");
  return (
    <View style={{ gap: 16 }}>
      {data.live ? (
        <Grid cols={{ base: 2, lg: 3, xl: 5 }}>
          <Tap href="/admin/visitors">
            <StatCard label="Online now" value={data.live.onlineNow} icon={Radio} tone={data.live.onlineNow ? "success" : "default"} hint={`${data.live.visitors24h} visitors in 24h →`} />
          </Tap>
          <StatCard label="New users (7 days)" value={data.live.newUsers7d} icon={UserPlus} hint={data.live.unverified ? `${data.live.unverified} unverified` : "all verified"} />
          <StatCard label="Angel AI" value={data.angel?.questions7d ?? 0} icon={Bot} hint={`questions in 7 days · ${data.angel?.conversations ?? 0} chats`} />
          <Tap href="/admin/payments">
            <StatCard label="Revenue this month" value={`₹${n(data.revenue?.month)}`} icon={IndianRupee} tone={(data.revenue?.month ?? 0) > 0 ? "success" : "default"} hint={`${data.revenue?.monthPayments ?? 0} payments · ₹${n(data.revenue?.all)} all time →`} />
          </Tap>
          <Tap href="/admin/settings">
            <StatCard label="OTP email" value={data.email?.ready ? "Working" : "Not set up"} icon={Mail} tone={data.email?.ready ? "success" : "danger"} hint={data.email?.ready ? data.email.from : "Add Gmail App Password →"} />
          </Tap>
        </Grid>
      ) : null}
      <MyFinances />
      <Grid cols={{ base: 2, lg: 4 }}>
        <StatCard label="Total users" value={n(u.total)} icon={Users} hint={`${u.admins} admin${u.admins === 1 ? "" : "s"}`} />
        <StatCard label="Active users" value={n(u.active)} icon={UserCheck} hint={`${u.activeLast30} signed in last 30d`} />
        <StatCard label="Inactive (disabled)" value={n(u.inactive)} icon={UserX} />
        <StatCard label="Paid / unlimited plans" value={n(u.plus + u.pro + (u.unlimited ?? 0))} icon={Crown} hint={`${u.plus} Plus · ${u.pro} Pro · ${u.unlimited ?? 0} Unlimited · ${u.free} Free`} />
        <StatCard label="Income records" value={n(data.collections.incomes)} />
        <StatCard label="Expense records" value={n(data.collections.expenses)} />
        <StatCard label="Debt records" value={n(data.collections.debts)} />
        <StatCard label="Goals" value={n(data.collections.goals)} />
        <StatCard label="Notifications" value={n(data.collections.notifications)} />
        <StatCard label="Audit logs" value={n(data.collections.auditlogs)} icon={ScrollText} />
        <StatCard label="Platform income tracked" value={money(data.finance.totalIncome, true)} icon={IndianRupee} hint={`avg ${money(data.finance.avgIncomePerUser, true)} / user`} />
        <StatCard label="Platform expenses tracked" value={money(data.finance.totalExpense, true)} />
      </Grid>

      <Grid cols={{ base: 1, lg: 3 }} gap={16}>
        <Grid.Item span={{ base: 1, lg: 2 }}>
          <Card>
            <CardHeader title="New users" subtitle="Sign-ups per month (last 12 months)" />
            <CardBody>
              <SimpleBars data={data.signups} dataKey="users" name="New users" />
            </CardBody>
          </Card>
        </Grid.Item>
        <Card>
          <CardHeader title="Plan distribution" />
          <CardBody>
            <PlanBars data={planData} />
          </CardBody>
        </Card>
      </Grid>

      <Grid cols={{ base: 1, lg: 2 }} gap={16}>
        <Card>
          <CardHeader title={<TitleIcon icon={Activity} title="Live activity" color={t.c.success} />} subtitle="Updates in realtime" action={can("audit.view") ? <LinkText label="Audit log" href="/admin/audit" /> : null} />
          <CardBody style={{ paddingTop: 6 }}>
            {!can("audit.view") ? (
              <Text size="sm" color="muted" center style={{ paddingVertical: 24 }}>
                Requires audit.view permission.
              </Text>
            ) : !data.recent.length ? (
              <Text size="sm" color="muted" center style={{ paddingVertical: 24 }}>
                No activity yet.
              </Text>
            ) : (
              data.recent.map((a, i) => (
                <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" numberOfLines={1} style={{ fontFamily: "monospace" }}>
                      {a.action}
                    </Text>
                    <Text size="xs" color="muted" numberOfLines={1}>
                      {a.actorEmail}
                      {a.resource ? ` · ${a.resource}` : ""}
                    </Text>
                  </View>
                  <Text size="2xs" color="muted">
                    {timeAgo(a.createdAt)}
                  </Text>
                </View>
              ))
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={<TitleIcon icon={Database} title="Collections" color={t.c.muted} />} action={can("database.view") ? <LinkText label="Manage" href="/admin/database" /> : null} />
          <CardBody style={{ paddingTop: 6 }}>
            {Object.entries(data.collections).map(([k, v], i) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                <Text size="sm" color="muted">
                  {LABELS[k] ?? k}
                </Text>
                <Text size="sm" weight="medium" tabular>
                  {v.toLocaleString("en-IN")}
                </Text>
              </View>
            ))}
          </CardBody>
        </Card>
      </Grid>
    </View>
  );
}

export default function AdminPage() {
  const { isAdmin, can } = useSession();
  // Same key as <Inner/> (shared cache) — only fetched when the guard below lets the page render.
  const { mutate } = useSWR<Stats>(isAdmin && can("users.view") ? "/api/admin/stats" : null);
  return (
    <Screen onRefresh={() => mutate()} refreshing={false}>
      <RequirePerm admin perm="users.view">
        <PageHeader title="Admin overview" subtitle="Platform health, users and activity — live." />
        <Inner />
      </RequirePerm>
    </Screen>
  );
}
