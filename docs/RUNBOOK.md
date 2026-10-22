# RUNBOOK

Operational procedures for running ProofBridge locally and (once approved) the optional share
service. Deployment steps live in `docs/DEPLOYMENT.md`; release steps in
`docs/RELEASE_CHECKLIST.md`.

## App

| Symptom | Check | Fix |
| --- | --- | --- |
| "Could not open the local database" | Browser blocks IndexedDB (some private modes) | Use a normal window |
| App shows old UI after an update | Service worker serving the previous shell | Reload twice, or DevTools → Application → Service workers → Unregister |
| Data missing on another browser/origin | IndexedDB is per origin and per profile | Export a backup (encrypted preferred) and restore it there |
| Restore says "too large" / "broken reference" | File > 10 MB or edited by hand | Use an unmodified export; plain backups can be inspected as JSON |
| Encrypted restore: "wrong passphrase, or the file was modified" | Passphrase typo, or the file changed | No recovery without the exact passphrase (by design) |
| Port in use | `PORT=<free> pnpm dev` | — |

Reset: **Compass → Reset demo data** wipes the local vault and re-seeds the synthetic demo.
Share settings (owner key, created links) live in `localStorage` under `proofbridge.share.v1`
and are removed with **Share Studio → Turn off online sharing** (only once no link is active).

## Share service

Start: `pnpm share-server` (env: `PORT`, `HOST`, `SHARE_DATA_FILE`, `ALLOWED_ORIGINS`,
`TRUST_PROXY`). Health: `curl http://127.0.0.1:8787/healthz` → `{"ok":true}`.

| Symptom | Cause | Fix |
| --- | --- | --- |
| App: "could not be reached" | Service down, wrong address, or the page's CSP `connect-src` excludes it | Start it; check the address in Share Studio; on a static host check `_headers` |
| App: "Origin not allowed" (403) | App origin not in `ALLOWED_ORIGINS` | Add the exact `scheme://host:port`, restart |
| Viewer: "This share does not exist" | Wrong id, or tombstone older than 30 days was purged | Owner creates a new link |
| Viewer: expired / revoked | Working as intended | Owner creates a new link |
| Viewer: "could not be decrypted" | Link truncated (fragment lost, e.g. by a chat app) | Resend the full link including `#k=…` |
| `429` | Rate limit (30 reads/min/client, 30 creates/h/client) | Wait; behind a proxy set `TRUST_PROXY=1` so clients are not merged |
| `507` | 10 000 records reached | Investigate abuse; old tombstones purge automatically |

Emergency revoke of **everything**: stop the service, then either delete `SHARE_DATA_FILE`
(all links → "does not exist") or keep it for audit and move it aside. Readers' saved copies
cannot be recalled — say so in any incident notice.

Backups of the share service: copy `SHARE_DATA_FILE` while the process is stopped or at any time
(writes are atomic renames). It contains ciphertext, owner-key hashes and read timestamps only.

Data handling: never add request logging of URLs with fragments (browsers do not send them, but
proxies/clients that mis-handle links might); do not log `Authorization` headers.

## Extension

See `QUICKSTART.md` § Capture extension. If the Capture Inbox says the extension was not
detected: check the extension id, the app address in the popup settings, and that the app runs on
`localhost`/`127.0.0.1`. Otherwise use **Download as file** → **Import a capture file**.

## Release

`docs/RELEASE_CHECKLIST.md`. Artifacts: `pnpm release` → `dist/release/<version>-<commit>/`, verify
with `cd dist/release/<dir> && sha256sum -c SHA256SUMS`.
