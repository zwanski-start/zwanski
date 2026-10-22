# @proofbridge/share-server (optional)

A small, self-hosted service for **optional** read-only dossier share links with
**server-enforced expiry and revocation**. ProofBridge works fully without it.

- Stores only AES-256-GCM **ciphertext** produced in the user's browser. The key is in the link's
  `#k=` fragment, which browsers never send to servers.
- Expiry: 5 minutes to 30 days, set at creation. Once expired or revoked, the ciphertext is
  deleted and reads return `410`. Copies a reader already saved cannot be revoked.
- Owners have no accounts: the app generates a random 256-bit owner key; the server stores its
  SHA-256 and scopes list/revoke to it (tenant isolation).
- Access log: a count plus read timestamps (last 50). No IP addresses, user agents or referrers
  are stored. Per-client rate limits on reads (30/min) and creations (30/h).
- Zero runtime dependencies; persistence is one JSON file (`0600`, atomic rewrite).

```sh
pnpm --filter @proofbridge/share-server start   # http://127.0.0.1:8787
# env: PORT, HOST (default 127.0.0.1), SHARE_DATA_FILE, ALLOWED_ORIGINS (comma-separated app
#      origins, default http://localhost:3000), TRUST_PROXY=1 (behind a trusted reverse proxy only)
```

Requires Node ≥ 22.18 (runs the TypeScript source directly via type stripping).
Then in the app: **Share Studio → Online share link → Set up…**, address `http://localhost:8787`.

API, threat model and limits: `SECURITY.md` § Share links, `docs/DEPLOYMENT.md`.
Tests: `pnpm --filter @proofbridge/share-server test` (expiry, revocation, tenant isolation,
CORS, rate limits, hostile bodies, persistence across restart).
