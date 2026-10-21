import { useState } from "react";
import { View } from "react-native";
import useSWR, { useSWRConfig } from "swr";
import { AlertTriangle, CheckCircle2, Minus, Pencil, PiggyBank, Plus, Sparkles, Trash2, Wallet } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { useSession } from "@/components/session";
import { api, ApiClientError } from "@/lib/api";
import { EXPENSE_CATEGORIES } from "@/shared/finance-config";
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, Field, Grid, IconButton, Input, Modal, PageHeader, Progress, Screen, Select, Skeleton, Text, useTheme, useToast } from "@/ui";

interface Row {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
  status: "ok" | "warn" | "over";
  alertPct: number;
  perDay: number;
  projected: number;
  projectedOver: boolean;
}
interface Report {
  month: string;
  daysLeft: number;
  items: Row[];
  total: Row | null;
  suggestions: { category: string; avg: number; suggested: number }[];
}

const TOTAL = "__total__";
const label = (c: string) => (c === TOTAL ? "Whole month (all spending)" : c);

function Editor({ open, onClose, initial, existing }: { open: boolean; onClose: () => void; initial: { category: string; amount: string; alertPct: number } | null; existing: string[] }) {
  const toast = useToast();
  const t = useTheme();
  const { mutate } = useSWRConfig();
  const [form, setForm] = useState(initial ?? { category: "", amount: "", alertPct: 80 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial?.category && existing.includes(initial.category));
  const options = [TOTAL, ...EXPENSE_CATEGORIES.filter((c) => c !== "EMI / Debt")].filter((c) => c === form.category || !existing.includes(c));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const r = await api<Report>("/api/budgets", { method: "PUT", body: { category: form.category, amount: form.amount, alertPct: Number(form.alertPct) } });
      await mutate("/api/budgets", r.data, { revalidate: false });
      toast.success(r.message || "Budget saved.");
      onClose();
    } catch (e) {
      const err = e as ApiClientError;
      setErrors(err.errors ?? { form: err.message });
    } finally {
      setSaving(false);
    }
  };

  const step = (d: number) => setForm((f) => ({ ...f, alertPct: Math.max(50, Math.min(100, f.alertPct + d)) }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${label(form.category)} budget` : "New budget"}
      description="A monthly spending limit. You'll get a notification at the alert level and when it's crossed."
      footer={
        <>
          <Button variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button onPress={() => void save()} loading={saving} disabled={!form.category || !form.amount}>
            Save budget
          </Button>
        </>
      }
    >
      <View style={{ gap: 16 }}>
        <Field label="Category" error={errors.category}>
          <Select value={form.category} disabled={editing} title="Category" placeholder="Choose…" options={options.map((c) => ({ value: c, label: label(c) }))} onChange={(v) => setForm({ ...form, category: v })} />
        </Field>
        <Field label="Monthly limit" error={errors.amount}>
          <Input numeric value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} placeholder="5000" invalid={Boolean(errors.amount)} onSubmitEditing={() => void save()} />
        </Field>
        <Field label={`Alert me at ${form.alertPct}% used`}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <IconButton icon={Minus} label="Lower alert level" onPress={() => step(-5)} disabled={form.alertPct <= 50} />
            <View style={{ flex: 1 }}>
              <Progress value={((form.alertPct - 50) / 50) * 100} />
            </View>
            <IconButton icon={Plus} label="Raise alert level" onPress={() => step(5)} disabled={form.alertPct >= 100} />
          </View>
          <Text size="2xs" color="muted" style={{ color: t.c.muted }}>
            50% – 100%, in steps of 5%
          </Text>
        </Field>
        {errors.form ? (
          <Text size="sm" color="danger">
            {errors.form}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

function BudgetRow({ r, onEdit, onDelete }: { r: Row; onEdit: () => void; onDelete: () => void }) {
  const { money } = useSession();
  const t = useTheme();
  const tone = r.status === "over" ? "danger" : r.status === "warn" ? "warning" : "success";
  return (
    <Card padded>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" weight="semibold" numberOfLines={1}>
            {label(r.category)}
          </Text>
          <Text size="xs" color="muted" tabular style={{ marginTop: 2 }}>
            {money(r.spent)} of {money(r.limit)} · {r.pct}%
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Badge tone={tone}>{r.status === "over" ? "Over" : r.status === "warn" ? "Close" : "On track"}</Badge>
          <IconButton icon={Pencil} label="Edit budget" onPress={onEdit} />
          <IconButton icon={Trash2} label="Delete budget" onPress={onDelete} />
        </View>
      </View>
      <View style={{ marginTop: 12 }}>
        <Progress value={Math.min(100, r.pct)} tone={tone} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
        <Text size="xs" tabular color={r.remaining < 0 ? "danger" : "muted"}>
          {r.remaining < 0 ? `${money(-r.remaining)} over` : `${money(r.remaining)} left · ${money(r.perDay)}/day`}
        </Text>
        {r.projectedOver && r.status !== "over" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={14} color={t.c.warning} />
            <Text size="xs" color="warning">
              Heading to {money(r.projected)}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function Inner() {
  const { money } = useSession();
  const t = useTheme();
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<Report>("/api/budgets");
  const [editor, setEditor] = useState<{ category: string; amount: string; alertPct: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const edit = (r?: Row, preset?: { category: string; amount: number }) => {
    setEditor(r ? { category: r.category, amount: String(r.limit), alertPct: r.alertPct } : preset ? { category: preset.category, amount: String(preset.amount), alertPct: 80 } : null);
    setOpen(true);
  };
  const remove = async () => {
    if (!del) return;
    setBusy(true);
    try {
      const r = await api<Report>(`/api/budgets?category=${encodeURIComponent(del)}`, { method: "DELETE" });
      await mutate(r.data, { revalidate: false });
      toast.success("Budget removed.");
      setDel(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const all = data ? [...(data.total ? [data.total] : []), ...data.items] : [];
  const over = all.filter((r) => r.status === "over").length;
  const stat = (lbl: string, value: string, color?: "danger" | "success") => (
    <Card padded>
      <Text size="xs" color="muted">
        {lbl}
      </Text>
      <Text size="xl" weight="semibold" tabular color={color ?? "fg"} style={{ marginTop: 4 }}>
        {value}
      </Text>
    </Card>
  );

  return (
    <Screen onRefresh={() => void mutate()} refreshing={false}>
      <PageHeader
        title="Budgets"
        subtitle={data ? `${data.daysLeft} day${data.daysLeft === 1 ? "" : "s"} left this month · limits reset every month` : "Monthly spending limits per category."}
        actions={
          <Button icon={Plus} onPress={() => edit()}>
            New budget
          </Button>
        }
      />
      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <Grid cols={{ base: 1, sm: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={128} />
          ))}
        </Grid>
      ) : (
        <>
          {all.length > 0 ? (
            <Grid cols={{ base: 2, lg: 4 }}>
              {stat("Budgeted", money(data.total ? data.total.limit : data.items.reduce((s, r) => s + r.limit, 0), true))}
              {stat("Spent", money(data.total ? data.total.spent : data.items.reduce((s, r) => s + r.spent, 0), true))}
              {stat("Over limit", String(over), over ? "danger" : "success")}
              <Card padded>
                <Text size="xs" color="muted">
                  Status
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                  {over ? <AlertTriangle size={16} color={t.c.danger} /> : <CheckCircle2 size={16} color={t.c.success} />}
                  <Text size="sm" weight="semibold">
                    {over ? "Needs attention" : "All good"}
                  </Text>
                </View>
              </Card>
            </Grid>
          ) : null}
          {all.length ? (
            <Grid cols={{ base: 1, sm: 2 }}>
              {all.map((r) => (
                <BudgetRow key={r.category} r={r} onEdit={() => edit(r)} onDelete={() => setDel(r.category)} />
              ))}
            </Grid>
          ) : (
            <Card>
              <EmptyState
                icon={<Wallet size={22} color={t.c.muted} />}
                title="No budgets yet"
                message="Set a monthly limit for the categories you want to control. You can also just tell Angel: “food budget 5000”."
                action={<Button onPress={() => edit()}>Create your first budget</Button>}
              />
            </Card>
          )}
          {data.suggestions.length > 0 ? (
            <Card>
              <CardHeader
                title={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Sparkles size={16} color={t.c.primary} />
                    <Text size="sm" weight="semibold">
                      Angel AI suggests
                    </Text>
                  </View>
                }
                subtitle="Based on your last 3 months (10% below your average)"
              />
              <View style={{ paddingHorizontal: 18, paddingBottom: 8, paddingTop: 6 }}>
                {data.suggestions.map((s, i) => (
                  <View key={s.category} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" weight="medium">
                        {s.category}
                      </Text>
                      <Text size="xs" color="muted" tabular>
                        Average {money(s.avg)}/month
                      </Text>
                    </View>
                    <Button size="sm" variant="secondary" icon={PiggyBank} onPress={() => edit(undefined, { category: s.category, amount: s.suggested })}>
                      {`Set ${money(s.suggested)}`}
                    </Button>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
        </>
      )}
      {open ? <Editor open={open} onClose={() => setOpen(false)} initial={editor} existing={all.map((r) => r.category)} /> : null}
      <ConfirmDialog open={Boolean(del)} onClose={() => setDel(null)} onConfirm={remove} loading={busy} title="Remove this budget?" message={del ? `The ${label(del)} limit will be removed. Your expenses are not affected.` : ""} confirmLabel="Remove" danger />
    </Screen>
  );
}

export default function BudgetsPage() {
  return (
    <RequirePerm perm={["finance.read", "expense.view"]}>
      <Inner />
    </RequirePerm>
  );
}
