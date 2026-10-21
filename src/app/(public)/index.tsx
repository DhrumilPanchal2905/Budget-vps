// Landing page (web). In the Android / iOS app the marketing site isn't shown → dashboard or sign-in.
import { Platform, View } from "react-native";
import { Redirect } from "expo-router";
import { ArrowRight, BarChart3, Bell, Bot, Calculator, Check, Globe, Landmark, Languages, Lock, Mic, Radio, ShieldCheck, Smartphone, Target, Wallet, Zap, LayoutDashboard } from "lucide-react-native";
import { PLANS, PUBLIC_PLAN_IDS } from "@/shared/plans";
import { APP_LD, FAQ, ORG_LD, WEBSITE_LD, faqLd, pageMeta } from "@/shared/seo";
import { PublicShell, LinkButton, NavLink, Section, Disclosure } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";
import { useAuth } from "@/components/session";
import { LoadingScreen } from "@/components/screens";
import { Card, Grid, Text, useBreakpoint, useTheme } from "@/ui";

const features = [
  { icon: Bot, title: "Angel — your own AI", text: "Ask anything about your money by voice or chat. Angel answers from your real data, explains why, and suggests what to do next." },
  { icon: Wallet, title: "Category budgets", text: "Monthly limits per category with live 'left per day', month-end projection and 80% / 100% alerts." },
  { icon: Target, title: "Goals that tell the truth", text: "See if every goal is on track vs. today's date, your real saving pace and the projected finish date." },
  { icon: Landmark, title: "EMI & loan tracking", text: "Record EMI payments, see what's left, get due-date reminders and your debt-free date." },
  { icon: BarChart3, title: "Professional analytics", text: "Monthly and all-time charts, category breakdowns and a 50/30/20 needs-wants-savings split." },
  { icon: Zap, title: "Auto-repeat entries", text: "Salary, rent, SIPs and bills add themselves every month — never back-filled, always notified." },
  { icon: Radio, title: "Realtime sync", text: "Phone, laptop and tablet update instantly when anything changes." },
  { icon: Bell, title: "Reminders & push", text: "EMI reminders, budget alerts and goal milestones on your phone." },
  { icon: Calculator, title: "16 free calculators", text: "Income tax (new vs old regime), EMI, SIP, FD, RD, PPF, GST, retirement, prepayment and a live currency converter." },
  { icon: ShieldCheck, title: "Bank-grade security", text: "Argon2id passwords, HttpOnly sessions, email-verified sign-ups and end-to-end encrypted API traffic." },
];

const examples = [
  { lang: "English", q: "Why did my spending go up this month?" },
  { lang: "हिंदी", q: "इस महीने खाने पर कितना खर्च हुआ?" },
  { lang: "ગુજરાતી", q: "મારું બજેટ કેટલું બાકી છે?" },
  { lang: "Hinglish", q: "6 mahine mein 1 lakh kaise bachaun?" },
];

