// Expo app config (Web + Android + iOS). Version numbers come from version.json — change them ONLY with
//   npm run version:bump            (patch: 4.0.0 → 4.0.1)   ·   npm run version:bump -- minor | major
// which also bumps the Android versionCode / iOS buildNumber and the web "new version" file.
import type { ExpoConfig } from "expo/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const v = JSON.parse(readFileSync(join(__dirname, "version.json"), "utf8")) as { version: string; build: number };

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "https://budget.dhrumilpanchal.in").replace(/\/$/, "");
const SITE_HOST = new URL(SITE_URL).host;
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE_NAME || "in.dhrumilpanchal.budget";
const IOS_BUNDLE = process.env.IOS_BUNDLE_ID || "in.dhrumilpanchal.budget";
const hasGoogleServices = existsSync(join(__dirname, "google-services.json"));

const config: ExpoConfig = {
  name: "Budget Pro",
  slug: "budget-pro",
  scheme: "budgetpro",
  owner: process.env.EXPO_OWNER || undefined,
  version: v.version,
  orientation: "default",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  backgroundColor: "#000000",
  primaryColor: "#3987e5",
  description: "AI budget planner & expense tracker with Angel — English, हिंदी, ગુજરાતી.",
  ios: {
    bundleIdentifier: IOS_BUNDLE,
    buildNumber: String(v.build),
    supportsTablet: true,
    associatedDomains: [`webcredentials:${SITE_HOST}`, `applinks:${SITE_HOST}`],
    infoPlist: {
      NSMicrophoneUsageDescription: "Angel AI uses the microphone only while you talk to it.",
      NSSpeechRecognitionUsageDescription: "Angel AI turns your voice into text so it can answer your money questions.",
      NSFaceIDUsageDescription: "Use Face ID to sign in to Budget Pro.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    versionCode: v.build,
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#0b0b0d" },
    permissions: ["RECORD_AUDIO", "POST_NOTIFICATIONS", "VIBRATE"],
    blockedPermissions: ["android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.SYSTEM_ALERT_WINDOW"],
    ...(hasGoogleServices ? { googleServicesFile: "./google-services.json" } : {}),
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: ["/dashboard", "/expenses", "/income", "/notifications", "/plan"].map((p) => ({ scheme: "https", host: SITE_HOST, pathPrefix: p })),
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: "metro",
    // "static" = every public page is pre-rendered HTML (SEO). Fallback if a build ever fails: WEB_OUTPUT=single
    output: (process.env.WEB_OUTPUT as "static" | "single") || "static",
    favicon: "./assets/favicon.png",
    name: "Budget Pro — AI budget planner & expense tracker",
    shortName: "Budget Pro",
    themeColor: "#000000",
    backgroundColor: "#000000",
    lang: "en-IN",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    "expo-web-browser",
    [
      "expo-splash-screen",
      { image: "./assets/splash-icon.png", imageWidth: 160, resizeMode: "contain", backgroundColor: "#000000" },
    ],
    [
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: "#3987e5", defaultChannel: "default" },
    ],
    [
      "expo-speech-recognition",
      {
        microphonePermission: "Angel AI uses the microphone only while you talk to it.",
        speechRecognitionPermission: "Angel AI turns your voice into text so it can answer your money questions.",
        androidSpeechServicePackages: ["com.google.android.googlequicksearchbox"],
      },
    ],
  ],
  experiments: { typedRoutes: false },
  extra: {
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
    build: v.build,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://budbackend.dhrumilpanchal.in",
    siteUrl: SITE_URL,
  },
};

export default config;
