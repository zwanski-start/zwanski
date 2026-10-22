import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { openShare, randomBytes, sealForShare, toBase64Url } from "@proofbridge/core";
import { createHandler } from "./handler.ts";
import { startShareServer } from "./node.ts";
import { LIMITS, ShareStore } from "./store.ts";

const APP = "http://localhost:3000";
const BASE = "http://share.test";
const HOUR = 3600;
const T0 = Date.parse("2026-10-22T12:00:00.000Z");

const secret = () => toBase64Url(randomBytes(32));

function setup(extra: { readsPerMinute?: number; store?: ShareStore } = {}) {
  let clock = T0;
  const store = extra.store ?? new ShareStore();
  const handle = createHandler({ store, allowedOrigins: [APP], now: () => clock, ...extra });
  const call = (method: string, path: string, init: { owner?: string; body?: unknown; origin?: string | null; raw?: string } = {}) => {
    const headers: Record<string, string> = {};
    if (init.origin !== null) headers.Origin = init.origin ?? APP;
    if (init.owner) headers.Authorization = `Bearer ${init.owner}`;
    if (init.body !== undefined || init.raw !== undefined) headers["Content-Type"] = "application/json";
    return handle(
      new Request(BASE + path, {
        method,
        headers,
        body: init.raw ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
      }),
    );
  };
  const create = async (owner: string, ttlSeconds = HOUR, payload: unknown = { format: "proofbridge.dossier", title: "PLAINTEXT-MARKER" }) => {
    const { key, sealed } = await sealForShare(payload);
    const res = await call("POST", "/api/shares", { owner, body: { ...sealed, ttlSeconds } });
    return { res, key, body: (await res.json()) as { id: string; expiresAt: string; error?: string } };
  };
  const read = (id: string) => call("GET", `/api/shares/${id}`, { origin: null });
  return { store, call, create, read, advance: (s: number) => (clock += s * 1000) };
}

describe("share links: expiry", () => {
  it("serves ciphertext until expiry, then 410 and the ciphertext is deleted", async () => {
    const s = setup();
    const owner = secret();
    const { res, key, body } = await s.create(owner, 2 * HOUR);
    expect(res.status).toBe(201);
    expect(body.expiresAt).toBe(new Date(T0 + 2 * HOUR * 1000).toISOString());

    const ok = await s.read(body.id);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Cache-Control")).toBe("no-store");
    const sealed = await ok.json();
    expect(await openShare(sealed, key)).toMatchObject({ title: "PLAINTEXT-MARKER" });

    s.advance(2 * HOUR - 1);
    expect((await s.read(body.id)).status).toBe(200);
    s.advance(1);
    const gone = await s.read(body.id);
    expect(gone.status).toBe(410);
    expect(await gone.json()).toEqual({ state: "expired" });
    expect(s.store.dump()[0]).toMatchObject({ ciphertext: null, iv: null });

    const list = await (await s.call("GET", "/api/shares", { owner })).json();
    expect(list.shares).toEqual([expect.objectContaining({ id: body.id, state: "expired", accessCount: 2 })]);
  });

  it("only accepts a TTL between 5 minutes and 30 days", async () => {
    const s = setup();
    const owner = secret();
    expect((await s.create(owner, LIMITS.minTtlSeconds - 1)).res.status).toBe(400);
    expect((await s.create(owner, LIMITS.maxTtlSeconds + 1)).res.status).toBe(400);
    expect((await s.create(owner, LIMITS.maxTtlSeconds)).res.status).toBe(201);
  });
});

