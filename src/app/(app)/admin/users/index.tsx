import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import useSWR from "swr";
import { ChevronRight, Plus, Search, UserPlus } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { useSession } from "@/components/session";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Grid, Input, Modal, PageHeader, Pagination, PasswordInput, Screen, Select, Skeleton, Text, opts, useBreakpoint, useTheme, useToast } from "@/ui";
import { api, ApiClientError, qs } from "@/lib/api";
import { timeAgo } from "@/lib/format";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  plan: "free" | "plus" | "pro" | "unlimited";
  status: "active" | "disabled";
  currency: string;
  permissions: string[];
  effectivePermissions: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

const PLAN_OPTS = opts(["free", "plus", "pro", "unlimited"] as const, { free: "Free", plus: "Plus", pro: "Pro", unlimited: "Unlimited" });
const ROLE_OPTS = opts(["user", "admin"] as const, { user: "User", admin: "Admin" });

function CreateUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user", plan: "free" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ name: "", email: "", password: "", role: "user", plan: "free" });
      setErrors({});
    }
  }, [open]);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const r = await api("/api/admin/users", { method: "POST", body: form });
      toast.success(r.message || "User created successfully.");
      onCreated();
      onClose();
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      toast.error("Could not create user", err.message);
    } finally {
      setSaving(false);
    }
  };
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Create user"
      footer={
        <>
          <Button variant="secondary" onPress={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button icon={UserPlus} onPress={submit} loading={saving}>
            Create user
          </Button>
        </>
      }
    >
      <Grid cols={{ base: 1, sm: 2 }} gap={14}>
        <Grid.Item span={{ base: 1, sm: 2 }}>
          <Field label="Full name" error={errors.name}>
            <Input value={form.name} onChangeText={set("name")} invalid={Boolean(errors.name)} />
          </Field>
        </Grid.Item>
        <Field label="Email" error={errors.email}>
          <Input value={form.email} onChangeText={set("email")} invalid={Boolean(errors.email)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="off" />
        </Field>
        <Field label="Temporary password" error={errors.password} hint="8+ chars with a letter and a number">
          <PasswordInput value={form.password} onChangeText={set("password")} invalid={Boolean(errors.password)} autoComplete="new-password" onSubmitEditing={submit} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={set("role")} options={ROLE_OPTS} title="Role" />
        </Field>
        <Field label="Plan">
          <Select value={form.plan} onChange={set("plan")} options={PLAN_OPTS} title="Plan" />
        </Field>
      </Grid>
    </Modal>
  );
}

const planTone = (p: string) => (p === "free" ? "default" : p === "unlimited" ? "success" : "primary");

function Inner() {
  const t = useTheme();
  const bp = useBreakpoint();
  const { can } = useSession();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setDq(q), 300);
    return () => clearTimeout(tm);
  }, [q]);
  useEffect(() => setPage(1), [dq, plan, status, role]);

  const key = `/api/admin/users${qs({ q: dq, plan, status, role, page, limit: 20 })}`;
  const { data, error, isLoading, mutate } = useSWR<{ items: AdminUser[]; total: number; page: number; pages: number }>(key);

  return (
    <Screen onRefresh={() => mutate()} refreshing={false}>
      <PageHeader
        title="Users"
        subtitle={data ? `${data.total} user${data.total === 1 ? "" : "s"}` : undefined}
        actions={
          can("users.create") ? (
            <Button icon={Plus} onPress={() => setCreateOpen(true)}>
              Create user
            </Button>
          ) : undefined
        }
      />
      <Card>
        <View style={{ flexDirection: bp.sm ? "row" : "column", gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
          <Input icon={Search} placeholder="Search by name or email…" value={q} onChangeText={setQ} accessibilityLabel="Search users" containerStyle={{ flex: bp.sm ? 1 : undefined }} autoCapitalize="none" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Select value={plan} onChange={setPlan} options={[{ value: "", label: "All plans" }, ...PLAN_OPTS]} title="Plan" style={{ flex: 1, minWidth: 110 }} />
            <Select value={status} onChange={setStatus} options={[{ value: "", label: "All status" }, { value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }]} title="Status" style={{ flex: 1, minWidth: 110 }} />
            <Select value={role} onChange={setRole} options={[{ value: "", label: "All roles" }, ...ROLE_OPTS]} title="Role" style={{ flex: 1, minWidth: 110 }} />
          </View>
        </View>
        {error ? (
          <ErrorState message={error.message} onRetry={() => mutate()} />
        ) : isLoading || !data ? (
          <View style={{ padding: 16, gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={56} />
            ))}
          </View>
        ) : !data.items.length ? (
          <EmptyState title="No users found" message="Try a different search or filter." />
        ) : (
          <>
            {data.items.map((u, i) => (
              <Pressable
                key={u.id}
                accessibilityRole="link"
                onPress={() => router.push(`/admin/users/${u.id}` as never)}
                style={(s) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border, backgroundColor: s.pressed || (s as { hovered?: boolean }).hovered ? t.a("surface2", 0.4) : "transparent" })}
              >
                <View style={{ flex: bp.md ? 2 : 1, minWidth: 0 }}>
                  <Text size="sm" weight="medium" numberOfLines={1}>
                    {u.name}
                  </Text>
                  <Text size="xs" color="muted" numberOfLines={1}>
                    {u.email}
                  </Text>
                  {!bp.md ? (
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                      <Badge tone={planTone(u.plan)}>{u.plan.toUpperCase()}</Badge>
                      <Badge tone={u.role === "admin" ? "warning" : "default"}>{u.role}</Badge>
                      <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status}</Badge>
                    </View>
                  ) : null}
                </View>
                {bp.md ? (
                  <>
                    <View style={{ width: 100 }}>
                      <Badge tone={planTone(u.plan)}>{u.plan.toUpperCase()}</Badge>
                    </View>
                    <View style={{ width: 80 }}>
                      <Badge tone={u.role === "admin" ? "warning" : "default"}>{u.role}</Badge>
                    </View>
                    <View style={{ width: 90 }}>
                      <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status}</Badge>
                    </View>
                    <Text size="xs" color="muted" style={{ width: 110 }}>
                      {u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}
                    </Text>
                  </>
                ) : null}
                <ChevronRight size={16} color={t.c.muted} />
              </Pressable>
            ))}
            <Pagination page={data.page} pages={data.pages} onChange={setPage} total={data.total} />
          </>
        )}
      </Card>
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => mutate()} />
    </Screen>
  );
}

export default function AdminUsersPage() {
  return (
    <RequirePerm admin perm="users.view">
      <Inner />
    </RequirePerm>
  );
}
