import { pageMeta, SITE_URL } from "@/shared/seo";
import { A, B, H1, H2, Li, P, Prose, PublicShell, UL } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";

const ASK: [string, string][] = [
  ["Balance & spending", "“What's my balance?” · “इस महीने कितना खर्च हुआ?” · “petrol pe kitna gaya?”"],
  ["Reasons", "“Why did my spending go up?” · “ખર્ચ કેમ વધ્યો?” — compares like-for-like days and names the categories and entries behind it."],
  ["Budgets", "“Am I over budget?” · “food ka budget kitna bacha?” · “set petrol budget 3000”"],
  ["Goals", "“Are my goals on track?” · “bike goal kab tak poora hoga?” — uses your real saving pace."],
  ["Planning", "“How can I save 1 lakh in 6 months?” · “Can I afford a ₹50,000 phone?” · “Show my 50/30/20 split”"],
  ["Know-how", "“What is a SIP?” · “emergency fund kitna hona chahiye?” · “avalanche ya snowball?”"],
  ["Do things", "“chai 20” · “salary 50000 aayi” · “bike goal me 2000 daalo” · “EMI bhar di” · “swiggy wala kharcha hatao” · “undo”"],
];

export default function AngelPage() {
  const m = pageMeta("/angel-ai");
  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "Angel AI", path: "/angel-ai" }]}>
      <SeoHead
        title={m.title}
        description={m.description}
        path="/angel-ai"
        jsonLd={{ "@context": "https://schema.org", "@type": "WebPage", name: "Angel AI — multilingual money assistant", url: `${SITE_URL}/angel-ai`, inLanguage: ["en", "hi", "gu"], about: { "@id": `${SITE_URL}/#app` } }}
      />
      <Prose>
        <H1>Angel AI — the money assistant that speaks your language</H1>
        <P>
          Angel is Budget Pro&apos;s own artificial intelligence, built in-house by Dhrumil Panchal — <B>no third-party AI service</B> sees your questions or your data. It understands <B>English, हिंदी, ગુજરાતી and Hinglish</B>, in native script or English letters, typed or spoken.
        </P>
        <H2>How Angel understands you</H2>
        <P>
          Angel combines a hand-built multilingual vocabulary (amounts like “dedh lakh” or “2.5k”, dates like “kal”, “5 tarikh”, “pichle 3 mahine”) with a learning model trained on thousands of real ways people ask about money. That&apos;s why it understands new phrasings — and even typos — instead of needing exact commands. When it&apos;s unsure, it tells you what it thinks you meant.
        </P>
        <H2>It thinks, not just counts</H2>
        <P>
          Every answer is computed on the server from your real records, so the numbers always match your dashboard. Then Angel adds context: is this higher than your usual? Which category caused it? Will you stay within budget at this pace? Is your goal behind schedule, and what monthly amount fixes it?
        </P>
        <H2>What you can ask</H2>
        <UL>
          {ASK.map(([h, d]) => (
            <Li key={h}>
              <B>{h}:</B> {d}
            </Li>
          ))}
        </UL>
        <H2>Safe by design</H2>
        <UL>
          <Li>A user only ever sees and changes their own data — never anyone else&apos;s, including the admin&apos;s.</Li>
          <Li>Anything risky (deleting, writing into another account, admin actions) asks for confirmation first, and most actions can be undone for 24 hours.</Li>
          <Li>Voice works with a wake word (“Angel active”) and stops with “Angel band karo”.</Li>
        </UL>
        <P>
          Angel is included in every plan — Free gets 20 credits every 5 hours, Unlimited has no limit — and you can try it right now without an account (tap the orb). <A href="/pricing">See plans</A> · <A href="/register">Create a free account</A>
        </P>
      </Prose>
    </PublicShell>
  );
}
