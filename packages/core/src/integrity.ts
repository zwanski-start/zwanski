import type { Dataset, RequirementStatus } from "./schemas";
import { ENTITY_TABLES, RequirementStatusSchema } from "./schemas";

export interface DanglingReference {
  table: string;
  id: string;
  field: string;
  missing: string;
}

/**
 * Lists every foreign key that does not resolve to a record in the dataset. Graph edges must
 * derive from persisted relations, so a valid dataset has none.
 */
export function findDanglingReferences(data: Dataset): DanglingReference[] {
  const ids = (rows: readonly { id: string }[]) => new Set(rows.map((r) => r.id));
  const sources = ids(data.sources);
  const artifacts = ids(data.artifacts);
  const claims = ids(data.claims);
  const skills = ids(data.skills);
  const opportunities = ids(data.opportunities);
  const requirements = ids(data.requirements);

  const out: DanglingReference[] = [];
  const check = (table: string, id: string, field: string, value: string | undefined, set: Set<string>) => {
    if (value !== undefined && !set.has(value)) out.push({ table, id, field, missing: value });
  };

  for (const r of data.artifacts) check("artifacts", r.id, "sourceId", r.sourceId, sources);
  for (const r of data.claims) check("claims", r.id, "artifactId", r.artifactId, artifacts);
  for (const r of data.claimSkillLinks) {
    check("claimSkillLinks", r.id, "claimId", r.claimId, claims);
    check("claimSkillLinks", r.id, "skillId", r.skillId, skills);
  }
  for (const r of data.requirements) {
    check("requirements", r.id, "opportunityId", r.opportunityId, opportunities);
    check("requirements", r.id, "skillId", r.skillId, skills);
  }
  for (const r of data.requirementEvidenceLinks) {
    check("requirementEvidenceLinks", r.id, "requirementId", r.requirementId, requirements);
    check("requirementEvidenceLinks", r.id, "claimId", r.claimId, claims);
  }
  for (const r of data.bridgeTasks) check("bridgeTasks", r.id, "requirementId", r.requirementId, requirements);
  return out;
}

/** Returns ids that appear more than once across all tables (ids must be globally unique). */
export function findDuplicateIds(data: Dataset): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const table of ENTITY_TABLES) {
    for (const row of data[table]) {
      if (seen.has(row.id)) dupes.add(row.id);
      seen.add(row.id);
    }
  }
  return [...dupes];
}

/** Explicit requirement counts per status — never an opaque percentage score. */
export function countRequirementStatuses(
  requirements: readonly { status: RequirementStatus }[],
): Record<RequirementStatus, number> {
  const counts = Object.fromEntries(RequirementStatusSchema.options.map((s) => [s, 0])) as Record<
    RequirementStatus,
    number
  >;
  for (const r of requirements) counts[r.status] += 1;
  return counts;
}

export const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  supported: "Supported",
  uncertain: "Uncertain",
  "not-yet-supported": "Not yet supported",
  "not-applicable": "Not applicable",
  unknown: "Unknown",
};
