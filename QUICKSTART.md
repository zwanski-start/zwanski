# QUICKSTART

From an empty machine to the running local demo. No API key, no account, no Docker, no paid
service and no AI model are needed. All demo data is **DEMO / SYNTHETIC**.

## 1. Prerequisites

- **Node.js ≥ 20.9** (developed on Node 26). Check with `node -v`.
- **pnpm 12** via Corepack (ships with Node):

  ```sh
  corepack enable
  corepack prepare pnpm@12.11.2 --activate   # or: npm install -g pnpm@12
  pnpm -v
  ```

- `git`.

## 2. Get the code and install

```sh
git clone https://github.com/zwanski-start/zwanski.git proofbridge
cd proofbridge
pnpm install
```

`pnpm install` is the only step that needs the network (to download npm packages). Everything
after it runs offline.

## 3. Run the demo

```sh
pnpm dev
```

Open <http://localhost:3000>. On first load the app seeds the synthetic demo vault into this
browser's IndexedDB and renders it: Compass, Evidence Vault, Opportunity Lab, Proof Graph (list
view), Bridge Plan. "Reset demo data" on Compass wipes local data and re-seeds it.

Use another port with `PORT=4000 pnpm dev`.

## 4. Production build

```sh
pnpm build
pnpm --filter @proofbridge/web start   # serves the build on http://localhost:3000
```

## 5. Checks

```sh
pnpm lint        # ESLint (typescript-eslint, Next, React hooks)
pnpm typecheck   # tsc --noEmit in every package
pnpm test        # Vitest in every package (IndexedDB via fake-indexeddb)
pnpm build       # Next.js production build
pnpm e2e         # Playwright smoke on the production build (run `pnpm build` first), port 5290
```

`pnpm e2e` needs a Chromium once: `pnpm --filter @proofbridge/web exec playwright install chromium`.
Alternatively point it at an installed Chromium: `PW_CHROMIUM_PATH=/usr/bin/chromium pnpm e2e`.
Use `PORT=<port> pnpm e2e` if 5290 is taken.

## 6. Try the §3 demo by hand

1. **Opportunity Lab** — TypeScript and PostgreSQL are *Supported*, deployment *Uncertain*, two
   case studies *Not yet supported*, language *Unknown*.
2. **Evidence Vault → Add evidence** — kind "Write-up / case study", any title and claim → Save.
   The inspector shows its coverage; the case-studies requirement turns *Supported* in Opportunity
   Lab, Proof Graph and the Share Studio dossier preview.
3. Remove that claim in the inspector → every surface reverts.
4. Production build only: load once online, go offline, reload — the app shell comes from the
   service worker and the vault from IndexedDB.
5. **Share Studio** — download the dossier (JSON) or a vault backup; restore the backup in another
   browser profile.

Next.js telemetry is disabled by the app's scripts (`apps/web/scripts/next.mjs`).

## Troubleshooting

- **"Could not open the local database"** — the browser blocks IndexedDB (some private modes do).
  Use a normal window.
- **Port in use** — `PORT=<free port> pnpm dev`.
