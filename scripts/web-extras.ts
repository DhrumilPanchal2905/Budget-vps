// Static SEO / PWA files for the web build (were Next.js routes before): manifest, robots, sitemap, llms.txt.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { DESCRIPTION, FAQ, PUBLIC_PAGES, SITE_URL } from "../src/shared/seo";
import { PLANS, PLAN_IDS } from "../src/shared/plans";

const out = process.argv[2] || "dist";
const w = (file: string, body: string) => writeFileSync(join(out, file), body);

// ---- manifest ----
w(
  "manifest.webmanifest",
  JSON.stringify(
    {
      id: "/",
      name: "Budget Pro — AI budget planner & expense tracker",
      short_name: "Budget Pro",
      description:
        "Track expenses, budgets, EMIs and savings goals with Angel — an AI money assistant that understands English, Hindi (हिंदी) and Gujarati (ગુજરાતી), by voice or chat. 16 free calculators including income tax, EMI, SIP, FD and GST.",
      start_url: "/dashboard?source=pwa",
      scope: "/",
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      orientation: "any",
      background_color: "#000000",
      theme_color: "#000000",
      lang: "en-IN",
      dir: "ltr",
      categories: ["finance", "productivity", "business"],
      prefer_related_applications: false,
      icons: [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Add expense", short_name: "Expense", url: "/expenses?new=1", description: "Add a new expense" },
        { name: "Budgets", url: "/budgets", description: "See what's left in each budget" },
        { name: "Angel suggestions", short_name: "Angel", url: "/insights", description: "Personal money suggestions" },
        { name: "Free calculators", short_name: "Tools", url: "/tools", description: "Income tax, EMI, SIP, FD and more" },
      ],
    },
    null,
    2,
  ),
);

// ---- robots.txt (AI answer engines welcome on public pages; private app pages blocked) ----
const PRIVATE = ["/api/", "/plan/invoice", "/dashboard", "/income", "/expenses", "/budgets", "/debts", "/goals", "/analytics", "/insights", "/notifications", "/settings", "/plan", "/admin", "/forgot-password"];
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot", "cohere-ai", "Meta-ExternalAgent", "DuckAssistBot"];
w(
  "robots.txt",
  [
    "User-Agent: *",
    "Allow: /",
    ...PRIVATE.map((p) => `Disallow: ${p}`),
    "",
    ...AI_BOTS.map((b) => `User-Agent: ${b}`),
    "Allow: /",
    "Allow: /llms.txt",
    "Allow: /llms-full.txt",
    ...PRIVATE.map((p) => `Disallow: ${p}`),
    "",
    `Host: ${SITE_URL}`,
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n"),
);

// ---- sitemap.xml ----
const UPDATED = new Date().toISOString().slice(0, 10);
w(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    PUBLIC_PAGES.map(
      (p) =>
        `  <url><loc>${p.path === "/" ? SITE_URL : `${SITE_URL}${p.path}`}</loc><lastmod>${UPDATED}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority>${
          p.path === "/" ? `<image:image><image:loc>${SITE_URL}/og-image.png</image:loc></image:image>` : ""
        }</url>`,
    ).join("\n") +
    "\n</urlset>\n",
);

// ---- llms.txt ----
w(
  "llms.txt",
  `# Budget Pro

> ${DESCRIPTION}

Budget Pro (${SITE_URL}) is a web app with Android and iPhone apps, built by Dhrumil Panchal. Its built-in AI assistant, Angel, is developed in-house (no third-party AI) and understands English, Hindi (हिंदी), Gujarati (ગુજરાતી) and Hinglish by voice or text. The Free plan is free forever; paid plans start at ₹50 a month.

## Key facts
- Category: personal finance — budget planner, expense tracker, EMI/loan tracker, savings goals
- Languages: English, Hindi, Gujarati, Hinglish (AI assistant); UI in English
- Currencies: 45+ (INR, USD, EUR, GBP, AED, SAR, SGD, AUD, CAD…)
- Security: email-verified sign-up (OTP), Argon2id passwords, HttpOnly sessions, end-to-end encrypted API payloads
- No bank login required; data is never sold
- Plans: Free ₹0 · Plus ₹50/month · Pro ₹100/month · Unlimited ₹500/month (UPI / card / netbanking via Razorpay, no auto-renewal). Every plan includes Angel AI; limited plans get credits that refill every few hours.
- Angel without an account: visitors can ask money questions, run calculations (EMI, SIP, FD, GST, tax, currency) and get web answers with sources.
- Free calculators (no sign-up): income tax FY 2026-27 (new vs old regime), EMI, SIP, FD, RD, PPF, GST, inflation, loan prepayment, compound interest, retirement, emergency fund, net worth, currency converter, 50/30/20 budget, savings goal

## Pages
${PUBLIC_PAGES.map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`).join("\n")}

