import { Platform } from "react-native";

/** Backend address (budbackend…). Set EXPO_PUBLIC_API_URL in .env / eas.json; never put secrets in EXPO_PUBLIC_*. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://budbackend.dhrumilpanchal.in").replace(/\/$/, "");
/** Public website (Expo web). */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "https://budget.dhrumilpanchal.in").replace(/\/$/, "");

export const IS_WEB = Platform.OS === "web";
export const IS_NATIVE = Platform.OS !== "web";
export const IS_IOS = Platform.OS === "ios";
export const IS_ANDROID = Platform.OS === "android";

/** True while expo-router pre-renders a page to HTML at build time (no window / storage there). */
export const IS_SSR = IS_WEB && typeof window === "undefined";
