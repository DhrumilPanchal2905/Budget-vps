import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, View } from "react-native";
import { router } from "expo-router";
import useSWR from "swr";
import { BellRing, Check, Fingerprint, Info, KeyRound, Palette, ShieldAlert, Smartphone, Trash2, User as UserIcon, type LucideIcon } from "lucide-react-native";
import { useAuth, useSession } from "@/components/session";
import { api, ApiClientError } from "@/lib/api";
import { fmtDate, timeAgo } from "@/lib/format";
import { deviceLoginSupported, enableDeviceLogin } from "@/lib/passkey";
import { forgetDevice, getRememberedDevice, rememberDevice } from "@/lib/device";
import { disablePush, enablePush, getPushStatus, pushKind as pushKindRaw, type PushStatus } from "@/lib/push";

/** "web" on the website (push.web.ts), "native" in the app (push.ts). */
const pushKind = pushKindRaw as "web" | "native";
import { getAppConfig } from "@/lib/app-config";
import { APP_BUILD, APP_VERSION } from "@/lib/version-common";
import { THEMES } from "@/shared/themes";
import { CURRENCIES } from "@/shared/currencies";
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Grid, IconButton, Input, PageHeader, PasswordInput, Screen, Select, Text, useTheme, useThemeCtl, useToast } from "@/ui";

const LANGUAGES = [
  { value: "auto", label: "Auto — reply in the language I ask in" },
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी (Hindi)" },
  { value: "gu", label: "ગુજરાતી (Gujarati)" },
  { value: "hn", label: "Hinglish" },
];

function Title({ icon: Icon, children, danger }: { icon: LucideIcon; children: ReactNode; danger?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon size={16} color={danger ? t.c.danger : t.c.muted} />
      <Text size="sm" weight="semibold" color={danger ? "danger" : "fg"}>
        {children}
      </Text>
    </View>
  );
}

function ProfileCard() {
  const { user, refresh, can } = useSession();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [currency, setCurrency] = useState(user.currency);
  const [language, setLanguage] = useState<string>(user.language || "auto");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== user.name || currency !== user.currency || language !== (user.language || "auto");
  const canWrite = can("settings.write");

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setErrors({});
    try {
      const r = await api("/api/auth/me", { method: "PATCH", body: { name: name.trim(), currency, language } });
      toast.success(r.message || "Profile updated successfully.");
      refresh();
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      toast.error("Could not update profile", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title={<Title icon={UserIcon}>Profile</Title>} subtitle={`Member since ${fmtDate(String(user.createdAt))}`} />
      <View style={{ padding: 18, gap: 16 }}>
        <Grid cols={{ base: 1, sm: 2 }} gap={16}>
          <Field label="Full name" error={errors.name}>
            <Input value={name} onChangeText={setName} maxLength={80} invalid={Boolean(errors.name)} editable={canWrite} onSubmitEditing={() => void save()} />
          </Field>
          <Field label="Email" hint="Contact an admin to change your email.">
            <Input value={user.email} editable={false} />
          </Field>
          <Field label="Currency" error={errors.currency}>
            <Select value={currency} onChange={setCurrency} disabled={!canWrite} title="Currency" searchable options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))} />
          </Field>
          <Field label="Plan & role">
            <View style={{ height: 42, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Badge tone="primary">{user.plan.toUpperCase()}</Badge>
              <Badge tone={user.role === "admin" ? "warning" : "default"}>{user.role}</Badge>
            </View>
          </Field>
        </Grid>
        <Field label="Angel AI language" hint="Auto = Angel replies in the language you ask in. Choosing a language makes every reply and every suggestion use it, on all your devices.">
          <Select value={language} onChange={setLanguage} disabled={!canWrite} title="Angel AI language" options={LANGUAGES} />
        </Field>
        <View style={{ flexDirection: "row" }}>
          <Button onPress={() => void save()} loading={saving} disabled={!dirty || !canWrite}>
            Save profile
          </Button>
        </View>
      </View>
    </Card>
  );
}

