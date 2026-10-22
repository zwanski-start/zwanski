import { z } from "zod";

/**
 * Domain contract for the evidence → claim → skill → requirement → opportunity → next-step
 * pipeline (directive §5). Phase 0 covers the entities needed to render the synthetic demo;
 * Dossier/CaptureEvent/ConsentGrant/ExternalIntegration/AuditEvent land with the features
 * that use them.
 */

export const SCHEMA_VERSION = 1;

/** Stable, portable identifier: `<prefix>_<slug>` (lowercase, digits, `-`). */
export const IdSchema = z
  .string()
  .regex(/^[a-z]+_[a-z0-9-]+$/, "expected <prefix>_<slug> identifier");
export type Id = z.infer<typeof IdSchema>;

export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export const Sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/, "expected SHA-256 hex digest");

export const CaptureMethodSchema = z.enum(["manual", "local-file", "selected-webpage", "import"]);
export const AttributionSchema = z.enum(["human", "parser", "ai-suggestion"]);
export const ReviewStateSchema = z.enum(["unreviewed", "approved", "rejected"]);
export const VisibilitySchema = z.enum(["private", "dossier-only", "public"]);

/**
 * How strongly a claim is backed. A hash proves byte identity only — never authenticity —
 * so "issuer-verified" is reserved for genuine issuer verification (none in Phase 0).
 */
export const ClaimBasisSchema = z.enum([
  "user-stated",
  "source-present",
  "issuer-verified",
  "unverified",
]);

export const RequirementStatusSchema = z.enum([
  "supported",
  "uncertain",
  "not-yet-supported",
  "not-applicable",
  "unknown",
]);
export type RequirementStatus = z.infer<typeof RequirementStatusSchema>;

const Timestamps = {
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
};

/** Fields every persisted record carries; `demo` marks DEMO / SYNTHETIC fixture data. */
const RecordBase = {
  id: IdSchema,
  demo: z.boolean().default(false),
  ...Timestamps,
};

/** Provenance carried by every evidence link (directive §5). */
export const LinkProvenanceSchema = z.object({
  attribution: AttributionSchema,
  reviewState: ReviewStateSchema,
  visibility: VisibilitySchema,
});

export const PersonProfileSchema = z.object({
  ...RecordBase,
  displayName: z.string().min(1),
  headline: z.string().default(""),
  languages: z.array(z.string()).default([]),
});
export type PersonProfile = z.infer<typeof PersonProfileSchema>;

export const EvidenceSourceSchema = z.object({
  ...RecordBase,
  label: z.string().min(1),
  captureMethod: CaptureMethodSchema,
  capturedAt: IsoDateTimeSchema,
  uri: z.string().optional(),
});
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const EvidenceArtifactSchema = z.object({
  ...RecordBase,
  sourceId: IdSchema,
  title: z.string().min(1),
  kind: z.enum(["repository", "write-up", "certificate", "document", "image", "note"]),
  mediaType: z.string().min(1),
  /** SHA-256 of the original bytes when bytes exist; integrity only, not authenticity. */
  sha256: Sha256HexSchema.optional(),
  summary: z.string().default(""),
  visibility: VisibilitySchema,
});
export type EvidenceArtifact = z.infer<typeof EvidenceArtifactSchema>;

export const EvidenceClaimSchema = z.object({
  ...RecordBase,
  artifactId: IdSchema,
  statement: z.string().min(1),
  basis: ClaimBasisSchema,
  ...LinkProvenanceSchema.shape,
});
export type EvidenceClaim = z.infer<typeof EvidenceClaimSchema>;

export const SkillSchema = z.object({
  ...RecordBase,
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
});
export type Skill = z.infer<typeof SkillSchema>;

export const ClaimSkillLinkSchema = z.object({
  ...RecordBase,
  claimId: IdSchema,
  skillId: IdSchema,
  ...LinkProvenanceSchema.shape,
});
export type ClaimSkillLink = z.infer<typeof ClaimSkillLinkSchema>;

export const OpportunitySchema = z.object({
  ...RecordBase,
  title: z.string().min(1),
  organization: z.string().default("Unknown"),
  kind: z.enum(["job", "scholarship", "fellowship", "grant", "training", "client-brief"]),
  sourceLabel: z.string().min(1),
  sourceUri: z.string().optional(),
  retrievedAt: IsoDateTimeSchema,
  /** Unknown values stay "Unknown"; never inferred. */
  location: z.string().default("Unknown"),
  remote: z.enum(["remote", "on-site", "hybrid", "unknown"]).default("unknown"),
  deadline: IsoDateTimeSchema.optional(),
  rawText: z.string().default(""),
});
export type Opportunity = z.infer<typeof OpportunitySchema>;

export const OpportunityRequirementSchema = z.object({
  ...RecordBase,
  opportunityId: IdSchema,
  text: z.string().min(1),
  category: z.enum(["skill", "experience", "portfolio", "language", "eligibility", "other"]),
  /** Skill this requirement is about, if any. */
  skillId: IdSchema.optional(),
  /** For countable requirements such as "two case studies". */
  minCount: z.number().int().positive().optional(),
  /** Persisted snapshot; the deterministic matching engine (Phase 1) recomputes this. */
  status: RequirementStatusSchema,
  rationale: z.string().default(""),
});
export type OpportunityRequirement = z.infer<typeof OpportunityRequirementSchema>;

export const RequirementEvidenceLinkSchema = z.object({
  ...RecordBase,
  requirementId: IdSchema,
  claimId: IdSchema,
  relationship: z.enum(["supports", "partially-supports", "contradicts"]),
  ...LinkProvenanceSchema.shape,
});
export type RequirementEvidenceLink = z.infer<typeof RequirementEvidenceLinkSchema>;

export const BridgeTaskSchema = z.object({
  ...RecordBase,
  requirementId: IdSchema,
  title: z.string().min(1),
  effortHours: z.number().nonnegative(),
  state: z.enum(["proposed", "in-progress", "done", "dismissed"]),
});
export type BridgeTask = z.infer<typeof BridgeTaskSchema>;

/** A complete local dataset, as stored, exported, or seeded from fixtures. */
export const DatasetSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  profiles: z.array(PersonProfileSchema),
  sources: z.array(EvidenceSourceSchema),
  artifacts: z.array(EvidenceArtifactSchema),
  claims: z.array(EvidenceClaimSchema),
  skills: z.array(SkillSchema),
  claimSkillLinks: z.array(ClaimSkillLinkSchema),
  opportunities: z.array(OpportunitySchema),
  requirements: z.array(OpportunityRequirementSchema),
  requirementEvidenceLinks: z.array(RequirementEvidenceLinkSchema),
  bridgeTasks: z.array(BridgeTaskSchema),
});
export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetInput = z.input<typeof DatasetSchema>;

export const ENTITY_TABLES = [
  "profiles",
  "sources",
  "artifacts",
  "claims",
  "skills",
  "claimSkillLinks",
  "opportunities",
  "requirements",
  "requirementEvidenceLinks",
  "bridgeTasks",
] as const satisfies readonly Exclude<keyof Dataset, "schemaVersion">[];
export type EntityTable = (typeof ENTITY_TABLES)[number];
