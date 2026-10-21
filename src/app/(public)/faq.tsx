import { View } from "react-native";
import { FAQ, faqLd, pageMeta } from "@/shared/seo";
import { H1, H2, P, Prose, PublicShell } from "@/components/public-shell";
import { SeoHead } from "@/components/seo-head";

export default function FaqPage() {
  const m = pageMeta("/faq");
  return (
    <PublicShell crumbs={[{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]}>
      <SeoHead title={m.title} description={m.description} path="/faq" jsonLd={faqLd()} />
      <Prose>
        <H1>Frequently asked questions</H1>
        {FAQ.map((f) => (
          <View key={f.q}>
            <H2>{f.q}</H2>
            <P>{f.a}</P>
          </View>
        ))}
      </Prose>
    </PublicShell>
  );
}
