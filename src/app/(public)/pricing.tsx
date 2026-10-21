import { Platform, View } from "react-native";
import { Redirect } from "expo-router";
import { Bot, Check, Lock, ShieldCheck, type LucideIcon } from "lucide-react-native";
import { GUEST_ANGEL, PLANS, PLAN_IDS } from "@/shared/plans";
import { pageMeta, SITE_URL } from "@/shared/seo";
import { Disclosure, LinkButton, NavLink, PublicShell, Section } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";
import { Card, Grid, Text, useBreakpoint, useTheme } from "@/ui";

const FAQS = [
  { q: "How do Angel AI credits work?", a: "Every plan includes Angel AI. Limited plans get a number of credits per window (for example 20 credits every 5 hours on Free). The window starts with your first message and refills when it ends. A simple question costs 1 credit; long questions, web look-ups and actions cost a little more. Unlimited has no limit." },
  { q: "Does my plan renew automatically?", a: "No. You pay for one month at a time with UPI, card, netbanking or a wallet through Razorpay. We remind you 3 days before the end date; renewing adds 30 days after the current end date." },
  { q: "What happens when I upgrade?", a: "The new plan starts immediately. The unused days of your current paid plan are converted at their value into extra days on the new plan — you never lose what you paid for." },
  { q: "What happens when a plan ends?", a: "Your account goes back to the Free plan. All your data stays; only the limits change." },
  { q: "Can I get a refund?", a: "Yes — see the refund & cancellation policy. Payments made by mistake or charged twice are refunded in full." },
];

function Perk({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  const t = useTheme();
  return (
    <Card style={{ padding: 12, flexDirection: "row", gap: 8, alignItems: "center", height: "100%" }}>
      <Icon size={16} color={t.c.primary} />
      <Text size="sm" color="muted" style={{ flex: 1 }}>
        {children}
      </Text>
    </Card>
  );
}

export default function PricingPage() {
  // App Store rules: no prices / purchase links inside the iOS app
  if (Platform.OS === "ios") return <Redirect href={"/plan" as never} />;
  return <PricingContent />;
}

function PricingContent() {
  const t = useTheme();
  const bp = useBreakpoint();
  const m = pageMeta("/pricing");
  const paid = PLAN_IDS.filter((id) => PLANS[id].priceInr > 0).map((id) => PLANS[id]);
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Budget Pro",
      description: "AI budget planner and expense tracker with the Angel AI assistant.",
      url: `${SITE_URL}/pricing`,
      brand: { "@type": "Brand", name: "Budget Pro" },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "INR",
        lowPrice: "0",
        highPrice: String(Math.max(...paid.map((p) => p.priceInr))),
        offerCount: String(PLAN_IDS.length),
        offers: PLAN_IDS.map((id) => ({ "@type": "Offer", name: PLANS[id].name, price: String(PLANS[id].priceInr), priceCurrency: "INR", availability: "https://schema.org/InStock", url: `${SITE_URL}/pricing` })),
      },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];
  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]}>
      <SeoHead title={m.title} description={m.description} path="/pricing" jsonLd={ld} />
      <Section max={1152} style={{ paddingVertical: 40 }}>
        <Text accessibilityRole="header" size={bp.sm ? "4xl" : "3xl"} weight="semibold" tight center>
          Simple, honest pricing
        </Text>
        <Text size="sm" color="muted" center style={{ marginTop: 8, maxWidth: 672, alignSelf: "center" }}>
          Start free. Every plan includes Angel AI, budgets, goals, EMIs, analytics, realtime sync and bank-grade security. Pay monthly in ₹ — no auto-renewal, no hidden charges.
        </Text>
        <Grid cols={{ base: 1, md: 2, lg: 4 }} gap={16} style={{ marginTop: 40 }}>
          {PLAN_IDS.map((id) => PLANS[id]).map((p) => (
            <Card key={p.id} style={{ padding: 24, height: "100%", borderColor: p.id === "pro" ? t.a("primary", 0.5) : t.c.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text accessibilityRole="header" size="sm" weight="semibold">
                  {p.name}
                </Text>
                {p.id === "pro" ? (
                  <View style={{ borderRadius: 20, backgroundColor: t.a("primary", 0.15), paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text size="2xs" weight="medium" color="primary">
                      Most popular
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text size="xs" color="muted" style={{ marginTop: 4 }}>
                {p.tagline}
              </Text>
              <Text size="3xl" weight="semibold" style={{ marginTop: 12 }}>
                ₹{p.priceInr}
                <Text size="sm" color="muted">
                  {p.priceInr ? " /month" : " forever"}
                </Text>
              </Text>
              <View style={{ marginTop: 20, gap: 8, flexGrow: 1 }}>
                {p.features.map((f) => (
                  <View key={f} style={{ flexDirection: "row", gap: 8 }}>
                    <Check size={16} color={t.c.success} style={{ marginTop: 2 }} />
                    <Text size="sm" color="muted" style={{ flex: 1 }}>
                      {f}
                    </Text>
                  </View>
                ))}
              </View>
              <LinkButton href="/register" variant={p.id === "pro" ? "primary" : "secondary"} style={{ marginTop: 24, paddingVertical: 10 }}>
                {p.id === "free" ? "Start free" : `Get ${p.name}`}
              </LinkButton>
            </Card>
          ))}
        </Grid>
        <Grid cols={{ base: 1, sm: 3 }} gap={12} style={{ marginTop: 24 }}>
          <Perk icon={Bot}>{`No account? Try Angel as a guest — ${GUEST_ANGEL.credits} free questions every ${GUEST_ANGEL.windowHours} hours.`}</Perk>
          <Perk icon={Lock}>Secure checkout by Razorpay: UPI, cards, netbanking, wallets.</Perk>
          <Perk icon={ShieldCheck}>We never see or store your card / UPI details.</Perk>
        </Grid>
        <View style={{ width: "100%", maxWidth: 768, alignSelf: "center", marginTop: 56 }}>
          <Text accessibilityRole="header" size="2xl" weight="semibold" tight center>
            Pricing questions
          </Text>
          <View style={{ marginTop: 24, gap: 12 }}>
            {FAQS.map((f) => (
              <Disclosure key={f.q} q={f.q} a={f.a} />
            ))}
          </View>
          <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 6 }}>
            <NavLink href="/refund-policy" size="xs">
              Refund & cancellation policy
            </NavLink>
            <Text size="xs" color="muted">
              ·
            </Text>
            <NavLink href="/terms" size="xs">
              Terms
            </NavLink>
            <Text size="xs" color="muted">
              ·
            </Text>
            <NavLink href="/contact" size="xs">
              Contact
            </NavLink>
          </View>
        </View>
      </Section>
    </PublicShell>
  );
}
