import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import useSWR from "swr";
import { Bot, Check, Crown, FileText, Lock, ShieldCheck, Sparkles } from "lucide-react-native";
import { useSession } from "@/components/session";
import { buyPlan, canBuyInApp } from "@/lib/checkout";
import { limitLabel, usagePct, type PlanDef, type PlanId } from "@/shared/plans";
import type { AngelQuotaDTO } from "@/shared/angel/types";
import { Badge, Button, Card, CardHeader, ErrorState, Grid, PageHeader, Progress, Screen, Skeleton, Text, useBreakpoint, useTheme, useToast } from "@/ui";

interface PlanResp {
  current: PlanDef;
  usage: { incomes: number; expenses: number; debts: number; goals: number; financeRecords: number };
  plans: PlanDef[];
}
interface Option {
  plan: PlanId;
  amount: number;
  available: boolean;
  mode?: "new" | "renew" | "upgrade";
  creditDays?: number;
  periodEnd?: string;
  reason?: string;
}
interface BillingResp {
  enabled: boolean;
  mode: "live" | "test" | "off";
  current: { id: PlanId; name: string; expiresAt: string | null; source: string | null };
  options: Option[];
  history: { id: string; plan: PlanId; amount: number; status: string; paidAt: string; periodStart: string; periodEnd: string; invoiceNo: string; paymentId: string; method: string | null; creditDays: number }[];
}

const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      <Text size="sm" color="muted">
        {label}
      </Text>
      <Text size="sm" tabular>
        {value}
      </Text>
    </View>
  );
}

