// Web only: the HTML shell around every pre-rendered page (SEO meta, icons, no white flash before the theme loads).
import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";
import { AUTHOR, KEYWORDS, SITE_NAME, SITE_URL } from "@/shared/seo";

const THEME_BG: Record<string, string> = { midnight: "#000000", graphite: "#111111", ocean: "#050c18", emerald: "#040e0a", royal: "#0a0716", sunset: "#120a08", light: "#f6f6f4" };
const noFlash = `(function(){try{var m=${JSON.stringify(THEME_BG)};var t=localStorage.getItem('bp-theme');var c=m[t]||'#000000';document.documentElement.style.background=c;document.documentElement.setAttribute('data-theme',m[t]?t:'midnight');document.documentElement.style.colorScheme=t==='light'?'light':'dark';}catch(e){}})();`;

const css = `
html,body,#root{height:100%;background:#000}
body{margin:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overscroll-behavior-y:none}
*{scrollbar-width:thin;scrollbar-color:rgba(127,127,127,.35) transparent}
::selection{background:rgba(57,135,229,.35)}
input,textarea{font-family:inherit}
@media (prefers-reduced-motion: reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en-IN">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <meta name="application-name" content="Budget Pro" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Budget Pro" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        {/* title / description / canonical come from <SeoHead> on each public page (no duplicates) */}
        <meta name="keywords" content={KEYWORDS.join(", ")} />
        <meta name="author" content={AUTHOR.name} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="en_IN" />
        <meta name="ai-content-declaration" content="Budget Pro product site; see /llms.txt" />
        {process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION ? <meta name="google-site-verification" content={process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION} /> : null}
        {process.env.EXPO_PUBLIC_BING_SITE_VERIFICATION ? <meta name="msvalidate.01" content={process.env.EXPO_PUBLIC_BING_SITE_VERIFICATION} /> : null}
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-friendly site summary" />
        <link rel="preconnect" href={(process.env.EXPO_PUBLIC_API_URL || "https://budbackend.dhrumilpanchal.in").replace(/\/$/, "")} crossOrigin="use-credentials" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
