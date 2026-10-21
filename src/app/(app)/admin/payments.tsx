import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import useSWR from "swr";
import { CalendarDays, CreditCard, IndianRupee, RefreshCw, Search, Users } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { StatCard } from "@/components/stat-card";
import { useSession } from "@/components/session";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Grid, Input, Notice, PageHeader, Pagination, Screen, Select, Skeleton, Text, useBreakpoint, useTheme, useToast } from "@/ui";
import { api, qs } from "@/lib/api";
import { timeAgo } from "@/lib/format";

interface Row {
  id: string;
  userId: string;
  name: string;
  email: string;
  plan: "plus" | "pro" | "unlimited";
  amount: number;
  status: "created" | "paid" | "failed" | "refunded";
  method: string | null;
  orderId: string;
  paymentId: string | null;
  invoiceNo: string | null;
  createdAt: string;
  paidAt: string | null;
  periodEnd: string | null;
  verifiedBy: string | null;
  applied: boolean;
  note: string | null;
}
interface Resp {
  mode: "live" | "test" | "off";
  summary: { revenue: number; payments: number; month: number; monthPayments: number; byPlan: { plus: number; pro: number; unlimited: number }; payers: number; pendingToday: number };
  items: Row[];
  page: number;
  pages: number;
  total: number;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmt = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const TONE: Record<Row["status"], "success" | "warning" | "danger" | "default"> = { paid: "success", created: "warning", failed: "danger", refunded: "default" };
const LABEL: Record<Row["status"], string> = { paid: "Paid", created: "Not completed", failed: "Failed", refunded: "Refunded" };
const MONO = { fontFamily: "monospace" };

function Inner() {
  const t = useTheme();
  const bp = useBreakpoint();
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState<string | null>(null);
  const toast = useToast();
  const { can } = useSession();
  const { data, error, isLoading, mutate } = useSWR<Resp>(`/api/admin/payments${qs({ page, status, plan, q: query })}`, { refreshInterval: 30000 });

  const sync = async (id: string) => {
    setSyncing(id);
    try {
      const r = await api(`/api/admin/payments/${id}/sync`, { method: "POST" });
      toast.success("Checked with Razorpay", r.message);
      void mutate();
    } catch (e) {
      toast.error("Check failed", (e as Error).message);
    } finally {
      setSyncing(null);
    }
  };

  const status_ = (r: Row) => (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        <Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge>
        {!r.applied ? <Badge tone="danger">Not applied</Badge> : null}
      </View>
      {r.note ? (
        <Text size="2xs" color="muted" style={{ maxWidth: 220 }}>
          {r.note}
        </Text>
      ) : null}
    </View>
  );
  const ids = (r: Row) => (
    <View>
      {r.invoiceNo && r.status !== "created" ? (
        <Text size="xs" color="primary" onPress={() => router.push(`/plan/invoice/${r.id}` as never)}>
          {r.invoiceNo}
        </Text>
      ) : (
        <Text size="xs" color="muted">
          —
        </Text>
      )}
      <Text size="2xs" color="muted" style={MONO} numberOfLines={1}>
        {r.paymentId ?? r.orderId}
      </Text>
      {r.periodEnd && r.status === "paid" ? (
        <Text size="2xs" color="muted">{`until ${new Date(r.periodEnd).toLocaleDateString("en-IN")}`}</Text>
      ) : null}
    </View>
  );
  const checkBtn = (r: Row) =>
    (r.status === "created" || r.status === "failed" || !r.applied) && can("users.update") ? (
      <Button size="sm" variant="ghost" icon={RefreshCw} loading={syncing === r.id} onPress={() => void sync(r.id)} accessibilityHint="Ask Razorpay whether this order was paid">
        Check
      </Button>
    ) : null;
  const customer = (r: Row) => (
    <View style={{ minWidth: 0 }}>
      <Text size="sm" weight="medium" numberOfLines={1} onPress={() => router.push(`/admin/users/${r.userId}` as never)}>
        {r.name}
      </Text>
      <Text size="xs" color="muted" numberOfLines={1}>
        {r.email}
      </Text>
    </View>
  );

  return (
    <Screen onRefresh={() => mutate()} refreshing={false}>
      <PageHeader
        title="Payments"
        subtitle="Every plan purchase through Razorpay — refreshed every 30 seconds."
        actions={data ? <Badge tone={data.mode === "live" ? "success" : data.mode === "test" ? "warning" : "danger"}>{data.mode === "live" ? "Live mode" : data.mode === "test" ? "Test mode" : "Payments not set up"}</Badge> : null}
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => mutate()} />
      ) : !data ? (
        <Skeleton height={380} />
      ) : (
        <>
          {data.mode === "off" ? (
            <Notice tone="warning">Razorpay keys are not set. Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET in the API server's .env, then restart the API (pm2 reload budget-pro-api).</Notice>
          ) : null}
          <Grid cols={{ base: 1, sm: 2, xl: 4 }}>
            <StatCard label="Revenue (all time)" value={inr(data.summary.revenue)} icon={IndianRupee} hint={`${data.summary.payments} payments`} tone="success" />
            <StatCard label="This month" value={inr(data.summary.month)} icon={CalendarDays} hint={`${data.summary.monthPayments} payments`} />
            <StatCard label="Paying customers" value={data.summary.payers.toLocaleString("en-IN")} icon={Users} />
            <StatCard label="By plan" value={inr(data.summary.byPlan.unlimited)} icon={CreditCard} hint={`Unlimited · Pro ${inr(data.summary.byPlan.pro)} · Plus ${inr(data.summary.byPlan.plus)}`} />
          </Grid>

          <Card>
            <CardHeader title="All payments" subtitle={`${data.total} records${data.summary.pendingToday ? ` · ${data.summary.pendingToday} checkout(s) not completed in the last 24 h` : ""}`} />
            <View style={{ flexDirection: bp.sm ? "row" : "column", gap: 8, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
              <Input
                icon={Search}
                placeholder="Name, email, payment / order id, invoice no."
                value={q}
                onChangeText={setQ}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={() => {
                  setPage(1);
                  setQuery(q.trim());
                }}
                onBlur={() => {
                  if (q.trim() !== query) {
                    setPage(1);
                    setQuery(q.trim());
                  }
                }}
                containerStyle={{ flex: bp.sm ? 1 : undefined }}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Select
                  value={status}
                  onChange={(v) => {
                    setStatus(v);
                    setPage(1);
                  }}
                  title="Status"
                  style={{ flex: 1, minWidth: 140 }}
                  options={[
                    { value: "", label: "All statuses" },
                    { value: "paid", label: "Paid" },
                    { value: "created", label: "Not completed" },
                    { value: "failed", label: "Failed" },
                    { value: "refunded", label: "Refunded" },
                  ]}
                />
                <Select
                  value={plan}
                  onChange={(v) => {
                    setPlan(v);
                    setPage(1);
                  }}
                  title="Plan"
                  style={{ flex: 1, minWidth: 120 }}
                  options={[
                    { value: "", label: "All plans" },
                    { value: "plus", label: "Plus" },
                    { value: "pro", label: "Pro" },
                    { value: "unlimited", label: "Unlimited" },
                  ]}
                />
              </View>
            </View>
            {isLoading ? (
              <View style={{ padding: 18 }}>
                <Skeleton height={180} />
              </View>
            ) : data.items.length === 0 ? (
              <EmptyState title="No payments yet" message="Purchases appear here the moment they happen." />
            ) : (
              data.items.map((r, i) =>
                bp.lg ? (
                  <View key={r.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                    <View style={{ flex: 2, minWidth: 0 }}>{customer(r)}</View>
                    <Text size="sm" style={{ width: 80, textTransform: "capitalize" }}>
                      {r.plan}
                    </Text>
                    <Text size="sm" weight="medium" tabular style={{ width: 80, textAlign: "right" }}>
                      {inr(r.amount)}
                    </Text>
                    <View style={{ width: 150 }}>{status_(r)}</View>
                    <Text size="xs" color="muted" style={{ width: 70, textTransform: "uppercase" }}>
                      {r.method ?? "—"}
                    </Text>
                    <View style={{ width: 110 }}>
                      <Text size="xs" color="muted">
                        {fmt(r.paidAt ?? r.createdAt)}
                      </Text>
                      <Text size="2xs" color="muted">
                        {timeAgo(r.paidAt ?? r.createdAt)}
                      </Text>
                    </View>
                    <View style={{ flex: 1.5, minWidth: 0 }}>{ids(r)}</View>
                    <View style={{ width: 90, alignItems: "flex-end" }}>{checkBtn(r)}</View>
                  </View>
                ) : (
                  <View key={r.id} style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>{customer(r)}</View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text size="sm" weight="semibold" tabular>
                          {inr(r.amount)}
                        </Text>
                        <Text size="xs" color="muted" style={{ textTransform: "capitalize" }}>
                          {`${r.plan}${r.method ? ` · ${r.method.toUpperCase()}` : ""}`}
                        </Text>
                      </View>
                    </View>
                    {status_(r)}
                    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text size="2xs" color="muted">{`${fmt(r.paidAt ?? r.createdAt)} · ${timeAgo(r.paidAt ?? r.createdAt)}`}</Text>
                        {ids(r)}
                      </View>
                      {checkBtn(r)}
                    </View>
                  </View>
                ),
              )
            )}
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
          </Card>
        </>
      )}
    </Screen>
  );
}

export default function AdminPaymentsPage() {
  return (
    <RequirePerm admin perm="users.view">
      <Inner />
    </RequirePerm>
  );
}
