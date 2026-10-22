# PROOFBRIDGE OS — AUTONOMOUS MASTER BUILD DIRECTIVE

> Working product name: **ProofBridge OS** (provisional; do not claim trademark or domain availability).  
> Mission: **Turn real work into portable proof, and portable proof into realistic next steps.**  
> Build: production-minded open-source web application + offline-first PWA + Chromium Manifest V3 browser extension, with optional desktop packaging in a later phase.  
> Start immediately. Do not ask the founder questions. Make safe documented engineering choices, work in phases, and deliver tested software rather than a slide deck or a static mockup.

## 0. Founder context and non-negotiable design intent

The founder is a multilingual full-stack developer, IT specialist and authorized security researcher using Omarchy (Arch-based Linux), with experience in TypeScript, Python, Next.js, React, Supabase, Cloudflare, Docker, automation and AI agents. He studies computer science, builds customer software and a cybersecurity venture, and has experienced barriers to conventional employment and access to international opportunities. His work includes security research, web platforms, repair, operations software and open source.

The product must generalize beyond him. Target self-taught builders, freelancers, students, career changers, low-resource learners and people with interrupted or nontraditional career histories. Do not require users to reveal migration/refugee status, sensitive identity, nationality, or immigration paperwork. Never seed the product with the founder's real personal information or copy data from his other repositories without explicit permission.

Do not rebuild his existing job application tracker, cyber agent office, Vulzero platform, bug bounty pipeline, inventory/POS tools, generic portfolio site, or browser performance tool. **The differentiator is the evidence-to-eligibility-to-action pipeline.**

## 1. Product thesis

Most tools ask people to fill in a résumé. ProofBridge asks: What have you actually done? Where is the evidence? Which opportunity requirements does that evidence support? Which requirements are unmet or uncertain? What is the next achievable action?

The core loop must be usable from day one:

1. **Capture** evidence: a project, repository export, certificate, project screenshot, testimonial, document, dated work sample or manually described accomplishment.
2. **Structure** it into source-linked claims and demonstrated skills, without overstating authenticity.
3. **Explore** a specific opportunity: job, scholarship, fellowship, grant, training programme or client brief (user-pasted text/URL; no invented live listings).
4. **Compare** opportunity requirements with evidence; show Supported / Uncertain / Not Yet Supported with an explanation and clickable provenance.
5. **Bridge** the gaps: produce a small actionable plan that can be completed and added to the evidence graph.
6. **Package** a tailored, selectively disclosed opportunity dossier (web presentation, PDF, JSON) for human approval and export.
7. **Return** later; new evidence automatically updates linked requirements, without rewriting history.

This is **not** an immigration eligibility decision engine, visa adviser, employer background-check service, credential issuer, or guarantee of work. Never present generated claims as formally verified.

## 1.1. Product position, validation and sustainable business

- **Free personal tier:** fully usable local Evidence Vault, graph, manually imported opportunities, one dossier export format and offline access. Do not artificially lock data export.
- **Optional paid convenience tier (design only until explicitly approved):** multi-device encrypted sync, advanced dossier layouts and team feedback/review workflows. Never add billing keys or payment flows without authorization.
- **Institutional tier (later):** universities, NGOs, training providers and employers may review portfolios or issue their own attestations after proper identity/trust design; no marketplace that sells access to vulnerable users or their documents.
- **Defensibility:** explainable requirement-to-evidence matching; editable human oversight; portable, source-linked records; strong offline operation; selective disclosure and language accessibility.
- **Product validation:** instrument opt-in, privacy-preserving local metrics such as completed imports, time to first evidence-backed requirement, and completed dossier exports. No analytics SDK or telemetry enabled without consent. Prepare usability test scripts for self-taught learners and freelancers, using synthetic profiles.
- Do not claim market uniqueness, name clearance, registered trademark, secured partnerships, verified employment outcomes or externally validated eligibility.

## 2. Primary user experience — original, visual, interactive

