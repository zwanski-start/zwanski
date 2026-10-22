import { describe, expect, it } from "vitest";
import {
  addEvidence,
  buildDossier,
  deleteArtifact,
  deleteClaim,
  findDanglingReferences,
  findDuplicateIds,
  historyForArtifact,
  linkEvidence,
  parseBackup,
  parseRequirements,
  rematch,
  reviewLink,
  serializeBackup,
  sequentialIds,
  setProfileLanguages,
  setRequirementOverride,
  updateArtifact,
  type Dataset,
  type OpContext,
} from "@proofbridge/core";
import { demoDataset } from "./index";

/**
 * Deterministic end-to-end coverage of every §3 hero-workflow transition at the domain level:
 * the same pure operations the web app persists to IndexedDB.
 */

const OPP = "opp_junior-fullstack";
const ctx = (): OpContext => ({ now: "2026-03-01T12:00:00.000Z", newId: sequentialIds("hw") });
const statuses = (d: Dataset) => Object.fromEntries(d.requirements.map((r) => [r.id, r.status]));
const linkedClaims = (d: Dataset, reqId: string) =>
  d.requirementEvidenceLinks
    .filter((l) => l.requirementId === reqId && l.reviewState !== "rejected")
    .map((l) => l.claimId)
    .sort();
const START = {
  req_typescript: "supported",
  req_postgresql: "supported",
  req_deployment: "uncertain",
  "req_case-studies": "not-yet-supported",
  req_language: "unknown",
} as const;

const intact = (d: Dataset) => {
  expect(findDanglingReferences(d)).toEqual([]);
  expect(findDuplicateIds(d)).toEqual([]);
};

const secondCaseStudy = {
  title: "Case study: volunteer sign-up tracker",
  kind: "write-up",
  content: "DEMO / SYNTHETIC anonymized write-up: a sign-up tracker for a fictional community group.",
  captureMethod: "manual",
  sourceLabel: "Anonymized client write-up #2 (synthetic)",
  claim: "Delivered a sign-up tracker for a community group (anonymized case study).",
  visibility: "dossier-only",
} as const;

