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
pnpm e2e         # Playwright: web app + extension, on the production build (run `pnpm build` first), port 5290
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

## 7. Capture extension (optional, Chromium)

Build and load it (Chrome, Chromium, Edge, Brave ≥ 116):

```sh
pnpm build:extension          # → apps/extension/.output/chrome-mv3 (+ manifest permission audit)
```

1. Open `chrome://extensions`, switch on **Developer mode**, click **Load unpacked** and pick
   `apps/extension/.output/chrome-mv3`. The id shown must be `gnhdodgpophcenhldkahdaigmpodnmlm`
   (pinned by the manifest key; the app talks to exactly this id).
2. Pin **ProofBridge Capture** to the toolbar. If your app is not on `http://localhost:3000`, open
   the popup → **Settings**, enter the app address (e.g. `http://localhost:4000`) → **Save**.
3. On a job listing page, click the toolbar button → **Capture this opportunity** (visible page
   text) or select text first → **Save selected evidence**.
4. Review/edit the preview → **Confirm & queue** (or **Discard** — nothing is saved).
5. **Send to local ProofBridge** opens the app's **Capture Inbox**. For each capture choose
   *Opportunity* (requirements are parsed) or *Evidence* (add your claim) → import, or discard.
   Imported captures are removed from the extension.
6. No app running or a different origin? Popup → **Download as file**, then Capture Inbox →
   **Import a capture file**.

The extension has no host permissions and no content scripts: it reads a page only when you
click a capture button. Threat model: `SECURITY.md` § Capture extension.

Extension tests: `pnpm --filter @proofbridge/extension test` (unit) and
`pnpm --filter @proofbridge/extension e2e` (builds the e2e variant, loads it in Chromium next to
the production web app — run `pnpm build` first; honours `PW_CHROMIUM_PATH` and `PORT`).

Next.js telemetry is disabled by the app's scripts (`apps/web/scripts/next.mjs`).

## 8. Encrypted backups and share links (optional)

- **Share Studio → Encrypted backup**: choose a passphrase (≥ 12 characters) → *Export encrypted
  backup*. Restore it with the same passphrase under *Restore encrypted backup*. A lost passphrase
  cannot be recovered.
- **Online share links** are off by default. To try them locally (Node ≥ 22.18):

  ```sh
  ALLOWED_ORIGINS=http://localhost:3000 pnpm share-server   # http://127.0.0.1:8787
  ```

  Share Studio → *Online share link* → *Set up…* → address `http://localhost:8787` → consent →
  *Enable* → pick an expiry → *Create encrypted link*. Open the link in another browser; *Revoke*
  makes it stop working. Copies a reader saved cannot be revoked.

## 9. Release artifacts

```sh
pnpm release          # after lint/typecheck/test/build/e2e — see docs/RELEASE_CHECKLIST.md
pnpm preview:static   # serve the static export on http://localhost:4173 like a static host
```

Artifacts land in `dist/release/<version>-<commit>/` with `SHA256SUMS`. Nothing is deployed;
see `docs/DEPLOYMENT.md`.

## Troubleshooting

- **"Could not open the local database"** — the browser blocks IndexedDB (some private modes do).
  Use a normal window.
- **Port in use** — `PORT=<free port> pnpm dev`.

## 6. Optional: local AI suggestions and languages

- **Language:** use the selector in the header (English, Français, العربية). The choice is
  saved in this browser.
- **AI suggestions are off by default** and are never needed. To try them with a model on your
  own machine:

  ```sh
  # https://ollama.com — runs locally; allow the app's origin to call it
  OLLAMA_ORIGINS=http://localhost:3000 ollama serve
  ollama pull llama3.2
  ```

  Then go to Settings → AI assistance, keep `http://localhost:11434`, tick the consent box and
  enable it. In Opportunity Lab, "Preview the request" shows the exact JSON that would be sent.
  Only the pasted listing text is sent, and only when you click "Send to local model". Remote
  and cloud endpoints are refused.
- **PDF:** Share Studio → "Download dossier (PDF)".
