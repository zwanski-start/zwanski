import { countRequirementStatuses } from "./integrity";
import type { Dataset, EvidenceArtifact, RequirementStatus } from "./schemas";

/**
 * The one dossier export format (`proofbridge.dossier` v1, JSON): an opportunity-specific,
 * selectively disclosed summary of requirement status and the evidence behind it.
 *
 * Disclosure rules — evidence is included only when the claim AND its artifact are not
 * `private`, the artifact is not `redacted`, and the link was not rejected. Artifact text is
 * included only when redaction is `none`. Excluded items are counted, never described.
 */
export const DOSSIER_FORMAT = "proofbridge.dossier";
export const DOSSIER_VERSION = 1;
export const DOSSIER_NOTICE =
  "Self-reported evidence summary. Statuses mean the owner's vault holds related evidence; nothing here is formally verified. A SHA-256 hash proves byte integrity, not authenticity.";

const EXCERPT_CHARS = 280;

/** Only absolute http(s) URLs are shared as links; local paths and other schemes are dropped. */
export function webUri(uri: string | undefined): string | null {
  if (!uri) return null;
  try {
    const u = new URL(uri);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export interface DossierEvidence {
  claim: string;
  basis: string;
  relationship: string;
  attribution: string;
  artifact: {
    title: string;
    kind: EvidenceArtifact["kind"];
    capturedAt: string | null;
    source: string | null;
    /** The source's web address, only when it is an http(s) URL. */
    sourceUri: string | null;
    sha256: string | null;
    excerpt: string | null;
  };
}

export interface DossierRequirement {
  text: string;
  status: RequirementStatus;
  rationale: string;
  setManually: boolean;
  /** The requirement line was proposed by the optional AI provider and accepted by the user. */
  suggestedByAi: boolean;
  evidence: DossierEvidence[];
}

export interface Dossier {
  format: typeof DOSSIER_FORMAT;
  version: typeof DOSSIER_VERSION;
  generatedAt: string;
  notice: string;
  demo: boolean;
  opportunity: {
    title: string;
    organization: string;
    kind: string;
    source: string;
    sourceUri: string | null;
    retrievedAt: string;
  };
  counts: Record<RequirementStatus, number>;
  requirements: DossierRequirement[];
  /** Evidence items left out by visibility/redaction/review rules (count only). */
  withheld: number;
}

export function buildDossier(data: Dataset, opportunityId: string, generatedAt: string): Dossier {
  const opp = data.opportunities.find((o) => o.id === opportunityId);
  if (!opp) throw new Error(`Opportunity ${opportunityId} not found`);
  const claims = new Map(data.claims.map((c) => [c.id, c]));
  const artifacts = new Map(data.artifacts.map((a) => [a.id, a]));
  const sources = new Map(data.sources.map((s) => [s.id, s]));
  const reqs = data.requirements.filter((r) => r.opportunityId === opportunityId);

  let withheld = 0;
  let demo = opp.demo;
  const requirements = reqs.map((req): DossierRequirement => {
    const evidence: DossierEvidence[] = [];
    for (const link of data.requirementEvidenceLinks.filter((l) => l.requirementId === req.id)) {
      if (link.reviewState === "rejected") continue;
      const claim = claims.get(link.claimId);
      const art = claim && artifacts.get(claim.artifactId);
      if (!claim || !art) continue;
      if (claim.visibility === "private" || art.visibility === "private" || art.redaction === "redacted") {
        withheld += 1;
        continue;
      }
      demo ||= claim.demo || art.demo;
      const source = sources.get(art.sourceId);
      evidence.push({
        claim: claim.statement,
        basis: claim.basis,
        relationship: link.relationship,
        attribution: link.attribution,
        artifact: {
          title: art.title,
          kind: art.kind,
          capturedAt: source?.capturedAt ?? null,
          source: source?.label ?? null,
          sourceUri: webUri(source?.uri),
          sha256: art.sha256 ?? null,
          excerpt:
            art.redaction === "none" && art.content
              ? art.content.slice(0, EXCERPT_CHARS) + (art.content.length > EXCERPT_CHARS ? "…" : "")
              : null,
        },
      });
    }
    return {
      text: req.text,
      status: req.status,
      rationale: req.rationale,
      setManually: req.override !== undefined,
      suggestedByAi: req.origin === "ai-suggestion",
      evidence,
    };
  });

  return {
    format: DOSSIER_FORMAT,
    version: DOSSIER_VERSION,
    generatedAt,
    notice: demo ? `DEMO / SYNTHETIC. ${DOSSIER_NOTICE}` : DOSSIER_NOTICE,
    demo,
    opportunity: {
      title: opp.title,
      organization: opp.organization,
      kind: opp.kind,
      source: opp.sourceLabel,
      sourceUri: webUri(opp.sourceUri),
      retrievedAt: opp.retrievedAt,
    },
    counts: countRequirementStatuses(reqs),
    requirements,
    withheld,
  };
}
