// Client half of the encrypted API channel (server: budget-pro-api/src/lib/secure-channel.ts).
// ECDH P-256 → HKDF-SHA256 → AES-256-GCM, identical bytes to the old browser version, so the server is unchanged.
//   • Web: the browser's WebCrypto (fast, native)
//   • Android / iOS: audited pure-JS crypto (@noble/*) — WebCrypto doesn't exist in React Native
// If anything fails the app falls back to plain JSON over HTTPS (still encrypted by TLS), so it never breaks.
// must run before @noble/* load: they capture globalThis.crypto when their module is first evaluated
import "./polyfills";
import { p256 } from "@noble/curves/p256";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { gcm } from "@noble/ciphers/aes";
import { API_URL } from "./config";
import { b64url, fromB64url, utf8Decode, utf8Encode } from "./bytes";

export interface Channel {
  pub: string; // our public key (base64url, 65 bytes uncompressed)
  seal: (text: string) => Promise<string>;
  open: (payload: string) => Promise<string>;
}

const SALT = "budgetpro-e2e-v1";
const INFO = "aes-256-gcm";

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

// ---------- key exchange ----------
async function serverPub(): Promise<string> {
  const res = await fetch(`${API_URL}/api/secure/key`, { cache: "no-store", credentials: "omit" });
  const json = (await res.json()) as { data?: { key?: string } };
  const k = json.data?.key;
  if (!k) throw new Error("no server key");
  return k;
}

async function buildWebCrypto(spk: string): Promise<Channel> {
  const subtle = globalThis.crypto.subtle;
  const pair = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const serverKey = await subtle.importKey("raw", fromB64url(spk) as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const bits = await subtle.deriveBits({ name: "ECDH", public: serverKey }, pair.privateKey, 256);
  const hk = await subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const key = await subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: utf8Encode(SALT) as BufferSource, info: utf8Encode(INFO) as BufferSource },
    hk,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const pub = b64url(new Uint8Array(await subtle.exportKey("raw", pair.publicKey)));
  return {
    pub,
    seal: async (text) => {
      const iv = randomBytes(12);
      const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, utf8Encode(text) as BufferSource));
      const out = new Uint8Array(12 + ct.length);
      out.set(iv);
      out.set(ct, 12);
      return b64url(out);
    },
    open: async (payload) => {
      const buf = fromB64url(payload);
      const pt = await subtle.decrypt({ name: "AES-GCM", iv: buf.subarray(0, 12) as BufferSource }, key, buf.subarray(12) as BufferSource);
      return utf8Decode(new Uint8Array(pt));
    },
  };
}

function buildNoble(spk: string): Channel {
  const priv = p256.utils.randomPrivateKey();
  const pubBytes = p256.getPublicKey(priv, false); // 65 bytes, 0x04 | X | Y
  // compressed shared point = 0x02/0x03 | X → X is what WebCrypto / Node's ECDH return
  const shared = p256.getSharedSecret(priv, fromB64url(spk), true).slice(1);
  const key = hkdf(sha256, shared, utf8Encode(SALT), utf8Encode(INFO), 32);
  return {
    pub: b64url(pubBytes),
    seal: async (text) => {
      const iv = randomBytes(12);
      const ct = gcm(key, iv).encrypt(utf8Encode(text)); // ciphertext | tag(16)
      const out = new Uint8Array(12 + ct.length);
      out.set(iv);
      out.set(ct, 12);
      return b64url(out);
    },
    open: async (payload) => {
      const buf = fromB64url(payload);
      return utf8Decode(gcm(key, buf.subarray(0, 12)).decrypt(buf.subarray(12)));
    },
  };
}

let chan: Promise<Channel | null> | null = null;

async function build(): Promise<Channel | null> {
  if (typeof globalThis.crypto?.getRandomValues !== "function") return null;
  const spk = await serverPub();
  if (globalThis.crypto?.subtle && typeof window !== "undefined" && window.isSecureContext !== false) {
    try {
      return await buildWebCrypto(spk);
    } catch {
      /* fall through to pure JS */
    }
  }
  return buildNoble(spk);
}

/** The shared channel (built once per app start). null = use plain JSON. */
export function secureChannel(): Promise<Channel | null> {
  chan ??= build().catch(() => {
    chan = null; // retry on the next request
    return null;
  });
  return chan;
}

/** Forget the channel (server key rotated after a deploy). */
export function resetSecureChannel() {
  chan = null;
}
