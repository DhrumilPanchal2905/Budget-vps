import { useEffect, useState } from "react";
import { View } from "react-native";
import useSWR from "swr";
import { Database, Trash2 } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { useSession } from "@/components/session";
import { Badge, Button, Card, ErrorState, Field, Input, Modal, Notice, PageHeader, PasswordInput, Screen, Select, Skeleton, Text, useBreakpoint, useTheme, useToast } from "@/ui";
import { api, ApiClientError } from "@/lib/api";

interface Coll {
  name: string;
  count: number;
  purgeable: boolean;
  label: string;
  note: string;
}

const OLDER = [
  { value: "0", label: "All records in this collection" },
  { value: "7", label: "Older than 7 days" },
  { value: "30", label: "Older than 30 days" },
  { value: "90", label: "Older than 90 days" },
  { value: "365", label: "Older than 1 year" },
];

function PurgeModal({ coll, onClose, onDone }: { coll: Coll | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [older, setOlder] = useState("0");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const expected = coll ? `DELETE ${coll.name}` : "";
  useEffect(() => {
    if (coll) {
      setOlder("0");
      setConfirm("");
      setPassword("");
      setErrors({});
    }
  }, [coll]);

  const run = async () => {
    if (!coll || busy || confirm !== expected || !password) return;
    setBusy(true);
    setErrors({});
    try {
      const r = await api("/api/admin/database", { method: "DELETE", body: { collection: coll.name, olderThanDays: Number(older), confirm, password } });
      toast.success(r.message || "Deleted.");
      onDone();
      onClose();
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      toast.error("Purge failed", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(coll)}
      onClose={() => !busy && onClose()}
      title={coll ? `Purge ${coll.label}` : ""}
      description={coll?.note}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" icon={Trash2} onPress={run} loading={busy} disabled={confirm !== expected || !password}>
            Purge
          </Button>
        </>
      }
    >
      <View style={{ gap: 14 }}>
        <Field label="Which records">
          <Select value={older} onChange={setOlder} options={OLDER} title="Which records" />
        </Field>
        <Field label={`Type "${expected}" to confirm`} error={errors.confirm}>
          <Input value={confirm} onChangeText={setConfirm} autoComplete="off" autoCapitalize="none" autoCorrect={false} spellCheck={false} />
        </Field>
        <Field label="Your admin password" error={errors.password}>
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" onSubmitEditing={run} />
        </Field>
        <Notice tone="danger">This action is permanent and is recorded in the audit log.</Notice>
      </View>
    </Modal>
  );
}

function Inner() {
  const t = useTheme();
  const bp = useBreakpoint();
  const { can } = useSession();
  const { data, error, isLoading, mutate } = useSWR<{ collections: Coll[] }>("/api/admin/database");
  const [target, setTarget] = useState<Coll | null>(null);
  return (
    <Screen onRefresh={() => mutate()} refreshing={false}>
      <PageHeader title="Database" subtitle="Collection overview and protected maintenance actions." />
      {error ? (
        <ErrorState message={error.message} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <Skeleton height={380} />
      ) : (
        <>
          <Card>
            {data.collections.map((c, i) => (
              <View key={c.name} style={{ flexDirection: bp.sm ? "row" : "column", alignItems: bp.sm ? "center" : "stretch", gap: 10, paddingHorizontal: 18, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface2, alignItems: "center", justifyContent: "center" }}>
                    <Database size={16} color={t.c.muted} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" style={{ fontFamily: "monospace" }}>
                      {c.name}
                    </Text>
                    <Text size="xs" color="muted" numberOfLines={1}>
                      {c.note}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, justifyContent: bp.sm ? "flex-end" : "flex-start" }}>
                  <Text size="sm" weight="semibold" tabular>
                    {c.count.toLocaleString("en-IN")}
                  </Text>
                  {c.purgeable ? (
                    can("database.delete") ? (
                      <Button size="sm" variant="outline" icon={Trash2} onPress={() => setTarget(c)}>
                        Purge
                      </Button>
                    ) : (
                      <Badge>view only</Badge>
                    )
                  ) : (
                    <Badge>protected</Badge>
                  )}
                </View>
              </View>
            ))}
          </Card>
          <Text size="xs" color="muted">
            Users and finance data are protected from bulk deletion. Delete individual users from the Users page. Database credentials are never exposed to the app.
          </Text>
        </>
      )}
      <PurgeModal coll={target} onClose={() => setTarget(null)} onDone={() => mutate()} />
    </Screen>
  );
}

export default function DatabasePage() {
  return (
    <RequirePerm admin perm="database.view">
      <Inner />
    </RequirePerm>
  );
}
