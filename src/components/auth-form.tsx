// Sign in / create account (+ email code) / auto login with the device lock (passkeys). Web + Android + iOS.
import { useEffect, useState, type ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Fingerprint, KeyRound, MailCheck, ShieldCheck, UserRound } from "lucide-react-native";
import { api, ApiClientError } from "@/lib/api";
import { API_URL, IS_NATIVE } from "@/lib/config";
import { forgetDevice, getRememberedDevice, rememberDevice, type RememberedDevice } from "@/lib/device";
import { deviceLoginSupported, enableDeviceLogin, loginWithDevice } from "@/lib/passkey";
import { useAuth, type PublicUser } from "@/components/session";
import { Button, Checkbox, Field, Input, PasswordInput, Skeleton, Text, useTheme, useToast } from "@/ui";

type View_ = "loading" | "choose" | "form" | "offer" | "otp";

/** Wakes the server + database while the user is still typing, so the first sign-in is fast. */
export function useWarmup() {
  useEffect(() => {
    const t = setTimeout(() => void fetch(`${API_URL}/api/health`, { cache: "no-store" }).catch(() => null), 300);
    return () => clearTimeout(t);
  }, []);
}

/** `?next=` target (only same-site paths). */
export function safeNext(n: unknown): string {
  const v = typeof n === "string" ? n : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/dashboard";
}