describe("§3 hero workflow (deterministic)", () => {
  it("parses the listing into the five fixture requirements without a model", () => {
    const opp = demoDataset.opportunities.find((o) => o.id === OPP)!;
    const parsed = parseRequirements(opp.rawText, demoDataset.skills);
    expect(parsed).toEqual(
      demoDataset.requirements.map(({ text, category, skillId, minCount }) => ({
        text,
        category,
        ...(skillId ? { skillId } : {}),
        ...(minCount ? { minCount } : {}),
      })),
    );
  });

  it("starts in the §3 states with source-linked evidence", () => {
    expect(statuses(demoDataset)).toEqual(START);
    expect(linkedClaims(demoDataset, "req_typescript")).toEqual(["claim_repo-typescript"]);
    expect(linkedClaims(demoDataset, "req_postgresql")).toEqual(["claim_course-databases", "claim_repo-postgres"]);
    expect(linkedClaims(demoDataset, "req_deployment")).toEqual([]);
    expect(linkedClaims(demoDataset, "req_case-studies")).toEqual(["claim_case-study-1"]);
    expect(demoDataset.requirements.find((r) => r.id === "req_case-studies")!.rationale).toBe(
      "1 of 2 case studies in the vault.",
    );
    intact(demoDataset);
  });

  it("is a fixed point of the matcher (rematching changes nothing)", () => {
    expect(rematch(demoDataset, "2030-01-01T00:00:00.000Z")).toEqual(demoDataset);
  });

  it("adding a second case study → Supported; removing its claim → Not yet supported", () => {
    const added = addEvidence(demoDataset, secondCaseStudy, ctx());
    expect(statuses(added.data)).toEqual({ ...START, "req_case-studies": "supported" });
    expect(linkedClaims(added.data, "req_case-studies")).toEqual(["claim_case-study-1", added.claimId].sort());
    expect(added.data.requirementEvidenceLinks.filter((l) => l.requirementId === "req_case-studies").map((l) => l.relationship)).toEqual(["supports", "supports"]);
    intact(added.data);

    // The dossier preview reads the same persisted state.
    const dossier = buildDossier(added.data, OPP, ctx().now);
    const cs = dossier.requirements.find((r) => r.text === "Two case studies of past work")!;
    expect(cs.status).toBe("supported");
    expect(cs.evidence.map((e) => e.artifact.title)).toContain(secondCaseStudy.title);

    const removed = deleteClaim(added.data, added.claimId, ctx());
    expect(statuses(removed)).toEqual(START);
    expect(linkedClaims(removed, "req_case-studies")).toEqual(["claim_case-study-1"]);
    expect(buildDossier(removed, OPP, ctx().now).requirements.find((r) => r.text === "Two case studies of past work")!.status).toBe(
      "not-yet-supported",
    );
    intact(removed);
    // History keeps both the creation and the deletion.
    expect(historyForArtifact(removed, added.artifactId).map((e) => e.action).sort()).toEqual(["create", "delete"]);
  });

  it("deployment: Uncertain → Supported with proof; rejecting the link reverts it and sticks", () => {
    const { data, claimId } = addEvidence(
      demoDataset,
      {
        title: "Deployment log (synthetic)",
        kind: "note",
        content: "DEMO / SYNTHETIC: deployed taskboard-lite to a static host.",
        captureMethod: "manual",
        sourceLabel: "Manual note",
        claim: "Deployed taskboard-lite to a static host.",
        skillIds: ["skill_deployment"],
      },
      ctx(),
    );
    expect(statuses(data).req_deployment).toBe("supported");
    const link = data.requirementEvidenceLinks.find((l) => l.requirementId === "req_deployment" && l.claimId === claimId)!;
    expect(link.attribution).toBe("parser");

    const rejected = reviewLink(data, link.id, "rejected", ctx());
    expect(statuses(rejected).req_deployment).toBe("uncertain");
    // The rejection persists through further rematching.
    expect(statuses(rematch(rejected, ctx().now)).req_deployment).toBe("uncertain");
    expect(statuses(reviewLink(rejected, link.id, "approved", ctx())).req_deployment).toBe("supported");
  });

  it("unverified-only evidence leaves a skill Uncertain", () => {
    const { data } = addEvidence(
      demoDataset,
      { ...secondCaseStudy, kind: "note", claim: "Maybe deployed once.", basis: "unverified", skillIds: ["skill_deployment"] },
      ctx(),
    );
    expect(statuses(data).req_deployment).toBe("uncertain");
    expect(data.requirements.find((r) => r.id === "req_deployment")!.rationale).toMatch(/unverified/);
  });

  it("language: Unknown → Uncertain when stated → Supported when evidenced", () => {
    const stated = setProfileLanguages(demoDataset, "profile_demo-builder", ["English"], ctx());
    expect(statuses(stated).req_language).toBe("uncertain");

    const { data, claimId } = addEvidence(
      stated,
      { ...secondCaseStudy, kind: "certificate", title: "Language certificate (synthetic)", claim: "Holds a B2 English certificate (synthetic)." },
      ctx(),
    );
    const linked = linkEvidence(data, "req_language", claimId, ctx());
    expect(statuses(linked).req_language).toBe("supported");
    expect(linked.requirementEvidenceLinks.find((l) => l.claimId === claimId && l.requirementId === "req_language")!.attribution).toBe(
      "human",
    );
  });

  it("removing the only TypeScript claim → Uncertain", () => {
    const d = deleteClaim(demoDataset, "claim_repo-typescript", ctx());
    expect(statuses(d)).toEqual({ ...START, req_typescript: "uncertain" });
    intact(d);
  });

  it("deleting an artifact cascades its claims and links", () => {
    const d = deleteArtifact(demoDataset, "art_repo-export", ctx());
    expect(d.claims.some((c) => c.artifactId === "art_repo-export")).toBe(false);
    expect(d.sources.some((s) => s.id === "source_repo-export")).toBe(false);
    expect(statuses(d)).toMatchObject({ req_typescript: "uncertain", req_postgresql: "supported" });
    intact(d);
  });

  it("a human override wins until cleared, and the matcher's view stays visible", () => {
    const o = setRequirementOverride(demoDataset, "req_language", "not-applicable", "Listing is in my native language", ctx());
    expect(statuses(o).req_language).toBe("not-applicable");
    expect(o.requirements.find((r) => r.id === "req_language")!.rationale).toMatch(/^Set by you: Listing is in my native language \(Matcher:/);
    expect(statuses(rematch(o, ctx().now)).req_language).toBe("not-applicable");
    expect(statuses(setRequirementOverride(o, "req_language", null, "", ctx())).req_language).toBe("unknown");
  });

  it("redaction and visibility changes are recorded and respected by the dossier", () => {
    const before = buildDossier(demoDataset, OPP, ctx().now);
    const redacted = updateArtifact(demoDataset, "art_case-study-1", { redaction: "redacted" }, ctx());
    const after = buildDossier(redacted, OPP, ctx().now);
    expect(after.withheld).toBe(before.withheld + 1);
    expect(JSON.stringify(after)).not.toContain("repair-shop");
    // Redaction hides it from sharing; it is still evidence in the private vault.
    expect(statuses(redacted)).toEqual(START);
    expect(historyForArtifact(redacted, "art_case-study-1")[0]!.summary).toBe("Changed redaction: none → redacted");
    // Private claims never appear in a dossier.
    expect(JSON.stringify(before)).not.toContain("Completed a relational databases course.");
    expect(before.demo).toBe(true);
    expect(before.notice).toMatch(/^DEMO \/ SYNTHETIC\./);
  });

  it("backup export → fresh import restores every relation with no duplicate ids", () => {
    const { data } = addEvidence(demoDataset, secondCaseStudy, ctx());
    const restored = parseBackup(serializeBackup(data));
    expect(restored).toEqual(data);
    intact(restored);

    const dup = JSON.parse(serializeBackup(data)) as Dataset;
    dup.claims.push({ ...dup.claims[0]! });
    expect(() => parseBackup(JSON.stringify(dup))).toThrow(/duplicate ids/);
    const dangling = JSON.parse(serializeBackup(data)) as Dataset;
    dangling.claims[0]!.artifactId = "art_missing";
    expect(() => parseBackup(JSON.stringify(dangling))).toThrow(/broken reference/);
  });
});
