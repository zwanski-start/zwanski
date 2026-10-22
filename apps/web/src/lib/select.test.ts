import { describe, expect, it } from "vitest";
import { demoDataset } from "@proofbridge/fixtures";
import { isActive, NAV_ITEMS } from "./nav";
import { nextAction, requirementPaths } from "./select";

describe("requirementPaths", () => {
  it("follows only persisted links from the demo dataset", () => {
    const paths = requirementPaths(demoDataset);
    expect(paths).toHaveLength(demoDataset.requirements.length);
    const pg = paths.find((p) => p.requirement.id === "req_postgresql")!;
    expect(pg.skill?.name).toBe("PostgreSQL");
    expect(pg.evidence.map((e) => e.claim.id).sort()).toEqual(["claim_course-databases", "claim_repo-postgres"]);
    expect(pg.evidence.every((e) => e.artifact && e.source)).toBe(true);
    const lang = paths.find((p) => p.requirement.id === "req_language")!;
    expect(lang.evidence).toEqual([]);
    expect(lang.tasks.map((t) => t.id)).toEqual(["task_state-language"]);
  });

  it("picks the cheapest open task as the next action", () => {
    expect(nextAction(demoDataset)?.id).toBe("task_state-language");
  });
});

describe("nav", () => {
  it("has unique routes and marks the active one", () => {
    expect(new Set(NAV_ITEMS.map((n) => n.href)).size).toBe(NAV_ITEMS.length);
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/evidence", "/")).toBe(false);
    expect(isActive("/evidence/x", "/evidence")).toBe(true);
  });
});
