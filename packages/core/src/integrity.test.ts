import { describe, expect, it } from "vitest";
import {
  DatasetSchema,
  EvidenceArtifactSchema,
  SCHEMA_VERSION,
  countRequirementStatuses,
  findDanglingReferences,
  findDuplicateIds,
  type Dataset,
} from "./index";

const empty = (): Dataset =>
  DatasetSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    profiles: [],
    sources: [],
    artifacts: [],
    claims: [],
    skills: [],
    claimSkillLinks: [],
    opportunities: [],
    requirements: [],
    requirementEvidenceLinks: [],
    bridgeTasks: [],
  });

const at = "2026-01-01T00:00:00.000Z";

describe("schemas", () => {
  it("rejects malformed ids and hashes", () => {
    const base = {
      id: "art_x",
      createdAt: at,
      updatedAt: at,
      sourceId: "source_x",
      title: "t",
      kind: "note",
      mediaType: "text/plain",
      visibility: "private",
    };
    expect(EvidenceArtifactSchema.safeParse(base).success).toBe(true);
    expect(EvidenceArtifactSchema.safeParse({ ...base, id: "Bad Id" }).success).toBe(false);
    expect(EvidenceArtifactSchema.safeParse({ ...base, sha256: "abc" }).success).toBe(false);
  });

  it("defaults records to non-demo", () => {
    const parsed = EvidenceArtifactSchema.parse({
      id: "art_x",
      createdAt: at,
      updatedAt: at,
      sourceId: "source_x",
      title: "t",
      kind: "note",
      mediaType: "text/plain",
      visibility: "private",
    });
    expect(parsed.demo).toBe(false);
  });
});

describe("integrity", () => {
  it("reports dangling foreign keys", () => {
    const d = empty();
    d.claims.push({
      id: "claim_orphan",
      demo: false,
      createdAt: at,
      updatedAt: at,
      artifactId: "art_missing",
      statement: "s",
      basis: "user-stated",
      attribution: "human",
      reviewState: "unreviewed",
      visibility: "private",
    });
    expect(findDanglingReferences(d)).toEqual([
      { table: "claims", id: "claim_orphan", field: "artifactId", missing: "art_missing" },
    ]);
  });

  it("reports ids duplicated across tables", () => {
    const d = empty();
    const skill = { id: "skill_ts", demo: false, createdAt: at, updatedAt: at, name: "TS", aliases: [] };
    d.skills.push(skill, { ...skill });
    expect(findDuplicateIds(d)).toEqual(["skill_ts"]);
  });

  it("counts requirement statuses explicitly", () => {
    expect(
      countRequirementStatuses([{ status: "supported" }, { status: "supported" }, { status: "unknown" }]),
    ).toEqual({ supported: 2, uncertain: 0, "not-yet-supported": 0, "not-applicable": 0, unknown: 1 });
  });
});
