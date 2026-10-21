import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import useSWR from "swr";
import { CheckCircle2, CreditCard, Database, Gauge, Lock, Mail, Send, ShieldCheck, XCircle } from "lucide-react-native";
import { RequirePerm } from "@/components/guard";
import { useSession } from "@/components/session";
import { Badge, Button, Card, CardBody, CardHeader, ErrorState, Field, Grid, Input, Notice, PageHeader, PasswordInput, Screen, Skeleton, Text, useBreakpoint, useTheme, useToast } from "@/ui";
import { api, ApiClientError } from "@/lib/api";
import { API_URL } from "@/lib/config";

interface Settings {
  email: {
    active: { source: "admin" | "env" | "none"; fromName: string; fromEmail: string; user: string; host: string; port: number; ready: boolean };
    saved: { enabled: boolean; fromName: string; fromEmail: string; user: string; host: string; port: number; secure?: boolean; hasPassword: boolean } | null;
    envFallback: { user: string | null; hasPassword: boolean };
  };
  security: { encryptedApi: boolean; requireEncryption: boolean };
  payments?: { mode: "live" | "test" | "off"; webhook: boolean; webhookUrl: string };
  webSearch?: { provider: string | null };
}

function Title({ icon: Icon, children }: { icon: typeof Mail; children: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon size={16} color={t.c.muted} />
      <Text size="sm" weight="semibold">
        {children}
      </Text>
    </View>
  );
}

function Point({ ok = true, warn, children }: { ok?: boolean; warn?: boolean; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ marginTop: 2 }}>{ok ? <CheckCircle2 size={16} color={warn ? t.c.warning : t.c.success} /> : <XCircle size={16} color={t.c.danger} />}</View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/** Payments (Razorpay) and Angel's web search — what is set up. */
function IntegrationsCard({ data }: { data: Settings }) {
  const p = data.payments;
  const w = data.webSearch;
  return (
    <Card>
      <CardHeader title={<Title icon={CreditCard}>Payments & web answers</Title>} />
      <CardBody style={{ gap: 12 }}>
        <Point ok={p?.mode !== "off"}>
          <Text size="sm">
            <Text size="sm" weight="semibold">
              Razorpay:{" "}
            </Text>
            {p?.mode === "live" ? "LIVE mode — real payments." : p?.mode === "test" ? "TEST mode — no real money (switch to rzp_live_ keys after KYC)." : "not set up. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the API server's .env, then restart the API."}
          </Text>
          {p && p.mode !== "off" ? (
            <Text size="xs" color="muted" style={{ marginTop: 2 }}>
              {`Webhook ${p.webhook ? "secret set ✓" : "secret missing ✗ (RAZORPAY_WEBHOOK_SECRET)"} · URL: `}
              <Text size="xs" selectable style={{ fontFamily: "monospace" }}>
                {p.webhookUrl}
              </Text>
              {" · events: payment.captured, payment.failed, order.paid, payment.refunded"}
            </Text>
          ) : null}
        </Point>
        <Point warn={!w?.provider}>
          <Text size="sm">
            <Text size="sm" weight="semibold">
              Angel web answers:{" "}
            </Text>
            {w?.provider ? `${w.provider} (Google-quality results).` : "free sources (Wikipedia + DuckDuckGo). For Google results add SERPER_API_KEY (serper.dev, 2,500 free searches)."}
          </Text>
        </Point>
      </CardBody>
    </Card>
  );
}

