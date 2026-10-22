import { DatasetSchema, SCHEMA_VERSION, rematch, type Dataset, type DatasetInput } from "@proofbridge/core";

/**
 * DEMO / SYNTHETIC — the §3 hero workflow dataset.
 *
 * Every person, organization, project and document below is invented. Nothing here is real
 * personal data, and nothing here should be read as verified. The original "bytes" of each
 * artifact are the synthetic strings in `DEMO_ARTIFACT_CONTENTS`; their SHA-256 digests are
 * checked by the fixture tests.
 */

export const DEMO_LABEL = "DEMO / SYNTHETIC";

const T0 = "2026-01-05T09:00:00.000Z";
const T1 = "2026-01-12T14:30:00.000Z";
const T2 = "2026-01-20T10:15:00.000Z";
const T_OPP = "2026-02-02T08:00:00.000Z";

const stamp = (at: string) => ({ demo: true, createdAt: at, updatedAt: at });

/** Synthetic original contents for each artifact (the bytes that get hashed). */
export const DEMO_ARTIFACT_CONTENTS = {
  "art_repo-export":
    "DEMO / SYNTHETIC repository export: taskboard-lite\n" +
    "README: A small task board written in TypeScript with a PostgreSQL schema and SQL migrations.\n",
  "art_case-study-1":
    "DEMO / SYNTHETIC anonymized client write-up\n" +
    "Built a booking dashboard for a small (fictional) repair shop using TypeScript and PostgreSQL.\n",
  "art_course-cert":
    "DEMO / SYNTHETIC course completion certificate\n" +
    "Learner: Demo Builder. Course: Relational Databases Fundamentals (fictional provider).\n",
} as const;

