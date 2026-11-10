/**
 * Storage that never throws. localStorage/sessionStorage can be missing or throw (Safari
 * private mode, sandboxed iframes, storage disabled); we fall back to memory so tours still work
 * for the current page view.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const PREFIX = "ptour:";

export function safeStore(kind: "local" | "session"): KeyValueStore {
  const memory = new Map<string, string>();
  let backing: Storage | null = null;
  try {
    backing = kind === "local" ? window.localStorage : window.sessionStorage;
    const probe = `${PREFIX}probe`;
    backing.setItem(probe, "1");
    backing.removeItem(probe);
  } catch {
    backing = null;
  }
  return {
    get(key) {
      try {
        return backing ? backing.getItem(PREFIX + key) : (memory.get(key) ?? null);
      } catch {
        return memory.get(key) ?? null;
      }
    },
    set(key, value) {
      memory.set(key, value);
      try {
        backing?.setItem(PREFIX + key, value);
      } catch {
        /* quota or disabled: memory copy remains */
      }
    },
    remove(key) {
      memory.delete(key);
      try {
        backing?.removeItem(PREFIX + key);
      } catch {
        /* ignore */
      }
    },
  };
}

export function readJson<T>(store: KeyValueStore, key: string): T | null {
  const raw = store.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    store.remove(key);
    return null;
  }
}