function EmailCard({ data, onSaved }: { data: Settings; onSaved: (d: Settings) => void }) {
  const t = useTheme();
  const bp = useBreakpoint();
  const toast = useToast();
  const { user } = useSession();
  const s = data.email.saved;
  const a = data.email.active;
  const [form, setForm] = useState({
    fromName: s?.fromName ?? a.fromName ?? "Budget Pro",
    fromEmail: s?.fromEmail ?? a.fromEmail,
    user: s?.user ?? a.user,
    password: "",
    host: s?.host ?? a.host ?? "smtp.gmail.com",
    port: String(s?.port ?? a.port ?? 465),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState(user.email);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // keep "from" in sync with the login when it was empty
    setForm((f) => (f.fromEmail === "" ? { ...f, fromEmail: f.user } : f));
  }, []);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const r = await api<Settings>("/api/admin/settings", {
        method: "PUT",
        body: { enabled: true, fromName: form.fromName, fromEmail: form.fromEmail || form.user, user: form.user, password: form.password || undefined, host: form.host, port: Number(form.port) || 465 },
      });
      onSaved(r.data);
      setForm((f) => ({ ...f, password: "" }));
      toast.success(r.message || "Email settings saved.");
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      toast.error("Could not save", err.message);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await api("/api/admin/settings/test-email", { method: "POST", body: { to: testTo } });
      toast.success(r.message || "Test email sent.");
    } catch (e) {
      toast.error("Test failed", (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Card>
      <CardHeader
        title={<Title icon={Mail}>Email sender (OTP codes)</Title>}
        subtitle="Used for sign-up verification codes and password resets. Change it any time — no restart needed."
        action={
          a.ready ? (
            <Badge tone="success" icon={<CheckCircle2 size={12} color={t.c.success} />}>{`Working · ${a.source === "admin" ? "saved here" : "from env"}`}</Badge>
          ) : (
            <Badge tone="danger" icon={<XCircle size={12} color={t.c.danger} />}>
              Not set up
            </Badge>
          )
        }
      />
      <CardBody style={{ gap: 16 }}>
        {!a.ready ? (
          <Notice tone="warning">
            <Text size="sm">
              New users can&apos;t sign up until email works. For Gmail: turn on <Text size="sm" weight="semibold">2-Step Verification</Text> for {form.user || "the account"}, then create an{" "}
              <Text size="sm" weight="semibold">App Password</Text> (Google Account → Security → App passwords) and paste the 16-character code below.
            </Text>
          </Notice>
        ) : null}
        <Grid cols={{ base: 1, sm: 2 }} gap={14}>
          <Field label="Gmail / SMTP login" error={errors.user}>
            <Input value={form.user} onChangeText={set("user")} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label={s?.hasPassword ? "App Password (leave empty to keep the saved one)" : "App Password"} error={errors.password}>
            <PasswordInput autoComplete="new-password" value={form.password} onChangeText={set("password")} placeholder={s?.hasPassword ? "•••• •••• •••• ••••" : "16-character app password"} />
          </Field>
          <Field label="Sender name" error={errors.fromName}>
            <Input value={form.fromName} onChangeText={set("fromName")} />
          </Field>
          <Field label="Sender email (From)" error={errors.fromEmail} hint="Usually the same as the login.">
            <Input value={form.fromEmail} onChangeText={set("fromEmail")} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="SMTP host">
            <Input value={form.host} onChangeText={set("host")} autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="Port" hint="465 (SSL) or 587 (STARTTLS)">
            <Input keyboardType="number-pad" inputMode="numeric" value={form.port} onChangeText={(v) => set("port")(v.replace(/\D/g, ""))} />
          </Field>
        </Grid>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <Button onPress={save} loading={saving}>
            Save sender
          </Button>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}>
            <Lock size={14} color={t.c.muted} />
            <Text size="xs" color="muted" style={{ flexShrink: 1 }}>
              The password is encrypted before it is stored and is never shown again.
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: bp.sm ? "row" : "column", alignItems: bp.sm ? "flex-end" : "stretch", gap: 8, borderTopWidth: 1, borderTopColor: t.c.border, paddingTop: 16 }}>
          <Field label="Send a test email to" style={{ flex: bp.sm ? 1 : undefined }}>
            <Input value={testTo} onChangeText={setTestTo} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Button variant="secondary" icon={Send} onPress={test} loading={testing}>
            Send test
          </Button>
        </View>
      </CardBody>
    </Card>
  );
}

