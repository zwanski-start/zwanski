import { z } from "zod";

/**
 * ProofBridge domain contract (directive §5).
 *
 * Phase 0 implements the entities exercised by the Section 3 demo. The remaining
 * directive entities (CaptureEvent, ConsentGrant, ExternalIntegration, AuditEvent)
 * are intentionally deferred to Phase 2/3 and are NOT stubbed as "done" — see ROADMAP.md.
 *
 * Design rules enforced here:
 * - A hash proves byte identity, never truth or institutional validation.
 * - AI-suggested relations are never silently promoted to human-verified facts.
 * - Visibility is explicit; everything defaults to private.
 */

export const Id = z.string().min(1);
export const Iso = z.string().datetime({ offset: true });

/** How a claim's authenticity is currently characterised. Hashing alone never reaches `issuer-verified`. */
export const VerificationState = z.enum([
  "user-stated", // the user asserts it; no external support
  "source-present", // supported by bytes/text in an imported source
  "issuer-verified", // a genuine verifiable issuer attestation exists
  "unverified", // imported but not yet characterised
]);
export type VerificationState = z.infer<typeof VerificationState>;

/** Who or what asserted a relationship. Never conflate these. */
export const Attribution = z.enum(["human", "parser", "ai-suggestion"]);
export type Attribution = z.infer<typeof Attribution>;

/** Human review lifecycle for any derived/suggested relation. */
export const ReviewState = z.enum(["unreviewed", "accepted", "rejected"]);
export type ReviewState = z.infer<typeof ReviewState>;

export const Visibility = z.enum(["private", "dossier-only", "public"]);
export type Visibility = z.infer<typeof Visibility>;

export const Timestamps = z.object({
  createdAt: Iso,
  updatedAt: Iso,
});

export const PersonProfile = z.object({
  id: Id,
  displayName: z.string(),
  headline: z.string().optional(),
  locales: z.array(z.string()).default(["en"]),
}).merge(Timestamps);
export type PersonProfile = z.infer<typeof PersonProfile>;

export const EvidenceSource = z.object({
  id: Id,
  kind: z.enum(["manual", "local-file", "selected-webpage", "import"]),
  label: z.string(),
  /** Original location/filename/url the bytes or text came from. */
  origin: z.string().optional(),
  capturedAt: Iso,
  /** SHA-256 of original bytes where bytes exist. Integrity only — not authenticity. */
  integritySha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  freshness: z.enum(["fresh", "stale", "unavailable"]).default("fresh"),
}).merge(Timestamps);
export type EvidenceSource = z.infer<typeof EvidenceSource>;

export const EvidenceArtifact = z.object({
  id: Id,
  sourceId: Id,
  title: z.string(),
  artifactType: z.enum([
    "repository-export",
    "project-writeup",
    "certificate",
    "testimonial",
    "document",
    "screenshot",
    "manual-entry",
  ]),
  mediaType: z.string().optional(),
  bytes: z.number().int().nonnegative().optional(),
  visibility: Visibility.default("private"),
}).merge(Timestamps);
export type EvidenceArtifact = z.infer<typeof EvidenceArtifact>;

export const EvidenceClaim = z.object({
  id: Id,
  artifactId: Id,
  /** Text shown to the user; editable without destroying provenance. */
  statement: z.string(),
  verification: VerificationState,
  attribution: Attribution,
  review: ReviewState.default("unreviewed"),
  visibility: Visibility.default("private"),
}).merge(Timestamps);
export type EvidenceClaim = z.infer<typeof EvidenceClaim>;

export const Skill = z.object({
  id: Id,
  /** Normalised key used by the matcher, e.g. "typescript". */
  key: z.string(),
  label: z.string(),
});
export type Skill = z.infer<typeof Skill>;

export const ClaimSkillLink = z.object({
  id: Id,
  claimId: Id,
  skillId: Id,
  attribution: Attribution,
  review: ReviewState.default("unreviewed"),
});
export type ClaimSkillLink = z.infer<typeof ClaimSkillLink>;

export const Opportunity = z.object({
  id: Id,
  title: z.string(),
  organisation: z.string().optional(),
  sourceUrl: z.string().optional(),
  retrievedAt: Iso.optional(),
  /** DEMO / SYNTHETIC guard: never present synthetic data as a live listing. */
  synthetic: z.boolean().default(false),
  rawText: z.string().optional(),
}).merge(Timestamps);
export type Opportunity = z.infer<typeof Opportunity>;

/** A testable requirement parsed from an opportunity. */
export const OpportunityRequirement = z.object({
  id: Id,
  opportunityId: Id,
  label: z.string(),
  kind: z.enum([
    "skill", // satisfied by a skill-linked claim
    "count", // satisfied by N artifacts of a type (e.g. two case studies)
    "attribute", // a factual attribute that may be Unknown until stated (e.g. language)
  ]),
  /** For `skill`: the skill key. For `count`: the artifactType to count. For `attribute`: the attribute key. */
  target: z.string(),
  /** For `count` requirements: how many are needed. */
  requiredCount: z.number().int().positive().optional(),
  /** Legal/eligibility requirements always need authoritative confirmation; never auto-decided. */
  needsAuthoritativeConfirmation: z.boolean().default(false),
});
export type OpportunityRequirement = z.infer<typeof OpportunityRequirement>;

export const RequirementEvidenceLink = z.object({
  id: Id,
  requirementId: Id,
  claimId: Id,
  attribution: Attribution,
  review: ReviewState.default("unreviewed"),
});
export type RequirementEvidenceLink = z.infer<typeof RequirementEvidenceLink>;

export const BridgeTask = z.object({
  id: Id,
  requirementId: Id,
  title: z.string(),
  estimateHours: z.number().nonnegative(),
  done: z.boolean().default(false),
}).merge(Timestamps);
export type BridgeTask = z.infer<typeof BridgeTask>;

export const Dossier = z.object({
  id: Id,
  opportunityId: Id,
  title: z.string(),
  visibility: Visibility.default("private"),
}).merge(Timestamps);
export type Dossier = z.infer<typeof Dossier>;

export const DossierItem = z.object({
  id: Id,
  dossierId: Id,
  claimId: Id,
  include: z.boolean().default(true),
});
export type DossierItem = z.infer<typeof DossierItem>;

/** The full synthetic/working dataset the app renders. */
export const Dataset = z.object({
  profile: PersonProfile,
  sources: z.array(EvidenceSource),
  artifacts: z.array(EvidenceArtifact),
  claims: z.array(EvidenceClaim),
  skills: z.array(Skill),
  claimSkillLinks: z.array(ClaimSkillLink),
  opportunities: z.array(Opportunity),
  requirements: z.array(OpportunityRequirement),
  requirementEvidenceLinks: z.array(RequirementEvidenceLink),
  bridgeTasks: z.array(BridgeTask),
});
export type Dataset = z.infer<typeof Dataset>;
