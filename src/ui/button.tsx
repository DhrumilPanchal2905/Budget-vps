import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "./theme";
import { Text } from "./text";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface Props extends Omit<PressableProps, "children" | "style"> {
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children?: ReactNode;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}

const H: Record<Size, number> = { sm: 32, md: 40, lg: 46 };
const PX: Record<Size, number> = { sm: 12, md: 16, lg: 20 };

type State = { pressed: boolean; hovered?: boolean };

export function Button({ variant = "primary", size = "md", loading, disabled, icon: Icon, iconRight: IconRight, children, full, style, ...rest }: Props) {
  const t = useTheme();
  const off = disabled || loading;
  const fg = variant === "primary" ? t.c.primaryFg : variant === "danger" || variant === "success" ? "#fff" : variant === "ghost" ? t.c.muted : t.c.fg;
  const bg = (s: State) => {
    const hot = s.pressed || s.hovered;
    switch (variant) {
      case "primary":
        return hot ? t.a("primary", 0.88) : t.c.primary;
      case "danger":
        return hot ? t.a("danger", 0.88) : t.c.danger;
      case "success":
        return hot ? t.a("success", 0.88) : t.c.success;
      case "secondary":
        return hot ? t.a("surface2", 0.7) : t.c.surface2;
      case "outline":
      case "ghost":
        return hot ? t.c.surface2 : "transparent";
    }
  };
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      {...rest}
      style={(s) => [
        {
          height: H[size],
          paddingHorizontal: PX[size],
          borderRadius: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: bg(s as State),
          opacity: off ? 0.55 : 1,
          alignSelf: full ? "stretch" : "auto",
        },
        (variant === "secondary" || variant === "outline") && { borderWidth: 1, borderColor: t.c.border },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={iconSize} color={fg} /> : null}
      {children !== undefined && children !== null && (typeof children === "string" || typeof children === "number" ? (
        <Text size={size === "sm" ? "xs" : "sm"} weight="medium" style={{ color: fg }} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      ))}
      {IconRight && !loading ? <IconRight size={iconSize} color={fg} /> : null}
    </Pressable>
  );
}

/** Square icon button (toolbar actions). */
export function IconButton({
  icon: Icon,
  onPress,
  label,
  tone = "muted",
  size = 36,
  disabled,
  active,
  badge,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  label: string;
  tone?: "muted" | "fg" | "danger" | "primary";
  size?: number;
  disabled?: boolean;
  active?: boolean;
  badge?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={(s) => ({
        width: size,
        height: size,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active || (s as State).pressed || (s as State).hovered ? t.c.surface2 : "transparent",
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Icon size={size <= 32 ? 16 : 18} color={tone === "fg" ? t.c.fg : tone === "danger" ? t.c.danger : tone === "primary" ? t.c.primary : t.c.muted} />
      {badge ? <View style={{ position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: t.c.danger, borderWidth: 2, borderColor: t.c.surface }} /> : null}
    </Pressable>
  );
}