Design one coherent interface with the following real screens and behaviors:

### A. Home / Compass
- Today: one meaningful next action, saved opportunities, open evidence gaps and the last successful evidence capture.
- Clear local-only mode indicator; no pressure to create an account.
- Zero empty fake analytics. If no data exists, show an interactive, explicitly synthetic demo and a simple start action.

### B. Proof Graph (signature UI)
- Interactive 2D graph: **Evidence → Claim → Skill → Requirement → Opportunity → Next Step**.
- Pan, zoom, keyboard navigation, filter by source, confidence, recency, and visibility.
- Selecting a node opens a small inspector with originating source, dates, coverage, redaction state, and change history.
- Edges must derive from typed persisted relations; never draw fictional links.
- Graph is a presentation of a relational provenance model, not the sole database.
- Compact list/table alternatives for mobile and accessibility.

### C. Evidence Vault
- Import a PDF, image, plain text, Markdown file, JSON export, ZIP of a user's own public repository, or manual entry.
- Extract text locally where feasible, preserve original bytes, compute SHA-256 integrity digests, record source and capture timestamp.
- For each extracted claim display **user-stated**, **source-present**, **issuer-verified if genuinely verified**, or **unverified/uncertain**; hashing alone never establishes authenticity.
- Inspect, edit, redact, duplicate, delete and export. Clear provenance remains even when display text is corrected.
- Import and export portable archives; no account/repository dependency; restore demo on a fresh browser from exported archive.
- Never auto-collect passwords, access tokens, bank details, immigration papers or other sensitive records.

### D. Opportunity Lab
- Paste opportunity text or URL; import via extension action or manual form. Keep original source, retrieval time and source link.
- Parse concrete, testable requirements into a checklist. If extraction is uncertain, label it and allow correction.
- Match requirements to evidence with a transparent rule-based baseline; AI can propose links but cannot silently certify them.
- Show reasoned requirement states: **Supported**, **Uncertain**, **Not yet supported**, **Not applicable**.
- Add filters by category, geography, language, remote/on-site and deadline; unknown values stay **Unknown**, never inferred.
- A simple opportunity map/world explorer is a secondary visual, with **only user-imported, source-grounded location data** and no invented live availability.
- Eligibility questions involving residency, visa, work authorization or legal status remain **Needs authoritative confirmation** unless a verifiable official source supports a narrow factual statement. Provide official links and source dates, not legal advice or an automated approval/denial.

### E. Bridge Plan
- Convert missing requirements into small proposed tasks connected to exact evidence gaps.
- Let the user set a weekly time budget and see timelines recalculate from editable effort estimates (not invented success probabilities).
- Allow manual completion with newly attached proof. Completing a task does not automatically imply a skill or credential is proven.
- Provide an interactive before/after coverage visualization that updates immediately when a claim is added or removed.

### F. Share Studio
- Compose a concise, opportunity-specific evidence dossier: about me, relevant project stories, requirement coverage, selected sources and contact preferences.
- Preview exact information before sharing; default everything private.
- Export polished PDF and machine-readable JSON with supporting evidence references.
- Provide an optional read-only public share page only after explicit user action; support expiring access and server-enforced revocation for online links. Clearly state that already downloaded files cannot be revoked.
- Never put raw source documents or sensitive personal data into a public link by default.
- Support multiple authentic CV versions or a portfolio layout as outputs; this must not become the primary product.

### G. Capture Extension
- Chromium Manifest V3 extension, implemented with WXT or another maintained MV3 framework.
- Toolbar action: **Capture this opportunity** / **Save selected evidence** / **Send to local ProofBridge**.
- Use `activeTab` and least-privilege runtime permissions, with explicit user click. Never request `<all_urls>` permanently unless indispensable and clearly justified; avoid broad content scripts.
- Only extract user-selected text or plainly visible relevant listing content from the active tab. Show a preview and require confirmation before save.
- No passive browsing history collection, cookies, auth token collection, form-field surveillance, automatic job submissions, tracking pixels or CAPTCHA bypass.
- Sanitise captured markup. Treat third-party pages as hostile untrusted input.
- Work without cloud login via secure extension-to-local-app integration. Provide a documented fallback when browser-origin/localhost constraints apply.

