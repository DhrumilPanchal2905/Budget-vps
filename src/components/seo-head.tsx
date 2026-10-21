// Web-only <head> tags for public (SEO) pages: title, description, canonical, Open Graph, Twitter, JSON-LD.
import { Platform } from "react-native";
import Head from "expo-router/head";
import { jsonLd as toJsonLd, SITE_NAME, SITE_URL } from "@/shared/seo";

export function SeoHead({ title, description, path, jsonLd, noindex }: { title: string; description: string; path: string; jsonLd?: Record<string, unknown> | Record<string, unknown>[]; noindex?: boolean }) {
  if (Platform.OS !== "web") return null;
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? <meta name="robots" content="noindex, follow" /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(b) }} />
      ))}
    </Head>
  );
}
