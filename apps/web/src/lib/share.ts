import { randomBytes, sealForShare, toBase64Url, type Dossier } from "@proofbridge/core";

/**
 * OPTIONAL online share links (opt-in). The dossier is encrypted in this browser with a fresh
 * key; only ciphertext goes to the share service the user configured. The key is put in the
 * link's #fragment, which browsers do not send to servers. The owner key (a random capability
 * that lets this browser list/revoke its shares) and the list of created links stay in this
 * browser's localStorage. Nothing here runs until the user enables it and clicks.
 */

const STORAGE_KEY = "proofbridge.share.v1";

export const EXPIRY_OPTIONS = [
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86_400 },
  { label: "7 days", seconds: 7 * 86_400 },
  { label: "30 days", seconds: 30 * 86_400 },
] as const;

export interface LocalShare {
  id: string;
  link: string;
  title: string;
  createdAt: string;
  expiresAt: string;
}

export interface ShareSettings {
  serverUrl: string;
  ownerKey: string;
  shares: LocalShare[];
}

export interface RemoteShare {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  state: "active" | "expired" | "revoked";
  accessCount: number;
  accessLog: string[];
}

/**
 * Normalises a share-service address to its origin. https is required except for loopback
 * addresses (a local service on this machine).
 */
export function normaliseServerUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a full address, e.g. http://localhost:8787.");
  }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("Use https:// (plain http:// is only allowed for localhost).");
  }
  if (url.username || url.password) throw new Error("The address must not contain a user name or password.");
  return url.origin;
}

export function loadShareSettings(): ShareSettings | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!raw || typeof raw.serverUrl !== "string" || typeof raw.ownerKey !== "string" || !Array.isArray(raw.shares)) return null;
    return { serverUrl: normaliseServerUrl(raw.serverUrl), ownerKey: raw.ownerKey, shares: raw.shares as LocalShare[] };
  } catch {
    return null;
  }
}

export function saveShareSettings(s: ShareSettings | null) {
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else localStorage.removeItem(STORAGE_KEY);
}

export function newShareSettings(serverUrl: string): ShareSettings {
  return { serverUrl: normaliseServerUrl(serverUrl), ownerKey: toBase64Url(randomBytes(32)), shares: [] };
}

const FETCH_INIT = { credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" } as const;

async function call<T>(s: ShareSettings, method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(s.serverUrl + path, {
      ...FETCH_INIT,
      method,
      headers: {
        Authorization: `Bearer ${s.ownerKey}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`The share service at ${s.serverUrl} could not be reached.`);
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `The share service answered ${res.status}.`);
  return json;
}

/** Encrypts the dossier locally and uploads only the ciphertext. Returns the full link. */
export async function createShare(s: ShareSettings, dossier: Dossier, ttlSeconds: number): Promise<LocalShare> {
  const { key, sealed } = await sealForShare(dossier);
  const created = await call<{ id: string; expiresAt: string }>(s, "POST", "/api/shares", { ...sealed, ttlSeconds });
  return {
    id: created.id,
    link: `${s.serverUrl}/s/${created.id}#k=${key}`,
    title: dossier.opportunity.title,
    createdAt: new Date().toISOString(),
    expiresAt: created.expiresAt,
  };
}

export async function listShares(s: ShareSettings): Promise<RemoteShare[]> {
  return (await call<{ shares: RemoteShare[] }>(s, "GET", "/api/shares")).shares;
}

export async function revokeShare(s: ShareSettings, id: string): Promise<void> {
  await call(s, "DELETE", `/api/shares/${encodeURIComponent(id)}`);
}
