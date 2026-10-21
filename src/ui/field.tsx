import { forwardRef, useState, type ReactNode } from "react";
import { Platform, Pressable, Switch, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Check, Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { useTheme } from "./theme";
import { Text } from "./text";
import { FONT } from "./fonts";

export function Field({ label, error, hint, children, style }: { label?: string; error?: string; hint?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text size="xs" weight="medium" color="muted">
          {label}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Text size="xs" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text size="xs" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export interface InputProps extends TextInputProps {
  invalid?: boolean;
  icon?: LucideIcon;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** numbers only (amounts): strips everything except digits and one dot */
  numeric?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input({ invalid, icon: Icon, right, containerStyle, style, numeric, onChangeText, multiline, editable = true, onFocus, onBlur, keyboardType, inputMode, ...rest }, ref) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          minHeight: multiline ? 88 : 42,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: invalid ? t.c.danger : focus ? t.a("primary", 0.7) : t.c.border,
          backgroundColor: t.a("surface2", 0.6),
          paddingHorizontal: 12,
          opacity: editable ? 1 : 0.6,
        },
        focus && Platform.OS === "web" ? { boxShadow: `0 0 0 3px ${t.a("primary", 0.2)}` } : null,
        containerStyle,
      ]}
    >
      {Icon ? <Icon size={16} color={t.c.muted} style={{ marginRight: 8, marginTop: multiline ? 12 : 0 }} /> : null}
      <TextInput
        {...rest}
        ref={ref}
        placeholderTextColor={t.a("muted", 0.75)}
        selectionColor={t.c.primary}
        multiline={multiline}
        editable={editable}
        keyboardType={numeric ? "decimal-pad" : keyboardType}
        inputMode={numeric ? "decimal" : inputMode}
        onFocus={(e) => {
          setFocus(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          onBlur?.(e);
        }}
        onChangeText={(v) => {
          if (numeric) {
            v = v.replace(/[^\d.]/g, "");
            const i = v.indexOf(".");
            if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "");
          }
          onChangeText?.(v);
        }}
        style={[
          {
            flex: 1,
            color: t.c.fg,
            fontFamily: FONT.regular,
            fontSize: 14,
            paddingVertical: multiline ? 10 : 0,
            minHeight: multiline ? 86 : 40,
            textAlignVertical: multiline ? "top" : "center",
          },
          Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
          style,
        ]}
      />
      {right}
    </View>
  );
});

export function PasswordInput(props: InputProps) {
  const t = useTheme();
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      secureTextEntry={!show}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel={show ? "Hide password" : "Show password"} onPress={() => setShow((s) => !s)} hitSlop={8} style={{ paddingLeft: 8 }}>
          {show ? <EyeOff size={16} color={t.c.muted} /> : <Eye size={16} color={t.c.muted} />}
        </Pressable>
      }
    />
  );
}

export function Checkbox({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", opacity: disabled ? 0.5 : 1 }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          marginTop: 1,
          borderRadius: 5,
          borderWidth: 1.5,
          borderColor: checked ? t.c.primary : t.c.border,
          backgroundColor: checked ? t.c.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Check size={12} color={t.c.primaryFg} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        {typeof label === "string" ? <Text size="sm">{label}</Text> : label}
        {description ? (
          typeof description === "string" ? (
            <Text size="xs" color="muted" style={{ marginTop: 2 }}>
              {description}
            </Text>
          ) : (
            description
          )
        ) : null}
      </View>
    </Pressable>
  );
}

export function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  const t = useTheme();
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: t.c.border, true: t.c.primary }}
      thumbColor={Platform.OS === "android" ? (value ? t.c.primaryFg : t.c.muted) : undefined}
      {...(Platform.OS === "web" ? ({ activeThumbColor: t.c.primaryFg } as object) : null)}
    />
  );
}
