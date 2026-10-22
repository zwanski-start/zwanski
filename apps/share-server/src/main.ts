/**
 * OPTIONAL share service — `pnpm --filter @proofbridge/share-server start`.
 * Env: PORT (8787), HOST (127.0.0.1), SHARE_DATA_FILE (.share-data/shares.json),
 * ALLOWED_ORIGINS (comma-separated app origins; default http://localhost:3000), TRUST_PROXY=1.
 * Binds to loopback by default. Exposing it publicly is a deployment decision (docs/DEPLOYMENT.md).
 */
import { startShareServer } from "./node.ts";

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const { url } = await startShareServer({
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? "127.0.0.1",
  dataFile: process.env.SHARE_DATA_FILE ?? ".share-data/shares.json",
  allowedOrigins,
  trustProxy: process.env.TRUST_PROXY === "1",
});
console.log(`ProofBridge share service on ${url} — app origins allowed: ${allowedOrigins.join(", ")}`);
