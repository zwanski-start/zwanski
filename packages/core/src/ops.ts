import { rematch } from "./matching";
import { parseRequirements } from "./parser";
import type {
  AuditEvent,
  ClaimSkillLink,
  Dataset,
  EntityTable,
  EvidenceArtifact,
  EvidenceClaim,
  EvidenceSource,
  Opportunity,
  OpportunityRequirement,
  Redaction,
  RequirementStatus,
} from "./schemas";

/**
 * Pure vault mutations. Each takes the current dataset and returns the next one with the
 * change applied, an audit event appended and every requirement rematched — so every surface
 * (Opportunity Lab, Proof Graph, Bridge Plan, dossier) derives from the same persisted state.
 * Time and id generation are injected so tests are fully deterministic.
 */
export interface OpContext {
  /** ISO timestamp for this change. */
  now: string;
  /** Mints a new globally unique `<prefix>_<slug>` id. */
  newId: (prefix: string) => string;
}

/** Random-suffixed id generator for the app (`<prefix>_<10 base36 chars>`). */
export function randomId(prefix: string): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return `${prefix}_${n.toString(36).padStart(10, "0").slice(-10)}`;
}

/** Deterministic id generator for tests: `<prefix>_<seed>-1`, `-2`, … */
export function sequentialIds(seed = "t"): (prefix: string) => string {
  let n = 0;
  return (prefix) => `${prefix}_${seed}-${++n}`;
}

const audit = (
  ctx: OpContext,
  entityTable: EntityTable,
  entityId: string,
  action: AuditEvent["action"],
  summary: string,
): AuditEvent => ({
  id: ctx.newId("audit"),
  demo: false,
  createdAt: ctx.now,
  updatedAt: ctx.now,
  at: ctx.now,
  entityTable,
  entityId,
  action,
  summary,
});

const withAudit = (data: Dataset, ...events: AuditEvent[]): Dataset => ({
  ...data,
  auditEvents: [...data.auditEvents, ...events],
});

function requireRow<T extends { id: string }>(rows: readonly T[], id: string, what: string): T {
  const row = rows.find((r) => r.id === id);
  if (!row) throw new Error(`${what} ${id} not found`);
  return row;
}

export interface NewEvidenceInput {
  title: string;
  kind: EvidenceArtifact["kind"];
  /** Text of the evidence (typed or read from a local file). */
  content?: string;
  /** SHA-256 hex of the original bytes, computed by the caller (WebCrypto / node:crypto). */
  sha256?: string;
  mediaType?: string;
  captureMethod: "manual" | "local-file" | "selected-webpage";
  sourceLabel: string;
  /** Where the evidence came from (e.g. the page a browser capture was taken on). */
  sourceUri?: string;
  /** When the source was captured, if earlier than this change (defaults to now). */
  capturedAt?: string;
  /** The claim this evidence supports, in the user's words. */
  claim: string;
  basis?: EvidenceClaim["basis"];
  skillIds?: string[];
  visibility?: EvidenceArtifact["visibility"];
  redaction?: Redaction;
}

