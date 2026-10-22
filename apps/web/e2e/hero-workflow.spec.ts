import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

/**
 * §3 hero workflow through the real UI on the production build: every status transition,
 * reload + offline persistence of a manual artifact, and backup export → fresh-install restore.
 * Each test gets a fresh browser context, i.e. an empty IndexedDB that seeds the demo.
 */

const START = {
  TypeScript: "Supported",
  PostgreSQL: "Supported",
  "Experience deploying web applications": "Uncertain",
  "Two case studies of past work": "Not yet supported",
  "Professional working proficiency in the team language": "Unknown",
};
const CASE_STUDIES = "Two case studies of past work";
const DEPLOYMENT = "Experience deploying web applications";
const LANGUAGE = "Professional working proficiency in the team language";

const CASE_STUDY_2 = {
  title: "Case study: volunteer sign-up tracker",
  claim: "Delivered a sign-up tracker for a community group (anonymized case study).",
  text: "DEMO / SYNTHETIC anonymized write-up: sign-up tracker for a fictional community group.",
};

async function statuses(page: Page): Promise<Record<string, string>> {
  await page.goto("/opportunities");
  const table = page.getByRole("table").first();
  await expect(table).toBeVisible();
  return Object.fromEntries(
    await table
      .locator("tbody tr")
      .evaluateAll((trs) => trs.map((tr) => [tr.querySelector("th")!.textContent, tr.querySelector("td")!.textContent])),
  );
}

async function addEvidence(
  page: Page,
  e: { title: string; claim: string; text?: string; kind?: string; skills?: string[]; visibility?: string },
) {
  await page.goto("/evidence");
  await page.getByText("Add evidence", { exact: true }).click();
  await page.getByLabel("Title").fill(e.title);
  await page.getByLabel("Kind").selectOption(e.kind ?? "write-up");
  await page.getByLabel("Visibility").selectOption(e.visibility ?? "dossier-only");
  await page.getByLabel("What does this show? (your claim)").fill(e.claim);
  if (e.text) await page.getByLabel(/Evidence text/).fill(e.text);
  for (const s of e.skills ?? []) await page.getByRole("checkbox", { name: s }).check();
  await page.getByRole("button", { name: "Save to vault" }).click();
  await expect(page.getByRole("region", { name: `Inspector: ${e.title}` })).toBeVisible();
}

test("every §3 transition updates the Opportunity Lab, Proof Graph and dossier from persisted state", async ({ page }) => {
  expect(await statuses(page)).toEqual(START);

  // Add a second case study → Supported everywhere.
  await addEvidence(page, CASE_STUDY_2);
  const inspector = page.getByRole("region", { name: `Inspector: ${CASE_STUDY_2.title}` });
  await expect(inspector.getByRole("list", { name: "Requirements this evidence covers" })).toContainText(CASE_STUDIES);
  await expect(inspector.getByRole("list", { name: "Change history" })).toContainText(`Added “${CASE_STUDY_2.title}”`);
  expect(await statuses(page)).toEqual({ ...START, [CASE_STUDIES]: "Supported" });

  await page.goto("/graph");
  await expect(page.getByText(CASE_STUDY_2.claim)).toBeVisible();
  await page.goto("/share");
  const preview = page.getByRole("region", { name: "Dossier preview" });
  await expect(preview).toContainText(CASE_STUDY_2.title);
  await expect(preview).toContainText(CASE_STUDY_2.text);

  // Reload: still there.
  await page.reload();
  await expect(page.getByRole("region", { name: "Dossier preview" })).toContainText(CASE_STUDY_2.title);

  // Remove the claim → every surface reverts consistently.
  await page.goto("/evidence");
  await page.getByRole("button", { name: new RegExp(CASE_STUDY_2.title) }).click();
  await page.getByRole("button", { name: `Remove claim: ${CASE_STUDY_2.claim}` }).click();
  await page.getByRole("button", { name: "Confirm remove" }).click();
  await expect(page.getByText("No claims left on this artifact.")).toBeVisible();
  expect(await statuses(page)).toEqual(START);
  await page.goto("/graph");
  await expect(page.getByRole("heading", { name: "Proof Graph" })).toBeVisible();
  await expect(page.getByText(CASE_STUDY_2.claim)).toHaveCount(0);
  await page.goto("/share");
  await expect(page.getByRole("region", { name: "Dossier preview" })).not.toContainText(CASE_STUDY_2.title);

  // Deployment: Uncertain → Supported with proof → Uncertain when the match is rejected.
  const deployClaim = "Deployed taskboard-lite to a static host (synthetic).";
  await addEvidence(page, { title: "Deployment notes (synthetic)", kind: "note", claim: deployClaim, skills: ["Deployment"] });
  expect((await statuses(page))[DEPLOYMENT]).toBe("Supported");
  await page.getByRole("button", { name: `Reject evidence: ${deployClaim}` }).click();
  await expect(page.getByRole("button", { name: `Restore evidence: ${deployClaim}` })).toBeVisible();
  expect((await statuses(page))[DEPLOYMENT]).toBe("Uncertain");

  // Language: Unknown → Uncertain once stated in the profile.
  await page.goto("/");
  await page.getByLabel(/Working languages/).fill("English");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel(/Working languages/)).toHaveValue("English");
  expect((await statuses(page))[LANGUAGE]).toBe("Uncertain");

  // A human status decision wins and is labelled as such.
  await page.getByText(`Review “${LANGUAGE}”`).click();
  await page.locator('select[id^="ov-req_language"]').selectOption("supported");
  await page.locator('input[id^="ovn-req_language"]').fill("Native speaker");
  await page.getByRole("button", { name: "Save decision" }).first().click();
  await expect(page.getByText(/Set by you: Native speaker/)).toBeVisible();
  expect((await statuses(page))[LANGUAGE]).toBe("Supported");
});

