/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source; let Next transpile them (no separate build step).
  transpilePackages: ["@proofbridge/core", "@proofbridge/fixtures"],
  // Local-first: no external image optimization calls, no telemetry-style features.
  images: { unoptimized: true },
};

export default nextConfig;
