import "fake-indexeddb/auto";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataProvider } from "@/lib/data";
import { Nav } from "@/components/Nav";
import CompassPage from "@/app/page";
import { DocumentLocale, LOCALES, LOCALE_BOOT_SCRIPT, LOCALE_STORAGE_KEY, formatDateFor, translate } from "./i18n";
import { MESSAGES, PDF_LABELS } from "./messages";
import { writeLocal } from "./localStore";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});
afterEach(cleanup);

describe("message catalogs", () => {
  it("French and Arabic define every English key, with the same placeholders", () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(MESSAGES[locale]).sort(), locale).toEqual(Object.keys(MESSAGES.en).sort());
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        expect(value.trim(), `${locale}:${key}`).not.toBe("");
        expect(placeholders(value), `${locale}:${key}`).toEqual(placeholders(MESSAGES.en[key as keyof typeof MESSAGES.en]));
      }
    }
  });

  it("Arabic strings are actually Arabic, French differs from English", () => {
    expect(translate("ar", "nav.evidence")).toMatch(/[؀-ۿ]/);
    expect(translate("fr", "nav.evidence")).toBe("Coffre de preuves");
    expect(translate("fr", "share.withheld", { n: 3 })).toBe("3 élément(s) de preuve retenu(s) (privés ou masqués).");
  });

  it("formats dates per locale (UTC, Latin digits in Arabic)", () => {
    const iso = "2026-02-02T08:00:00.000Z";
    expect(formatDateFor("en", iso)).toBe("Feb 2, 2026");
    expect(formatDateFor("fr", iso)).toMatch(/^2 févr\.? 2026$/);
    const ar = formatDateFor("ar", iso);
    expect(ar).toMatch(/[؀-ۿ]/); // Arabic month name
    expect(ar).toContain("2026");
  });

  it("PDF labels: French translated; Arabic falls back to English (no Arabic glyphs in built-in fonts)", () => {
    expect(PDF_LABELS.fr.status.supported).toBe("Étayée");
    expect(PDF_LABELS.ar).toBe(PDF_LABELS.en);
  });
});

describe("localized rendering", () => {
  it("defaults to English, left-to-right", async () => {
    render(
      <>
        <DocumentLocale />
        <Nav />
      </>,
    );
    expect(screen.getByRole("link", { name: "Evidence Vault" })).toBeTruthy();
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("Arabic switches nav, page text and <html dir> to RTL; French back to LTR", async () => {
    writeLocal(LOCALE_STORAGE_KEY, "ar");
    render(
      <DataProvider dbName="i18n-test">
        <DocumentLocale />
        <Nav />
        <CompassPage />
      </DataProvider>,
    );
    expect(screen.getByRole("link", { name: "خزنة الأدلة" })).toBeTruthy();
    expect(await screen.findByRole("heading", { level: 1, name: "البوصلة" })).toBeTruthy();
    expect(await screen.findByText("الخطوة التالية")).toBeTruthy();
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");

    act(() => writeLocal(LOCALE_STORAGE_KEY, "fr"));
    expect(screen.getByRole("link", { name: "Coffre de preuves" })).toBeTruthy();
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("ignores an unknown stored locale", () => {
    writeLocal(LOCALE_STORAGE_KEY, "xx");
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Compass" })).toBeTruthy();
  });

  it("the pre-paint boot script only applies whitelisted locales", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "ar");
    new Function(LOCALE_BOOT_SCRIPT)();
    expect(document.documentElement.dir).toBe("rtl");
    localStorage.setItem(LOCALE_STORAGE_KEY, '"><script>');
    document.documentElement.dir = "ltr";
    new Function(LOCALE_BOOT_SCRIPT)();
    expect(document.documentElement.dir).toBe("ltr");
  });
});
