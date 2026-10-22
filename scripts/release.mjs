#!/usr/bin/env node
/**
 * `pnpm release` — builds the release artifacts LOCALLY into dist/release/<version>-<sha>/.
 * It deploys nothing and uploads nothing (see docs/DEPLOYMENT.md for the gated deploy plan).
 *
 *   proofbridge-web-static.tar.gz        static export of the PWA (any static host; Pages-compatible,
 *                                        with a `_headers` file carrying the security headers)
 *   proofbridge-extension-chrome-mv3.zip production MV3 extension (manifest audit must pass)
 *   proofbridge-share-server.tar.gz      OPTIONAL share service source (Node ≥ 22.18, zero deps)
 *   SHA256SUMS, release.json             checksums + build metadata
 *
 * Run the checks first (lint, typecheck, test, build, e2e) — docs/RELEASE_CHECKLIST.md.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, stdio: "inherit", ...opts });
const out = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: "utf8" }).trim();

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version ?? "0.0.0";
const sha = out("git", ["rev-parse", "--short=12", "HEAD"]);
const dirty = out("git", ["status", "--porcelain"]).length > 0;
const name = `${version}-${sha}${dirty ? "-dirty" : ""}`;
const dest = join(root, "dist", "release", name);
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// 1. Static web export.
console.log("\n▶ web: static export");
run("pnpm", ["--filter", "@proofbridge/web", "build"], { env: { ...process.env, PROOFBRIDGE_STATIC_EXPORT: "1", NEXT_TELEMETRY_DISABLED: "1" } });
// With output: "export" and a custom distDir, Next 16 writes the static site into that distDir.
const webOut = join(root, "apps", "web", ".next-export");
const files = walk(webOut).map((f) => relative(webOut, f));
const forbidden = files.filter((f) => /\.map$|(^|\/)\.env/.test(f));
if (forbidden.length) throw new Error(`Static export contains files that must not ship: ${forbidden.join(", ")}`);
for (const route of ["index.html", "evidence.html", "opportunities.html", "graph.html", "plan.html", "inbox.html", "share.html", "settings.html", "sw.js"]) {
  if (!files.includes(route)) throw new Error(`Static export is missing ${route}`);
}
// Security headers for static hosts that read a `_headers` file (e.g. Cloudflare Pages).
// 'unsafe-inline' scripts: Next's static export inlines its bootstrap data and has no nonces.
// connect-src allows https: and loopback only because the OPTIONAL share service address is
// user-configured; tighten to 'self' if online share links are not offered.
writeFileSync(
  join(webOut, "_headers"),
  `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
/sw.js
  Cache-Control: no-cache
`,
);
run("tar", ["-czf", join(dest, "proofbridge-web-static.tar.gz"), "-C", webOut, "."]);

// 2. Extension (production build runs the manifest audit).
console.log("\n▶ extension: production zip + manifest audit");
// `wxt zip` rebuilds in production mode; re-run the manifest audit on what was zipped.
run("pnpm", ["--filter", "@proofbridge/extension", "zip"]);
run("node", ["scripts/audit-manifest.mjs"], { cwd: join(root, "apps", "extension") });
const extOut = join(root, "apps", "extension", ".output");
const zipName = readdirSync(extOut).find((f) => f.endsWith("-chrome.zip"));
if (!zipName) throw new Error("wxt zip produced no -chrome.zip");
cpSync(join(extOut, zipName), join(dest, "proofbridge-extension-chrome-mv3.zip"));

// 3. Optional share service (source; runs on Node ≥ 22.18 with no dependencies).
console.log("\n▶ share-server: source bundle");
const ss = join(root, "apps", "share-server");
const ssFiles = ["package.json", "README.md", ...readdirSync(join(ss, "src")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => `src/${f}`)];
for (const f of ssFiles) if (!existsSync(join(ss, f))) throw new Error(`share-server is missing ${f}`);
run("tar", ["-czf", join(dest, "proofbridge-share-server.tar.gz"), "-C", ss, ...ssFiles]);

// 4. Checksums + metadata.
const artifacts = readdirSync(dest).sort();
const sums = artifacts.map((f) => `${createHash("sha256").update(readFileSync(join(dest, f))).digest("hex")}  ${f}`);
writeFileSync(join(dest, "SHA256SUMS"), sums.join("\n") + "\n");
writeFileSync(
  join(dest, "release.json"),
  JSON.stringify(
    {
      name: "ProofBridge OS",
      version,
      commit: sha,
      dirty,
      builtAt: new Date().toISOString(),
      node: process.version,
      artifacts: artifacts.map((f) => ({ file: f, bytes: statSync(join(dest, f)).size })),
      notice: "Local build artifacts. Nothing was deployed or uploaded. See docs/RELEASE_CHECKLIST.md.",
    },
    null,
    2,
  ) + "\n",
);
console.log(`\n✔ Release artifacts in ${relative(root, dest)}:\n${sums.map((s) => "  " + s).join("\n")}`);
