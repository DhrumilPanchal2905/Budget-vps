import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import useSWR from "swr";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, HeartPulse, Landmark, PiggyBank, Plus, Target, TrendingDown, TrendingUp, Wallet } from "lucide-react-native";
import { useSession } from "@/components/session";
import { RequirePerm } from "@/components/guard";
import { StatCard } from "@/components/stat-card";
import { CategoryDonut, HealthGauge, TrendArea } from "@/components/charts";
import { InsightRow, type InsightView } from "@/components/insight-row";
import { go } from "@/components/shell";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, Grid, PageHeader, Progress, Screen, Skeleton, Text, useTheme } from "@/ui";
import { fmtDate, timeAgo } from "@/lib/format";

interface Dashboard {
  month: string;
  monthLabel: string;
  summary: {
    income: number;
    expense: number;
    balance: number;
    savingsRate: number;
    incomeChange: number | null;
    expenseChange: number | null;
    totalSavings: number;
    freeBalance: number;
    goalSaved: number;
    goalTarget: number;
    totalDebt: number;
    emiMonthly: number;
    emiPaidThisMonth: number;
    activeDebts: number;
  };
  health: { score: number | null; savingsRate: number | null; emiRatio: number | null; expenseRatio: number | null; goalProgress: number | null; goalsOnTrack: number | null };
  trend: { label: string; income: number; expense: number; savings: number }[];
  expenseByCategory: { category: string; total: number; share: number }[];
  upcoming: { id: string; title: string; emi: number; dueDate: string; daysLeft: number }[];
  goals: { id: string; name: string; status: string; target: number; current: number; progress: number; targetDate: string; insight?: { status: string; requiredMonthly: number; expectedProgress: number; projectedDate: string | null } }[];
  recent: { id: string; kind: "income" | "expense"; title: string; category: string; amount: number; date: string }[];
  notifications: { unread: number; latest: { id: string; title: string; message: string; read: boolean; createdAt: string; link: string | null }[] };
  insights: InsightView[];
}

interface BudgetMini {
  daysLeft: number;
  items: { category: string; limit: number; spent: number; pct: number; status: "ok" | "warn" | "over" }[];
  total: { category: string; limit: number; spent: number; pct: number; status: "ok" | "warn" | "over" } | null;
}

const GOAL_STATUS: Record<string, { label: string; tone: "success" | "primary" | "warning" | "danger" | "default" }> = {
  achieved: { label: "Achieved", tone: "success" },
  ahead: { label: "Ahead", tone: "success" },
  on_track: { label: "On track", tone: "primary" },
  behind: { label: "Behind", tone: "warning" },
  overdue: { label: "Overdue", tone: "danger" },
  not_started: { label: "Not started", tone: "default" },
  paused: { label: "Paused", tone: "default" },
};

function LinkAction({ label, href, top }: { label: string; href: string; top?: boolean }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => (top ? go(href) : router.push(href as never))} hitSlop={8}>
      <Text size="xs" weight="medium" color="primary">
        {label}
      </Text>
    </Pressable>
  );
}

function Indicator({ label, value, good, suffix = "%" }: { label: string; value: number | null; good: boolean | null; suffix?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text size="sm" color="muted">
        {label}
      </Text>
      <Text size="sm" weight="medium" tabular color={good === null ? "fg" : good ? "success" : "warning"}>
        {value === null ? "—" : `${value}${suffix}`}
      </Text>
    </View>
  );
}

function ListRow({ children, first }: { children: ReactNode; first?: boolean }) {
  const t = useTheme();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: t.c.border }}>{children}</View>;
}

