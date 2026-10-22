import type {
  Dataset,
  EvidenceClaim,
  OpportunityRequirement,
  Skill,
} from "./schema";

/**
 * Deterministic requirement -> evidence matcher (directive §2.D, §5, §10.6).
 *
 * No LLM, no probabilities, no opaque "88% eligible" scores. Every state is derived
 * from typed persisted relations and is fully explainable. AI suggestions (attribution
 * "ai-suggestion") that have not been human-accepted are ignored here by design: an
 * uncertain/suggested link can never flip a requirement to Supported on its own.
 */

export type RequirementStatus =
  | "supported"
  | "uncertain"
  | "not-yet-supported"
  | "not-applicable"
  | "unknown";

export interface RequirementResult {
  requirementId: string;
  label: string;
  status: RequirementStatus;
  /** Human-readable, source-grounded reason. Never legal advice. */
  reason: string;
  /** Claim ids that contributed, for clickable provenance. */
  supportingClaimIds: string[];
}

const ACCEPTED = new Set(["accepted"]);

/** A link counts only if a human accepted it, or it was asserted directly by a human. */
function isActiveLink(attribution: string, review: string): boolean {
  if (attribution === "human") return review !== "rejected";
  return ACCEPTED.has(review); // parser/ai-suggestion must be explicitly accepted
}

function skillByKey(dataset: Dataset, key: string): Skill | undefined {
  return dataset.skills.find((s) => s.key === key);
}

/** Claims linked to a given skill via active claim-skill links. */
function claimsForSkill(dataset: Dataset, skillId: string): EvidenceClaim[] {
  const claimIds = new Set(
    dataset.claimSkillLinks
      .filter((l) => l.skillId === skillId && isActiveLink(l.attribution, l.review))
      .map((l) => l.claimId),
  );
  return dataset.claims.filter((c) => claimIds.has(c.id));
}

function evaluateSkill(dataset: Dataset, req: OpportunityRequirement): RequirementResult {
  const base = { requirementId: req.id, label: req.label };
  const skill = skillByKey(dataset, req.target);
  if (!skill) {
    return { ...base, status: "not-yet-supported", reason: `No evidence linked to "${req.target}" yet.`, supportingClaimIds: [] };
  }
  const claims = claimsForSkill(dataset, skill.id);
  if (claims.length === 0) {
    return { ...base, status: "not-yet-supported", reason: `No claim demonstrates ${skill.label}.`, supportingClaimIds: [] };
  }
  const proven = claims.filter(
    (c) => c.verification === "source-present" || c.verification === "issuer-verified",
  );
  if (proven.length > 0) {
    return {
      ...base,
      status: "supported",
      reason: `${skill.label} is backed by source-present evidence.`,
      supportingClaimIds: proven.map((c) => c.id),
    };
  }
  // Claims exist but only user-stated / unverified -> never auto-Supported (§10.6).
  return {
    ...base,
    status: "uncertain",
    reason: `${skill.label} is only user-stated; no supporting source present.`,
    supportingClaimIds: claims.map((c) => c.id),
  };
}

function evaluateCount(dataset: Dataset, req: OpportunityRequirement): RequirementResult {
  const base = { requirementId: req.id, label: req.label };
  const need = req.requiredCount ?? 1;
  const matching = dataset.artifacts.filter((a) => a.artifactType === req.target);
  const have = matching.length;
  const supportingClaimIds = dataset.claims
    .filter((c) => matching.some((a) => a.id === c.artifactId))
    .map((c) => c.id);
  if (have >= need) {
    return { ...base, status: "supported", reason: `${have} of ${need} provided.`, supportingClaimIds };
  }
  return {
    ...base,
    status: "not-yet-supported",
    reason: `${have} of ${need} provided.`,
    supportingClaimIds,
  };
}

function evaluateAttribute(dataset: Dataset, req: OpportunityRequirement): RequirementResult {
  const base = { requirementId: req.id, label: req.label };
  if (req.needsAuthoritativeConfirmation) {
    return {
      ...base,
      status: "unknown",
      reason: "Needs authoritative confirmation — not inferred. See official source.",
      supportingClaimIds: [],
    };
  }
  // An attribute (e.g. a language level) is Unknown until a claim explicitly states it.
  const stated = dataset.claims.filter((c) =>
    c.statement.toLowerCase().includes(req.target.toLowerCase()),
  );
  if (stated.length === 0) {
    return { ...base, status: "unknown", reason: `No stated value for "${req.label}".`, supportingClaimIds: [] };
  }
  return {
    ...base,
    status: "uncertain",
    reason: `Mentioned but not evidenced.`,
    supportingClaimIds: stated.map((c) => c.id),
  };
}

export function evaluateRequirement(dataset: Dataset, req: OpportunityRequirement): RequirementResult {
  switch (req.kind) {
    case "skill":
      return evaluateSkill(dataset, req);
    case "count":
      return evaluateCount(dataset, req);
    case "attribute":
      return evaluateAttribute(dataset, req);
  }
}

export interface Coverage {
  supported: number;
  uncertain: number;
  notYetSupported: number;
  unknown: number;
  notApplicable: number;
  total: number;
}

export function evaluateOpportunity(dataset: Dataset, opportunityId: string): {
  results: RequirementResult[];
  coverage: Coverage;
} {
  const reqs = dataset.requirements.filter((r) => r.opportunityId === opportunityId);
  const results = reqs.map((r) => evaluateRequirement(dataset, r));
  const coverage: Coverage = {
    supported: results.filter((r) => r.status === "supported").length,
    uncertain: results.filter((r) => r.status === "uncertain").length,
    notYetSupported: results.filter((r) => r.status === "not-yet-supported").length,
    unknown: results.filter((r) => r.status === "unknown").length,
    notApplicable: results.filter((r) => r.status === "not-applicable").length,
    total: results.length,
  };
  return { results, coverage };
}
