import { pageMeta } from "@/shared/seo";
import { A, B, H1, H2, Li, P, Prose, PublicShell, UL } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";

export default function TermsPage() {
  const m = pageMeta("/terms");
  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "Terms", path: "/terms" }]}>
      <SeoHead title={m.title} description={m.description} path="/terms" />
      <Prose>
        <H1>Terms of service</H1>
        <P>Last updated: October 2026. By using Budget Pro you agree to these terms.</P>
        <H2>The service</H2>
        <P>Budget Pro is a personal finance organiser. Figures, suggestions and Angel AI answers are calculated from the data you enter and general rules of thumb. They are for information only and are not financial, investment, tax or legal advice. Please consult a qualified professional for decisions.</P>
        <H2>Your account</H2>
        <UL>
          <Li>Use a real email address you own; keep your password secret.</Li>
          <Li>You are responsible for the accuracy of the data you enter.</Li>
          <Li>Don&apos;t misuse the service (scraping, attacking, sharing accounts, or entering other people&apos;s data without permission).</Li>
        </UL>
        <H2>Plans & payments</H2>
        <UL>
          <Li>
            Plans and prices: Free ₹0, Plus ₹50/month, Pro ₹100/month, Unlimited ₹500/month (prices in Indian Rupees, inclusive of any applicable taxes). Current limits are listed on the <A href="/pricing">pricing page</A>.
          </Li>
          <Li>
            Payments are processed by Razorpay. A plan is activated only after the payment is confirmed by Razorpay. Each purchase gives 30 days of the plan; plans do <B>not</B> renew automatically.
          </Li>
          <Li>Upgrading starts the new plan immediately; unused days of the previous paid plan are converted by value into extra days. When a paid period ends, the account returns to the Free plan and your data is kept.</Li>
          <Li>Angel AI usage on limited plans is measured in credits per time window, as shown in the app. Fair-use rate limits apply on every plan to protect the service.</Li>
          <Li>
            Refunds and cancellations follow our <A href="/refund-policy">refund & cancellation policy</A>.
          </Li>
        </UL>
        <H2>Availability</H2>
        <P>We aim for high availability but can&apos;t guarantee uninterrupted service. Keep your own exports (CSV) of important data.</P>
        <H2>Termination</H2>
        <P>You can delete your account at any time. We may suspend accounts that break these terms.</P>
      </Prose>
    </PublicShell>
  );
}