const input = {
  schemaVersion: SCHEMA_VERSION,
  profiles: [
    {
      id: "profile_demo-builder",
      ...stamp(T0),
      displayName: "Demo Builder",
      headline: "Self-taught developer (synthetic demo profile)",
      languages: [],
    },
  ],
  sources: [
    {
      id: "source_repo-export",
      ...stamp(T0),
      label: "taskboard-lite repository export (synthetic)",
      captureMethod: "local-file",
      capturedAt: T0,
    },
    {
      id: "source_case-study-1",
      ...stamp(T1),
      label: "Anonymized client write-up #1 (synthetic)",
      captureMethod: "manual",
      capturedAt: T1,
    },
    {
      id: "source_course-cert",
      ...stamp(T2),
      label: "Course certificate PDF (synthetic)",
      captureMethod: "local-file",
      capturedAt: T2,
    },
  ],
  artifacts: [
    {
      id: "art_repo-export",
      ...stamp(T0),
      sourceId: "source_repo-export",
      title: "taskboard-lite — repository export",
      kind: "repository",
      mediaType: "text/plain",
      sha256: "fe3aa9de32d187e50a5b3732e672f52185d0868837cd0c0ef608585582267a6e",
      summary: "Task board app in TypeScript with a PostgreSQL schema and migrations.",
      visibility: "private",
    },
    {
      id: "art_case-study-1",
      ...stamp(T1),
      sourceId: "source_case-study-1",
      title: "Case study: repair-shop booking dashboard",
      kind: "write-up",
      mediaType: "text/plain",
      sha256: "84faf8b939751562ccbbf0ff384fdc2e8b68b5f1557d38005c1862e35f81ad85",
      summary: "Anonymized client project write-up describing a TypeScript + PostgreSQL dashboard.",
      visibility: "dossier-only",
    },
    {
      id: "art_course-cert",
      ...stamp(T2),
      sourceId: "source_course-cert",
      title: "Relational Databases Fundamentals — certificate",
      kind: "certificate",
      mediaType: "text/plain",
      sha256: "c72610088ff98f1a97db5d1b172e6a694cae50ee40634ba0ee64d51a806f492a",
      summary: "Course completion certificate from a fictional provider. Not issuer-verified.",
      visibility: "private",
    },
  ],
  claims: [
    {
      id: "claim_repo-typescript",
      ...stamp(T0),
      artifactId: "art_repo-export",
      statement: "Wrote the taskboard-lite application in TypeScript.",
      basis: "source-present",
      attribution: "human",
      reviewState: "approved",
      visibility: "dossier-only",
    },
    {
      id: "claim_repo-postgres",
      ...stamp(T0),
      artifactId: "art_repo-export",
      statement: "Designed a PostgreSQL schema with SQL migrations for taskboard-lite.",
      basis: "source-present",
      attribution: "human",
      reviewState: "approved",
      visibility: "dossier-only",
    },
    {
      id: "claim_case-study-1",
      ...stamp(T1),
      artifactId: "art_case-study-1",
      statement: "Delivered a booking dashboard for a client (anonymized case study).",
      basis: "user-stated",
      attribution: "human",
      reviewState: "approved",
      visibility: "dossier-only",
    },
    {
      id: "claim_course-databases",
      ...stamp(T2),
      artifactId: "art_course-cert",
      statement: "Completed a relational databases course.",
      basis: "source-present",
      attribution: "human",
      reviewState: "approved",
      visibility: "private",
    },
  ],
  skills: [
    { id: "skill_typescript", ...stamp(T0), name: "TypeScript", aliases: ["TS"] },
    { id: "skill_postgresql", ...stamp(T0), name: "PostgreSQL", aliases: ["Postgres", "SQL"] },
    { id: "skill_deployment", ...stamp(T0), name: "Deployment", aliases: ["DevOps", "Hosting", "Deploying", "Deployed"] },
  ],
  claimSkillLinks: [
    {
      id: "csl_repo-typescript",
      ...stamp(T0),
      claimId: "claim_repo-typescript",
      skillId: "skill_typescript",
      attribution: "human",
      reviewState: "approved",
      visibility: "dossier-only",
    },
    {
      id: "csl_repo-postgres",
      ...stamp(T0),
      claimId: "claim_repo-postgres",
      skillId: "skill_postgresql",
      attribution: "human",
      reviewState: "approved",
      visibility: "dossier-only",
    },
    {
      id: "csl_course-postgres",
      ...stamp(T2),
      claimId: "claim_course-databases",
      skillId: "skill_postgresql",
      attribution: "human",
      reviewState: "approved",
      visibility: "private",
    },
  ],
  opportunities: [
    {
      id: "opp_junior-fullstack",
      ...stamp(T_OPP),
      title: "Junior Full-Stack Developer (synthetic listing)",
      organization: "Example Org (fictional)",
      kind: "job",
      sourceLabel: "Pasted listing text (synthetic)",
      retrievedAt: T_OPP,
      location: "Unknown",
      remote: "unknown",
      rawText:
        "DEMO / SYNTHETIC listing. Requirements: TypeScript; PostgreSQL; experience deploying " +
        "web applications; two case studies of past work; professional working proficiency in " +
        "the team language.",
    },
  ],
  requirements: [
    {
      id: "req_typescript",
      ...stamp(T_OPP),
      opportunityId: "opp_junior-fullstack",
      text: "TypeScript",
      category: "skill",
      skillId: "skill_typescript",
      status: "supported",
    },
    {
      id: "req_postgresql",
      ...stamp(T_OPP),
      opportunityId: "opp_junior-fullstack",
      text: "PostgreSQL",
      category: "skill",
      skillId: "skill_postgresql",
      status: "supported",
    },
    {
      id: "req_deployment",
      ...stamp(T_OPP),
      opportunityId: "opp_junior-fullstack",
      text: "Experience deploying web applications",
      category: "experience",
      skillId: "skill_deployment",
      status: "uncertain",
    },
    {
      id: "req_case-studies",
      ...stamp(T_OPP),
      opportunityId: "opp_junior-fullstack",
      text: "Two case studies of past work",
      category: "portfolio",
      minCount: 2,
      status: "not-yet-supported",
    },
    {
      id: "req_language",
      ...stamp(T_OPP),
      opportunityId: "opp_junior-fullstack",
      text: "Professional working proficiency in the team language",
      category: "language",
      status: "unknown",
    },
  ],
  // Requirement → evidence links are not hand-written: the deterministic matcher derives them
  // (and each status + rationale) below, exactly as it does for user data.
  requirementEvidenceLinks: [],
  bridgeTasks: [
    {
      id: "task_deploy-taskboard",
      ...stamp(T_OPP),
      requirementId: "req_deployment",
      title: "Deploy taskboard-lite to a free static host and record the steps",
      effortHours: 3,
      state: "proposed",
    },
    {
      id: "task_second-case-study",
      ...stamp(T_OPP),
      requirementId: "req_case-studies",
      title: "Write a second anonymized case study from a past project",
      effortHours: 2,
      state: "proposed",
    },
    {
      id: "task_state-language",
      ...stamp(T_OPP),
      requirementId: "req_language",
      title: "State your working languages in your profile",
      effortHours: 0.25,
      state: "proposed",
    },
  ],
  auditEvents: [],
} satisfies DatasetInput;

/**
 * The parsed, schema-validated demo dataset with links and statuses computed by the matcher.
 * The `status` values written above are the §3 expectations; the fixture tests check that the
 * matcher reproduces them. Throws at import time if the fixture drifts from the schema.
 */
export const demoDataset: Dataset = rematch(DatasetSchema.parse(input), T_OPP);