## 3. Hero workflow / compulsory live demo

Provide deterministic synthetic sample data:

- A self-taught developer has an exported code repository, an anonymized customer project write-up and a course certificate.
- An imported opportunity asks for: TypeScript, PostgreSQL, deployment experience, two case studies and a language requirement.
- Importing the evidence creates source-linked claims.
- The comparison marks TypeScript and PostgreSQL **Supported**, deployment **Uncertain** where no proof is present, two case studies **Not yet supported** if there is only one, and language **Unknown** until stated or evidenced.
- Add a second case study. The coverage visualization, graph links and dossier preview all update from persisted state.
- Remove a claim and verify those surfaces update consistently.
- Run the same flow offline, reload the page, and show the persisted result.

This demo must run locally without API keys, paid services, online accounts or a generative AI model. Mark all data **DEMO / SYNTHETIC**.

## 4. Recommended stack and constraints

Use a TypeScript `pnpm` monorepo with conventional, maintainable packages:

```
apps/
  web/                 # Next.js + React + Tailwind + accessible UI
  extension/           # Chromium MV3/WXT capture extension
packages/
  core/                # Zod schemas, domain types, requirement engine
  evidence/            # hashing, local imports, provenance, export
  storage/             # offline IndexedDB repository + migrations
  graph/               # graph projection and matching algorithms
  ai/                  # optional adapters; explicit data-egress policy
  ui/                  # reusable accessible components
  fixtures/            # fully synthetic demo fixtures
  config/              # lint, tsconfig, testing configuration
ops/
docs/
AGENTS.md
README.md
SECURITY.md
ARCHITECTURE.md
DECISIONS.md
ROADMAP.md
STATUS.md
```

- Use React Flow (`@xyflow/react`) for the graph only after validating its license and current API.
- Offline-first browser persistence via IndexedDB/Dexie with versioned schema and migration tests. PWA service worker caches app shell only by default; never cache private API responses in shared caches.
- If cloud backup/sync is added, make it optional and opt-in. Supabase/PostgreSQL with per-user RLS is acceptable; implement conflict resolution, export portability and tenant-isolation tests. Do not call an app “end-to-end encrypted” until actual cryptographic key ownership, threat model and implementation are tested. Prefer authenticated encryption for sensitive local backup files; store no hardcoded keys.
- All core matching must work deterministically without an LLM. Optional AI providers: user-controlled local Ollama-compatible endpoint first; cloud providers opt-in, disabled by default, with exact preview of fields transmitted, cost controls and no silent background calls.
- Keep memory/CPU moderate for a ThinkPad T480s-class machine; avoid running a huge embedding model by default.
- Deployment packaging target: local dev first, Cloudflare Pages-compatible frontend when architecturally feasible. Any external API/Supabase backend must be separated and documented. Do not modify or deploy onto existing Zwanski or Vulzero domains.
- EN/FR/AR UI with proper RTL support and localized date formats. Implement at least English fully in the first vertical slice, then French and Arabic with tests before declaring them complete. Structure for other languages later.
- Mobile-first, accessible, responsive, reduced-motion-compatible. Use semantic elements, visible focus styles and WCAG AA contrast; support keyboard access to an equivalent graph list view.

Do not over-engineer distributed microservices, smart contracts, cryptocurrency tokens, facial recognition, demographic scoring or a native mobile app in the MVP.

## 5. Precise domain contract

Implement explicit typed persistent entities and migrations for:

