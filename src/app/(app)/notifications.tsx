import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import useSWR, { useSWRConfig } from "swr";
import { Bell, CheckCheck, Trash2 } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { useSession } from "@/components/session";
import { api, qs } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, PageHeader, Pagination, Screen, Skeleton, Spinner, Tabs, Text, useTheme, useToast } from "@/ui";

interface N {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_TONE: Record<string, "primary" | "warning" | "success" | "info" | "default" | "danger"> = {
  finance: "primary",
  admin: "warning",
  goal: "success",
  debt: "danger",
  insight: "info",
  system: "default",
};

function Inner() {
  const t = useTheme();
  const { can } = useSession();
  const toast = useToast();
  const { mutate: gm } = useSWRConfig();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const key = `/api/notifications${qs({ page, limit: 20, unread: filter === "unread" ? "1" : undefined })}`;
  const { data, error, isLoading, mutate } = useSWR<{ items: N[]; total: number; unread: number; page: number; pages: number }>(key);
  const manage = can("notifications.manage");

  const refresh = () => {
    void mutate();
    void gm((k: unknown) => typeof k === "string" && (k.startsWith("/api/notifications") || k.startsWith("/api/dashboard")));
  };

  const run = async (id: string, fn: () => Promise<{ message?: string }>) => {
    setBusy(id);
    try {
      const r = await fn();
      if (r.message) toast.success(r.message);
      refresh();
    } catch (e) {
      toast.error("Action failed", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen onRefresh={() => void mutate()} refreshing={false}>
      <PageHeader
        title="Notifications"
        subtitle={data ? `${data.unread} unread` : undefined}
        actions={
          manage && data?.total ? (
            <>
              <Button variant="secondary" icon={CheckCheck} onPress={() => void run("all-read", () => api("/api/notifications", { method: "PATCH" }))} loading={busy === "all-read"} disabled={!data.unread}>
                Mark all read
              </Button>
              <Button variant="danger" icon={Trash2} onPress={() => setConfirmAll(true)}>
                Delete all
              </Button>
            </>
          ) : undefined
        }
      />
      <Tabs
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
        items={[
          { value: "all", label: "All" },
          { value: "unread", label: "Unread" },
        ]}
      />
      <Card style={{ overflow: "hidden" }}>
        {error ? (
          <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
        ) : isLoading || !data ? (
          <View style={{ padding: 16, gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={64} />
            ))}
          </View>
        ) : !data.items.length ? (
          <EmptyState icon={<Bell size={20} color={t.c.muted} />} title={filter === "unread" ? "No unread notifications" : "No notifications yet"} />
        ) : (
          <>
            {data.items.map((n, i) => (
              <View key={n.id} style={{ flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border, backgroundColor: n.read ? "transparent" : t.a("primary", 0.04) }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: n.read ? t.c.border : t.c.primary }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <Text size="sm" weight="medium">
                      {n.title}
                    </Text>
                    <Badge tone={TYPE_TONE[n.type] ?? "default"}>{n.type}</Badge>
                    <Text size="2xs" color="muted">
                      {timeAgo(n.createdAt)}
                    </Text>
                  </View>
                  <Text size="sm" color="muted" style={{ marginTop: 2 }}>
                    {n.message}
                  </Text>
                  {n.link ? (
                    <Pressable accessibilityRole="link" onPress={() => router.push(n.link as never)} style={{ marginTop: 4, alignSelf: "flex-start" }} hitSlop={6}>
                      <Text size="xs" weight="medium" color="primary">
                        Open
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                {manage ? (
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 2 }}>
                    {!n.read ? busy === `r-${n.id}` ? <Spinner /> : <IconButton icon={CheckCheck} label="Mark as read" onPress={() => void run(`r-${n.id}`, () => api(`/api/notifications/${n.id}`, { method: "PATCH" }))} /> : null}
                    {busy === `d-${n.id}` ? <Spinner /> : <IconButton icon={Trash2} label="Delete" tone="danger" onPress={() => void run(`d-${n.id}`, () => api(`/api/notifications/${n.id}`, { method: "DELETE" }))} />}
                  </View>
                ) : null}
              </View>
            ))}
            <Pagination page={data.page} pages={data.pages} onChange={setPage} total={data.total} />
          </>
        )}
      </Card>
      <ConfirmDialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        loading={busy === "all-del"}
        title="Delete all notifications?"
        message="Every notification in your inbox will be permanently deleted."
        confirmLabel="Delete all"
        onConfirm={async () => {
          await run("all-del", () => api("/api/notifications", { method: "DELETE" }));
          setConfirmAll(false);
        }}
      />
    </Screen>
  );
}

export default function NotificationsPage() {
  return (
    <RequirePerm perm="notifications.read">
      <Inner />
    </RequirePerm>
  );
}
