# ARCHITECTURE

Real boundaries only — there is **no container isolation**; everything runs as ordinary Node
processes (dev/build) and in the user's browser (runtime).

## Packages

```
apps/web            Next.js 16 App Router + React 19 + Tailwind 4. UI shell and screens,
                    incl. Capture Inbox (/inbox) which pulls browser captures from the extension.
apps/extension      Chromium MV3 capture extension (WXT 0.21, vanilla TS popup + service worker).
                    Click-to-capture → preview → confirm → local queue; answers only the app.
packages/core       Zod schemas + inferred types for the domain model; integrity helpers
                    (dangling references, duplicate ids, explicit requirement counts);
                    deterministic requirement parser (parser.ts) and matching engine
                    (matching.ts); pure vault ops (ops.ts); dossier format (dossier.ts);
                    backup parse/serialize + dataset migration (backup.ts, migrate.ts);
                    capture protocol shared with the extension (capture.ts: schemas, text/URL
                    sanitisers, local-origin allowlist, pinned EXTENSION_ID).
packages/storage    Dexie 4 IndexedDB database: versioned schema list (MIGRATIONS),
                    import/export/seed/clear, applyChange (atomic diff commit of a pure op),
                    replaceAll (restore). Validates with core schemas on every read/write.
packages/fixtures   DEMO / SYNTHETIC dataset for the §3 hero workflow, schema-validated at import.
packages/config     Shared tsconfig base.
```

Dependency direction: `web → storage → core`, `web → fixtures → core`, `extension → core`.
`core` has no runtime dependency other than Zod and never touches I/O.

Planned per directive §4 (not created yet): `packages/{evidence,graph,ai,ui}`.

## Data flow

1. Browser loads a statically prerendered page shell (no server-side data).
2. `DataProvider` (`apps/web/src/lib/data.tsx`) opens IndexedDB database `proofbridge`.
3. If every entity table is empty, it writes the fixture dataset in one transaction.
4. It reads all tables back (`exportDataset`), validates them with `DatasetSchema`, and renders.
5. Screens derive views from persisted relations only (`apps/web/src/lib/select.ts`); no edge or
   status is invented in the UI.
6. Every user change is a pure `Dataset → Dataset` op from `core/ops.ts` (add evidence, delete
   claim/artifact, edit redaction/visibility, import listing, override, link, review link, state
   languages). Each op appends an `AuditEvent` and calls `rematch`, which recomputes every
   requirement's links and status. `storage.applyChange` runs the op inside one IndexedDB
   transaction, validates the result (schema, unique ids, no dangling refs) and writes only the
   changed rows. The UI then re-renders from what was persisted.

## Matching engine (deterministic, no model)

- Parser: split listing text after a "Requirements:" heading on lines/semicolons/bullets;
  classify by keyword rules (eligibility, portfolio + count, language, known skill by name or
  alias with whole-word matching, experience). Bounded: 20k chars, 40 requirements, 300
  chars/line. Text is data; nothing is executed.
- Candidates: skill/experience → claims linked to the requirement's skill; portfolio → claims on
  `write-up` artifacts; plus human-made links. Rejected links persist and never count.
- Status: countable → Supported at ≥ minCount distinct artifacts, else Not yet supported;
  language → Supported with linked evidence, Uncertain if only stated in the profile, else
  Unknown; eligibility → never assessed (Unknown); otherwise Supported with backed claims,
  Uncertain with only unverified claims or no proof for a known skill, Unknown if nothing is
  known. A human override wins and the matcher's view is kept in the rationale.

## Offline / PWA

`public/sw.js` (registered in production builds only) precaches the seven route HTML shells and
the `/_next/static` assets they reference, serves hashed assets cache-first and navigations
network-first with cached fallback. It never caches anything else; vault data is in IndexedDB
and never travels over HTTP.

## Browser capture (extension → app)

Processes: the extension's popup page and service worker (Chrome extension origin), the
captured tab (third-party origin; our extractor runs once in Chrome's isolated world), and the
app tab (`http://localhost:<port>`). Chrome's site isolation and extension sandboxing are the
only isolation; we add no container or process boundary of our own.

1. User clicks the toolbar button on a page → popup. **Capture this opportunity** reads the
   visible text of `<main>`/`[role=main]`/`<article>` (else `<body>`); **Save selected evidence**
   reads the selection. One `chrome.scripting.executeScript` call (permission from `activeTab`)
   returns `{ text, title }` as plain strings.
2. Popup sanitises (core `sanitizeCapturedText`/`sanitizePageUrl`) and shows an editable preview.
   **Confirm & queue** writes a strict `Capture` into `chrome.storage.local` (max 20).
3. **Send to local ProofBridge** opens `<app address>/inbox` in a new tab. The Capture Inbox calls
   `chrome.runtime.sendMessage(EXTENSION_ID, {type:"list"})`; the service worker answers only the
   exact configured app origin from a top frame.
4. The user imports each capture (opportunity → `addOpportunity`, evidence → `addEvidence` with
   `captureMethod: selected-webpage`) or discards it; the app then sends `{type:"ack", ids}` and the
   extension deletes those entries.
5. Fallback: popup **Download as file** → `proofbridge-captures-<date>.json` → Capture Inbox file import.

Protocol: `packages/core/src/capture.ts`. Threat model: `SECURITY.md` § Capture extension.

## Export formats

- **Dossier** (`proofbridge.dossier` v1, JSON): one opportunity's requirements, statuses,
  rationales and disclosed evidence. Excludes private claims/artifacts, `redacted` artifacts and
  rejected links (counted as `withheld`); text excerpts only for `redaction: none`.
- **Vault backup**: the schema-versioned `Dataset` JSON. Restore = size check → JSON.parse →
  migrate → schema + unique ids + no dangling refs → replace the vault in one transaction.

No network request is made by the app at runtime. There is no backend, no auth, no sync.

## Domain model

`EvidenceSource → EvidenceArtifact → EvidenceClaim —ClaimSkillLink→ Skill`
`Opportunity → OpportunityRequirement —RequirementEvidenceLink→ EvidenceClaim`
`OpportunityRequirement → BridgeTask` (next step)
`AuditEvent` (append-only change history: entity table/id, action, human-readable summary)

Links carry attribution (human / parser / ai-suggestion), review state and visibility. Artifacts
carry an optional SHA-256 of their bytes — integrity, not authenticity.

## Schema versioning

`packages/storage/src/db.ts` holds an append-only `MIGRATIONS` list (one Dexie `version()` each).
The latest version must equal `core`'s `SCHEMA_VERSION` (checked at module load), which is also
written into exports.

Versions: v1 = Phase 0 subset; v2 = `auditEvents` table + artifact `redaction` (upgrade fills
"none") + optional requirement `override`. `core/migrate.ts` upgrades v1 backup files the same way.