`PersonProfile`, `EvidenceArtifact`, `EvidenceSource`, `EvidenceClaim`, `Skill`, `ClaimSkillLink`, `Opportunity`, `OpportunityRequirement`, `RequirementEvidenceLink`, `BridgeTask`, `Dossier`, `DossierItem`, `CaptureEvent`, `ConsentGrant`, `ExternalIntegration`, `AuditEvent`.

Every evidence link must carry:
- source identifier + original capture time
- data capture method (manual, local file, selected webpage, import)
- source integrity hash where bytes exist
- relationship type and attribution (human, parser, AI suggestion)
- human review state
- visibility policy (private, dossier-only, public)
- created/updated timestamps and revision history

Rules:
- AI-generated suggestions are never silently promoted to human-verified facts.
- An artifact hash proves byte identity/integrity, not truth or institutional validation.
- No opaque “88% eligible” or “92% hiring chance.” Use requirement counts and explicit evidence coverage.
- All external claims and opportunities include source links, retrieval timestamps and freshness flags; if a source is unavailable, show unavailable.
- Use stable IDs and schemas that permit portable exports.
- Deletion must remove the relevant local content and queued sync entries; consider dependent dossiers and explain the impact.

## 6. Safety, privacy and security guardrails

Threat-model the platform as a vault handling potentially sensitive documents and hostile web content.

- Private by default, data minimization, consentful import and sharing, prominent export/delete controls.
- Strict DOM escaping and HTML sanitization; CSP; extension message origin validation; protected local API endpoints; no unauthenticated localhost mutation endpoint.
- Treat PDFs, ZIPs, imported code and external webpage text as untrusted. Bound size/decompression and avoid executing imported code or PDF scripts. No arbitrary ZIP path traversal.
- Defend against prompt injection in documents: pasted job listing text may be parsed as data, never instructions for tools or agents.
- Keep AI tool access read-only by default. No automatically sent emails, filled application submissions, credential sharing, money spending, contacts, privileged filesystem scanning, or unapproved deployment.
- No automatically scraping social networks or bypassing terms, access checks or rate limits. Prefer copy/paste and opt-in documented APIs.
- No collection or exposure of UNHCR status, immigration documents or precise location unless users explicitly import them for a particular purpose; avoid requiring them anywhere.
- A user can explore opportunities without disclosing protected or sensitive attributes.
- Do not infer work authorization or promise legal outcomes. Official-rule references should show jurisdiction, as-of date, and an “independent verification required” label.
- Enforce per-user isolation, role controls if teams are added, export permission tests, file type sniffing and rate limits on public shares.
- Implement redaction previews, retention controls and a simple privacy threat-model document.
- Avoid claiming audited, zero-knowledge, standards-compliant, SOC 2-ready, production-ready or legally compliant unless genuinely verified against defined criteria.
- Consider W3C Verifiable Credentials 2.0 / Open Badges 3.0 for **later optional issuer-backed credential imports**. Self-assertions are never rebranded as verified credentials.

## 7. Visual art direction

Create a memorable visual identity, not an admin template. Mood: calm, human, quietly technical, ambitious.

- Editorial typography, charcoal/ivory surfaces with one restrained teal or cobalt accent. Accessible light and dark modes.
- Signature visualization: constellation/metro-map-style evidence graph showing paths to concrete requirements.
- Distinct, coherent iconography; no stock cyber shields, hackers in hoodies, fake AI portraits, decorative gradients everywhere, or excessive floating glass cards.
- Meaningful empty states, soft motion with reduced-motion equivalent, crisp mobile layout and print-ready dossier pages.
- On first-run demo, animate a single source → claim → requirement → action link with real persisted data; never fake system activity.
- Figma-like polish using real React components and CSS, not rendered image assets as a substitute for functionality.

## 8. Agent team / autonomous execution protocol

You are the engineering organization. Coordinate the following roles as subagents when available, but operate sequentially if not:

