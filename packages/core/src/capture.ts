import { z } from "zod";
import { IsoDateTimeSchema } from "./schemas";

/**
 * Capture protocol shared by the MV3 extension (`apps/extension`) and the web app.
 *
 * Trust model: page text is hostile data. The extension extracts plain text only (never
 * markup), sanitises it here, shows it to the user and queues it only after the user confirms.
 * The web app pulls confirmed captures over `chrome.runtime.sendMessage(EXTENSION_ID, …)`
 * (`externally_connectable`, localhost only) and validates every message again with these
 * schemas before anything reaches the vault. See SECURITY.md § Capture extension.
 */

export const CAPTURE_PROTOCOL = "proofbridge.capture";
export const CAPTURE_PROTOCOL_VERSION = 1;

/**
 * The extension's id, pinned by the public `key` in its manifest so the app knows whom to
 * address. Only the public key is in the repo; Chrome derives the id from it.
 */
export const EXTENSION_ID = "gnhdodgpophcenhldkahdaigmpodnmlm";

/** Matches the listing parser's own bound, so a captured listing is never silently cut twice. */
export const MAX_CAPTURE_CHARS = 20_000;
export const MAX_CAPTURE_TITLE = 200;
export const MAX_CAPTURE_URL = 2048;
/** Most captures the extension holds before the user must import or discard some. */
export const MAX_OUTBOX = 20;
/** Largest capture file the app accepts through the manual (file) fallback. */
export const MAX_CAPTURE_FILE_BYTES = 1024 * 1024;

export const CaptureKindSchema = z.enum(["opportunity", "evidence"]);
export type CaptureKind = z.infer<typeof CaptureKindSchema>;

export const CaptureIdSchema = z.string().regex(/^cap_[a-z0-9]{10}$/, "expected cap_<10 chars>");

