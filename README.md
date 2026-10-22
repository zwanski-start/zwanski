# ProofBridge OS

> Working product name: **ProofBridge OS** (provisional). Mission: **turn real work into
> portable proof, and portable proof into realistic next steps.**

Local-first, offline-capable web application + PWA, with a least-privilege Chromium MV3
capture extension. The differentiator is the **evidence → claim → skill → requirement →
opportunity → next-step** pipeline, with source-linked provenance and human oversight.

This is **not** an immigration/visa adviser, credential issuer, or eligibility decision engine.
Generated claims are never presented as formally verified.

## Status

**Phase 0 complete — the app boots and renders a synthetic demo with no API key.**
A pnpm monorepo (`apps/web`, `packages/core`, `packages/fixtures`, `packages/config`) with typed
Zod schemas, a deterministic requirement-matching engine, six screens, and 14 passing unit tests.
See `STATUS.md` for truth-based progress and `docs/MASTER_BUILD_PROMPT.md` for the full directive.

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # 14 tests  ·  pnpm typecheck  ·  pnpm build
```
Full instructions: `QUICKSTART.md`. The core demo runs fully offline — no account, no key, no AI.

The demo shows the hero workflow deterministically: TypeScript & PostgreSQL **Supported**,
Deployment **Uncertain**, two case studies **Not yet supported**, Language **Unknown** — every
state traceable to source-linked evidence, with no probabilities or opaque scores.

## How this gets built

An autonomous agent team (see `AGENTS.md`) implements the directive in phases (`ROADMAP.md`).
Every work unit ships with tests and honest status — no invented progress.
