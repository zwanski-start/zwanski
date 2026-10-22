import { z } from "zod";
import { MAX_BACKUP_BYTES, parseBackup, serializeBackup } from "./backup";
import type { Dataset } from "./schemas";

/**
 * Authenticated encryption with WebCrypto only (browser + Node ≥ 20, no dependency):
 *
 * - **Encrypted vault backup** (`proofbridge.encrypted-backup` v1): AES-256-GCM with a key
 *   derived from a user passphrase by PBKDF2-HMAC-SHA-256 (random 16-byte salt, 600 000
 *   iterations). The envelope header is bound as GCM additional data, so changing any header
 *   field, the ciphertext or the tag makes decryption fail. The passphrase is never stored.
 * - **Sealed share payload**: AES-256-GCM with a fresh random key per share. The key travels only
 *   in the link's `#fragment` (browsers never send fragments to servers); the share server stores
 *   ciphertext only.
 *
 * No keys are hardcoded. This is not "end-to-end encryption" of the vault: the local vault in
 * IndexedDB stays unencrypted, and anyone holding a full share link can read that share.
 */

export const ENCRYPTED_BACKUP_FORMAT = "proofbridge.encrypted-backup";
export const ENCRYPTED_BACKUP_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
/** Hostile-file bounds on the KDF cost a file may ask for (DoS) and the floor we accept (weak). */
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 5_000_000;
export const MIN_PASSPHRASE_LENGTH = 12;
export const SHARE_AAD = "proofbridge.share.v1";

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error("WebCrypto is not available in this environment.");
  return s;
};

const b64urlRe = /^[A-Za-z0-9_-]*$/;

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  if (!b64urlRe.test(text) || text.length % 4 === 1) throw new Error("Invalid base64url data.");
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const randomBytes = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

const utf8 = (s: string) => new TextEncoder().encode(s);

const EnvelopeHeaderSchema = z
  .object({
    format: z.literal(ENCRYPTED_BACKUP_FORMAT),
    version: z.literal(ENCRYPTED_BACKUP_VERSION),
    kdf: z
      .object({
        name: z.literal("PBKDF2"),
        hash: z.literal("SHA-256"),
        iterations: z.number().int().min(MIN_ITERATIONS).max(MAX_ITERATIONS),
        salt: z.string().regex(b64urlRe).min(16).max(64),
      })
      .strict(),
    cipher: z.object({ name: z.literal("AES-GCM"), iv: z.string().regex(b64urlRe).length(16) }).strict(),
    createdAt: z.string().datetime(),
  })
  .strict();

const EnvelopeSchema = EnvelopeHeaderSchema.extend({ ciphertext: z.string().regex(b64urlRe).min(1) }).strict();

export type EncryptedBackupHeader = z.infer<typeof EnvelopeHeaderSchema>;

/** The exact bytes bound as additional data: header fields in a fixed order. */
const headerAad = (h: EncryptedBackupHeader) =>
  utf8(
    JSON.stringify([h.format, h.version, h.kdf.name, h.kdf.hash, h.kdf.iterations, h.kdf.salt, h.cipher.name, h.cipher.iv, h.createdAt]),
  );

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", utf8(passphrase.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function checkPassphrase(passphrase: string): string | null {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) return `Use a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`;
  return null;
}

/** True when the text looks like an encrypted backup envelope (cheap sniff, not validation). */
export function isEncryptedBackup(text: string): boolean {
  return text.slice(0, 200).includes(`"${ENCRYPTED_BACKUP_FORMAT}"`);
}

export async function encryptBackup(
  data: Dataset,
  passphrase: string,
  opts: { now?: string; iterations?: number } = {},
): Promise<string> {
  const problem = checkPassphrase(passphrase);
  if (problem) throw new Error(problem);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const header: EncryptedBackupHeader = EnvelopeHeaderSchema.parse({
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: opts.iterations ?? PBKDF2_ITERATIONS, salt: toBase64Url(salt) },
    cipher: { name: "AES-GCM", iv: toBase64Url(iv) },
    createdAt: opts.now ?? new Date().toISOString(),
  });
  const key = await deriveKey(passphrase, salt, header.kdf.iterations);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv, additionalData: headerAad(header) }, key, utf8(serializeBackup(data)));
  return JSON.stringify({ ...header, ciphertext: toBase64Url(new Uint8Array(ct)) }, null, 2);
}

/**
 * Decrypts and validates an untrusted encrypted backup: size bound, strict envelope schema
 * (bounded KDF cost), AES-GCM authentication, then the same checks as a plain backup.
 * A wrong passphrase and a tampered file are indistinguishable by design.
 */
export async function decryptBackup(text: string, passphrase: string): Promise<Dataset> {
  // Base64 inflates by 4/3; allow for that over the plain backup bound.
  if (text.length > Math.ceil((MAX_BACKUP_BYTES * 4) / 3) + 4096) throw new Error("Backup file is too large.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }
  const parsed = EnvelopeSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Not a supported encrypted ProofBridge backup.");
  const { ciphertext, ...header } = parsed.data;
  const key = await deriveKey(passphrase, fromBase64Url(header.kdf.salt), header.kdf.iterations);
  let plain: ArrayBuffer;
  try {
    plain = await subtle().decrypt(
      { name: "AES-GCM", iv: fromBase64Url(header.cipher.iv), additionalData: headerAad(header) },
      key,
      fromBase64Url(ciphertext),
    );
  } catch {
    throw new Error("Could not decrypt: wrong passphrase, or the file was modified.");
  }
  return parseBackup(new TextDecoder().decode(plain));
}

/** A sealed share payload: what the share server stores (no key). */
export interface SealedPayload {
  iv: string;
  ciphertext: string;
}

/** Encrypts a JSON-serialisable payload under a fresh random 256-bit key. */
export async function sealForShare(payload: unknown): Promise<{ key: string; sealed: SealedPayload }> {
  const rawKey = randomBytes(32);
  const iv = randomBytes(12);
  const key = await subtle().importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv, additionalData: utf8(SHARE_AAD) }, key, utf8(JSON.stringify(payload)));
  return { key: toBase64Url(rawKey), sealed: { iv: toBase64Url(iv), ciphertext: toBase64Url(new Uint8Array(ct)) } };
}

export async function openShare(sealed: SealedPayload, key: string): Promise<unknown> {
  const rawKey = b64urlRe.test(key) && key.length === 43 ? fromBase64Url(key) : new Uint8Array(0);
  if (rawKey.length !== 32) throw new Error("Invalid share key.");
  const k = await subtle().importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  let plain: ArrayBuffer;
  try {
    plain = await subtle().decrypt(
      { name: "AES-GCM", iv: fromBase64Url(sealed.iv), additionalData: utf8(SHARE_AAD) },
      k,
      fromBase64Url(sealed.ciphertext),
    );
  } catch {
    throw new Error("Could not decrypt this share: wrong key or modified data.");
  }
  return JSON.parse(new TextDecoder().decode(plain));
}
