import { Dataset, type Dataset as DatasetT } from "@proofbridge/core";

/**
 * FULLY SYNTHETIC demo data (directive §3). DEMO / SYNTHETIC — not a real person.
 * No real identity, nationality, legal status, credential, or secret appears here (§6, §10.16).
 *
 * Engineered to produce the exact hero-workflow states:
 *   TypeScript  -> Supported        (source-present)
 *   PostgreSQL  -> Supported        (source-present)
 *   Deployment  -> Uncertain        (user-stated only, no proof)
 *   2 case studies -> Not yet supported (only one present)
 *   Language    -> Unknown          (never stated)
 *
 * Integrity hashes below are synthetic placeholders in valid SHA-256 shape; real imports
 * compute genuine digests from actual bytes in Phase 1 (packages/evidence).
 */

const T = "2026-10-20T10:00:00.000Z";

const raw: DatasetT = {
  profile: {
    id: "person-demo",
    displayName: "Sam Rivers (DEMO)",
    headline: "Self-taught full-stack developer",
    locales: ["en"],
    createdAt: T,
    updatedAt: T,
  },
  sources: [
    { id: "src-repo", kind: "import", label: "ledgerline repo export (.zip)", origin: "ledgerline.zip", capturedAt: T, integritySha256: "a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4a1b2c3d4", freshness: "fresh", createdAt: T, updatedAt: T },
    { id: "src-writeup", kind: "local-file", label: "customer dashboard write-up.md", origin: "casestudy-1.md", capturedAt: T, freshness: "fresh", createdAt: T, updatedAt: T },
    { id: "src-cert", kind: "local-file", label: "Relational Databases certificate.pdf", origin: "db-cert.pdf", capturedAt: T, integritySha256: "beef0011beef0011beef0011beef0011beef0011beef0011beef0011beef0011", freshness: "fresh", createdAt: T, updatedAt: T },
    { id: "src-manual", kind: "manual", label: "manual note", capturedAt: T, freshness: "fresh", createdAt: T, updatedAt: T },
  ],
  artifacts: [
    { id: "art-repo", sourceId: "src-repo", title: "ledgerline — TypeScript budgeting CLI", artifactType: "repository-export", mediaType: "application/zip", bytes: 48213, visibility: "private", createdAt: T, updatedAt: T },
    { id: "art-writeup", sourceId: "src-writeup", title: "Case study: customer dashboard", artifactType: "project-writeup", mediaType: "text/markdown", bytes: 5120, visibility: "private", createdAt: T, updatedAt: T },
    { id: "art-cert", sourceId: "src-cert", title: "Relational Databases course certificate", artifactType: "certificate", mediaType: "application/pdf", bytes: 90112, visibility: "private", createdAt: T, updatedAt: T },
    { id: "art-manual", sourceId: "src-manual", title: "Deployment note", artifactType: "manual-entry", visibility: "private", createdAt: T, updatedAt: T },
  ],
  claims: [
    { id: "claim-ts", artifactId: "art-repo", statement: "Built a TypeScript CLI with typed, tested domain modules.", verification: "source-present", attribution: "human", review: "accepted", visibility: "private", createdAt: T, updatedAt: T },
    { id: "claim-pg", artifactId: "art-cert", statement: "Completed coursework in PostgreSQL schema design and indexing.", verification: "source-present", attribution: "human", review: "accepted", visibility: "private", createdAt: T, updatedAt: T },
    { id: "claim-deploy", artifactId: "art-manual", statement: "Deployed the budgeting app to production once (self-reported).", verification: "user-stated", attribution: "human", review: "unreviewed", visibility: "private", createdAt: T, updatedAt: T },
    { id: "claim-case1", artifactId: "art-writeup", statement: "Reduced a client's manual data entry by redesigning their intake flow.", verification: "source-present", attribution: "human", review: "accepted", visibility: "private", createdAt: T, updatedAt: T },
  ],
  skills: [
    { id: "skill-ts", key: "typescript", label: "TypeScript" },
    { id: "skill-pg", key: "postgresql", label: "PostgreSQL" },
    { id: "skill-deploy", key: "deployment", label: "Deployment experience" },
  ],
  claimSkillLinks: [
    { id: "csl-ts", claimId: "claim-ts", skillId: "skill-ts", attribution: "human", review: "accepted" },
    { id: "csl-pg", claimId: "claim-pg", skillId: "skill-pg", attribution: "human", review: "accepted" },
    { id: "csl-deploy", claimId: "claim-deploy", skillId: "skill-deploy", attribution: "human", review: "unreviewed" },
  ],
  opportunities: [
    {
      id: "opp-demo",
      title: "Junior Full-Stack Developer (DEMO / SYNTHETIC)",
      organisation: "Example Co. (synthetic)",
      synthetic: true,
      retrievedAt: T,
      rawText:
        "We are looking for TypeScript and PostgreSQL skills, deployment experience, two project case studies, and a working language requirement.",
      createdAt: T,
      updatedAt: T,
    },
  ],
  requirements: [
    { id: "req-ts", opportunityId: "opp-demo", label: "TypeScript", kind: "skill", target: "typescript", needsAuthoritativeConfirmation: false },
    { id: "req-pg", opportunityId: "opp-demo", label: "PostgreSQL", kind: "skill", target: "postgresql", needsAuthoritativeConfirmation: false },
    { id: "req-deploy", opportunityId: "opp-demo", label: "Deployment experience", kind: "skill", target: "deployment", needsAuthoritativeConfirmation: false },
    { id: "req-cases", opportunityId: "opp-demo", label: "Two project case studies", kind: "count", target: "project-writeup", requiredCount: 2, needsAuthoritativeConfirmation: false },
    { id: "req-lang", opportunityId: "opp-demo", label: "Working language requirement", kind: "attribute", target: "language", needsAuthoritativeConfirmation: false },
  ],
  requirementEvidenceLinks: [
    { id: "rel-ts", requirementId: "req-ts", claimId: "claim-ts", attribution: "human", review: "accepted" },
    { id: "rel-pg", requirementId: "req-pg", claimId: "claim-pg", attribution: "human", review: "accepted" },
    { id: "rel-case1", requirementId: "req-cases", claimId: "claim-case1", attribution: "human", review: "accepted" },
  ],
  bridgeTasks: [
    { id: "task-case2", requirementId: "req-cases", title: "Write a second case study from a real project.", estimateHours: 4, done: false, createdAt: T, updatedAt: T },
    { id: "task-deploy", requirementId: "req-deploy", title: "Attach deployment proof (build log or live URL).", estimateHours: 1, done: false, createdAt: T, updatedAt: T },
    { id: "task-lang", requirementId: "req-lang", title: "State working-language level and attach supporting evidence.", estimateHours: 1, done: false, createdAt: T, updatedAt: T },
  ],
};

/** Returns a fresh, schema-validated copy of the synthetic dataset. */
export function demoDataset(): DatasetT {
  return Dataset.parse(structuredClone(raw));
}
