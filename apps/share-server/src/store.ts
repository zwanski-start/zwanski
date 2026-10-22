import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Share records. The server only ever holds AES-GCM ciphertext + IV produced by the app; the
 * decryption key lives in the link fragment and never reaches the server. Owners are opaque
 * SHA-256 hashes of a random secret the app generated — there are no accounts.
 *
 * Expiry and revocation are enforced here: once a share is expired or revoked its ciphertext is
 * deleted (only a metadata tombstone remains, so the owner sees what happened), and reads fail.
 */
export interface ShareRecord {
  id: string;
  ownerHash: string;
  iv: string | null;
  ciphertext: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  accessCount: number;
  /** Times of successful reads (newest last, capped). No IPs, user agents or referrers. */
  accessLog: string[];
}

export type ShareState = "active" | "expired" | "revoked";

export const LIMITS = {
  minTtlSeconds: 5 * 60,
  maxTtlSeconds: 30 * 24 * 60 * 60,
  maxCiphertextChars: 512 * 1024,
  maxActivePerOwner: 50,
  maxRecords: 10_000,
  accessLogSize: 50,
  /** Tombstones are dropped this long after expiry/revocation. */
  tombstoneMs: 30 * 24 * 60 * 60 * 1000,
} as const;

export function stateOf(r: ShareRecord, nowMs: number): ShareState {
  if (r.revokedAt) return "revoked";
  if (Date.parse(r.expiresAt) <= nowMs) return "expired";
  return "active";
}

export class StoreError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class ShareStore {
  private records = new Map<string, ShareRecord>();
  private readonly file: string | undefined;

  /** `file` = JSON persistence path (atomic rewrite on every change); omit for in-memory. */
  constructor(file?: string) {
    this.file = file;
    if (!file) return;
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
      throw new Error(`Share data file ${file} is unreadable: ${(e as Error).message}`);
    }
    if (!Array.isArray(raw)) throw new Error(`Share data file ${file} is not a JSON array.`);
    for (const r of raw as ShareRecord[]) {
      if (typeof r?.id === "string" && typeof r.ownerHash === "string" && typeof r.expiresAt === "string") {
        this.records.set(r.id, r);
      }
    }
  }

  private persist() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify([...this.records.values()]), { mode: 0o600 });
    renameSync(tmp, this.file);
  }

  /** Drops ciphertext of expired/revoked shares and forgets old tombstones. */
  sweep(nowMs: number) {
    let changed = false;
    for (const r of this.records.values()) {
      const state = stateOf(r, nowMs);
      if (state === "active") continue;
      if (r.ciphertext !== null) {
        r.ciphertext = null;
        r.iv = null;
        changed = true;
      }
      const endedAt = state === "revoked" ? Date.parse(r.revokedAt!) : Date.parse(r.expiresAt);
      if (nowMs - endedAt > LIMITS.tombstoneMs) {
        this.records.delete(r.id);
        changed = true;
      }
    }
    if (changed) this.persist();
  }

  create(input: { id: string; ownerHash: string; iv: string; ciphertext: string; ttlSeconds: number }, nowMs: number) {
    this.sweep(nowMs);
    if (this.records.size >= LIMITS.maxRecords) throw new StoreError(507, "Share storage is full.");
    const active = [...this.records.values()].filter((r) => r.ownerHash === input.ownerHash && stateOf(r, nowMs) === "active");
    if (active.length >= LIMITS.maxActivePerOwner) {
      throw new StoreError(429, `At most ${LIMITS.maxActivePerOwner} active shares; revoke some first.`);
    }
    if (this.records.has(input.id)) throw new StoreError(409, "Share id collision; retry.");
    const record: ShareRecord = {
      id: input.id,
      ownerHash: input.ownerHash,
      iv: input.iv,
      ciphertext: input.ciphertext,
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + input.ttlSeconds * 1000).toISOString(),
      revokedAt: null,
      accessCount: 0,
      accessLog: [],
    };
    this.records.set(record.id, record);
    this.persist();
    return record;
  }

  /** Public read: only active shares return ciphertext; each successful read is counted. */
  read(id: string, nowMs: number): { state: "missing" } | { state: "expired" | "revoked" } | { state: "active"; record: ShareRecord } {
    this.sweep(nowMs);
    const r = this.records.get(id);
    if (!r) return { state: "missing" };
    const state = stateOf(r, nowMs);
    if (state !== "active") return { state };
    r.accessCount += 1;
    r.accessLog = [...r.accessLog, new Date(nowMs).toISOString()].slice(-LIMITS.accessLogSize);
    this.persist();
    return { state, record: r };
  }

  /** Owner-scoped list. Other owners' shares are invisible. */
  list(ownerHash: string, nowMs: number) {
    this.sweep(nowMs);
    return [...this.records.values()]
      .filter((r) => r.ownerHash === ownerHash)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        revokedAt: r.revokedAt,
        state: stateOf(r, nowMs),
        accessCount: r.accessCount,
        accessLog: r.accessLog,
      }));
  }

  /** Owner-scoped revoke. A share owned by someone else is reported as missing (no oracle). */
  revoke(id: string, ownerHash: string, nowMs: number) {
    const r = this.records.get(id);
    if (!r || r.ownerHash !== ownerHash) return null;
    if (!r.revokedAt) {
      r.revokedAt = new Date(nowMs).toISOString();
      r.ciphertext = null;
      r.iv = null;
      this.persist();
    }
    return { id: r.id, revokedAt: r.revokedAt };
  }

  /** Test/ops helper: raw view of what is stored (to prove no plaintext is held). */
  dump(): ShareRecord[] {
    return [...this.records.values()].map((r) => ({ ...r, accessLog: [...r.accessLog] }));
  }
}
