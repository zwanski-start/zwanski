# DECISIONS

Engineering tradeoffs and assumptions (directive §8 autonomy rule: resolve ambiguity with the
safest, simplest documented choice and continue). Newest first.

## ADR-0007 — Supply-chain: dependency build scripts disabled by default
**Decision:** `.npmrc` sets `enable-pre-post-scripts=false`; no dependency postinstall runs without
explicit `pnpm approve-builds` review. **Why:** install-time script execution is a common supply-chain
vector; esbuild/vitest work on linux-x64 via their prebuilt platform packages without it.
**Status:** accepted (Phase 0). Revisit if a needed dep genuinely requires a build step.

## ADR-0006 — Extensionless relative imports in shared packages
**Decision:** internal imports in `packages/*` use extensionless specifiers (`./match`), not `./match.js`.
**Why:** tsc (Bundler resolution), Vitest (esbuild) and Next/webpack all resolve extensionless TS; the
`.js` form that TS recommends for NodeNext is not rewritten by webpack and broke `next build`.
**Status:** accepted. If a package is ever published for Node ESM consumers, add a build step + `.js`.

## ADR-0005 — Workspace packages consumed as TypeScript source via `transpilePackages`
**Decision:** `@proofbridge/core` and `@proofbridge/fixtures` export `src/index.ts` directly; the web app
lists them in `next.config.mjs` `transpilePackages`. **Why:** no separate build/watch step in Phase 0,
simpler DX, single source of truth. **Tradeoff:** packages aren't independently publishable yet (fine pre-1.0).

## ADR-0004 — Proof Graph ships first as an accessible list/table; React Flow in Phase 1
**Decision:** Phase 0 renders the provenance projection (`buildGraph`) as a keyboard-navigable list.
**Why:** directive §2.B and §10.14 *require* a graph alternative for mobile/screen-readers regardless, so
building that first is honest and de-risks the interactive canvas. The 2D `@xyflow/react` canvas (license
to be validated per §4) layers onto the same projection in Phase 1. **Status:** accepted; deviation logged.

## ADR-0003 — Bespoke CSS design tokens instead of Tailwind for Phase 0
**Decision:** hand-authored CSS custom properties (`globals.css`) rather than Tailwind.
**Why:** directive §7 demands a memorable, editorial identity that is explicitly "not an admin template";
tokenised CSS gives tighter control of the charcoal/ivory + single-teal system and light/dark, and keeps the
install lean and the boot reliable. **Tradeoff:** less utility-class velocity. Tailwind may be reconsidered
when the `packages/ui` component library is built. **Status:** accepted; deviation logged.

## ADR-0002 — Next.js (App Router) for `apps/web`
**Decision:** Next.js 15 + React 19 as specified in §4. Phase 0 pages are static server components reading
fixtures; no server mutations, no API keys. **Why:** matches the directive stack; static export keeps the
core demo fully offline. **Note:** local-first persistence (IndexedDB/Dexie) and client interactivity arrive
in Phase 1; Next was chosen over Vite to honour the directive's named stack.

## ADR-0001 — pnpm monorepo layout per directive §4
**Decision:** `apps/{web,extension}`, `packages/{core,evidence,storage,graph,ai,ui,fixtures,config}`.
Phase 0 implements `core`, `fixtures`, `config`, `apps/web`; the rest are planned (see ROADMAP) and are
**not** stubbed as done. **Why:** deliver a vertical slice, not empty scaffolding.
