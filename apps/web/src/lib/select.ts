import type {
  BridgeTask,
  Dataset,
  EvidenceArtifact,
  EvidenceClaim,
  EvidenceSource,
  Opportunity,
  OpportunityRequirement,
  RequirementEvidenceLink,
  Skill,
} from "@proofbridge/core";

const byId = <T extends { id: string }>(rows: readonly T[]) => new Map(rows.map((r) => [r.id, r]));

export interface EvidenceTrail {
  link: RequirementEvidenceLink;
  claim: EvidenceClaim;
  artifact: EvidenceArtifact | undefined;
  source: EvidenceSource | undefined;
}

export interface RequirementPath {
  requirement: OpportunityRequirement;
  opportunity: Opportunity | undefined;
  skill: Skill | undefined;
  evidence: EvidenceTrail[];
  tasks: BridgeTask[];
}

/**
 * Projects persisted relations into evidence → claim → skill → requirement → opportunity →
 * next-step paths. Only stored links are followed; nothing is inferred. Links a human rejected
 * are left out unless `includeRejected` is set (the Opportunity Lab shows them for review).
 */
export function requirementPaths(data: Dataset, { includeRejected = false } = {}): RequirementPath[] {
  const opportunities = byId(data.opportunities);
  const skills = byId(data.skills);
  const claims = byId(data.claims);
  const artifacts = byId(data.artifacts);
  const sources = byId(data.sources);

  return data.requirements.map((requirement) => ({
    requirement,
    opportunity: opportunities.get(requirement.opportunityId),
    skill: requirement.skillId ? skills.get(requirement.skillId) : undefined,
    evidence: data.requirementEvidenceLinks
      .filter((l) => l.requirementId === requirement.id && (includeRejected || l.reviewState !== "rejected"))
      .flatMap((link) => {
        const claim = claims.get(link.claimId);
        if (!claim) return [];
        const artifact = artifacts.get(claim.artifactId);
        return [{ link, claim, artifact, source: artifact ? sources.get(artifact.sourceId) : undefined }];
      }),
    tasks: data.bridgeTasks.filter((t) => t.requirementId === requirement.id),
  }));
}

export function claimsForArtifact(data: Dataset, artifactId: string): EvidenceClaim[] {
  return data.claims.filter((c) => c.artifactId === artifactId);
}

export function skillsForClaim(data: Dataset, claimId: string): Skill[] {
  const skills = byId(data.skills);
  return data.claimSkillLinks
    .filter((l) => l.claimId === claimId)
    .flatMap((l) => skills.get(l.skillId) ?? []);
}

/** The single most useful next action: the cheapest open task on an unsupported requirement. */
export function nextAction(data: Dataset): BridgeTask | undefined {
  return [...data.bridgeTasks]
    .filter((t) => t.state === "proposed" || t.state === "in-progress")
    .sort((a, b) => a.effortHours - b.effortHours || (a.id < b.id ? -1 : 1))[0];
}

export const BASIS_LABEL = {
  "user-stated": "User-stated",
  "source-present": "Source-present",
  "issuer-verified": "Issuer-verified",
  unverified: "Unverified / uncertain",
} as const;

/** Requirements that an artifact's claims are linked to (rejected links excluded). */
export function coverageForArtifact(
  data: Dataset,
  artifactId: string,
): { requirement: OpportunityRequirement; opportunity: Opportunity | undefined }[] {
  const claimIds = new Set(data.claims.filter((c) => c.artifactId === artifactId).map((c) => c.id));
  const reqIds = new Set(
    data.requirementEvidenceLinks
      .filter((l) => claimIds.has(l.claimId) && l.reviewState !== "rejected")
      .map((l) => l.requirementId),
  );
  const opportunities = byId(data.opportunities);
  return data.requirements
    .filter((r) => reqIds.has(r.id))
    .map((requirement) => ({ requirement, opportunity: opportunities.get(requirement.opportunityId) }));
}
