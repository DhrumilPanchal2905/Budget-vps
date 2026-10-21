import { useState } from "react";
import { View } from "react-native";
import useSWR from "swr";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { useSession } from "@/components/session";
import { StatCard } from "@/components/stat-card";
import { CategoryComparison, CategoryDonut, IncomeExpenseBars, SingleLine } from "@/components/charts";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, Grid, IconButton, MonthInput, PageHeader, Progress, Screen, Skeleton, Tabs, Text, useTheme } from "@/ui";
import { qs } from "@/lib/api";
import { fmtDate, monthStr, shiftMonth } from "@/lib/format";

interface Cat {
  category: string;
  total: number;
  count: number;
  share: number;
}
interface Monthly {
  month: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
  balance: number;
  savingsRate: number;
  emiPaid: number;
  emiDue: number;
  debtRemaining: number;
  goalSaved: number;
  previous: { income: number; expense: number; savings: number; incomeChange: number | null; expenseChange: number | null };
  expenseByCategory: Cat[];
  incomeByCategory: Cat[];
  categoryComparison: { category: string; current: number; previous: number }[];
  daily: { label: string; income: number; expense: number; balance: number }[];
}
interface Overall {
  totals: {
    income: number;
    expense: number;
    savings: number;
    savingsRate: number;
    debtRemaining: number;
    totalBorrowed: number;
    debtPaid: number;
    emiMonthly: number;
    goalSaved: number;
    goalTarget: number;
    goalsAchieved: number;
    goalCount: number;
    avgMonthlyIncome: number;
    avgMonthlyExpense: number;
  };
  monthly: { label: string; income: number; expense: number; savings: number; cumulativeSavings: number; savingsRate: number }[];
  expenseByCategory: Cat[];
  incomeByCategory: Cat[];
  debts: { id: string; title: string; status: string; total: number; remaining: number; paid: number; emi: number; progress: number; monthsLeft: number }[];
  goals: { id: string; name: string; status: string; target: number; current: number; progress: number; targetDate: string }[];
}

function MonthlyView({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const { money } = useSession();
  const t = useTheme();
  const { data, error, isLoading, mutate } = useSWR<Monthly>(`/api/analytics${qs({ view: "monthly", month })}`);

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <IconButton icon={ChevronLeft} label="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} tone="fg" />
        <View style={{ minWidth: 170 }}>
          <MonthInput value={month} onChange={(v) => v && setMonth(v)} clearable={false} compact />
        </View>
        <IconButton icon={ChevronRight} label="Next month" onPress={() => setMonth(shiftMonth(month, 1))} tone="fg" />
        {month !== monthStr() ? (
          <Button size="sm" variant="ghost" onPress={() => setMonth(monthStr())}>
            This month
          </Button>
        ) : null}
      </View>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
      ) : !data || isLoading ? (
        <>
          <Grid cols={{ base: 2, lg: 4 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={112} />
            ))}
          </Grid>
          <Skeleton height={320} />
        </>
      ) : (
        <>
          <Grid cols={{ base: 2, lg: 4 }}>
            <StatCard label="Income" value={money(data.income)} change={data.previous.incomeChange} hint="vs previous month" />
            <StatCard label="Expenses" value={money(data.expense)} change={data.previous.expenseChange} changeGoodWhenUp={false} hint="vs previous month" />
            <StatCard label="Net savings" value={money(data.savings)} tone={data.savings < 0 ? "danger" : "success"} hint={data.income ? `${data.savingsRate}% of income` : undefined} />
            <StatCard label="EMI paid / due" value={money(data.emiPaid)} hint={`of ${money(data.emiDue)} monthly EMIs`} />
            <StatCard label="Debt remaining" value={money(data.debtRemaining)} hint="All active loans" />
            <StatCard label="Goal savings" value={money(data.goalSaved)} hint="Saved across goals" />
            <StatCard label="Last month income" value={money(data.previous.income)} />
            <StatCard label="Last month expenses" value={money(data.previous.expense)} />
          </Grid>

          <Card>
            <CardHeader title={`Daily income & expenses — ${data.label}`} subtitle="Per day of the month" />
            <CardBody>
              <IncomeExpenseBars data={data.daily} height={260} />
            </CardBody>
          </Card>

          <Grid cols={{ base: 1, lg: 2 }} gap={16}>
            <Card>
              <CardHeader title="Running balance" subtitle="Cumulative income − expenses through the month" />
              <CardBody>
                <SingleLine data={data.daily} dataKey="balance" name="Balance" color={t.series[2]} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Expenses by category" />
              <CardBody>
                <CategoryDonut data={data.expenseByCategory} height={190} emptyText="No expenses this month" />
              </CardBody>
            </Card>
          </Grid>

          <Grid cols={{ base: 1, lg: 2 }} gap={16}>
            <Card>
              <CardHeader title="Category comparison" subtitle="This month vs previous month" />
              <CardBody>{data.categoryComparison.length ? <CategoryComparison data={data.categoryComparison} /> : <EmptyState title="No expenses to compare" />}</CardBody>
            </Card>
            <Card>
              <CardHeader title="Income sources" />
              <CardBody>
                <CategoryDonut data={data.incomeByCategory} height={190} emptyText="No income this month" />
              </CardBody>
            </Card>
          </Grid>
        </>
      )}
    </>
  );
}

