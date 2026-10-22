# SECURITY

> Placeholder — the security engineer must replace this with a real threat model before Phase 1
> features ship. Do not claim audited / zero-knowledge / SOC2 / production-ready until verified.

Scope to model (directive §6): sensitive-document vault; hostile web/PDF/ZIP input; prompt
injection in imported listings; least-privilege MV3 extension; no unauthenticated localhost
mutation; private-by-default sharing with server-enforced revocation; no collection of
immigration/legal-status/precise-location data.

## Phase 3 — optional AI egress, localization and PDF export (issue #6)

This section covers only what Phase 3 added. The overall threat model above is still a
placeholder. Nothing here has been independently audited.

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
