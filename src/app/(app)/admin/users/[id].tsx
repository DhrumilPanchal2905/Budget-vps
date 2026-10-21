import { useEffect, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import useSWR from "swr";
import { ArrowLeft, Ban, CheckCircle2, Send, Trash2 } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { useSession } from "@/components/session";
import { StatCard } from "@/components/stat-card";
import { IncomeExpenseBars } from "@/components/charts";
import { FinanceManager } from "@/components/finance-manager";
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmDialog, EmptyState, ErrorState, Field, Grid, Input, PageHeader, PasswordInput, Screen, Select, Skeleton, Tabs, Text, opts, useTheme, useToast } from "@/ui";
import { api, ApiClientError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { PERMISSION_GROUPS, isAdminPermission, type Permission } from "@/shared/permissions";
import type { ResourceKey } from "@/shared/finance-config";
import { limitLabel } from "@/shared/plans";

interface Detail {
  user: {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    plan: "free" | "plus" | "pro" | "unlimited";
    status: "active" | "disabled";
    permissions: string[];
    effectivePermissions: string[];
    createdAt: string;
    lastLoginAt: string | null;
    planExpiresAt?: string | null;
    planSource?: string | null;
  };
  payments?: { id: string; plan: string; amount: number; status: string; at: string; invoiceNo: string | null; paymentId: string | null; method: string | null; periodEnd: string | null }[];
  plan: { name: string; maxFinanceRecords: number | null; maxGoals: number | null; unlimited: boolean };
  usage: { incomes: number; expenses: number; debts: number; goals: number; financeRecords: number };
  activeSessions: number;
  whereabouts?: {
    lastSeenAt: string | null;
    lastLocation: string | null;
    emailVerified: boolean;
    sessions: { id: string; createdAt: string; lastSeenAt: string; method: string; place: string; device: string }[];
    visits: { id: string; at: string; path: string; place: string; code: string | null; device: string }[];
  };
  totals: { income: number; expense: number; savings: number; debtRemaining: number; goalSaved: number; emiMonthly: number } | null;
  monthly: { label: string; income: number; expense: number }[];
  notifications: { id: string; type: string; title: string; message: string; read: boolean; createdAt: string }[];
  activity: { id: string; action: string; actorEmail: string; resource: string | null; metadata: Record<string, unknown>; createdAt: string }[];
}

type Tab = "overview" | "finance" | "notifications" | "activity";
type Plan = Detail["user"]["plan"];
type Role = Detail["user"]["role"];

const PLAN_OPTS = opts(["free", "plus", "pro", "unlimited"] as const, { free: "Free", plus: "Plus", pro: "Pro", unlimited: "Unlimited" });
const ROLE_OPTS = opts(["user", "admin"] as const, { user: "User", admin: "Admin" });
const MONO = { fontFamily: "monospace" };

function Rows({ children }: { children: ReactNode[] }) {
  const t = useTheme();
  return (
    <View>
      {children.map((c, i) => (
        <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border, paddingVertical: 10 }}>
          {c}
        </View>
      ))}
    </View>
  );
}