export function FormError({ message }: { message: string | null }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={{ borderRadius: 10, borderWidth: 1, borderColor: t.a("danger", 0.3), backgroundColor: t.a("danger", 0.1), paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text size="sm" color="danger">
        {message}
      </Text>
    </View>
  );
}

function IconBubble({ children, size = 56 }: { children: ReactNode; size?: number }) {
  const t = useTheme();
  return (
    <View style={{ alignSelf: "center", width: size, height: size, borderRadius: 16, borderWidth: 1, borderColor: t.a("primary", 0.3), backgroundColor: t.a("primary", 0.1), alignItems: "center", justifyContent: "center" }}>{children}</View>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTheme();
  const toast = useToast();
  const { signedIn } = useAuth();
  const params = useLocalSearchParams<{ email?: string; expired?: string; next?: string }>();
  const [view, setView] = useState<View_>(mode === "login" ? "loading" : "form");
  const [device, setDevice] = useState<RememberedDevice | null>(null);
  const [supported, setSupported] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [password, setPassword] = useState("");
  // The app stays signed in by default (like any mobile app); the web keeps the old default too.
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(params.expired ? "Your session expired. Please sign in again." : null);
  const [loading, setLoading] = useState(false);
  const [signedInName, setSignedInName] = useState("");
  const [pendingUser, setPendingUser] = useState<PublicUser | null>(null);
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  useWarmup();

  useEffect(() => {
    if (resendIn <= 0) return;
    const tm = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(tm);
  }, [resendIn]);

  const target = mode === "register" ? "/dashboard" : safeNext(params.next);

  /** Enter the app with the signed-in user (session cookie already set by the API). */
  const enter = (u: PublicUser | null) => {
    if (u) signedIn(u);
    router.replace(target as never);
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      const ok = await deviceLoginSupported();
      if (!alive) return;
      setSupported(ok);
      if (mode !== "login") return;
      const d = await getRememberedDevice();
      if (!alive) return;
      setDevice(d);
      if (d && !(typeof params.email === "string" && params.email)) setEmail(d.email);
      // Returning user on a device with auto login → ask: Auto or Manual.
      setView(d?.passkey && ok ? "choose" : "form");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ---------- Auto login (device lock) ----------
  const autoLogin = async () => {
    if (!device || loading) return;
    setLoading(true);
    setFormError(null);
    try {
      const user = await loginWithDevice<PublicUser>(device.email);
      await rememberDevice({ email: user.email, name: user.name, passkey: true });
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      enter(user);
    } catch (e) {
      setFormError((e as Error).message);
      setLoading(false);
    }
  };

  // ---------- Manual login / register ----------
  const submit = async () => {
    if (loading) return;
    const errs: Record<string, string> = {};
    const mail = email.trim();
    if (mode === "register" && name.trim().length < 2) errs.name = "Name must be at least 2 characters.";
    if (!/^\S+@\S+\.\S+$/.test(mail)) errs.email = "Enter a valid email address.";
    if (mode === "register" && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) errs.password = "Use 8+ characters with a letter and a number.";
    if (mode === "login" && !password) errs.password = "Password is required.";
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const r = await api<{ user?: PublicUser; otpRequired?: boolean; resendIn?: number }>(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: mode === "login" ? { email: mail, password, remember: IS_NATIVE ? true : remember } : { name, email: mail, password },
      });
      if (r.data.otpRequired) {
        toast.success(r.message || "We emailed you a 6-digit code.");
        setOtp("");
        setResendIn(r.data.resendIn ?? 60);
        setLoading(false);
        setView("otp");
        return;
      }
      await afterAuth(r.data.user!, r.message);
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      setFormError(err.message);
      setLoading(false);
    }
  };

  // ---------- Sign-up step 2: email code ----------
  const verifyOtp = async () => {
    if (loading) return;
    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: "Enter the 6-digit code from the email." });
      return;
    }
    setErrors({});
    setFormError(null);
    setLoading(true);
    try {
      const r = await api<{ user: PublicUser }>("/api/auth/register/verify", { method: "POST", body: { email: email.trim(), otp } });
      await afterAuth(r.data.user, r.message);
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      setFormError(err.message);
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || loading) return;
    setFormError(null);
    try {
      const r = await api<{ resendIn: number }>("/api/auth/register/resend", { method: "POST", body: { email: email.trim() } });
      setResendIn(r.data.resendIn ?? 60);
      toast.success(r.message || "A new code was sent.");
    } catch (e) {
      setFormError((e as Error).message);
    }
  };

  const afterAuth = async (u: PublicUser, message?: string) => {
    const keep = mode === "register" || remember || IS_NATIVE;
    const alreadyHasPasskey = Boolean(device?.passkey && device.email === u.email);
    if (keep) await rememberDevice({ email: u.email, name: u.name, passkey: alreadyHasPasskey });
    else await forgetDevice();
    toast.success(message || (mode === "login" ? "Signed in successfully." : "Account created successfully."));

    // Offer auto login on this device (only when remembered and the device supports it).
    if (keep && supported && !alreadyHasPasskey) {
      setSignedInName(u.name);
      setEmail(u.email);
      setPendingUser(u);
      setLoading(false);
      setView("offer");
      return;
    }
    enter(u);
  };

  const enableAuto = async () => {
    setLoading(true);
    setFormError(null);
    try {
      await enableDeviceLogin();
      await rememberDevice({ email, name: signedInName, passkey: true });
      toast.success("Auto login enabled on this device.");
      enter(pendingUser);
    } catch (e) {
      setFormError((e as Error).message);
      setLoading(false);
    }
  };

  // ---------- Views ----------
  if (view === "loading") return <Skeleton height={192} radius={12} />;

  if (view === "offer") {
    return (
      <View style={{ gap: 16 }}>
        <IconBubble>
          <Fingerprint size={28} color={t.c.primary} />
        </IconBubble>
        <View>
          <Text size="md" weight="semibold" center>
            Enable auto login on this device?
          </Text>
          <Text size="sm" color="muted" center style={{ marginTop: 4 }}>
            Next time, sign in with your fingerprint, face or device PIN — no password needed. Your password is never stored on the device.
          </Text>
        </View>
        <FormError message={formError} />
        <Button size="lg" full icon={Fingerprint} onPress={enableAuto} loading={loading}>
          Enable auto login
        </Button>
        <Button variant="ghost" full onPress={() => enter(pendingUser)} disabled={loading}>
          Not now
        </Button>
      </View>
    );
  }

  if (view === "otp") {
    return (
      <View style={{ gap: 16 }}>
        <View style={{ alignItems: "center" }}>
          <IconBubble size={48}>
            <MailCheck size={24} color={t.c.primary} />
          </IconBubble>
          <Text size="md" weight="semibold" center style={{ marginTop: 12 }}>
            Check your email
          </Text>
          <Text size="sm" color="muted" center style={{ marginTop: 4 }}>
            We sent a 6-digit code to{" "}
            <Text size="sm" weight="medium">
              {email}
            </Text>
            . It expires in 10 minutes.
          </Text>
        </View>
        <Field label="Verification code" error={errors.otp}>
          <Input
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            inputMode="numeric"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            invalid={Boolean(errors.otp)}
            placeholder="••••••"
            onSubmitEditing={() => void verifyOtp()}
            style={{ textAlign: "center", fontSize: 24, letterSpacing: 10 }}
          />
        </Field>
        <FormError message={formError} />
        <Button size="lg" full loading={loading} disabled={otp.length !== 6} onPress={() => void verifyOtp()}>
          Verify & create account
        </Button>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setView("form");
              setFormError(null);
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <ArrowLeft size={14} color={t.c.muted} />
            <Text size="sm" color="muted">
              Change email
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={resendIn > 0} onPress={() => void resend()}>
            <Text size="sm" weight="medium" color={resendIn > 0 ? "muted" : "primary"}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </Text>
          </Pressable>
        </View>
        <Text size="xs" color="muted" center>
          Didn&apos;t get it? Check Spam / Promotions.
        </Text>
      </View>
    );
  }

  if (view === "choose" && device) {
    return (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.6), padding: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.a("primary", 0.15), alignItems: "center", justifyContent: "center" }}>
            <UserRound size={20} color={t.c.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" weight="medium" numberOfLines={1}>
              {device.name || "Welcome back"}
            </Text>
            <Text size="xs" color="muted" numberOfLines={1}>
              {device.email}
            </Text>
          </View>
        </View>
        <Text size="sm" color="muted" center>
          How would you like to sign in?
        </Text>
        <Button size="lg" full icon={loading ? undefined : Fingerprint} onPress={() => void autoLogin()} loading={loading}>
          Auto login (device lock)
        </Button>
        <Button
          size="lg"
          full
          variant="secondary"
          icon={KeyRound}
          disabled={loading}
          onPress={() => {
            setFormError(null);
            setView("form");
          }}
        >
          Manual login (password)
        </Button>
        <FormError message={formError} />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void forgetDevice();
            setDevice(null);
            setEmail("");
            setFormError(null);
            setView("form");
          }}
        >
          <Text size="xs" color="muted" center>
            Not you? Use another account
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {mode === "register" ? (
        <Field label="Full name" error={errors.name}>
          <Input value={name} onChangeText={setName} autoComplete="name" textContentType="name" invalid={Boolean(errors.name)} maxLength={80} returnKeyType="next" />
        </Field>
      ) : null}
      <Field label="Email" error={errors.email}>
        <Input
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={mode === "login" ? "username" : "email"}
          textContentType={mode === "login" ? "username" : "emailAddress"}
          invalid={Boolean(errors.email)}
          maxLength={254}
          returnKeyType="next"
        />
      </Field>
      <Field label="Password" error={errors.password} hint={mode === "register" ? "At least 8 characters, with a letter and a number." : undefined}>
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          textContentType={mode === "login" ? "password" : "newPassword"}
          invalid={Boolean(errors.password)}
          maxLength={128}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </Field>

      {mode === "login" ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flexShrink: 1 }}>
            <Checkbox checked={remember} onChange={setRemember} label="Remember me" />
          </View>
          <Pressable accessibilityRole="link" onPress={() => router.push((email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : "/forgot-password") as never)}>
            <Text size="sm" weight="medium" color="primary">
              Forgot password?
            </Text>
          </Pressable>
        </View>
      ) : null}

      <FormError message={formError} />
      <Button size="lg" full loading={loading} onPress={() => void submit()}>
        {mode === "login" ? "Sign in" : "Continue — verify email"}
      </Button>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <ShieldCheck size={14} color={t.c.muted} />
        <Text size="xs" color="muted">
          Encrypted connection · secure session
        </Text>
      </View>

      {mode === "login" && device?.passkey && supported ? (
        <Button variant="secondary" full icon={Fingerprint} onPress={() => setView("choose")} disabled={loading}>
          Use auto login instead
        </Button>
      ) : null}

      <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 4 }}>
        <Text size="sm" color="muted">
          {mode === "login" ? "New to Budget Pro?" : "Already have an account?"}
        </Text>
        <Link href={(mode === "login" ? "/register" : "/login") as never} replace asChild>
          <Text size="sm" weight="medium" color="primary" accessibilityRole="link">
            {mode === "login" ? "Create an account" : "Sign in"}
          </Text>
        </Link>
      </View>
    </View>
  );
}

/** Centered card with the logo — the frame for sign-in, sign-up and password reset. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: t.c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 40 }} keyboardShouldPersistTaps="handled">
        <View pointerEvents="none" style={{ position: "absolute", top: "10%", width: 520, height: 520, borderRadius: 260, backgroundColor: t.a("glow", 0.07) }} />
        <View style={{ width: "100%", maxWidth: 384 }}>
          <Pressable accessibilityRole="link" accessibilityLabel="Budget Pro home" onPress={() => router.push("/" as never)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 32 }}>
            <Image source={require("../../assets/icon.png")} style={{ width: 36, height: 36, borderRadius: 9 }} />
            <Text size="lg" weight="semibold" tight>
              Budget Pro
            </Text>
          </Pressable>
          <View style={{ borderRadius: 18, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface, padding: 24, boxShadow: "0 8px 24px -12px rgba(0,0,0,0.45)" }}>
            <Text accessibilityRole="header" size="lg" weight="semibold">
              {title}
            </Text>
            <Text size="sm" color="muted" style={{ marginTop: 4, marginBottom: 24 }}>
              {subtitle}
            </Text>
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
