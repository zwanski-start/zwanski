import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { countRequirementStatuses, findDanglingReferences, findDuplicateIds } from "@proofbridge/core";
import { DEMO_ARTIFACT_CONTENTS, demoDataset } from "./index";

describe("demo fixture (DEMO / SYNTHETIC)", () => {
  it("marks every record as demo data", () => {
    const { schemaVersion: _v, ...tables } = demoDataset;
    for (const rows of Object.values(tables)) for (const row of rows) expect(row.demo).toBe(true);
  });

  it("is referentially intact with globally unique ids", () => {
    expect(findDanglingReferences(demoDataset)).toEqual([]);
    expect(findDuplicateIds(demoDataset)).toEqual([]);
  });

  it("stores the SHA-256 of each artifact's synthetic bytes", () => {
    for (const art of demoDataset.artifacts) {
      const bytes = DEMO_ARTIFACT_CONTENTS[art.id as keyof typeof DEMO_ARTIFACT_CONTENTS];
      expect(bytes, art.id).toBeDefined();
      expect(art.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    }
  });

  it("encodes the §3 hero-workflow starting states", () => {
    const status = Object.fromEntries(demoDataset.requirements.map((r) => [r.id, r.status]));
    expect(status).toEqual({
      req_typescript: "supported",
      req_postgresql: "supported",
      req_deployment: "uncertain",
      "req_case-studies": "not-yet-supported",
      req_language: "unknown",
    });
    expect(countRequirementStatuses(demoDataset.requirements).supported).toBe(2);
  });

  it("never claims issuer verification or contains real-looking contact data", () => {
    expect(demoDataset.claims.some((c) => c.basis === "issuer-verified")).toBe(false);
    const text = JSON.stringify(demoDataset) + JSON.stringify(DEMO_ARTIFACT_CONTENTS);
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/); // no email addresses
    expect(text).not.toMatch(/https?:\/\//); // no external URLs → no network fetches
  });
});
