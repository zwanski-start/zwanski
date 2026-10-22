import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EN_DOSSIER_PDF_LABELS,
  addEvidence,
  buildDossier,
  renderDossierPdf,
  sequentialIds,
  updateArtifact,
} from "@proofbridge/core";
import { demoDataset } from "./index";

const OPP = "opp_junior-fullstack";
const NOW = "2026-10-22T12:00:00.000Z";
const ctx = () => ({ now: NOW, newId: sequentialIds("pdf") });

const latin1 = (bytes: Uint8Array) => String.fromCharCode(...bytes);

/** Structural check: every xref entry points at its object, startxref at the xref table. */
function checkStructure(pdf: string) {
  expect(pdf.startsWith("%PDF-1.7\n")).toBe(true);
  expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  const startxref = Number(/startxref\n(\d+)\n%%EOF\s*$/.exec(pdf)![1]);
  expect(pdf.slice(startxref, startxref + 4)).toBe("xref");
  const [, count] = /^xref\n0 (\d+)\n/.exec(pdf.slice(startxref))!;
  const entries = pdf.slice(startxref).split("\n").slice(3, 2 + Number(count));
  entries.forEach((e, i) => {
    const offset = Number(e.slice(0, 10));
    expect(pdf.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
  });
  for (const m of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
    const start = m.index! + m[0].length;
    expect(pdf.slice(start + Number(m[1]), start + Number(m[1]) + "\nendstream".length)).toBe("\nendstream");
  }
}

/** All text drawn with Tj, decoded from the hex WinAnsi strings. */
function drawnText(pdf: string): string {
  return [...pdf.matchAll(/<([0-9a-f]+)> Tj/g)]
    .map((m) => m[1]!.match(/../g)!.map((h) => String.fromCharCode(parseInt(h, 16))).join(""))
    .join("\n");
}

// The fixture deliberately holds no URLs; give the shared case study's source a web address
// (reserved example domain, RFC 2606) to exercise link annotations.
const linked = {
  ...demoDataset,
  sources: demoDataset.sources.map((s) => (s.id === "source_case-study-1" ? { ...s, uri: "https://example.com/demo/case-study" } : s)),
};

describe("PDF dossier export", () => {
  const dossier = buildDossier(linked, OPP, NOW);

  it("produces a structurally valid, deterministic PDF", () => {
    const a = renderDossierPdf(dossier);
    const b = renderDossierPdf(dossier);
    expect(a.bytes).toEqual(b.bytes);
    const pdf = latin1(a.bytes);
    checkStructure(pdf);
    expect(pdf).toContain(`/Count ${a.pageCount}`);
    expect(pdf).not.toMatch(/\/JavaScript|\/JS|\/EmbeddedFile|\/Launch/);
    expect(a.replacedChars).toBe(0);
  });

  it("is source-linked: every requirement, claim, source, date and hash from the JSON dossier is in it", () => {
    const pdf = latin1(renderDossierPdf(dossier).bytes);
    const text = drawnText(pdf);
    expect(text).toContain(dossier.opportunity.title);
    expect(text).toContain("DEMO / SYNTHETIC");
    for (const r of dossier.requirements) {
      expect(text).toContain(r.text);
      for (const e of r.evidence) {
        expect(text).toContain(e.claim);
        expect(text).toContain(e.artifact.source!);
        expect(text).toContain(e.artifact.capturedAt!.slice(0, 10));
        if (e.artifact.sha256) expect(text).toContain(e.artifact.sha256);
      }
    }
    // The shared case study's source has a web address → a clickable URI link annotation.
    expect(pdf).toMatch(/\/Subtype \/Link .*\/URI \(https:\/\/example\.com\/demo\/case-study\)/);
  });

  it("carries the same selective disclosure as the JSON dossier", () => {
    const secret = addEvidence(
      demoDataset,
      {
        title: "Private diary (synthetic)",
        kind: "write-up",
        content: "SECRET-CONTENT",
        captureMethod: "manual",
        sourceLabel: "Typed",
        claim: "Wrote a private case study (synthetic)",
        visibility: "private",
      },
      ctx(),
    );
    const d = buildDossier(secret.data, OPP, NOW);
    const text = drawnText(latin1(renderDossierPdf(d).bytes));
    expect(text).not.toContain("Private diary");
    expect(text).not.toContain("SECRET-CONTENT");
    expect(text).toContain(`${d.withheld} evidence item(s) withheld`);

    const partial = updateArtifact(demoDataset, "art_case-study-1", { redaction: "partial" }, ctx());
    const p = buildDossier(partial, OPP, NOW);
    expect(drawnText(latin1(renderDossierPdf(p).bytes))).not.toContain("Excerpt:");
  });

  it("uses translated labels and counts characters it cannot encode", () => {
    const fr = { ...EN_DOSSIER_PDF_LABELS, heading: "Dossier d’opportunité", page: "Page {n} sur {total}" };
    const pdf = renderDossierPdf({ ...dossier, opportunity: { ...dossier.opportunity, title: "مطور — développeur" } }, fr, "fr");
    const s = latin1(pdf.bytes);
    checkStructure(s);
    const text = drawnText(s);
    expect(text).toContain("DOSSIER D’OPPORTUNITÉ".replace("’", "\x92"));
    expect(text).toContain("Page 1 sur");
    expect(text).toContain("???? \x97 d\xe9veloppeur");
    expect(pdf.replacedChars).toBe(4);
    expect(s).toContain("/Lang (fr)");
  });

  it("long dossiers paginate", () => {
    const many = { ...dossier, requirements: Array.from({ length: 60 }, (_, i) => ({ ...dossier.requirements[0]!, text: `Requirement ${i}` })) };
    const pdf = renderDossierPdf(many);
    expect(pdf.pageCount).toBeGreaterThan(3);
    checkStructure(latin1(pdf.bytes));
  });

  const qpdf = spawnSync("qpdf", ["--version"]).status === 0;
  it.skipIf(!qpdf)("passes qpdf --check (when qpdf is installed)", () => {
    const dir = mkdtempSync(join(tmpdir(), "pb-pdf-"));
    const file = join(dir, "dossier.pdf");
    writeFileSync(file, renderDossierPdf(dossier).bytes);
    const res = spawnSync("qpdf", ["--check", file], { encoding: "utf8" });
    expect(res.stdout + res.stderr).toContain("No syntax or stream encoding errors");
    expect(res.status).toBe(0);
  });
});
