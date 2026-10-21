#!/usr/bin/env node
// npm run build:web
//  1. expo export → dist/  (every public page pre-rendered to HTML for SEO; app pages are client-side)
//  2. adds manifest.webmanifest, robots.txt, sitemap.xml, llms.txt, llms-full.txt, version.json, .htaccess
// Upload / rsync dist/ to the VPS web root (see DEPLOY.md) — open tabs then show "New version available".
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

// .env → process.env (EXPO_PUBLIC_* are baked into the bundle)
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
process.env.EXPO_PUBLIC_API_URL ||= "https://budbackend.dhrumilpanchal.in";
process.env.EXPO_PUBLIC_SITE_URL ||= "https://budget.dhrumilpanchal.in";

const v = JSON.parse(readFileSync(join(root, "version.json"), "utf8"));
console.log(`\n▶ Building Budget Pro web ${v.version} (build ${v.build}) → dist/\n  API: ${process.env.EXPO_PUBLIC_API_URL}\n  Site: ${process.env.EXPO_PUBLIC_SITE_URL}\n`);

run("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist", "--clear"]);
run("npx", ["tsx", "scripts/web-extras.ts", "dist"]);
writeFileSync(join(root, "dist/version.json"), JSON.stringify({ ...v, releasedAt: new Date().toISOString() }) + "\n");
console.log(`\n✔ Web build ready in dist/ — version ${v.version} (build ${v.build}).`);