/** Adds a source, an artifact, one human-authored claim and its skill links. */
export function addEvidence(data: Dataset, input: NewEvidenceInput, ctx: OpContext): {
  data: Dataset;
  artifactId: string;
  claimId: string;
} {
  const title = input.title.trim();
  const statement = input.claim.trim();
  if (!title) throw new Error("Evidence needs a title.");
  if (!statement) throw new Error("Evidence needs a claim.");
  const visibility = input.visibility ?? "private";
  const stamp = { demo: false, createdAt: ctx.now, updatedAt: ctx.now };

  const source: EvidenceSource = {
    id: ctx.newId("source"),
    ...stamp,
    label: input.sourceLabel.trim() || title,
    captureMethod: input.captureMethod,
    capturedAt: input.capturedAt ?? ctx.now,
    ...(input.sourceUri ? { uri: input.sourceUri } : {}),
  };
  const content = input.content?.length ? input.content : undefined;
  const artifact: EvidenceArtifact = {
    id: ctx.newId("art"),
    ...stamp,
    sourceId: source.id,
    title,
    kind: input.kind,
    mediaType: input.mediaType ?? "text/plain",
    ...(input.sha256 ? { sha256: input.sha256 } : {}),
    summary: content ? content.slice(0, 160).replace(/\s+/g, " ").trim() : "",
    ...(content !== undefined ? { content } : {}),
    visibility,
    redaction: input.redaction ?? "none",
  };
  const claim: EvidenceClaim = {
    id: ctx.newId("claim"),
    ...stamp,
    artifactId: artifact.id,
    statement,
    basis: input.basis ?? "user-stated",
    attribution: "human",
    reviewState: "approved",
    visibility,
  };
  const known = new Set(data.skills.map((s) => s.id));
  const skillLinks: ClaimSkillLink[] = [...new Set(input.skillIds ?? [])].map((skillId) => {
    if (!known.has(skillId)) throw new Error(`Skill ${skillId} not found`);
    return {
      id: ctx.newId("csl"),
      ...stamp,
      claimId: claim.id,
      skillId,
      attribution: "human",
      reviewState: "approved",
      visibility,
    };
  });

  const next: Dataset = {
    ...data,
    sources: [...data.sources, source],
    artifacts: [...data.artifacts, artifact],
    claims: [...data.claims, claim],
    claimSkillLinks: [...data.claimSkillLinks, ...skillLinks],
  };
  return {
    data: rematch(withAudit(next, audit(ctx, "artifacts", artifact.id, "create", `Added “${title}” (${input.captureMethod})`)), ctx.now),
    artifactId: artifact.id,
    claimId: claim.id,
  };
}

/** Removes a claim and every link that points at it. */
export function deleteClaim(data: Dataset, claimId: string, ctx: OpContext): Dataset {
  const claim = requireRow(data.claims, claimId, "Claim");
  const next: Dataset = {
    ...data,
    claims: data.claims.filter((c) => c.id !== claimId),
    claimSkillLinks: data.claimSkillLinks.filter((l) => l.claimId !== claimId),
    requirementEvidenceLinks: data.requirementEvidenceLinks.filter((l) => l.claimId !== claimId),
  };
  return rematch(
    withAudit(next, audit(ctx, "claims", claimId, "delete", `Removed claim “${claim.statement}” from ${claim.artifactId}`)),
    ctx.now,
  );
}

/** Removes an artifact, its claims (and their links) and its source if nothing else uses it. */
export function deleteArtifact(data: Dataset, artifactId: string, ctx: OpContext): Dataset {
  const artifact = requireRow(data.artifacts, artifactId, "Artifact");
  const claimIds = new Set(data.claims.filter((c) => c.artifactId === artifactId).map((c) => c.id));
  const artifacts = data.artifacts.filter((a) => a.id !== artifactId);
  const sourceInUse = artifacts.some((a) => a.sourceId === artifact.sourceId);
  const next: Dataset = {
    ...data,
    sources: sourceInUse ? data.sources : data.sources.filter((s) => s.id !== artifact.sourceId),
    artifacts,
    claims: data.claims.filter((c) => !claimIds.has(c.id)),
    claimSkillLinks: data.claimSkillLinks.filter((l) => !claimIds.has(l.claimId)),
    requirementEvidenceLinks: data.requirementEvidenceLinks.filter((l) => !claimIds.has(l.claimId)),
  };
  return rematch(
    withAudit(next, audit(ctx, "artifacts", artifactId, "delete", `Deleted “${artifact.title}” and ${claimIds.size} claim(s)`)),
    ctx.now,
  );
}

export type ArtifactPatch = Partial<Pick<EvidenceArtifact, "title" | "summary" | "visibility" | "redaction">>;

