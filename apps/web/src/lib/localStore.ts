import { useCallback, useSyncExternalStore } from "react";

/**
 * Tiny device-local preference store over `localStorage` (never vault data). Reads and writes
 * are wrapped in try/catch so the app still works when storage is blocked; the server snapshot
 * is always `null`, so prerendered HTML uses the defaults.
 */
const listeners = new Map<string, Set<() => void>>();
/** Fallback when storage throws (e.g. blocked): values live for this page view only. */
const memory = new Map<string, string | null>();

export function readLocal(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage blocked: keep working for this page view only.
    memory.set(key, value);
  }
  listeners.get(key)?.forEach((l) => l());
}

export function useLocalValue(key: string): [string | null, (value: string | null) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(cb);
      listeners.set(key, set);
      const onStorage = (e: StorageEvent) => e.key === key && cb();
      window.addEventListener("storage", onStorage);
      return () => {
        set.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );
  const value = useSyncExternalStore(
    subscribe,
    () => (memory.has(key) ? memory.get(key)! : readLocal(key)),
    () => null,
  );
  return [value, useCallback((v: string | null) => writeLocal(key, v), [key])];
}
