import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react-native";
import { useTheme } from "./theme";
import { Text } from "./text";
import { useBreakpoint } from "./responsive";

type Tone = "success" | "error" | "info" | "warning";
interface Toast {
  id: number;
  tone: Tone;
  title: string;
  message?: string;
}
export interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}
const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((x) => x.filter((y) => y.id !== id)), []);
  const push = useCallback(
    (tone: Tone, title: string, message?: string) => {
      const id = ++seq.current;
      setToasts((x) => [...x.slice(-3), { id, tone, title, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 4000);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(() => ({ success: (a, b) => push("success", a, b), error: (a, b) => push("error", a, b), info: (a, b) => push("info", a, b), warning: (a, b) => push("warning", a, b) }), [push]);
  const icon = (tone: Tone) =>
    tone === "success" ? <CheckCircle2 size={16} color={t.c.success} /> : tone === "error" ? <XCircle size={16} color={t.c.danger} /> : tone === "warning" ? <AlertTriangle size={16} color={t.c.warning} /> : <Info size={16} color={t.c.info} />;

  return (
    <Ctx.Provider value={api}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: bp.sm ? undefined : 12,
          right: bp.sm ? 16 : 12,
          top: bp.sm ? insets.top + 16 : undefined,
          bottom: bp.sm ? undefined : insets.bottom + 84,
          gap: 8,
          alignItems: bp.sm ? "flex-end" : "stretch",
          zIndex: 1000,
        }}
      >
        {toasts.map((x) => (
          <View
            key={x.id}
            accessibilityRole={x.tone === "error" ? "alert" : "text"}
            accessibilityLiveRegion="polite"
            style={{ width: bp.sm ? 360 : "100%", flexDirection: "row", gap: 10, alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: x.tone === "error" ? t.a("danger", 0.4) : t.c.border, backgroundColor: t.c.surface, boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}
          >
            <View style={{ marginTop: 1 }}>{icon(x.tone)}</View>
            <View style={{ flex: 1 }}>
              <Text size="sm" weight="medium">
                {x.title}
              </Text>
              {x.message ? (
                <Text size="xs" color="muted" style={{ marginTop: 2 }}>
                  {x.message}
                </Text>
              ) : null}
            </View>
            <Pressable accessibilityLabel="Dismiss" onPress={() => dismiss(x.id)} hitSlop={8}>
              <X size={16} color={t.c.muted} />
            </Pressable>
          </View>
        ))}
      </View>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used inside ToastProvider");
  return c;
}
