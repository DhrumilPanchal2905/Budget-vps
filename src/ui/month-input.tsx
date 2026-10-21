// Month picker (YYYY-MM) — custom, so it looks and works the same on web, Android and iOS.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "./theme";
import { Text } from "./text";
import { Modal } from "./modal";
import { IconButton } from "./button";
import { monthLabel, monthStr } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthInput({ value, onChange, placeholder = "All months", clearable = true, compact }: { value: string; onChange: (v: string) => void; placeholder?: string; clearable?: boolean; compact?: boolean }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const cur = value || monthStr();
  const [year, setYear] = useState(Number(cur.slice(0, 4)));
  const maxYear = new Date().getFullYear() + 5;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `Month ${monthLabel(value)}` : placeholder}
        onPress={() => {
          setYear(Number((value || monthStr()).slice(0, 4)));
          setOpen(true);
        }}
        style={{ height: compact ? 36 : 42, borderRadius: 10, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.6), paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <CalendarDays size={16} color={t.c.muted} />
        <Text size="sm" color={value ? "fg" : "muted"} numberOfLines={1} style={{ flexShrink: 1 }}>
          {value ? monthLabel(value) : placeholder}
        </Text>
      </Pressable>
      <Modal open={open} onClose={() => setOpen(false)} title="Choose a month" size="sm" scroll={false}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <IconButton icon={ChevronLeft} label="Previous year" onPress={() => setYear((y) => y - 1)} />
          <Text size="md" weight="semibold" tabular>
            {year}
          </Text>
          <IconButton icon={ChevronRight} label="Next year" onPress={() => setYear((y) => Math.min(maxYear, y + 1))} disabled={year >= maxYear} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {MONTHS.map((m, i) => {
            const key = `${year}-${String(i + 1).padStart(2, "0")}`;
            const active = key === value;
            return (
              <Pressable
                key={m}
                accessibilityRole="button"
                onPress={() => {
                  onChange(key);
                  setOpen(false);
                }}
                style={(s) => ({
                  width: "31%",
                  flexGrow: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: active ? t.c.primary : t.c.border,
                  backgroundColor: active ? t.a("primary", 0.14) : s.pressed ? t.c.surface2 : "transparent",
                })}
              >
                <Text size="sm" weight={active ? "semibold" : "regular"} color={active ? "primary" : "fg"}>
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {clearable && value ? (
          <Pressable
            onPress={() => {
              onChange("");
              setOpen(false);
            }}
            style={{ marginTop: 14, alignSelf: "center", padding: 6 }}
          >
            <Text size="sm" color="primary">
              {placeholder}
            </Text>
          </Pressable>
        ) : null}
      </Modal>
    </>
  );
}