function EditUser({ d, onSaved }: { d: Detail; onSaved: () => void }) {
  const { user: me, can } = useSession();
  const toast = useToast();
  const isSelf = me.id === d.user.id;
  const [form, setForm] = useState({ name: d.user.name, email: d.user.email, plan: d.user.plan as Plan, role: d.user.role as Role, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm({ name: d.user.name, email: d.user.email, plan: d.user.plan, role: d.user.role, password: "" }), [d.user.name, d.user.email, d.user.plan, d.user.role]);

  const save = async () => {
    if (saving) return;
    const body: Record<string, unknown> = {};
    if (form.name !== d.user.name) body.name = form.name;
    if (form.email !== d.user.email) body.email = form.email;
    if (!isSelf && form.plan !== d.user.plan) body.plan = form.plan;
    if (!isSelf && form.role !== d.user.role) body.role = form.role;
    if (form.password) body.password = form.password;
    if (!Object.keys(body).length) return toast.info("No changes to save.");
    setSaving(true);
    setErrors({});
    try {
      const r = await api(`/api/admin/users/${d.user.id}`, { method: "PATCH", body });
      toast.success(r.message || "User updated successfully.");
      setForm((f) => ({ ...f, password: "" }));
      onSaved();
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      toast.error("Could not update user", err.message);
    } finally {
      setSaving(false);
    }
  };

  const disabled = !can("users.update");
  return (
    <Card>
      <CardHeader title="Profile, plan & role" subtitle={isSelf ? "You cannot change your own plan, role, status or permissions." : undefined} />
      <CardBody>
        <Grid cols={{ base: 1, sm: 2 }} gap={14}>
          <Field label="Name" error={errors.name}>
            <Input value={form.name} editable={!disabled} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input value={form.email} editable={!disabled} autoCapitalize="none" keyboardType="email-address" onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
          </Field>
          <Field label="Plan">
            <Select value={form.role === "admin" ? "unlimited" : form.plan} disabled={disabled || isSelf || form.role === "admin"} options={PLAN_OPTS} title="Plan" onChange={(v) => setForm((f) => ({ ...f, plan: v }))} />
          </Field>
          <Field label="Role">
            <Select value={form.role} disabled={disabled || isSelf} options={ROLE_OPTS} title="Role" onChange={(v) => setForm((f) => ({ ...f, role: v }))} />
          </Field>
          <Grid.Item span={{ base: 1, sm: 2 }}>
            <Field label="Reset password (optional)" error={errors.password} hint="Signs the user out of all devices.">
              <PasswordInput value={form.password} editable={!disabled} autoComplete="new-password" onChangeText={(v) => setForm((f) => ({ ...f, password: v }))} placeholder="Leave empty to keep current password" onSubmitEditing={save} />
            </Field>
          </Grid.Item>
          <Grid.Item span={{ base: 1, sm: 2 }}>
            <View style={{ flexDirection: "row" }}>
              <Button onPress={save} loading={saving} disabled={disabled}>
                Save changes
              </Button>
            </View>
          </Grid.Item>
        </Grid>
      </CardBody>
    </Card>
  );
}

function PermissionsEditor({ d, onSaved }: { d: Detail; onSaved: () => void }) {
  const t = useTheme();
  const { user: me, can } = useSession();
  const toast = useToast();
  const isSelf = me.id === d.user.id;
  const [selected, setSelected] = useState<Set<string>>(new Set(d.user.permissions));
  const [saving, setSaving] = useState(false);
  useEffect(() => setSelected(new Set(d.user.permissions)), [d.user.permissions]);
  const editable = can("users.update") && !isSelf;
  const dirty = selected.size !== d.user.permissions.length || d.user.permissions.some((p) => !selected.has(p));

  const toggle = (p: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const save = async () => {
    setSaving(true);
    try {
      const r = await api(`/api/admin/users/${d.user.id}`, { method: "PATCH", body: { permissions: [...selected] } });
      toast.success(r.message || "Permissions updated.");
      onSaved();
    } catch (e) {
      toast.error("Could not update permissions", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Permissions"
        subtitle={d.user.role === "admin" ? "Admin permissions apply because this user is an admin." : "Admin permissions only take effect for admin users."}
        action={
          editable ? (
            <Button size="sm" onPress={save} loading={saving} disabled={!dirty}>
              Save permissions
            </Button>
          ) : undefined
        }
      />
      <CardBody>
        <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap={12}>
          {PERMISSION_GROUPS.map((g) => (
            <View key={g.label} style={{ borderRadius: 12, borderWidth: 1, borderColor: t.c.border, padding: 12, gap: 8 }}>
              <Text size="xs" weight="semibold" color="muted">
                {g.label}
              </Text>
              {g.items.map((p: Permission) => {
                const adminOnly = isAdminPermission(p);
                const cannotGrant = adminOnly && !me.permissions.includes(p) && !selected.has(p);
                const inactive = adminOnly && d.user.role !== "admin";
                return (
                  <Checkbox
                    key={p}
                    checked={selected.has(p)}
                    disabled={!editable || cannotGrant}
                    onChange={() => toggle(p)}
                    label={
                      <Text size="xs" color={inactive ? "muted" : "fg"} style={MONO}>
                        {p}
                      </Text>
                    }
                  />
                );
              })}
            </View>
          ))}
        </Grid>
      </CardBody>
    </Card>
  );
}

function SendNotification({ userId }: { userId: string }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const send = async () => {
    if (busy || !title.trim() || !message.trim()) return;
    setBusy(true);
    setErrors({});
    try {
      const r = await api("/api/admin/notifications", { method: "POST", body: { userId, title, message, push: true } });
      toast.success(r.message || "Notification sent.");
      setTitle("");
      setMessage("");
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      toast.error("Could not send", err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader title="Send a notification to this user" />
      <CardBody style={{ gap: 12 }}>
        <Field label="Title" error={errors.title}>
          <Input value={title} onChangeText={setTitle} maxLength={140} />
        </Field>
        <Field label="Message" error={errors.message}>
          <Input multiline value={message} onChangeText={setMessage} maxLength={1000} />
        </Field>
        <View style={{ flexDirection: "row" }}>
          <Button icon={Send} onPress={send} loading={busy} disabled={!title.trim() || !message.trim()}>
            Send
          </Button>
        </View>
      </CardBody>
    </Card>
  );
}

function Inner() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can, user: me, money } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [res, setRes] = useState<ResourceKey>("income");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<Detail>(id ? `/api/admin/users/${id}` : null);

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
  const u = data.user;
  const isSelf = me.id === u.id;

  const toggleStatus = async () => {
    setBusy(true);
    try {
      const r = await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: { status: u.status === "active" ? "disabled" : "active" } });
      toast.success(r.message || "User updated.");
      void mutate();
    } catch (e) {
      toast.error("Could not update status", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      const r = await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      toast.success(r.message || "User deleted successfully.");
      router.replace("/admin/users" as never);
    } catch (e) {
      toast.error("Could not delete user", (e as Error).message);
      setBusy(false);
    }
  };

  const canFinanceView = can("users.finance.view");
  const canFinanceManage = canFinanceView && can("users.finance.manage");
  const apiBase = `/api/admin/users/${u.id}/finance`;
  const paid = data.payments?.filter((p) => p.status === "paid") ?? [];

  return (
    <Screen onRefresh={() => mutate()} refreshing={false}>
      <Pressable accessibilityRole="link" onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin/users" as never))} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}>
        <ArrowLeft size={14} color={t.c.muted} />
        <Text size="xs" color="muted">
          All users
        </Text>
      </Pressable>
      <PageHeader
        title={u.name}
        subtitle={`${u.email} · joined ${timeAgo(u.createdAt)} · last sign-in ${u.lastLoginAt ? timeAgo(u.lastLoginAt) : "never"}`}
        actions={
          <>
            {can("users.update") && !isSelf ? (
              <Button variant="secondary" icon={u.status === "active" ? Ban : CheckCircle2} onPress={toggleStatus} loading={busy}>
                {u.status === "active" ? "Disable" : "Enable"}
              </Button>
            ) : null}
            {can("users.delete") && !isSelf ? (
              <Button variant="danger" icon={Trash2} onPress={() => setConfirmDelete(true)}>
                Delete
              </Button>
            ) : null}
          </>
        }
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Badge tone={u.plan === "free" ? "default" : u.plan === "unlimited" ? "success" : "primary"}>{u.plan.toUpperCase()}</Badge>
        {u.planExpiresAt ? <Badge tone="info">{`paid · until ${new Date(u.planExpiresAt).toLocaleDateString("en-IN")}`}</Badge> : null}
        {paid.length > 0 ? <Badge tone="success">{`₹${paid.reduce((a, p) => a + p.amount, 0).toLocaleString("en-IN")} paid`}</Badge> : null}
        <Badge tone={u.role === "admin" ? "warning" : "default"}>{u.role}</Badge>
        <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status}</Badge>
        <Badge>{`${data.activeSessions} active session${data.activeSessions === 1 ? "" : "s"}`}</Badge>
        {data.whereabouts ? <Badge tone={data.whereabouts.emailVerified ? "success" : "warning"}>{data.whereabouts.emailVerified ? "email verified" : "email not verified"}</Badge> : null}
        {data.whereabouts?.lastLocation ? <Badge>{`📍 ${data.whereabouts.lastLocation}`}</Badge> : null}
        {data.whereabouts?.lastSeenAt ? <Badge>{`seen ${timeAgo(data.whereabouts.lastSeenAt)}`}</Badge> : null}
      </View>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview" as Tab, label: "Overview" },
          ...(canFinanceView ? [{ value: "finance" as Tab, label: "Finance" }] : []),
          { value: "notifications" as Tab, label: "Notifications" },
          ...(can("audit.view") ? [{ value: "activity" as Tab, label: "Activity" }] : []),
        ]}
      />

      {tab === "overview" ? (
        <View style={{ gap: 16 }}>
          <Grid cols={{ base: 2, lg: 4 }}>
            <StatCard label="Finance records" value={`${data.usage.financeRecords.toLocaleString("en-IN")} / ${limitLabel(data.plan.maxFinanceRecords)}`} hint={`${data.usage.incomes} inc · ${data.usage.expenses} exp · ${data.usage.debts} debt`} />
            <StatCard label="Goals" value={`${data.usage.goals} / ${limitLabel(data.plan.maxGoals)}`} />
            {data.totals ? <StatCard label="Total income" value={money(data.totals.income)} /> : null}
            {data.totals ? <StatCard label="Total expenses" value={money(data.totals.expense)} /> : null}
            {data.totals ? <StatCard label="Net savings" value={money(data.totals.savings)} tone={data.totals.savings < 0 ? "danger" : "success"} /> : null}
            {data.totals ? <StatCard label="Debt remaining" value={money(data.totals.debtRemaining)} /> : null}
            {data.totals ? <StatCard label="Monthly EMIs" value={money(data.totals.emiMonthly)} /> : null}
            {data.totals ? <StatCard label="Goal savings" value={money(data.totals.goalSaved)} /> : null}
          </Grid>
          {canFinanceView ? (
            <Card>
              <CardHeader title="Monthly income vs expenses" subtitle="Last 12 months" />
              <CardBody>
                <IncomeExpenseBars data={data.monthly} height={260} />
              </CardBody>
            </Card>
          ) : null}
          {data.payments && data.payments.length > 0 ? (
            <Card>
              <CardHeader title="Payments" subtitle="Plan purchases by this user" />
              <CardBody style={{ paddingTop: 4 }}>
                <Rows>
                  {data.payments.map((p) => (
                    <View key={p.id} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <Text size="sm" style={{ flexShrink: 1 }}>
                        <Text size="sm" weight="semibold" style={{ textTransform: "capitalize" }}>
                          {p.plan}
                        </Text>
                        {` · ₹${p.amount.toLocaleString("en-IN")} `}
                        <Text size="sm" color="muted">{`· ${new Date(p.at).toLocaleString("en-IN")}${p.method ? ` · ${p.method.toUpperCase()}` : ""}`}</Text>
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Badge tone={p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "warning"}>{p.status === "created" ? "not completed" : p.status}</Badge>
                        {p.invoiceNo && p.status === "paid" ? (
                          <Text size="xs" color="primary" onPress={() => router.push(`/plan/invoice/${p.id}` as never)}>
                            {p.invoiceNo}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </Rows>
              </CardBody>
            </Card>
          ) : null}
          {data.whereabouts && (data.whereabouts.sessions.length > 0 || data.whereabouts.visits.length > 0) ? (
            <Grid cols={{ base: 1, lg: 2 }} gap={16}>
              <Card>
                <CardHeader title="Signed-in devices" subtitle="Approximate location from IP at sign-in" />
                <CardBody style={{ paddingTop: 4 }}>
                  {data.whereabouts.sessions.length ? (
                    <Rows>
                      {data.whereabouts.sessions.map((x) => (
                        <View key={x.id}>
                          <Text size="sm" weight="medium">{`📍 ${x.place}`}</Text>
                          <Text size="xs" color="muted" numberOfLines={1}>{`${x.method} · signed in ${timeAgo(x.createdAt)} · active ${timeAgo(x.lastSeenAt)}`}</Text>
                          <Text size="2xs" color="muted" numberOfLines={1}>
                            {x.device}
                          </Text>
                        </View>
                      ))}
                    </Rows>
                  ) : (
                    <Text size="sm" color="muted" center style={{ paddingVertical: 20 }}>
                      No active sessions.
                    </Text>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Recent visits" />
                <CardBody style={{ paddingTop: 4 }}>
                  {data.whereabouts.visits.length ? (
                    <Rows>
                      {data.whereabouts.visits.map((v) => (
                        <View key={v.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" numberOfLines={1} style={MONO}>
                              {v.path}
                            </Text>
                            <Text size="xs" color="muted" numberOfLines={1}>{`📍 ${v.place} · ${v.device}`}</Text>
                          </View>
                          <Text size="2xs" color="muted">
                            {timeAgo(v.at)}
                          </Text>
                        </View>
                      ))}
                    </Rows>
                  ) : (
                    <Text size="sm" color="muted" center style={{ paddingVertical: 20 }}>
                      No tracked visits yet.
                    </Text>
                  )}
                </CardBody>
              </Card>
            </Grid>
          ) : null}
          <EditUser d={data} onSaved={() => mutate()} />
          <PermissionsEditor d={data} onSaved={() => mutate()} />
        </View>
      ) : null}

      {tab === "finance" && canFinanceView ? (
        <View style={{ gap: 16 }}>
          <Tabs
            value={res}
            onChange={setRes}
            items={[
              { value: "income" as ResourceKey, label: "Income" },
              { value: "expense" as ResourceKey, label: "Expenses" },
              { value: "debt" as ResourceKey, label: "Debts" },
              { value: "goal" as ResourceKey, label: "Goals" },
            ]}
          />
          {!canFinanceManage ? (
            <Text size="xs" color="muted">
              Read-only: you need users.finance.manage to edit this user&apos;s records.
            </Text>
          ) : null}
          <FinanceManager key={res} resource={res} apiBase={apiBase} mode="admin" canCreate={canFinanceManage} canUpdate={canFinanceManage} canDelete={canFinanceManage} ownerPlan={u.plan} />
        </View>
      ) : null}

      {tab === "notifications" ? (
        <Grid cols={{ base: 1, lg: 2 }} gap={16}>
          <Card>
            <CardHeader title="Recent notifications" />
            {!data.notifications.length ? (
              <EmptyState title="No notifications" />
            ) : (
              <CardBody style={{ paddingTop: 4 }}>
                <Rows>
                  {data.notifications.map((n) => (
                    <View key={n.id}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.read ? t.c.border : t.c.primary }} />
                        <Text size="sm" weight="medium" style={{ flexShrink: 1 }}>
                          {n.title}
                        </Text>
                        <Text size="2xs" color="muted">
                          {timeAgo(n.createdAt)}
                        </Text>
                      </View>
                      <Text size="xs" color="muted" style={{ paddingLeft: 16 }}>
                        {n.message}
                      </Text>
                    </View>
                  ))}
                </Rows>
              </CardBody>
            )}
          </Card>
          {can("admin.notifications.send") ? <SendNotification userId={u.id} /> : null}
        </Grid>
      ) : null}

      {tab === "activity" ? (
        <Card>
          <CardHeader title="Audit & activity history" />
          {!data.activity.length ? (
            <EmptyState title="No activity recorded" />
          ) : (
            <CardBody style={{ paddingTop: 4 }}>
              <Rows>
                {data.activity.map((a) => (
                  <View key={a.id} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                    <View style={{ flexShrink: 1, minWidth: 0 }}>
                      <Text size="xs" style={MONO}>
                        {a.action}
                      </Text>
                      <Text size="xs" color="muted" numberOfLines={1}>
                        {`by ${a.actorEmail}${a.resource ? ` · ${a.resource}` : ""}${typeof a.metadata?.label === "string" ? ` · “${a.metadata.label}”` : ""}`}
                      </Text>
                    </View>
                    <Text size="2xs" color="muted">
                      {timeAgo(a.createdAt)}
                    </Text>
                  </View>
                ))}
              </Rows>
            </CardBody>
          )}
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={del}
        loading={busy}
        title="Delete this user?"
        message={
          <Text size="sm" color="muted">
            <Text size="sm" weight="medium">
              {u.email}
            </Text>{" "}
            and all their income, expenses, debts, goals, notifications and sessions will be permanently deleted.
          </Text>
        }
        typeToConfirm="DELETE"
        confirmLabel="Delete user"
      />
    </Screen>
  );
}

export default function AdminUserDetailPage() {
  return (
    <RequirePerm admin perm="users.view">
      <Inner />
    </RequirePerm>
  );
}
