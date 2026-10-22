# ProofBridge OS

> Working product name: **ProofBridge OS** (provisional). Mission: **turn real work into
> portable proof, and portable proof into realistic next steps.**

Local-first, offline-capable web application + PWA, with a least-privilege Chromium MV3
capture extension. The differentiator is the **evidence → claim → skill → requirement →
opportunity → next-step** pipeline, with source-linked provenance and human oversight.

This is **not** an immigration/visa adviser, credential issuer, or eligibility decision engine.
Generated claims are never presented as formally verified.

## Status

**Phase 0 — skeleton.** A pnpm/TypeScript monorepo with typed schemas, offline IndexedDB
storage and a Next.js shell that renders a DEMO / SYNTHETIC vault. No import, matching or export
features yet. See `STATUS.md` for truth-based progress and `docs/MASTER_BUILD_PROMPT.md` for the
full directive.

## How this gets built

An autonomous agent team (see `AGENTS.md`) implements the directive in phases (`ROADMAP.md`).
Every work unit ships with tests and honest status — no invented progress.

## Quick start

Requires Node ≥ 20.9 and pnpm 12 (`corepack enable`). No API key or account.

```sh
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Full steps from an empty machine: `QUICKSTART.md`. Layout and data flow: `ARCHITECTURE.md`.
