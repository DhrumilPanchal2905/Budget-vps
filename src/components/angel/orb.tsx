// Angel's living orb — a glowing sphere with drifting light and a halo (react-native-svg, web + native).
// Breathes when idle, swirls while thinking, moves with your voice while listening / her voice while speaking.
import { useEffect, useId, useRef, useState, type MutableRefObject } from "react";
import { AppState, Platform, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "@/ui";

export type OrbState = "idle" | "wake" | "listening" | "thinking" | "speaking" | "off";

interface Props {
  size: number;
  state: OrbState;
  /** live loudness 0..1 (mic while listening, synthetic while speaking) */
  levelRef?: MutableRefObject<number>;
  halo?: boolean;
  label?: string;
}

const VIOLET = "rgb(150,110,255)";
const CYAN = "rgb(40,210,230)";
const ROSE = "rgb(240,90,160)";

function primaryOf(rgb: string): [number, number, number] {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return [57, 135, 229];
  const [r, g, b] = m.slice(0, 3).map(Number);
  // greyscale primaries (Graphite theme) → Angel blue so the orb stays colourful
  if (Math.max(r, g, b) - Math.min(r, g, b) < 30) return [70, 140, 240];
  return [r, g, b];
}

export function AngelOrb({ size, state, levelRef, halo = true, label = "Angel" }: Props) {
  const t = useTheme();
  const prim = primaryOf(t.c.primary);
  const primary = `rgb(${prim.join(",")})`;
  const dark = `rgb(${prim.map((c) => Math.round(c * 0.55)).join(",")})`;
  // useId: identical on the server (static web render) and the client → no hydration mismatch in the SVG ids
  const id = `orb${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const stateRef = useRef(state);
  stateRef.current = state;
  const anim = useRef({ t: Math.random() * 100, energy: 0, spin: 0, last: Date.now() });
  const [, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const tick = () => {
      if (!active) return;
      const a = anim.current;
      const now = Date.now();
      const dt = Math.min(0.05, (now - a.last) / 1000);
      a.last = now;
      const st = stateRef.current;
      const live = levelRef?.current ?? 0;
      const target = st === "listening" ? 0.25 + live * 0.95 : st === "speaking" ? 0.35 + live * 0.8 : st === "thinking" ? 0.45 : st === "wake" ? 0.12 : st === "off" ? 0 : 0.08;
      a.energy += (target - a.energy) * Math.min(1, dt * 7);
      const speed = st === "thinking" ? 2.6 : st === "listening" || st === "speaking" ? 1.4 : 0.55;
      a.t += dt * speed;
      a.spin += dt * (st === "thinking" ? 3.2 : 0.4);
      setFrame((f) => (f + 1) % 1_000_000);
      // calm states are drawn at a lower frame rate (tiny orbs even lower) to keep the app light
      const calm = st === "idle" || st === "wake" || st === "off";
      const delay = calm ? (size < 32 ? 250 : 66) : 33;
      timer = setTimeout(() => {
        raf = requestAnimationFrame(tick);
      }, delay);
    };
    raf = requestAnimationFrame(tick);
    // pause while the app is in the background / tab hidden
    const pause = () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    const resume = () => {
      pause();
      anim.current.last = Date.now();
      raf = requestAnimationFrame(tick);
    };
    let off = () => {};
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const fn = () => (document.hidden ? pause() : resume());
      document.addEventListener("visibilitychange", fn);
      off = () => document.removeEventListener("visibilitychange", fn);
    } else {
      const sub = AppState.addEventListener("change", (s) => (s === "active" ? resume() : pause()));
      off = () => sub.remove();
    }
    return () => {
      active = false;
      pause();
      off();
    };
  }, [size, levelRef]);

  const { t: tt, energy, spin } = anim.current;
  const W = size;
  const cx = W / 2;
  const cy = W / 2 + (halo ? W * 0.04 : 0);
  const R = W * (halo ? 0.34 : 0.4) * (1 + energy * 0.08 + Math.sin(tt * 1.3) * 0.015);
  const lobes: [string, number, number, number][] = [
    [primary, 0.0, 0.85, 1.0],
    [VIOLET, 2.1, 0.75, 1.25],
    [CYAN, 4.2, 0.7, 0.85],
    [ROSE, 1.1, 0.5, 1.6],
  ];
  const wobble = 0.34 + energy * 0.3;
  const haloOn = state === "off" ? 0.15 : 0.45 + energy * 0.55;

  return (
    <View accessibilityRole="image" accessibilityLabel={label} style={{ width: W, height: W }}>
      <Svg width={W} height={W}>
        <Defs>
          <RadialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.35" stopColor={primary} stopOpacity={0.28 + energy * 0.35} />
            <Stop offset="1" stopColor={primary} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}body`} cx="35%" cy="32%" r="70%">
            <Stop offset="0" stopColor={dark} stopOpacity={1} />
            <Stop offset="1" stopColor="rgb(6,8,20)" stopOpacity={1} />
          </RadialGradient>
          {lobes.map(([col], i) => (
            <RadialGradient key={i} id={`${id}l${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={col} stopOpacity={0.62 + energy * 0.3} />
              <Stop offset="0.45" stopColor={col} stopOpacity={0.28 + energy * 0.2} />
              <Stop offset="1" stopColor={col} stopOpacity={0} />
            </RadialGradient>
          ))}
          <RadialGradient id={`${id}hl`} cx="30%" cy="25%" r="40%">
            <Stop offset="0" stopColor="#fff" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* outer glow */}
        <Circle cx={cx} cy={cy} r={R * 1.7} fill={`url(#${id}glow)`} />
        {/* sphere body */}
        <Circle cx={cx} cy={cy} r={R} fill={`url(#${id}body)`} />
        {/* drifting light lobes (kept inside the sphere by their size/offset) */}
        <G opacity={0.95}>
          {lobes.map(([, phase, rad, f], i) => {
            const a = tt * f + phase + spin * 0.35;
            const x = cx + Math.cos(a) * R * wobble * 0.75;
            const y = cy + Math.sin(a * 1.17) * R * wobble * 0.75;
            const rr = R * Math.min(0.95, (rad + energy * 0.22 + Math.sin(tt * 2 + phase) * 0.04) * 0.8);
            return <Circle key={i} cx={x} cy={y} r={rr} fill={`url(#${id}l${i})`} />;
          })}
        </G>
        {/* voice ripples */}
        {energy > 0.2
          ? [0, 1, 2].map((i) => {
              const k = (tt * 0.9 + i / 3) % 1;
              return <Circle key={`r${i}`} cx={cx} cy={cy} r={R * (0.3 + k * 0.7)} stroke="#fff" strokeOpacity={(1 - k) * 0.12 * energy} strokeWidth={1.2} fill="none" />;
            })
          : null}
        {/* glass highlight + rim */}
        <Circle cx={cx} cy={cy} r={R} fill={`url(#${id}hl)`} />
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke="#fff" strokeOpacity={0.12 + energy * 0.2} strokeWidth={Math.max(1, W * 0.008)} />
        {/* halo — Angel's signature */}
        {halo ? (
          <G>
            <Ellipse cx={cx} cy={cy - R * 1.22 + Math.sin(tt * 1.1) * W * 0.008} rx={R * 0.62} ry={R * 0.14} fill="none" stroke="rgb(255,220,140)" strokeOpacity={haloOn * 0.35} strokeWidth={Math.max(3, W * 0.05)} />
            <Ellipse cx={cx} cy={cy - R * 1.22 + Math.sin(tt * 1.1) * W * 0.008} rx={R * 0.62} ry={R * 0.14} fill="none" stroke="rgb(255,226,160)" strokeOpacity={haloOn} strokeWidth={Math.max(1.5, W * 0.022)} />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}
