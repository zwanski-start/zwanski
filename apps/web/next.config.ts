import type { NextConfig } from "next";

/**
 * `PROOFBRIDGE_STATIC_EXPORT=1` (used by `pnpm release`) emits a fully static site to `.next-export/`
 * for any static host (Cloudflare Pages-compatible). Every page is a client-rendered shell over
 * IndexedDB, so nothing needs a server. A separate distDir keeps the `next start` build intact.
 */
const staticExport = process.env.PROOFBRIDGE_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const, distDir: ".next-export" } : {}),
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@proofbridge/core", "@proofbridge/fixtures", "@proofbridge/storage"],
  // Local-first: no telemetry-style beacons, no remote images.
  images: { unoptimized: true },
  poweredByHeader: false,
  // The repo already has a canonical AGENTS.md; do not generate another.
  agentRules: false,
};

export default nextConfig;