1. **Product lead:** maintains user journey, scope, acceptance criteria and prioritized backlog.
2. **Architect:** dependency graph, data model, offline strategy and ADRs.
3. **UI/UX engineer:** design system, graph visualization, responsive and accessibility testing.
4. **Core/data engineer:** evidence schema, graph relations, deterministic matching and migration integrity.
5. **Web engineer:** app shell, data vault, opportunities, plan and dossiers.
6. **Extension engineer:** least-privilege MV3 capture and secure communication.
7. **AI engineer:** local optional extraction/matching suggestions, schema validation, strict consent.
8. **Security engineer:** threat model, import-hardening, privacy review, permission abuse tests.
9. **QA engineer:** unit/integration/e2e tests and regression fixtures.
10. **Release engineer:** reproducible local setup, build artifacts, CI, documentation, deployment plan.

Each agent reads `AGENTS.md`, `ARCHITECTURE.md`, `STATUS.md`, `SECURITY.md` first. Each completed work unit must include implementation diff, tests run, evidence of results, risks/limitations, and handoff. One canonical task board lives in the repo; do not invent agent progress or claim work was performed by agents that were not actually launched.

**Autonomy rule:** do not ask the founder product or design questions. Resolve ambiguities with the safest, simplest documented assumption in `DECISIONS.md`; continue. If external credentials, payments, provider accounts, high-risk permissions, actual user data, root privileges or live deployment are required, **do not attempt them**; finish a local implementation with mocks/fixtures and mark the external integration blocked pending authorization. Don't silently purchase services, deploy, modify personal projects, or fetch private data.

**Repository / filesystem rule:** check for a user-designated writable HDD directory and available free space; put this project in a **new isolated repo** there if safe. Never assume a mount path, delete or relocate other projects, or edit the founder’s production repositories. If HDD is not mounted, create a new local project directory in a writable nonprivileged location and document how to relocate. Do not hardcode the founder’s home directory.

**Git rule:** use a dedicated branch/repo, small commits per phase, avoid rewriting history, don't force-push. If account/remote access is suspended, continue fully local and create a portable source archive. Do not let unavailable GitHub block development.

## 9. Phased delivery gates — implement, not just describe

### Phase 0 — evidence-based discovery and architecture
- Inspect the current local toolchain, workspace paths and file permissions.
- Quickly examine relevant existing standards and competing product workflows. Document specific differentiation; do not overclaim novelty.
- Create repo, ADRs, threat model, typed schemas, navigation skeleton and complete synthetic fixture.
- Gate: app boots locally with no API key and renders real fixture-driven data.

### Phase 1 — end-to-end vertical slice (must ship first)
- Local Evidence Vault, deterministic requirement parser for structured/demo cases, matching engine, interactive graph, Opportunity Lab, task list and selective dossier export.
- Make the exact Section 3 demo work; reload and offline persistence are mandatory.
- Gate: deterministic end-to-end tests passing for every demo transition and exported artifact.

### Phase 2 — extension and trust boundaries
- Implement click-to-capture extension, permission flow, secure handoff, redaction, file import resilience, data deletion and strict AI injection boundary tests.
- Gate: no passive capture; permissions audited; hostile content remains inert; e2e browser tests pass.

### Phase 3 — helpful optional intelligence
- Provider-optional extraction and match suggestions. AI unavailable must degrade gracefully to deterministic paths.
- Explainability and source citations in output; review queue before claims are accepted.
- Basic EN/FR/AR localization and RTL; PDF layout tested.
- Gate: cost/data-egress consent tests, localization smoke tests, no unreviewed publishing.

### Phase 4 — readiness and optional sync
- Optional encrypted export/import backup and optional cloud sync only if threat model, conflict semantics and security gates are complete.
- Public share page with explicit consent, short-lived links, expiry/revocation and access logs where backed by server.
- Accessibility, performance, deployment documentation, runbook, threat-model refresh.
- Gate: documented release checklist; build artifacts; known limitations plainly listed.

Do not skip phase gates. If a late feature threatens the core demo, postpone it; preserve a usable MVP. Do not call unimplemented Phase 4 features “complete.”

