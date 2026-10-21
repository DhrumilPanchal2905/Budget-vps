// Header + footer for the public (SEO) website pages, plus `Prose` building blocks for long-form pages.
import { useEffect, useState, type ReactNode } from "react";
import { Image, Linking, Platform, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { Link, router } from "expo-router";
import Head from "expo-router/head";
import { API_URL } from "@/lib/config";
import { breadcrumbLd, jsonLd } from "@/shared/seo";
import { TOOLS } from "@/shared/tools-registry";
import { Text, useBreakpoint, useTheme, type TProps } from "@/ui";
import { GuestAngel } from "@/components/angel/guest-angel";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/angel-ai", label: "Angel AI" },
  { href: "/tools", label: "Free tools" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

const FOOTER: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/angel-ai", label: "Angel AI assistant" },
      { href: "/pricing", label: "Pricing" },
      { href: "/register", label: "Create free account" },
    ],
  },
  {
    title: "Free tools",
    links: [
      { href: "/tools/emi-calculator", label: "EMI calculator" },
      { href: "/tools/budget-planner", label: "50/30/20 budget planner" },
      { href: "/tools/savings-goal-calculator", label: "Savings goal calculator" },
      { href: "/tools/sip-calculator", label: "SIP calculator" },
      { href: "/tools/income-tax-calculator", label: "Income tax calculator" },
      { href: "/tools/fd-calculator", label: "FD calculator" },
      { href: "/tools", label: `All ${TOOLS.length} tools →` },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refund-policy", label: "Refund policy" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

/** Internal link (renders a real <a href> on the web for crawlers). */
export function NavLink({ href, children, color = "muted", size = "sm", weight }: { href: string; children: ReactNode; color?: TProps["color"]; size?: TProps["size"]; weight?: TProps["weight"] }) {
  return (
    <Link href={href as never} asChild>
      <Text size={size} color={color} weight={weight} accessibilityRole="link">
        {children}
      </Text>
    </Link>
  );
}

/** Button-styled link. */
export function LinkButton({ href, children, variant = "primary", icon, style }: { href: string; children: string; variant?: "primary" | "secondary"; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <Link href={href as never} asChild>
      <Pressable
        accessibilityRole="link"
        style={(s) => [
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderRadius: 10,
            borderWidth: variant === "secondary" ? 1 : 0,
            borderColor: t.c.border,
            backgroundColor: variant === "primary" ? (s.pressed || (s as { hovered?: boolean }).hovered ? t.a("primary", 0.88) : t.c.primary) : s.pressed || (s as { hovered?: boolean }).hovered ? t.c.surface2 : t.c.surface,
          },
          style,
        ]}
      >
        {variant === "primary" ? null : icon}
        <Text size="sm" weight="medium" style={{ color: variant === "primary" ? t.c.primaryFg : t.c.fg }}>
          {children}
        </Text>
        {variant === "primary" ? icon : null}
      </Pressable>
    </Link>
  );
}

function Logo() {
  return (
    <Link href="/" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Budget Pro home" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Image source={require("../../assets/icon.png")} style={{ width: 32, height: 32, borderRadius: 8 }} accessibilityLabel="Budget Pro logo" />
        <Text size="md" weight="semibold" tight>
          Budget Pro
        </Text>
      </Pressable>
    </Link>
  );
}

/** Wakes the API + database while the visitor reads, so sign-in is instant. */
function useWarmUp() {
  useEffect(() => {
    const t = setTimeout(() => void fetch(`${API_URL}/api/health`, { cache: "no-store" }).catch(() => null), 1200);
    return () => clearTimeout(t);
  }, []);
}

export function PublicShell({ children, crumbs }: { children: ReactNode; crumbs?: { name: string; path: string }[] }) {
  const t = useTheme();
  const bp = useBreakpoint();
  useWarmUp();
  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      {Platform.OS === "web" && crumbs && crumbs.length > 1 ? (
        <Head>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd(crumbs)) }} />
        </Head>
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {/* soft glow behind the header */}
        <View pointerEvents="none" style={{ position: "absolute", top: -260, left: "10%", right: "10%", height: 560, borderRadius: 600, backgroundColor: t.a("glow", 0.08) }} />
        <View style={{ width: "100%", maxWidth: 1152, alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 20, paddingVertical: 20 }}>
          <Logo />
          {bp.md ? (
            <View accessibilityRole="navigation" style={{ flexDirection: "row", gap: 4 }}>
              {NAV.map((n) => (
                <View key={n.href} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                  <NavLink href={n.href}>{n.label}</NavLink>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
              <NavLink href="/login">Sign in</NavLink>
            </View>
            <LinkButton href="/register" style={{ paddingHorizontal: 16, paddingVertical: 9 }}>
              Get started
            </LinkButton>
          </View>
        </View>
        {!bp.md ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 8 }}>
            {NAV.map((n) => (
              <Pressable key={n.href} accessibilityRole="link" onPress={() => router.push(n.href as never)} style={{ borderRadius: 20, borderWidth: 1, borderColor: t.c.border, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text size="xs" color="muted">
                  {n.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {crumbs && crumbs.length > 1 ? (
          <View accessibilityLabel="Breadcrumb" style={{ width: "100%", maxWidth: 1024, alignSelf: "center", paddingHorizontal: 20, paddingTop: 8, flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
            {crumbs.map((c, i) => (
              <View key={c.path} style={{ flexDirection: "row", alignItems: "center" }}>
                {i > 0 ? (
                  <Text size="xs" color="muted" style={{ marginHorizontal: 6 }}>
                    /
                  </Text>
                ) : null}
                {i < crumbs.length - 1 ? (
                  <NavLink href={c.path} size="xs">
                    {c.name}
                  </NavLink>
                ) : (
                  <Text size="xs">{c.name}</Text>
                )}
              </View>
            ))}
          </View>
        ) : null}

        <View accessibilityRole="main" style={{ flexGrow: 1 }}>
          {children}
        </View>

        <View style={{ marginTop: 64, borderTopWidth: 1, borderTopColor: t.c.border }}>
          <View style={{ width: "100%", maxWidth: 1152, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 40, flexDirection: "row", flexWrap: "wrap", rowGap: 28 }}>
            <View style={{ width: bp.lg ? "25%" : bp.sm ? "50%" : "100%", paddingRight: 16 }}>
              <Text size="sm" weight="semibold">
                Budget Pro
              </Text>
              <Text size="sm" color="muted" style={{ marginTop: 8 }}>
                AI budget planner & expense tracker in English, हिंदी and ગુજરાતી. Built by Dhrumil Panchal.
              </Text>
            </View>
            {FOOTER.map((col) => (
              <View key={col.title} style={{ width: bp.lg ? "25%" : bp.sm ? "50%" : "100%", paddingRight: 16 }}>
                <Text size="sm" weight="semibold">
                  {col.title}
                </Text>
                <View style={{ marginTop: 8, gap: 6 }}>
                  {col.links.map((l) => (
                    <NavLink key={l.href} href={l.href}>
                      {l.label}
                    </NavLink>
                  ))}
                </View>
              </View>
            ))}
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: t.c.border, paddingVertical: 20 }}>
            <Text size="xs" color="muted" center>
              © {new Date().getFullYear()} Budget Pro · budget.dhrumilpanchal.in
            </Text>
          </View>
        </View>
      </ScrollView>
      {Platform.OS === "web" ? <GuestAngel /> : null}
    </View>
  );
}

// ---------------- Prose (long-form content pages) ----------------
export function Prose({ children }: { children: ReactNode }) {
  return <View style={{ width: "100%", maxWidth: 768, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 40 }}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" size="3xl" weight="semibold" tight style={{ marginBottom: 12 }} {...({ "aria-level": 1 } as object)}>
      {children}
    </Text>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" size="xl" weight="semibold" tight style={{ marginTop: 32, marginBottom: 8 }} {...({ "aria-level": 2 } as object)}>
      {children}
    </Text>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" size="base" weight="semibold" style={{ marginTop: 20, marginBottom: 6 }} {...({ "aria-level": 3 } as object)}>
      {children}
    </Text>
  );
}

export function P({ children, style }: { children: ReactNode; style?: TProps["style"] }) {
  return (
    <Text color="muted" style={[{ fontSize: 15, lineHeight: 26, marginBottom: 12 }, style]}>
      {children}
    </Text>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return <View style={{ marginVertical: 8, gap: 6 }}>{children}</View>;
}

export function Li({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingLeft: 4 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.c.muted, marginTop: 11 }} />
      <Text color="muted" style={{ flex: 1, fontSize: 15, lineHeight: 26 }}>
        {children}
      </Text>
    </View>
  );
}

/** Bold text inside a paragraph. */
export function B({ children }: { children: ReactNode }) {
  return (
    <Text weight="semibold" color="fg" style={{ fontSize: 15 }}>
      {children}
    </Text>
  );
}

export function Em({ children }: { children: ReactNode }) {
  return <Text style={{ fontStyle: "italic", fontSize: 15 }} color="muted">{children}</Text>;
}

/** Inline link: internal paths use the router, mailto:/tel:/https: open outside. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith("/"))
    return (
      <Link href={href as never} asChild>
        <Text color="primary" accessibilityRole="link" style={{ fontSize: 15 }}>
          {children}
        </Text>
      </Link>
    );
  return (
    <Text color="primary" accessibilityRole="link" style={{ fontSize: 15 }} onPress={() => void Linking.openURL(href)} {...(Platform.OS === "web" ? ({ href } as object) : null)}>
      {children}
    </Text>
  );
}

// ---------------- page building blocks ----------------
/** Centered content section with a max width (Tailwind max-w-3xl … 6xl equivalents). */
export function Section({ children, max = 1024, style }: { children: ReactNode; max?: 768 | 896 | 1024 | 1152; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: "100%", maxWidth: max, alignSelf: "center", paddingHorizontal: 20 }, style]}>{children}</View>;
}

/** Question / answer that opens on tap (like <details>). The answer is always in the page for crawlers. */
export function Disclosure({ q, a }: { q: string; a: string }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={{ borderRadius: 14, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface, padding: 16 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text size="sm" weight="medium" style={{ flex: 1 }}>
          {q}
        </Text>
        <Text size="md" color="muted">
          {open ? "−" : "+"}
        </Text>
      </View>
      {open ? (
        <Text size="sm" color="muted" style={{ marginTop: 8 }}>
          {a}
        </Text>
      ) : Platform.OS === "web" ? (
        <Text size="sm" color="muted" style={{ display: "none" }}>
          {a}
        </Text>
      ) : null}
    </Pressable>
  );
}
