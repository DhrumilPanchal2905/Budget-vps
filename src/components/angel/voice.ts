// Angel AI — NATIVE voice layer (Android / iOS). Same API as voice.web.ts:
//   speech-to-text → expo-speech-recognition (Google / Apple on-device speech services)
//   text-to-speech → expo-speech (system voices, ranked so the most natural one is used)
// The native modules are loaded defensively: a build without them simply reports "voice not supported".

/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: Metro only bundles require() calls with a string LITERAL — require(variable) fails the build.
function load(get: () => any): any | null {
  try {
    return get();
  } catch {
    return null;
  }
}
/* eslint-disable @typescript-eslint/no-require-imports */
const SR = load(() => require("expo-speech-recognition"));
const Rec: any = SR?.ExpoSpeechRecognitionModule ?? null;
const Speech: any = load(() => require("expo-speech"));
const Haptics: any = load(() => require("expo-haptics"));
/* eslint-enable @typescript-eslint/no-require-imports */

export function speechRecognitionSupported(): boolean {
  if (!Rec) return false;
  try {
    return typeof Rec.isRecognitionAvailable === "function" ? Boolean(Rec.isRecognitionAvailable()) : true;
  } catch {
    return false;
  }
}

export function ttsSupported(): boolean {
  return Boolean(Speech?.speak);
}

export interface Heard {
  text: string;
  full: string;
  alts: string[];
  isFinal: boolean;
}

export interface ListenOptions {
  lang: string;
  continuous: boolean;
  onText: (h: Heard) => void;
  onEnd?: () => void;
  onError?: (code: string) => void;
  onSound?: () => void;
}

// ---------- permission ----------
let permission: boolean | null = null;
export async function ensureMicPermission(): Promise<boolean> {
  if (!Rec) return false;
  if (permission === true) return true;
  try {
    const r = await Rec.requestPermissionsAsync();
    permission = Boolean(r?.granted);
  } catch {
    permission = false;
  }
  return permission;
}

// ---------- live loudness (for the orb) ----------
let lastVolume = 0;

/** Merge recognised parts (engines often repeat earlier words in each new result). */
function join(parts: string[]): string {
  let acc = "";
  for (const raw of parts) {
    const r = raw.replace(/\s+/g, " ").trim();
    if (!r) continue;
    const a = acc.toLowerCase();
    const b = r.toLowerCase();
    if (!acc || b.startsWith(a)) acc = r;
    else if (!a.endsWith(b)) acc = `${acc} ${r}`;
  }
  return acc;
}

let activeStop: (() => void) | null = null;

/** One recognition session. stop() ends it; onEnd fires when the engine closes it by itself. */
export function listen(opts: ListenOptions): { stop: () => void } {
  if (!Rec) {
    setTimeout(() => opts.onError?.("not-supported"), 0);
    return { stop: () => {} };
  }
  // only one recogniser can run on a device — end the previous one first
  activeStop?.();
  let stopped = false;
  const subs: { remove: () => void }[] = [];
  const finals: string[] = []; // best guess of each finished segment
  const finalAlts: string[][] = []; // alternatives per finished segment
  const cleanup = () => {
    for (const s of subs.splice(0)) {
      try {
        s.remove();
      } catch {
        /* ignore */
      }
    }
    if (activeStop === stop) activeStop = null;
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cleanup();
    try {
      Rec.abort();
    } catch {
      /* not running */
    }
  };
  activeStop = stop;

  const add = (ev: string, fn: (e: any) => void) => {
    try {
      subs.push(Rec.addListener(ev, fn));
    } catch {
      /* event not supported on this platform */
    }
  };

  add("result", (e: any) => {
    if (stopped) return;
    const results: { transcript?: string }[] = Array.isArray(e?.results) ? e.results : [];
    const best = String(results[0]?.transcript ?? "");
    const alts = results.slice(1, 5).map((r) => String(r?.transcript ?? "")).filter(Boolean);
    const isFinal = Boolean(e?.isFinal);
    const text = best;
    const full = join([...finals, best]);
    const altFull: string[] = [];
    for (let k = 0; k < 4; k++) {
      const alt = join([...finals.map((f, i) => finalAlts[i]?.[k] ?? f), alts[k] ?? ""]);
      if (alts[k] && alt && alt !== full && !altFull.includes(alt)) altFull.push(alt);
    }
    if (isFinal && best) {
      finals.push(best);
      finalAlts.push(alts);
    }
    if (text || full) opts.onText({ text, full, alts: altFull, isFinal });
  });
  add("speechstart", () => opts.onSound?.());
  add("volumechange", (e: any) => {
    const v = Number(e?.value ?? -2);
    lastVolume = Math.max(0, Math.min(1, (v + 2) / 12));
    if (v > 1) opts.onSound?.();
  });
  add("error", (e: any) => {
    if (stopped) return;
    const code = String(e?.error ?? "unknown");
    opts.onError?.(code === "no-match" || code === "nomatch" ? "no-speech" : code);
  });
  add("end", () => {
    lastVolume = 0;
    if (stopped) return;
    stopped = true;
    cleanup();
    opts.onEnd?.();
  });

  void (async () => {
    const ok = await ensureMicPermission();
    if (stopped) return;
    if (!ok) {
      opts.onError?.("not-allowed");
      stop();
      return;
    }
    try {
      Rec.start({
        lang: opts.lang,
        interimResults: true,
        continuous: opts.continuous,
        maxAlternatives: 5,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      });
    } catch {
      opts.onError?.("audio-capture");
      stop();
    }
  })();

  return { stop };
}

