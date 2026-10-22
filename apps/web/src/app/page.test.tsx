import "fake-indexeddb/auto";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataProvider } from "@/lib/data";
import CompassPage from "./page";
import OpportunitiesPage from "./opportunities/page";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

afterEach(cleanup);

let n = 0;
const renderWithDb = (ui: React.ReactNode) => render(<DataProvider dbName={`web-test-${++n}`}>{ui}</DataProvider>);

describe("fixture-driven pages (no network)", () => {
  it("Compass seeds IndexedDB from the synthetic fixture and renders it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderWithDb(<CompassPage />);
    expect(await screen.findByText(/State your working languages/)).toBeTruthy();
    expect(screen.getByText(/Junior Full-Stack Developer/)).toBeTruthy();
    expect(screen.getAllByText(/Demo \/ Synthetic/i).length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("Opportunity Lab shows the §3 requirement states", async () => {
    renderWithDb(<OpportunitiesPage />);
    const table = await screen.findByRole("table");
    const rows = Object.fromEntries(
      [...table.querySelectorAll("tbody tr")].map((tr) => [
        tr.querySelector("th")!.textContent,
        tr.querySelectorAll("td")[0]!.textContent,
      ]),
    );
    expect(rows).toEqual({
      TypeScript: "Supported",
      PostgreSQL: "Supported",
      "Experience deploying web applications": "Uncertain",
      "Two case studies of past work": "Not yet supported",
      "Professional working proficiency in the team language": "Unknown",
    });
  });
});
