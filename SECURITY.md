# SECURITY

> Threat model, refreshed for Phase 4. The **capture extension**, **encrypted backup** and
> **share links** sections are detailed; PDF/ZIP import hardening is Phase 3's. There is no sync.
> Do not claim audited / zero-knowledge / end-to-end encrypted / SOC2 / production-ready until
> verified against defined criteria.

Scope to model (directive §6): sensitive-document vault; hostile web/PDF/ZIP input; prompt
injection in imported listings; least-privilege MV3 extension; no unauthenticated localhost
mutation; private-by-default sharing with server-enforced revocation; no collection of
immigration/legal-status/precise-location data.

## Web app (summary)

- No backend, no network calls at runtime (asserted in e2e). Vault data lives in IndexedDB in
  the user's browser profile, unencrypted at rest — anyone with access to the OS account/profile
  can read it.
- All imported input (listing text, files, backups, browser captures) is bounded, schema-validated
  and rendered as React-escaped text; nothing is executed or injected as HTML.
- Listing text is parsed by fixed keyword rules; it is data, never instructions (no AI in the loop).
- The only optional network path is the user-enabled share service (§ Share links below).
- CSP: the static export ships a `_headers` file (CSP `default-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `nosniff`, `no-referrer`, restrictive `Permissions-Policy`). Script
  CSP still needs `'unsafe-inline'` (Next static export inlines bootstrap data, no nonces); the
  `next start` server sends no CSP. Still open: PDF/ZIP import hardening (Phase 3).

## Capture extension (Phase 2)

`apps/extension` — Chromium Manifest V3, built with WXT. Manifest (production build, enforced by
`scripts/audit-manifest.mjs` on every `pnpm build`):

| Field | Value | Why |
| --- | --- | --- |
| `permissions` | `activeTab`, `scripting`, `storage` | read the clicked tab once; run the extractor there; keep the confirmed queue |
| `host_permissions` | none | no standing access to any site; access only via a click (`activeTab`) |
| `content_scripts` | none | nothing runs on pages the user did not act on |
| `externally_connectable.matches` | `http(s)://localhost/*`, `http(s)://127.0.0.1/*` | only a local ProofBridge app can message the extension |
| `web_accessible_resources` | none | pages cannot load or fingerprint extension files |
| CSP (extension pages) | `script-src 'self'; object-src 'none'` | no remote or inline script in the popup |
| `key` | public key only | pins the extension id the app addresses; no private key in the repo |

No `<all_urls>`, `tabs`, `cookies`, `history`, `webRequest`, `downloads`, `clipboardRead`,
`nativeMessaging` or optional permissions.

### Assets

Pages the user captures (job listings, excerpts), the extension's queue of confirmed captures
(`chrome.storage.local`), the app's vault (IndexedDB on the app origin).

### Trust boundaries (real ones — there is no container or process isolation of our own)

1. **Third-party page ↔ extension.** The page is hostile. The extension never runs code in a page
   until the user clicks a popup button, and then runs one self-contained function
   (`lib/extract.ts`) in Chrome's **isolated world**: separate JS globals, so the page cannot
   monkey-patch `getSelection`/`innerText` for it. It returns plain text and the title only —
   never markup, form values, cookies, storage or other frames. The popup re-sanitises the result
   (`sanitizeCapturedText` in `@proofbridge/core`: strips C0/C1 controls, bidi overrides,
   zero-width characters; normalises newlines; bounds length to 20 000 chars) and treats it as
   untrusted data from then on.
2. **User ↔ extension.** Nothing is stored until the user sees an editable preview and presses
   *Confirm & queue*; *Discard* stores nothing. The page URL is reduced before storage (no
   `user:password`, no fragment, no secret-looking query parameters such as `token`, `key`,
   `session`, `code`, `sig`).
3. **Extension ↔ local app.** The app pulls; the extension never pushes. The app calls
   `chrome.runtime.sendMessage(EXTENSION_ID, …)`; Chrome only exposes this to origins in
   `externally_connectable` and fills in `sender.origin` itself (a page cannot forge it). The
   background (`lib/router.ts`) additionally requires: no `sender.id` (not another extension), a
   **top-level frame**, and `sender.origin` **exactly equal to the app address the user set** in
   the popup (default `http://localhost:3000`). Requests are schema-validated (`AppRequestSchema`,
   strict): only `ping`, `list` (read the confirmed queue) and `ack` (remove ids). There is no
   message that creates, edits or triggers a capture, so even the app cannot drive capture.
4. **Local app ↔ vault.** The app validates every response again (`AppResponseSchema`), shows each
   capture as escaped text in the Capture Inbox, and imports only when the user chooses
   *Import as opportunity* / *Save as evidence*. Imports go through the same pure ops as manual
   entry (`addOpportunity` / `addEvidence`) with provenance: `captureMethod: selected-webpage`,
   source label with the capture id, page URL (shown as text, never as a link), capture time.
   Imported evidence is **private** by default.
5. **Fallback: file.** If the app origin differs (or messaging is unavailable), the popup can
   download the queue as a `proofbridge.capture` JSON file; the app's file import bounds it to
   1 MB and applies the same strict schema.

### Threats and mitigations

| Threat | Mitigation | Test |
| --- | --- | --- |
| Passive capture / browsing surveillance | no content scripts, no host permissions, no tab/navigation listeners; capture only from a popup click | e2e "no passive capture"; manifest audit |
| Hostile page messages the extension | not in `externally_connectable` → `chrome.runtime` absent | e2e (`hostile.test` probe sees no runtime) |
| Hostile page on another **local** origin (e.g. a different dev server on 127.0.0.1) | exact-origin check against the configured app address → `ok:false`, nothing leaked | e2e (127.0.0.1:5299 probe refused; control: removing the check makes it fail); router unit tests |
| Page forges `window.postMessage` "app" messages | nothing listens to page messages | e2e fixture sends them; queue stays empty |
| Page monkey-patches DOM APIs to inject text | isolated world | e2e: `INJECTED-*` never appears |
| Hidden prompt-injection text | `innerText` skips `display:none`; preview shows exactly what is kept; listing parsed by keyword rules, no AI | e2e: `HIDDEN-PAYLOAD` absent; injected requirement line stays *Unknown* |
| Markup/script in captured text (XSS) | plain text only; React-escaped `<pre>` in the app; `textContent`/`value` in the popup | e2e + jsdom: `<img onerror>` text rendered as text, no element created |
| Password fields / form values captured | extractor never reads form values (`innerText` excludes them) | e2e: password value absent |
| Secrets in captured URLs | URL sanitiser | core unit tests |
| Oversized / malformed data, tampered `chrome.storage` | length bounds, strict schemas on store, read, send and receive; invalid stored entries dropped; queue max 20 | core + router unit tests, inbox jsdom test |
| Another extension impersonates ours | the app addresses one pinned id; responses schema-validated | design |
| Other extensions messaging ours | `externally_connectable` has no `ids`; router rejects any `sender.id` | router unit test |
| Credential/token collection, auto-submission, CAPTCHA bypass | not implemented; no such permissions | manifest audit |

### Residual risks / limitations

- `chrome.storage.local` is **not encrypted**; queued captures sit in the browser profile until
  imported or deleted (popup *Delete* / *Delete all*). Imported data is unencrypted in IndexedDB.
- Any web page served from the **configured** app origin can read and clear the queue. If you run
  other software on that exact localhost port, it can do the same. Use a dedicated port.
- `innerText` is "rendered text", not "visible to a human": text that is transparent, off-screen
  or tiny is still captured. The preview is the control — review it before confirming.
- The page controls what text it shows, so a capture is never evidence of authenticity; the
  source URL is provenance, not verification.
- The e2e build adds a host permission for the fictional `http://hostile.test/*` (Playwright cannot
  click the toolbar to grant `activeTab`) and lets the popup target a tab id from its URL. Both are
  compiled out of the production build; the manifest audit fails if host permissions appear.
- Not yet: Chrome Web Store packaging (its id would differ from the pinned unpacked id), Firefox.

## Encrypted vault backup (Phase 4)

`packages/core/src/crypto.ts`, Share Studio → *Encrypted backup*.

- **Construction:** AES-256-GCM; key from the passphrase via PBKDF2-HMAC-SHA-256, 600 000
  iterations, random 16-byte salt; random 12-byte IV per file. The envelope header (format,
  version, KDF params, salt, IV, createdAt) is bound as GCM additional data, so editing any of it
  fails authentication. WebCrypto only, no dependency, no hardcoded key; the passphrase is held in
  component state until export and never stored.
- **Hostile files:** size bound before parsing, strict envelope schema (unknown fields refused),
  KDF iterations accepted only in [100 000, 5 000 000] (no weak downgrade, no CPU-exhaustion
  file), then the full plain-backup validation (schema, unique ids, no dangling refs).
- **What it protects:** a backup file at rest outside the browser (USB stick, cloud drive, mail)
  against someone without the passphrase. **What it does not:** the live vault in IndexedDB
  (unencrypted), a weak/reused passphrase (offline guessing is possible; 12-character minimum
  only), a compromised device or browser extension reading the page while unlocked.
- Wrong passphrase and tampered file give the same error (no oracle). Lost passphrase = lost backup.

## Share links (Phase 4, optional)

Components: Share Studio *Online share link* panel (`apps/web/src/lib/share.ts`), the share
service (`apps/share-server`), and its public viewer page (`/s/<id>`).

### Data flow

1. Off by default. The user opens the panel, enters a share-service address (https, or http only
   for loopback), reads what is uploaded and ticks consent. The app generates a random 256-bit
   **owner key** (localStorage) — the only "identity"; there are no accounts.
2. *Create encrypted link*: the app builds the same dossier as the preview (private/redacted
   evidence already excluded), encrypts it with a **fresh random AES-256-GCM key**, and POSTs only
   `{iv, ciphertext, ttlSeconds}` with `Authorization: Bearer <owner key>`
   (`credentials: omit`, `no-referrer`).
3. The service stores ciphertext, `SHA-256(owner key)`, timestamps; returns an unguessable
   128-bit id. The link is `<service>/s/<id>#k=<key>` — the fragment is never sent in HTTP.
4. A reader opens the link: the viewer page (hash-pinned CSP, no third-party resources) fetches
   the ciphertext from its own origin and decrypts in the browser; rendering uses `textContent` only.
5. Owner *Revoke* → `DELETE` → ciphertext deleted, tombstone kept; reads return `410 revoked`.
   Expiry (5 min – 30 days, chosen at creation) → ciphertext deleted on the next sweep; reads
   return `410 expired`.

### Threats and mitigations

| Threat | Mitigation | Test |
| --- | --- | --- |
| Share service (or its operator / a DB leak) reads dossiers | client-side encryption; key only in the fragment; server never sees it | unit + e2e: stored data and request bodies contain no plaintext or key |
| Link guessed / enumerated | 128-bit random ids; 256-bit keys; read rate limit per client | unit (rate limit) |
| Link outlives intent | mandatory expiry ≤ 30 days; revocation deletes ciphertext server-side | unit (clock-injected expiry, revoke, persistence across restart) + e2e |
| Another user lists/revokes my shares (tenant isolation) | owner = hash of a 256-bit capability; list/revoke scoped to it; foreign id → same 404 as unknown | unit "tenant isolation" |
| Cross-site page drives owner API with the user's browser | bearer key not ambient (no cookies); CORS only for configured exact app origins; disallowed `Origin` → 403 | unit "CORS" |
| Hostile request bodies | JSON-only, 415 otherwise; strict field set; base64url only; size bounds (body and ciphertext); per-owner active cap (50); store cap | unit "hostile requests" |
| XSS via dossier content in the viewer | `textContent` rendering, no `innerHTML`; CSP `default-src 'none'` with script/style hashes; `frame-ancestors 'none'` | unit (CSP + no `innerHTML`), e2e axe on viewer |
| Key leaks via Referer / caches | `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `noindex` | unit headers |
| Silent upload | nothing is sent until enabled + consent + click; e2e asserts no request before | e2e |
| Access logging becomes tracking | only a count and read timestamps (last 50); no IP/UA/referrer stored | design (`store.ts`) |

### Residual risks / limitations

- **Anyone with the full link can read the share** until expiry/revocation, and can keep a copy:
  **already downloaded/saved/printed content cannot be revoked** (stated in the app and viewer).
- This is **not "end-to-end encryption"** of the vault and is not claimed as such: the app and
  viewer code come from the hosts that serve them; a malicious or compromised share-service
  operator could serve a viewer that exfiltrates the key from the fragment. Trust in the
  share-service operator for *code integrity* remains; only *storage* confidentiality is removed.
- The owner key sits in `localStorage` on the creating device (readable by anything running on
  the app origin, e.g. a malicious extension). Losing it (clearing site data) means you can no
  longer revoke — links still expire. *Turn off* is refused while links may be active.
- Rate limits key on the TCP peer address (or first `X-Forwarded-For` hop with `TRUST_PROXY=1`);
  they are in-memory and per process.
- The service sees client IP addresses at the transport layer even though it stores none; a
  reverse proxy may log them.
- Viewer pages are publicly reachable for any well-formed id (they reveal nothing without a valid
  id + key).
- Not built: password-protected shares, per-reader links, access logs with reader identity,
  Workers/KV storage adapter, sync.