/** Words that mean "I'm not done yet" in English / Hindi / Gujarati. */
const CONTINUES = new Set(["ka", "ki", "ke", "ko", "se", "me", "mein", "main", "aur", "ya", "par", "pe", "to", "and", "or", "of", "for", "the", "a", "in", "on", "with", "my", "nu", "ni", "ma", "ane", "का", "की", "के", "को", "से", "में", "और", "या", "पर", "पे", "तो", "नु", "નું", "ના", "ની", "નો", "માં", "અને", "કે", "થી", "પર"]);

export interface CaptureOptions {
  lang: string;
  silenceMs: number;
  onInterim: (text: string) => void;
  onDone: (text: string, alts: string[]) => void;
  onNoSpeech: () => void;
  onError?: (code: string) => void;
  onSound?: () => void;
}

/** Listens for ONE sentence and sends it automatically when you pause (same timing rules as the web). */
export function captureUtterance(o: CaptureOptions): { stop: () => void; finish: () => void } {
  let text = "";
  let alts: string[] = [];
  let finished = false;
  let pauseTimer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    clearTimeout(pauseTimer);
    clearTimeout(noSpeechTimer);
    clearTimeout(maxTimer);
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    clear();
    handle.stop();
    if (text.trim()) o.onDone(text.trim(), alts);
    else o.onNoSpeech();
  };
  const noSpeechTimer = setTimeout(() => !text && finish(), 8000);
  const maxTimer = setTimeout(finish, 25000);
  const handle = listen({
    lang: o.lang,
    continuous: true,
    onText: (h) => {
      if (finished) return;
      text = h.full;
      alts = h.alts;
      o.onInterim(text);
      clearTimeout(pauseTimer);
      const lastWord = (text.trim().split(/\s+/).pop() ?? "").toLowerCase();
      const wait = CONTINUES.has(lastWord) ? Math.max(o.silenceMs, 2400) : h.isFinal ? Math.max(500, o.silenceMs - 500) : o.silenceMs;
      pauseTimer = setTimeout(finish, wait);
    },
    onSound: o.onSound,
    onError: (code) => {
      if (code === "no-speech" || code === "aborted") return;
      o.onError?.(code);
    },
    onEnd: finish,
  });
  return {
    stop: () => {
      finished = true;
      clear();
      handle.stop();
    },
    finish,
  };
}

// ---------------- microphone level ----------------
export interface MicMeter {
  level: () => number;
  stop: () => void;
}

/** The recogniser reports loudness itself ("volumechange"), so no second microphone stream is opened. */
export async function startMicMeter(): Promise<MicMeter | null> {
  if (!Rec) return null;
  let smooth = 0;
  return {
    level: () => {
      smooth = smooth * 0.7 + lastVolume * 0.3;
      return smooth;
    },
    stop: () => {
      smooth = 0;
    },
  };
}

// ---------------- text-to-speech ----------------
interface NativeVoice {
  identifier: string;
  name: string;
  quality?: string;
  language: string;
}

