// Angel AI — controller: open/close, voice session (wake word → listen → think → speak → listen again),
// chat state and history actions. Same behaviour on web, Android and iOS (voice layer: voice.ts / voice.web.ts).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { AppState, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiClientError } from "@/lib/api";
import { kv } from "@/lib/storage";
import { afterWake, isNameOnly, isSleepPhrase, isWakePhrase, startsWithName, stripWake } from "@/shared/angel/wake";
import { forSpeech } from "@/shared/angel/i18n";
import type { AngelLangPref, AngelMessageDTO, AngelQuotaDTO, ActionView, Card } from "@/shared/angel/types";
import { Text, useBreakpoint, useTheme, useToast } from "@/ui";
import { useSessionOptional } from "../session";
import { AngelOrb, type OrbState } from "./orb";
import { AngelPanel } from "./angel-panel";
import { captureUtterance, chime, listen, setPreferredVoice, speak, speechRecognitionSupported, startMicMeter, type Heard, type MicMeter } from "./voice";

export type VoiceLang = "hi-IN" | "en-IN" | "gu-IN";
export interface AngelSettings {
  wake: boolean;
  voiceLang: VoiceLang;
  replyLang: AngelLangPref;
  speakReplies: boolean;
  /** how long Angel waits after you stop talking before sending (ms) */
  pauseMs: number;
  /** chosen speaking voice per reply language; empty = Angel picks the most natural one */
  voices: Partial<Record<"en" | "hi" | "gu" | "hn", string>>;
}
const DEFAULTS: AngelSettings = { wake: false, voiceLang: "hi-IN", replyLang: "auto", speakReplies: true, pauseMs: 1200, voices: {} };
const KEY = "angel-settings-v1";

interface AngelCtx {
  eligible: boolean;
  guest: boolean;
  firstName: string;
  quota: AngelQuotaDTO | null;
  refreshQuota: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  mode: OrbState;
  levelRef: MutableRefObject<number>;
  transcript: string;
  voiceSession: boolean;
  voiceSupported: boolean;
  messages: AngelMessageDTO[];
  conversationId: string | null;
  sending: boolean;
  settings: AngelSettings;
  updateSettings: (patch: Partial<AngelSettings>) => void;
  send: (text: string, source?: "voice" | "text", alts?: string[]) => Promise<void>;
  activate: () => void;
  endVoice: () => void;
  decide: (messageId: string, decision: "confirm" | "cancel" | "undo") => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  newChat: () => void;
  deleteMessage: (id: string) => Promise<void>;
  speakText: (text: string, lang: string) => void;
  historyVersion: number;
  bumpHistory: () => void;
}

const Ctx = createContext<AngelCtx | null>(null);
export const useAngel = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAngel must be used inside AngelProvider");
  return c;
};
/** Safe variant for components that may render outside the provider. */
export const useAngelOptional = () => useContext(Ctx);

const GREETING: Record<string, string> = { "hi-IN": "जी, बोलिए", "en-IN": "Yes, I'm listening", "gu-IN": "હા, બોલો" };
const BYE: Record<string, string> = { "hi-IN": "ठीक है, बाय", "en-IN": "Okay, bye", "gu-IN": "બરાબર, આવજો" };
const ttsLang = (v: VoiceLang) => (v === "hi-IN" ? "hi" : v === "gu-IN" ? "gu" : "en");

// ---------- guest chat (kept for this browser tab / app session only) ----------
const GUEST_KEY = "angel-guest-chat-v1";
let guestMemory: AngelMessageDTO[] = [];
function loadGuestChat(): AngelMessageDTO[] {
  if (Platform.OS === "web") {
    try {
      const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(GUEST_KEY) : null;
      return raw ? (JSON.parse(raw) as AngelMessageDTO[]) : [];
    } catch {
      return [];
    }
  }
  return guestMemory;
}
function saveGuestChat(ms: AngelMessageDTO[]) {
  const keep = ms.filter((m) => !m.id.startsWith("tmp-")).slice(-40);
  if (Platform.OS === "web") {
    try {
      if (typeof window !== "undefined") window.sessionStorage.setItem(GUEST_KEY, JSON.stringify(keep));
    } catch {
      /* storage blocked */
    }
  } else guestMemory = keep;
}

