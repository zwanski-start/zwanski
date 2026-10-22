# ProofBridge OS

> Working product name: **ProofBridge OS** (provisional). Mission: **turn real work into
> portable proof, and portable proof into realistic next steps.**

Local-first, offline-capable web application + PWA, with a least-privilege Chromium MV3
capture extension. The differentiator is the **evidence → claim → skill → requirement →
opportunity → next-step** pipeline, with source-linked provenance and human oversight.

This is **not** an immigration/visa adviser, credential issuer, or eligibility decision engine.
Generated claims are never presented as formally verified.

## Status

**Phase 2 — capture extension.** Offline Evidence Vault, deterministic requirement matching,
dossier export and backup (Phase 1), plus a least-privilege Chromium MV3 extension
(`apps/extension`) that captures a listing or selected text only on click, after preview and
confirmation, into the local app's Capture Inbox. See `STATUS.md` for truth-based progress and
`docs/MASTER_BUILD_PROMPT.md` for the full directive.

## How this gets built

An autonomous agent team (see `AGENTS.md`) implements the directive in phases (`ROADMAP.md`).
Every work unit ships with tests and honest status — no invented progress.

## Quick start

Requires Node ≥ 20.9 and pnpm 12 (`corepack enable`). No API key or account.

```sh
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test && pnpm build
# extension: load apps/extension/.output/chrome-mv3 via chrome://extensions → "Load unpacked"
```

Full steps from an empty machine: `QUICKSTART.md`. Layout and data flow: `ARCHITECTURE.md`.
