import { AppRequestSchema, isLocalAppOrigin, type AppResponse } from "@proofbridge/core";
import type { Outbox } from "./outbox";

/** What Chrome tells us about who sent a message (`chrome.runtime.MessageSender`). */
export interface Sender {
  id?: string;
  origin?: string;
  url?: string;
  frameId?: number;
}

const deny = (error: string): AppResponse => ({ ok: false, error });

/**
 * Handles a message from a web page (`runtime.onMessageExternal`). Chrome only delivers
 * messages from origins in `externally_connectable` (localhost); on top of that we accept only
 * the exact origin of the app the user configured, from a top-level frame, and only the
 * three requests of the protocol. A page can read the queue the user confirmed and remove
 * entries from it — it can never create, edit or trigger a capture.
 */
export async function handleAppMessage(message: unknown, sender: Sender, outbox: Outbox): Promise<AppResponse> {
  const appOrigin = await outbox.getAppUrl();
  // `sender.id` is set when the message comes from an extension rather than a web page.
  if (sender.id !== undefined && sender.id !== "") return deny("Messages from other extensions are not accepted.");
  if (!isLocalAppOrigin(sender.origin) || sender.origin !== appOrigin) {
    return deny("This page is not your ProofBridge app.");
  }
  if (sender.frameId !== 0) return deny("Only the top-level ProofBridge page may connect.");
  const parsed = AppRequestSchema.safeParse(message);
  if (!parsed.success) return deny("Unsupported request.");
  const req = parsed.data;
  switch (req.type) {
    case "ping":
      return { ok: true, type: "pong" };
    case "list":
      return { ok: true, type: "captures", captures: await outbox.list() };
    case "ack":
      return { ok: true, type: "acked", removed: await outbox.remove(req.ids) };
  }
}
