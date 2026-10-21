// Small popover menu anchored to a trigger (theme picker, account menu, notifications). Works on web + native.
import { useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, View, useWindowDimensions, type LayoutRectangle } from "react-native";
import { useTheme } from "./theme";

export function Popover({ trigger, children, width = 240, align = "right" }: { trigger: (open: () => void) => ReactNode; children: (close: () => void) => ReactNode; width?: number; align?: "left" | "right" }) {
  const t = useTheme();
  const win = useWindowDimensions();
  const ref = useRef<View>(null);
  const [rect, setRect] = useState<LayoutRectangle | null>(null);
  const open = () => {
    ref.current?.measureInWindow((x, y, w, h) => setRect({ x, y, width: w, height: h }));
  };
  const close = () => setRect(null);
  const w = Math.min(width, win.width - 16);
  const left = rect ? Math.max(8, Math.min(win.width - w - 8, align === "right" ? rect.x + rect.width - w : rect.x)) : 0;
  return (
    <>
      <View ref={ref} collapsable={false}>
        {trigger(open)}
      </View>
      <Modal visible={!!rect} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close menu" />
        {rect ? (
          <View
            style={{
              position: "absolute",
              top: rect.y + rect.height + 6,
              left,
              width: w,
              maxHeight: win.height - rect.y - rect.height - 24,
              backgroundColor: t.c.surface,
              borderColor: t.c.border,
              borderWidth: 1,
              borderRadius: 14,
              padding: 6,
              boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
              overflow: "hidden",
            }}
          >
            {children(close)}
          </View>
        ) : null}
      </Modal>
    </>
  );
}

export function MenuItem({ children, onPress, danger, active }: { children: ReactNode; onPress?: () => void; danger?: boolean; active?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="menuitem"
      onPress={onPress}
      style={(s) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: 9,
        backgroundColor: active ? t.a("primary", 0.12) : s.pressed || (s as { hovered?: boolean }).hovered ? (danger ? t.a("danger", 0.1) : t.c.surface2) : "transparent",
      })}
    >
      {children}
    </Pressable>
  );
}