function BudgetsCard() {
  const { money } = useSession();
  const t = useTheme();
  const { data } = useSWR<BudgetMini>("/api/budgets");
  const rows = data ? [...(data.total ? [{ ...data.total, category: "Whole month" }] : []), ...data.items].slice(0, 5) : [];
  return (
    <Card>
      <CardHeader title="Budgets" subtitle={data ? `${data.daysLeft} days left this month` : undefined} action={<LinkAction label="Manage" href="/budgets" top />} />
      <CardBody style={{ gap: 14 }}>
        {!data ? (
          <Skeleton height={96} />
        ) : !rows.length ? (
          <EmptyState icon={<Wallet size={20} color={t.c.muted} />} title="No budgets yet" message="Set monthly limits — Angel suggests them from your spending." />
        ) : (
          rows.map((b) => (
            <View key={b.category}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <Text size="sm" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                  {b.category}
                </Text>
                <Text size="xs" tabular color={b.status === "over" ? "danger" : b.status === "warn" ? "warning" : "muted"}>
                  {money(b.spent, true)} / {money(b.limit, true)}
                </Text>
              </View>
              <Progress value={Math.min(100, b.pct)} tone={b.status === "over" ? "danger" : b.status === "warn" ? "warning" : "success"} />
            </View>
          ))
        )}
      </CardBody>
    </Card>
  );
}

