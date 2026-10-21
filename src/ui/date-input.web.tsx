// Web date field: the browser's own date picker (<input type="date">), styled like the other inputs.
import { useState } from "react";
import { useTheme } from "./theme";

export interface DateInputProps {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
}

export function DateInput({ value, onChange, invalid, min, max, placeholder }: DateInputProps) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <input
      type="date"
      value={value || ""}
      min={min}
      max={max}
      aria-label={placeholder ?? "Date"}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        height: 42,
        boxSizing: "border-box",
        width: "100%",
        borderRadius: 10,
        border: `1px solid ${invalid ? t.c.danger : focus ? t.a("primary", 0.7) : t.c.border}`,
        boxShadow: focus ? `0 0 0 3px ${t.a("primary", 0.2)}` : "none",
        background: t.a("surface2", 0.6),
        color: t.c.fg,
        padding: "0 12px",
        fontFamily: "Inter_400Regular, Inter, system-ui, sans-serif",
        fontSize: 14,
        outline: "none",
        colorScheme: t.dark ? "dark" : "light",
      }}
    />
  );
}
