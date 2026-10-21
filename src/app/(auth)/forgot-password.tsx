// Forgot password → email code → new password.
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MailCheck } from "lucide-react-native";
import { api, ApiClientError } from "@/lib/api";
import { AuthShell, FormError, useWarmup } from "@/components/auth-form";
import { SeoHead } from "@/components/seo-head";
import { Button, Field, Input, PasswordInput, Text, useTheme, useToast } from "@/ui";

function ForgotPasswordForm() {
  const t = useTheme();
  const toast = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  useWarmup();

  useEffect(() => {
    if (resendIn <= 0) return;
    const tm = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(tm);
  }, [resendIn]);

  const send = async () => {
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setErrors({ email: "Enter a valid email address." });
    setErrors({});
    setError(null);
    setLoading(true);
    try {
      const r = await api("/api/auth/password/forgot", { method: "POST", body: { email: mail } });
      toast.success(r.message || "Code sent.");
      setResendIn(60);
      setStep("reset");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    const errs: Record<string, string> = {};
    if (!/^\d{6}$/.test(otp)) errs.otp = "Enter the 6-digit code.";
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) errs.newPassword = "Use 8+ characters with a letter and a number.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    setLoading(true);
    try {
      const r = await api("/api/auth/password/reset", { method: "POST", body: { email: email.trim(), otp, newPassword: password } });
      toast.success(r.message || "Password updated.");
      router.replace(`/login?email=${encodeURIComponent(email.trim())}` as never);
    } catch (e) {
      const err = e as ApiClientError;
      if (err.errors) setErrors(err.errors);
      setError(err.message);
      setLoading(false);
    }
  };

  const go = () => void (step === "email" ? send() : reset());

  return (
    <View style={{ gap: 16 }}>
      {step === "email" ? (
        <Field label="Email" error={errors.email}>
          <Input
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            invalid={Boolean(errors.email)}
            maxLength={254}
            autoFocus
            onSubmitEditing={go}
          />
        </Field>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.6), padding: 12 }}>
            <MailCheck size={16} color={t.c.primary} style={{ marginTop: 2 }} />
            <Text size="sm" color="muted" style={{ flex: 1 }}>
              If an account exists for{" "}
              <Text size="sm" weight="semibold">
                {email.trim()}
              </Text>
              , a code is on its way. It expires in 10 minutes.
            </Text>
          </View>
          <Field label="6-digit code" error={errors.otp}>
            <Input
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              invalid={Boolean(errors.otp)}
              autoFocus
              style={{ textAlign: "center", fontSize: 20, letterSpacing: 8 }}
            />
          </Field>
          <Field label="New password" error={errors.newPassword} hint="At least 8 characters, with a letter and a number.">
            <PasswordInput value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" invalid={Boolean(errors.newPassword)} maxLength={128} onSubmitEditing={go} />
          </Field>
        </>
      )}
      <FormError message={error} />
      <Button size="lg" full loading={loading} onPress={go}>
        {step === "email" ? "Send code" : "Set new password"}
      </Button>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable accessibilityRole="link" onPress={() => router.replace("/login" as never)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} color={t.c.muted} />
          <Text size="sm" color="muted">
            Back to sign in
          </Text>
        </Pressable>
        {step === "reset" ? (
          <Pressable accessibilityRole="button" disabled={resendIn > 0 || loading} onPress={() => void send()}>
            <Text size="sm" weight="medium" color={resendIn > 0 || loading ? "muted" : "primary"}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function ForgotPasswordPage() {
  return (
    <>
      <SeoHead title="Reset password" description="Reset your Budget Pro password with a code sent to your email." path="/forgot-password" noindex />
      <AuthShell title="Reset your password" subtitle="We'll email you a 6-digit code.">
        <ForgotPasswordForm />
      </AuthShell>
    </>
  );
}
