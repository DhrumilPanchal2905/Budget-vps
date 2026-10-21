// /tools — index of the free money calculators.
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Banknote, Calculator, Coins, Flame, Globe2, Landmark, LifeBuoy, Percent, PieChart, PiggyBank, Receipt, Scale, ShieldCheck, Sunset, TrendingUp, Wallet, type LucideIcon } from "lucide-react-native";
import { PublicShell } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";
import { TOOLS } from "@/shared/tools-registry";
import { pageMeta, SITE_URL } from "@/shared/seo";
import { Grid, Text, useBreakpoint, useTheme } from "@/ui";

const ICON: Record<string, LucideIcon> = {
  "emi-calculator": Calculator,
  "budget-planner": PieChart,
  "savings-goal-calculator": PiggyBank,
  "sip-calculator": TrendingUp,
  "income-tax-calculator": Receipt,
  "fd-calculator": Landmark,
  "rd-calculator": Coins,
  "ppf-calculator": ShieldCheck,
  "gst-calculator": Percent,
  "inflation-calculator": Flame,
  "loan-prepayment-calculator": Banknote,
  "compound-interest-calculator": TrendingUp,
  "retirement-calculator": Sunset,
  "emergency-fund-calculator": LifeBuoy,
  "net-worth-calculator": Scale,
  "currency-converter": Globe2,
};

export default function ToolsPage() {
  const t = useTheme();
  const bp = useBreakpoint();
  const meta = pageMeta("/tools");
  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "Free tools", path: "/tools" }]}>
      <SeoHead
        title={meta.title}
        description={meta.description}
        path="/tools"
        jsonLd={{ "@context": "https://schema.org", "@type": "ItemList", name: "Free money calculators", itemListElement: TOOLS.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.title, url: `${SITE_URL}/tools/${x.slug}` })) }}
      />
      <View style={{ width: "100%", maxWidth: 1152, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 40 }}>
        <Text accessibilityRole="header" size={bp.sm ? "3xl" : "2xl"} weight="semibold" tight>
          Free money calculators
        </Text>
        <Text size="sm" color="muted" style={{ marginTop: 8, maxWidth: 672 }}>
          {TOOLS.length} free tools — no sign-up, private (they run on your device), and most work in 45+ currencies. Or just ask Angel: “5 lakh loan 9% 5 saal EMI?”
        </Text>
        <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap={16} style={{ marginTop: 32 }}>
          {TOOLS.map((x) => {
            const Icon = ICON[x.slug] ?? Wallet;
            return (
              <Pressable
                key={x.slug}
                accessibilityRole="link"
                accessibilityLabel={x.title}
                onPress={() => router.push(`/tools/${x.slug}` as never)}
                style={(s) => ({
                  height: "100%",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: (s as { hovered?: boolean }).hovered || s.pressed ? t.a("primary", 0.5) : t.c.border,
                  backgroundColor: t.c.surface,
                  padding: 20,
                })}
              >
                <Icon size={20} color={t.c.primary} />
                <Text accessibilityRole="header" size="md" weight="semibold" style={{ marginTop: 12 }}>
                  {x.title}
                </Text>
                <Text size="sm" color="muted" style={{ marginTop: 4 }}>
                  {x.description}
                </Text>
              </Pressable>
            );
          })}
        </Grid>
      </View>
    </PublicShell>
  );
}