## FAQ
${FAQ.map((f) => `- ${f.q} ${f.a}`).join("\n")}

## More
- [Full text for AI](${SITE_URL}/llms-full.txt)
`,
);

// ---- llms-full.txt ----
const plans = PLAN_IDS.map((id) => PLANS[id])
  .map((p) => `### ${p.name} (${p.priceLabel})\n${p.features.map((f) => `- ${f}`).join("\n")}`)
  .join("\n\n");
w(
  "llms-full.txt",
  `# Budget Pro — full description for AI assistants

${DESCRIPTION}

Website: ${SITE_URL}
Maker: Dhrumil Panchal

## What users can do
- Track income (salary, freelance, business…) and expenses in 17 categories; auto-repeat salary/rent/bills monthly
- Set monthly budgets per category with 80%/100% alerts, daily allowance and month-end projection
- Track loans/EMIs, record payments, get due-date reminders and a debt-free projection
- Create savings goals; see whether each goal is on track today, the real monthly saving pace and the projected finish date; contribute or withdraw with full history
- Analytics: monthly/all-time charts, category breakdown, month-over-month comparison, 50/30/20 split, financial health score
- Angel AI suggestions in English, Hindi, Gujarati or Hinglish
- Use it on the web, Android, iPhone, tablets and iPad — data syncs in realtime

## Angel AI assistant
Angel is Budget Pro's own AI (no third-party AI provider). It understands free-form questions in English, हिंदी, ગુજરાતી and Hinglish, typed or spoken, including Indian number words ("dedh lakh", "2.5k") and relative dates ("kal", "pichle 3 mahine"). It answers from the user's real data, explains changes ("why did my spending go up?"), checks budgets and goals, plans savings, judges affordability, explains money concepts (SIP, CIBIL, tax basics, emergency fund, avalanche vs snowball) and performs actions (add expense/income, set budget, goal contribution/withdrawal, EMI payment, delete/edit entries, undo). Users only ever access their own data; admins can manage users with confirmation. It also calculates EMI, SIP, FD, RD, GST, inflation and currency conversions from a sentence ("5 lakh loan 9% 5 saal EMI"), and looks general questions up on the web, always showing sources. Visitors can try Angel without an account (limited credits). Every plan includes Angel; limited plans get credits that refill every few hours and Unlimited has no limit.

## Free calculators (no sign-up)
Income tax FY 2026-27 (new vs old regime with 87A rebate, surcharge, cess), EMI, SIP, FD, RD, PPF, GST, inflation, loan prepayment, compound interest, retirement corpus, emergency fund, net worth, live currency converter, 50/30/20 budget planner and savings goal calculator — at ${SITE_URL}/tools.

## Payments
Paid plans are bought monthly in INR through Razorpay (UPI, cards, netbanking, wallets). No auto-renewal; a refund & cancellation policy is published at ${SITE_URL}/refund-policy.

## Plans
${plans}

## FAQ
${FAQ.map((f) => `### ${f.q}\n${f.a}`).join("\n\n")}
`,
);

console.log("✔ manifest.webmanifest, robots.txt, sitemap.xml, llms.txt, llms-full.txt written");
