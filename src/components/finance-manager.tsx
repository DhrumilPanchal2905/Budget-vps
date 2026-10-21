// Income / expenses / debts / goals manager — same behaviour as the old finance-page.tsx (also used by admins
// to manage a user's records with apiBase="/api/admin/users/<id>/finance" and mode="admin").
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import useSWR, { useSWRConfig } from "swr";
import { ArrowDownLeft, Download, HandCoins, History, Pencil, PiggyBank, Plus, Repeat, Search, Trash2 } from "lucide-react-native";
import { api, ApiClientError, qs } from "@/lib/api";
import { fmtDate, todayStr } from "@/lib/format";
import { downloadFromApi } from "@/lib/download";
import { RESOURCES, type FieldDef, type ResourceKey } from "@/shared/finance-config";
import { limitLabel, planForUser, usagePct } from "@/shared/plans";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DateInput,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Modal,
  MonthInput,
  PageHeader,
  Pagination,
  Progress,
  Screen,
  Select,
  Skeleton,
  Text,
  useBreakpoint,
  useTheme,
  useToast,
  type Option,
} from "@/ui";
import { useSession } from "./session";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any> & { id: string };
interface ListResponse {
  items: Row[];
  total: number;
  page: number;
  pages: number;
  sum: number;
}

type Tone = "success" | "warning" | "default" | "primary" | "danger";
const STATUS_TONE: Record<string, Tone> = { active: "primary", paused: "warning", closed: "success", achieved: "success", cancelled: "default" };

interface GoalInsightView {
  remaining: number;
  monthsLeft: number;
  requiredMonthly: number;
  expectedProgress: number;
  monthlyPace: number;
  projectedDate: string | null;
  status: "achieved" | "on_track" | "ahead" | "behind" | "overdue" | "not_started" | "paused" | "cancelled";
}
const GOAL_TONE: Record<GoalInsightView["status"], Tone> = { achieved: "success", ahead: "success", on_track: "primary", behind: "warning", overdue: "danger", not_started: "default", paused: "default", cancelled: "default" };
const GOAL_LABEL: Record<GoalInsightView["status"], string> = { achieved: "Achieved", ahead: "Ahead", on_track: "On track", behind: "Behind", overdue: "Overdue", not_started: "Not started", paused: "Paused", cancelled: "Cancelled" };

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function defaultsFor(resource: ResourceKey): Record<string, string> {
  switch (resource) {
    case "income":
      return { title: "", type: "salary", category: "Salary", amount: "", date: todayStr(), recurring: "monthly", notes: "", autoRepeat: "false" };
    case "expense":
      return { title: "", category: "Food & Dining", amount: "", date: todayStr(), recurring: "none", notes: "", autoRepeat: "false" };
    case "debt":
      return { title: "", totalAmount: "", remainingAmount: "", emiAmount: "", interestRate: "", dueDate: todayStr(), status: "active", notes: "" };
    case "goal":
      return { name: "", targetAmount: "", currentAmount: "0", targetDate: "", status: "active", notes: "" };
  }
}

function toForm(resource: ResourceKey, row: Row): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of RESOURCES[resource].fields) out[f.name] = row[f.name] === null || row[f.name] === undefined ? "" : String(row[f.name]);
  if (resource === "income" || resource === "expense") out.autoRepeat = row.autoRepeat ? "true" : "false";
  return out;
}

const SUBTITLE: Record<ResourceKey, string> = {
  income: "Salary and every extra rupee you earn.",
  expense: "Track where your money goes.",
  debt: "Loans, EMIs and repayment progress.",
  goal: "Save towards what matters.",
};