function AppearanceCard() {
  const t = useTheme();
  const { themeId, setTheme } = useThemeCtl();
  const { can } = useSession();
  const toast = useToast();
  return (
    <Card>
      <CardHeader title={<Title icon={Palette}>Appearance</Title>} subtitle="Your theme syncs across devices." />
      <View style={{ padding: 18 }}>
        <Grid cols={{ base: 2, sm: 4 }} gap={12}>
          {THEMES.map((th) => {
            const active = themeId === th.id;
            return (
              <Pressable
                key={th.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${th.name} theme`}
                onPress={async () => {
                  setTheme(th.id);
                  if (can("settings.write")) {
                    try {
                      await api("/api/auth/me", { method: "PATCH", body: { theme: th.id } });
                      toast.success(`${th.name} theme applied.`);
                    } catch {
                      /* theme still applied locally */
                    }
                  }
                }}
                style={{ borderRadius: 12, borderWidth: active ? 2 : 1, borderColor: active ? t.c.primary : t.c.border, padding: 8 }}
              >
                <View style={{ height: 56, borderRadius: 8, padding: 8, backgroundColor: th.swatch[0] }}>
                  <View style={{ height: 8, width: 40, borderRadius: 3, backgroundColor: th.swatch[1] }} />
                  <View style={{ marginTop: 6, height: 6, width: 56, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" }} />
                  <View style={{ marginTop: 4, height: 6, width: 32, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)" }} />
                </View>
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 }}>
                  <Text size="xs" weight="medium">
                    {th.name}
                  </Text>
                  {active ? <Check size={14} color={t.c.primary} /> : null}
                </View>
              </Pressable>
            );
          })}
        </Grid>
      </View>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    const errs: Record<string, string> = {};
    if (!cur) errs.currentPassword = "Current password is required.";
    if (next.length < 8) errs.newPassword = "Password must be at least 8 characters.";
    if (next !== confirm) errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length) return setErrors(errs);
    setSaving(true);
    setErrors({});
    try {
      const r = await api("/api/auth/password", { method: "POST", body: { currentPassword: cur, newPassword: next } });
      toast.success(r.message || "Password changed successfully.");
      setCur("");
      setNext("");
      setConfirm("");
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      toast.error("Could not change password", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title={<Title icon={KeyRound}>Change password</Title>} subtitle="Other devices are signed out after a change." />
      <View style={{ padding: 18, gap: 16 }}>
        <Grid cols={{ base: 1, sm: 3 }} gap={16}>
          <Field label="Current password" error={errors.currentPassword}>
            <PasswordInput autoComplete="current-password" value={cur} onChangeText={setCur} invalid={Boolean(errors.currentPassword)} />
          </Field>
          <Field label="New password" error={errors.newPassword} hint="8+ chars, a letter and a number">
            <PasswordInput autoComplete="new-password" value={next} onChangeText={setNext} invalid={Boolean(errors.newPassword)} />
          </Field>
          <Field label="Confirm new password" error={errors.confirm}>
            <PasswordInput autoComplete="new-password" value={confirm} onChangeText={setConfirm} invalid={Boolean(errors.confirm)} onSubmitEditing={() => void save()} />
          </Field>
        </Grid>
        <View style={{ flexDirection: "row" }}>
          <Button onPress={() => void save()} loading={saving}>
            Update password
          </Button>
        </View>
      </View>
    </Card>
  );
}

interface PasskeyItem {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

function DevicesCard() {
  const t = useTheme();
  const { user } = useSession();
  const toast = useToast();
  const { data, mutate } = useSWR<{ items: PasskeyItem[] }>("/api/auth/passkeys");
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<PasskeyItem | null>(null);
  const [thisDeviceEnabled, setThisDeviceEnabled] = useState(false);

  useEffect(() => {
    void deviceLoginSupported().then(setSupported);
    void getRememberedDevice().then((d) => setThisDeviceEnabled(Boolean(d?.passkey && d.email === user.email)));
  }, [user.email]);

  const enable = async () => {
    setBusy("enable");
    try {
      await enableDeviceLogin();
      await rememberDevice({ email: user.email, name: user.name, passkey: true });
      setThisDeviceEnabled(true);
      toast.success("Auto login enabled on this device.");
      void mutate();
    } catch (e) {
      toast.error("Could not enable auto login", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!toRemove) return;
    setBusy(toRemove.id);
    try {
      const r = await api(`/api/auth/passkeys/${toRemove.id}`, { method: "DELETE" });
      toast.success(r.message || "Device removed.");
      const left = (data?.items.length ?? 1) - 1;
      if (left <= 0) {
        const d = await getRememberedDevice();
        if (d) await rememberDevice({ ...d, passkey: false });
        setThisDeviceEnabled(false);
      }
      setToRemove(null);
      void mutate();
    } catch (e) {
      toast.error("Could not remove device", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader title={<Title icon={Fingerprint}>Devices & auto login</Title>} subtitle="Sign in with fingerprint, face or device PIN. Only a public key is stored on our server." />
      <View style={{ padding: 18, gap: 12 }}>
        {!data?.items.length ? (
          <Text size="sm" color="muted">
            No devices set up yet.
          </Text>
        ) : (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: t.c.border }}>
            {data.items.map((d, i) => (
              <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                <Smartphone size={16} color={t.c.muted} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" weight="medium" numberOfLines={1}>
                    {d.deviceName}
                  </Text>
                  <Text size="xs" color="muted">
                    Added {timeAgo(d.createdAt)} · {d.lastUsedAt ? `last used ${timeAgo(d.lastUsedAt)}` : "never used"}
                  </Text>
                </View>
                <IconButton icon={Trash2} label={`Remove ${d.deviceName}`} tone="danger" onPress={() => setToRemove(d)} />
              </View>
            ))}
          </View>
        )}
        {supported ? (
          !thisDeviceEnabled ? (
            <View style={{ flexDirection: "row" }}>
              <Button icon={Fingerprint} onPress={() => void enable()} loading={busy === "enable"}>
                Set up auto login on this device
              </Button>
            </View>
          ) : null
        ) : (
          <Text size="xs" color="muted">
            {Platform.OS === "web" ? "This browser/device has no built-in fingerprint, face or PIN authenticator." : "This device has no fingerprint, face or screen lock set up for auto login."}
          </Text>
        )}
      </View>
      <ConfirmDialog
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        onConfirm={remove}
        loading={Boolean(toRemove && busy === toRemove.id)}
        title="Remove this device?"
        message={`Auto login will stop working on “${toRemove?.deviceName ?? ""}”. You can still sign in with your password.`}
        confirmLabel="Remove device"
      />
    </Card>
  );
}

function PushCard() {
  const toast = useToast();
  const { can } = useSession();
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPushStatus()
      .then(setStatus)
      .catch(() => setStatus("unsupported"));
    void getAppConfig()
      .then((c) => setConfigured(pushKind === "web" ? Boolean(c.vapidPublicKey) : c.nativePush))
      .catch(() => setConfigured(true));
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const s = await enablePush();
      setStatus(s);
      if (s === "enabled") toast.success("Push notifications enabled on this device.");
      else if (s === "denied") throw new Error(pushKind === "web" ? "Notification permission was not granted in your browser." : "Notifications are blocked for Budget Pro in your phone's settings.");
      else if (s === "unsupported") throw new Error("Push notifications are not supported on this device.");
      else throw new Error("Notification permission was not granted.");
    } catch (e) {
      toast.error("Could not enable push", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      setStatus(await disablePush());
      toast.success("Push notifications disabled on this device.");
    } catch (e) {
      toast.error("Could not disable push", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const r = await api("/api/push/test", { method: "POST" });
      toast.success(r.message || "Test sent.");
    } catch (e) {
      toast.error("Test failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const message =
    configured === false
      ? pushKind === "web"
        ? "Push is not configured on this server (VAPID keys missing)."
        : "Push is not configured on this server."
      : status === "unsupported"
        ? pushKind === "web"
          ? "This browser does not support web push. On iPhone, add Budget Pro to your Home Screen first."
          : "Push notifications need a real phone or tablet (not an emulator)."
        : status === "denied"
          ? pushKind === "web"
            ? "Notifications are blocked in your browser settings for this site."
            : "Notifications are blocked for Budget Pro in your device settings."
          : status === "enabled"
            ? "Enabled on this device."
            : status === "disabled"
              ? "Disabled on this device."
              : "Checking…";
  const ready = configured !== false && status !== null && status !== "unsupported" && can("notifications.read");

  return (
    <Card>
      <CardHeader title={<Title icon={BellRing}>Push notifications</Title>} subtitle="Get EMI reminders and admin messages on this device." />
      <View style={{ padding: 18, gap: 12 }}>
        <Text size="sm" color="muted">
          {message}
        </Text>
        {ready ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {status === "enabled" ? (
              <>
                <Button variant="secondary" onPress={() => void test()} loading={busy}>
                  Send test
                </Button>
                <Button variant="outline" onPress={() => void disable()} disabled={busy}>
                  Disable
                </Button>
              </>
            ) : (
              <Button onPress={() => void enable()} loading={busy} disabled={status === "denied"}>
                Enable push
              </Button>
            )}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function AboutCard() {
  return (
    <Card>
      <CardHeader title={<Title icon={Info}>About this app</Title>} />
      <View style={{ padding: 18, flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Text size="sm" color="muted">
          Budget Pro {Platform.OS === "web" ? "web" : Platform.OS === "ios" ? "for iOS" : "for Android"}
        </Text>
        <Text size="sm" tabular>
          Version {APP_VERSION} ({APP_BUILD})
        </Text>
      </View>
    </Card>
  );
}

function DangerCard() {
  const toast = useToast();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Card tone="danger">
      <CardHeader title={<Title icon={ShieldAlert} danger>Delete account</Title>} subtitle="Permanently deletes your account, income, expenses, debts, goals, notifications and devices." />
      <View style={{ padding: 18, flexDirection: "row" }}>
        <Button
          variant="danger"
          onPress={() => {
            setErr(null);
            setOpen(true);
          }}
        >
          Delete my account
        </Button>
      </View>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={busy}
        error={err}
        title="Delete your account?"
        message="This permanently removes all your data. It cannot be undone."
        typeToConfirm="DELETE"
        requirePassword
        confirmLabel="Delete account"
        onConfirm={async ({ password, confirm }) => {
          setBusy(true);
          setErr(null);
          try {
            await api("/api/auth/account", { method: "DELETE", body: { password, confirm } });
            await forgetDevice();
            toast.success("Account deleted. Goodbye 👋");
            setOpen(false);
            await signOut({ expired: true, silent: true });
            router.replace((Platform.OS === "web" ? "/" : "/login") as never);
          } catch (e) {
            setErr((e as Error).message);
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}

export default function SettingsPage() {
  const { refresh } = useSession();
  return (
    <Screen onRefresh={refresh} refreshing={false} maxWidth={1100}>
      <PageHeader title="Settings" subtitle="Profile, appearance, security and notifications." />
      <ProfileCard />
      <AppearanceCard />
      <PasswordCard />
      <DevicesCard />
      <PushCard />
      <AboutCard />
      <DangerCard />
    </Screen>
  );
}
