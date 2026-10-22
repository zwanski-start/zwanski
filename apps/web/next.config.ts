import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@proofbridge/ai", "@proofbridge/core", "@proofbridge/fixtures", "@proofbridge/storage"],
  // Local-first: no telemetry-style beacons, no remote images.
  images: { unoptimized: true },
  poweredByHeader: false,
  // The repo already has a canonical AGENTS.md; do not generate another.
  agentRules: false,
};

export default nextConfig;
