import { AppResponseSchema, EXTENSION_ID, appRequest, type AppResponse, type Capture } from "@proofbridge/core";

/**
 * Talks to the ProofBridge Capture extension with `chrome.runtime.sendMessage(EXTENSION_ID, …)`.
 * Chrome exposes this on a page only when an installed extension lists the page's origin in
 * `externally_connectable` (ours lists localhost only). Messages go to one pinned extension id,
 * and every response is schema-validated: it is still untrusted input.
 */

interface ExternalRuntime {
  sendMessage(extensionId: string, message: unknown): Promise<unknown>;
}

export class ExtensionUnavailableError extends Error {}

function runtime(): ExternalRuntime | null {
  const rt = (globalThis as { chrome?: { runtime?: Partial<ExternalRuntime> } }).chrome?.runtime;
  return typeof rt?.sendMessage === "function" ? (rt as ExternalRuntime) : null;
}

async function ask(message: unknown, timeoutMs = 3000): Promise<AppResponse> {
  const rt = runtime();
  if (!rt) throw new ExtensionUnavailableError("The ProofBridge Capture extension was not detected in this browser.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let raw: unknown;
  try {
    raw = await Promise.race([
      rt.sendMessage(EXTENSION_ID, message),
      new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("timeout")), timeoutMs))),
    ]);
  } catch {
    throw new ExtensionUnavailableError("The ProofBridge Capture extension did not answer. Is it installed and enabled?");
  } finally {
    clearTimeout(timer);
  }
  const parsed = AppResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error("The extension sent a response this app does not understand.");
  if (!parsed.data.ok) throw new Error(`The extension refused: ${parsed.data.error}`);
  return parsed.data;
}

export async function listExtensionCaptures(): Promise<Capture[]> {
  const res = await ask(appRequest("list"));
  if (!res.ok || res.type !== "captures") throw new Error("Unexpected response from the extension.");
  return res.captures;
}

/** Removes captures from the extension's queue (after import, or when the user discards them). */
export async function ackExtensionCaptures(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const res = await ask(appRequest("ack", { ids }));
  if (!res.ok || res.type !== "acked") throw new Error("Unexpected response from the extension.");
}
