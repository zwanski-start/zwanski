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
                    sanitisers, local-origin allowlist, pinned EXTENSION_ID); dependency-free PDF
                    rendering of a dossier (pdf.ts).
packages/ai         OPTIONAL, consent-gated AI suggestions: device-local settings + consent
                    (settings.ts), the single egress boundary `guardedFetch` (egress.ts) and
                    Ollama requirement-extraction suggestions that degrade to the
                    deterministic parser (suggest.ts). Pure; fetch/clock are injected.
apps/share-server   OPTIONAL share service (Node ≥ 22.18, zero runtime deps): Fetch-API handler
                    (handler.ts), JSON-file store with expiry/revocation (store.ts), Node http
                    adapter (node.ts), public read-only viewer page (viewer.ts).
packages/storage    Dexie 4 IndexedDB database: versioned schema list (MIGRATIONS),
                    import/export/seed/clear, applyChange (atomic diff commit of a pure op),
                    replaceAll (restore). Validates with core schemas on every read/write.
packages/fixtures   DEMO / SYNTHETIC dataset for the §3 hero workflow, schema-validated at import.
packages/config     Shared tsconfig base.
```

Dependency direction: `web → storage → core`, `web → fixtures → core`, `web → ai → core`,
`extension → core`. `core` has no runtime dependency other than Zod and never touches I/O.
`share-server` has no runtime dependency on any package (core only in its tests); it shares
only the wire format (`SHARE_AAD`, base64url, AES-GCM) with `core/crypto.ts`.

Planned per directive §4 (not created yet): `packages/{evidence,graph,ui}`.

## Localization (EN / FR / AR)

`apps/web/src/lib/messages.ts` holds the string catalogs (English is the source; a unit test
enforces that French and Arabic define every key with the same placeholders).
`lib/i18n.tsx` exposes `useI18n()` (translate, status labels, `Intl` dates per locale, PDF
labels) from a device-local preference (`localStorage["proofbridge.locale"]`, default `en`).
`DocumentLocale` keeps `<html lang dir>` in sync; an inline pre-paint script applies a saved
`fr`/`ar` before hydration so Arabic does not flash LTR. Layout uses logical properties
(`ps-*`, `pe-*`, `text-start`) and paragraphs use `unicode-bidi: plaintext`, so user data in
another script keeps its own direction. Translated: app shell, navigation, page headers, status
labels, Compass, Share Studio, Settings, the Opportunity Lab table header and the AI panel.
Still English-only: Evidence Vault forms + inspector, review controls, rationales produced by
the matcher, and every user-entered value (never translated).

## Optional AI (Phase 3)

```
Settings (consent per exact loopback origin + scope "listing-text")
   └─ Opportunity Lab: preview exact JSON → user clicks Send
        └─ suggestRequirements → guardedFetch (refuses unless enabled + consent + same origin + loopback)
             └─ reply: size-capped, Zod-validated, control/bidi chars stripped, de-duplicated,
                classified by the deterministic rules → checkboxes (unverified)
                  └─ accepted lines → addOpportunity(acceptedSuggestions) → origin "ai-suggestion"
                       → statuses from the deterministic matcher only
```

Any refusal or failure returns the deterministic parse plus a reason; nothing throws into the UI.
Settings and the metadata-only egress log live in `localStorage` (not in the vault, not in
backups). Cloud providers are not implemented (would need provider accounts — blocked).

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
- **Dossier PDF**: rendered from the same `Dossier` object (identical disclosure). PDF 1.7, two
  standard fonts (Helvetica/-Bold, WinAnsi), no compression, no scripts, no embedded files.
  Every evidence item lists its source, capture date and SHA-256; http(s) sources become URI link
  annotations. Labels follow the UI language (EN/FR; Arabic UI → English labels, see limits).
- **Vault backup**: the schema-versioned `Dataset` JSON. Restore = size check → JSON.parse →
  migrate → schema + unique ids + no dangling refs → replace the vault in one transaction.

- **Encrypted vault backup** (`proofbridge.encrypted-backup` v1): `{format, version, kdf{PBKDF2,
  SHA-256, iterations, salt}, cipher{AES-GCM, iv}, createdAt, ciphertext}`; the plaintext is the
  vault backup above; the header is GCM additional data. `core/crypto.ts`.
- **Release artifacts** (`pnpm release`): static web export (`PROOFBRIDGE_STATIC_EXPORT=1` →
  `apps/web/.next-export`, with `_headers`), extension zip, share-server source tarball, `SHA256SUMS`.

No network request is made by the app at runtime unless the user opts in to (a) AI suggestions
and then explicitly sends a previewed request to a model on their own machine, or (b) online
share links, and then creates/refreshes/revokes a link on the share service address they entered.
There is no account system and no sync.

## Optional share links (Phase 4)

```
Share Studio ──(encrypt dossier, random key K)──► POST /api/shares {iv, ciphertext, ttl}  [Bearer owner key]
     │                                              share-server stores ciphertext + SHA-256(owner key)
     └─ link = <service>/s/<id>#k=K ──► reader's browser ── GET /s/<id> (viewer) ── GET /api/shares/<id>
                                                         decrypts with K locally; 410 when expired/revoked
```

Boundaries: the user's browser (app origin), the share service process (its own origin), the
reader's browser. The service is outside the user's machine only if someone deploys it
(`docs/DEPLOYMENT.md`). Threat model: `SECURITY.md` § Share links.

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
