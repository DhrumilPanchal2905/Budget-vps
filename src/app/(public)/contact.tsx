import type { ReactNode } from "react";
import { Linking, View } from "react-native";
import { Mail, MapPin, Phone, User, type LucideIcon } from "lucide-react-native";
import { pageMeta, SITE_URL } from "@/shared/seo";
import { useAppConfig } from "@/lib/app-config";
import { PublicShell, Section } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";
import { Card, Grid, Skeleton, Text, useTheme } from "@/ui";

const FALLBACK = { name: "Budget Pro", owner: "Dhrumil Panchal", email: "dhrumilpanchal295@gmail.com", phone: "", address: "Gujarat, India", gstin: null as string | null };

function Item({ icon: Icon, label, children, onPress }: { icon: LucideIcon; label: string; children: ReactNode; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Card onPress={onPress} style={{ padding: 20, flexDirection: "row", gap: 12, alignItems: "flex-start", height: "100%" }}>
      <Icon size={20} color={t.c.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text size="sm" weight="medium">
          {label}
        </Text>
        <Text size="sm" color="muted">
          {children}
        </Text>
      </View>
    </Card>
  );
}

export default function ContactPage() {
  const m = pageMeta("/contact");
  const { data, isLoading } = useAppConfig();
  const b = data?.business ?? FALLBACK;
  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }]}>
      <SeoHead
        title={m.title}
        description={m.description}
        path="/contact"
        jsonLd={{ "@context": "https://schema.org", "@type": "ContactPage", url: `${SITE_URL}/contact`, mainEntity: { "@type": "Organization", name: b.name, email: b.email, ...(b.phone ? { telephone: b.phone } : {}), address: b.address, founder: { "@type": "Person", name: b.owner } } }}
      />
      <Section max={768} style={{ paddingVertical: 40 }}>
        <Text accessibilityRole="header" size="3xl" weight="semibold" tight>
          Contact us
        </Text>
        <Text size="sm" color="muted" style={{ marginTop: 8 }}>
          Questions about your account, a payment, a refund or a feature? We usually reply within 2 working days.
        </Text>
        {isLoading && !data ? (
          <View style={{ marginTop: 32, gap: 12 }}>
            <Skeleton height={80} />
            <Skeleton height={80} />
          </View>
        ) : (
          <Grid cols={{ base: 1, sm: 2 }} gap={12} style={{ marginTop: 32 }}>
            <Item icon={Mail} label="Email" onPress={() => void Linking.openURL(`mailto:${b.email}`)}>
              {b.email}
            </Item>
            {b.phone ? (
              <Item icon={Phone} label="Phone" onPress={() => void Linking.openURL(`tel:${b.phone.replace(/\s/g, "")}`)}>
                {b.phone}
              </Item>
            ) : null}
            <Item icon={User} label="Owner">
              {b.owner} · {b.name}
            </Item>
            <Item icon={MapPin} label="Address">
              {b.address}
            </Item>
          </Grid>
        )}
        <Text size="xs" color="muted" style={{ marginTop: 24 }}>
          For payment issues please include your invoice number or Razorpay payment ID (shown on the Plan page and in your receipt email).
        </Text>
      </Section>
    </PublicShell>
  );
}
