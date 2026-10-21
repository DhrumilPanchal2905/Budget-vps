// Angel AI — the conversation panel: live orb + voice stage, chat, history (with delete) and settings.
// Full screen on phones, a right-side panel on tablets / desktop.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUp, Check, Copy, ExternalLink, History, MessageSquarePlus, Mic, MicOff, Play, Settings2, Sparkles, Trash2, Undo2, Volume2, X } from "lucide-react-native";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { AngelMessageDTO, Card, ConversationDTO } from "@/shared/angel/types";
import { Button, ConfirmDialog, FONT, IconButton, Notice, Select, Text, Toggle, useBreakpoint, useTheme, useToast } from "@/ui";
import { AngelOrb } from "./orb";
import { useAngel, type VoiceLang } from "./angel-provider";
import { canSpeak, listVoices, loadVoices, speak } from "./voice";

const STATUS: Record<string, string> = {
  idle: "Ready",
  wake: "Listening for “Angel active”",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  off: "Off",
};

type ViewName = "chat" | "history" | "settings";

export function AngelPanel() {
  const a = useAngel();
  const t = useTheme();
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<ViewName>("chat");
  const wide = bp.lg;

  useEffect(() => {
    if (!a.open || Platform.OS !== "web" || typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[aria-modal="true"]')) a.setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [a]);

  if (!a.open) return null;

  const close = () => {
    a.endVoice();
    a.setOpen(false);
  };

  return (
    <View
      accessibilityLabel="Angel AI assistant"
      style={{
        position: (Platform.OS === "web" ? "fixed" : "absolute") as "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        left: wide ? undefined : 0,
        width: wide ? 440 : undefined,
        zIndex: 45,
        backgroundColor: t.c.surface,
        borderLeftWidth: wide ? 1 : 0,
        borderLeftColor: t.c.border,
        boxShadow: wide ? "-16px 0 48px rgba(0,0,0,0.4)" : undefined,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {/* header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
          <AngelOrb size={40} state={a.mode} levelRef={a.levelRef} halo={false} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="md" weight="semibold">
              Angel
            </Text>
            <Text size="xs" color="muted" numberOfLines={1} accessibilityLiveRegion="polite">
              {STATUS[a.mode] ?? "Ready"}
            </Text>
          </View>
          <IconButton
            icon={MessageSquarePlus}
            label="New chat"
            onPress={() => {
              a.newChat();
              setView("chat");
            }}
          />
          {!a.guest ? <IconButton icon={History} label="Chat history" active={view === "history"} onPress={() => setView(view === "history" ? "chat" : "history")} /> : null}
          <IconButton icon={Settings2} label="Angel settings" active={view === "settings"} onPress={() => setView(view === "settings" ? "chat" : "settings")} />
          <IconButton icon={X} label="Close Angel" onPress={close} />
        </View>

        <QuotaBar />
        {view === "history" && !a.guest ? <HistoryView onOpen={() => setView("chat")} /> : view === "settings" ? <SettingsView /> : <ChatView />}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Internal links from Angel (CTA cards, quota bar). On phones the panel covers the page, so it closes first. */
function useGo() {
  const a = useAngel();
  const bp = useBreakpoint();
  return (href: string) => {
    if (!href.startsWith("/") || href.startsWith("//")) return;
    if (!bp.lg) a.setOpen(false);
    router.push(href as never);
  };
}

// ======================= chat =======================
/** Angel credits left in this window — only shown on limited plans. */
function QuotaBar() {
  const a = useAngel();
  const t = useTheme();
  const go = useGo();
  const q = a.quota;
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);
  if (!q || q.limit === null) return null;
  const left = q.remaining ?? 0;
  const pct = Math.max(0, Math.min(100, (left / Math.max(1, q.limit)) * 100));
  const reset = q.resetAt ? new Date(q.resetAt) : null;
  const mins = reset ? Math.max(0, Math.ceil((reset.getTime() - Date.now()) / 60000)) : 0;
  const wait = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  const tone = left === 0 ? "danger" : left <= q.limit * 0.2 ? "warning" : "muted";
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: t.c.border, paddingHorizontal: 14, paddingVertical: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text size="2xs" weight="medium" color={tone} style={{ flexShrink: 1 }}>
          {left === 0 ? "No credits left" : `${left} of ${q.limit} credits left`}
          {reset ? (
            <Text size="2xs" color="muted">
              {` · refills in ${wait}`}
            </Text>
          ) : null}
        </Text>
        {a.guest || q.plan !== "unlimited" ? (
          <Pressable onPress={() => go(a.guest ? "/register" : "/plan")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Sparkles size={12} color={t.c.primary} />
            <Text size="2xs" weight="medium" color="primary">
              {a.guest ? "Get more free" : "Upgrade"}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ marginTop: 6, height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: t.c.surface2 }}>
        <View style={{ height: "100%", width: `${pct}%`, borderRadius: 2, backgroundColor: left === 0 ? t.c.danger : left <= q.limit * 0.2 ? t.c.warning : t.c.primary }} />
      </View>
    </View>
  );
}

function ChatView() {
  const a = useAngel();
  const t = useTheme();
  const [text, setText] = useState("");
  const scroller = useRef<ScrollView>(null);
  const first = a.firstName;

  useEffect(() => {
    const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [a.messages.length, a.sending, a.voiceSession]);

  const submit = () => {
    if (!text.trim() || a.sending) return;
    void a.send(text, "text");
    setText("");
  };

  const lastAngel = [...a.messages].reverse().find((m) => m.role === "angel");
  const empty = a.messages.length === 0;
  const showSuggestions = !a.sending && !!lastAngel?.suggestions?.length && !lastAngel.action?.needsConfirm && lastAngel === a.messages[a.messages.length - 1];

  return (
    <>
      <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 14, paddingVertical: 16 }} keyboardShouldPersistTaps="handled">
        {a.voiceSession ? (
          <VoiceStage />
        ) : empty ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 24 }}>
            <AngelOrb size={150} state={a.mode} levelRef={a.levelRef} />
            <Text size="xl" weight="semibold" tight center style={{ marginTop: 16 }}>
              {`Hi${first ? ` ${first}` : ""}, I'm Angel.`}
            </Text>
            <Text size="sm" color="muted" center style={{ marginTop: 6, maxWidth: 320 }}>
              {a.guest
                ? "Ask me anything about money — budgeting, saving, loans, EMI / SIP / FD maths, currency rates — in English, हिंदी or ગુજરાતી."
                : "Ask about your money, get saving advice, or tell me what you spent — in English, हिंदी or ગુજરાતી. I can also look things up on the web."}
            </Text>
            {a.voiceSupported ? (
              <Button size="lg" icon={Mic} onPress={a.activate} style={{ marginTop: 20 }}>
                Tap to talk
              </Button>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 20 }}>
              {(a.guest
                ? ["5 lakh loan 9% 5 saal EMI?", "Budget kaise banaye?", "₹5,000 SIP 10 saal 12%", "100 dollar kitne rupaye?"]
                : ["Mera balance kitna hai?", "Is mahine kitna kharcha hua?", "500 ka petrol add karo", "1 lakh kaise bachaun?"]
              ).map((s) => (
                <Chip key={s} onPress={() => void a.send(s, "text")}>
                  {s}
                </Chip>
              ))}
            </View>
          </View>
        ) : null}

        {!empty ? (
          <View style={{ gap: 16, marginTop: a.voiceSession ? 24 : 0 }}>
            {a.messages.map((m) => (
              <Message key={m.id} m={m} />
            ))}
            {a.sending ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AngelOrb size={22} state="thinking" halo={false} />
                <Text size="sm" color="muted">
                  Angel is thinking…
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* quick replies */}
      {showSuggestions ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          {lastAngel!.suggestions!.map((s) => (
            <Chip key={s} onPress={() => void a.send(s, "text")}>
              {s}
            </Chip>
          ))}
        </ScrollView>
      ) : null}

      {/* composer */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, borderTopWidth: 1, borderTopColor: t.c.border, paddingHorizontal: 12, paddingVertical: 10 }}>
        <TextInput
          accessibilityLabel="Message Angel"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          placeholder="Ask Angel anything…"
          placeholderTextColor={t.a("muted", 0.75)}
          selectionColor={t.c.primary}
          onKeyPress={(e) => {
            if (Platform.OS !== "web") return;
            const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean; preventDefault?: () => void };
            if (ne.key === "Enter" && !ne.shiftKey) {
              (e as unknown as { preventDefault?: () => void }).preventDefault?.();
              submit();
            }
          }}
          style={[
            {
              flex: 1,
              minHeight: 42,
              maxHeight: 128,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: t.c.border,
              backgroundColor: t.c.surface2,
              paddingHorizontal: 14,
              paddingTop: 11,
              paddingBottom: 11,
              color: t.c.fg,
              fontFamily: FONT.regular,
              fontSize: 14,
            },
            Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
          ]}
        />
        {a.voiceSupported ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={a.voiceSession ? "Stop voice" : "Talk to Angel"}
            onPress={a.voiceSession ? a.endVoice : a.activate}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              alignItems: "center",
              justifyContent: "center",
              borderColor: a.voiceSession ? t.a("danger", 0.4) : t.c.border,
              backgroundColor: a.voiceSession ? t.a("danger", 0.15) : t.c.surface2,
            }}
          >
            {a.voiceSession ? <MicOff size={16} color={t.c.danger} /> : <Mic size={16} color={t.c.fg} />}
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={!text.trim() || a.sending}
          onPress={submit}
          style={{ width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: t.c.primary, opacity: !text.trim() || a.sending ? 0.4 : 1 }}
        >
          <ArrowUp size={16} color={t.c.primaryFg} />
        </Pressable>
      </View>
    </>
  );
}

function VoiceStage() {
  const a = useAngel();
  const hint = a.mode === "listening" ? a.transcript || "Boliye… / Speak now" : a.mode === "thinking" ? a.transcript : "";
  return (
    <View style={{ alignItems: "center", paddingTop: 8 }}>
      <AngelOrb size={176} state={a.mode} levelRef={a.levelRef} />
      <Text size="sm" weight="medium" style={{ marginTop: 12 }} accessibilityLiveRegion="polite">
        {STATUS[a.mode]}
      </Text>
      <Text size="md" color={a.transcript ? "fg" : "muted"} center style={{ marginTop: 8, minHeight: 22, maxWidth: 320 }}>
        {hint}
      </Text>
      <Text size="2xs" color="muted" center style={{ marginTop: 12, maxWidth: 320 }}>
        Pause for a moment and it sends by itself. Say “Angel band karo” or tap the mic to stop.
      </Text>
    </View>
  );
}

function Chip({ children, onPress }: { children: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={(s) => ({ borderRadius: 20, borderWidth: 1, borderColor: s.pressed || (s as { hovered?: boolean }).hovered ? t.a("primary", 0.5) : t.c.border, backgroundColor: t.c.surface2, paddingHorizontal: 12, paddingVertical: 7 })}
    >
      <Text size="xs" numberOfLines={1}>
        {children}
      </Text>
    </Pressable>
  );
}

function Message({ m }: { m: AngelMessageDTO }) {
  const a = useAngel();
  const t = useTheme();
  const mine = m.role === "user";
  return (
    <View style={{ flexDirection: "row", gap: 10, justifyContent: mine ? "flex-end" : "flex-start" }}>
      {!mine ? (
        <View style={{ marginTop: 2 }}>
          <AngelOrb size={26} state="idle" halo={false} />
        </View>
      ) : null}
      <View style={{ maxWidth: "85%", minWidth: 0, alignItems: mine ? "flex-end" : "flex-start", flexShrink: 1 }}>
        <View style={mine ? { borderRadius: 16, borderBottomRightRadius: 5, backgroundColor: t.a("primary", 0.15), paddingHorizontal: 14, paddingVertical: 8 } : undefined}>
          <Text size="base" selectable style={{ lineHeight: 22 }}>
            {m.source === "voice" && mine ? "🎙 " : ""}
            {m.text}
          </Text>
        </View>
        {m.cards?.map((c, i) => (
          <CardView key={i} c={c} />
        ))}
        {m.action ? <ActionBar id={m.id} action={m.action} /> : null}
        <View style={{ flexDirection: mine ? "row-reverse" : "row", alignItems: "center", gap: 2, marginTop: 4 }}>
          <Text size="2xs" color="muted" style={{ opacity: 0.8, marginHorizontal: 2 }}>
            {timeAgo(m.createdAt)}
          </Text>
          {!mine && canSpeak(m.lang) ? (
            <Pressable accessibilityLabel="Read aloud" hitSlop={6} onPress={() => a.speakText(m.text, m.lang)} style={{ padding: 4 }}>
              <Volume2 size={14} color={t.c.muted} />
            </Pressable>
          ) : null}
          <Pressable accessibilityLabel="Delete message" hitSlop={6} onPress={() => void a.deleteMessage(m.id)} style={{ padding: 4 }}>
            <Trash2 size={14} color={t.c.muted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Boxed({ children, tone }: { children: ReactNode; tone?: "warning" | "primary" }) {
  const t = useTheme();
  return (
    <View
      style={{
        marginTop: 8,
        alignSelf: "stretch",
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
        borderColor: tone ? t.a(tone, tone === "warning" ? 0.4 : 0.3) : t.c.border,
        backgroundColor: tone ? t.a(tone, 0.1) : t.a("surface2", 0.6),
      }}
    >
      {children}
    </View>
  );
}

function CardView({ c }: { c: Card }) {
  const t = useTheme();
  const go = useGo();
  const tone = (x?: string) => (x === "pos" ? "success" : x === "neg" ? "danger" : "fg");
  if (c.type === "stats")
    return (
      <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8, alignSelf: "stretch" }}>
        {c.items.map((s) => (
          <View key={s.label} style={{ flexGrow: 1, flexBasis: "30%", minWidth: 90, borderRadius: 12, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.a("surface2", 0.6), paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text size="2xs" color="muted" numberOfLines={1}>
              {s.label}
            </Text>
            <Text size="sm" weight="semibold" tabular numberOfLines={1} color={tone(s.tone)} style={{ marginTop: 2 }}>
              {s.value}
            </Text>
          </View>
        ))}
      </View>
    );
  if (c.type === "bars")
    return (
      <Boxed>
        <View style={{ padding: 12, gap: 8 }}>
          {c.title ? (
            <Text size="xs" weight="medium" color="muted">
              {c.title}
            </Text>
          ) : null}
          {c.items.map((b) => (
            <View key={b.label}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text size="xs" numberOfLines={1} style={{ flex: 1 }}>
                  {b.label}
                </Text>
                <Text size="xs" color="muted" tabular>
                  {`${b.display} · ${b.value}%`}
                </Text>
              </View>
              <View style={{ marginTop: 4, height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: t.c.surface }}>
                <View style={{ height: "100%", borderRadius: 3, backgroundColor: t.c.primary, width: `${Math.max(2, Math.min(100, b.value))}%` }} />
              </View>
            </View>
          ))}
        </View>
      </Boxed>
    );
  if (c.type === "list")
    return (
      <Boxed>
        {c.title ? (
          <Text size="xs" weight="medium" color="muted" style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
            {c.title}
          </Text>
        ) : null}
        {c.items.map((it, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" weight="medium" numberOfLines={1}>
                {it.title}
              </Text>
              {it.subtitle ? (
                <Text size="2xs" color="muted" numberOfLines={1}>
                  {it.subtitle}
                </Text>
              ) : null}
            </View>
            {it.value ? (
              <Text size="sm" weight="semibold" tabular color={tone(it.tone)}>
                {it.value}
              </Text>
            ) : null}
          </View>
        ))}
      </Boxed>
    );
  if (c.type === "links")
    return (
      <Boxed>
        {c.title ? (
          <Text size="xs" weight="medium" color="muted" style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.c.border }}>
            {c.title}
          </Text>
        ) : null}
        {c.items
          .filter((it) => /^https?:\/\//.test(it.url))
          .map((it, i) => (
            <Pressable
              key={i}
              accessibilityRole="link"
              onPress={() => void Linking.openURL(it.url).catch(() => null)}
              style={(s) => ({ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border, backgroundColor: s.pressed || (s as { hovered?: boolean }).hovered ? t.c.surface2 : "transparent" })}
            >
              <ExternalLink size={14} color={t.c.muted} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" weight="medium" color="primary" numberOfLines={1}>
                  {it.title}
                </Text>
                {it.snippet ? (
                  <Text size="2xs" color="muted" numberOfLines={2}>
                    {it.snippet}
                  </Text>
                ) : null}
                {it.source ? (
                  <Text size="2xs" color="muted" style={{ opacity: 0.8 }}>
                    {it.source}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
      </Boxed>
    );
  if (c.type === "cta")
    return (
      <Boxed tone="primary">
        <View style={{ padding: 12 }}>
          <Text size="sm" weight="semibold">
            {c.title}
          </Text>
          {c.text ? (
            <Text size="xs" color="muted" style={{ marginTop: 2 }}>
              {c.text}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {c.actions
              .filter((x) => x.href.startsWith("/") && !x.href.startsWith("//"))
              .map((x) => (
                <Button key={x.href} size="sm" variant={x.primary ? "primary" : "secondary"} onPress={() => go(x.href)}>
                  {x.label}
                </Button>
              ))}
          </View>
        </View>
      </Boxed>
    );
  return <SecretCard title={c.title} value={c.value} note={c.note} />;
}

function SecretCard({ title, value, note }: { title: string; value: string; note: string }) {
  const t = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (Platform.OS === "web") await navigator.clipboard?.writeText(value);
      else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Clipboard = require("expo-clipboard") as { setStringAsync: (s: string) => Promise<unknown> };
        await Clipboard.setStringAsync(value);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <Boxed tone="warning">
      <View style={{ padding: 12 }}>
        <Text size="xs" weight="medium" color="warning">
          {title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
          <View style={{ flex: 1, borderRadius: 8, backgroundColor: t.c.surface, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text size="sm" selectable style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>
              {value}
            </Text>
          </View>
          <Pressable accessibilityLabel="Copy password" onPress={() => void copy()} style={{ borderRadius: 8, borderWidth: 1, borderColor: t.c.border, padding: 8 }}>
            {copied ? <Check size={16} color={t.c.success} /> : <Copy size={16} color={t.c.fg} />}
          </Pressable>
        </View>
        <Text size="2xs" color="muted" style={{ marginTop: 6 }}>
          {note}
        </Text>
      </View>
    </Boxed>
  );
}

function ActionBar({ id, action }: { id: string; action: NonNullable<AngelMessageDTO["action"]> }) {
  const a = useAngel();
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const run = async (d: "confirm" | "cancel" | "undo") => {
    setBusy(true);
    await a.decide(id, d);
    setBusy(false);
  };
  const label: Record<string, string> = { pending: "Waiting for your OK", running: "Working…", done: "Done", undoing: "Undoing…", cancelled: "Cancelled", undone: "Undone", failed: "Failed" };
  const tone = action.status === "done" ? "success" : action.status === "pending" ? "warning" : null;
  return (
    <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <View style={{ borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderColor: tone ? t.a(tone, 0.3) : t.c.border, backgroundColor: tone ? t.a(tone, 0.1) : t.c.surface2 }}>
        <Text size="2xs" weight="medium" color={tone ?? "muted"}>
          {label[action.status] ?? action.status}
        </Text>
      </View>
      {action.needsConfirm ? (
        <>
          <Button size="sm" loading={busy} onPress={() => void run("confirm")}>
            Yes, do it
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onPress={() => void run("cancel")}>
            Cancel
          </Button>
        </>
      ) : null}
      {action.canUndo ? (
        <Button size="sm" variant="ghost" icon={Undo2} loading={busy} onPress={() => void run("undo")}>
          Undo
        </Button>
      ) : null}
    </View>
  );
}

// ======================= history =======================
function HistoryView({ onOpen }: { onOpen: () => void }) {
  const a = useAngel();
  const t = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<ConversationDTO[] | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<ConversationDTO | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ items: ConversationDTO[] }>("/api/angel/conversations")
      .then((r) => alive && setItems(r.data.items))
      .catch((e) => {
        if (alive) setItems([]);
        toast.error("Could not load chats", (e as Error).message);
      });
    return () => {
      alive = false;
    };
  }, [a.historyVersion, toast]);

  const del = async (c: ConversationDTO) => {
    setBusy(true);
    try {
      await api(`/api/angel/conversations/${c.id}`, { method: "DELETE" });
      setItems((xs) => xs?.filter((x) => x.id !== c.id) ?? null);
      if (a.conversationId === c.id) a.newChat();
      setToDelete(null);
    } catch (e) {
      toast.error("Could not delete chat", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const delAll = async () => {
    setBusy(true);
    try {
      await api("/api/angel/conversations", { method: "DELETE" });
      setItems([]);
      a.newChat();
      setConfirmAll(false);
      toast.success("All Angel chats deleted");
    } catch (e) {
      toast.error("Could not delete chats", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 8 }}>
        <Text size="sm" weight="semibold">
          Your chats with Angel
        </Text>
        {items && items.length > 0 ? (
          <Text size="xs" color="danger" onPress={() => setConfirmAll(true)}>
            Delete all
          </Text>
        ) : null}
      </View>
      {items === null ? (
        <Text size="sm" color="muted" center style={{ paddingVertical: 32 }}>
          Loading…
        </Text>
      ) : items.length === 0 ? (
        <Text size="sm" color="muted" center style={{ paddingVertical: 32, paddingHorizontal: 8 }}>
          No chats yet. Everything you say to Angel is saved here as text.
        </Text>
      ) : (
        <View style={{ gap: 2 }}>
          {items.map((c) => (
            <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingRight: 4, backgroundColor: a.conversationId === c.id ? t.c.surface2 : "transparent" }}>
              <Pressable
                accessibilityRole="button"
                style={(s) => ({ flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: s.pressed || (s as { hovered?: boolean }).hovered ? t.c.surface2 : "transparent" })}
                onPress={async () => {
                  await a.openConversation(c.id);
                  onOpen();
                }}
              >
                <Text size="sm" weight="medium" numberOfLines={1}>
                  {c.title}
                </Text>
                <Text size="xs" color="muted" numberOfLines={1}>
                  {c.preview || "—"}
                </Text>
                <Text size="2xs" color="muted" style={{ marginTop: 2, opacity: 0.8 }}>
                  {`${timeAgo(c.lastMessageAt)} · ${c.messageCount} messages`}
                </Text>
              </Pressable>
              <IconButton icon={Trash2} label={`Delete chat ${c.title}`} tone="danger" onPress={() => setToDelete(c)} />
            </View>
          ))}
        </View>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) void del(toDelete);
        }}
        loading={busy}
        title="Delete this chat?"
        message="The conversation text is removed. Entries Angel added to your budget stay as they are."
      />
      <ConfirmDialog open={confirmAll} onClose={() => setConfirmAll(false)} onConfirm={delAll} loading={busy} title="Delete all Angel chats?" message="Every conversation with Angel is removed permanently. Your income, expenses and goals are not affected." confirmLabel="Delete all" />
    </ScrollView>
  );
}

// ======================= settings =======================
function SettingsView() {
  const a = useAngel();
  const s = a.settings;
  const web = Platform.OS === "web";
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 20 }} keyboardShouldPersistTaps="handled">
      <Row title="Wake word" desc={`Listen for “Angel active” (also “एंजल एक्टिव”, “એન્જલ ચાલુ”, “Hey Angel”) while Budget Pro is open on screen.${web ? " Your browser shows a mic indicator while it listens." : ""}`}>
        <Toggle label="Wake word" value={s.wake} disabled={!a.voiceSupported} onChange={(v) => a.updateSettings({ wake: v })} />
      </Row>
      <Row title="Voice language" desc="The language you speak in. Hindi also understands Hinglish and English words." stack>
        <Select<VoiceLang>
          title="Voice language"
          value={s.voiceLang}
          onChange={(v) => a.updateSettings({ voiceLang: v })}
          options={[
            { value: "hi-IN", label: "हिंदी / Hinglish" },
            { value: "en-IN", label: "English (India)" },
            { value: "gu-IN", label: "ગુજરાતી" },
          ]}
        />
      </Row>
      <Row title="Reply language" desc="Auto replies in the language you used." stack>
        <Select<string>
          title="Reply language"
          value={s.replyLang}
          onChange={(v) => a.updateSettings({ replyLang: v as typeof s.replyLang })}
          options={[
            { value: "auto", label: "Auto" },
            { value: "en", label: "English" },
            { value: "hi", label: "हिंदी" },
            { value: "gu", label: "ગુજરાતી" },
            { value: "hn", label: "Hinglish" },
          ]}
        />
      </Row>
      <Row title="Send after a pause of" desc="When you stop talking for this long, Angel sends what you said — no button needed." stack>
        <Select<string>
          title="Pause length"
          value={String(s.pauseMs)}
          onChange={(v) => a.updateSettings({ pauseMs: Number(v) })}
          options={[
            { value: "800", label: "0.8 s (fast)" },
            { value: "1200", label: "1.2 s" },
            { value: "1800", label: "1.8 s (relaxed)" },
          ]}
        />
      </Row>
      <Row title="Speak replies" desc="Angel answers out loud when you talk to her.">
        <Toggle label="Speak replies" value={s.speakReplies} onChange={(v) => a.updateSettings({ speakReplies: v })} />
      </Row>
      <VoicePicker />
      {!a.voiceSupported ? (
        <Notice tone="warning">{web ? "This browser has no speech recognition. Use Chrome, Edge or Safari for voice — typing works everywhere." : "Speech recognition isn't available on this device. Typing works everywhere."}</Notice>
      ) : null}
      <Text size="xs" color="muted" style={{ lineHeight: 18 }}>
        {web
          ? "Angel is Budget Pro's own assistant: questions about your money are answered on our server from your Budget Pro data — no outside AI service. General questions (news, prices, “google karo…”) are looked up on the web and shown with their sources. Turning speech into text is done by your browser's built-in voice engine (in Chrome this sends the audio to Google's speech service; with the wake word on, it listens while Budget Pro is open on screen). Settings here are saved on this device."
          : "Angel is Budget Pro's own assistant: questions about your money are answered on our server from your Budget Pro data — no outside AI service. General questions (news, prices, “google karo…”) are looked up on the web and shown with their sources. Turning speech into text is done by your phone's speech service (Google on Android, Apple on iPhone); with the wake word on, it listens only while Budget Pro is open on screen. Settings here are saved on this device."}
      </Text>
    </ScrollView>
  );
}

const SAMPLE: Record<string, string> = {
  en: "Hi, I'm Angel. You spent ₹12,450 this month — ₹1,200 less than last month.",
  hn: "Namaste, main Angel hoon. Is mahine aapne ₹12,450 kharch kiye — pichle mahine se ₹1,200 kam.",
  hi: "नमस्ते, मैं एंजल हूं। इस महीने आपने ₹12,450 खर्च किए — पिछले महीने से ₹1,200 कम।",
  gu: "નમસ્તે, હું એન્જલ છું. આ મહિને તમે ₹12,450 ખર્ચ્યા — ગયા મહિના કરતાં ₹1,200 ઓછા.",
};

/** Choose Angel's speaking voice per language (the most natural one is picked automatically). */
function VoicePicker() {
  const a = useAngel();
  type L = "en" | "hn" | "hi" | "gu";
  const [lang, setLang] = useState<L>(a.settings.voiceLang === "gu-IN" ? "gu" : a.settings.voiceLang === "en-IN" ? "en" : "hi");
  const [list, setList] = useState<ReturnType<typeof listVoices>>([]);
  useEffect(() => {
    let alive = true;
    const fill = () => alive && setList(listVoices(lang));
    void loadVoices().then(fill);
    const id = setTimeout(fill, 600); // some browsers load voices late
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [lang]);
  const value = a.settings.voices?.[lang] ?? "";
  return (
    <View>
      <Text size="sm" weight="medium">
        Angel&apos;s voice
      </Text>
      <Text size="xs" color="muted" style={{ marginTop: 2 }}>
        {Platform.OS === "web"
          ? "Angel picks the most natural voice on this device automatically. For the best voices use Microsoft Edge (“Natural” voices) or Chrome (Google voices)."
          : "Angel picks the most natural voice on this phone automatically. More voices: phone Settings → Text-to-speech / Spoken content → install “Enhanced” voices."}
      </Text>
      <View style={{ gap: 8, marginTop: 10 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Select<L>
            title="Language"
            style={{ flex: 1 }}
            value={lang}
            onChange={setLang}
            options={[
              { value: "hi", label: "हिंदी" },
              { value: "hn", label: "Hinglish" },
              { value: "en", label: "English" },
              { value: "gu", label: "ગુજરાતી" },
            ]}
          />
          <Button variant="secondary" icon={Play} onPress={() => void speak(SAMPLE[lang], lang)}>
            Test
          </Button>
        </View>
        <Select<string>
          title="Voice"
          value={value}
          onChange={(v) => a.updateSettings({ voices: { ...a.settings.voices, [lang]: v || undefined } })}
          options={[{ value: "", label: "Automatic (best available)" }, ...list.map((v) => ({ value: v.name, label: `${v.natural ? "★ " : ""}${v.label}` }))]}
        />
      </View>
      {list.length === 0 ? (
        <Text size="2xs" color="warning" style={{ marginTop: 6 }}>
          No voice for this language is installed on this device — replies will be shown as text.
        </Text>
      ) : null}
    </View>
  );
}

function Row({ title, desc, children, stack }: { title: string; desc: string; children: ReactNode; stack?: boolean }) {
  return (
    <View style={{ flexDirection: stack ? "column" : "row", alignItems: stack ? "stretch" : "flex-start", justifyContent: "space-between", gap: stack ? 8 : 16 }}>
      <View style={{ flex: stack ? undefined : 1 }}>
        <Text size="sm" weight="medium">
          {title}
        </Text>
        <Text size="xs" color="muted" style={{ marginTop: 2 }}>
          {desc}
        </Text>
      </View>
      <View style={{ flexShrink: 0 }}>{children}</View>
    </View>
  );
}
