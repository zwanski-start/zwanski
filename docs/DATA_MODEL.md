# DATA MODEL

Canonical typed entities (directive §5). Source of truth: `packages/core/src/schema.ts` (Zod schemas +
inferred TypeScript types). This doc is the human-readable companion; if the two disagree, the code wins.

## Provenance chain
```
EvidenceArtifact ──evidences──▶ EvidenceClaim ──demonstrates──▶ Skill
                                      │
                                      ▼ supports
OpportunityRequirement ──required-by──▶ Opportunity
        ▲
        └── bridges ── BridgeTask (Next step)
```
The Proof Graph (`packages/core/src/graph.ts`) is a **projection** of these relations. Every edge comes from
a persisted typed relation; the projection never invents links (§2.B).

## Entities implemented in Phase 0
| Entity | Purpose |
|---|---|
| `PersonProfile` | the user (synthetic in the demo) |
| `EvidenceSource` | where bytes/text came from; optional SHA-256 integrity digest; freshness |
| `EvidenceArtifact` | an imported item (repo export, write-up, certificate, manual entry…) |
| `EvidenceClaim` | an editable statement with an explicit `verification` state |
| `Skill` + `ClaimSkillLink` | normalized skills and the claims that demonstrate them |
| `Opportunity` + `OpportunityRequirement` | a pasted opportunity and its testable requirements |
| `RequirementEvidenceLink` | which claims a human linked to a requirement |
| `BridgeTask` | a small task that closes a specific gap |
| `Dossier` + `DossierItem` | a selective, default-private export preview |

## Deferred to later phases (NOT stubbed as done)
`CaptureEvent`, `ConsentGrant`, `ExternalIntegration`, `AuditEvent` — arrive with the extension (Phase 2),
optional AI/consent (Phase 3), and sync/audit (Phase 4).

## Enumerations & rules (enforced in code)
- **`VerificationState`**: `user-stated` · `source-present` · `issuer-verified` · `unverified`.
  A hash never reaches `issuer-verified`; integrity ≠ authenticity (§5).
- **`Attribution`**: `human` · `parser` · `ai-suggestion`. **`ReviewState`**: `unreviewed` · `accepted` · `rejected`.
  A `parser`/`ai-suggestion` relation only counts once a human `accepted` it (§10.4/§10.6).
- **`Visibility`**: `private` (default) · `dossier-only` · `public`.
- **Requirement states** (deterministic, from `evaluateRequirement`): `supported` · `uncertain` ·
  `not-yet-supported` · `not-applicable` · `unknown`. No probabilities, no opaque scores (§5).
- Legal/eligibility requirements carry `needsAuthoritativeConfirmation` and resolve to **Unknown** —
  never auto-decided (§6).

## Matching semantics (`evaluateRequirement`)
- **skill**: a linked claim that is `source-present`/`issuer-verified` → **Supported**; only `user-stated`
  → **Uncertain**; none → **Not yet supported**.
- **count**: ≥ `requiredCount` matching artifacts → **Supported**, else **Not yet supported**.
- **attribute**: no stated value → **Unknown**; `needsAuthoritativeConfirmation` → **Unknown** with a
  "verify at official source" reason.
