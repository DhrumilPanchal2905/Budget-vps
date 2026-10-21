import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useTheme } from "./theme";
import { Text } from "./text";
import { Button } from "./button";

/** Segmented control. */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ flexGrow: 0 }}>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 4, borderRadius: 12, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.6), gap: 2 }}>
        {items.map((it) => {
          const active = it.value === value;
          return (
            <Pressable
              key={it.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(it.value)}
              style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: active ? t.c.surface : "transparent", ...(active ? { boxShadow: "0 1px 3px rgba(0,0,0,0.25)" } : null) }}
            >
              {typeof it.label === "string" ? (
                <Text size="xs" weight="medium" color={active ? "fg" : "muted"}>
                  {it.label}
                </Text>
              ) : (
                it.label
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function Pagination({ page, pages, onChange, total }: { page: number; pages: number; onChange: (p: number) => void; total?: number }) {
  const t = useTheme();
  if (pages <= 1)
    return total !== undefined ? (
      <Text size="xs" color="muted" style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
        {total} record{total === 1 ? "" : "s"}
      </Text>
    ) : null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: t.c.border, paddingHorizontal: 18, paddingVertical: 12 }}>
      <Text size="xs" color="muted">
        Page {page} of {pages}
        {total !== undefined ? ` · ${total} records` : ""}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button size="sm" variant="secondary" disabled={page <= 1} onPress={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onPress={() => onChange(page + 1)}>
          Next
        </Button>
      </View>
    </View>
  );
}