const steps: [string, string][] = [
  ["Create your free account", "Sign up with your email — we send a 6-digit code to verify it. Takes under a minute."],
  ["Add income & expenses", "Type them, tap them, or just tell Angel: “salary 50000 aayi”, “petrol 500”. Turn on auto-repeat for salary and rent."],
  ["Set budgets & goals", "Angel suggests category limits from your history and tells you every month what to fix."],
];

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const bp = useBreakpoint();
  return (
    <View style={{ alignItems: "center", marginBottom: 32 }}>
      <Text accessibilityRole="header" size={bp.sm ? "3xl" : "2xl"} weight="semibold" tight center>
        {title}
      </Text>
      {subtitle ? (
        <Text size="sm" color="muted" center style={{ marginTop: 8, maxWidth: 640 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function Landing() {
  const t = useTheme();
  const bp = useBreakpoint();
  const { status } = useAuth();
  const meta = pageMeta("/", { title: "Budget Pro — Free AI budget planner & expense tracker (English, हिंदी, ગુજરાતી)" });
  const signedIn = status === "in";
  return (
    <PublicShell>
      <SeoHead title={meta.title} description={meta.description} path="/" jsonLd={[ORG_LD, WEBSITE_LD, APP_LD, faqLd(FAQ.slice(0, 6))]} />

      {/* Hero */}
      <Section max={896} style={{ paddingTop: bp.sm ? 72 : 36, paddingBottom: 56, alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 20, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface", 0.7), paddingHorizontal: 12, paddingVertical: 5 }}>
          <Languages size={12} color={t.c.muted} />
          <Text size="xs" color="muted">
            English · हिंदी · ગુજરાતી · voice & chat
          </Text>
        </View>
        <Text accessibilityRole="header" size="4xl" weight="semibold" tight center style={{ marginTop: 24, fontSize: bp.sm ? 56 : 36, lineHeight: bp.sm ? 64 : 44 }}>
          The budget planner
          <Text size="4xl" weight="semibold" style={{ color: t.series[0], fontSize: bp.sm ? 56 : 36, lineHeight: bp.sm ? 64 : 44 }}>
            {" "}
            that thinks with you.
          </Text>
        </Text>
        <Text size={bp.sm ? "lg" : "base"} color="muted" center style={{ marginTop: 20, maxWidth: 672 }}>
          Budget Pro is a free expense tracker and money manager with its own AI assistant, Angel. Track income, expenses, EMIs and savings goals, set budgets, and just ask — “kharcha kyu badha?”, “મારું બેલેન્સ કેટલું છે?” — for accurate answers from your real numbers.
        </Text>
        <View style={{ marginTop: 32, flexDirection: bp.sm ? "row" : "column", gap: 12, alignSelf: bp.sm ? "center" : "stretch" }}>
          {signedIn ? (
            <LinkButton href="/dashboard" icon={<LayoutDashboard size={16} color={t.c.primaryFg} />}>
              Open dashboard
            </LinkButton>
          ) : (
            <LinkButton href="/register" icon={<ArrowRight size={16} color={t.c.primaryFg} />}>
              Create free account
            </LinkButton>
          )}
          <LinkButton href="/tools/budget-planner" variant="secondary" icon={<Calculator size={16} color={t.c.fg} />}>
            Try the free budget planner
          </LinkButton>
        </View>
        <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Lock size={12} color={t.c.muted} />
          <Text size="xs" color="muted" center>
            No bank login needed · email-verified accounts · encrypted end to end
          </Text>
        </View>
      </Section>

      {/* Angel */}
      <Section max={1024} style={{ paddingBottom: 64 }}>
        <Card style={{ padding: bp.md ? 32 : 24, flexDirection: bp.md ? "row" : "column", gap: 24, alignItems: bp.md ? "center" : "stretch" }}>
          <View style={{ flex: bp.md ? 1 : undefined }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Mic size={14} color={t.c.primary} />
              <Text size="xs" weight="medium" color="primary" uppercase>
                Angel AI
              </Text>
            </View>
            <Text accessibilityRole="header" size="2xl" weight="semibold" tight style={{ marginTop: 8 }}>
              Ask in your language. Get a real answer.
            </Text>
            <Text size="sm" color="muted" style={{ marginTop: 12 }}>
              Angel is built in-house — no third-party AI — and trained on how people actually talk about money in India: Hindi, Gujarati, Hinglish, typos and all. It doesn&apos;t just show numbers; it compares with your usual, explains what changed, checks your budgets and goals, and offers the next step. It can add, edit and delete entries, do EMI / SIP / tax maths, and look general questions up on the web with sources. Try it right now — the orb at the bottom right works without an account.
            </Text>
            <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <NavLink href="/angel-ai" color="primary" weight="medium">
                How Angel works
              </NavLink>
              <ArrowRight size={16} color={t.c.primary} />
            </View>
          </View>
          <View style={{ flex: bp.md ? 1 : undefined, gap: 10 }}>
            {examples.map((e) => (
              <View key={e.q} style={{ borderRadius: 12, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.6), paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <View style={{ borderRadius: 4, backgroundColor: t.a("primary", 0.15), paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text size="2xs" weight="medium" color="primary">
                    {e.lang}
                  </Text>
                </View>
                <Text size="sm" style={{ flexShrink: 1 }}>
                  {e.q}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Section>

      {/* Features */}
      <Section max={1152} style={{ paddingBottom: 80 }}>
        <SectionTitle title="Everything you need to master your money" subtitle="One app for budgeting, expense tracking, loans and savings — accurate to the paisa, in 45+ currencies." />
        <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap={16}>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} style={{ padding: 20, height: "100%" }}>
                <Icon size={20} color={t.c.primary} />
                <Text accessibilityRole="header" size="sm" weight="semibold" style={{ marginTop: 12 }}>
                  {f.title}
                </Text>
                <Text size="sm" color="muted" style={{ marginTop: 4 }}>
                  {f.text}
                </Text>
              </Card>
            );
          })}
        </Grid>
      </Section>

      {/* Steps */}
      <Section max={1024} style={{ paddingBottom: 80 }}>
        <SectionTitle title="Start budgeting in 3 steps" />
        <Grid cols={{ base: 1, md: 3 }} gap={16}>
          {steps.map(([title, text], i) => (
            <Card key={title} style={{ padding: 20, height: "100%" }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.a("primary", 0.15), alignItems: "center", justifyContent: "center" }}>
                <Text size="sm" weight="semibold" color="primary">
                  {i + 1}
                </Text>
              </View>
              <Text size="sm" weight="semibold" style={{ marginTop: 12 }}>
                {title}
              </Text>
              <Text size="sm" color="muted" style={{ marginTop: 4 }}>
                {text}
              </Text>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* Pricing */}
      <Section max={1024} style={{ paddingBottom: 80 }}>
        <SectionTitle title="Simple plans" subtitle="Start free. Every plan includes Angel AI. Pay monthly with UPI, card or netbanking — no auto-renewal." />
        <Grid cols={{ base: 1, md: 2, lg: 4 }} gap={16}>
          {PUBLIC_PLAN_IDS.map((id) => PLANS[id]).map((p) => (
            <Card key={p.id} style={{ padding: 24, height: "100%", borderColor: p.id === "pro" ? t.a("primary", 0.5) : t.c.border }}>
              <Text size="sm" weight="semibold">
                {p.name}
              </Text>
              <Text size="3xl" weight="semibold" style={{ marginTop: 8 }}>
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
              <LinkButton href="/register" variant="secondary" style={{ marginTop: 24, paddingVertical: 10 }}>
                {p.id === "free" ? "Start free" : "Get started"}
              </LinkButton>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* FAQ */}
      <Section max={768} style={{ paddingBottom: 40 }}>
        <SectionTitle title="Frequently asked questions" />
        <View style={{ gap: 12 }}>
          {FAQ.slice(0, 6).map((f) => (
            <Disclosure key={f.q} q={f.q} a={f.a} />
          ))}
        </View>
        <View style={{ marginTop: 16, alignItems: "center" }}>
          <NavLink href="/faq" color="primary">
            All questions →
          </NavLink>
        </View>
      </Section>

      {/* CTA */}
      <Section max={896}>
        <Card style={{ padding: 32, alignItems: "center", backgroundColor: t.a("primary", 0.05) }}>
          <Globe size={24} color={t.c.primary} />
          <Text accessibilityRole="header" size="2xl" weight="semibold" tight center style={{ marginTop: 12 }}>
            Your money, finally organised — in your language.
          </Text>
          <Text size="sm" color="muted" center style={{ marginTop: 8, maxWidth: 560 }}>
            Free forever plan. Works on phone and desktop. Install it like an app.
          </Text>
          <LinkButton href={signedIn ? "/dashboard" : "/register"} icon={<ArrowRight size={16} color={t.c.primaryFg} />} style={{ marginTop: 24 }}>
            {signedIn ? "Open dashboard" : "Create free account"}
          </LinkButton>
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Smartphone size={14} color={t.c.muted} />
            <Text size="xs" color="muted">
              Android · iPhone · Windows · Mac
            </Text>
          </View>
        </Card>
      </Section>
    </PublicShell>
  );
}

export default function Home() {
  const { status } = useAuth();
  if (Platform.OS !== "web") {
    if (status === "loading") return <LoadingScreen />;
    return <Redirect href={(status === "in" || status === "offline" ? "/dashboard" : "/login") as never} />;
  }
  return <Landing />;
}
