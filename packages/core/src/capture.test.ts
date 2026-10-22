import { describe, expect, it } from "vitest";
import {
  AppRequestSchema,
  AppResponseSchema,
  CaptureSchema,
  MAX_CAPTURE_CHARS,
  appRequest,
  captureSourceLabel,
  isLocalAppOrigin,
  parseCaptureFile,
  sanitizeCapturedText,
  sanitizeCapturedTitle,
  sanitizePageUrl,
  type Capture,
} from "./capture";
import { addEvidence, addOpportunity, sequentialIds } from "./ops";
import { DatasetSchema, ENTITY_TABLES, SCHEMA_VERSION } from "./schemas";

const capture: Capture = {
  id: "cap_abcdefghij",
  kind: "opportunity",
  method: "visible-text",
  title: "Junior web developer",
  text: "Requirements:\n- TypeScript\n- Two case studies of past work",
  pageUrl: "https://jobs.example.org/listing/42",
  capturedAt: "2026-10-22T10:00:00.000Z",
  confirmedAt: "2026-10-22T10:00:05.000Z",
};

describe("capture sanitising (page text is hostile data)", () => {
  it("strips controls, bidi overrides and zero-width characters but keeps text and newlines", () => {
    const [rlo, zwsp, bom] = [0x202e, 0x200b, 0xfeff].map((c) => String.fromCodePoint(c));
    const raw = `Re${rlo}quirements:\r\n\u0000- Type${zwsp}Script\u0007\t \n\n\n\n- Rust${bom}`;
    expect(sanitizeCapturedText(raw)).toEqual({ text: "Requirements:\n- TypeScript\n\n- Rust", truncated: false });
  });

  it("bounds length and reports truncation", () => {
    const r = sanitizeCapturedText("x".repeat(MAX_CAPTURE_CHARS * 5));
    expect(r.truncated).toBe(true);
    expect(r.text).toHaveLength(MAX_CAPTURE_CHARS);
  });

  it("treats markup as inert text and non-strings as empty", () => {
    expect(sanitizeCapturedText("<img src=x onerror=alert(1)>").text).toBe("<img src=x onerror=alert(1)>");
    expect(sanitizeCapturedText({ toString: () => "evil" })).toEqual({ text: "", truncated: false });
    expect(sanitizeCapturedText(undefined).text).toBe("");
  });

  it("makes single-line bounded titles", () => {
    expect(sanitizeCapturedTitle(`  Job\n\n title ${String.fromCodePoint(0x202e)} `)).toBe("Job title");
    expect(sanitizeCapturedTitle("t".repeat(1000))).toHaveLength(200);
  });

  it("drops credentials, fragments and secret-looking query parameters from page URLs", () => {
    expect(sanitizePageUrl("https://user:pw@jobs.example.org/x?id=7&access_token=abc&keywords=ts&sessionid=1#frag")).toBe(
      "https://jobs.example.org/x?id=7&keywords=ts",
    );
    expect(sanitizePageUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizePageUrl("file:///etc/passwd")).toBeNull();
    expect(sanitizePageUrl("chrome://settings")).toBeNull();
    expect(sanitizePageUrl(42)).toBeNull();
  });
});

describe("app origin allowlist", () => {
  it("accepts only local origins", () => {
    for (const ok of ["http://localhost:3000", "http://127.0.0.1:5290", "https://localhost"]) {
      expect(isLocalAppOrigin(ok), ok).toBe(true);
    }
    for (const bad of [
      "https://localhost.evil.example",
      "http://evil.example",
      "http://127.0.0.2:3000",
      "http://[::1]:3000",
      "http://localhost:3000/path",
      "http://user@localhost:3000",
      "chrome-extension://abc",
      "null",
      "",
      undefined,
      null,
    ]) {
      expect(isLocalAppOrigin(bad), String(bad)).toBe(false);
    }
  });
});

