// Small key–value storage for UI preferences (theme, Angel settings, remembered email…). Never secrets.
// Web → localStorage · Native → AsyncStorage. Every call is safe (never throws).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IS_WEB } from "./config";

export const kv = {
  async get(key: string): Promise<string | null> {
    try {
      if (IS_WEB) return typeof window === "undefined" ? null : window.localStorage.getItem(key);
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (IS_WEB) {
        if (typeof window !== "undefined") window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      /* storage blocked */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (IS_WEB) {
        if (typeof window !== "undefined") window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  async getJSON<T>(key: string, fallback: T): Promise<T> {
    const raw = await kv.get(key);
    if (!raw) return fallback;
    try {
      return { ...fallback, ...(JSON.parse(raw) as T) };
    } catch {
      return fallback;
    }
  },
  setJSON(key: string, value: unknown) {
    return kv.set(key, JSON.stringify(value));
  },
};
