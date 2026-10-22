import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { startShareServer } from "../../share-server/src/node.ts";
import type { ShareStore } from "../../share-server/src/store.ts";

/**
 * Phase 4 gate on the production build: online share links honour expiry + revocation end to
 * end (app → share service → public viewer), encrypted backup round-trip, accessibility
 * (axe WCAG 2.1 A/AA in light and dark, keyboard, accessibility-tree inspection of every graph
 * node) and performance budgets. The share service runs in-process on a random loopback port
 * with an injected clock, so expiry is tested without waiting.
 */

const ROUTES = ["/", "/evidence", "/opportunities", "/graph", "/plan", "/inbox", "/share"];
const OPP_TITLE = "Junior Full-Stack Developer (synthetic listing)";

let clock = Date.now();
let share: { url: string; store: ShareStore; close: () => void };

test.beforeAll(async ({ baseURL }) => {
  const started = await startShareServer({ allowedOrigins: [new URL(baseURL!).origin], now: () => clock });
  share = { url: started.url, store: started.store, close: () => started.server.close() };
});
test.afterAll(() => share.close());

async function enableSharing(page: Page) {
  await page.goto("/share");
  await page.getByRole("button", { name: "Set up an online share link…" }).click();
  await page.getByLabel("Share service address").fill(share.url);
  const enable = page.getByRole("button", { name: "Enable online share links" });
  await expect(enable).toBeDisabled();
  await page.getByLabel(/I understand what is uploaded/).check();
  await enable.click();
  await expect(page.getByText("Online share links are")).toContainText("on");
}

async function createLink(page: Page, expiry: string) {
  await page.getByLabel("Link expires after").selectOption({ label: expiry });
  await page.getByRole("button", { name: "Create encrypted link" }).click();
  const link = await page.getByLabel(/New link/).inputValue();
  expect(link).toMatch(new RegExp(`^${share.url}/s/[A-Za-z0-9_-]{22}#k=[A-Za-z0-9_-]{43}$`));
  return link;
}

test("share link: encrypted upload, public viewer, revocation and expiry are enforced by the server", async ({ page, browser }) => {
  const uploads: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().startsWith(share.url)) uploads.push(r.postData() ?? "");
    expect(r.url()).not.toContain("#k=");
  });

  // Off by default: no request to the share service until the user opts in.
  await page.goto("/share");
  await expect(page.getByText(/Online share links are off/)).toBeVisible();

  await enableSharing(page);
  await expect(page.getByLabel("Dossier to share")).toHaveValue(/opp_/);
  const link = await createLink(page, "1 hour");

  // Only ciphertext left the browser; the server holds no plaintext and no key.
  expect(uploads).toHaveLength(1);
  expect(uploads[0]).not.toContain(OPP_TITLE);
  expect(uploads[0]).not.toContain(link.split("#k=")[1]);
  expect(JSON.stringify(share.store.dump())).not.toContain(OPP_TITLE);

  // A reader in a separate browser context (no vault) sees the read-only dossier.
  // Each view is a fresh page: links differing only in #fragment would not reload the viewer.
  const readerContext = await browser.newContext();
  let reader = await readerContext.newPage();
  const view = async (url: string) => {
    await reader.close();
    reader = await readerContext.newPage();
    await reader.goto(url);
  };
  await view(link);
  const doc = reader.getByRole("article", { name: "Shared dossier" });
  await expect(doc.getByRole("heading", { level: 1 })).toHaveText(OPP_TITLE);
  await expect(doc).toContainText("TypeScript");
  await expect(doc).toContainText(/Copies that were already saved.*cannot be revoked/);
  const viewerAxe = await new AxeBuilder({ page: reader }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(viewerAxe.violations.map((v) => v.id)).toEqual([]);

  // A link without its key cannot be read.
  await view(link.split("#")[0]!);
  await expect(reader.getByRole("status")).toHaveText(/decryption key after # is missing/);

  // Owner revokes → the server refuses it immediately; the app shows it as revoked.
  const card = page.getByRole("listitem", { name: `Share: ${OPP_TITLE}` });
  await page.getByRole("button", { name: `Revoke link: ${OPP_TITLE}` }).click();
  await page.getByRole("button", { name: "Confirm revoke" }).click();
  await expect(card.getByTestId("share-state")).toHaveText("Revoked");
  await expect(card).toContainText("opened 1 time(s)");
  await view(link);
  await expect(reader.getByRole("status")).toHaveText("This share was revoked by its owner.");
  await expect(reader.getByRole("heading", { level: 1 })).toHaveCount(0);

  // A second link works until its expiry passes on the server's clock.
  const link2 = await createLink(page, "1 hour");
  await view(link2);
  await expect(reader.getByRole("heading", { level: 1 })).toHaveText(OPP_TITLE);
  clock += 3600 * 1000 + 1;
  await view(link2);
  await expect(reader.getByRole("status")).toHaveText("This share has expired.");
  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(page.getByTestId("share-state").first()).toHaveText("Expired");
  expect(share.store.dump().every((r) => r.ciphertext === null)).toBe(true);

  // Nothing active → sharing can be turned off, which forgets the server and owner key.
  await page.getByRole("button", { name: "Turn off online sharing on this device" }).click();
  await expect(page.getByText(/Online share links are off/)).toBeVisible();
  await readerContext.close();
});