/** Visible = tab visible (web) / app in the foreground (native). Calls back on every change. */
function onVisibility(fn: (visible: boolean) => void): () => void {
  if (Platform.OS === "web") {
    if (typeof document === "undefined") return () => {};
    const h = () => fn(!document.hidden);
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }
  const sub = AppState.addEventListener("change", (s) => fn(s === "active"));
  return () => sub.remove();
}
function isVisible(): boolean {
  if (Platform.OS === "web") return typeof document === "undefined" ? false : !document.hidden;
  return AppState.currentState === "active";
}

export function AngelProvider({ children, guest = false }: { children?: ReactNode; guest?: boolean }) {
  const session = useSessionOptional();
  const user = session?.user ?? null;
  const toast = useToast();
  const eligible = guest || !!user;
  const firstName = user ? user.name.split(" ")[0] : "";
  const [quota, setQuota] = useState<AngelQuotaDTO | null>(null);

  const [open, setOpenState] = useState(false);
  const [mode, setMode] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [voiceSession, setVoiceSession] = useState(false);
  const [messages, setMessages] = useState<AngelMessageDTO[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<AngelSettings>(DEFAULTS);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const levelRef = useRef(0);
  const meterRef = useRef<MicMeter | null>(null);
  const noMeter = useRef(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const wakeRef = useRef<{ stop: () => void } | null>(null);
  const ttsRef = useRef<{ stop: () => void } | null>(null);
  const sessionRef = useRef(false);
  const silenceCount = useRef(0);
  const genRef = useRef(0); // bumps on every new listen; stale async work checks it and bails out
  const sendingRef = useRef(false);
  const convRef = useRef<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  convRef.current = conversationId;

  useEffect(() => {
    let alive = true;
    void kv.getJSON<AngelSettings>(KEY, DEFAULTS).then((st) => {
      if (!alive) return;
      setSettings(st);
      for (const [l, n] of Object.entries(st.voices ?? {})) setPreferredVoice(l, n || null);
    });
    setVoiceSupported(speechRecognitionSupported());
    if (guest) setMessages(loadGuestChat());
    return () => {
      alive = false;
    };
  }, [guest]);

  // guests: keep the chat for this tab / app session
  useEffect(() => {
    if (guest) saveGuestChat(messages);
  }, [guest, messages]);

  const refreshQuota = useCallback(() => {
    void api<{ quota: AngelQuotaDTO }>(guest ? "/api/angel/guest" : "/api/angel/quota")
      .then((r) => setQuota(r.data.quota))
      .catch(() => null);
  }, [guest]);

  const updateSettings = useCallback((patch: Partial<AngelSettings>) => {
    if (patch.voices) for (const [l, n] of Object.entries(patch.voices)) setPreferredVoice(l, n || null);
    setSettings((s) => {
      const next = { ...s, ...patch };
      void kv.setJSON(KEY, next);
      return next;
    });
  }, []);

  const setOpen = useCallback(
    (v: boolean) => {
      setOpenState(v);
      if (v) refreshQuota();
    },
    [refreshQuota],
  );

  // ---------- level animation loop (mic while listening, synthetic while speaking) ----------
  const modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => {
    if (!eligible) return;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const m = modeRef.current;
      if (m === "listening" && meterRef.current) levelRef.current = meterRef.current.level();
      else if (m === "speaking") levelRef.current = Math.max(0.15, levelRef.current * 0.92) + Math.abs(Math.sin(Date.now() / 160)) * 0.08;
      else levelRef.current *= 0.9;
      // idle: no need for 60 fps
      if (m === "idle" || m === "wake" || m === "off") timer = setTimeout(() => (raf = requestAnimationFrame(tick)), 120);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [eligible]);

  const stopMeter = () => {
    meterRef.current?.stop();
    meterRef.current = null;
  };
  const stopRec = () => {
    recRef.current?.stop();
    recRef.current = null;
  };
  const stopTts = () => {
    ttsRef.current?.stop();
    ttsRef.current = null;
  };

  // ---------- voice session ----------
  const endVoice = useCallback((sayBye = false) => {
    const wasActive = sessionRef.current;
    sessionRef.current = false;
    genRef.current++;
    setVoiceSession(false);
    stopRec();
    stopMeter();
    stopTts();
    setTranscript("");
    setMode("idle");
    if (wasActive) chime("off");
    if (sayBye && settingsRef.current.speakReplies) {
      const v = settingsRef.current.voiceLang;
      speak(BYE[v], ttsLang(v));
    }
  }, []);

  const speakThen = useCallback(async (text: string, lang: string) => {
    if (!settingsRef.current.speakReplies || !text) return;
    setMode("speaking");
    const s = speak(text, lang, () => (levelRef.current = 0.85));
    ttsRef.current = s;
    await s.done;
    ttsRef.current = null;
    // short gap so the end of Angel's own voice (from the speakers) is not picked up as your next question
    await new Promise((r) => setTimeout(r, 450));
  }, []);

  const handleFinalRef = useRef<(t: string, alts: string[]) => void>(() => {});

  const startCommandListening = useCallback(async () => {
    if (!sessionRef.current) return;
    const gen = ++genRef.current;
    stopRec();
    setTranscript("");
    setMode("listening");
    if (!noMeter.current && !meterRef.current) {
      void startMicMeter().then((meter) => {
        if (gen !== genRef.current || !sessionRef.current || meterRef.current) meter?.stop(); // never leak a mic stream
        else meterRef.current = meter;
      });
    }
    // our own pause detection: you talk, stop for ~1.2 s, and it is sent automatically
    recRef.current = captureUtterance({
      lang: settingsRef.current.voiceLang,
      silenceMs: settingsRef.current.pauseMs || 1200,
      onInterim: (text) => {
        setTranscript(text);
        if (!meterRef.current) levelRef.current = Math.min(1, 0.4 + Math.random() * 0.5);
      },
      onDone: (text, alts) => {
        if (gen !== genRef.current || !sessionRef.current) return;
        silenceCount.current = 0;
        handleFinalRef.current(text, alts);
      },
      onNoSpeech: () => {
        if (gen !== genRef.current || !sessionRef.current) return;
        silenceCount.current += 1;
        if (silenceCount.current >= 2) endVoice();
        else void startCommandListening();
      },
      onError: (code) => {
        if (code === "not-allowed" || code === "service-not-allowed") {
          toast.error("Microphone blocked", Platform.OS === "web" ? "Allow microphone access for this site to talk to Angel." : "Allow microphone and speech recognition for Budget Pro in your phone's settings.");
          endVoice();
        } else if (code === "audio-capture" && meterRef.current && Platform.OS === "web") {
          // some phones can't share the mic between the meter and recognition → drop the meter and retry
          noMeter.current = true;
          stopMeter();
          void startCommandListening();
        } else if (code === "language-not-supported") {
          toast.error("Voice language not supported", "Choose another voice language in Angel settings.");
          endVoice();
        } else if (code === "not-supported") {
          endVoice();
        }
      },
    });
  }, [endVoice, toast]);

  // ---------- sending ----------
  const applyUpdated = (u: { id: string; action: ActionView | null } | null | undefined) => {
    if (!u) return;
    setMessages((ms) => ms.map((m) => (m.id === u.id ? { ...m, action: u.action } : m)));
  };

  const send = useCallback(
    async (raw: string, source: "voice" | "text" = "text", alts: string[] = []) => {
      const text = raw.trim();
      if (!text || sendingRef.current) return; // one message at a time per chat
      sendingRef.current = true;
      stopTts();
      setSending(true);
      setMode("thinking");
      const tempId = `tmp-${Date.now()}`;
      setMessages((ms) => [...ms, { id: tempId, role: "user", text, lang: "en", source, createdAt: new Date().toISOString() }]);
      try {
        let speakTextOut = "";
        let speakLang = "en";
        if (guest) {
          const { data } = await api<{ text: string; speak: string; lang: string; cards: Card[]; suggestions: string[]; quota: AngelQuotaDTO }>("/api/angel/guest", {
            method: "POST",
            body: { message: text, source, lang: settingsRef.current.replyLang, ...(alts.length ? { alts: alts.slice(0, 4) } : {}) },
            timeout: 60_000,
          });
          const now = new Date().toISOString();
          setMessages((ms) => [
            ...ms.map((m) => (m.id === tempId ? { ...m, id: `u-${Date.now()}` } : m)),
            { id: `a-${Date.now()}`, role: "angel", text: data.text, lang: data.lang as AngelMessageDTO["lang"], source: "system", cards: data.cards?.length ? data.cards : undefined, suggestions: data.suggestions?.length ? data.suggestions : undefined, createdAt: now },
          ]);
          setQuota(data.quota);
          speakTextOut = data.speak;
          speakLang = data.lang;
        } else {
          const { data } = await api<{ conversation: { id: string }; messages: AngelMessageDTO[]; updated: { id: string; action: ActionView | null } | null; speak: string; lang: string; quota?: AngelQuotaDTO }>("/api/angel/chat", {
            method: "POST",
            body: { message: text, conversationId: convRef.current, source, lang: settingsRef.current.replyLang, ...(alts.length ? { alts: alts.slice(0, 4) } : {}) },
            timeout: 60_000,
          });
          setConversationId(data.conversation.id);
          convRef.current = data.conversation.id;
          setMessages((ms) => [...ms.filter((m) => m.id !== tempId), ...data.messages]);
          applyUpdated(data.updated);
          setHistoryVersion((v) => v + 1);
          if (data.quota) setQuota(data.quota);
          speakTextOut = data.speak;
          speakLang = data.lang;
        }
        sendingRef.current = false;
        setSending(false);
        if (sessionRef.current) {
          await speakThen(speakTextOut, speakLang);
          if (sessionRef.current) void startCommandListening();
          else setMode("idle");
        } else setMode("idle");
      } catch (err) {
        sendingRef.current = false;
        setSending(false);
        const e = err as ApiClientError;
        const limited = e.status === 429 && e.errors?.quota === "angel";
        const cards: Card[] | undefined = limited
          ? [
              guest
                ? { type: "cta", title: "Get more Angel", text: "A free account gives you more credits and answers from your own budget.", actions: [{ label: "Create free account", href: "/register", primary: true }, { label: "Sign in", href: "/login" }] }
                : { type: "cta", title: "Need more Angel?", text: "Plus, Pro and Unlimited give you more credits — Unlimited has no limit at all.", actions: [{ label: "See plans", href: "/plan", primary: true }] },
            ]
          : undefined;
        if (limited) {
          setQuota((q) => (q ? { ...q, remaining: 0, used: q.limit ?? q.used, resetAt: e.errors?.resetAt || q.resetAt } : q));
          refreshQuota();
        }
        setMessages((ms) => [
          ...ms.filter((m) => !(limited && m.id === tempId)),
          { id: `err-${Date.now()}`, role: "angel", text: e.message || "Something went wrong. Please try again.", lang: "en", source: "system", cards, createdAt: new Date().toISOString() },
        ]);
        setMode("idle");
        if (sessionRef.current) endVoice();
      }
    },
    [speakThen, startCommandListening, endVoice, guest, refreshQuota],
  );

  handleFinalRef.current = (t: string, alts: string[]) => {
    stopRec();
    stopMeter();
    if (isSleepPhrase(t)) {
      endVoice(true);
      return;
    }
    const clean = (x: string) => (isWakePhrase(x) ? afterWake(x) || stripWake(x) : x).trim();
    const cmd = clean(t);
    if (!cmd || isNameOnly(t)) {
      void startCommandListening();
      return;
    }
    void send(cmd, "voice", alts.map(clean).filter((a) => a && a !== cmd));
  };

  const activate = useCallback(
    async (initial?: string) => {
      if (!eligible) return;
      setOpen(true);
      if (sessionRef.current) return; // already talking — never start a second recogniser
      if (!speechRecognitionSupported()) {
        toast.info("Voice not supported here", Platform.OS === "web" ? "Use Chrome, Edge or Safari for voice. You can still type to Angel." : "Speech recognition isn't available on this device. You can still type to Angel.");
        return;
      }
      wakeRef.current?.stop();
      wakeRef.current = null;
      sessionRef.current = true;
      silenceCount.current = 0;
      setVoiceSession(true);
      chime("on");
      if (initial && initial.trim()) {
        void send(initial, "voice");
        return;
      }
      const v = settingsRef.current.voiceLang;
      await speakThen(GREETING[v], ttsLang(v));
      void startCommandListening();
    },
    [eligible, setOpen, toast, send, speakThen, startCommandListening],
  );

  // ---------- wake word ("Angel active") ----------
  useEffect(() => {
    if (!eligible || !settings.wake || voiceSession || !voiceSupported) {
      wakeRef.current?.stop();
      wakeRef.current = null;
      if (!voiceSession && mode === "wake") setMode("idle");
      return;
    }
    let cancelled = false;
    let backoff = 300;
    let hardErrors = 0;
    let restart: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (cancelled || !isVisible() || sessionRef.current) return;
      setMode((m) => (m === "idle" ? "wake" : m));
      wakeRef.current = listen({
        lang: settingsRef.current.voiceLang,
        continuous: true,
        onText: (h: Heard) => {
          backoff = 300;
          hardErrors = 0;
          const tail = (x: string) => x.split(" ").slice(-10).join(" ");
          const candidates = [h.text, tail(h.full), ...h.alts.map(tail)];
          const hit = candidates.find((c) => isWakePhrase(c) || (h.isFinal && (isNameOnly(c) || startsWithName(c))));
          if (!hit) return;
          wakeRef.current?.stop();
          wakeRef.current = null;
          const rest = h.isFinal ? afterWake(hit) : "";
          void activate(rest.split(" ").length >= 2 ? rest : undefined);
        },
        onError: (code) => {
          if (code === "not-allowed" || code === "service-not-allowed") {
            cancelled = true;
            updateSettings({ wake: false });
            toast.error("Microphone blocked", "“Angel active” needs microphone permission.");
          } else if (code !== "no-speech" && code !== "aborted") {
            backoff = Math.min(15000, backoff * 2);
            hardErrors += 1;
            if (hardErrors >= 6) {
              cancelled = true;
              updateSettings({ wake: false });
              toast.warning("Wake word paused", "“Angel active” stopped after repeated microphone errors. You can turn it on again in Angel settings.");
            }
          }
        },
        onEnd: () => {
          wakeRef.current = null;
          if (!cancelled) restart = setTimeout(start, backoff);
        },
      });
    };
    const off = onVisibility((visible) => {
      if (!visible) {
        clearTimeout(restart);
        wakeRef.current?.stop();
        wakeRef.current = null;
      } else if (!wakeRef.current) start();
    });
    start();
    return () => {
      cancelled = true;
      clearTimeout(restart);
      off();
      wakeRef.current?.stop();
      wakeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, settings.wake, voiceSession, voiceSupported]);

  // stop the voice session when the app goes to the background
  useEffect(() => onVisibility((visible) => !visible && sessionRef.current && endVoice()), [endVoice]);
  // stop everything on unmount
  useEffect(() => () => endVoice(), [endVoice]);

  // ---------- history & actions ----------
  const decide = useCallback(
    async (messageId: string, decision: "confirm" | "cancel" | "undo") => {
      if (guest) return;
      try {
        const { data } = await api<{ updated: { id: string; action: ActionView | null }; message: AngelMessageDTO; speak: string; lang: string }>(`/api/angel/messages/${messageId}/action`, { method: "POST", body: { decision } });
        applyUpdated(data.updated);
        setMessages((ms) => [...ms, data.message]);
        if (sessionRef.current) {
          await speakThen(data.speak, data.lang);
          if (sessionRef.current) void startCommandListening();
          else setMode("idle");
        }
      } catch (err) {
        toast.error("Angel", (err as Error).message);
      }
    },
    [speakThen, startCommandListening, toast, guest],
  );

  const openConversation = useCallback(
    async (id: string) => {
      try {
        const { data } = await api<{ messages: AngelMessageDTO[] }>(`/api/angel/conversations/${id}`);
        setConversationId(id);
        setMessages(data.messages);
      } catch (err) {
        toast.error("Could not open chat", (err as Error).message);
      }
    },
    [toast],
  );

  const newChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, []);

  const deleteMessage = useCallback(
    async (id: string) => {
      if (guest || id.startsWith("tmp-") || id.startsWith("err-")) {
        setMessages((ms) => ms.filter((m) => m.id !== id));
        return;
      }
      try {
        const { data } = await api<{ conversationDeleted: boolean }>(`/api/angel/messages/${id}`, { method: "DELETE" });
        setMessages((ms) => ms.filter((m) => m.id !== id));
        if (data.conversationDeleted) setConversationId(null);
        setHistoryVersion((v) => v + 1);
      } catch (err) {
        toast.error("Could not delete", (err as Error).message);
      }
    },
    [toast, guest],
  );

  const speakText = useCallback((text: string, lang: string) => {
    stopTts();
    setMode("speaking");
    const s = speak(forSpeech(text), lang, () => (levelRef.current = 0.85));
    ttsRef.current = s;
    void s.done.then(() => {
      if (!sessionRef.current) setMode("idle");
    });
  }, []);

  const value = useMemo<AngelCtx>(
    () => ({
      eligible,
      guest,
      firstName,
      quota,
      refreshQuota,
      open,
      setOpen,
      mode,
      levelRef,
      transcript,
      voiceSession,
      voiceSupported,
      messages,
      conversationId,
      sending,
      settings,
      updateSettings,
      send,
      activate: () => void activate(),
      endVoice: () => endVoice(),
      decide,
      openConversation,
      newChat,
      deleteMessage,
      speakText,
      historyVersion,
      bumpHistory: () => setHistoryVersion((v) => v + 1),
    }),
    [eligible, guest, firstName, quota, refreshQuota, open, setOpen, mode, transcript, voiceSession, voiceSupported, messages, conversationId, sending, settings, updateSettings, send, activate, endVoice, decide, openConversation, newChat, deleteMessage, speakText, historyVersion],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {eligible ? (
        <>
          {!open ? <AngelLauncher /> : null}
          {open ? <AngelPanel /> : null}
        </>
      ) : null}
    </Ctx.Provider>
  );
}

/** Floating live orb — tap to open Angel. Shows a small dot when it is listening for “Angel active”. */
function AngelLauncher() {
  const { setOpen, mode, levelRef, settings, guest } = useAngel();
  const t = useTheme();
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const bottom = guest ? 20 + insets.bottom : bp.compact ? 84 + insets.bottom : 24;
  return (
    <View pointerEvents="box-none" style={{ position: (Platform.OS === "web" ? "fixed" : "absolute") as "absolute", right: bp.lg ? 24 : 16, bottom, zIndex: 44, flexDirection: "row", alignItems: "center", gap: 10 }}>
      {guest && bp.sm ? (
        <View pointerEvents="none" style={{ borderRadius: 20, borderWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface, paddingHorizontal: 12, paddingVertical: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
          <Text size="xs" weight="medium">
            Ask Angel AI ✨
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Angel AI assistant"
        onPress={() => setOpen(true)}
        style={(s) => ({
          width: 58,
          height: 58,
          borderRadius: 29,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          boxShadow: `0 8px 30px -6px ${t.a("primary", 0.55)}`,
          transform: [{ scale: s.pressed ? 0.95 : (s as { hovered?: boolean }).hovered ? 1.05 : 1 }],
        })}
      >
        <AngelOrb size={56} state={mode === "wake" ? "wake" : "idle"} levelRef={levelRef} halo label={settings.wake ? "Angel — say “Angel active”" : "Angel AI"} />
        {mode === "wake" ? <View style={{ position: "absolute", right: 2, top: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: t.c.success, borderWidth: 2, borderColor: t.c.bg }} /> : null}
      </Pressable>
    </View>
  );
}
