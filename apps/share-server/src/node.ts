import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createHandler, type HandlerOptions } from "./handler.ts";
import { LIMITS, ShareStore } from "./store.ts";

const MAX_BODY_BYTES = LIMITS.maxCiphertextChars + 4096;

export interface ShareServerOptions extends Omit<HandlerOptions, "store"> {
  port?: number;
  host?: string;
  /** JSON persistence file; omit for an in-memory store. */
  dataFile?: string;
  store?: ShareStore;
  /** Use the first X-Forwarded-For hop as the rate-limit key (only behind a trusted proxy). */
  trustProxy?: boolean;
}

async function readBody(req: IncomingMessage): Promise<Buffer | "too-large"> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) return "too-large";
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

/** Starts the share service on Node's http module. Resolves once listening. */
export async function startShareServer(opts: ShareServerOptions): Promise<{ server: Server; url: string; store: ShareStore }> {
  const store = opts.store ?? new ShareStore(opts.dataFile);
  const handle = createHandler({ ...opts, store });
  const host = opts.host ?? "127.0.0.1";

  const server = createServer(async (req, res) => {
    try {
      const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";
      const body = hasBody ? await readBody(req) : undefined;
      if (body === "too-large") {
        res.writeHead(413, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end('{"error":"Too large."}');
        req.destroy();
        return;
      }
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
      const request = new Request(`http://${req.headers.host ?? host}${req.url ?? "/"}`, {
        method: req.method,
        headers,
        body: body && body.length > 0 ? new Uint8Array(body) : undefined,
      });
      const forwarded = opts.trustProxy ? (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() : undefined;
      const response = await handle(request, forwarded || req.socket.remoteAddress || "unknown");
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
      console.error("share-server error:", (e as Error).message);
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
      res.end('{"error":"Internal error."}');
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 0, host, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`, store };
}
