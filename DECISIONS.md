# DECISIONS

Engineering tradeoffs and assumptions (ADR-lite). Agents append here instead of asking the founder.

- **2026-10-22 — Repo seeded before build.** The GitHub repo was empty; cubefarm/autoforge need a
  base branch and context to plan from. Decision: seed `main` with the directive + governance stubs
  only (no app code), so agents own all implementation decisions from Phase 0 onward.

- **2026-10-22 — Phase 0 monorepo layout (issue #3).** Followed directive §4 but created only the
  packages Phase 0 needs: `apps/web`, `packages/{core,storage,fixtures,config}`. `extension`,
  `evidence`, `graph`, `ai` and `ui` are added when their phase starts, to avoid empty shells.
- **Workspace packages ship TypeScript source, no per-package build.** `exports` point at
  `src/index.ts`; Next compiles them via `transpilePackages`, Vitest runs them directly. Simplest
  setup with one build step (`next build`). Revisit if a package must be consumed outside the repo
  (e.g. the extension may want a bundled build).
- **Toolchain pins.** TypeScript `~6.0` (TS 7 is out but `typescript-eslint` supports `<6.1`),
  ESLint 9 flat config at the root (Next 16 no longer ships `next lint`), Vitest 5, Tailwind 4,
  Next 16 App Router, React 19, Dexie 4, Zod 4.
- **Validation with Zod at the boundaries.** The fixture is `DatasetSchema.parse`d at import and
  every Dexie import/export is parsed, so drift fails loudly instead of rendering bad data.
- **Ids are `<prefix>_<slug>` strings, globally unique across tables** (checked by
  `findDuplicateIds`) so exports merge without collisions. Phase 1 will mint new ids with a random
  suffix under the same pattern.
- **Requirement status is persisted as a snapshot** in Phase 0. The fixture stores the §3 starting
  states with a rationale; the Phase 1 deterministic matcher will recompute them from links.
- **Every record carries `demo: boolean`.** Lets the UI badge synthetic data and lets later
  "delete demo data" remove it without touching user records.
- **Phase 0 entity subset.** Implemented `PersonProfile`, `EvidenceSource`, `EvidenceArtifact`,
  `EvidenceClaim`, `Skill`, `ClaimSkillLink`, `Opportunity`, `OpportunityRequirement`,
  `RequirementEvidenceLink`, `BridgeTask`. `Dossier`, `DossierItem`, `CaptureEvent`,
  `ConsentGrant`, `ExternalIntegration`, `AuditEvent` land with the features that write them (each
  needs a new Dexie version + migration test). Revision history on links is also deferred.
- **Client-side data loading.** Pages are statically prerendered shells; data is read from
  IndexedDB in the browser (`DataProvider`), seeding the fixture on an empty database. No server
  data path exists, so nothing private can leak through SSR or caches.
- **Next.js telemetry disabled** through a small cross-platform wrapper (`apps/web/scripts/next.mjs`)
  rather than relying on each developer to opt out; `agentRules: false` stops `next dev` from
  writing a second `AGENTS.md`.
- **No Docker / containers.** Node + pnpm native only, per `ARCHITECTURE.md`.
- **CI** runs install/lint/typecheck/test/build on GitHub Actions for PRs; it deploys nothing.

- **2026-10-22 — Phase 1 vertical slice (issue #4).**
  - **Matching is recomputed, not stored by hand.** `rematch` derives every requirement's links
    and status from claims/skills/artifacts after every op; the demo fixture no longer hand-writes
    `requirementEvidenceLinks` — it runs the matcher at import, and a test asserts the §3 states
    and that rematching is a fixed point. Auto links get deterministic ids
    (`rel_<req>--<claim>`) so rematching is idempotent.
  - **"Case study" = artifact of kind `write-up`.** Countable portfolio requirements count
    distinct write-up artifacts with a backed (not `unverified`) claim. Simple, explainable,
    deterministic; a human can reject a match or link other evidence.
  - **Deployment with no proof is Uncertain, not Not-yet**, per §3. Generalised: a known-skill
    requirement with no evidence is Uncertain; a countable one short of its count is Not yet
    supported; language/eligibility with nothing known is Unknown. Eligibility is never assessed.
  - **Language "stated" ≠ "evidenced".** Profile languages make a language requirement Uncertain
    (the listing's language is not known); a linked claim or a human decision makes it Supported.
  - **Human oversight** = reject/restore a match (rejections persist across rematching), link a
    claim manually, or set a status override with a note; the matcher's reasoning stays visible.
  - **Pure ops + atomic diff commit.** All mutations are `Dataset → Dataset` functions in core
    (time and ids injected → deterministic tests); storage applies them in one transaction and
    refuses results with duplicate ids or dangling refs. The vault is small, so reading it whole
    per change is fine for Phase 1; revisit if vaults grow to thousands of records.
  - **Change history** is an append-only `AuditEvent` table (schema v2) that records what changed
    (field names, visibility/redaction transitions), never content.
  - **Redaction state** on artifacts: `none` / `partial` (no text shared) / `redacted` (never in a
    dossier). It affects sharing only; redacted evidence still counts in the private vault.
  - **One dossier format: JSON** (`proofbridge.dossier` v1), previewed in Share Studio. No
    Dossier/DossierItem tables yet — the dossier is derived on demand from persisted state. PDF is
    Phase 3.
  - **Backup restore replaces the vault** (clear + add in one transaction) instead of merging, so
    a fresh install that already seeded the demo cannot end up with duplicates or stale records.
  - **Requirement ids from a parsed listing** are `req_<opportunity-suffix>-NN` so storage order
    (by id) equals listing order.
  - **Service worker only in production builds** and only for the app shell; hand-written (no
    next-pwa/workbox dependency) to keep the cached surface small and auditable.
  - **Playwright e2e runs against `next start`** (the SW needs a production build) on port 5290 by
    default; `PW_CHROMIUM_PATH` allows a system Chromium where `playwright install` is not
    possible. CI installs Playwright's Chromium and runs it after the build.

- **2026-10-22 — Phase 2 capture extension (issue #5).**
  - **WXT 0.21, vanilla TS popup** (no React) to keep the extension bundle small and auditable;
    `imports: false` so every dependency is explicit. Protocol, schemas and sanitisers live in
    `core/capture.ts`, shared by extension and app.
  - **`activeTab` + `scripting`, no host permissions, no content scripts.** Capture can only start
    from a popup click; the extractor is one self-contained function run in the isolated world
    returning plain text (never HTML), so there is no markup to sanitise beyond text normalisation.
  - **Pull, not push.** The app asks the extension for confirmed captures
    (`externally_connectable`, localhost) instead of the extension injecting into or posting to the
    app. A page can therefore never write into the vault through the extension, and there is no
    localhost mutation endpoint at all. Exact-origin check against a user-set app address (default
    `http://localhost:3000`) because `externally_connectable` cannot pin a port.
  - **Pinned extension id via a public manifest `key`.** The app must know whom to address;
    only the public key is committed. A Web Store build would get a different id (Phase 4).
  - **Two-step consent:** confirm in the popup preview, then import explicitly in the Capture
    Inbox (choose opportunity vs evidence, add a claim). Evidence from captures is private.
  - **Duplicate detection** by embedding the capture id in the source label
    (`Browser capture cap_… · host`), so a capture still listed after a failed ack is flagged.
  - **e2e test build** (`wxt build --mode e2e`) adds a host permission for the fictional
    `hostile.test` and a `?tab=` popup parameter, both compiled out of production; hostile pages
    are served via Playwright routing, so no extra port is used.

- **2026-10-22 — Phase 3 (issue #6).**
  - **New `packages/ai`, pure and injected.** Settings, consent, the egress guard and
    suggestion parsing are plain functions with `fetch` and the clock passed in, so the
    "nothing leaves without opt-in" property is unit-tested with a fetch spy rather than
    assumed.
  - **Local model first; cloud blocked.** Per directive §6, only a user-run Ollama-compatible
    endpoint on loopback is accepted. Cloud providers would need accounts and keys, which are
    blocked actions, so they are not implemented.
  - **Three-step consent.** (1) Enable, (2) a consent grant bound to the exact origin and the
    `listing-text` scope (changing the endpoint drops it), (3) a per-request preview of the
    exact JSON plus an explicit Send. No background calls.
  - **AI proposes, the user decides, the matcher judges.** Suggestions are re-classified by the
    same deterministic rules and only added when ticked. `OpportunityRequirement.origin`
    (optional, so schema v2 data stays valid without a Dexie migration) records
    `ai-suggestion`; status always comes from `rematch`.
  - **Consent and the egress log live in `localStorage`, not in the vault.** A backup restored
    elsewhere must not carry consent. The log stores metadata only.
  - **i18n without a library.** About 100 keys did not justify adding next-intl/i18next. Typed
    catalogs + `useSyncExternalStore` over `localStorage`, and a test enforces key and
    placeholder parity. Routes stay unprefixed: the app is a static, offline, single-user
    shell, so locale routing would add nothing.
  - **The "Supported" status is "Étayée" in French and "مدعوم" in Arabic.** e2e tests run in
    English (the default), so the Phase 1 tests are unchanged.
  - **PDF writer written in-house** (~300 lines, no dependency) instead of pdf-lib/jsPDF. It
    keeps the output auditable (no scripts or embedded files possible) and adds nothing to the
    bundle or the supply chain. The trade-off is that it is limited to WinAnsi.
  - **Mixed-direction text** uses `unicode-bidi: plaintext` on text blocks inside `<main>`
    instead of `dir="auto"` attributes on every element.

- **2026-10-22 — Phase 4 release readiness + optional share (issue #7).**
  - **Share links instead of sync.** The gate asks for share links with expiry + revocation and
    sync only "if built". Sync needs a provider account (founder approval), conflict semantics and
    RLS — not built; the encrypted backup file is the portable multi-device path for now.
  - **Client-side encrypted shares, key in the URL fragment.** The service stores ciphertext only,
    so a self-hosted or third-party share service cannot read dossiers and a data leak exposes
    nothing readable. Trade-off: whoever holds the link can read it; we say so, and we do **not**
    call this end-to-end encryption (the viewer code is served by the share service).
  - **Revocation and expiry delete the ciphertext** (not just a flag), keeping a metadata tombstone
    for 30 days so the owner sees what happened. Expiry is mandatory (5 min – 30 days).
  - **No accounts: owner = SHA-256 of a random 256-bit capability** generated by the app. Gives
    tenant isolation without collecting identity; losing it (clearing site data) means losing the
    ability to revoke, so *Turn off* is refused while links may be active.
  - **Own small service, zero runtime deps, Fetch-API handler.** Easy to audit, runs with plain
    Node (type stripping, Node ≥ 22.18 — no build step), and the handler is portable to an edge
    runtime later. JSON-file store is enough for a personal/self-hosted service; a KV/D1 adapter
    is future work. Access log = count + timestamps only (no IP/UA) to avoid becoming tracking.
  - **Encrypted backup: PBKDF2-SHA-256 (600k) + AES-256-GCM via WebCrypto** — no dependency,
    available in every target browser and Node. Argon2 would be stronger against GPU guessing but
    needs WASM; revisit if backups are expected to be exposed widely. Header bound as AAD; iteration
    count bounded on import.
  - **Static export for deployment** behind `PROOFBRIDGE_STATIC_EXPORT=1` with a separate
    `distDir` (`.next-export`) so the `next start` build used by e2e is untouched. Security headers
    ship as `_headers` (Pages format) because a static export cannot set headers itself.
  - **Accessibility/performance gates are automated** with `@axe-core/playwright` (dev-only
    dependency) on every screen in light and dark mode, plus keyboard and accessibility-tree tests;
    perf budgets run with the service worker blocked so sizes are comparable (SW responses report
    uncompressed sizes).
  - **`pnpm release` builds artifacts only** (tarballs, zip, SHA256SUMS, release.json). CI runs it
    and uploads the result. Deployment remains a gated, manual, founder-approved step.
