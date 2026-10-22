# ARCHITECTURE

Real boundaries and dataflows as implemented (directive §4, §11). No invented isolation.

## Monorepo layout (pnpm workspace)
```
apps/
  web/                 # Next.js 15 + React 19 (App Router). Static, offline, no API key.
  extension/           # PLANNED (Phase 2) — Chromium MV3 capture. Not present yet.
packages/
  core/                # Zod schemas, domain types, deterministic matcher, graph projection.
  fixtures/            # Fully synthetic demo dataset (depends on core).
  config/              # Shared tsconfig base.
  evidence/            # PLANNED — hashing, local imports, provenance, export.
  storage/             # PLANNED — IndexedDB/Dexie repository + migrations.
  graph/               # PLANNED — interactive canvas layer over core's projection.
  ai/                  # PLANNED — optional, opt-in, disabled-by-default adapters.
  ui/                  # PLANNED — reusable accessible components.
```
Only `web`, `core`, `fixtures`, `config` exist today. The rest are named for intent and are **not**
empty-stubbed — see ROADMAP for when each is built.

## Dataflow (Phase 0)
```
packages/fixtures (synthetic Dataset, Zod-validated at load)
        │
        ▼
packages/core
   ├── evaluateOpportunity / evaluateRequirement  (deterministic requirement states)
   └── buildGraph                                 (provenance projection: nodes + edges)
        │
        ▼
apps/web/app/lib/demo.ts  (single derivation point)
        │
        ▼
Server components render 6 screens — no hardcoded numbers, no network, no AI.
```
The UI reads only from `demo.ts`, so screens can never disagree with the engine.

## Key properties
- **Offline-first:** `next build` prerenders every route as static HTML; the demo runs with no server
  round-trips and no keys. Local persistence (IndexedDB/Dexie, versioned migrations) is Phase 1.
- **Deterministic core:** all matching is pure functions over typed data — no LLM, reproducible, testable.
- **Workspace packages as TS source:** consumed via Next `transpilePackages` (ADR-0005); no build step.
- **Accessibility baseline:** semantic HTML, visible focus styles, WCAG-AA-oriented tokens, a graph
  *list* view as the keyboard/screen-reader-equivalent of the future canvas (§10.14).

## Target shape (directive §4, for later phases)
Offline IndexedDB/Dexie with versioned migrations; React Flow (`@xyflow/react`) graph after license/API
validation; optional AI adapters (local Ollama-compatible first, cloud opt-in & off by default); optional
Cloudflare Pages-compatible static frontend; EN/FR/AR + RTL.