function OverallView() {
  const { money } = useSession();
  const t = useTheme();
  const { data, error, isLoading, mutate } = useSWR<Overall>("/api/analytics?view=overall");
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => mutate()} />;
  if (!data || isLoading)
    return (
      <Grid cols={{ base: 2, lg: 4 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={112} />
        ))}
      </Grid>
    );
  const tt = data.totals;
  return (
    <>
      <Grid cols={{ base: 2, lg: 4 }}>
        <StatCard label="Total income" value={money(tt.income)} hint={`avg ${money(tt.avgMonthlyIncome, true)}/month`} />
        <StatCard label="Total expenses" value={money(tt.expense)} hint={`avg ${money(tt.avgMonthlyExpense, true)}/month`} />
        <StatCard label="Total savings" value={money(tt.savings)} tone={tt.savings < 0 ? "danger" : "success"} hint={tt.income ? `${tt.savingsRate}% savings rate` : undefined} />
        <StatCard label="Total debt" value={money(tt.debtRemaining)} hint={`${money(tt.debtPaid, true)} repaid of ${money(tt.totalBorrowed, true)}`} />
        <StatCard label="Monthly EMIs" value={money(tt.emiMonthly)} />
        <StatCard label="Goal savings" value={money(tt.goalSaved)} hint={tt.goalTarget ? `of ${money(tt.goalTarget, true)}` : undefined} />
        <StatCard label="Goals achieved" value={`${tt.goalsAchieved} / ${tt.goalCount}`} />
        <StatCard label="Savings rate" value={tt.income ? `${tt.savingsRate}%` : "—"} tone={tt.savingsRate >= 20 ? "success" : tt.savingsRate < 0 ? "danger" : "default"} />
      </Grid>

      <Card>
        <CardHeader title="Monthly income vs expenses" subtitle="Long-term trend" />
        <CardBody>
          <IncomeExpenseBars data={data.monthly} height={300} showSavings />
        </CardBody>
      </Card>

      <Grid cols={{ base: 1, lg: 2 }} gap={16}>
        <Card>
          <CardHeader title="Savings trend" subtitle="Cumulative net savings over time" />
          <CardBody>
            <SingleLine data={data.monthly} dataKey="cumulativeSavings" name="Cumulative savings" color={t.series[2]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Monthly expense trend" />
          <CardBody>
            <SingleLine data={data.monthly} dataKey="expense" name="Expenses" color={t.series[1]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Monthly income trend" />
          <CardBody>
            <SingleLine data={data.monthly} dataKey="income" name="Income" color={t.series[0]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Expense categories" subtitle="All time" />
          <CardBody>
            <CategoryDonut data={data.expenseByCategory} height={190} />
          </CardBody>
        </Card>
      </Grid>

      <Grid cols={{ base: 1, lg: 2 }} gap={16}>
        <Card>
          <CardHeader title="Debt / EMI progress" />
          <CardBody style={{ gap: 16 }}>
            {!data.debts.length ? (
              <EmptyState title="No debts tracked" />
            ) : (
              data.debts.map((d) => (
                <View key={d.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Text size="sm" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                      {d.title}
                    </Text>
                    {d.status === "closed" ? (
                      <Badge tone="success">Paid off</Badge>
                    ) : (
                      <Text size="xs" color="muted" tabular>
                        {d.monthsLeft} months left
                      </Text>
                    )}
                  </View>
                  <Progress value={d.progress} tone={d.status === "closed" ? "success" : "primary"} />
                  <Text size="xs" color="muted" tabular style={{ marginTop: 4 }}>
                    {money(d.paid, true)} paid · {money(d.remaining, true)} remaining · EMI {money(d.emi, true)}
                  </Text>
                </View>
              ))
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Savings goal progress" />
          <CardBody style={{ gap: 16 }}>
            {!data.goals.length ? (
              <EmptyState title="No goals yet" />
            ) : (
              data.goals.map((g) => (
                <View key={g.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <Text size="sm" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                      {g.name}
                    </Text>
                    <Text size="xs" color="muted" tabular>
                      {g.progress}%
                    </Text>
                  </View>
                  <Progress value={g.progress} tone={g.status === "achieved" ? "success" : "primary"} />
                  <Text size="xs" color="muted" tabular style={{ marginTop: 4 }}>
                    {money(g.current, true)} of {money(g.target, true)} · by {fmtDate(g.targetDate)}
                  </Text>
                </View>
              ))
            )}
          </CardBody>
        </Card>
      </Grid>
    </>
  );
}

function Inner() {
  const [view, setView] = useState<"monthly" | "overall">("monthly");
  const [month, setMonth] = useState(monthStr());
  const { mutate } = useSWR(view === "monthly" ? `/api/analytics${qs({ view: "monthly", month })}` : "/api/analytics?view=overall");
  return (
    <Screen onRefresh={() => void mutate()} refreshing={false}>
      <PageHeader
        title="Analytics"
        subtitle="Accurate, server-calculated reports from your real data."
        actions={
          <Tabs
            value={view}
            onChange={setView}
            items={[
              { value: "monthly", label: "Monthly" },
              { value: "overall", label: "Overall" },
            ]}
          />
        }
      />
      {view === "monthly" ? <MonthlyView month={month} setMonth={setMonth} /> : <OverallView />}
    </Screen>
  );
}

export default function AnalyticsPage() {
  return (
    <RequirePerm perm={["finance.read", "reports.view"]}>
      <Inner />
    </RequirePerm>
  );
}
