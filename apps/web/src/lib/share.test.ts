import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDossier, openShare } from "@proofbridge/core";
import { demoDataset } from "@proofbridge/fixtures";
import { createShare, loadShareSettings, newShareSettings, normaliseServerUrl, saveShareSettings } from "./share";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("online share client", () => {
  it("accepts https or loopback http only, and reduces the address to its origin", () => {
    expect(normaliseServerUrl("http://localhost:8787/x?y#z")).toBe("http://localhost:8787");
    expect(normaliseServerUrl("https://share.example.org")).toBe("https://share.example.org");
    expect(() => normaliseServerUrl("http://share.example.org")).toThrow(/https/);
    expect(() => normaliseServerUrl("https://u:p@share.example.org")).toThrow(/password/);
    expect(() => normaliseServerUrl("javascript:alert(1)")).toThrow();
    expect(() => normaliseServerUrl("nope")).toThrow(/full address/);
  });

  it("uploads only ciphertext; the key exists only in the link fragment", async () => {
    const settings = newShareSettings("http://localhost:8787");
    const dossier = buildDossier(demoDataset, demoDataset.opportunities[0]!.id, "2026-10-22T00:00:00.000Z");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "A".repeat(22), expiresAt: "2026-10-23T00:00:00.000Z" }), { status: 201 }),
    );
    const share = await createShare(settings, dossier, 86_400);

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("http://localhost:8787/api/shares");
    expect(init).toMatchObject({ method: "POST", credentials: "omit", referrerPolicy: "no-referrer" });
    const sent = String(init!.body);
    expect(sent).not.toContain(dossier.opportunity.title);
    expect(Object.keys(JSON.parse(sent)).sort()).toEqual(["ciphertext", "iv", "ttlSeconds"]);

    const [base, key] = share.link.split("#k=");
    expect(base).toBe(`http://localhost:8787/s/${"A".repeat(22)}`);
    expect(sent).not.toContain(key!);
    const { iv, ciphertext } = JSON.parse(sent);
    expect(await openShare({ iv, ciphertext }, key!)).toEqual(JSON.parse(JSON.stringify(dossier)));
  });

  it("persists settings locally and ignores corrupted storage", () => {
    const s = newShareSettings("http://127.0.0.1:8787");
    saveShareSettings(s);
    expect(loadShareSettings()).toEqual(s);
    localStorage.setItem("proofbridge.share.v1", '{"serverUrl":"http://evil.example","ownerKey":"x","shares":[]}');
    expect(loadShareSettings()).toBeNull();
    localStorage.setItem("proofbridge.share.v1", "{broken");
    expect(loadShareSettings()).toBeNull();
  });
});
