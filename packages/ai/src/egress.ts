import { loopbackOrigin, type AiSettings, type ConsentScope } from "./settings";

/**
 * The single egress boundary for AI features. Every outbound request goes through
 * `guardedFetch`, which refuses unless AI is enabled, consent covers the exact origin and the
 * data scope, and the origin is on this machine. There is no other code path that calls a
 * provider, and nothing here runs in the background.
 */
export type EgressDecision = { allowed: true; origin: string } | { allowed: false; reason: string };

export function egressDecision(settings: AiSettings, url: string, scope: ConsentScope): EgressDecision {
  if (!settings.enabled) return { allowed: false, reason: "AI assistance is turned off." };
  if (!settings.consent) return { allowed: false, reason: "No consent has been given for AI assistance." };
  const o = loopbackOrigin(url);
  if ("error" in o) return { allowed: false, reason: o.error };
  if (o.origin !== settings.consent.origin) {
    return { allowed: false, reason: `Consent covers ${settings.consent.origin}, not ${o.origin}.` };
  }
  if (!settings.consent.scope.includes(scope)) return { allowed: false, reason: `Consent does not cover “${scope}”.` };
  return { allowed: true, origin: o.origin };
}

/** What left the device, for the user-visible egress log. Never the content itself. */
export interface EgressRecord {
  at: string;
  origin: string;
  path: string;
  scope: ConsentScope;
  /** Top-level JSON fields of the request body, e.g. ["model", "prompt", …]. */
  fields: string[];
  bytes: number;
  outcome: "ok" | "error";
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export class EgressRefused extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "EgressRefused";
  }
}

/** Upper bound on a provider response body; larger responses are discarded. */
export const MAX_RESPONSE_CHARS = 64_000;
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * POSTs `body` as JSON to `url` iff `egressDecision` allows it. Reports exactly what was sent
 * through `onEgress`. No cookies/credentials are attached; redirects are refused so a local
 * endpoint cannot bounce the payload off-device.
 */
export async function guardedFetch(
  settings: AiSettings,
  url: string,
  scope: ConsentScope,
  body: Record<string, unknown>,
  deps: { fetch: FetchLike; now: () => string; onEgress?: (r: EgressRecord) => void },
): Promise<string> {
  const decision = egressDecision(settings, url, scope);
  if (!decision.allowed) throw new EgressRefused(decision.reason);
  const payload = JSON.stringify(body);
  const record = (outcome: EgressRecord["outcome"]) =>
    deps.onEgress?.({
      at: deps.now(),
      origin: decision.origin,
      path: new URL(url).pathname,
      scope,
      fields: Object.keys(body),
      bytes: new TextEncoder().encode(payload).length,
      outcome,
    });
  let text: string;
  try {
    const res = await deps.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`The AI endpoint answered ${res.status}.`);
    text = await res.text();
  } catch (e) {
    record("error");
    throw e;
  }
  record("ok");
  if (text.length > MAX_RESPONSE_CHARS) throw new Error("The AI response was too large and was discarded.");
  return text;
}