test("encrypted backup: wrong passphrase refused, right one restores in a fresh browser", async ({ page, browser }) => {
  const PASS = "a long synthetic passphrase";
  await page.goto("/share");
  await page.getByLabel(/^Passphrase/).fill(PASS);
  await page.getByLabel("Repeat passphrase").fill(PASS);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export encrypted backup" }).click();
  const file = await (await download).path();
  const text = await readFile(file, "utf8");
  expect(text).toContain('"proofbridge.encrypted-backup"');
  expect(text).not.toContain(OPP_TITLE);

  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto("/share");
  // The plain restore explains that this file needs the encrypted restore.
  await fresh.getByLabel("Restore from a backup file").setInputFiles(file);
  await expect(fresh.getByRole("alert").filter({ hasText: "This backup is encrypted" })).toBeVisible();

  await fresh.getByLabel("Encrypted backup file").setInputFiles(file);
  await fresh.getByLabel("Its passphrase").fill(PASS + " wrong");
  await fresh.getByRole("button", { name: "Decrypt and check" }).click();
  await expect(fresh.getByRole("alert").filter({ hasText: "wrong passphrase, or the file was modified" })).toBeVisible();

  await fresh.getByLabel("Its passphrase").fill(PASS);
  await fresh.getByRole("button", { name: "Decrypt and check" }).click();
  const confirm = fresh.getByRole("alertdialog", { name: "Confirm encrypted restore" });
  await expect(confirm).toContainText("Decrypted and verified");
  await confirm.getByRole("button", { name: "Replace vault with backup" }).click();
  await expect(fresh.getByText("Vault restored from encrypted backup.")).toBeVisible();
  await fresh.context().close();
});

for (const scheme of ["light", "dark"] as const) {
  test(`accessibility: no axe WCAG 2.1 A/AA violations on any screen (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const found: string[] = [];
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      if (route === "/share") await page.getByRole("button", { name: "Set up an online share link…" }).click();
      const { violations, passes } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      // Control: axe really ran its rules (incl. colour contrast) on this page.
      expect(passes.map((p) => p.id)).toContain("color-contrast");
      for (const v of violations) found.push(`${route} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    }
    expect(found).toEqual([]);
  });
}

test("keyboard: skip link first, every screen reachable by Tab, focus is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  const reached = new Set<string>();
  for (let i = 0; i < 25 && reached.size < ROUTES.length; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { href: el.getAttribute("href"), outline: cs.outlineStyle, width: cs.outlineWidth };
    });
    if (info?.href && info.href.startsWith("/")) {
      reached.add(info.href);
      expect(info.outline, `focus ring on ${info.href}`).not.toBe("none");
    }
  }
  expect([...reached].sort()).toEqual([...ROUTES].sort());

  // Activate a nav link with the keyboard.
  await page.getByRole("link", { name: /Opportunity Lab/ }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/opportunities$/);
  await expect(page.getByRole("heading", { level: 1, name: "Opportunity Lab" })).toBeVisible();
});

test("screen-reader inspection: every Proof Graph node is exposed in the accessibility tree", async ({ page }) => {
  await page.goto("/graph");
  await expect(page.getByRole("heading", { level: 1, name: "Proof Graph" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Evidence paths" }).first()).toBeVisible();
  const tree = await page.getByRole("main").ariaSnapshot();
  const nodes = await page.evaluate(async () => {
    const req = indexedDB.open("proofbridge");
    const db: IDBDatabase = await new Promise((ok, err) => {
      req.onsuccess = () => ok(req.result);
      req.onerror = () => err(req.error);
    });
    const all = <T,>(table: string) =>
      new Promise<T[]>((ok) => {
        const r = db.transaction(table).objectStore(table).getAll();
        r.onsuccess = () => ok(r.result as T[]);
      });
    const requirements = await all<{ text: string }>("requirements");
    const links = await all<{ claimId: string; reviewState: string }>("requirementEvidenceLinks");
    const claims = await all<{ id: string; statement: string }>("claims");
    const linked = new Set(links.map((l) => l.claimId));
    return [...requirements.map((r) => r.text), ...claims.filter((c) => linked.has(c.id)).map((c) => c.statement)];
  });
  expect(nodes.length).toBeGreaterThan(5);
  for (const text of nodes) expect(tree, `accessibility tree contains “${text}”`).toContain(text);
});

test("performance: production build stays inside load and JavaScript budgets", async ({ browser }) => {
  // Service worker blocked so every script comes over HTTP (gzip) and sizes are comparable.
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  const report: Record<string, { dcl: number; load: number; ready: number; jsKB: number; jsRawKB: number }> = {};
  for (const route of ROUTES) {
    const t0 = Date.now();
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Opening local vault…")).toHaveCount(0);
    const ready = Date.now() - t0;
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const scripts = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter((r) => r.name.endsWith(".js"));
      return {
        dcl: nav.domContentLoadedEventEnd,
        load: nav.loadEventEnd,
        js: scripts.reduce((n, r) => n + r.encodedBodySize, 0),
        raw: scripts.reduce((n, r) => n + r.decodedBodySize, 0),
      };
    });
    report[route] = { dcl: Math.round(m.dcl), load: Math.round(m.load), ready, jsKB: Math.round(m.js / 1024), jsRawKB: Math.round(m.raw / 1024) };
  }
  console.log("perf", JSON.stringify(report));
  for (const [route, r] of Object.entries(report)) {
    expect(r.dcl, `${route} DOMContentLoaded ms`).toBeLessThan(1500);
    expect(r.ready, `${route} vault rendered ms`).toBeLessThan(3000);
    expect(r.jsKB, `${route} JS KB (gzip)`).toBeLessThan(300);
    expect(r.jsRawKB, `${route} JS KB (uncompressed)`).toBeLessThan(1000);
  }
  await context.close();
});
