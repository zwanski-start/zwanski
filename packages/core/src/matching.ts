import type {
  Dataset,
  EvidenceClaim,
  OpportunityRequirement,
  RequirementEvidenceLink,
  RequirementStatus,
} from "./schemas";

/**
 * Deterministic requirement → evidence matching engine (directive §3). No model, no network:
 * the same dataset always yields the same links and statuses.
 *
 * Candidate evidence for a requirement:
 *  - skill / experience requirements: claims linked to the requirement's skill (ClaimSkillLink);
 *  - portfolio requirements ("two case studies"): claims on `write-up` artifacts;
 *  - plus any link a human added by hand.
 * Links a human rejected are kept (so the decision persists) but never count.
 *
 * Status rules (before a human override):
 *  - countable (`minCount`): Supported when ≥ minCount distinct artifacts back it, otherwise
 *    Not yet supported ("1 of 2").
 *  - language: Supported with linked evidence; Uncertain when the profile states languages but
 *    nothing links them to this requirement; otherwise Unknown.
 *  - eligibility: never assessed — Unknown unless a human links evidence or overrides.
 *  - everything else: Supported with backed evidence; Uncertain when only unverified claims or
 *    no proof is present for a known skill; Unknown when nothing about it is known.
 * "Supported" means "the vault holds evidence for it", never "formally verified".
 */

const AUTO = "parser" as const;

/** Deterministic id for a matcher-proposed link, so re-running the matcher is idempotent. */
export const autoLinkId = (requirementId: string, claimId: string) =>
  `rel_${requirementId.replace(/^[a-z]+_/, "")}--${claimId.replace(/^[a-z]+_/, "")}`;

/** Claims the matcher proposes for a requirement (before human review is applied). */
export function candidateClaims(data: Dataset, req: OpportunityRequirement): EvidenceClaim[] {
  const usable = data.claims.filter((c) => c.reviewState !== "rejected");
  if (req.minCount !== undefined && req.category === "portfolio") {
    const writeUps = new Set(data.artifacts.filter((a) => a.kind === "write-up").map((a) => a.id));
    return usable.filter((c) => writeUps.has(c.artifactId));
  }
  if (req.skillId && req.category !== "eligibility") {
    const linked = new Set(
      data.claimSkillLinks
        .filter((l) => l.skillId === req.skillId && l.reviewState !== "rejected")
        .map((l) => l.claimId),
    );
    return usable.filter((c) => linked.has(c.id));
  }
  return [];
}

const isBacked = (c: EvidenceClaim) => c.basis !== "unverified" && c.reviewState !== "rejected";

interface Verdict {
  status: RequirementStatus;
  rationale: string;
  relationship: RequirementEvidenceLink["relationship"];
}

function judge(data: Dataset, req: OpportunityRequirement, evidence: EvidenceClaim[]): Verdict {
  const backed = evidence.filter(isBacked);
  const skill = req.skillId ? data.skills.find((s) => s.id === req.skillId) : undefined;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  if (req.minCount !== undefined) {
    const artifacts = new Set(backed.map((c) => c.artifactId)).size;
    const noun = req.category === "portfolio" ? "case study" : "item";
    const nounN = (n: number) => (noun === "case study" ? (n === 1 ? "case study" : "case studies") : plural(n, "item"));
    return artifacts >= req.minCount
      ? {
          status: "supported",
          rationale: `${artifacts} ${nounN(artifacts)} in the vault; ${req.minCount} required.`,
          relationship: "supports",
        }
      : {
          status: "not-yet-supported",
          rationale: `${artifacts} of ${req.minCount} ${nounN(req.minCount)} in the vault.`,
          relationship: "partially-supports",
        };
  }

  if (backed.length > 0) {
    return {
      status: "supported",
      rationale: `${plural(backed.length, "claim")} in the vault ${backed.length === 1 ? "backs" : "back"} this. Not formally verified.`,
      relationship: "supports",
    };
  }
  if (evidence.length > 0) {
    return {
      status: "uncertain",
      rationale: "Only unverified claims relate to this requirement.",
      relationship: "partially-supports",
    };
  }

  if (req.category === "language") {
    const stated = data.profiles.flatMap((p) => p.languages);
    return stated.length > 0
      ? {
          status: "uncertain",
          rationale: `Your profile states ${stated.join(", ")}, but nothing links it to this requirement.`,
          relationship: "supports",
        }
      : {
          status: "unknown",
          rationale: "Language proficiency has not been stated or evidenced.",
          relationship: "supports",
        };
  }
  if (req.category === "eligibility") {
    return {
      status: "unknown",
      rationale: "ProofBridge does not assess eligibility. Check the official source.",
      relationship: "supports",
    };
  }
  if (skill) {
    return {
      status: "uncertain",
      rationale: `No proof of ${skill.name} is present yet.`,
      relationship: "supports",
    };
  }
  return {
    status: "unknown",
    rationale: "Not matched to a known skill or any evidence yet.",
    relationship: "supports",
  };
}

/**
 * Recomputes every requirement's links and status from the current dataset. Returns a new
 * dataset; records whose content did not change keep their identity and `updatedAt`.
 */
export function rematch(data: Dataset, now: string): Dataset {
  const claimIds = new Set(data.claims.map((c) => c.id));
  // Links to deleted claims are dropped; rejected and human links are kept as decisions.
  const existing = data.requirementEvidenceLinks.filter((l) => claimIds.has(l.claimId));
  const claimsById = new Map(data.claims.map((c) => [c.id, c]));

  const links: RequirementEvidenceLink[] = [];
  const requirements = data.requirements.map((req) => {
    const own = existing.filter((l) => l.requirementId === req.id);
    const rejected = new Set(own.filter((l) => l.reviewState === "rejected").map((l) => l.claimId));
    const human = own.filter((l) => l.attribution !== AUTO && l.reviewState !== "rejected");
    const proposed = candidateClaims(data, req).filter(
      (c) => !rejected.has(c.id) && !human.some((h) => h.claimId === c.id),
    );
    const evidence = [
      ...human.flatMap((l) => claimsById.get(l.claimId) ?? []),
      ...proposed,
    ];
    const verdict = judge(data, req, evidence);

    // Keep human links and rejections exactly as decided.
    for (const l of own) if (l.attribution !== AUTO || l.reviewState === "rejected") links.push(l);
    for (const claim of proposed) {
      const id = autoLinkId(req.id, claim.id);
      const prev = own.find((l) => l.id === id);
      const next: RequirementEvidenceLink = {
        id,
        demo: prev?.demo ?? (req.demo && claim.demo),
        createdAt: prev?.createdAt ?? now,
        updatedAt: prev?.updatedAt ?? now,
        requirementId: req.id,
        claimId: claim.id,
        relationship: verdict.relationship,
        attribution: AUTO,
        reviewState: prev?.reviewState ?? "unreviewed",
        visibility: claim.visibility,
      };
      links.push(prev && sameLink(prev, next) ? prev : { ...next, updatedAt: prev ? now : next.updatedAt });
    }

    const status = req.override?.status ?? verdict.status;
    const rationale = req.override
      ? `Set by you${req.override.note ? `: ${req.override.note}` : "."} (Matcher: ${verdict.rationale})`
      : verdict.rationale;
    return status === req.status && rationale === req.rationale ? req : { ...req, status, rationale, updatedAt: now };
  });

  links.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { ...data, requirements, requirementEvidenceLinks: links };
}

const sameLink = (a: RequirementEvidenceLink, b: RequirementEvidenceLink) =>
  a.relationship === b.relationship && a.reviewState === b.reviewState && a.visibility === b.visibility;
