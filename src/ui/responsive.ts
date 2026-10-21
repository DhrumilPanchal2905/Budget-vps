import { useWindowDimensions } from "react-native";

/** Same breakpoints as the old Tailwind UI: sm 640 · md 768 · lg 1024 · xl 1280. */
export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    sm: width >= 640,
    md: width >= 768,
    lg: width >= 1024,
    xl: width >= 1280,
    /** phone-sized layout (bottom tabs + drawer) */
    compact: width < 1024,
  };
}

/** Pick a value by breakpoint: bp({ base: 1, sm: 2, lg: 4 }) */
export function useResponsive<T>(v: { base: T; sm?: T; md?: T; lg?: T; xl?: T }): T {
  const b = useBreakpoint();
  if (b.xl && v.xl !== undefined) return v.xl;
  if (b.lg && v.lg !== undefined) return v.lg;
  if (b.md && v.md !== undefined) return v.md;
  if (b.sm && v.sm !== undefined) return v.sm;
  if (b.lg && v.md !== undefined) return v.md;
  if (b.md && v.sm !== undefined) return v.sm;
  return v.base;
}
