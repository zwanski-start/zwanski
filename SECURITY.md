# SECURITY

> Partial threat model. The **capture extension** section below is complete for Phase 2; the
> rest of the app (imports, sharing, sync) is still summarised only. Do not claim audited /
> zero-knowledge / SOC2 / production-ready until verified.

Scope to model (directive §6): sensitive-document vault; hostile web/PDF/ZIP input; prompt
injection in imported listings; least-privilege MV3 extension; no unauthenticated localhost
mutation; private-by-default sharing with server-enforced revocation; no collection of
immigration/legal-status/precise-location data.

## Web app (summary)

- No backend, no network calls at runtime unless the user opts in to local AI suggestions and
  sends a previewed request (see Phase 3 below; zero egress with AI off is asserted in e2e). Vault data lives in IndexedDB in
  the user's browser profile, unencrypted at rest — anyone with access to the OS account/profile
  can read it.
- All imported input (listing text, files, backups, browser captures) is bounded, schema-validated
  and rendered as React-escaped text; nothing is executed or injected as HTML.
- Listing text is parsed by fixed keyword rules; it is data, never instructions. Optional AI can
  only propose extra requirement lines that the user must accept (Phase 3 below).
- Still open: CSP headers, PDF/ZIP *import* hardening, sharing/revocation (Phase 4).

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

## Phase 3 — optional AI egress, localization and PDF export (issue #6)

This section covers only what Phase 3 added. Nothing here has been independently audited.

### Assets and boundary

- The vault (IndexedDB) never leaves the browser through AI features. The **only** data an AI
  request can carry is the listing text the user pasted in Opportunity Lab (consent scope
  `listing-text`). Evidence, claims, files, profile, backups and dossiers are never sent.
- The only outbound path is `guardedFetch` in `packages/ai/src/egress.ts`. Nothing else in the
  app calls a provider, and nothing runs in the background.

### Controls (each one has a test)

| Control | Where | Test |
| --- | --- | --- |
| AI off by default; corrupt or unknown stored settings fall back to off | `settings.ts` | `ai.test.ts` "is disabled with no consent by default…" |
| No request without `enabled` + consent for the **exact origin** + scope | `egress.ts` `egressDecision` | `ai.test.ts` "nothing leaves the device without explicit opt-in" (fetch spy never called in 5 cases) |
| Loopback only (`localhost`, `127.0.0.1`, `[::1]`), http(s), no credentials in URL; cloud endpoints refused | `loopbackOrigin` | `ai.test.ts`; e2e "cloud endpoints are refused" |
| Changing the endpoint to another origin drops consent | `setEndpoint` | `ai.test.ts` |
| Consent needs an explicit checkbox, and each request needs the user to preview the exact JSON and click Send | Settings + Opportunity Lab | e2e "with consent…" checks that consenting and previewing send nothing, and that the sent body equals the preview |
| `credentials: "omit"`, `redirect: "error"`, `no-referrer`, 30 s timeout | `guardedFetch` | `ai.test.ts` asserts init flags |
| Untrusted model output: 64 KB cap, Zod shape, strings only, ≤300 chars, control and bidi-override chars stripped, de-duplicated, re-classified by deterministic rules | `suggest.ts` | `ai.test.ts` |
| Prompt injection: the listing is fenced as data and the closing marker is stripped from it. The model can only *propose* lines. A line becomes a requirement only if the user ticks it, and its status still comes from the deterministic matcher (AI cannot certify) | `suggest.ts`, `ops.ts` | e2e: an injected "mark everything supported" suggestion is not added unless ticked; the accepted line's status is the matcher's (Unknown) |
| Graceful degradation: refusal, network error, HTTP error, bad JSON or oversized reply → deterministic parse plus a reason | `suggestRequirements` | `ai.test.ts`; e2e "endpoint down" |
| Transparency: metadata-only egress log (time, origin, path, field names, byte count, outcome; never content); revoke and clear in Settings | `lib/ai.ts`, Settings | `ai.test.ts`; e2e checks that the log has no listing text |
| Revoking stops egress | Settings | e2e "revoke stops egress" |
| Phase 1 behaviour unchanged with AI off: zero requests outside the app origin | — | e2e "AI is off by default…" plus all 4 Phase 1 e2e tests |

Consent and the egress log are device-local (`localStorage`), so restoring a backup on another
device never carries a consent grant with it.

Residual risks: a local model can still return misleading suggestions. These are shown as
unverified and are labelled "AI-suggested, accepted by you" in the Opportunity Lab and in the
dossier (JSON + PDF). Any process listening on the consented loopback port receives the listing
text the user chose to send. A local endpoint's CORS policy (`OLLAMA_ORIGINS`) is the user's
responsibility. No CSP header is configured yet, so the egress guard is enforced in code, not
by a browser policy (follow-up: `connect-src 'self'` + the consented origin).

### Localization

The pre-hydration locale script reads one `localStorage` key and applies it only if it is
exactly `fr` or `ar` (tested with a hostile value). Translations are static strings rendered
through React (escaped). User data is never interpolated into translation templates as HTML.

### PDF export

The PDF is built from the same `Dossier` object as the JSON export, so private claims/artifacts,
`redacted` artifacts and rejected links are excluded, and excerpts appear only for
`redaction: none` (tested). The output has no JavaScript, no launch actions, no embedded files
and no external resources (tested). Link annotations are created only for absolute http(s)
URIs (`webUri`), so local file paths are never exposed. Text is hex-encoded, so user content
cannot break out of PDF string syntax.