/** Edits artifact metadata; records which fields changed (not their contents) in history. */
export function updateArtifact(data: Dataset, artifactId: string, patch: ArtifactPatch, ctx: OpContext): Dataset {
  const artifact = requireRow(data.artifacts, artifactId, "Artifact");
  const changed = (Object.keys(patch) as (keyof ArtifactPatch)[]).filter(
    (k) => patch[k] !== undefined && patch[k] !== artifact[k],
  );
  if (changed.length === 0) return data;
  if (patch.title !== undefined && !patch.title.trim()) throw new Error("Evidence needs a title.");
  const updated: EvidenceArtifact = { ...artifact, ...patch, updatedAt: ctx.now };
  const describe = changed
    .map((k) => (k === "visibility" || k === "redaction" ? `${k}: ${artifact[k]} → ${updated[k]}` : k))
    .join(", ");
  let next: Dataset = { ...data, artifacts: data.artifacts.map((a) => (a.id === artifactId ? updated : a)) };
  const visibility = patch.visibility;
  if (visibility !== undefined && visibility !== artifact.visibility) {
    // Claims (and the links that cite them) inherit the artifact's visibility, so the dossier
    // and graph honour the inspector's single Visibility control. Auto links follow via rematch.
    const claimIds = new Set(data.claims.filter((c) => c.artifactId === artifactId).map((c) => c.id));
    const restamp = <T extends { visibility: EvidenceArtifact["visibility"]; updatedAt: string }>(
      row: T,
      owned: boolean,
    ): T => (owned && row.visibility !== visibility ? { ...row, visibility, updatedAt: ctx.now } : row);
    next = {
      ...next,
      claims: next.claims.map((c) => restamp(c, claimIds.has(c.id))),
      claimSkillLinks: next.claimSkillLinks.map((l) => restamp(l, claimIds.has(l.claimId))),
      requirementEvidenceLinks: next.requirementEvidenceLinks.map((l) => restamp(l, claimIds.has(l.claimId))),
    };
  }
  return rematch(withAudit(next, audit(ctx, "artifacts", artifactId, "update", `Changed ${describe}`)), ctx.now);
}

export interface NewOpportunityInput {
  title: string;
  organization?: string;
  kind: Opportunity["kind"];
  sourceLabel?: string;
  sourceUri?: string;
  /** When the listing was retrieved, if earlier than this change (defaults to now). */
  retrievedAt?: string;
  rawText: string;
}

/** Saves a pasted listing and its deterministically parsed requirements, then matches them. */
export function addOpportunity(data: Dataset, input: NewOpportunityInput, ctx: OpContext): {
  data: Dataset;
  opportunityId: string;
} {
  const title = input.title.trim();
  if (!title) throw new Error("The opportunity needs a title.");
  const parsed = parseRequirements(input.rawText, data.skills);
  if (parsed.length === 0) throw new Error("No requirements found in the listing text.");
  const stamp = { demo: false, createdAt: ctx.now, updatedAt: ctx.now };
  const opportunity: Opportunity = {
    id: ctx.newId("opp"),
    ...stamp,
    title,
    organization: input.organization?.trim() || "Unknown",
    kind: input.kind,
    sourceLabel: input.sourceLabel?.trim() || "Pasted listing text",
    ...(input.sourceUri ? { sourceUri: input.sourceUri } : {}),
    retrievedAt: input.retrievedAt ?? ctx.now,
    location: "Unknown",
    remote: "unknown",
    rawText: input.rawText,
  };
  // Ids derive from the opportunity's id plus a zero-padded position, so storage order (by id)
  // is listing order and ids stay globally unique.
  const oppSlug = opportunity.id.replace(/^[a-z]+_/, "");
  const requirements: OpportunityRequirement[] = parsed.map((p, i) => ({
    id: `req_${oppSlug}-${String(i + 1).padStart(2, "0")}`,
    ...stamp,
    opportunityId: opportunity.id,
    ...p,
    status: "unknown",
    rationale: "",
  }));
  const next: Dataset = {
    ...data,
    opportunities: [...data.opportunities, opportunity],
    requirements: [...data.requirements, ...requirements],
  };
  return {
    data: rematch(
      withAudit(next, audit(ctx, "opportunities", opportunity.id, "create", `Imported “${title}” with ${requirements.length} requirements`)),
      ctx.now,
    ),
    opportunityId: opportunity.id,
  };
}

