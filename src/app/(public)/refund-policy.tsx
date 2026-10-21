import { pageMeta } from "@/shared/seo";
import { useAppConfig } from "@/lib/app-config";
import { A, B, H1, H2, Li, P, Prose, PublicShell, UL } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";

const FALLBACK_EMAIL = "dhrumilpanchal295@gmail.com";

export default function RefundPolicyPage() {
  const m = pageMeta("/refund-policy");
  const { data } = useAppConfig();
  const email = data?.business.email || FALLBACK_EMAIL;
  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "Refund & cancellation policy", path: "/refund-policy" }]}>
      <SeoHead title={m.title} description={m.description} path="/refund-policy" />
      <Prose>
        <H1>Refund & cancellation policy</H1>
        <P>Last updated: October 2026. This policy applies to Budget Pro paid plans (Plus, Pro and Unlimited) bought on budget.dhrumilpanchal.in.</P>
        <H2>What you buy</H2>
        <P>
          Each purchase is a <B>one-month (30-day) digital subscription</B> that starts as soon as the payment is confirmed. Nothing is shipped — the plan is activated in your account instantly and you get an email receipt and invoice.
        </P>
        <H2>No auto-renewal</H2>
        <P>Plans never renew automatically and we never store your card or UPI details, so there is nothing to cancel. When the 30 days end, your account simply returns to the Free plan with all your data kept.</P>
        <H2>Cancellation</H2>
        <P>You can stop using a paid plan at any time. Because plans are prepaid for one month and don&apos;t renew, no further charge will ever be made.</P>
        <H2>Refunds</H2>
        <UL>
          <Li>
            <B>Charged twice / charged but plan not activated:</B> full refund, or we activate the plan — your choice. Most such cases are fixed automatically within minutes.
          </Li>
          <Li>
            <B>Changed your mind:</B> ask within <B>7 days</B> of the payment and if you have used Angel AI or added records only lightly, we refund the full amount.
          </Li>
          <Li>
            <B>Service problem:</B> if a paid feature didn&apos;t work for a significant part of your period and we couldn&apos;t fix it, we refund the unused part.
          </Li>
        </UL>
        <P>
          Approved refunds are made to the original payment method through Razorpay within <B>5–7 working days</B> (bank timelines may vary). When a refund is made, the plan bought with that payment ends.
        </P>
        <H2>How to ask</H2>
        <P>
          Email <A href={`mailto:${email}`}>{email}</A> from your account email with your invoice number (shown on the Plan page). We reply within 2 working days.
        </P>
      </Prose>
    </PublicShell>
  );
}
