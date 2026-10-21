// Inter (same typeface as the web app). Loaded once in the root layout.
export const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;
export type Weight = keyof typeof FONT;
