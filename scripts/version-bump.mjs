#!/usr/bin/env node
// npm run version:bump            → 4.0.0 → 4.0.1   (patch)
// npm run version:bump -- minor   → 4.0.1 → 4.1.0
// npm run version:bump -- major   → 4.1.0 → 5.0.0
// npm run version:bump -- 4.2.0   → exact version
// Always increases the build number (= Android versionCode = iOS buildNumber), so every store upload is accepted,
// and updates package.json + public/version.json (web "new version" notice).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const vPath = join(root, "version.json");
const v = JSON.parse(readFileSync(vPath, "utf8"));
const arg = (process.argv[2] || "patch").trim();

const [maj, min, pat] = String(v.version).split(".").map((x) => parseInt(x, 10) || 0);
let next;
if (/^\d+\.\d+\.\d+$/.test(arg)) next = arg;
else if (arg === "major") next = `${maj + 1}.0.0`;
else if (arg === "minor") next = `${maj}.${min + 1}.0`;
else if (arg === "patch") next = `${maj}.${min}.${pat + 1}`;
else if (arg === "build") next = v.version;
else {
  console.error(`Unknown bump "${arg}". Use patch | minor | major | build | x.y.z`);
  process.exit(1);
}

const out = { version: next, build: Number(v.build || 0) + 1 };
writeFileSync(vPath, JSON.stringify(out, null, 2) + "\n");

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

writeFileSync(join(root, "public/version.json"), JSON.stringify({ ...out, releasedAt: new Date().toISOString() }, null, 2) + "\n");

console.log(`✔ Budget Pro ${v.version} (build ${v.build}) → ${next} (build ${out.build})`);
console.log("  Next: npm run build:web  (website)  ·  npm run eas:android / eas:ios  (store apps)");
console.log(`  After the store release is LIVE, set APP_LATEST_ANDROID / APP_LATEST_IOS="${next}" in the API .env.`);
