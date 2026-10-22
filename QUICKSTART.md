# QUICKSTART

From an empty machine to the running ProofBridge OS demo. The core demo needs **no API key, no account,
and no network** once dependencies are installed.

## Requirements
- Node.js ≥ 20 (developed on Node 26)
- pnpm ≥ 9 (developed on pnpm 12) — `corepack enable` or `npm i -g pnpm`

## Install
```bash
git clone <this-repo>
cd zwanski            # the ProofBridge OS repo
pnpm install
```

## Run the demo (dev)
```bash
pnpm dev
# open http://localhost:3000
```

## Verify everything (what CI will run)
```bash
pnpm typecheck     # tsc across all packages
pnpm test          # vitest: 14 tests (6 core + 8 fixtures)
pnpm build         # next build — all routes prerender static
```

## Production preview
```bash
pnpm build
pnpm --filter @proofbridge/web start -p 3000
```

## What you should see
Six screens, all driven by synthetic fixture data:
- **Compass** — today's one next action + requirement coverage.
- **Evidence Vault** — artifacts, source-linked claims, verification state, integrity digests.
- **Opportunity Lab** — the demo opportunity with deterministic requirement states:
  TypeScript **Supported**, PostgreSQL **Supported**, Deployment **Uncertain**,
  Two case studies **Not yet supported**, Language **Unknown**.
- **Proof Graph** — the provenance chain as an accessible list (interactive canvas: Phase 1).
- **Bridge Plan** — tasks tied to exact gaps.
- **Share Studio** — a default-private dossier preview.

All data is labelled **DEMO / SYNTHETIC**.