const VOICE_LANG: Record<string, string[]> = {
  en: ["en-IN", "en-GB", "en-US", "en"],
  hn: ["en-IN", "hi-IN", "en"],
  hi: ["hi-IN", "hi"],
  gu: ["gu-IN", "gu"],
};
const FEMALE = /(swara|neerja|dhwani|kalpana|heera|lekha|veena|aditi|raveena|priya|kajal|ananya|aarohi|samantha|karen|moira|tessa|female|woman|#female)/i;
const NATURAL = /(natural|neural|enhanced|premium|wavenet|studio|network)/i;
const ROBOTIC = /(espeak|compact|pico)/i;

let voicesCache: NativeVoice[] = [];
let voicesPromise: Promise<void> | null = null;

export function loadVoices(): Promise<void> {
  if (!Speech?.getAvailableVoicesAsync) return Promise.resolve();
  voicesPromise ??= Speech.getAvailableVoicesAsync()
    .then((v: NativeVoice[]) => {
      voicesCache = Array.isArray(v) ? v : [];
    })
    .catch(() => {
      voicesPromise = null;
    });
  return voicesPromise!;
}
void loadVoices();

const norm = (l: string) => (l || "").toLowerCase().replace("_", "-");
const isNatural = (v: NativeVoice) => v.quality === "Enhanced" || NATURAL.test(v.name) || NATURAL.test(v.identifier);

function voiceScore(v: NativeVoice, lang: string): number {
  const codes = VOICE_LANG[lang] ?? ["en-IN"];
  const vl = norm(v.language);
  let score = -1;
  codes.forEach((c, i) => {
    const cl = c.toLowerCase();
    if (vl === cl) score = Math.max(score, 100 - i * 12);
    else if (vl.startsWith(cl) || (cl.length === 2 && vl.startsWith(`${cl}-`))) score = Math.max(score, 80 - i * 12);
  });
  if (score < 0) return -1;
  if (isNatural(v)) score += 45;
  if (/google/i.test(v.name)) score += 20;
  if (FEMALE.test(v.name) || FEMALE.test(v.identifier)) score += 12;
  if (ROBOTIC.test(v.name)) score -= 60;
  if (/notInstalled|not-installed/i.test(v.identifier)) score -= 80;
  return score;
}

export function listVoices(lang: string): { name: string; label: string; natural: boolean }[] {
  return voicesCache
    .map((v) => ({ v, s: voiceScore(v, lang) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map(({ v }) => ({ name: v.identifier, label: `${v.name} (${v.language})`, natural: isNatural(v) }));
}

export function pickVoice(lang: string, preferred?: string | null): NativeVoice | null {
  if (preferred) {
    const p = voicesCache.find((v) => v.identifier === preferred);
    if (p && voiceScore(p, lang) >= 0) return p;
  }
  let best: NativeVoice | null = null;
  let bestScore = -1;
  for (const v of voicesCache) {
    const sc = voiceScore(v, lang);
    if (sc > bestScore) {
      best = v;
      bestScore = sc;
    }
  }
  return best;
}

const chosen: Record<string, string | null> = {};
export function setPreferredVoice(lang: string, name: string | null) {
  chosen[lang] = name;
}

/** On phones the system engine can always speak (it falls back to a default voice). */
export function canSpeak(_lang: string): boolean {
  return ttsSupported();
}

export function speak(text: string, lang: string, onBoundary?: () => void): { done: Promise<void>; stop: () => void } {
  if (!ttsSupported() || !text.trim()) return { done: Promise.resolve(), stop: () => {} };
  try {
    Speech.stop();
  } catch {
    /* ignore */
  }
  const voice = pickVoice(lang, chosen[lang] ?? null);
  const natural = !!voice && isNatural(voice);
  const parts = text
    .split(/[.!?।](?=\s|$)|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  let stopped = false;
  const done = new Promise<void>((resolve) => {
    let i = 0;
    const safety = setTimeout(() => {
      stopped = true;
      try {
        Speech.stop();
      } catch {
        /* ignore */
      }
      resolve();
    }, Math.min(30000, 2500 + text.length * 90));
    const next = () => {
      if (stopped || i >= parts.length) {
        clearTimeout(safety);
        return resolve();
      }
      const part = parts[i++];
      try {
        Speech.speak(part, {
          language: voice?.language ?? (VOICE_LANG[lang] ?? ["en-IN"])[0],
          voice: voice?.identifier,
          rate: natural ? 1 : lang === "en" ? 0.98 : 0.95,
          pitch: natural ? 1 : 1.06,
          onStart: () => onBoundary?.(),
          onBoundary: () => onBoundary?.(),
          onDone: next,
          onStopped: () => {
            stopped = true;
            clearTimeout(safety);
            resolve();
          },
          onError: next,
        });
      } catch {
        next();
      }
    };
    next();
  });
  return {
    done,
    stop: () => {
      stopped = true;
      try {
        Speech.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

// ---------------- activation feedback (haptic tick instead of a sound) ----------------
export function chime(kind: "on" | "off" = "on") {
  try {
    if (!Haptics?.impactAsync) return;
    void Haptics.impactAsync(kind === "on" ? Haptics.ImpactFeedbackStyle?.Light : Haptics.ImpactFeedbackStyle?.Soft ?? Haptics.ImpactFeedbackStyle?.Light).catch(() => null);
  } catch {
    /* ignore */
  }
}
