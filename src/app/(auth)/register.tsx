import { AuthForm, AuthShell } from "@/components/auth-form";
import { SeoHead } from "@/components/seo-head";

export default function RegisterPage() {
  return (
    <>
      <SeoHead title="Create account" description="Create your free Budget Pro account." path="/register" />
      <AuthShell title="Create your account" subtitle="Free forever plan. No card required.">
        <AuthForm mode="register" />
      </AuthShell>
    </>
  );
}