function DashboardInner() {
  const t = useTheme();
  const { user, money, can } = useSession();
  const { data, error, isLoading, mutate } = useSWR<Dashboard>("/api/dashboard");

  if (error)
    return (
      <Screen>
        <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
      </Screen>
    );
  if (isLoading || !data) {
    return (
      <Screen>
        <Skeleton height={30} width={220} />
        <Grid cols={{ base: 2, lg: 4 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={112} />
          ))}
        </Grid>
        <Grid cols={{ base: 1, lg: 3 }} gap={16}>
          <Grid.Item span={{ base: 1, lg: 2 }}>
            <Skeleton height={320} />
          </Grid.Item>
          <Skeleton height={320} />
        </Grid>
      </Screen>
    );
  }

  const s = data.summary;
  const h = data.health;
  const firstName = user.name.split(" ")[0];
  const hasData = s.income || s.expense || data.recent.length || data.goals.length || s.activeDebts;

  return (
    <Screen onRefresh={() => void mutate()} refreshing={false}>
      <PageHeader
        title={`Hi, ${firstName} 👋`}
        subtitle={`Here's your financial overview for ${data.monthLabel}.`}
        actions={
          <>
            {can("expense.create") ? (
              <Button variant="secondary" icon={Plus} onPress={() => router.push("/expenses?new=1" as never)}>
                Expense
              </Button>
            ) : null}
            {can("income.create") ? (
              <Button icon={Plus} onPress={() => router.push("/income?new=1" as never)}>
                Income
              </Button>
            ) : null}
          </>
        }
      />

      {!hasData ? (
        <Card style={{ padding: 24, backgroundColor: t.a("primary", 0.06), borderColor: t.a("primary", 0.25) }}>
          <Text size="lg" weight="semibold">
            Let&apos;s set up your finances
          </Text>
          <Text size="sm" color="muted" style={{ marginTop: 4, maxWidth: 560 }}>
            Add your salary, a few expenses and any EMIs. Every chart, total and insight on this page is calculated from your real data and updates instantly.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
            <Button icon={TrendingUp} onPress={() => router.push("/income?new=1" as never)}>
              Add salary
            </Button>
            <Button variant="secondary" icon={TrendingDown} onPress={() => router.push("/expenses?new=1" as never)}>
              Add expense
            </Button>
            <Button variant="secondary" icon={Target} onPress={() => router.push("/goals?new=1" as never)}>
              Create goal
            </Button>
          </View>
        </Card>
      ) : null}

      <Grid cols={{ base: 2, lg: 4 }}>
        <StatCard label="Income this month" value={money(s.income)} icon={TrendingUp} change={s.incomeChange} hint="vs last month" />
        <StatCard label="Expenses this month" value={money(s.expense)} icon={TrendingDown} change={s.expenseChange} changeGoodWhenUp={false} hint="vs last month" />
        <StatCard label="Remaining balance" value={money(s.balance)} icon={Wallet} tone={s.balance < 0 ? "danger" : "default"} hint={s.income ? `${s.savingsRate}% savings rate` : "Add income to see rate"} />
        <StatCard label="Total balance" value={money(s.totalSavings)} icon={PiggyBank} tone={s.totalSavings < 0 ? "danger" : "default"} hint={s.goalSaved ? `${money(s.freeBalance, true)} free · ${money(s.goalSaved, true)} in goals` : "Lifetime income − expenses"} />
        <StatCard label="Goal savings" value={money(s.goalSaved)} icon={Target} hint={s.goalTarget ? `of ${money(s.goalTarget, true)} target${h.goalsOnTrack !== null ? ` · ${h.goalsOnTrack}% on track` : ""}` : "No goals yet"} />
        <StatCard label="Total debt" value={money(s.totalDebt)} icon={Landmark} hint={`${s.activeDebts} active loan${s.activeDebts === 1 ? "" : "s"}`} />
        <StatCard label="EMI obligations" value={money(s.emiMonthly)} icon={CalendarClock} hint={`${money(s.emiPaidThisMonth, true)} paid this month`} />
        <StatCard label="Health score" value={h.score === null ? "—" : `${h.score}/100`} icon={HeartPulse} tone={h.score === null ? "default" : h.score >= 70 ? "success" : h.score >= 45 ? "warning" : "danger"} hint="Savings, EMI load & goals" />
      </Grid>

      <Grid cols={{ base: 1, lg: 3 }} gap={16}>
        <Grid.Item span={{ base: 1, lg: 2 }}>
          <Card>
            <CardHeader title="Income vs expenses" subtitle="Last 6 months" action={can("reports.view") ? <LinkAction label="Full analytics" href="/analytics" top /> : null} />
            <CardBody>
              <TrendArea data={data.trend} />
            </CardBody>
          </Card>
        </Grid.Item>
        <Card>
          <CardHeader title="Financial health" subtitle={data.monthLabel} />
          <CardBody style={{ gap: 16 }}>
            <HealthGauge score={h.score} />
            <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: t.c.border, paddingTop: 16 }}>
              <Indicator label="Savings rate" value={h.savingsRate} good={h.savingsRate === null ? null : h.savingsRate >= 20} />
              <Indicator label="EMI to income" value={h.emiRatio} good={h.emiRatio === null ? null : h.emiRatio <= 35} />
              <Indicator label="Expense ratio" value={h.expenseRatio} good={h.expenseRatio === null ? null : h.expenseRatio <= 80} />
              {h.goalsOnTrack !== null ? <Indicator label="Goals on track" value={h.goalsOnTrack} good={h.goalsOnTrack >= 75} /> : <Indicator label="Goal progress" value={h.goalProgress} good={h.goalProgress === null ? null : h.goalProgress >= 50} />}
            </View>
          </CardBody>
        </Card>
      </Grid>

      <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={16}>
        <Card>
          <CardHeader title="Spending by category" subtitle={data.monthLabel} />
          <CardBody>
            <CategoryDonut data={data.expenseByCategory} height={170} emptyText="No expenses this month" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Savings goals" action={<LinkAction label="Manage" href="/goals" top />} />
          <CardBody style={{ gap: 16 }}>
            {!data.goals.length ? (
              <EmptyState icon={<Target size={20} color={t.c.muted} />} title="No goals yet" message="Create a goal like an emergency fund or a vacation." />
            ) : (
              data.goals.map((g) => (
                <View key={g.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Text size="sm" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                      {g.name}
                    </Text>
                    {g.insight && GOAL_STATUS[g.insight.status] ? (
                      <Badge tone={GOAL_STATUS[g.insight.status].tone}>{GOAL_STATUS[g.insight.status].label}</Badge>
                    ) : (
                      <Text size="xs" color="muted" tabular>
                        {g.progress}%
                      </Text>
                    )}
                  </View>
                  <Progress value={g.progress} tone={g.status === "achieved" ? "success" : g.insight?.status === "behind" || g.insight?.status === "overdue" ? "warning" : "primary"} />
                  <Text size="xs" color="muted" tabular style={{ marginTop: 4 }}>
                    {money(g.current, true)} of {money(g.target, true)} ({g.progress}%) · by {fmtDate(g.targetDate)}
                    {g.insight && g.status !== "achieved" && g.insight.requiredMonthly > 0 ? ` · need ${money(g.insight.requiredMonthly, true)}/mo` : ""}
                  </Text>
                </View>
              ))
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Upcoming payments" subtitle="EMIs due in the next 30 days" action={<LinkAction label="Debts" href="/debts" top />} />
          <CardBody style={{ paddingTop: 6 }}>
            {!data.upcoming.length ? (
              <EmptyState icon={<CalendarClock size={20} color={t.c.muted} />} title="Nothing due soon" message="Active EMIs due within 30 days appear here." />
            ) : (
              data.upcoming.map((u, i) => (
                <ListRow key={u.id} first={i === 0}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight="medium" numberOfLines={1}>
                      {u.title}
                    </Text>
                    <Text size="xs" color="muted">
                      {fmtDate(u.dueDate)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text size="sm" weight="medium" tabular>
                      {money(u.emi)}
                    </Text>
                    <Badge tone={u.daysLeft < 0 ? "danger" : u.daysLeft <= 3 ? "warning" : "default"}>{u.daysLeft < 0 ? `${Math.abs(u.daysLeft)}d overdue` : u.daysLeft === 0 ? "Today" : `in ${u.daysLeft}d`}</Badge>
                  </View>
                </ListRow>
              ))
            )}
          </CardBody>
        </Card>
      </Grid>

      <Grid cols={{ base: 1, lg: 5 }} gap={16}>
        <Grid.Item span={{ base: 1, lg: 3 }}>
          <Card>
            <CardHeader title="Recent transactions" />
            <CardBody style={{ paddingTop: 6 }}>
              {!data.recent.length ? (
                <EmptyState title="No transactions yet" message="Income and expenses you add will show up here." />
              ) : (
                data.recent.map((tx, i) => (
                  <ListRow key={`${tx.kind}-${tx.id}`} first={i === 0}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: t.a(tx.kind === "income" ? "success" : "danger", 0.1) }}>
                      {tx.kind === "income" ? <ArrowDownLeft size={16} color={t.c.success} /> : <ArrowUpRight size={16} color={t.c.danger} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" weight="medium" numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text size="xs" color="muted">
                        {tx.category} · {fmtDate(tx.date)}
                      </Text>
                    </View>
                    <Text size="sm" weight="semibold" tabular color={tx.kind === "income" ? "success" : "fg"}>
                      {tx.kind === "income" ? "+" : "−"}
                      {money(tx.amount)}
                    </Text>
                  </ListRow>
                ))
              )}
            </CardBody>
          </Card>
        </Grid.Item>
        <Grid.Item span={{ base: 1, lg: 2 }}>
          <View style={{ gap: 16 }}>
            {can("expense.view") ? <BudgetsCard /> : null}
            {can("insights.view") ? (
              <Card>
                <CardHeader title="Angel AI suggestions" action={<LinkAction label="See all" href="/insights" top />} />
                <CardBody style={{ paddingTop: 2, paddingBottom: 6 }}>
                  {data.insights.length ? (
                    data.insights.map((ins, i) => (
                      <View key={ins.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                        <InsightRow insight={ins} compact />
                      </View>
                    ))
                  ) : (
                    <Text size="sm" color="muted" center style={{ paddingVertical: 24 }}>
                      No insights yet.
                    </Text>
                  )}
                </CardBody>
              </Card>
            ) : null}
            {can("notifications.read") ? (
              <Card>
                <CardHeader title="Notifications" subtitle={data.notifications.unread ? `${data.notifications.unread} unread` : "All caught up"} action={<LinkAction label="Open" href="/notifications" top />} />
                <CardBody style={{ paddingTop: 6 }}>
                  {data.notifications.latest.length ? (
                    data.notifications.latest.map((n, i) => (
                      <ListRow key={n.id} first={i === 0}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, alignSelf: "flex-start", marginTop: 6, backgroundColor: n.read ? t.c.border : t.c.primary }} />
                        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => router.push((n.link || "/notifications") as never)}>
                          <Text size="sm" numberOfLines={1}>
                            {n.title}
                          </Text>
                          <Text size="2xs" color="muted">
                            {timeAgo(n.createdAt)}
                          </Text>
                        </Pressable>
                      </ListRow>
                    ))
                  ) : (
                    <Text size="sm" color="muted" center style={{ paddingVertical: 24 }}>
                      No notifications.
                    </Text>
                  )}
                </CardBody>
              </Card>
            ) : null}
          </View>
        </Grid.Item>
      </Grid>
    </Screen>
  );
}

export default function DashboardPage() {
  return (
    <RequirePerm perm="finance.read">
      <DashboardInner />
    </RequirePerm>
  );
}
