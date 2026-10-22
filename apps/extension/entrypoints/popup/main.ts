import {
  CAPTURE_PROTOCOL,
  CAPTURE_PROTOCOL_VERSION,
  CaptureSchema,
  MAX_CAPTURE_CHARS,
  captureHost,
  sanitizeCapturedText,
  sanitizeCapturedTitle,
  sanitizePageUrl,
  type Capture,
  type CaptureFile,
  type CaptureKind,
} from "@proofbridge/core";
import { extractFromPage } from "../../lib/extract";
import { createOutbox } from "../../lib/outbox";

/**
 * Popup: the only place a capture can start. Every capture is a click → one-shot text read of
 * the active tab (granted by `activeTab`) → editable preview → explicit "Confirm & queue".
 * All page-derived strings are written with `textContent`/`value`, never as HTML.
 */

type Pending = Omit<Capture, "id" | "title" | "text" | "confirmedAt"> & { title: string; text: string; truncated: boolean };

const outbox = createOutbox(chrome.storage.local);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $<HTMLParagraphElement>("status");
const preview = $<HTMLFormElement>("preview");
const titleInput = $<HTMLInputElement>("preview-title");
const textInput = $<HTMLTextAreaElement>("preview-text");
const appUrlInput = $<HTMLInputElement>("app-url");
let pending: Pending | null = null;

const say = (msg: string) => (status.textContent = msg);

function newCaptureId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `cap_${Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("")}`;
}

/** The tab the user clicked the toolbar button on. The e2e build may name it in the URL. */
async function targetTab(): Promise<chrome.tabs.Tab | undefined> {
  if (import.meta.env.MODE === "e2e") {
    const forced = Number(new URLSearchParams(location.search).get("tab"));
    if (forced) return chrome.tabs.get(forced);
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function capture(method: Capture["method"]) {
  say("");
  const tab = await targetTab();
  const pageUrl = sanitizePageUrl(tab?.url);
  if (!tab?.id || !pageUrl) {
    say("This page can’t be captured — only ordinary http(s) web pages.");
    return;
  }
  let raw: unknown;
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractFromPage,
      args: [method === "selection" ? "selection" : "visible-text", MAX_CAPTURE_CHARS],
    });
    raw = injection?.result;
  } catch {
    say("Chrome did not allow reading this page. Click the toolbar button on the page, then try again.");
    return;
  }
  const result = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const { text, truncated } = sanitizeCapturedText(result.text);
  if (!text) {
    say(method === "selection" ? "Select some text on the page first." : "No visible text found on this page.");
    return;
  }
  const kind: CaptureKind = method === "selection" ? "evidence" : "opportunity";
  pending = {
    kind,
    method,
    pageUrl,
    capturedAt: new Date().toISOString(),
    title: sanitizeCapturedTitle(result.title) || captureHost({ pageUrl }),
    text,
    truncated,
  };
  showPreview(pending);
}

function showPreview(p: Pending) {
  $("preview-source").textContent = `From ${p.pageUrl}`;
  for (const radio of preview.querySelectorAll<HTMLInputElement>("input[name=kind]")) radio.checked = radio.value === p.kind;
  titleInput.value = p.title;
  textInput.value = p.text;
  $("preview-note").textContent =
    `${p.text.length.toLocaleString()} characters of plain text${p.truncated ? " (cut to the 20,000-character limit)" : ""}. ` +
    "Edit or delete anything you don’t want to keep. Page text is treated as data, never as instructions.";
  preview.hidden = false;
  titleInput.focus();
}

function hidePreview() {
  pending = null;
  preview.hidden = true;
  preview.reset();
}

async function confirmPending(e: SubmitEvent) {
  e.preventDefault();
  if (!pending) return;
  const kind = (preview.querySelector<HTMLInputElement>("input[name=kind]:checked")?.value ?? pending.kind) as CaptureKind;
  const parsed = CaptureSchema.safeParse({
    id: newCaptureId(),
    kind,
    method: pending.method,
    title: sanitizeCapturedTitle(titleInput.value),
    text: sanitizeCapturedText(textInput.value).text,
    pageUrl: pending.pageUrl,
    capturedAt: pending.capturedAt,
    confirmedAt: new Date().toISOString(),
  });
  if (!parsed.success) {
    say("A title and some text are needed.");
    return;
  }
  try {
    await outbox.add(parsed.data);
  } catch (err) {
    say(err instanceof Error ? err.message : String(err));
    return;
  }
  hidePreview();
  say("Queued. Open ProofBridge to import it.");
  await renderQueue();
}

async function renderQueue() {
  const items = await outbox.list();
  $("queue-count").textContent = String(items.length);
  const list = $<HTMLUListElement>("queue");
  list.replaceChildren(
    ...items.map((c) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `${c.kind === "opportunity" ? "Opportunity" : "Evidence"}: ${c.title} — ${captureHost(c)}`;
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Delete";
      del.setAttribute("aria-label", `Delete capture: ${c.title}`);
      del.addEventListener("click", () => void outbox.remove([c.id]).then(renderQueue));
      li.append(label, del);
      return li;
    }),
  );
  for (const id of ["send", "download", "clear"]) $<HTMLButtonElement>(id).disabled = items.length === 0;
}

async function download() {
  const captures = await outbox.list();
  if (captures.length === 0) return;
  const file: CaptureFile = { protocol: CAPTURE_PROTOCOL, version: CAPTURE_PROTOCOL_VERSION, kind: "capture-file", captures };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `proofbridge-captures-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function sendToApp() {
  const origin = await outbox.getAppUrl();
  await chrome.tabs.create({ url: `${origin}/inbox` });
}

async function saveAppUrl() {
  try {
    appUrlInput.value = await outbox.setAppUrl(appUrlInput.value);
    say(`Saved. Only ${appUrlInput.value} can read the queue.`);
  } catch (err) {
    say(err instanceof Error ? err.message : String(err));
  }
}

$("capture-opportunity").addEventListener("click", () => void capture("visible-text"));
$("capture-selection").addEventListener("click", () => void capture("selection"));
preview.addEventListener("submit", (e) => void confirmPending(e));
$("preview-discard").addEventListener("click", () => {
  hidePreview();
  say("Discarded. Nothing was saved.");
});
$("send").addEventListener("click", () => void sendToApp());
$("download").addEventListener("click", () => void download());
$("clear").addEventListener("click", () => void outbox.clear().then(renderQueue).then(() => say("Queue deleted.")));
$("save-url").addEventListener("click", () => void saveAppUrl());

void outbox.getAppUrl().then((u) => (appUrlInput.value = u));
void renderQueue();
