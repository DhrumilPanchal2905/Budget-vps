// Native date field: Android system date dialog / iOS inline calendar in a sheet. Value format: "YYYY-MM-DD".
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import { useTheme } from "./theme";
import { Text } from "./text";
import { Modal } from "./modal";
import { Button } from "./button";
import { fmtDate } from "@/lib/format";

const toDate = (s: string) => {
  const [y, m, d] = (s || "").split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
};
const toStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface DateInputProps {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
}

export function DateInput({ value, onChange, invalid, placeholder = "Select date", min, max, clearable }: DateInputProps) {
  const t = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(toDate(value));

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: "date",
        minimumDate: min ? toDate(min) : undefined,
        maximumDate: max ? toDate(max) : undefined,
        onChange: (e, d) => {
          if (e.type === "set" && d) onChange(toStr(d));
        },
      });
    } else {
      setDraft(toDate(value));
      setIosOpen(true);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `Date ${fmtDate(value)}` : placeholder}
        onPress={open}
        style={{ height: 42, borderRadius: 10, borderWidth: 1, borderColor: invalid ? t.c.danger : t.c.border, backgroundColor: t.a("surface2", 0.6), paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }}
      >
        <Calendar size={16} color={t.c.muted} />
        <Text size="sm" color={value ? "fg" : "muted"} style={{ flex: 1 }}>
          {value ? fmtDate(value) : placeholder}
        </Text>
        {clearable && value ? (
          <Text size="xs" color="primary" onPress={() => onChange("")}>
            Clear
          </Text>
        ) : null}
      </Pressable>
      {Platform.OS === "ios" ? (
        <Modal
          open={iosOpen}
          onClose={() => setIosOpen(false)}
          title="Choose a date"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onPress={() => setIosOpen(false)}>
                Cancel
              </Button>
              <Button
                onPress={() => {
                  onChange(toStr(draft));
                  setIosOpen(false);
                }}
              >
                Done
              </Button>
            </>
          }
        >
          <View style={{ alignItems: "center" }}>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              themeVariant={t.dark ? "dark" : "light"}
              accentColor={t.c.primary}
              minimumDate={min ? toDate(min) : undefined}
              maximumDate={max ? toDate(max) : undefined}
              onChange={(_, d) => d && setDraft(d)}
            />
          </View>
        </Modal>
      ) : null}
    </>
  );
}
