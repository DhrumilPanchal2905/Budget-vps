import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal as RNModal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, X } from "lucide-react-native";
import { useTheme } from "./theme";
import { Text } from "./text";
import { Button } from "./button";
import { Field, Input, PasswordInput } from "./field";
import { useBreakpoint } from "./responsive";

const WIDTH = { sm: 440, md: 520, lg: 680, xl: 900 } as const;

/**
 * Dialog on tablets / desktop, bottom sheet on phones. Esc / back button / backdrop close it (unless dismissable=false).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissable = true,
  scroll = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof WIDTH;
  dismissable?: boolean;
  scroll?: boolean;
}) {
  const t = useTheme();
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const sheet = !bp.sm;
  const close = () => dismissable && onClose();

  useEffect(() => {
    if (!open || Platform.OS !== "web" || typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dismissable]);

  const Body = scroll ? ScrollView : View;
  return (
    <RNModal visible={open} transparent animationType={sheet ? "slide" : "fade"} onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: sheet ? "flex-end" : "center", alignItems: "center", padding: sheet ? 0 : 16 }}>
          <Pressable accessibilityLabel="Close" onPress={close} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.62)" }} />
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: sheet ? undefined : WIDTH[size],
              maxHeight: sheet ? "92%" : "90%",
              backgroundColor: t.c.surface,
              borderColor: t.c.border,
              borderWidth: 1,
              borderRadius: 18,
              borderBottomLeftRadius: sheet ? 0 : 18,
              borderBottomRightRadius: sheet ? 0 : 18,
              paddingBottom: sheet ? insets.bottom : 0,
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
              overflow: "hidden",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
              <View style={{ flex: 1 }}>
                {typeof title === "string" ? (
                  <Text size="md" weight="semibold">
                    {title}
                  </Text>
                ) : (
                  title
                )}
                {description ? (
                  typeof description === "string" ? (
                    <Text size="sm" color="muted" style={{ marginTop: 4 }}>
                      {description}
                    </Text>
                  ) : (
                    description
                  )
                ) : null}
              </View>
              {dismissable ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={{ padding: 4, borderRadius: 8 }}>
                  <X size={18} color={t.c.muted} />
                </Pressable>
              ) : null}
            </View>
            <Body style={scroll ? { flexGrow: 0 } : undefined} contentContainerStyle={scroll ? { paddingHorizontal: 20, paddingVertical: 16 } : undefined} keyboardShouldPersistTaps="handled">
              {scroll ? children : <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>{children}</View>}
            </Body>
            {footer ? (
              <View style={{ flexDirection: sheet ? "column-reverse" : "row", justifyContent: "flex-end", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.c.border }}>
                {footer}
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

/** Replaces window.confirm — optional "type X to confirm" and password re-entry. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
  typeToConfirm,
  requirePassword,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (input: { password?: string; confirm?: string }) => void | Promise<void>;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  typeToConfirm?: string;
  requirePassword?: boolean;
  loading?: boolean;
  error?: string | null;
}) {
  const t = useTheme();
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (open) {
      setTyped("");
      setPassword("");
    }
  }, [open]);
  const blocked = Boolean((typeToConfirm && typed !== typeToConfirm) || (requirePassword && !password));
  const go = () => !blocked && !loading && void onConfirm({ password, confirm: typed });
  return (
    <Modal
      open={open}
      onClose={() => !loading && onClose()}
      size="sm"
      title={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {danger ? <AlertTriangle size={16} color={t.c.danger} /> : null}
          <Text size="md" weight="semibold">
            {title}
          </Text>
        </View>
      }
      footer={
        <>
          <Button variant="secondary" onPress={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={loading} disabled={blocked} onPress={go}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <View style={{ gap: 14 }}>
        {typeof message === "string" ? (
          <Text size="sm" color="muted">
            {message}
          </Text>
        ) : (
          message
        )}
        {typeToConfirm ? (
          <Field label={`Type "${typeToConfirm}" to confirm`}>
            <Input value={typed} onChangeText={setTyped} autoCapitalize="none" autoCorrect={false} onSubmitEditing={go} />
          </Field>
        ) : null}
        {requirePassword ? (
          <Field label="Your password">
            <PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" onSubmitEditing={go} />
          </Field>
        ) : null}
        {error ? (
          <View style={{ borderRadius: 10, borderWidth: 1, borderColor: t.a("danger", 0.3), backgroundColor: t.a("danger", 0.1), paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text size="sm" color="danger">
              {error}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
