import { describe, expect, it } from "vitest";
import type { Dataset as DatasetT } from "./schema";
import { evaluateRequirement } from "./match";

/**
 * Pure matcher-logic tests on a tiny inline dataset (no fixtures import, so core stays
 * dependency-free). The exact §3 hero-workflow states are asserted in @proofbridge/fixtures.
 */
const T = "2026-10-20T10:00:00.000Z";

function base(): DatasetT {
  return {
    profile: { id: "p", displayName: "t", locales: ["en"], createdAt: T, updatedAt: T },
    sources: [{ id: "s", kind: "manual", label: "s", capturedAt: T, freshness: "fresh", createdAt: T, updatedAt: T }],
    artifacts: [{ id: "a", sourceId: "s", title: "a", artifactType: "manual-entry", visibility: "private", createdAt: T, updatedAt: T }],
    claims: [],
    skills: [{ id: "sk", key: "typescript", label: "TypeScript" }],
    claimSkillLinks: [],
    opportunities: [{ id: "o", title: "o", synthetic: true, createdAt: T, updatedAt: T }],
    requirements: [{ id: "r", opportunityId: "o", label: "TypeScript", kind: "skill", target: "typescript", needsAuthoritativeConfirmation: false }],
    requirementEvidenceLinks: [],
    bridgeTasks: [],
  };
}

const req = (d: DatasetT) => d.requirements[0]!;

describe("deterministic skill matching", () => {
  it("no claim -> not-yet-supported", () => {
    expect(evaluateRequirement(base(), req(base())).status).toBe("not-yet-supported");
  });

  it("source-present claim -> supported", () => {
    const d = base();
    d.claims.push({ id: "c", artifactId: "a", statement: "ts", verification: "source-present", attribution: "human", review: "accepted", visibility: "private", createdAt: T, updatedAt: T });
    d.claimSkillLinks.push({ id: "l", claimId: "c", skillId: "sk", attribution: "human", review: "accepted" });
    expect(evaluateRequirement(d, req(d)).status).toBe("supported");
  });

  it("user-stated claim -> uncertain (never auto-Supported)", () => {
    const d = base();
    d.claims.push({ id: "c", artifactId: "a", statement: "ts", verification: "user-stated", attribution: "human", review: "unreviewed", visibility: "private", createdAt: T, updatedAt: T });
    d.claimSkillLinks.push({ id: "l", claimId: "c", skillId: "sk", attribution: "human", review: "unreviewed" });
    expect(evaluateRequirement(d, req(d)).status).toBe("uncertain");
  });

  it("unreviewed AI suggestion does not support a requirement", () => {
    const d = base();
    d.claims.push({ id: "c", artifactId: "a", statement: "ts", verification: "source-present", attribution: "ai-suggestion", review: "unreviewed", visibility: "private", createdAt: T, updatedAt: T });
    d.claimSkillLinks.push({ id: "l", claimId: "c", skillId: "sk", attribution: "ai-suggestion", review: "unreviewed" });
    expect(evaluateRequirement(d, req(d)).status).toBe("not-yet-supported");
  });

  it("count requirement: below required -> not-yet-supported", () => {
    const d = base();
    d.requirements[0] = { id: "r", opportunityId: "o", label: "Two writeups", kind: "count", target: "project-writeup", requiredCount: 2, needsAuthoritativeConfirmation: false };
    expect(evaluateRequirement(d, req(d)).status).toBe("not-yet-supported");
  });

  it("attribute requirement with no stated value -> unknown", () => {
    const d = base();
    d.requirements[0] = { id: "r", opportunityId: "o", label: "Language", kind: "attribute", target: "language", needsAuthoritativeConfirmation: false };
    expect(evaluateRequirement(d, req(d)).status).toBe("unknown");
  });
});
