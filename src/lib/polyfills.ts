// Native only: crypto.getRandomValues for the encrypted channel (@noble/*). Web browsers already have it.
import { Platform } from "react-native";
import * as ExpoCrypto from "expo-crypto";

if (Platform.OS !== "web") {
  const g = globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (!g.crypto) g.crypto = {};
  if (typeof g.crypto.getRandomValues !== "function") {
    g.crypto.getRandomValues = (arr: Uint8Array) => ExpoCrypto.getRandomValues(arr);
  }
}
