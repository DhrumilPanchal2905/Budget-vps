import { pageMeta } from "@/shared/seo";
import { A, B, Em, H1, H2, Li, P, Prose, PublicShell, UL } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";

export default function AboutPage() {
  const m = pageMeta("/about");
  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "About", path: "/about" }]}>
      <SeoHead title={m.title} description={m.description} path="/about" />
      <Prose>
        <H1>About Budget Pro</H1>
        <P>
          Budget Pro is built by <B>Dhrumil Panchal</B> with one idea: managing money should feel like talking to a smart friend — in the language you think in. Most finance apps are English-only and show numbers without meaning. Budget Pro shows the numbers <Em>and</Em> explains them.
        </P>
        <H2>What makes it different</H2>
        <UL>
          <Li>Its own AI, Angel, that understands Hindi, Gujarati, English and Hinglish — no third-party AI.</Li>
          <Li>Accuracy first: every rupee is stored as integer paise and summed in the database, so totals always match.</Li>
          <Li>Honest goals and budgets: you see early when something is off track, with the exact fix.</Li>
          <Li>Privacy and security by default — no bank login, encrypted traffic, your data is never sold.</Li>
        </UL>
        <P>
          <A href="/register">Start for free</A> or explore the <A href="/tools">free calculators</A>.
        </P>
      </Prose>
    </PublicShell>
  );
}
