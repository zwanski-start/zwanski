# ARCHITECTURE

Real boundaries only — there is **no container isolation**; everything runs as ordinary Node
processes (dev/build) and in the user's browser (runtime).

## Packages (Phase 0)

```
apps/web            Next.js 16 App Router + React 19 + Tailwind 4. UI shell and screens.
packages/core       Zod schemas + inferred types for the domain model; integrity helpers
                    (dangling references, duplicate ids, explicit requirement counts).
packages/storage    Dexie 4 IndexedDB database: versioned schema list (MIGRATIONS),
                    import/export/seed/clear. Validates with core schemas on every read/write.
packages/fixtures   DEMO / SYNTHETIC dataset for the §3 hero workflow, schema-validated at import.
packages/config     Shared tsconfig base.
```

Dependency direction: `web → storage → core`, `web → fixtures → core`. `core` has no runtime
dependency other than Zod and never touches I/O.

Planned per directive §4 (not created yet): `apps/extension`, `packages/{evidence,graph,ai,ui}`.

## Data flow

1. Browser loads a statically prerendered page shell (no server-side data).
2. `DataProvider` (`apps/web/src/lib/data.tsx`) opens IndexedDB database `proofbridge`.
3. If every entity table is empty, it writes the fixture dataset in one transaction.
4. It reads all tables back (`exportDataset`), validates them with `DatasetSchema`, and renders.
5. Screens derive views from persisted relations only (`apps/web/src/lib/select.ts`); no edge or
   status is invented in the UI.

No network request is made by the app at runtime. There is no backend, no auth, no sync.

## Domain model (Phase 0 subset)

`EvidenceSource → EvidenceArtifact → EvidenceClaim —ClaimSkillLink→ Skill`
`Opportunity → OpportunityRequirement —RequirementEvidenceLink→ EvidenceClaim`
`OpportunityRequirement → BridgeTask` (next step)

Links carry attribution (human / parser / ai-suggestion), review state and visibility. Artifacts
carry an optional SHA-256 of their bytes — integrity, not authenticity.

## Schema versioning

`packages/storage/src/db.ts` holds an append-only `MIGRATIONS` list (one Dexie `version()` each).
The latest version must equal `core`'s `SCHEMA_VERSION` (checked at module load), which is also
written into exports.
