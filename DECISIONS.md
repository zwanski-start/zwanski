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
