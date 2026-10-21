import { pageMeta } from "@/shared/seo";
import { A, B, Em, H1, H2, Li, P, Prose, PublicShell, UL } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";

export default function PrivacyPage() {
  const m = pageMeta("/privacy");
  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "Privacy", path: "/privacy" }]}>
      <SeoHead title={m.title} description={m.description} path="/privacy" />
      <Prose>
        <H1>Privacy policy</H1>
        <P>Last updated: October 2026. This policy explains what Budget Pro (budget.dhrumilpanchal.in) collects and why.</P>
        <H2>What we collect</H2>
        <UL>
          <Li>
            <B>Account:</B> your name, email address and a one-way hash of your password (Argon2id). Your email is verified with a one-time code.
          </Li>
          <Li>
            <B>Finance data you enter:</B> income, expenses, budgets, debts, goals and notes. Amounts are stored only to show your own dashboards.
          </Li>
          <Li>
            <B>Angel AI chats:</B> the text of your questions and Angel&apos;s answers, so you can see your history. Voice is converted to text by your browser; we never store audio. You can delete any message, chat or all history.
          </Li>
          <Li>
            <B>Payments:</B> when you buy a plan, the payment is handled by Razorpay. We receive and keep the order and payment IDs, the amount, the payment method type (e.g. UPI or card), the plan and dates — never your full card number, UPI PIN or bank login. Payment records are kept as required by Indian tax law even if you delete your account.
          </Li>
          <Li>
            <B>Security & usage data:</B> sign-in sessions, IP address, browser/device type and an <Em>approximate</Em> location (city/region/country) derived from the IP address by our hosting provider, plus the pages you visit on this site. This is used for security (spotting unusual sign-ins), abuse prevention and understanding how the site is used. We don&apos;t use GPS or precise location.
          </Li>
        </UL>
        <H2>What we don&apos;t do</H2>
        <UL>
          <Li>We don&apos;t sell or rent your data, and we don&apos;t show ads.</Li>
          <Li>We don&apos;t ask for bank logins or card numbers.</Li>
          <Li>Angel is our own AI — your questions are not sent to third-party AI companies. Only general questions you ask about the world (news, prices, “google karo…”) are looked up with a web search provider, and only the question text is sent — never your financial data or identity.</Li>
        </UL>
        <H2>Security</H2>
        <P>HTTPS everywhere, end-to-end encrypted API payloads, HttpOnly secure session cookies, strict per-user data isolation, rate limiting and an audit log of sensitive actions.</P>
        <H2>Retention & deletion</H2>
        <P>You can delete your account from Settings at any time; your finance records, chats, notifications and sessions are deleted. Visit analytics expire automatically after 180 days. Security audit entries are kept in anonymised form.</P>
        <H2>Cookies</H2>
        <P>We use a strictly necessary session cookie to keep you signed in and a first-party visitor cookie to count unique visits. No third-party advertising cookies.</P>
        <H2>Contact</H2>
        <P>
          Questions or requests: dhrumilpanchal295@gmail.com · <A href="/contact">Contact page</A>
        </P>
      </Prose>
    </PublicShell>
  );
}
