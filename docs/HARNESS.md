# HARNESS — agents, tools, and MCP servers for this repo

## Subagents (`.claude/agents/`)
The §8 team, scoped to this project and safe by construction. Each knows to read the directive
and the safety rails first. Invoke by role (e.g. the architect for data-model/ADR work, the
security-engineer for threat-model and import-hardening, the qa-engineer for the §10 tests).

## Built-in agents
`general-purpose` (multi-step search/impl), `Plan` (architecture planning), `Explore` (read-only
fan-out search). Use these freely.

## MCP servers (opt-in, add only what's safe + relevant)
MCP wiring is environment-specific (each server needs its own local command and auth), so this
repo does not ship live MCP credentials. Add servers in a local `.mcp.json` (git-ignored) only if
they serve the build **and** respect the directive's blocked-action list:

- **Recommended & safe:** a design MCP (e.g. Figma) for §7 visual direction / §2 UI — read/generate
  design, no outward side effects. Add with your own Figma auth.
- **Deferred to Phase 4 (gated):** Supabase/Postgres MCP — only once the sync threat model and
  tenant-isolation tests exist. Not before.
- **Forbidden for this build (violate §6/§8):** anything that can send email, deploy, spend money,
  scrape, or act on real accounts (Gmail/Resend, Netlify/Vercel deploy, Stripe/PayPal, CRMs, etc.).
  Do not wire these — an autonomous build agent must not be able to perform blocked actions.

To add one locally:
```jsonc
// .mcp.json  (keep OUT of git; see .gitignore)
{ "mcpServers": { "figma": { "command": "<figma-mcp-launch-command>" } } }
```
