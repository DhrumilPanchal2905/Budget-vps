import { Text as RNText, type TextProps, type TextStyle, type StyleProp } from "react-native";
import { useTheme, type ColorName } from "./theme";
import { FONT, type Weight } from "./fonts";

const SIZES = { "2xs": 10, xs: 11, sm: 13, base: 14, md: 15, lg: 17, xl: 20, "2xl": 24, "3xl": 30, "4xl": 38 } as const;
export type Size = keyof typeof SIZES;

export interface TProps extends TextProps {
  size?: Size;
  weight?: Weight;
  color?: ColorName | "white";
  tabular?: boolean;
  center?: boolean;
  /** extra letter spacing for headings (negative) */
  tight?: boolean;
  uppercase?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Text({ size = "base", weight = "regular", color = "fg", tabular, center, tight, uppercase, style, ...rest }: TProps) {
  const t = useTheme();
  const fs = SIZES[size];
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: FONT[weight],
          fontSize: fs,
          lineHeight: Math.round(fs * (fs >= 20 ? 1.25 : 1.45)),
          color: color === "white" ? "#fff" : t.c[color],
        },
        tabular && { fontVariant: ["tabular-nums"] },
        center && { textAlign: "center" },
        tight && { letterSpacing: fs >= 20 ? -0.5 : -0.2 },
        uppercase && { textTransform: "uppercase", letterSpacing: 0.6 },
        style,
      ]}
    />
  );
}

export function Heading({ level = 1, ...rest }: TProps & { level?: 1 | 2 | 3 }) {
  const size: Size = level === 1 ? "2xl" : level === 2 ? "lg" : "md";
  return <Text accessibilityRole="header" size={size} weight="semibold" tight {...rest} />;
}
