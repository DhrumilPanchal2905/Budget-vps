// Themes — the same 7 themes as before (synced to the account), now as React Native colour tokens.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { THEMES, THEME_STORAGE_KEY, type ThemeId } from "@/shared/themes";
import { kv } from "@/lib/storage";

type RGB = readonly [number, number, number];

interface Raw {
  dark: boolean;
  bg: RGB;
  surface: RGB;
  surface2: RGB;
  border: RGB;
  fg: RGB;
  muted: RGB;
  primary: RGB;
  primaryFg: RGB;
  success: RGB;
  danger: RGB;
  warning: RGB;
  info: RGB;
  glow: RGB;
}

const RAW: Record<ThemeId, Raw> = {
  midnight: { dark: true, bg: [0, 0, 0], surface: [12, 12, 14], surface2: [22, 22, 26], border: [38, 38, 44], fg: [240, 239, 236], muted: [150, 150, 160], primary: [57, 135, 229], primaryFg: [255, 255, 255], success: [34, 170, 110], danger: [230, 90, 90], warning: [224, 160, 40], info: [90, 160, 240], glow: [57, 135, 229] },
  graphite: { dark: true, bg: [17, 17, 17], surface: [26, 26, 25], surface2: [36, 36, 35], border: [52, 52, 50], fg: [240, 239, 236], muted: [160, 159, 152], primary: [236, 236, 232], primaryFg: [17, 17, 17], success: [34, 170, 110], danger: [230, 103, 103], warning: [224, 160, 40], info: [120, 170, 230], glow: [200, 200, 200] },
  ocean: { dark: true, bg: [5, 12, 24], surface: [10, 22, 40], surface2: [16, 32, 56], border: [30, 52, 82], fg: [232, 241, 252], muted: [140, 162, 190], primary: [34, 190, 220], primaryFg: [4, 20, 30], success: [30, 180, 130], danger: [236, 100, 100], warning: [230, 170, 50], info: [80, 170, 250], glow: [34, 190, 220] },
  emerald: { dark: true, bg: [4, 14, 10], surface: [9, 24, 18], surface2: [14, 34, 26], border: [28, 56, 44], fg: [232, 246, 238], muted: [140, 176, 158], primary: [32, 190, 120], primaryFg: [3, 22, 14], success: [40, 200, 120], danger: [236, 100, 100], warning: [230, 170, 50], info: [80, 170, 240], glow: [32, 190, 120] },
  royal: { dark: true, bg: [10, 7, 22], surface: [19, 14, 38], surface2: [28, 21, 54], border: [48, 38, 84], fg: [240, 236, 252], muted: [165, 155, 200], primary: [144, 133, 233], primaryFg: [12, 8, 30], success: [40, 190, 130], danger: [236, 100, 110], warning: [230, 170, 50], info: [110, 160, 250], glow: [144, 133, 233] },
  sunset: { dark: true, bg: [18, 10, 8], surface: [30, 18, 14], surface2: [42, 26, 20], border: [66, 42, 34], fg: [250, 238, 230], muted: [190, 160, 148], primary: [240, 120, 60], primaryFg: [28, 10, 4], success: [40, 180, 120], danger: [236, 90, 90], warning: [236, 176, 50], info: [100, 160, 240], glow: [240, 120, 60] },
  light: { dark: false, bg: [246, 246, 244], surface: [255, 255, 255], surface2: [241, 241, 238], border: [226, 226, 221], fg: [17, 17, 16], muted: [92, 91, 86], primary: [42, 120, 214], primaryFg: [255, 255, 255], success: [16, 140, 90], danger: [205, 55, 55], warning: [176, 112, 0], info: [42, 120, 214], glow: [42, 120, 214] },
};

// Validated categorical chart palette (dark steps on dark themes, light steps on the light theme).
const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

export type ColorName = Exclude<keyof Raw, "dark">;

export interface Theme {
  id: ThemeId;
  dark: boolean;
  /** solid colours */
  c: Record<ColorName, string>;
  /** colour with opacity: a("primary", 0.12) */
  a: (name: ColorName, alpha: number) => string;
  series: string[];
  grid: string;
}

function build(id: ThemeId): Theme {
  const r = RAW[id];
  const c = {} as Record<ColorName, string>;
  for (const k of Object.keys(r) as (keyof Raw)[]) if (k !== "dark") c[k as ColorName] = `rgb(${(r[k] as RGB).join(",")})`;
  return {
    id,
    dark: r.dark,
    c,
    a: (name, alpha) => `rgba(${(r[name] as RGB).join(",")},${alpha})`,
    series: r.dark ? SERIES_DARK : SERIES_LIGHT,
    grid: r.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
  };
}

const CACHE = new Map<ThemeId, Theme>();
export function themeFor(id: ThemeId): Theme {
  let t = CACHE.get(id);
  if (!t) CACHE.set(id, (t = build(id)));
  return t;
}

const isTheme = (x: unknown): x is ThemeId => typeof x === "string" && THEMES.some((t) => t.id === x);

interface Ctx {
  theme: Theme;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  ready: boolean;
}
const ThemeContext = createContext<Ctx>({ theme: themeFor("midnight"), themeId: "midnight", setTheme: () => {}, ready: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setId] = useState<ThemeId>("midnight");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void kv.get(THEME_STORAGE_KEY).then((t) => {
      if (isTheme(t)) setId(t);
      setReady(true);
    });
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    if (!isTheme(id)) return;
    setId(id);
    void kv.set(THEME_STORAGE_KEY, id);
  }, []);

  // keep the browser chrome / page background in sync on web
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const t = themeFor(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    document.documentElement.style.colorScheme = t.dark ? "dark" : "light";
    document.body.style.backgroundColor = t.c.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.c.bg);
  }, [themeId]);

  const value = useMemo(() => ({ theme: themeFor(themeId), themeId, setTheme, ready }), [themeId, setTheme, ready]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useThemeCtl = () => useContext(ThemeContext);
/** Current theme tokens. */
export const useTheme = () => useContext(ThemeContext).theme;
export { THEMES, type ThemeId };