/** Sets (or with `status: null` clears) a human status decision on a requirement. */
export function setRequirementOverride(
  data: Dataset,
  requirementId: string,
  status: RequirementStatus | null,
  note: string,
  ctx: OpContext,
): Dataset {
  const req = requireRow(data.requirements, requirementId, "Requirement");
  const { override: _old, ...rest } = req;
  const updated: OpportunityRequirement =
    status === null
      ? { ...rest, updatedAt: ctx.now }
      : { ...rest, override: { status, note: note.trim().slice(0, 500), at: ctx.now }, updatedAt: ctx.now };
  const summary = status === null ? `Cleared manual status on “${req.text}”` : `Set “${req.text}” to ${status} manually`;
  const next: Dataset = { ...data, requirements: data.requirements.map((r) => (r.id === requirementId ? updated : r)) };
  return rematch(withAudit(next, audit(ctx, "requirements", requirementId, "update", summary)), ctx.now);
}

/** A human links a claim to a requirement as evidence. */
export function linkEvidence(data: Dataset, requirementId: string, claimId: string, ctx: OpContext): Dataset {
  const req = requireRow(data.requirements, requirementId, "Requirement");
  const claim = requireRow(data.claims, claimId, "Claim");
  const existing = data.requirementEvidenceLinks.find((l) => l.requirementId === requirementId && l.claimId === claimId);
  const others = data.requirementEvidenceLinks.filter((l) => l !== existing);
  const next: Dataset = {
    ...data,
    requirementEvidenceLinks: [
      ...others,
      {
        id: ctx.newId("rel"),
        demo: false,
        createdAt: ctx.now,
        updatedAt: ctx.now,
        requirementId,
        claimId,
        relationship: "supports",
        attribution: "human",
        reviewState: "approved",
        visibility: claim.visibility,
      },
    ],
  };
  return rematch(
    withAudit(next, audit(ctx, "requirements", requirementId, "update", `Linked “${claim.statement}” to “${req.text}”`)),
    ctx.now,
  );
}

/** Approves or rejects a link. Rejected links persist so the matcher never re-proposes them. */
export function reviewLink(data: Dataset, linkId: string, reviewState: "approved" | "rejected", ctx: OpContext): Dataset {
  const link = requireRow(data.requirementEvidenceLinks, linkId, "Link");
  if (link.reviewState === reviewState) return data;
  const next: Dataset = {
    ...data,
    requirementEvidenceLinks: data.requirementEvidenceLinks.map((l) =>
      l.id === linkId ? { ...l, reviewState, updatedAt: ctx.now } : l,
    ),
  };
  return rematch(
    withAudit(next, audit(ctx, "requirements", link.requirementId, "update", `${reviewState === "rejected" ? "Rejected" : "Approved"} evidence link ${linkId}`)),
    ctx.now,
  );
}

/** Sets the working languages stated in the profile. */
export function setProfileLanguages(data: Dataset, profileId: string, languages: string[], ctx: OpContext): Dataset {
  const profile = requireRow(data.profiles, profileId, "Profile");
  const clean = [...new Set(languages.map((l) => l.trim()).filter(Boolean))].slice(0, 20);
  const next: Dataset = {
    ...data,
    profiles: data.profiles.map((p) => (p.id === profileId ? { ...p, languages: clean, updatedAt: ctx.now } : p)),
  };
  return rematch(
    withAudit(next, audit(ctx, "profiles", profile.id, "update", `Stated languages: ${clean.join(", ") || "none"}`)),
    ctx.now,
  );
}

/** Audit events about an artifact or any of its claims, newest first. */
export function historyForArtifact(data: Dataset, artifactId: string): AuditEvent[] {
  const ids = new Set([artifactId, ...data.claims.filter((c) => c.artifactId === artifactId).map((c) => c.id)]);
  return data.auditEvents
    .filter((e) => ids.has(e.entityId) || e.summary.includes(artifactId))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : -1));
}
