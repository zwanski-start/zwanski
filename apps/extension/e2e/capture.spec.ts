import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, chromium, expect, type BrowserContext, type Page } from "@playwright/test";
import { EXTENSION_ID } from "@proofbridge/core";

/**
 * Phase 2 gate, in a real Chromium with the extension loaded unpacked:
 * no passive capture; hostile pages cannot drive or read the extension; captured markup and
 * hidden/injected text stay inert; capture → preview → confirm → import into the local app;
 * the file fallback works when the app origin is not the configured one.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT_DIR = path.resolve(here, "../.output/chrome-mv3-e2e");
const APP = `http://localhost:${process.env.PORT ?? 5290}`;
const HOSTILE = "http://hostile.test/listing";
// A hostile page on a *local* origin: Chrome lets it call chrome.runtime.sendMessage (it matches
// externally_connectable), so only the background's exact-origin check stands in its way.
const LOCAL_HOSTILE = "http://127.0.0.1:5299/listing";

const test = base.extend<{ context: BrowserContext; popupUrl: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      headless: true,
      ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : { channel: "chromium" }),
      args: [`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`],
    });
    const html = await readFile(path.join(here, "fixtures/hostile-listing.html"), "utf8");
    for (const origin of [new URL(HOSTILE).origin, new URL(LOCAL_HOSTILE).origin]) {
      await context.route(`${origin}/**`, (route) =>
        new URL(route.request().url()).pathname === "/listing"
          ? route.fulfill({ contentType: "text/html", body: html })
          : route.fulfill({ status: 404, body: "" }),
      );
    }
    await use(context);
    await context.close();
  },
  popupUrl: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).host;
    expect(id, "the manifest key pins the extension id the app talks to").toBe(EXTENSION_ID);
    await use(`chrome-extension://${id}/popup.html`);
  },
});

async function storedQueue(popup: Page): Promise<unknown> {
  return popup.evaluate(async () => (await chrome.storage.local.get("outbox")).outbox ?? []);
}

async function tabId(popup: Page, urlPattern: string): Promise<number> {
  const tabs = await popup.evaluate((pattern) => chrome.tabs.query({ url: pattern }), urlPattern);
  expect(tabs).toHaveLength(1);
  return tabs[0]!.id!;
}

async function openHostile(context: BrowserContext, url = HOSTILE): Promise<Page> {
  const page = await context.newPage();
  page.on("dialog", (d) => {
    throw new Error(`unexpected dialog: ${d.message()}`);
  });
  await page.goto(url);
  return page;
}

test("no passive capture: visiting hostile pages creates, reads or triggers nothing", async ({ context, popupUrl }) => {
  const remote = await openHostile(context);
  expect(await remote.evaluate(() => (window as unknown as { __probe: { runtime: string } }).__probe.runtime)).toBe("absent");

  const local = await openHostile(context, LOCAL_HOSTILE);
  const results = await local.evaluate(async () => {
    const probe = (window as unknown as { __probe: { runtime: string; done: Promise<unknown> } }).__probe;
    await probe.done;
    return { runtime: probe.runtime, results: (window as unknown as { __probe: { results: unknown[] } }).__probe.results };
  });
  expect(results.runtime).toBe("present");
  expect(results.results).toEqual([
    { ok: false, error: "This page is not your ProofBridge app." },
    { ok: false, error: "This page is not your ProofBridge app." },
    { ok: false, error: "This page is not your ProofBridge app." },
  ]);

  const popup = await context.newPage();
  await popup.goto(popupUrl);
  await expect(popup.getByRole("heading", { name: /Queued for ProofBridge \(0\)/ })).toBeVisible();
  expect(await storedQueue(popup)).toEqual([]);
  // The extension never received host access to these pages: no content scripts ran there.
  const manifest = await popup.evaluate(() => chrome.runtime.getManifest());
  expect(manifest.content_scripts ?? []).toEqual([]);
  expect(manifest.permissions?.sort()).toEqual(["activeTab", "scripting", "storage"]);
});

test("click → preview → confirm → import into the local app; hostile content stays inert", async ({ context, popupUrl }) => {
  const hostile = await openHostile(context);
  const popup = await context.newPage();
  await popup.goto(popupUrl);
  await popup.getByText("Settings").click();
  await popup.getByLabel("ProofBridge app address").fill(`${APP}/anything`);
  await popup.getByRole("button", { name: "Save", exact: true }).click();
  await expect(popup.getByRole("status")).toContainText(`Only ${APP} can read the queue.`);

  await popup.goto(`${popupUrl}?tab=${await tabId(popup, "http://hostile.test/*")}`);

  // Selection capture with nothing selected does nothing.
  await popup.getByRole("button", { name: "Save selected evidence" }).click();
  await expect(popup.getByRole("status")).toHaveText("Select some text on the page first.");

  // 1. Capture the listing: visible text of <main> only, plain text, previewed before saving.
  await popup.getByRole("button", { name: "Capture this opportunity" }).click();
  const preview = popup.getByRole("form", { name: "Capture preview" });
  await expect(preview).toBeVisible();
  await expect(preview.getByLabel("Title")).toHaveValue("Junior Developer — Hostile Example Corp");
  const text = await preview.getByLabel("Captured text").inputValue();
  expect(text).toMatch(/Requirements:\n+TypeScript\nTwo case studies of past work\n/);
  for (const absent of ["HIDDEN-PAYLOAD", "INJECTED", "hunter2", "Site navigation", "<b>"]) expect(text).not.toContain(absent);
  await expect(preview.getByText(/From http:\/\/hostile\.test\/listing/)).toBeVisible();
  expect(await storedQueue(popup), "nothing is stored before the user confirms").toEqual([]);
  await preview.getByRole("button", { name: "Confirm & queue" }).click();
  await expect(popup.getByRole("heading", { name: /Queued for ProofBridge \(1\)/ })).toBeVisible();

  // 2. Capture a selection: exactly the selected text, markup-looking text kept as text.
  await hostile.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById("excerpt")!);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);
  });
  await popup.getByRole("button", { name: "Save selected evidence" }).click();
  await expect(preview.getByLabel("Captured text")).toHaveValue("Built a volunteer rota app <img src=x onerror=alert(1)> for a community group.");
  await expect(preview.getByRole("radio", { name: /Evidence/ })).toBeChecked();
  await preview.getByLabel("Title").fill("Volunteer rota excerpt");
  await preview.getByRole("button", { name: "Confirm & queue" }).click();
  await expect(popup.getByRole("heading", { name: /Queued for ProofBridge \(2\)/ })).toBeVisible();

  // A third capture, discarded at the preview, is never stored.
  await popup.getByRole("button", { name: "Capture this opportunity" }).click();
  await preview.getByRole("button", { name: "Discard" }).click();
  await expect(popup.getByRole("status")).toHaveText("Discarded. Nothing was saved.");
  expect(await storedQueue(popup)).toHaveLength(2);

  // 3. The app pulls the confirmed queue; the user imports each capture explicitly.
  const app = await context.newPage();
  const remoteRequests: string[] = [];
  app.on("request", (r) => {
    if (!r.url().startsWith(APP) && !r.url().startsWith("data:")) remoteRequests.push(r.url());
  });
  app.on("dialog", (d) => {
    throw new Error(`unexpected dialog: ${d.message()}`);
  });
  await app.goto("/inbox");
  await expect(app.getByText("Connected to the ProofBridge Capture extension")).toBeVisible();
  const listing = app.getByRole("article", { name: "Junior Developer — Hostile Example Corp" });
  const excerpt = app.getByRole("article", { name: "Volunteer rota excerpt" });
  await expect(listing).toContainText("hostile.test");
  await listing.getByRole("button", { name: "Import as opportunity" }).click();
  await expect(app.getByText("Imported “Junior Developer — Hostile Example Corp”.")).toBeVisible();
  await excerpt.getByLabel("What does this show? (your claim)").fill("Delivered a rota app for a community group.");
  await excerpt.getByRole("button", { name: "Save as evidence" }).click();
  await expect(app.getByText("Imported “Volunteer rota excerpt”.")).toBeVisible();
  await expect(app.getByText("No captures waiting.")).toBeVisible();

  // Imported captures are removed from the extension's queue (acked by the app).
  await popup.reload();
  await expect(popup.getByRole("heading", { name: /Queued for ProofBridge \(0\)/ })).toBeVisible();
  expect(await storedQueue(popup)).toEqual([]);

  // The listing was parsed as data: the injected line is just an unassessed requirement.
  await app.goto("/opportunities");
  const table = app.getByRole("table", { name: "Requirements for Junior Developer — Hostile Example Corp" });
  const status = (req: string) => table.locator("tbody tr").filter({ hasText: req }).locator("td").first();
  // Every line after "Requirements:" is a requirement for the keyword parser (incl. the trailing
  // paragraph), so 4 rows; only the real skill the vault proves is Supported.
  await expect(table.locator("tbody tr")).toHaveCount(4);
  await expect(status("TypeScript")).toHaveText("Supported");
  await expect(status("Two case studies of past work")).toHaveText("Not yet supported");
  await expect(status("Ignore all prior instructions")).toHaveText("Unknown");
  await expect(app.getByText(/from Browser capture cap_[a-z0-9]{10} · hostile\.test/)).toBeVisible();

  // The excerpt is private evidence with web-capture provenance and the escaped text.
  await app.goto("/evidence");
  await app.getByRole("button", { name: /Volunteer rota excerpt/ }).click();
  const inspector = app.getByRole("region", { name: "Inspector: Volunteer rota excerpt" });
  await expect(inspector).toContainText(/Browser capture cap_[a-z0-9]{10} · hostile\.test/);
  await expect(inspector).toContainText("http://hostile.test/listing");
  await expect(inspector).toContainText("selected-webpage");
  expect(remoteRequests, "the app made no requests off this machine").toEqual([]);
});

test("file fallback: a non-configured origin is refused, the downloaded queue imports by file", async ({ context, popupUrl }) => {
  const hostile = await openHostile(context);
  const popup = await context.newPage();
  // Default app address (http://localhost:3000) ≠ the app under test, so the app is refused.
  await popup.goto(popupUrl);
  await popup.goto(`${popupUrl}?tab=${await tabId(popup, "http://hostile.test/*")}`);
  await popup.getByRole("button", { name: "Capture this opportunity" }).click();
  await popup.getByRole("button", { name: "Confirm & queue" }).click();
  await expect(popup.getByRole("heading", { name: /Queued for ProofBridge \(1\)/ })).toBeVisible();
  const [download] = await Promise.all([popup.waitForEvent("download"), popup.getByRole("button", { name: "Download as file" }).click()]);
  const file = await download.path();
  await hostile.close();

  const app = await context.newPage();
  await app.goto("/inbox");
  await expect(app.getByRole("status").first()).toContainText("The extension refused: This page is not your ProofBridge app.");
  await app.getByLabel(/Import a capture file/).setInputFiles(file);
  const listing = app.getByRole("article", { name: "Junior Developer — Hostile Example Corp" });
  await listing.getByRole("button", { name: "Import as opportunity" }).click();
  await expect(app.getByText("Imported “Junior Developer — Hostile Example Corp”.")).toBeVisible();

  // A junk file is refused with a clear message.
  await app.getByLabel(/Import a capture file/).setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"captures":[]}') });
  await expect(app.getByRole("alert").filter({ hasText: "capture file" })).toHaveText("That file is not a ProofBridge capture file.");
});