describe("protocol schemas", () => {
  it("accepts well-formed requests and refuses anything else", () => {
    expect(AppRequestSchema.safeParse(appRequest("list")).success).toBe(true);
    expect(AppRequestSchema.safeParse(appRequest("ack", { ids: [capture.id] })).success).toBe(true);
    for (const bad of [
      { type: "list" },
      { ...appRequest("list"), version: 2 },
      { ...appRequest("list"), extra: true },
      { ...appRequest("ack", { ids: [capture.id] }), ids: ["../../etc"] },
      appRequest("ack", { ids: [] }),
      { protocol: "proofbridge.capture", version: 1, type: "save", capture },
      "list",
      null,
    ]) {
      expect(AppRequestSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it("validates captures strictly", () => {
    expect(CaptureSchema.safeParse(capture).success).toBe(true);
    expect(CaptureSchema.safeParse({ ...capture, pageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(CaptureSchema.safeParse({ ...capture, text: "  " }).success).toBe(false);
    expect(CaptureSchema.safeParse({ ...capture, html: "<b>x</b>" }).success).toBe(false);
    expect(AppResponseSchema.safeParse({ ok: true, type: "captures", captures: [capture] }).success).toBe(true);
    expect(AppResponseSchema.safeParse({ ok: true, type: "captures", captures: [{ ...capture, id: "x" }] }).success).toBe(false);
  });

  it("parses the manual capture file and rejects junk", () => {
    const file = JSON.stringify({ protocol: "proofbridge.capture", version: 1, kind: "capture-file", captures: [capture] });
    expect(parseCaptureFile(file).captures).toHaveLength(1);
    expect(() => parseCaptureFile("{not json")).toThrow(/not valid JSON/);
    expect(() => parseCaptureFile(JSON.stringify({ captures: [capture] }))).toThrow(/not a ProofBridge capture file/);
    expect(() => parseCaptureFile(" ".repeat(2 * 1024 * 1024))).toThrow(/larger than 1 MB/);
  });
});

describe("importing a capture keeps its provenance", () => {
  const t = "2026-10-22T00:00:00.000Z";
  const empty = DatasetSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    ...Object.fromEntries(ENTITY_TABLES.map((k) => [k, []])),
    skills: [{ id: "skill_ts", name: "TypeScript", createdAt: t, updatedAt: t }],
  });
  const ctx = { now: "2026-10-22T11:00:00.000Z", newId: sequentialIds("cap") };

  it("as an opportunity: source label, URI and retrieval time come from the capture", () => {
    const { data, opportunityId } = addOpportunity(
      empty,
      {
        title: capture.title,
        kind: "job",
        rawText: capture.text,
        sourceLabel: captureSourceLabel(capture),
        sourceUri: capture.pageUrl,
        retrievedAt: capture.capturedAt,
      },
      ctx,
    );
    const opp = data.opportunities.find((o) => o.id === opportunityId)!;
    expect(opp).toMatchObject({
      sourceLabel: "Browser capture cap_abcdefghij · jobs.example.org",
      sourceUri: capture.pageUrl,
      retrievedAt: capture.capturedAt,
    });
    expect(data.requirements.filter((r) => r.opportunityId === opportunityId)).toHaveLength(2);
  });

  it("as evidence: captureMethod selected-webpage with the page URI", () => {
    const { data, artifactId } = addEvidence(
      empty,
      {
        title: "Excerpt",
        kind: "note",
        content: "Selected text",
        captureMethod: "selected-webpage",
        sourceLabel: captureSourceLabel(capture),
        sourceUri: capture.pageUrl,
        capturedAt: capture.capturedAt,
        claim: "Shows a thing",
      },
      ctx,
    );
    const art = data.artifacts.find((a) => a.id === artifactId)!;
    const source = data.sources.find((s) => s.id === art.sourceId)!;
    expect(source).toMatchObject({ captureMethod: "selected-webpage", uri: capture.pageUrl, capturedAt: capture.capturedAt });
    expect(DatasetSchema.safeParse(data).success).toBe(true);
  });
});
