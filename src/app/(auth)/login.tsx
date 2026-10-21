import { AuthForm, AuthShell } from "@/components/auth-form";
import { SeoHead } from "@/components/seo-head";

export default function LoginPage() {
  return (
    <>
      <SeoHead title="Sign in" description="Sign in to your Budget Pro account." path="/login" />
      <AuthShell title="Welcome back" subtitle="Sign in to continue to your dashboard.">
        <AuthForm mode="login" />
      </AuthShell>
    </>
  );
}