function NoteBox({ children }: { children: string }) {
  const t = useTheme();
  return (
    <View style={{ borderRadius: 10, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.6), paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text size="xs" color="muted" center>
        {children}
      </Text>
    </View>
  );
}

export default function PlanPage() {
  const t = useTheme();
  const bp = useBreakpoint();
  const { data, error, isLoading, mutate } = useSWR<PlanResp>("/api/plan");
  const billing = useSWR<BillingResp>("/api/billing");
  const quota = useSWR<{ quota: AngelQuotaDTO }>("/api/angel/quota");
  const { refresh, isAdmin } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [canBuy, setCanBuy] = useState<boolean | null>(null);

  useEffect(() => {
    void canBuyInApp()
      .then(setCanBuy)
      .catch(() => setCanBuy(false));
  }, []);

  const reload = () => {
    void mutate();
    void billing.mutate();
    void quota.mutate();
  };

  if (error)
    return (
      <Screen>
        <ErrorState message={error.message} onRetry={() => mutate()} />
      </Screen>
    );
  if (isLoading || !data)
    return (
      <Screen>
        <Skeleton height={380} />
      </Screen>
    );

  const { current, usage } = data;
  const recPct = usagePct(usage.financeRecords, current.maxFinanceRecords);
  const goalPct = usagePct(usage.goals, current.maxGoals);
  const b = billing.data;
  const q = quota.data?.quota;
  const exp = b?.current.expiresAt;

  const buy = async (plan: PlanId) => {
    if (plan === "free") return;
    setBusy(plan);
    try {
      const r = await buyPlan(plan);
      if (r.status === "paid") toast.success("Payment successful 🎉", r.message);
      else if (r.status === "pending") toast.info("Payment received", r.message);
      else if (r.status === "failed") toast.error("Payment", r.message);
      if (r.status === "paid" || r.status === "pending") {
        refresh();
        reload();
      }
    } catch (e) {
      toast.error("Couldn't start payment", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const renderAction = (p: PlanDef) => {
    const opt = b?.options.find((o) => o.plan === p.id);
    const isCurrent = p.id === current.id;
    if (p.id === "free") return <NoteBox>{isCurrent ? "You are on this plan." : "Included for everyone."}</NoteBox>;
    if (isAdmin) return <NoteBox>Admins have every feature.</NoteBox>;
    if (!b || canBuy === null) return <Skeleton height={40} />;
    if (!canBuy) return <NoteBox>Plans can&apos;t be purchased in the iOS app.</NoteBox>;
    if (!b.enabled) return <NoteBox>Online payments are being set up — please check back soon.</NoteBox>;
    if (!opt?.available) return <NoteBox>{opt?.reason ?? "—"}</NoteBox>;
    const label = opt.mode === "renew" ? `Renew — ₹${opt.amount}` : opt.mode === "upgrade" ? `Upgrade — ₹${opt.amount}` : `Get ${p.name} — ₹${opt.amount}`;
    return (
      <View style={{ gap: 8 }}>
        <Button full variant={p.id === "pro" || opt.mode === "renew" ? "primary" : "secondary"} icon={opt.mode === "upgrade" || opt.mode === "renew" ? Sparkles : undefined} loading={busy === p.id} disabled={!!busy} onPress={() => void buy(p.id)}>
          {label}
        </Button>
        <Text size="2xs" color="muted" center>
          {opt.mode === "renew" ? `Adds 30 days → until ${fmt(opt.periodEnd!)}` : opt.creditDays ? `+${opt.creditDays} bonus days from your current plan · until ${fmt(opt.periodEnd!)}` : `30 days · until ${fmt(opt.periodEnd!)} · no auto-renew`}
        </Text>
      </View>
    );
  };

  return (
    <Screen onRefresh={reload} refreshing={false}>
      <PageHeader title="Plan & billing" subtitle="Limits are enforced on the server. Payments are processed securely by Razorpay." />
      <Grid cols={{ base: 1, lg: 3 }} gap={16}>
        <Card style={{ padding: 18, backgroundColor: t.a("primary", 0.05) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Crown size={20} color={t.c.primary} />
            <Text size="sm" color="muted">
              Current plan
            </Text>
          </View>
          <Text size="3xl" weight="semibold" tight style={{ marginTop: 8 }}>
            {current.name}
          </Text>
          {exp && !isAdmin ? (
            <Text size="sm" color="muted" style={{ marginTop: 4 }}>
              Active until{" "}
              <Text size="sm" weight="semibold">
                {fmt(exp)}
              </Text>{" "}
              · {daysLeft(exp)} days left
            </Text>
          ) : current.id !== "free" ? (
            <Text size="sm" color="muted" style={{ marginTop: 4 }}>
              {isAdmin ? "Admins always have every feature." : "Given by an administrator — no end date."}
            </Text>
          ) : (
            <Text size="sm" color="muted" style={{ marginTop: 4 }}>
              Free forever. Upgrade any time.
            </Text>
          )}
          <View style={{ marginTop: 16, gap: 6 }}>
            <Line label="Angel AI" value={current.angel.credits === null ? "Unlimited" : `${current.angel.credits} credits / ${current.angel.windowHours} h`} />
            <Line label="Advanced insights" value={current.advancedInsights ? "Enabled" : "—"} />
            <Line label="Finance records" value={limitLabel(current.maxFinanceRecords)} />
            <Line label="Savings goals" value={limitLabel(current.maxGoals)} />
          </View>
        </Card>
        <Grid.Item span={{ base: 1, lg: 2 }}>
          <Card style={{ padding: 18, gap: 20 }}>
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Bot size={16} color={t.c.primary} />
                  <Text size="sm">Angel AI credits</Text>
                </View>
                <Text size="sm" color="muted" tabular>
                  {!q ? "…" : q.limit === null ? "Unlimited" : `${q.remaining} of ${q.limit} left`}
                </Text>
              </View>
              {q && q.limit !== null ? <Progress value={usagePct(q.used, q.limit)} tone={q.remaining === 0 ? "danger" : (q.remaining ?? 0) <= q.limit * 0.2 ? "warning" : "primary"} /> : null}
              <Text size="xs" color="muted" style={{ marginTop: 6 }}>
                {q && q.limit !== null
                  ? q.resetAt
                    ? `Refills ${new Date(q.resetAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} (${q.windowHours}-hour window). Simple questions cost 1 credit; long questions, web look-ups and actions cost a bit more.`
                    : `Your ${q.windowHours}-hour window starts with your next message.`
                  : "No limits on Angel."}
              </Text>
            </View>
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                <Text size="sm">Finance records</Text>
                <Text size="sm" color="muted" tabular>
                  {usage.financeRecords.toLocaleString("en-IN")} / {limitLabel(current.maxFinanceRecords)}
                </Text>
              </View>
              {!current.unlimited ? <Progress value={recPct} tone={recPct >= 100 ? "danger" : recPct >= 80 ? "warning" : "primary"} /> : null}
              <Text size="xs" color="muted" style={{ marginTop: 6 }}>
                {usage.incomes} income · {usage.expenses} expenses · {usage.debts} debts
              </Text>
            </View>
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                <Text size="sm">Savings goals</Text>
                <Text size="sm" color="muted" tabular>
                  {usage.goals} / {limitLabel(current.maxGoals)}
                </Text>
              </View>
              {!current.unlimited ? <Progress value={goalPct} tone={goalPct >= 100 ? "danger" : goalPct >= 80 ? "warning" : "primary"} /> : null}
            </View>
          </Card>
        </Grid.Item>
      </Grid>

      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12 }}>
        <Text size="sm" weight="semibold">
          Plans
        </Text>
        {b?.mode === "test" ? <Badge tone="warning">Test mode — no real money is charged</Badge> : null}
      </View>
      <Grid cols={{ base: 1, sm: 2, xl: 4 }} gap={16}>
        {data.plans.map((p) => {
          const isCurrent = p.id === current.id;
          return (
            <Card key={p.id} style={[{ padding: 18, flex: 1 }, isCurrent ? { borderColor: t.a("primary", 0.6), borderWidth: 2 } : p.id === "pro" ? { borderColor: t.a("primary", 0.3) } : null]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text size="md" weight="semibold">
                  {p.name}
                </Text>
                {isCurrent ? <Badge tone="primary">Current</Badge> : p.id === "pro" ? <Badge tone="success">Popular</Badge> : null}
              </View>
              <Text size="xs" color="muted" style={{ marginTop: 4 }}>
                {p.tagline}
              </Text>
              {canBuy !== false || p.priceInr === 0 ? (
                <Text size="2xl" weight="semibold" style={{ marginTop: 12 }}>
                  {p.priceInr === 0 ? "₹0" : `₹${p.priceInr}`}
                  {p.priceInr > 0 ? (
                    <Text size="sm" color="muted">
                      {" "}
                      /month
                    </Text>
                  ) : null}
                </Text>
              ) : null}
              <View style={{ marginTop: 14, gap: 8, flexGrow: 1 }}>
                {p.features.map((f) => (
                  <View key={f} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <Check size={16} color={t.c.success} style={{ marginTop: 2 }} />
                    <Text size="sm" color="muted" style={{ flex: 1 }}>
                      {f}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 18 }}>{renderAction(p)}</View>
            </Card>
          );
        })}
      </Grid>
      {canBuy !== false ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 16, rowGap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Lock size={14} color={t.c.muted} />
            <Text size="xs" color="muted">
              UPI, cards, netbanking & wallets via Razorpay
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <ShieldCheck size={14} color={t.c.muted} />
            <Text size="xs" color="muted">
              We never see or store your card / UPI details
            </Text>
          </View>
          <Pressable accessibilityRole="link" onPress={() => router.push("/refund-policy" as never)}>
            <Text size="xs" color="muted" style={{ textDecorationLine: "underline" }}>
              Refund & cancellation policy
            </Text>
          </Pressable>
        </View>
      ) : null}

      {b && b.history.length > 0 ? (
        <Card style={{ marginTop: 12 }}>
          <CardHeader title="Payment history" subtitle="Invoices can be printed, saved as PDF or shared." />
          <View style={{ paddingTop: 8 }}>
            {bp.md ? (
              <View style={{ flexDirection: "row", paddingHorizontal: 18, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
                {["Date", "Plan", "Period", "Amount", "Invoice"].map((h, i) => (
                  <Text key={h} size="xs" color="muted" weight="medium" style={{ flex: i === 2 ? 2 : 1, textAlign: i >= 3 ? "right" : "left" }}>
                    {h}
                  </Text>
                ))}
              </View>
            ) : null}
            {b.history.map((h, i) => {
              const invoice = (
                <Pressable accessibilityRole="link" onPress={() => router.push(`/plan/invoice/${h.id}` as never)} style={{ flexDirection: "row", alignItems: "center", gap: 4, justifyContent: bp.md ? "flex-end" : "flex-start" }}>
                  <FileText size={14} color={t.c.primary} />
                  <Text size="sm" color="primary">
                    {h.invoiceNo}
                  </Text>
                </Pressable>
              );
              const amount = (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: bp.md ? "flex-end" : "flex-start" }}>
                  <Text size="sm" tabular>
                    ₹{h.amount.toLocaleString("en-IN")}
                  </Text>
                  {h.status === "refunded" ? <Badge tone="warning">Refunded</Badge> : null}
                </View>
              );
              const period = `${h.periodStart ? fmt(h.periodStart) : "—"} → ${h.periodEnd ? fmt(h.periodEnd) : "—"}`;
              return bp.md ? (
                <View key={h.id} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                  <Text size="sm" style={{ flex: 1 }}>
                    {fmt(h.paidAt)}
                  </Text>
                  <Text size="sm" style={{ flex: 1, textTransform: "capitalize" }}>
                    {h.plan}
                  </Text>
                  <Text size="sm" color="muted" style={{ flex: 2 }}>
                    {period}
                  </Text>
                  <View style={{ flex: 1 }}>{amount}</View>
                  <View style={{ flex: 1 }}>{invoice}</View>
                </View>
              ) : (
                <View key={h.id} style={{ paddingHorizontal: 18, paddingVertical: 12, gap: 4, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Text size="sm" weight="medium" style={{ textTransform: "capitalize" }}>
                      {h.plan} · {fmt(h.paidAt)}
                    </Text>
                    {amount}
                  </View>
                  <Text size="xs" color="muted">
                    {period}
                  </Text>
                  {invoice}
                </View>
              );
            })}
          </View>
          <View style={{ height: 8 }} />
        </Card>
      ) : null}
    </Screen>
  );
}