## 10. Automated test requirements

At minimum, implement and run tests that prove:

1. A manual evidence artifact survives reload/offline.
2. A source hash is stable for identical bytes and differs on changed bytes.
3. Two claims pointing at one source remain independently editable and traced.
4. AI-suggested claims remain unverified until approved.
5. A requirement's support status changes when its supporting evidence is deleted.
6. Uncertain evidence never becomes Supported without an explicit rule/human review.
7. An imported listing with prompt-injection text cannot command any tools.
8. PDF/ZIP imports reject traversal, oversized and malformed inputs safely.
9. Dossier exports contain only selected/redacted fields.
10. A person in guest/local mode can use all MVP functionality without login.
11. Local-only mode has no unapproved external AI data egress.
12. The extension never captures a page until a user gesture and explicit preview/consent.
13. An extension capture cannot spoof trusted app-origin messages.
14. Mobile keyboard/screen-reader equivalent lets users inspect every graph node.
15. Dates, document labels and core screens render correctly in French and Arabic RTL before claiming translations complete.
16. No secret, actual real user identity, personal legal status or credential is committed to source/fixtures.
17. Offline export → fresh install import restores relationships and avoids duplicate IDs.
18. The reproducible demo reaches the expected requirement states and visually consistent dossier.
19. Cloud-mode tenant isolation and public-share revocation tests before shipping those features.
20. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and Playwright smoke suite pass (or failures are precisely reported with cause and reproducible command).

## 11. Mandatory project outputs

Create/maintain:
- Functional app code + MV3 extension source and build artifact when phase 2 completes.
- `README.md`: requirements, installation, run commands, screenshots or local screenshot script, no-key demo.
- `QUICKSTART.md`: commands from empty machine to running demo.
- `AGENTS.md`: roles, file ownership, safe tool permissions and handoff rules.
- `ARCHITECTURE.md`: real boundaries and dataflows (no invented container isolation).
- `SECURITY.md`: threat model, privacy/retention, sensitive data flow and unresolved risks.
- `DECISIONS.md`: engineering tradeoffs, assumptions, why chosen.
- `ROADMAP.md`: delivered vs planned features separately.
- `STATUS.md`: truth-based progress with test evidence and blockers.
- `docs/PRODUCT.md`, `docs/DATA_MODEL.md`, `docs/TEST_REPORT.md`, `docs/RELEASE_CHECKLIST.md`.
- A completely synthetic demo archive and import/export example.
- `.env.example` with no real secrets.
- No broken buttons, deceptive statistics, dead-end mocked authentication or lorem ipsum in the demonstrated vertical slice.

## 12. Execution instructions — do this now

1. Inspect the writable workspace and existing runtime; do not assume internet or credentials.
2. Create new isolated repo and all foundational documents.
3. Prioritize the minimal complete user journey over breadth.
4. Implement the core data model, deterministic matching and actual UI in parallel only if safe for file ownership.
5. Run tests at each checkpoint; fix failures before expanding scope.
6. Build the offline demo first, then extension, then optional AI/sync.
7. Capture honest screenshots/build evidence of real running screens.
8. Commit verified milestones locally and provide reproducible commands.
9. Keep making progress without asking preference questions; block only actions requiring real-world authorization.
10. Finish each run with a compact status: **What works / Tests / What does not work / Security risks / Next concrete step / Founder approval required (only if truly necessary).**

**Definition of success:** A new user on an ordinary laptop can launch ProofBridge, import synthetic or their own project evidence, inspect a living provenance graph, paste a real opportunity description, see a transparent requirement-to-proof comparison, generate a small improvement plan, and export a selective dossier—fully offline, with zero mandatory AI/API costs. The optional extension should capture a visible opportunity only after user approval. Every statement about product readiness must be backed by reproducible tests.

**Begin implementation immediately. Do not respond only with a plan.**