describe("share links: revocation", () => {
  it("revoked shares stop resolving immediately and lose their ciphertext", async () => {
    const s = setup();
    const owner = secret();
    const { body } = await s.create(owner);
    expect((await s.read(body.id)).status).toBe(200);
    const rev = await s.call("DELETE", `/api/shares/${body.id}`, { owner });
    expect(rev.status).toBe(200);
    expect((await rev.json()).revokedAt).toBe(new Date(T0).toISOString());
    const gone = await s.read(body.id);
    expect(gone.status).toBe(410);
    expect(await gone.json()).toEqual({ state: "revoked" });
    expect(s.store.dump()[0]).toMatchObject({ ciphertext: null, iv: null, revokedAt: new Date(T0).toISOString() });
    // Idempotent; revocation is not undone by time passing.
    expect((await s.call("DELETE", `/api/shares/${body.id}`, { owner })).status).toBe(200);
    s.advance(60);
    expect((await s.read(body.id)).status).toBe(410);
  });

  it("revocation and expiry survive a restart (file store)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pb-share-"));
    try {
      const file = join(dir, "shares.json");
      const s = setup({ store: new ShareStore(file) });
      const owner = secret();
      const a = await s.create(owner);
      const b = await s.create(owner);
      await s.call("DELETE", `/api/shares/${a.body.id}`, { owner });
      expect(readFileSync(file, "utf8")).not.toContain("PLAINTEXT-MARKER");

      const again = setup({ store: new ShareStore(file) });
      expect((await again.read(a.body.id)).status).toBe(410);
      expect((await again.read(b.body.id)).status).toBe(200);
      again.advance(HOUR);
      expect((await again.read(b.body.id)).status).toBe(410);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("tenant isolation (owner = hash of a random capability)", () => {
  it("an owner can neither list nor revoke another owner's shares", async () => {
    const s = setup();
    const alice = secret();
    const bob = secret();
    const a = await s.create(alice);
    const b = await s.create(bob);

    const aliceList = (await (await s.call("GET", "/api/shares", { owner: alice })).json()).shares;
    const bobList = (await (await s.call("GET", "/api/shares", { owner: bob })).json()).shares;
    expect(aliceList.map((x: { id: string }) => x.id)).toEqual([a.body.id]);
    expect(bobList.map((x: { id: string }) => x.id)).toEqual([b.body.id]);

    // Bob trying to revoke Alice's share looks exactly like an unknown id.
    const steal = await s.call("DELETE", `/api/shares/${a.body.id}`, { owner: bob });
    const unknown = await s.call("DELETE", `/api/shares/${"A".repeat(22)}`, { owner: bob });
    expect(steal.status).toBe(404);
    expect(await steal.json()).toEqual(await unknown.json());
    expect((await s.read(a.body.id)).status).toBe(200);
  });

  it("owner routes need a well-formed bearer key; the server stores only its hash", async () => {
    const s = setup();
    const owner = secret();
    expect((await s.call("GET", "/api/shares")).status).toBe(401);
    expect((await s.call("GET", "/api/shares", { owner: "too-short" })).status).toBe(401);
    await s.create(owner);
    expect(JSON.stringify(s.store.dump())).not.toContain(owner);
  });

  it("caps active shares per owner", async () => {
    const s = setup({ store: new ShareStore() });
    const owner = secret();
    const handle = createHandler({ store: s.store, allowedOrigins: [APP], now: () => T0, createsPerHour: 1000 });
    const { sealed } = await sealForShare({ x: 1 });
    const post = () =>
      handle(
        new Request(BASE + "/api/shares", {
          method: "POST",
          headers: { Origin: APP, Authorization: `Bearer ${owner}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...sealed, ttlSeconds: HOUR }),
        }),
      );
    for (let i = 0; i < LIMITS.maxActivePerOwner; i++) expect((await post()).status).toBe(201);
    expect((await post()).status).toBe(429);
  });
});

describe("hostile requests", () => {
  it("answers CORS only for allowed app origins", async () => {
    const s = setup();
    const owner = secret();
    const pre = await s.call("OPTIONS", "/api/shares");
    expect(pre.status).toBe(204);
    expect(pre.headers.get("Access-Control-Allow-Origin")).toBe(APP);
    const evil = await s.call("GET", "/api/shares", { owner, origin: "https://evil.test" });
    expect(evil.status).toBe(403);
    expect(evil.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect((await s.call("OPTIONS", "/api/shares", { origin: "http://localhost:3001" })).status).toBe(403);
  });

  it("rejects malformed bodies, extra fields, wrong content type and bad ids", async () => {
    const s = setup();
    const owner = secret();
    const { sealed } = await sealForShare({ x: 1 });
    expect((await s.call("POST", "/api/shares", { owner, raw: "{nope" })).status).toBe(400);
    expect((await s.call("POST", "/api/shares", { owner, body: { ...sealed, ttlSeconds: HOUR, plaintext: "x" } })).status).toBe(400);
    expect((await s.call("POST", "/api/shares", { owner, body: { ...sealed, iv: "!!", ttlSeconds: HOUR } })).status).toBe(400);
    expect((await s.call("POST", "/api/shares", { owner, body: { ...sealed, ciphertext: "A".repeat(LIMITS.maxCiphertextChars + 1), ttlSeconds: HOUR } })).status).toBe(400);
    const wrongType = await createHandler({ store: s.store, allowedOrigins: [APP] })(
      new Request(BASE + "/api/shares", { method: "POST", headers: { Authorization: `Bearer ${owner}`, "Content-Type": "text/plain" }, body: "{}" }),
    );
    expect(wrongType.status).toBe(415);
    expect((await s.read("../../etc/passwd")).status).toBe(404);
    expect((await s.read("A".repeat(22))).status).toBe(404);
  });

  it("rate-limits public reads per client", async () => {
    const s = setup({ readsPerMinute: 5 });
    const owner = secret();
    const { body } = await s.create(owner);
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await s.read(body.id)).status);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429, 429]);
    s.advance(60);
    expect((await s.read(body.id)).status).toBe(200);
  });

  it("never stores or returns plaintext", async () => {
    const s = setup();
    const owner = secret();
    const { body } = await s.create(owner);
    expect(JSON.stringify(s.store.dump())).not.toContain("PLAINTEXT-MARKER");
    expect(await (await s.read(body.id)).text()).not.toContain("PLAINTEXT-MARKER");
  });

  it("serves the viewer with a hash-pinned CSP and no external resources", async () => {
    const s = setup();
    const res = await s.call("GET", `/s/${"A".repeat(22)}`, { origin: null });
    expect(res.status).toBe(200);
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toMatch(/^default-src 'none'; script-src 'sha256-[A-Za-z0-9+/=]+'; style-src 'sha256-/);
    expect(csp).toContain("frame-ancestors 'none'");
    const html = await res.text();
    expect(html).not.toMatch(/(src|href)=["']?https?:/);
    expect(html).not.toContain("innerHTML");
    expect((await s.call("GET", "/s/short", { origin: null })).status).toBe(404);
  });
});

describe("node adapter", () => {
  const servers: { close: () => void }[] = [];
  afterAll(() => servers.forEach((s) => s.close()));

  it("round-trips over real HTTP and refuses oversized bodies", async () => {
    const { server, url } = await startShareServer({ allowedOrigins: [APP] });
    servers.push(server);
    const owner = secret();
    const { key, sealed } = await sealForShare({ hello: "world" });
    const created = await fetch(`${url}/api/shares`, {
      method: "POST",
      headers: { Authorization: `Bearer ${owner}`, "Content-Type": "application/json", Origin: APP },
      body: JSON.stringify({ ...sealed, ttlSeconds: HOUR }),
    });
    expect(created.status).toBe(201);
    expect(created.headers.get("access-control-allow-origin")).toBe(APP);
    const { id } = await created.json();
    const got = await fetch(`${url}/api/shares/${id}`);
    expect(await openShare(await got.json(), key)).toEqual({ hello: "world" });
    const huge = await fetch(`${url}/api/shares`, {
      method: "POST",
      headers: { Authorization: `Bearer ${owner}`, "Content-Type": "application/json" },
      body: "x".repeat(LIMITS.maxCiphertextChars + 10_000),
    }).catch(() => null);
    if (huge) expect(huge.status).toBe(413);
  });
});

