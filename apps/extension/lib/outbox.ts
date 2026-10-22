import { CaptureSchema, MAX_OUTBOX, isLocalAppOrigin, type Capture } from "@proofbridge/core";

/** The subset of `chrome.storage.StorageArea` the outbox needs (lets tests pass a fake). */
export interface KeyValueArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

export const DEFAULT_APP_URL = "http://localhost:3000";
const OUTBOX_KEY = "outbox";
const APP_URL_KEY = "appUrl";

/** Normalises a user-typed app address to its origin, or throws if it is not a local app. */
export function normalizeAppUrl(input: string): string {
  const trimmed = input.trim();
  if (!URL.canParse(trimmed)) throw new Error("Enter an address like http://localhost:3000");
  const origin = new URL(trimmed).origin;
  if (!isLocalAppOrigin(origin)) throw new Error("Only http(s)://localhost or 127.0.0.1 is allowed.");
  return origin;
}

/**
 * Confirmed captures waiting to be imported by the app. Every read re-validates what is
 * stored, so a corrupted or tampered entry is dropped instead of handed to the app.
 */
export function createOutbox(area: KeyValueArea) {
  async function list(): Promise<Capture[]> {
    const raw = (await area.get(OUTBOX_KEY))[OUTBOX_KEY];
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((c) => {
      const parsed = CaptureSchema.safeParse(c);
      return parsed.success ? [parsed.data] : [];
    });
  }
  return {
    list,
    async add(capture: Capture): Promise<Capture[]> {
      const valid = CaptureSchema.parse(capture);
      const current = await list();
      if (current.length >= MAX_OUTBOX) throw new Error(`The queue is full (${MAX_OUTBOX}). Import or delete some captures first.`);
      const next = [...current.filter((c) => c.id !== valid.id), valid];
      await area.set({ [OUTBOX_KEY]: next });
      return next;
    },
    async remove(ids: readonly string[]): Promise<number> {
      const current = await list();
      const next = current.filter((c) => !ids.includes(c.id));
      await area.set({ [OUTBOX_KEY]: next });
      return current.length - next.length;
    },
    async clear(): Promise<void> {
      await area.remove(OUTBOX_KEY);
    },
    async getAppUrl(): Promise<string> {
      const raw = (await area.get(APP_URL_KEY))[APP_URL_KEY];
      try {
        return typeof raw === "string" ? normalizeAppUrl(raw) : DEFAULT_APP_URL;
      } catch {
        return DEFAULT_APP_URL;
      }
    },
    async setAppUrl(input: string): Promise<string> {
      const origin = normalizeAppUrl(input);
      await area.set({ [APP_URL_KEY]: origin });
      return origin;
    },
  };
}
export type Outbox = ReturnType<typeof createOutbox>;
