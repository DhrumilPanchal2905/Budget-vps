import { useMemo, useState } from "react";
import { FlatList, Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Check, ChevronDown, Search } from "lucide-react-native";
import { useTheme } from "./theme";
import { Text } from "./text";
import { Modal } from "./modal";
import { Input } from "./field";

export interface Option<V extends string = string> {
  value: V;
  label: string;
  hint?: string;
}

/** Dropdown that opens a searchable list (sheet on phones, dialog on larger screens). Same look on every platform. */
export function Select<V extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  title,
  invalid,
  disabled,
  style,
  searchable,
  accessibilityLabel,
}: {
  value: V | "";
  onChange: (v: V) => void;
  options: readonly Option<V>[];
  placeholder?: string;
  title?: string;
  invalid?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  searchable?: boolean;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > 12;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s)) : options;
  }, [options, q]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title ?? placeholder}
        disabled={disabled}
        onPress={() => {
          setQ("");
          setOpen(true);
        }}
        style={[
          {
            height: 42,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: invalid ? t.c.danger : t.c.border,
            backgroundColor: t.a("surface2", 0.6),
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            opacity: disabled ? 0.6 : 1,
          },
          style,
        ]}
      >
        <Text size="sm" color={current ? "fg" : "muted"} numberOfLines={1} style={{ flex: 1 }}>
          {current?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color={t.c.muted} />
      </Pressable>
      <Modal open={open} onClose={() => setOpen(false)} title={title ?? placeholder} size="sm" scroll={false}>
        {showSearch ? <Input icon={Search} value={q} onChangeText={setQ} placeholder="Search…" autoFocus containerStyle={{ marginBottom: 10 }} /> : null}
        <FlatList
          data={list as Option<V>[]}
          keyExtractor={(o) => o.value || "__empty"}
          style={{ maxHeight: 420 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                accessibilityRole="menuitem"
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={(s) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  borderRadius: 10,
                  backgroundColor: active ? t.a("primary", 0.12) : s.pressed || (s as { hovered?: boolean }).hovered ? t.c.surface2 : "transparent",
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text size="sm" weight={active ? "medium" : "regular"}>
                    {item.label}
                  </Text>
                  {item.hint ? (
                    <Text size="xs" color="muted">
                      {item.hint}
                    </Text>
                  ) : null}
                </View>
                {active ? <Check size={16} color={t.c.primary} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text size="sm" color="muted" center style={{ paddingVertical: 20 }}>
              No matches
            </Text>
          }
        />
      </Modal>
    </>
  );
}

/** Helper: build options from a string list (+ optional labels). */
export function opts<V extends string>(values: readonly V[], labels?: Partial<Record<V, string>>): Option<V>[] {
  return values.map((v) => ({ value: v, label: labels?.[v] ?? v }));
}
