import { describe, expect, it } from "vitest";
import {
  DatasetSchema,
  PBKDF2_ITERATIONS,
  SCHEMA_VERSION,
  decryptBackup,
  encryptBackup,
  fromBase64Url,
  isEncryptedBackup,
  openShare,
  sealForShare,
  toBase64Url,
  type Dataset,
} from "./index";

const at = "2026-01-01T00:00:00.000Z";

const vault = (): Dataset =>
  DatasetSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    profiles: [],
    sources: [],
    artifacts: [],
    claims: [],
    skills: [
      { id: "skill_secret-marker", name: "SECRET-MARKER skill", aliases: [], demo: true, createdAt: at, updatedAt: at },
    ],
    claimSkillLinks: [],
    opportunities: [],
    requirements: [],
    requirementEvidenceLinks: [],
    bridgeTasks: [],
    auditEvents: [],
  });

const PASS = "correct horse battery staple";
const FAST = { iterations: 100_000 };

describe("encrypted backup (AES-256-GCM + PBKDF2)", () => {
  it("round-trips the vault and never contains plaintext", async () => {
    const text = await encryptBackup(vault(), PASS, FAST);
    expect(isEncryptedBackup(text)).toBe(true);
    expect(text).not.toContain("SECRET-MARKER");
    expect(await decryptBackup(text, PASS)).toEqual(vault());
  });

  it("uses 600k iterations by default and fresh salt + IV every time", async () => {
    const a = JSON.parse(await encryptBackup(vault(), PASS));
    const b = JSON.parse(await encryptBackup(vault(), PASS, FAST));
    expect(a.kdf.iterations).toBe(PBKDF2_ITERATIONS);
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.cipher.iv).not.toBe(b.cipher.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("rejects a wrong passphrase", async () => {
    const text = await encryptBackup(vault(), PASS, FAST);
    await expect(decryptBackup(text, PASS + "!")).rejects.toThrow(/wrong passphrase/);
  });

  it("rejects tampered ciphertext and tampered header fields (bound as additional data)", async () => {
    const env = JSON.parse(await encryptBackup(vault(), PASS, FAST));
    const ct = fromBase64Url(env.ciphertext);
    ct[0] = ct[0]! ^ 1;
    await expect(decryptBackup(JSON.stringify({ ...env, ciphertext: toBase64Url(ct) }), PASS)).rejects.toThrow(/modified/);
    await expect(decryptBackup(JSON.stringify({ ...env, createdAt: "2020-01-01T00:00:00.000Z" }), PASS)).rejects.toThrow(
      /modified/,
    );
  });

  it("refuses weak passphrases, hostile KDF costs, unknown fields and non-JSON", async () => {
    await expect(encryptBackup(vault(), "short")).rejects.toThrow(/at least 12/);
    const env = JSON.parse(await encryptBackup(vault(), PASS, FAST));
    for (const bad of [
      { ...env, kdf: { ...env.kdf, iterations: 1 } },
      { ...env, kdf: { ...env.kdf, iterations: 1e9 } },
      { ...env, extra: true },
      { ...env, cipher: { name: "AES-CBC", iv: env.cipher.iv } },
    ]) {
      await expect(decryptBackup(JSON.stringify(bad), PASS)).rejects.toThrow(/Not a supported/);
    }
    await expect(decryptBackup("{nope", PASS)).rejects.toThrow(/not valid JSON/);
    await expect(decryptBackup("x".repeat(20 * 1024 * 1024), PASS)).rejects.toThrow(/too large/);
  });
});

describe("sealed share payloads", () => {
  it("round-trips with the fragment key and hides the plaintext", async () => {
    const { key, sealed } = await sealForShare({ title: "SECRET-MARKER dossier" });
    expect(JSON.stringify(sealed)).not.toContain("SECRET-MARKER");
    expect(fromBase64Url(key)).toHaveLength(32);
    expect(await openShare(sealed, key)).toEqual({ title: "SECRET-MARKER dossier" });
  });

  it("uses a fresh key per share and fails with another share's key or modified data", async () => {
    const a = await sealForShare({ n: 1 });
    const b = await sealForShare({ n: 1 });
    expect(a.key).not.toBe(b.key);
    await expect(openShare(a.sealed, b.key)).rejects.toThrow(/wrong key/);
    const ct = fromBase64Url(a.sealed.ciphertext);
    ct[ct.length - 1] = ct[ct.length - 1]! ^ 1;
    await expect(openShare({ ...a.sealed, ciphertext: toBase64Url(ct) }, a.key)).rejects.toThrow(/modified/);
    await expect(openShare(a.sealed, "short")).rejects.toThrow(/Invalid share key/);
  });
});