test("a manual evidence artifact survives reload and offline", async ({ page, context }) => {
  const foreign: string[] = [];
  page.on("request", (r) => {
    const host = new URL(r.url()).hostname;
    if (host !== "localhost" && host !== "127.0.0.1") foreign.push(r.url());
  });

  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await addEvidence(page, CASE_STUDY_2);
  await page.reload();
  await page.getByRole("button", { name: new RegExp(CASE_STUDY_2.title) }).click();
  await expect(page.getByRole("region", { name: `Inspector: ${CASE_STUDY_2.title}` })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: new RegExp(CASE_STUDY_2.title) })).toBeVisible();
  // Other routes open offline from the cached shell, with the persisted result.
  expect((await statuses(page))[CASE_STUDIES]).toBe("Supported");
  await page.goto("/share");
  await expect(page.getByRole("region", { name: "Dossier preview" })).toContainText(CASE_STUDY_2.title);
  await context.setOffline(false);

  expect(foreign).toEqual([]);
});

test("backup export → fresh install restore keeps relations and ids unique", async ({ page, browser }) => {
  await addEvidence(page, CASE_STUDY_2);
  await page.goto("/share");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export vault backup (JSON)" }).click(),
  ]);
  const backup = JSON.parse(await readFile((await download.path())!, "utf8")) as Record<string, unknown>;
  const originalIds = Object.values(backup)
    .filter(Array.isArray)
    .flatMap((rows) => (rows as { id: string }[]).map((r) => r.id))
    .sort();

  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto("/share");
  await other.getByLabel("Restore from a backup file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await other.getByRole("button", { name: "Replace vault with backup" }).click();
  await expect(other.getByRole("status").filter({ hasText: "Vault restored" })).toBeVisible();

  expect(await statuses(other)).toEqual({ ...START, [CASE_STUDIES]: "Supported" });
  await other.goto("/evidence");
  await other.getByRole("button", { name: new RegExp(CASE_STUDY_2.title) }).click();
  await expect(other.getByRole("list", { name: "Requirements this evidence covers" })).toContainText(CASE_STUDIES);

  const restoredIds = await other.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open("proofbridge");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const stores = [...db.objectStoreNames].filter((s) => s !== "meta");
          const tx = db.transaction(stores, "readonly");
          const ids: string[] = [];
          for (const s of stores) {
            const req = tx.objectStore(s).getAllKeys();
            req.onsuccess = () => ids.push(...(req.result as string[]));
          }
          tx.oncomplete = () => resolve(ids);
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  expect(new Set(restoredIds).size).toBe(restoredIds.length);
  expect(restoredIds.sort()).toEqual(originalIds);
  await fresh.close();
});

test("changing an artifact's visibility in the inspector moves it into and out of the dossier", async ({ page }) => {
  await addEvidence(page, { ...CASE_STUDY_2, visibility: "private" });
  await page.goto("/share");
  await expect(page.getByRole("region", { name: "Dossier preview" })).not.toContainText(CASE_STUDY_2.title);

  await page.goto("/evidence");
  await page.getByRole("button", { name: new RegExp(CASE_STUDY_2.title) }).click();
  const inspector = page.getByRole("region", { name: `Inspector: ${CASE_STUDY_2.title}` });
  await inspector.getByLabel("Visibility").selectOption("public");
  await expect(inspector).toContainText("· public");
  await page.goto("/share");
  await expect(page.getByRole("region", { name: "Dossier preview" })).toContainText(CASE_STUDY_2.title);

  await page.goto("/evidence");
  await page.getByRole("button", { name: new RegExp(CASE_STUDY_2.title) }).click();
  await inspector.getByLabel("Visibility").selectOption("private");
  await expect(inspector).toContainText("· private");
  await page.goto("/share");
  await expect(page.getByRole("region", { name: "Dossier preview" })).not.toContainText(CASE_STUDY_2.title);
});
