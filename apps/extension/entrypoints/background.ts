import { defineBackground } from "wxt/utils/define-background";
import { createOutbox } from "../lib/outbox";
import { handleAppMessage } from "../lib/router";

/**
 * The service worker only answers the local ProofBridge app. It has no content scripts, no
 * timers, no tab/navigation listeners and makes no network requests: nothing here observes
 * browsing. Captures are created only by the popup after a click + preview + confirmation.
 */
export default defineBackground(() => {
  const outbox = createOutbox(chrome.storage.local);
  chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    handleAppMessage(message, sender, outbox).then(sendResponse, () => sendResponse({ ok: false, error: "Internal error." }));
    return true; // keep the channel open for the async response
  });
});