export function FinanceManager({
  resource,
  apiBase = "/api/finance",
  mode = "self",
  canCreate,
  canUpdate,
  canDelete,
  ownerPlan,
}: {
  resource: ResourceKey;
  apiBase?: string;
  mode?: "self" | "admin";
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  ownerPlan?: string;
}) {
  const def = RESOURCES[resource];
  const t = useTheme();
  const bp = useBreakpoint();
  const { money, can, user } = useSession();
  const toast = useToast();
  const { mutate: globalMutate } = useSWRConfig();
  const params = useLocalSearchParams<{ new?: string }>();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [sort, setSort] = useState(def.dateField);
  const [order, setOrder] = useState<"desc" | "asc">(resource === "debt" || resource === "goal" ? "asc" : "desc");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);

  useEffect(() => setPage(1), [dq, category, status, month, sort, order]);

  const key = `${apiBase}/${resource}${qs({ q: dq, category, status, month, sort, order, page, limit: 15 })}`;
  const { data, error, isLoading, mutate } = useSWR<ListResponse>(key);
  const planKey = mode === "self" ? "/api/plan" : null;
  const { data: planData } = useSWR<{ current: { maxFinanceRecords: number | null; maxGoals: number | null; name: string }; usage: { financeRecords: number; goals: number } }>(planKey);

  // ---- form state ----
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>(defaultsFor(resource));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ---- delete / actions ----
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionRow, setActionRow] = useState<Row | null>(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionDate, setActionDate] = useState(todayStr());
  const [actionErr, setActionErr] = useState<Record<string, string>>({});
  const [actionBusy, setActionBusy] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [historyRow, setHistoryRow] = useState<Row | null>(null);
  const [exporting, setExporting] = useState(false);
  const { data: history, isLoading: historyLoading } = useSWR<{ items: { id: string; amount: number; date: string; note: string; source: string }[] }>(historyRow ? `${apiBase}/goal/${historyRow.id}/history` : null);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultsFor(resource));
    setErrors({});
    setFormOpen(true);
  };

  useEffect(() => {
    if (mode === "self" && params.new === "1" && canCreate) openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.new]);

  const openEdit = (row: Row) => {
    setEditing(row);
    setForm(toForm(resource, row));
    setErrors({});
    setFormOpen(true);
  };

  const refreshAll = () => {
    void mutate();
    void globalMutate(
      (k: unknown) =>
        typeof k === "string" &&
        (k.startsWith("/api/dashboard") || k.startsWith("/api/analytics") || k.startsWith("/api/plan") || k.startsWith("/api/insights") || k.startsWith("/api/budgets") || k.startsWith(`${apiBase}/`) || k.startsWith("/api/admin/users")),
    );
  };

  const submit = async () => {
    if (saving) return;
    const errs: Record<string, string> = {};
    for (const f of def.fields) if (f.required && !String(form[f.name] ?? "").trim()) errs[f.name] = `${f.label} is required.`;
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setErrors({});
    const body: Record<string, unknown> = {};
    for (const f of def.fields) {
      const v = form[f.name] ?? "";
      if (f.type === "percent" && v === "") continue;
      body[f.name] = v;
    }
    if (resource === "income" || resource === "expense") body.autoRepeat = form.autoRepeat === "true" && form.recurring !== "none";
    try {
      const res = editing ? await api(`${apiBase}/${resource}/${editing.id}`, { method: "PATCH", body }) : await api(`${apiBase}/${resource}`, { method: "POST", body });
      toast.success(res.message || "Saved successfully.");
      setFormOpen(false);
      refreshAll();
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      toast.error(err.status === 402 ? "Plan limit reached" : "Could not save", err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await api(`${apiBase}/${resource}/${toDelete.id}`, { method: "DELETE" });
      toast.success(res.message || "Deleted.");
      setToDelete(null);
      refreshAll();
    } catch (e) {
      toast.error("Could not delete", (e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const openAction = (row: Row, out = false) => {
    setWithdraw(out);
    setActionRow(row);
    setActionAmount(resource === "debt" ? String(Math.min(row.emiAmount || 0, row.remainingAmount || 0) || "") : "");
    setActionDate(todayStr());
    setActionErr({});
  };

  const submitAction = async () => {
    if (!actionRow || actionBusy) return;
    setActionBusy(true);
    setActionErr({});
    try {
      const path = resource === "debt" ? "pay" : "contribute";
      const body = resource === "debt" ? { amount: actionAmount, date: actionDate } : { amount: actionAmount, date: actionDate, withdraw };
      const res = await api(`${apiBase}/${resource}/${actionRow.id}/${path}`, { method: "POST", body });
      toast.success(res.message || "Done.");
      setActionRow(null);
      refreshAll();
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setActionErr(err.errors);
      toast.error("Could not complete", err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFromApi(`/api/reports/export${qs({ resource, month })}`, `budget-pro-${resource}-${month || "all"}.csv`);
    } catch (e) {
      toast.error("Export failed", (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const plan = mode === "self" ? planForUser(user) : planForUser({ plan: ownerPlan });
  const usage = planData?.usage;
  const limitReached = usage && !plan.unlimited ? (resource === "goal" ? plan.maxGoals !== null && usage.goals >= plan.maxGoals : plan.maxFinanceRecords !== null && usage.financeRecords >= plan.maxFinanceRecords) : false;

  const sortOptions = useMemo<Option[]>(() => {
    const map: Record<ResourceKey, [string, string][]> = {
      income: [["date", "Date"], ["amount", "Amount"], ["title", "Title"]],
      expense: [["date", "Date"], ["amount", "Amount"], ["title", "Title"]],
      debt: [["dueDate", "Due date"], ["remainingAmount", "Remaining"], ["emiAmount", "EMI"], ["title", "Title"]],
      goal: [["targetDate", "Target date"], ["targetAmount", "Target"], ["currentAmount", "Saved"], ["name", "Name"]],
    };
    return map[resource].flatMap(([v, l]) => [
      { value: `${v}:desc`, label: `${l} ↓` },
      { value: `${v}:asc`, label: `${l} ↑` },
    ]);
  }, [resource]);

  const categoryField = def.fields.find((f) => f.name === "category");
  const statusField = def.fields.find((f) => f.name === "status");
  const title = (row: Row) => String(row[def.titleField] ?? "");
  const filtered = Boolean(dq || category || status || month);

  // ---------- render helpers ----------
  const amountCell = (row: Row) => {
    if (resource === "income")
      return (
        <Text size="sm" weight="semibold" tabular color="success">
          +{money(row.amount)}
        </Text>
      );
    if (resource === "expense")
      return (
        <Text size="sm" weight="semibold" tabular>
          −{money(row.amount)}
        </Text>
      );
    return (
      <Text size="sm" weight="semibold" tabular>
        {money(resource === "debt" ? row.remainingAmount : row.currentAmount)}
      </Text>
    );
  };

  const metaLine = (row: Row) => {
    if (resource === "income" || resource === "expense") {
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <Badge>{row.category}</Badge>
          {resource === "income" ? <Badge tone={row.type === "salary" ? "primary" : "info"}>{row.type === "salary" ? "Salary" : "Extra"}</Badge> : null}
          {row.recurring && row.recurring !== "none" ? (
            <Badge tone="info" icon={<Repeat size={11} color={t.c.info} />}>
              {row.recurring}
            </Badge>
          ) : null}
          {row.autoRepeat && row.recurrenceNext ? <Badge tone="success">Auto · next {fmtDate(row.recurrenceNext)}</Badge> : null}
          {row.autoAdded ? <Badge>auto-added</Badge> : null}
          <Text size="xs" color="muted">
            {fmtDate(row.date)}
          </Text>
        </View>
      );
    }
    if (resource === "debt") {
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
          <Text size="xs" color="muted">
            EMI {money(row.emiAmount)} · due {fmtDate(row.dueDate)}
            {row.interestRate ? ` · ${row.interestRate}% p.a.` : ""}
          </Text>
        </View>
      );
    }
    const gi = row.insight as GoalInsightView | undefined;
    return (
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          {gi ? <Badge tone={GOAL_TONE[gi.status]}>{GOAL_LABEL[gi.status]}</Badge> : <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>}
          <Text size="xs" color="muted">
            Target {money(row.targetAmount)} by {fmtDate(row.targetDate)}
          </Text>
        </View>
        {gi && gi.status !== "achieved" && gi.status !== "cancelled" ? (
          <Text size="2xs" color="muted">
            Need{" "}
            <Text size="2xs" weight="semibold" tabular>
              {money(gi.requiredMonthly)}/mo
            </Text>
            {gi.monthlyPace > 0 ? ` · saving ${money(gi.monthlyPace)}/mo` : ""}
            {gi.projectedDate ? ` · finish ≈ ${fmtDate(gi.projectedDate)}` : ""}
          </Text>
        ) : null}
      </View>
    );
  };

  const progressBar = (row: Row) =>
    resource === "debt" || resource === "goal" ? (
      <View style={{ marginTop: 8, maxWidth: 320 }}>
        <Progress
          value={row.progress}
          tone={row.status === "achieved" || row.status === "closed" ? "success" : resource === "goal" && (row.insight?.status === "behind" || row.insight?.status === "overdue") ? "warning" : "primary"}
          marker={resource === "goal" && row.insight && row.insight.status !== "achieved" ? Math.min(100, row.insight.expectedProgress) : null}
        />
        <Text size="2xs" color="muted" tabular style={{ marginTop: 4 }}>
          {resource === "debt" ? `${money(row.paidAmount, true)} paid of ${money(row.totalAmount, true)}` : `${row.progress}% of ${money(row.targetAmount, true)}${row.insight && row.insight.status !== "achieved" ? ` · should be ${row.insight.expectedProgress}% today` : ""}`}
        </Text>
      </View>
    ) : null;

  const actions = (row: Row) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, flexWrap: "wrap" }}>
      {canUpdate && resource === "debt" && row.status !== "closed" && (can("expense.create") || mode === "admin") ? (
        <Button size="sm" variant="secondary" icon={HandCoins} onPress={() => openAction(row)} accessibilityLabel="Record EMI payment">
          Pay
        </Button>
      ) : null}
      {canUpdate && resource === "goal" && row.status !== "cancelled" ? (
        <Button size="sm" variant="secondary" icon={PiggyBank} onPress={() => openAction(row)} accessibilityLabel="Add contribution">
          Add
        </Button>
      ) : null}
      {canUpdate && resource === "goal" && row.currentAmount > 0 && row.status !== "cancelled" ? <IconButton icon={ArrowDownLeft} label="Withdraw from goal" onPress={() => openAction(row, true)} /> : null}
      {resource === "goal" ? <IconButton icon={History} label="Goal history" onPress={() => setHistoryRow(row)} /> : null}
      {canUpdate ? <IconButton icon={Pencil} label={`Edit ${title(row)}`} onPress={() => openEdit(row)} /> : null}
      {canDelete ? <IconButton icon={Trash2} label={`Delete ${title(row)}`} tone="danger" onPress={() => setToDelete(row)} /> : null}
    </View>
  );

  const renderField = (f: FieldDef) => {
    const invalid = Boolean(errors[f.name]);
    const value = form[f.name] ?? "";
    let control;
    if (f.type === "select") {
      control = (
        <Select
          value={value}
          invalid={invalid}
          title={f.label}
          options={f.options!.map((o) => ({ value: o, label: f.optionLabels?.[o] ?? o }))}
          onChange={(v) =>
            setForm((s) => {
              const next = { ...s, [f.name]: v };
              if (resource === "income" && f.name === "category") next.type = v === "Salary" ? "salary" : s.type === "salary" ? "extra" : s.type;
              return next;
            })
          }
        />
      );
    } else if (f.type === "textarea") {
      control = <Input multiline value={value} invalid={invalid} maxLength={1000} placeholder="Optional" onChangeText={(v) => setForm((s) => ({ ...s, [f.name]: v }))} />;
    } else if (f.type === "date") {
      control = <DateInput value={value} invalid={invalid} onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))} />;
    } else {
      const numeric = f.type === "money" || f.type === "percent";
      control = (
        <Input
          value={value}
          invalid={invalid}
          numeric={numeric}
          placeholder={f.placeholder ?? (f.type === "money" ? "0.00" : f.type === "percent" ? "e.g. 8.5" : undefined)}
          maxLength={f.type === "text" ? 120 : undefined}
          onSubmitEditing={() => void submit()}
          onChangeText={(v) =>
            setForm((s) => {
              const next = { ...s, [f.name]: v };
              // convenience: new debt → remaining defaults to total
              if (resource === "debt" && !editing && f.name === "totalAmount" && (s.remainingAmount === "" || s.remainingAmount === s.totalAmount)) next.remainingAmount = v;
              return next;
            })
          }
        />
      );
    }
    return (
      <View key={f.name} style={{ width: f.half && bp.sm ? "50%" : "100%", paddingHorizontal: 6, marginBottom: 14 }}>
        <Field label={`${f.label}${f.required ? "" : " (optional)"}`} error={errors[f.name]}>
          {control}
        </Field>
      </View>
    );
  };

  const header =
    mode === "self" ? (
      <PageHeader
        title={def.plural}
        subtitle={SUBTITLE[resource]}
        actions={
          <>
            {can("reports.export") ? (
              <Button variant="secondary" icon={Download} loading={exporting} onPress={() => void exportCsv()}>
                Export CSV
              </Button>
            ) : null}
            {canCreate ? (
              <Button icon={Plus} onPress={openCreate} disabled={!!limitReached}>
                {`Add ${def.label.toLowerCase()}`}
              </Button>
            ) : null}
          </>
        }
      />
    ) : canCreate ? (
      <View style={{ alignItems: "flex-end" }}>
        <Button size="sm" icon={Plus} onPress={openCreate}>
          {`Add ${def.label.toLowerCase()}`}
        </Button>
      </View>
    ) : null;

  const usageBar =
    mode === "self" && usage ? (
      <View
        style={{
          flexDirection: bp.sm ? "row" : "column",
          alignItems: bp.sm ? "center" : "stretch",
          gap: bp.sm ? 16 : 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: limitReached ? t.a("warning", 0.4) : t.c.border,
          backgroundColor: limitReached ? t.a("warning", 0.05) : t.c.surface,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Text size="xs" color="muted">
          {plan.name} plan · {resource === "goal" ? `${usage.goals} / ${limitLabel(plan.maxGoals)} goals` : `${usage.financeRecords.toLocaleString("en-IN")} / ${limitLabel(plan.maxFinanceRecords)} finance records`}
        </Text>
        {!plan.unlimited ? (
          <View style={{ flex: bp.sm ? 1 : undefined, maxWidth: bp.sm ? 320 : undefined }}>
            <Progress value={resource === "goal" ? usagePct(usage.goals, plan.maxGoals) : usagePct(usage.financeRecords, plan.maxFinanceRecords)} tone={limitReached ? "warning" : "primary"} />
          </View>
        ) : null}
        {limitReached ? (
          <Text size="xs" weight="medium" color="warning">
            Limit reached — upgrade your plan to add more.
          </Text>
        ) : null}
      </View>
    ) : null;

  const filters = (
    <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: t.c.border, flexDirection: bp.md ? "row" : "column", flexWrap: "wrap" }}>
      <View style={{ flex: bp.md ? 1 : undefined, minWidth: bp.md ? 200 : undefined }}>
        <Input icon={Search} value={q} onChangeText={setQ} placeholder={`Search ${def.plural.toLowerCase()}…`} accessibilityLabel="Search" autoCapitalize="none" />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {categoryField ? (
          <View style={{ width: bp.md ? 180 : "48%", flexGrow: bp.md ? 0 : 1 }}>
            <Select value={category} onChange={setCategory} title="Category" accessibilityLabel="Category" options={[{ value: "", label: "All categories" }, ...categoryField.options!.map((o) => ({ value: o, label: o }))]} />
          </View>
        ) : null}
        {statusField ? (
          <View style={{ width: bp.md ? 160 : "48%", flexGrow: bp.md ? 0 : 1 }}>
            <Select value={status} onChange={setStatus} title="Status" accessibilityLabel="Status" options={[{ value: "", label: "All statuses" }, ...statusField.options!.map((o) => ({ value: o, label: statusField.optionLabels?.[o] ?? o }))]} />
          </View>
        ) : null}
        {resource === "income" || resource === "expense" ? (
          <View style={{ width: bp.md ? 180 : "48%", flexGrow: bp.md ? 0 : 1 }}>
            <MonthInput value={month} onChange={setMonth} />
          </View>
        ) : null}
        <View style={{ width: bp.md ? 170 : "48%", flexGrow: bp.md ? 0 : 1 }}>
          <Select
            value={`${sort}:${order}`}
            title="Sort"
            accessibilityLabel="Sort"
            options={sortOptions}
            onChange={(v) => {
              const [s, o] = v.split(":");
              setSort(s);
              setOrder(o as "asc" | "desc");
            }}
          />
        </View>
      </View>
    </View>
  );

  const list = error ? (
    <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
  ) : isLoading && !data ? (
    <View style={{ padding: 16, gap: 8 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height={56} />
      ))}
    </View>
  ) : !data?.items.length ? (
    <EmptyState
      title={filtered ? "No matching records" : `No ${def.plural.toLowerCase()} yet`}
      message={filtered ? "Try adjusting your filters." : "Add your first record to get started."}
      action={
        canCreate && !filtered ? (
          <Button size="sm" icon={Plus} onPress={openCreate} disabled={!!limitReached}>
            {`Add ${def.label.toLowerCase()}`}
          </Button>
        ) : undefined
      }
    />
  ) : (
    <>
      {data.items.map((row, i) =>
        bp.md ? (
          <View key={row.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
            <View style={{ flex: 2, minWidth: 0 }}>
              <Text size="sm" weight="medium" numberOfLines={1}>
                {title(row)}
              </Text>
              {row.notes ? (
                <Text size="xs" color="muted" numberOfLines={1}>
                  {row.notes}
                </Text>
              ) : null}
              {progressBar(row)}
            </View>
            <View style={{ flex: 3 }}>{metaLine(row)}</View>
            <View style={{ minWidth: 110, alignItems: "flex-end" }}>{amountCell(row)}</View>
            {canUpdate || canDelete ? <View style={{ minWidth: 150 }}>{actions(row)}</View> : null}
          </View>
        ) : (
          <View key={row.id} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" weight="medium" numberOfLines={1}>
                  {title(row)}
                </Text>
                <View style={{ marginTop: 4 }}>{metaLine(row)}</View>
              </View>
              {amountCell(row)}
            </View>
            {progressBar(row)}
            {canUpdate || canDelete ? <View style={{ marginTop: 8 }}>{actions(row)}</View> : null}
          </View>
        ),
      )}
      <Pagination page={data.page} pages={data.pages} onChange={setPage} total={data.total} />
    </>
  );

  const body = (
    <>
      {header}
      {usageBar}
      <Card style={{ overflow: "hidden" }}>
        {filters}
        {data && data.total > 0 ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
            <Text size="xs" color="muted">
              {data.total} record{data.total === 1 ? "" : "s"}
            </Text>
            <Text size="xs" color="muted">
              {resource === "debt" ? "Remaining" : resource === "goal" ? "Saved" : "Total"}:{" "}
              <Text size="xs" weight="semibold" tabular>
                {money(data.sum)}
              </Text>
            </Text>
          </View>
        ) : null}
        {list}
      </Card>

      {/* Create / edit */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? `Edit ${def.label.toLowerCase()}` : `Add ${def.label.toLowerCase()}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onPress={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onPress={() => void submit()} loading={saving}>
              {editing ? "Save changes" : `Add ${def.label.toLowerCase()}`}
            </Button>
          </>
        }
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
          {def.fields.map(renderField)}
          {(resource === "income" || resource === "expense") && form.recurring && form.recurring !== "none" ? (
            <View style={{ width: "100%", paddingHorizontal: 6, marginBottom: 8 }}>
              <View style={{ borderRadius: 12, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.5), padding: 12 }}>
                <Checkbox
                  checked={form.autoRepeat === "true"}
                  onChange={(v) => setForm((s) => ({ ...s, autoRepeat: v ? "true" : "false" }))}
                  label={
                    <Text size="sm" weight="medium">
                      Auto-repeat ({form.recurring})
                    </Text>
                  }
                  description="Add this entry automatically every time it repeats — perfect for salary, rent, SIPs and bills. Only future dates are added; you get a notification each time."
                />
              </View>
            </View>
          ) : null}
          {errors.form ? (
            <Text size="sm" color="danger" style={{ paddingHorizontal: 6 }}>
              {errors.form}
            </Text>
          ) : null}
        </View>
      </Modal>

      {/* Pay EMI / contribute / withdraw */}
      <Modal
        open={Boolean(actionRow)}
        onClose={() => !actionBusy && setActionRow(null)}
        title={resource === "debt" ? "Record EMI payment" : withdraw ? "Withdraw from goal" : "Add contribution"}
        description={
          actionRow
            ? resource === "debt"
              ? `“${actionRow.title}” · ${money(actionRow.remainingAmount)} remaining. An “EMI / Debt” expense will be created.`
              : `“${actionRow.name}” · ${money(actionRow.currentAmount)} of ${money(actionRow.targetAmount)} saved.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onPress={() => setActionRow(null)} disabled={actionBusy}>
              Cancel
            </Button>
            <Button onPress={() => void submitAction()} loading={actionBusy}>
              {resource === "debt" ? "Record payment" : withdraw ? "Withdraw" : "Add contribution"}
            </Button>
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <Field label="Amount" error={actionErr.amount}>
            <Input numeric value={actionAmount} onChangeText={setActionAmount} invalid={Boolean(actionErr.amount)} placeholder="0.00" onSubmitEditing={() => void submitAction()} />
          </Field>
          <Field label={resource === "debt" ? "Payment date" : "Date"} error={actionErr.date}>
            <DateInput value={actionDate} onChange={setActionDate} invalid={Boolean(actionErr.date)} />
          </Field>
        </View>
      </Modal>

      {/* Goal history */}
      <Modal open={Boolean(historyRow)} onClose={() => setHistoryRow(null)} title={historyRow ? `“${historyRow.name}” history` : "History"} description="Every contribution and withdrawal with its date." size="md">
        {historyLoading ? (
          <Skeleton height={160} />
        ) : !history?.items.length ? (
          <Text size="sm" color="muted" center style={{ paddingVertical: 24 }}>
            No contributions recorded yet.
          </Text>
        ) : (
          <View>
            {history.items.map((h, i) => (
              <View key={h.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" weight="medium">
                    {fmtDate(h.date)}
                  </Text>
                  <Text size="xs" color="muted" numberOfLines={1}>
                    {h.note || (h.source === "initial" ? "Starting amount" : h.source === "angel" ? "Angel AI" : h.source === "admin" ? "Admin" : "Contribution")}
                  </Text>
                </View>
                <Text size="sm" weight="semibold" tabular color={h.amount < 0 ? "danger" : "success"}>
                  {h.amount < 0 ? "−" : "+"}
                  {money(Math.abs(h.amount))}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Delete ${def.label.toLowerCase()}?`}
        message={`“${toDelete ? title(toDelete) : ""}” will be permanently deleted. This cannot be undone.`}
      />
    </>
  );

  if (mode === "admin") return <View style={{ gap: 16 }}>{body}</View>;
  return (
    <Screen onRefresh={() => void mutate()} refreshing={false}>
      {body}
    </Screen>
  );
}

/** Page wrapper for the signed-in user's own records. */
export function FinancePage({ resource }: { resource: ResourceKey }) {
  const { can } = useSession();
  return (
    <FinanceManager
      resource={resource}
      canCreate={can("finance.write") && can(`${resource}.create` as never)}
      canUpdate={can("finance.write") && can(`${resource}.update` as never)}
      canDelete={can("finance.write") && can(`${resource}.delete` as never)}
    />
  );
}