const HttpUrlSchema = z
  .string()
  .max(MAX_CAPTURE_URL)
  .refine((u) => /^https?:\/\//i.test(u) && URL.canParse(u), "expected an http(s) URL");

export const CaptureSchema = z
  .object({
    id: CaptureIdSchema,
    kind: CaptureKindSchema,
    /** How the text was chosen: the user's selection, or the page's visible text. */
    method: z.enum(["selection", "visible-text"]),
    title: z.string().trim().min(1).max(MAX_CAPTURE_TITLE),
    text: z.string().trim().min(1).max(MAX_CAPTURE_CHARS),
    pageUrl: HttpUrlSchema,
    capturedAt: IsoDateTimeSchema,
    /** When the user pressed "Confirm & queue" after reviewing the preview. */
    confirmedAt: IsoDateTimeSchema,
  })
  .strict();
export type Capture = z.infer<typeof CaptureSchema>;

const Envelope = { protocol: z.literal(CAPTURE_PROTOCOL), version: z.literal(CAPTURE_PROTOCOL_VERSION) };

/** Requests the web app may send to the extension. Anything else is refused. */
export const AppRequestSchema = z.discriminatedUnion("type", [
  z.object({ ...Envelope, type: z.literal("ping") }).strict(),
  z.object({ ...Envelope, type: z.literal("list") }).strict(),
  z.object({ ...Envelope, type: z.literal("ack"), ids: z.array(CaptureIdSchema).min(1).max(MAX_OUTBOX) }).strict(),
]);
export type AppRequest = z.infer<typeof AppRequestSchema>;

export const AppResponseSchema = z.union([
  z.object({ ok: z.literal(true), type: z.literal("pong") }).strict(),
  z.object({ ok: z.literal(true), type: z.literal("captures"), captures: z.array(CaptureSchema).max(MAX_OUTBOX) }).strict(),
  z.object({ ok: z.literal(true), type: z.literal("acked"), removed: z.number().int().min(0) }).strict(),
  z.object({ ok: z.literal(false), error: z.string().max(300) }).strict(),
]);
export type AppResponse = z.infer<typeof AppResponseSchema>;

export const appRequest = <T extends AppRequest["type"]>(
  type: T,
  extra: Omit<Extract<AppRequest, { type: T }>, "protocol" | "version" | "type"> = {} as never,
): Extract<AppRequest, { type: T }> =>
  ({ protocol: CAPTURE_PROTOCOL, version: CAPTURE_PROTOCOL_VERSION, type, ...extra }) as Extract<AppRequest, { type: T }>;

/** Manual fallback: the extension can download its queue as this file for the app to import. */
export const CaptureFileSchema = z
  .object({ ...Envelope, kind: z.literal("capture-file"), captures: z.array(CaptureSchema).min(1).max(MAX_OUTBOX) })
  .strict();
export type CaptureFile = z.infer<typeof CaptureFileSchema>;

export function parseCaptureFile(text: string): CaptureFile {
  if (text.length > MAX_CAPTURE_FILE_BYTES) throw new Error("That capture file is larger than 1 MB.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const parsed = CaptureFileSchema.safeParse(json);
  if (!parsed.success) throw new Error("That file is not a ProofBridge capture file.");
  return parsed.data;
}

/**
 * Origins allowed to talk to the extension: a ProofBridge app served from this machine.
 * `localhost` or `127.0.0.1`, http or https, any port, nothing else (mirrors the extension's
 * `externally_connectable` matches).
 */
export function isLocalAppOrigin(origin: unknown): origin is string {
  if (typeof origin !== "string" || !URL.canParse(origin)) return false;
  const u = new URL(origin);
  if (u.origin !== origin) return false; // no paths, credentials or other non-origin forms
  return (u.protocol === "http:" || u.protocol === "https:") && ["localhost", "127.0.0.1"].includes(u.hostname);
}

// C0/C1 controls except tab/newline, bidi embeddings/overrides/isolates (Trojan Source-style
// reordering), and invisible zero-width characters that can hide text from the preview.
// Code points (not a regex literal) so the list stays readable and reviewable.
const UNSAFE_RANGES: readonly (readonly [number, number])[] = [
  [0x00, 0x08],
  [0x0b, 0x0c],
  [0x0e, 0x1f],
  [0x7f, 0x9f],
  [0x200b, 0x200b],
  [0x200e, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];
const isUnsafe = (cp: number) => UNSAFE_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
const stripUnsafe = (s: string) => Array.from(s, (ch) => (isUnsafe(ch.codePointAt(0) ?? 0) ? "" : ch)).join("");

/**
 * Normalises untrusted page text into plain, bounded, display-safe text. Non-strings become
 * "". The result is still untrusted *data*: it is rendered escaped and parsed, never executed.
 */
export function sanitizeCapturedText(raw: unknown, max = MAX_CAPTURE_CHARS): { text: string; truncated: boolean } {
  if (typeof raw !== "string") return { text: "", truncated: false };
  // Bound work before regexes run on a hostile, possibly enormous string.
  const bounded = raw.slice(0, max * 2);
  const text = stripUnsafe(bounded.normalize("NFC").replace(/\r\n?/g, "\n"))
    .replace(/[^\S\n]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const truncated = text.length > max || raw.length > bounded.length;
  return { text: truncated ? text.slice(0, max).trimEnd() : text, truncated };
}

/** A single-line, bounded title. */
export function sanitizeCapturedTitle(raw: unknown): string {
  return sanitizeCapturedText(raw, MAX_CAPTURE_TITLE * 2).text.replace(/\s+/g, " ").slice(0, MAX_CAPTURE_TITLE).trim();
}

const SENSITIVE_PARAM =
  /^(?:.*[_.-])?(?:token|key|apikey|auth|authorization|session|sessionid|sid|sig|signature|secret|password|passwd|pass|code|credentials?|jwt)(?:[_.-].*)?$/i;

/**
 * Keeps a page URL useful as provenance while dropping what should not travel with it:
 * user:password, the fragment, and query parameters that look like secrets. Only http(s).
 */
export function sanitizePageUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > MAX_CAPTURE_URL * 2 || !URL.canParse(raw)) return null;
  const u = new URL(raw);
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  u.username = "";
  u.password = "";
  u.hash = "";
  for (const name of [...u.searchParams.keys()]) if (SENSITIVE_PARAM.test(name)) u.searchParams.delete(name);
  const out = u.toString();
  return out.length <= MAX_CAPTURE_URL ? out : null;
}

/** Short human label for where a capture came from, e.g. `jobs.example.org`. */
export function captureHost(capture: Pick<Capture, "pageUrl">): string {
  return new URL(capture.pageUrl).host;
}

/** Source label used on import; it embeds the capture id so a re-listed capture is recognised. */
export function captureSourceLabel(capture: Pick<Capture, "id" | "pageUrl">): string {
  return `Browser capture ${capture.id} · ${captureHost(capture)}`;
}
