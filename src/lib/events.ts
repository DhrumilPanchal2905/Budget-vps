// Tiny app-wide event bus (session expiry, realtime → UI).
type Fn = (payload?: unknown) => void;
const listeners = new Map<string, Set<Fn>>();

export function on(event: string, fn: Fn): () => void {
  let s = listeners.get(event);
  if (!s) listeners.set(event, (s = new Set()));
  s.add(fn);
  return () => s!.delete(fn);
}

export function emit(event: string, payload?: unknown) {
  listeners.get(event)?.forEach((fn) => {
    try {
      fn(payload);
    } catch (e) {
      console.warn("[events]", event, e);
    }
  });
}
