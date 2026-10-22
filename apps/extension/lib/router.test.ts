import { beforeEach, describe, expect, it } from "vitest";
import { MAX_OUTBOX, appRequest, type Capture } from "@proofbridge/core";
import { createOutbox, normalizeAppUrl, type KeyValueArea } from "./outbox";
import { handleAppMessage, type Sender } from "./router";

/** In-memory stand-in for `chrome.storage.local`. */
function memoryArea(): KeyValueArea & { dump: Record<string, unknown> } {
  const dump: Record<string, unknown> = {};
  return {
    dump,
    get: async (key) => (key in dump ? { [key]: structuredClone(dump[key]) } : {}),
    set: async (items) => void Object.assign(dump, structuredClone(items)),
    remove: async (key) => void delete dump[key],
  };
}

const capture = (n: number, extra: Partial<Capture> = {}): Capture => ({
  id: `cap_${String(n).padStart(10, "0")}`,
  kind: "opportunity",
  method: "visible-text",
  title: `Listing ${n}`,
  text: "Requirements:\n- TypeScript",
  pageUrl: "https://jobs.example.org/1",
  capturedAt: "2026-10-22T10:00:00.000Z",
  confirmedAt: "2026-10-22T10:00:01.000Z",
  ...extra,
});

const APP: Sender = { origin: "http://localhost:3000", url: "http://localhost:3000/inbox", frameId: 0 };

describe("background router: only the configured local app may read the queue", () => {
  let area: ReturnType<typeof memoryArea>;
  let outbox: ReturnType<typeof createOutbox>;
  beforeEach(async () => {
    area = memoryArea();
    outbox = createOutbox(area);
    await outbox.add(capture(1));
  });

  it("serves ping, list and ack to the app origin", async () => {
    expect(await handleAppMessage(appRequest("ping"), APP, outbox)).toEqual({ ok: true, type: "pong" });
    expect(await handleAppMessage(appRequest("list"), APP, outbox)).toEqual({ ok: true, type: "captures", captures: [capture(1)] });
    expect(await handleAppMessage(appRequest("ack", { ids: [capture(1).id] }), APP, outbox)).toEqual({
      ok: true,
      type: "acked",
      removed: 1,
    });
    expect(await outbox.list()).toEqual([]);
  });

  it.each<[string, Sender]>([
    ["a remote web page", { origin: "https://evil.example", url: "https://evil.example/", frameId: 0 }],
    ["a look-alike host", { origin: "http://localhost.evil.example:3000", frameId: 0 }],
    ["another local port", { origin: "http://localhost:8080", frameId: 0 }],
    ["127.0.0.1 when the app is configured as localhost", { origin: "http://127.0.0.1:3000", frameId: 0 }],
    ["an iframe inside the app", { ...APP, frameId: 3 }],
    ["another extension", { id: "abcdefghijklmnopabcdefghijklmnop", origin: "chrome-extension://abcdefghijklmnopabcdefghijklmnop" }],
    ["a sender with no origin", { frameId: 0 }],
  ])("refuses %s and leaks nothing", async (_label, sender) => {
    for (const req of [appRequest("ping"), appRequest("list"), appRequest("ack", { ids: [capture(1).id] })]) {
      const res = await handleAppMessage(req, sender, outbox);
      expect(res.ok).toBe(false);
      expect(JSON.stringify(res)).not.toContain("Listing 1");
    }
    expect(await outbox.list()).toHaveLength(1);
  });

  it("refuses anything outside the protocol — the app cannot create or edit captures", async () => {
    for (const msg of [
      { protocol: "proofbridge.capture", version: 1, type: "save", capture: capture(2) },
      { ...appRequest("list"), version: 99 },
      { ...appRequest("list"), extra: "x" },
      { type: "list" },
      "list",
      null,
      { __proto__: { type: "list" } },
    ]) {
      expect(await handleAppMessage(msg, APP, outbox)).toEqual({ ok: false, error: "Unsupported request." });
    }
    expect((await outbox.list()).map((c) => c.id)).toEqual([capture(1).id]);
  });

  it("follows the app address the user configured", async () => {
    await outbox.setAppUrl("http://127.0.0.1:5290/inbox");
    expect((await handleAppMessage(appRequest("ping"), APP, outbox)).ok).toBe(false);
    expect(await handleAppMessage(appRequest("ping"), { origin: "http://127.0.0.1:5290", frameId: 0 }, outbox)).toEqual({
      ok: true,
      type: "pong",
    });
  });
});

describe("outbox", () => {
  it("drops tampered stored entries instead of handing them to the app", async () => {
    const area = memoryArea();
    const outbox = createOutbox(area);
    area.dump.outbox = [capture(1), { ...capture(2), pageUrl: "javascript:alert(1)" }, { ...capture(3), html: "<script>" }, "junk"];
    expect((await outbox.list()).map((c) => c.id)).toEqual([capture(1).id]);
  });

  it("is bounded", async () => {
    const outbox = createOutbox(memoryArea());
    for (let i = 0; i < MAX_OUTBOX; i++) await outbox.add(capture(i));
    await expect(outbox.add(capture(999))).rejects.toThrow(/queue is full/);
  });

  it("only stores local app addresses", async () => {
    expect(normalizeAppUrl(" http://localhost:5290/inbox ")).toBe("http://localhost:5290");
    for (const bad of ["https://proofbridge.example", "http://localhost.evil.example", "file:///x", "not a url"]) {
      expect(() => normalizeAppUrl(bad), bad).toThrow();
    }
    const area = memoryArea();
    area.dump.appUrl = "https://evil.example";
    expect(await createOutbox(area).getAppUrl()).toBe("http://localhost:3000");
  });
});
