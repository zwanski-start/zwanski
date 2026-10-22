import { LIMITS, StoreError, type ShareStore } from "./store.ts";
import { viewerPage } from "./viewer.ts";

/**
 * HTTP API as a Fetch-API handler (`Request → Response`), so the same code can run under
 * Node (see `node.ts`) or, later, an edge runtime with a different store.
 *
 *   POST   /api/shares        owner   { iv, ciphertext, ttlSeconds } → 201 { id, expiresAt }
 *   GET    /api/shares        owner   → { shares: [...] } (own shares only, with access counts)
 *   DELETE /api/shares/:id    owner   → { id, revokedAt } | 404
 *   GET    /api/shares/:id    public  → { iv, ciphertext, expiresAt } | 410 { state } | 404
 *   GET    /s/:id             public  read-only viewer page (decrypts in the browser)
 *
 * "Owner" = `Authorization: Bearer <secret>`, a random 256-bit capability the app generated; the
 * server stores only its SHA-256. Owner routes answer CORS only for configured app origins.
 */

export interface HandlerOptions {
  store: ShareStore;
  /** Exact origins (scheme://host:port) of ProofBridge apps allowed to manage shares. */
  allowedOrigins: string[];
  now?: () => number;
  /** Public reads per client per minute (token bucket). */
  readsPerMinute?: number;
  /** Share creations per client per hour. */
  createsPerHour?: number;
}

const B64URL = /^[A-Za-z0-9_-]+$/;
const ID_RE = /^[A-Za-z0-9_-]{22}$/;
const SECRET_RE = /^[A-Za-z0-9_-]{43}$/;

const BASE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function randomId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let bin = "";
  for (const x of b) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256hex(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

class Buckets {
  private buckets = new Map<string, { tokens: number; at: number }>();
  take(key: string, capacity: number, perMs: number, now: number): boolean {
    if (this.buckets.size > 10_000) this.buckets.clear();
    const b = this.buckets.get(key) ?? { tokens: capacity, at: now };
    b.tokens = Math.min(capacity, b.tokens + (now - b.at) / perMs);
    b.at = now;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(key, b);
    return ok;
  }
}

export function createHandler(opts: HandlerOptions) {
  const now = opts.now ?? Date.now;
  const allowed = new Set(opts.allowedOrigins);
  const buckets = new Buckets();
  const readsPerMinute = opts.readsPerMinute ?? 30;
  const createsPerHour = opts.createsPerHour ?? 30;

  function json(status: number, body: unknown, extra: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...BASE_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extra },
    });
  }

  function cors(req: Request): Record<string, string> | null {
    const origin = req.headers.get("Origin");
    if (!origin || !allowed.has(origin)) return null;
    return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
  }

  async function owner(req: Request): Promise<string | null> {
    const m = /^Bearer (\S+)$/.exec(req.headers.get("Authorization") ?? "");
    if (!m || !SECRET_RE.test(m[1]!)) return null;
    return sha256hex(`proofbridge.owner:${m[1]}`);
  }

  return async function handle(req: Request, clientKey = "local"): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const t = now();

    if (path === "/healthz" && req.method === "GET") return json(200, { ok: true });

    if (path === "/api/shares" || path.startsWith("/api/shares/")) {
      const origin = req.headers.get("Origin");
      const c = cors(req);
      const id = path === "/api/shares" ? null : path.slice("/api/shares/".length);
      if (id !== null && !ID_RE.test(id)) return json(404, { error: "Not found." });

      // Public read of one share (same-origin from the viewer; no CORS).
      if (req.method === "GET" && id !== null) {
        if (!buckets.take(`read:${clientKey}`, readsPerMinute, 60_000 / readsPerMinute, t)) {
          return json(429, { error: "Too many requests." }, { "Retry-After": "60" });
        }
        const r = opts.store.read(id, t);
        if (r.state === "missing") return json(404, { error: "Not found." });
        if (r.state !== "active") return json(410, { state: r.state });
        return json(200, { iv: r.record.iv, ciphertext: r.record.ciphertext, expiresAt: r.record.expiresAt });
      }

      // Everything else is an owner route. A browser Origin must be an allowed app origin.
      if (origin && !c) return json(403, { error: "Origin not allowed." });
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            ...BASE_HEADERS,
            ...c,
            "Access-Control-Allow-Methods": "GET, POST, DELETE",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
            "Access-Control-Max-Age": "600",
          },
        });
      }
      const ownerHash = await owner(req);
      if (!ownerHash) return json(401, { error: "Missing or malformed owner key." }, c ?? {});

      try {
        if (req.method === "GET" && id === null) return json(200, { shares: opts.store.list(ownerHash, t) }, c ?? {});
        if (req.method === "DELETE" && id !== null) {
          const done = opts.store.revoke(id, ownerHash, t);
          return done ? json(200, done, c ?? {}) : json(404, { error: "Not found." }, c ?? {});
        }
        if (req.method === "POST" && id === null) {
          if (!buckets.take(`create:${clientKey}`, createsPerHour, 3_600_000 / createsPerHour, t)) {
            return json(429, { error: "Too many shares created; try later." }, { ...c, "Retry-After": "120" });
          }
          if (!(req.headers.get("Content-Type") ?? "").startsWith("application/json")) {
            return json(415, { error: "Send application/json." }, c ?? {});
          }
          const text = await req.text();
          if (text.length > LIMITS.maxCiphertextChars + 1024) return json(413, { error: "Share is too large." }, c ?? {});
          let body: { iv?: unknown; ciphertext?: unknown; ttlSeconds?: unknown };
          try {
            body = JSON.parse(text);
          } catch {
            return json(400, { error: "Body is not valid JSON." }, c ?? {});
          }
          const { iv, ciphertext, ttlSeconds } = body ?? {};
          if (
            typeof iv !== "string" ||
            iv.length !== 16 ||
            !B64URL.test(iv) ||
            typeof ciphertext !== "string" ||
            !B64URL.test(ciphertext) ||
            ciphertext.length < 24 ||
            ciphertext.length > LIMITS.maxCiphertextChars ||
            typeof ttlSeconds !== "number" ||
            !Number.isInteger(ttlSeconds) ||
            ttlSeconds < LIMITS.minTtlSeconds ||
            ttlSeconds > LIMITS.maxTtlSeconds ||
            Object.keys(body).length !== 3
          ) {
            return json(400, { error: "Expected { iv, ciphertext, ttlSeconds } with ttl between 5 minutes and 30 days." }, c ?? {});
          }
          const record = opts.store.create({ id: randomId(), ownerHash, iv, ciphertext, ttlSeconds }, t);
          return json(201, { id: record.id, expiresAt: record.expiresAt }, c ?? {});
        }
      } catch (e) {
        if (e instanceof StoreError) return json(e.status, { error: e.message }, c ?? {});
        throw e;
      }
      return json(405, { error: "Method not allowed." }, c ?? {});
    }

    const viewer = /^\/s\/([A-Za-z0-9_-]{22})$/.exec(path);
    if (viewer && req.method === "GET") {
      if (!buckets.take(`read:${clientKey}`, readsPerMinute, 60_000 / readsPerMinute, t)) {
        return json(429, { error: "Too many requests." }, { "Retry-After": "60" });
      }
      const { html, csp } = await viewerPage();
      return new Response(html, {
        status: 200,
        headers: {
          ...BASE_HEADERS,
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": csp,
          "X-Frame-Options": "DENY",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
      });
    }

    return json(404, { error: "Not found." });
  };
}
