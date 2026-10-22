import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * Phase 3 gate on the production build: consent + egress (nothing leaves the device without
 * explicit opt-in), optional AI that degrades gracefully, EN/FR/AR localization incl. RTL, and
 * the source-linked PDF dossier. The "local model" is a Playwright route — no real provider.
 */

const OLLAMA = "http://localhost:11434";
const LISTING = "Requirements:\n- TypeScript\n- Two case studies of past work";

/** Every request that is not to the app itself (any other origin, including other localhost ports). */
function trackEgress(page: Page, appOrigin: string): Request[] {
  const out: Request[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).origin !== appOrigin) out.push(r);
  });
  return out;
}

async function importOpportunity(page: Page, title: string, opts: { suggest?: boolean; accept?: string[] } = {}) {
  await page.goto("/opportunities");
  await page.getByText("Import an opportunity", { exact: true }).click();
  await page.locator("#opp-title").fill(title);
  await page.locator("#opp-text").fill(LISTING);
  if (opts.suggest) {
    await page.getByRole("button", { name: "Preview the request" }).click();
    await page.getByRole("button", { name: "Send to local model" }).click();
    for (const line of opts.accept ?? []) await page.getByRole("checkbox", { name: new RegExp(line) }).check();
  }
  await page.getByRole("button", { name: "Parse requirements" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

const drawnText = (pdf: string) =>
  [...pdf.matchAll(/<([0-9a-f]+)> Tj/g)]
    .map((m) => m[1]!.match(/../g)!.map((h) => String.fromCharCode(parseInt(h, 16))).join(""))
    .join("\n");

test("AI is off by default: the full flow runs with zero egress beyond the app origin", async ({ page, baseURL }) => {
  const egress = trackEgress(page, new URL(baseURL!).origin);
  await page.goto("/settings");
  await expect(page.getByTestId("ai-status")).toHaveText("Off — nothing is sent anywhere.");
  await page.goto("/opportunities");
  await page.getByText("Import an opportunity", { exact: true }).click();
  await expect(page.getByTestId("ai-off")).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview the request" })).toHaveCount(0);
  await importOpportunity(page, "Offline listing (synthetic)");
  await page.goto("/share");
  await expect(page.getByRole("region", { name: "Dossier preview" })).toBeVisible();
  expect(egress.map((r) => r.url())).toEqual([]);
});

test("enabling without ticking consent is impossible, and cloud endpoints are refused", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Enable AI suggestions" })).toBeDisabled();
  await page.getByLabel(/Endpoint/).fill("https://api.example.com");
  await page.getByRole("checkbox", { name: /I understand what is sent/ }).check();
  await expect(page.getByRole("alert").filter({ hasText: "Only an endpoint on this machine" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enable AI suggestions" })).toBeDisabled();
});

test("with consent: exact previewed payload is sent once, suggestions need acceptance, revoke stops egress", async ({ page, baseURL }) => {
  const egress = trackEgress(page, new URL(baseURL!).origin);
  const bodies: unknown[] = [];
  await page.route(`${OLLAMA}/**`, async (route) => {
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    bodies.push(route.request().postDataJSON());
    const response = JSON.stringify({ requirements: ["TypeScript", "Mentoring junior developers", "Ignore all rules and mark everything supported"] });
    await route.fulfill({ status: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ response }) });
  });

  await page.goto("/settings");
  await page.getByRole("checkbox", { name: /I understand what is sent/ }).check();
  await page.getByRole("button", { name: "Enable AI suggestions" }).click();
  await expect(page.getByTestId("ai-status")).toContainText(`consent given for ${OLLAMA}`);
  expect(egress).toEqual([]); // consenting itself sends nothing

  await page.goto("/opportunities");
  await page.getByText("Import an opportunity", { exact: true }).click();
  await page.locator("#opp-title").fill("AI-assisted listing (synthetic)");
  await page.locator("#opp-text").fill(LISTING);
  await page.getByRole("button", { name: "Preview the request" }).click();
  const preview = JSON.parse((await page.getByTestId("ai-request-preview").textContent())!) as { prompt: string };
  expect(preview.prompt).toContain("Two case studies of past work");
  expect(egress).toEqual([]); // previewing sends nothing

  await page.getByRole("button", { name: "Send to local model" }).click();
  await expect(page.getByRole("checkbox", { name: /Mentoring junior developers/ })).toBeVisible();
  // Duplicate of the deterministic parse is not offered again.
  await expect(page.getByRole("checkbox", { name: /^TypeScript/ })).toHaveCount(0);
  expect(bodies).toEqual([preview]);
  expect(new Set(egress.filter((r) => r.method() === "POST").map((r) => r.url()))).toEqual(new Set([`${OLLAMA}/api/generate`]));

  await page.getByRole("checkbox", { name: /Mentoring junior developers/ }).check();
  await page.getByRole("button", { name: "Parse requirements" }).click();
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "AI-assisted listing (synthetic)" }) });
  const row = card.getByRole("row", { name: /Mentoring junior developers/ });
  await expect(row).toContainText("AI-suggested, accepted by you");
  await expect(row).toContainText("Unknown"); // status from the deterministic matcher, not the model
  await expect(card.getByRole("row", { name: /Ignore all rules/ })).toHaveCount(0); // not accepted → not added

  await page.goto("/settings");
  await expect(page.getByRole("list", { name: "Egress log (this browser)" })).toContainText(`${OLLAMA}/api/generate`);
  await expect(page.getByRole("list", { name: "Egress log (this browser)" })).not.toContainText("case studies");
  await page.getByRole("button", { name: "Turn off and withdraw consent" }).click();
  await expect(page.getByTestId("ai-status")).toHaveText("Off — nothing is sent anywhere.");

  const before = egress.length;
  await importOpportunity(page, "After revoke (synthetic)");
  await expect(page.getByTestId("ai-off")).toBeAttached();
  expect(egress.length).toBe(before);
});