function SecurityCard({ data }: { data: Settings }) {
  const t = useTheme();
  const bp = useBreakpoint();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const optimise = async () => {
    setBusy(true);
    try {
      const r = await api("/api/admin/maintenance", { method: "POST" });
      toast.success(r.message || "Done.");
    } catch (e) {
      toast.error("Failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader title={<Title icon={ShieldCheck}>Security & performance</Title>} />
      <CardBody style={{ gap: 12 }}>
        <Point>
          <Text size="sm">
            <Text size="sm" weight="semibold">
              End-to-end encrypted API.
            </Text>{" "}
            Every request and response body is AES-256-GCM encrypted (ECDH key agreement) on top of HTTPS — on the web and in the Android / iOS app.
            {data.security.requireEncryption ? " Unencrypted write requests are rejected." : " Tip: set REQUIRE_ENCRYPTED_API=true to reject any unencrypted write request."}
          </Text>
        </Point>
        <Point>
          <Text size="sm">
            <Text size="sm" weight="semibold">
              Email-verified sign-ups.
            </Text>{" "}
            Self-registered accounts are created only after the 6-digit email code is verified. Accounts you create as admin skip this.
          </Text>
        </Point>
        <Point>
          <Text size="sm">
            <Text size="sm" weight="semibold">
              Argon2id passwords, HttpOnly sessions, CSRF checks, rate limits, audit log
            </Text>{" "}
            — unchanged and active.
          </Text>
        </Point>
        <View style={{ flexDirection: bp.sm ? "row" : "column", alignItems: bp.sm ? "center" : "stretch", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: t.c.border, paddingTop: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Database size={16} color={t.c.muted} />
            <Text size="sm" style={{ flex: 1 }}>
              Database indexes are created automatically after each deploy. Run it now if pages feel slow.
            </Text>
          </View>
          <Button size="sm" variant="secondary" onPress={optimise} loading={busy}>
            Optimise
          </Button>
        </View>
      </CardBody>
    </Card>
  );
}

/** Where the time goes: server region and one database round trip. */
function SpeedCard() {
  const t = useTheme();
  const [r, setR] = useState<{ region: string; connectMs: number; dbMs: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/health`, { cache: "no-store", credentials: "omit" });
      setR(await res.json());
    } catch {
      setR(null);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void run();
  }, []);
  const slow = r ? r.dbMs > 25 : false;
  const box = (label: string, value: string, color?: "success" | "danger") => (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.6), padding: 12 }}>
      <Text size="xs" color="muted">
        {label}
      </Text>
      <Text weight="semibold" tabular color={color ?? "fg"} style={{ marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
  return (
    <Card>
      <CardHeader
        title={<Title icon={Gauge}>Speed check</Title>}
        subtitle="One database round trip from the server. Same-server / same-region setups answer in under 5 ms."
        action={
          <Button size="sm" variant="secondary" onPress={run} loading={busy}>
            Test again
          </Button>
        }
      />
      <CardBody style={{ gap: 12 }}>
        {!r ? (
          <Skeleton height={64} />
        ) : (
          <>
            <Grid cols={{ base: 1, sm: 3 }}>
              {box("Server region", String(r.region ?? "—"))}
              {box("Database round trip", `${r.dbMs} ms`, slow ? "danger" : "success")}
              {box("Connect (first)", `${r.connectMs} ms`)}
            </Grid>
            {slow ? (
              <Notice tone="danger" title="Database is far from the server.">
                {`Every page runs 10–25 queries, so each ${r.dbMs} ms trip adds up to seconds. Fix: run MongoDB on the same VPS (see DEPLOY.md), or move the MongoDB Atlas cluster to the region closest to your VPS (${r.region}) — for an Indian VPS choose AWS Mumbai (ap-south-1).`}
              </Notice>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={16} color={t.c.success} />
                <Text size="sm" color="success" style={{ flex: 1 }}>
                  Server and database are close together — that&apos;s the fastest setup.
                </Text>
              </View>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Inner() {
  const { data, error, isLoading, mutate } = useSWR<Settings>("/api/admin/settings");
  return (
    <Screen onRefresh={() => mutate()} refreshing={false}>
      <PageHeader title="System settings" subtitle="Email sender, payments, web answers, speed, security and maintenance." />
      {error ? (
        <ErrorState message={error.message} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <Skeleton height={380} />
      ) : (
        <View style={{ gap: 16 }}>
          <EmailCard data={data} onSaved={(d) => void mutate(d, { revalidate: false })} />
          <IntegrationsCard data={data} />
          <SpeedCard />
          <SecurityCard data={data} />
        </View>
      )}
    </Screen>
  );
}

export default function AdminSettingsPage() {
  return (
    <RequirePerm admin perm="database.view">
      <Inner />
    </RequirePerm>
  );
}
