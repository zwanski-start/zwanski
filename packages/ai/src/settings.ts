import { z } from "zod";

/**
 * Device-local AI preferences. AI assistance is OFF by default and nothing is sent anywhere
 * until the user (1) enables it, (2) grants consent for one exact endpoint origin and data
 * scope, and (3) confirms each individual request after previewing its payload.
 *
 * Settings are deliberately not part of the vault dataset: a backup restored on another device
 * must not carry a consent grant with it.
 */
export const AI_SETTINGS_VERSION = 1;

/** The only data category this phase can send: the listing text the user pasted. */
export const ConsentScopeSchema = z.enum(["listing-text"]);
export type ConsentScope = z.infer<typeof ConsentScopeSchema>;

export const ConsentGrantSchema = z.object({
  grantedAt: z.iso.datetime({ offset: true }),
  /** Exact origin (scheme + host + port) the grant covers; any other origin is refused. */
  origin: z.string().min(1),
  scope: z.array(ConsentScopeSchema).min(1),
});
export type ConsentGrant = z.infer<typeof ConsentGrantSchema>;

export const AiSettingsSchema = z.object({
  version: z.literal(AI_SETTINGS_VERSION),
  enabled: z.boolean(),
  /** Only a user-run, Ollama-compatible endpoint on this machine is supported in Phase 3. */
  provider: z.literal("ollama"),
  endpoint: z.string().max(200),
  model: z.string().max(100),
  consent: ConsentGrantSchema.nullable(),
});
export type AiSettings = z.infer<typeof AiSettingsSchema>;

export const DEFAULT_AI_SETTINGS: AiSettings = Object.freeze({
  version: AI_SETTINGS_VERSION,
  enabled: false,
  provider: "ollama",
  endpoint: "http://localhost:11434",
  model: "llama3.2",
  consent: null,
});

/** Parses stored settings; anything unreadable falls back to the safe default (disabled). */
export function parseAiSettings(raw: string | null | undefined): AiSettings {
  if (!raw) return DEFAULT_AI_SETTINGS;
  try {
    const parsed = AiSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_AI_SETTINGS;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

/** Hosts that resolve to this machine. Anything else would be off-device egress. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The normalized origin of a loopback http(s) endpoint, or an error explaining why not. */
export function loopbackOrigin(endpoint: string): { origin: string } | { error: string } {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { error: "The endpoint is not a valid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { error: "Only http(s) endpoints are supported." };
  if (url.username || url.password) return { error: "Endpoints must not contain credentials." };
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    return { error: "Only an endpoint on this machine (localhost) is allowed. Cloud providers are not supported yet." };
  }
  return { origin: url.origin };
}

/** Records consent for the current endpoint's exact origin. Throws for a non-loopback endpoint. */
export function grantConsent(settings: AiSettings, now: string): AiSettings {
  const o = loopbackOrigin(settings.endpoint);
  if ("error" in o) throw new Error(o.error);
  return { ...settings, enabled: true, consent: { grantedAt: now, origin: o.origin, scope: ["listing-text"] } };
}

/** Turns AI off and forgets the consent grant. */
export function revokeConsent(settings: AiSettings): AiSettings {
  return { ...settings, enabled: false, consent: null };
}

/** Changing the endpoint invalidates any grant that was given for a different origin. */
export function setEndpoint(settings: AiSettings, endpoint: string): AiSettings {
  const o = loopbackOrigin(endpoint);
  const sameOrigin = "origin" in o && settings.consent?.origin === o.origin;
  return { ...settings, endpoint, ...(sameOrigin ? {} : { enabled: false, consent: null }) };
}
