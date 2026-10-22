# RELEASE CHECKLIST

Every release candidate goes through this list. Tick each item **with evidence** (command output,
CI run link). If an item cannot be met, the release is blocked or the item is listed under
"Known limitations" in `STATUS.md` — never silently skipped.

Nothing in this list deploys anything. Live deployment is a separate, founder-approved step
(`docs/DEPLOYMENT.md`).

## 1. Source and supply chain

- [ ] Branch is up to date with `main`; CI is green on the PR.
- [ ] `pnpm install --frozen-lockfile` succeeds (lockfile committed, no ad-hoc installs).
- [ ] No secrets, real identities, legal/immigration status or credentials in the diff or fixtures
      (`git diff main --stat`, review; fixtures are DEMO / SYNTHETIC only).
- [ ] `.env.example` holds no real values; no new environment variable is required for the core demo.
- [ ] New dependencies are justified in `DECISIONS.md` (runtime deps especially).

## 2. Automated checks (all must pass)

```sh
pnpm lint
pnpm typecheck
pnpm test          # unit: core, fixtures, storage, web, extension, share-server
pnpm build         # web (next build) + extension (wxt build + manifest audit)
pnpm e2e           # Playwright on the production build: web (hero workflow, offline, restore,
                   # share expiry/revocation, encrypted backup, axe a11y light+dark, keyboard,
                   # accessibility-tree graph inspection, perf budgets) + extension
pnpm release       # last: static export, extension zip (re-audited), share-server bundle, SHA256SUMS
```

- [ ] All of the above green locally **or** in CI (record which; note `PW_CHROMIUM_PATH` if used).
- [ ] Results appended to `docs/TEST_REPORT.md` (commands, counts, environment).

## 3. Privacy and security gates

- [ ] Core demo runs with **no network** after install and **no API key** (e2e asserts no
      off-machine requests on the hero workflow).
- [ ] Optional online sharing is **off by default**; no request reaches a share service until the
      user enables it, consents and clicks (e2e "share link" test).
- [ ] Share links: expiry and revocation are enforced by the server and deleted ciphertext cannot
      be read (share-server unit tests + e2e).
- [ ] Tenant isolation: an owner key cannot list or revoke another owner's shares (unit test).
- [ ] Encrypted backup: wrong passphrase and tampered files are rejected (core unit tests + e2e).
- [ ] Extension manifest audit passes: only `activeTab`, `scripting`, `storage`; no host
      permissions, content scripts or `<all_urls>`.
- [ ] `SECURITY.md` threat model updated for every new input, output or network path.
- [ ] No claim of "end-to-end encrypted", "zero-knowledge", "audited", "production-ready" or
      "compliant" in UI or docs.

## 4. Accessibility and performance

- [ ] axe-core WCAG 2.1 A/AA: zero violations on every screen in light **and** dark mode, plus the
      public share viewer (e2e).
- [ ] Keyboard: skip link is the first stop; every screen reachable by Tab with a visible focus
      ring; nav activates with Enter (e2e).
- [ ] Screen-reader inspection: every Proof Graph node (requirements + linked claims) is present in
      the accessibility tree (e2e).
- [ ] Reduced motion respected (`prefers-reduced-motion` in `globals.css`).
- [ ] Performance budgets on the production build (e2e, service worker blocked): DOMContentLoaded
      < 1.5 s, vault rendered < 3 s, JS < 300 KB gzip / < 1 000 KB uncompressed per route.

## 5. Artifacts

`pnpm release` writes `dist/release/<version>-<commit>/`:

| File | What |
| --- | --- |
| `proofbridge-web-static.tar.gz` | Static export of the PWA with a `_headers` file (CSP etc.) |
| `proofbridge-extension-chrome-mv3.zip` | Production MV3 extension, manifest re-audited after zipping |
| `proofbridge-share-server.tar.gz` | Optional share service source (Node ≥ 22.18, zero deps) |
| `SHA256SUMS` | Checksums of the above |
| `release.json` | Version, commit, dirty flag, Node version, sizes |

- [ ] The release directory name has **no `-dirty` suffix** (built from a clean commit).
- [ ] Static export smoke-tested: `pnpm preview:static` → open <http://localhost:4173>, demo
      loads, no console CSP errors.
- [ ] Extension zip loads unpacked in Chromium and the id is `gnhdodgpophcenhldkahdaigmpodnmlm`.
- [ ] CI uploaded the `proofbridge-release` artifact.

## 6. Documentation

- [ ] `STATUS.md` entry: what works / tests / what does not work / security risks / next step.
- [ ] `ROADMAP.md` delivered vs planned updated; nothing unimplemented marked delivered.
- [ ] `README.md` / `QUICKSTART.md` commands still work from an empty machine.
- [ ] `docs/RUNBOOK.md` and `docs/DEPLOYMENT.md` reflect any new process or service.

## 7. Founder approval required before (not part of this checklist's automation)

- Any live deployment (Cloudflare Pages project, public share service, domain/DNS).
- Chrome Web Store publishing (developer account).
- Any hosted database / sync provider account (e.g. Supabase).
