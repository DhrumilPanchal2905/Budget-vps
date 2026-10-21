// /tools/<slug> — every free calculator (the 4 original tools keep their own titles, intros and FAQs).
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { PublicShell } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";
import { ToolRender, hasTool } from "@/components/tools/tool-render";
import { TOOLS, toolBySlug } from "@/shared/tools-registry";
import { faqLd, pageMeta, SITE_URL } from "@/shared/seo";
import { Button, Text, useBreakpoint, useTheme } from "@/ui";

/** Web pre-rendering: one HTML page per tool. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

type Faq = { q: string; a: string };

// Content of the four original tool pages (they had their own page files before).
const LEGACY: Record<string, { name: string; intro: string; faqs: Faq[] }> = {
  "emi-calculator": {
    name: "EMI calculator",
    intro: "Calculate your loan EMI instantly. Free, private (runs in your browser), 45+ currencies.",
    faqs: [
      { q: "How is EMI calculated?", a: "EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1), where P is the loan amount, r is the monthly interest rate (yearly rate ÷ 12 ÷ 100) and n is the number of months." },
      { q: "Does prepaying reduce interest?", a: "Yes. Early EMIs are mostly interest, so prepayments in the first years cut total interest the most." },
      { q: "What EMI is affordable?", a: "Keep all EMIs together under about 35–40% of your take-home income so there's room for savings and emergencies." },
    ],
  },
  "budget-planner": {
    name: "50/30/20 budget planner",
    intro: "Split your monthly income with the 50/30/20 rule. Free, private (runs in your browser), 45+ currencies.",
    faqs: [
      { q: "What is the 50/30/20 rule?", a: "Spend about 50% of take-home income on needs, 30% on wants and save 20%. It's a simple starting point you can adjust." },
      { q: "What if my rent and EMIs are more than 50%?", a: "Cut wants first and protect at least 10–20% savings. Avoid new EMIs until needs come down." },
      { q: "Where should the 20% go?", a: "Build an emergency fund of 3–6 months of expenses first, then invest for goals and prepay costly loans." },
    ],
  },
  "savings-goal-calculator": {
    name: "Savings goal calculator",
    intro: "How much to save every month for any goal. Free, private (runs in your browser), 45+ currencies.",
    faqs: [
      { q: "How do I reach a savings goal faster?", a: 'Automate a fixed transfer on salary day, cut one or two "wants" categories, and put bonuses straight into the goal.' },
      { q: "Should I include returns?", a: "For goals under 2–3 years use a low, safe rate (e.g. 6%); for longer goals you may assume higher but uncertain returns." },
      { q: "Can Budget Pro track this for me?", a: "Yes — create a goal and Budget Pro shows if you're on track today, your real saving pace and the projected finish date." },
    ],
  },
  "sip-calculator": {
    name: "SIP calculator",
    intro: "Estimate the future value of a monthly SIP. Free, private (runs in your browser), 45+ currencies.",
    faqs: [
      { q: "What is a SIP?", a: "A Systematic Investment Plan invests a fixed amount in a mutual fund every month, averaging your purchase price over time." },
      { q: "Are SIP returns guaranteed?", a: "No. Equity returns vary and can be negative in the short term; SIPs suit goals that are 5+ years away." },
      { q: "How much should I invest?", a: "After an emergency fund is in place, many people aim to invest 10–20% of income for long-term goals." },
    ],
  },
};

export default function ToolPage() {
  const t = useTheme();
  const bp = useBreakpoint();
  const { slug: raw } = useLocalSearchParams<{ slug: string }>();
  const slug = String(raw ?? "");
  const tool = toolBySlug(slug);

  if (!tool || !hasTool(slug)) {
    return (
      <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "Free tools", path: "/tools" }]}>
        <SeoHead title="Tool not found" description="This calculator doesn't exist. See all free Budget Pro money calculators." path="/tools" />
        <View style={{ alignItems: "center", paddingHorizontal: 20, paddingVertical: 64, gap: 8 }}>
          <Text size="2xl" weight="semibold">
            Tool not found
          </Text>
          <Text size="sm" color="muted" center>
            This calculator doesn&apos;t exist (or was moved).
          </Text>
          <Button style={{ marginTop: 12 }} onPress={() => router.replace("/tools" as never)}>
            See all free tools
          </Button>
        </View>
      </PublicShell>
    );
  }

  const legacy = LEGACY[slug];
  const path = `/tools/${tool.slug}`;
  const name = legacy?.name ?? tool.title;
  const faqs: Faq[] = legacy?.faqs ?? tool.faqs;
  const meta = legacy ? pageMeta(path) : pageMeta(path, { title: `${tool.title} — free, instant`, description: tool.description });
  const related = TOOLS.filter((x) => x.slug !== tool.slug).slice(0, 6);
  const app = legacy
    ? { "@context": "https://schema.org", "@type": "WebApplication", name, url: `${SITE_URL}${path}`, applicationCategory: "FinanceApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "INR" } }
    : { "@context": "https://schema.org", "@type": "WebApplication", name: tool.title, description: tool.description, url: `${SITE_URL}${path}`, applicationCategory: "FinanceApplication", operatingSystem: "Any", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "INR" } };

  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "Free tools", path: "/tools" }, { name, path }]}>
      <SeoHead title={meta.title} description={meta.description} path={path} jsonLd={[app, ...(faqs.length ? [faqLd(faqs)] : [])]} />
      <View style={{ width: "100%", maxWidth: 1024, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 32 }}>
        <Text accessibilityRole="header" size={bp.sm ? "3xl" : "2xl"} weight="semibold" tight>
          {name}
        </Text>
        <Text size="sm" color="muted" style={{ marginTop: 8, maxWidth: 768 }}>
          {legacy ? legacy.intro : `${tool.intro} Free, private (runs in your browser) — no sign-up.`}
        </Text>
        <View style={{ marginTop: 24, borderRadius: 18, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface", 0.8), padding: bp.sm ? 20 : 14 }}>
          <ToolRender slug={tool.slug} />
        </View>
        {faqs.length ? (
          <View style={{ marginTop: 32, maxWidth: 768, gap: 20 }}>
            {faqs.map((f) => (
              <View key={f.q} style={{ gap: 6 }}>
                <Text accessibilityRole="header" size="lg" weight="semibold">
                  {f.q}
                </Text>
                <Text size="sm" color="muted" style={{ lineHeight: 24 }}>
                  {f.a}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ marginTop: 40 }}>
          <Text accessibilityRole="header" size="sm" weight="semibold">
            More free calculators
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {related.map((r) => (
              <Pressable
                key={r.slug}
                accessibilityRole="link"
                onPress={() => router.push(`/tools/${r.slug}` as never)}
                style={(s) => ({ borderRadius: 20, borderWidth: 1, borderColor: (s as { hovered?: boolean }).hovered || s.pressed ? t.a("primary", 0.5) : t.c.border, paddingHorizontal: 12, paddingVertical: 6 })}
              >
                <Text size="xs" color="muted">
                  {r.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </PublicShell>
  );
}
