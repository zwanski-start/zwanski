// Runs the Next.js CLI with its anonymous telemetry disabled: ProofBridge sends no telemetry
// without consent (directive §1.1). Cross-platform alternative to `NEXT_TELEMETRY_DISABLED=1 next`.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
process.exit(result.status ?? 1);
