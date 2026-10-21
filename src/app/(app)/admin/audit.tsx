import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import useSWR from "swr";
import { ChevronDown, Search } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { Badge, Card, EmptyState, ErrorState, Input, PageHeader, Pagination, Screen, Select, Skeleton, Text, useBreakpoint, useTheme } from "@/ui";
import { qs } from "@/lib/api";

interface Entry {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string | null;
  resource: string | null;
  resourceId: string | null;
  targetUserId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

const tone = (a: string) => (a.includes("delete") ? "danger" : a.startsWith("admin.") ? "warning" : a.startsWith("auth.") ? "info" : "default");

const ACTIONS = [
  { value: "", label: "All actions" },
  { value: "auth.", label: "Authentication" },
  { value: "finance.", label: "User finance changes" },
  { value: "admin.finance.", label: "Admin finance changes" },
  { value: "admin.user.", label: "Admin user changes" },
  { value: "admin.database.", label: "Database operations" },
  { value: "admin.notification.", label: "Notifications" },
  { value: "profile.", label: "Profile updates" },
  { value: "reports.", label: "Exports" },
  { value: "system.", label: "System jobs" },
];

function Inner() {
  const t = useTheme();
  const bp = useBreakpoint();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const tm = setTimeout(() => setDq(q), 300);
    return () => clearTimeout(tm);
  }, [q]);
  useEffect(() => setPage(1), [dq, action]);
  const { data, error, isLoading, mutate } = useSWR<{ items: Entry[]; total: number; page: number; pages: number }>(`/api/admin/audit${qs({ q: dq, action, page, limit: 30 })}`);

  return (
    <Screen onRefresh={() => mutate()} refreshing={false}>
      <PageHeader title="Audit log" subtitle="Every security-relevant action. Secrets are never recorded." />
      <Card>
        <View style={{ flexDirection: bp.sm ? "row" : "column", gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
          <Input icon={Search} placeholder="Search actor email or action…" value={q} onChangeText={setQ} autoCapitalize="none" containerStyle={{ flex: bp.sm ? 1 : undefined }} />
          <Select value={action} onChange={setAction} options={ACTIONS} title="Action" style={{ width: bp.sm ? 230 : undefined }} />
        </View>
        {error ? (
          <ErrorState message={error.message} onRetry={() => mutate()} />
        ) : isLoading || !data ? (
          <View style={{ padding: 16, gap: 8 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height={48} />
            ))}
          </View>
        ) : !data.items.length ? (
          <EmptyState title="No audit entries" />
        ) : (
          <>
            {data.items.map((e, i) => (
              <View key={e.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open === e.id }}
                  onPress={() => setOpen(open === e.id ? null : e.id)}
                  style={(s) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: s.pressed || (s as { hovered?: boolean }).hovered ? t.a("surface2", 0.4) : "transparent" })}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      <Badge tone={tone(e.action)}>{e.action}</Badge>
                      {e.resource ? (
                        <Text size="xs" color="muted">
                          {e.resource}
                        </Text>
                      ) : null}
                    </View>
                    <Text size="xs" color="muted" numberOfLines={1} style={{ marginTop: 4 }}>
                      {`${e.actorEmail}${e.actorRole ? ` (${e.actorRole})` : ""} · ${new Date(e.createdAt).toLocaleString("en-IN")}`}
                    </Text>
                  </View>
                  <View style={{ transform: [{ rotate: open === e.id ? "180deg" : "0deg" }] }}>
                    <ChevronDown size={16} color={t.c.muted} />
                  </View>
                </Pressable>
                {open === e.id ? (
                  <ScrollView horizontal style={{ marginHorizontal: 18, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.6) }} contentContainerStyle={{ padding: 12 }}>
                    <Text size="2xs" color="muted" selectable style={{ fontFamily: "monospace" }}>
                      {JSON.stringify({ resourceId: e.resourceId, targetUserId: e.targetUserId, ip: e.ip, metadata: e.metadata }, null, 2)}
                    </Text>
                  </ScrollView>
                ) : null}
              </View>
            ))}
            <Pagination page={data.page} pages={data.pages} onChange={setPage} total={data.total} />
          </>
        )}
      </Card>
    </Screen>
  );
}

export default function AuditPage() {
  return (
    <RequirePerm admin perm="audit.view">
      <Inner />
    </RequirePerm>
  );
}