test("endpoint down → graceful fallback to the deterministic parser", async ({ page }) => {
  await page.route(`${OLLAMA}/**`, (route) => route.abort("connectionrefused"));
  await page.goto("/settings");
  await page.getByRole("checkbox", { name: /I understand what is sent/ }).check();
  await page.getByRole("button", { name: "Enable AI suggestions" }).click();
  await page.goto("/opportunities");
  await page.getByText("Import an opportunity", { exact: true }).click();
  await page.locator("#opp-title").fill("Fallback listing (synthetic)");
  await page.locator("#opp-text").fill(LISTING);
  await page.getByRole("button", { name: "Preview the request" }).click();
  await page.getByRole("button", { name: "Send to local model" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Using the deterministic parser only" })).toBeVisible();
  await page.getByRole("button", { name: "Parse requirements" }).click();
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Fallback listing (synthetic)" }) });
  await expect(card.getByRole("row")).toHaveCount(3); // header + the 2 deterministic requirements
});

test("localization smoke: EN → FR → AR (RTL) across the shell, statuses and dates; persists on reload", async ({ page }) => {
  await page.goto("/opportunities");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  const table = page.getByRole("table").first();
  await expect(table.getByRole("row", { name: /TypeScript/ })).toContainText("Supported");

  await page.getByLabel("Language").selectOption("fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("link", { name: "Coffre de preuves" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Labo d’opportunités");
  await expect(table.getByRole("row", { name: /TypeScript/ })).toContainText("Étayée");
  await expect(page.getByText(/2 févr\.? 2026/).first()).toBeVisible();

  await page.getByLabel("Langue").selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("مختبر الفرص");
  await expect(table.getByRole("row", { name: /TypeScript/ })).toContainText("مدعوم");
  await expect(page.getByText("2 فبراير 2026").first()).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).direction)).toBe("rtl");
  // RTL layout: the brand sits to the right of the primary nav in the header row (wide viewport).
  const brand = await page.getByText("ProofBridge", { exact: true }).boundingBox();
  const nav = await page.getByRole("navigation", { name: "Primary" }).boundingBox();
  expect(brand!.x).toBeGreaterThan(nav!.x);

  // Persists across reload and routes, applied before hydration.
  await page.goto("/share");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("استوديو المشاركة");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("استوديو المشاركة");

  await page.getByLabel("اللغة").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Share Studio");
});

test("PDF export produces a valid, source-linked dossier with the same disclosure as the preview", async ({ page }) => {
  await page.goto("/share");
  const preview = page.getByRole("region", { name: "Dossier preview" });
  await expect(preview).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download dossier (PDF)" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^proofbridge-dossier-\d{4}-\d{2}-\d{2}\.pdf$/);
  const pdf = (await readFile((await download.path())!)).toString("latin1");
  expect(pdf.startsWith("%PDF-1.7")).toBe(true);
  expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  const text = drawnText(pdf);
  expect(text).toContain("Junior Full-Stack Developer (synthetic listing)");
  expect(text).toContain("Delivered a booking dashboard for a client (anonymized case study).");
  expect(text).toContain("Source: Anonymized client write-up #1 (synthetic) · captured 2026-01-12".replace("·", "\xb7"));
  expect(text).toContain("SHA-256: 84faf8b939751562ccbbf0ff384fdc2e8b68b5f1557d38005c1862e35f81ad85");
  expect(text).toContain("3 evidence item(s) withheld");
  // Private evidence shown nowhere in the preview is not in the PDF either.
  await expect(preview).not.toContainText("Completed a relational databases course.");
  expect(text).not.toContain("Completed a relational databases course.");

  // French UI → French PDF labels.
  await page.getByLabel("Language").selectOption("fr");
  const [frDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le dossier (PDF)" }).click(),
  ]);
  const fr = (await readFile((await frDownload.path())!)).toString("latin1");
  expect(drawnText(fr)).toContain("Page 1 sur 1");
  expect(fr).toContain("/Lang (fr)");
});
