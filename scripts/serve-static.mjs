#!/usr/bin/env node
/**
 * `pnpm preview:static [dir]` — serves the static export (default apps/web/.next-export) on
 * http://localhost:$PORT (default 4173) the way a static host does: clean URLs map to `<route>.html`
 * and the `_headers` security headers are applied. Loopback only; for checking a release locally.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(process.argv[2] ?? fileURLToPath(new URL("../apps/web/.next-export", import.meta.url)));
if (!existsSync(join(root, "index.html"))) {
  console.error(`No static export in ${root}. Run \`pnpm release\` (or PROOFBRIDGE_STATIC_EXPORT=1 pnpm --filter @proofbridge/web build) first.`);
  process.exit(1);
}
const port = Number(process.env.PORT ?? 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

// Minimal `_headers` support: "/*" block applies to everything, "/path" blocks to that path.
const rules = [];
if (existsSync(join(root, "_headers"))) {
  let current = null;
  for (const line of readFileSync(join(root, "_headers"), "utf8").split("\n")) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) rules.push((current = { pattern: line.trim(), headers: {} }));
    else if (current) {
      const i = line.indexOf(":");
      current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
}
const headersFor = (path) =>
  Object.assign({}, ...rules.filter((r) => r.pattern === "/*" || r.pattern === path).map((r) => r.headers));

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  const candidates = path.endsWith("/") ? [`${path}index.html`] : [path, `${path}.html`];
  for (const c of candidates) {
    const file = normalize(join(root, c));
    if (!file.startsWith(root + sep) || c.includes("_headers")) continue;
    if (existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", ...headersFor(path) });
      createReadStream(file).pipe(res);
      return;
    }
  }
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", ...headersFor(path) });
  createReadStream(join(root, "404.html")).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`Static export from ${root} on http://localhost:${port}`));
