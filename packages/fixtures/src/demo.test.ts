import { describe, expect, it } from "vitest";
import { evaluateOpportunity, evaluateRequirement, type RequirementStatus } from "@proofbridge/core";
import { demoDataset } from "./index";

/**
 * Directive §3 compulsory demo + §10.5/§10.6. Asserts the EXACT requirement states the hero
 * workflow promises, so the UI can never silently drift from the spec.
 */
describe("hero demo fixture states", () => {
  const dataset = demoDataset();
  const opp = dataset.opportunities[0]!;

  const statusOf = (needle: string): RequirementStatus => {
    const req = dataset.requirements.find((r) => r.label.toLowerCase().includes(needle));
    if (!req) throw new Error(`no requirement matching ${needle}`);
    return evaluateRequirement(dataset, req).status;
  };

  it("TypeScript -> Supported", () => expect(statusOf("typescript")).toBe("supported"));
  it("PostgreSQL -> Supported", () => expect(statusOf("postgresql")).toBe("supported"));
  it("Deployment -> Uncertain", () => expect(statusOf("deployment")).toBe("uncertain"));
  it("Two case studies -> Not yet supported", () => expect(statusOf("case stud")).toBe("not-yet-supported"));
  it("Language -> Unknown", () => expect(statusOf("language")).toBe("unknown"));

  it("coverage counts match the five requirements", () => {
    const { coverage } = evaluateOpportunity(dataset, opp.id);
    expect(coverage).toEqual({ supported: 2, uncertain: 1, notYetSupported: 1, unknown: 1, notApplicable: 0, total: 5 });
  });

  it("§10.5: deleting the TypeScript claim drops it from Supported", () => {
    const d = demoDataset();
    const tsSkill = d.skills.find((s) => s.key === "typescript")!;
    const linked = new Set(d.claimSkillLinks.filter((l) => l.skillId === tsSkill.id).map((l) => l.claimId));
    const reduced = { ...d, claims: d.claims.filter((c) => !linked.has(c.id)) };
    const req = d.requirements.find((r) => r.label.toLowerCase().includes("typescript"))!;
    expect(evaluateRequirement(reduced, req).status).toBe("not-yet-supported");
  });

  it("§10.16: no obvious secret/credential token appears in fixtures", () => {
    const blob = JSON.stringify(demoDataset()).toLowerCase();
    // Realistic credential shapes, not bare substrings (e.g. "task-" must not trip "sk-").
    const patterns = [
      /sk-[a-z0-9]{8,}/, // OpenAI-style API key
      /\bpassword\b/,
      /\bsecret\b/,
      /\bapi[_-]?key\b/,
      /bearer\s+[a-z0-9._-]{10,}/,
      /-----begin [a-z ]*private key-----/,
    ];
    for (const p of patterns) {
      expect(p.test(blob)).toBe(false);
    }
  });
});
