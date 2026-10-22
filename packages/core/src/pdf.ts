import type { Dossier } from "./dossier";
import type { RequirementStatus } from "./schemas";

/**
 * Dependency-free PDF 1.7 rendering of a `proofbridge.dossier` (directive §2 Share Studio).
 *
 * The PDF is generated from the same `Dossier` object as the JSON export, so it carries exactly
 * the same selective-disclosure decisions. Every evidence item names its source, capture date and
 * SHA-256; http(s) sources become clickable link annotations ("source-linked").
 *
 * Limits (documented in STATUS.md): uses the standard Helvetica fonts with WinAnsi encoding, so
 * characters outside Western European scripts (e.g. Arabic) are replaced with "?" and counted in
 * `replacedChars`; the JSON dossier stays lossless. No compression, no scripts, no embedded files.
 */

export interface DossierPdfLabels {
  heading: string;
  generated: string;
  opportunity: string;
  source: string;
  retrieved: string;
  counts: string;
  requirements: string;
  status: Record<RequirementStatus, string>;
  setManually: string;
  suggestedByAi: string;
  noEvidence: string;
  artifact: string;
  captured: string;
  sha256: string;
  excerpt: string;
  /** `{n}` is replaced by the count. */
  withheld: string;
  /** `{n}` and `{total}` are replaced. */
  page: string;
}

export const EN_DOSSIER_PDF_LABELS: DossierPdfLabels = {
  heading: "Opportunity dossier",
  generated: "Generated",
  opportunity: "Opportunity",
  source: "Source",
  retrieved: "retrieved",
  counts: "Requirement status",
  requirements: "Requirements and evidence",
  status: {
    supported: "Supported",
    uncertain: "Uncertain",
    "not-yet-supported": "Not yet supported",
    "not-applicable": "Not applicable",
    unknown: "Unknown",
  },
  setManually: "status set manually",
  suggestedByAi: "requirement suggested by AI, accepted by the owner",
  noEvidence: "No shared evidence.",
  artifact: "Artifact",
  captured: "captured",
  sha256: "SHA-256",
  excerpt: "Excerpt",
  withheld: "{n} evidence item(s) withheld (private or redacted).",
  page: "Page {n} of {total}",
};

// --- WinAnsi encoding + Helvetica metrics -----------------------------------------------------

const WIN_ANSI_EXTRA: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89,
  "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95,
  "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};
const ASCII_FALLBACK: Record<string, string> = { "→": "->", "←": "<-", "↳": "->", "·": "·", " ": " " };

/** Helvetica advance widths (1/1000 em) for ASCII 32..126 (Adobe AFM). */
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];

interface Encoded {
  codes: number[];
  replaced: number;
}

function encode(text: string): Encoded {
  const codes: number[] = [];
  let replaced = 0;
  for (const raw of text.normalize("NFC")) {
    const ch = ASCII_FALLBACK[raw] ?? raw;
    for (const c of ch) {
      const cp = c.codePointAt(0)!;
      if (cp >= 32 && cp <= 126) codes.push(cp);
      else if (cp >= 0xa0 && cp <= 0xff) codes.push(cp);
      else if (WIN_ANSI_EXTRA[c] !== undefined) codes.push(WIN_ANSI_EXTRA[c]);
      else if (cp === 9 || cp === 10 || cp === 13) codes.push(32);
      else {
        codes.push(63); // "?"
        replaced += 1;
      }
    }
  }
  return { codes, replaced };
}

const charWidth = (code: number, bold: boolean) =>
  (code >= 32 && code <= 126 ? HELVETICA[code - 32]! : 556) * (bold ? 1.06 : 1);
const textWidth = (codes: number[], size: number, bold: boolean) =>
  codes.reduce((w, c) => w + charWidth(c, bold), 0) * (size / 1000);

/** Greedy word wrap on encoded text; over-long words are hard-broken. */
function wrap(codes: number[], size: number, bold: boolean, maxWidth: number): number[][] {
  const lines: number[][] = [];
  let line: number[] = [];
  let word: number[] = [];
  const fits = (c: number[]) => textWidth(c, size, bold) <= maxWidth;
  const flushWord = () => {
    if (word.length === 0) return;
    const candidate = line.length ? [...line, 32, ...word] : word;
    if (fits(candidate)) line = candidate;
    else {
      if (line.length) lines.push(line);
      line = [];
      let rest = word;
      while (!fits(rest)) {
        let n = rest.length - 1;
        while (n > 1 && !fits(rest.slice(0, n))) n -= 1;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    word = [];
  };
  for (const c of codes) {
    if (c === 32) flushWord();
    else word.push(c);
  }
  flushWord();
  if (line.length || lines.length === 0) lines.push(line);
  return lines;
}

const hex = (codes: number[]) => `<${codes.map((c) => c.toString(16).padStart(2, "0")).join("")}>`;

/** PDF text string as UTF-16BE hex (for metadata, which may hold any script). */
function utf16Hex(text: string): string {
  let out = "<FEFF";
  for (let i = 0; i < text.length; i++) out += text.charCodeAt(i).toString(16).padStart(4, "0");
  return `${out}>`;
}

const pdfDate = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `D:${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
};

const literal = (s: string) => `(${s.replace(/[\\()]/g, (m) => `\\${m}`)})`;

// --- Layout ------------------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const BOTTOM = 64;

interface Page {
  ops: string[];
  links: { rect: [number, number, number, number]; uri: string }[];
}

class Layout {
  pages: Page[] = [];
  y = 0;
  replaced = 0;

  constructor() {
    this.newPage();
  }

  newPage() {
    this.pages.push({ ops: [], links: [] });
    this.y = PAGE_H - MARGIN;
  }

  get page() {
    return this.pages[this.pages.length - 1]!;
  }

  gap(h: number) {
    this.y -= h;
  }

  text(
    text: string,
    opts: { size?: number; bold?: boolean; indent?: number; gray?: boolean; uri?: string | null; after?: number } = {},
  ) {
    const size = opts.size ?? 10;
    const bold = opts.bold ?? false;
    const x = MARGIN + (opts.indent ?? 0);
    const leading = size * 1.35;
    const enc = encode(text);
    this.replaced += enc.replaced;
    for (const line of wrap(enc.codes, size, bold, PAGE_W - MARGIN - x)) {
      if (this.y - leading < BOTTOM) this.newPage();
      this.y -= leading;
      const color = opts.uri ? "0.06 0.43 0.43 rg" : opts.gray ? "0.36 0.38 0.41 rg" : "0.12 0.14 0.15 rg";
      this.page.ops.push(`${color} BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${this.y.toFixed(2)} Td ${hex(line)} Tj ET`);
      if (opts.uri) {
        const w = textWidth(line, size, bold);
        this.page.links.push({ rect: [x, this.y - 2, x + w, this.y + size], uri: opts.uri });
        this.page.ops.push(`0.06 0.43 0.43 RG 0.5 w ${x.toFixed(2)} ${(this.y - 1.5).toFixed(2)} m ${(x + w).toFixed(2)} ${(this.y - 1.5).toFixed(2)} l S`);
      }
    }
    this.y -= opts.after ?? 0;
  }

  rule() {
    if (this.y - 8 < BOTTOM) this.newPage();
    this.y -= 6;
    this.page.ops.push(`0.87 0.84 0.78 RG 0.75 w ${MARGIN} ${this.y.toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${this.y.toFixed(2)} l S`);
    this.y -= 6;
  }
}

const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

const shortDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "?");

export interface DossierPdf {
  bytes: Uint8Array<ArrayBuffer>;
  pageCount: number;
  /** Characters that WinAnsi cannot represent and were replaced with "?". */
  replacedChars: number;
}

/** Renders a dossier to PDF bytes. Pure and deterministic for a given dossier + labels. */
export function renderDossierPdf(dossier: Dossier, labels: DossierPdfLabels = EN_DOSSIER_PDF_LABELS, lang = "en"): DossierPdf {
  const L = new Layout();
  const opp = dossier.opportunity;

  L.text(labels.heading.toUpperCase(), { size: 9, bold: true, gray: true });
  L.text(opp.title, { size: 18, bold: true, after: 2 });
  L.text(`${opp.organization} · ${opp.kind}`, { size: 10, gray: true });
  L.text(`${labels.source}: ${opp.source} · ${labels.retrieved} ${shortDate(opp.retrievedAt)}`, { size: 9, gray: true });
  if (opp.sourceUri) L.text(opp.sourceUri, { size: 9, uri: opp.sourceUri });
  L.text(`${labels.generated}: ${dossier.generatedAt.replace("T", " ").slice(0, 16)} UTC`, { size: 9, gray: true, after: 4 });
  L.text(dossier.notice, { size: 9, bold: dossier.demo, after: 2 });
  L.rule();

  L.text(labels.counts, { size: 11, bold: true });
  L.text(
    (Object.keys(labels.status) as RequirementStatus[]).map((s) => `${labels.status[s]}: ${dossier.counts[s]}`).join("   ·   "),
    { size: 10, after: 2 },
  );
  L.rule();

  L.text(labels.requirements, { size: 11, bold: true, after: 2 });
  dossier.requirements.forEach((r, i) => {
    L.text(`${i + 1}. ${r.text}`, { size: 11, bold: true, after: 0 });
    const flags = [labels.status[r.status], r.setManually ? labels.setManually : null, r.suggestedByAi ? labels.suggestedByAi : null]
      .filter(Boolean)
      .join(" · ");
    L.text(`[${flags}]`, { size: 9, indent: 14 });
    if (r.rationale) L.text(r.rationale, { size: 9, indent: 14, gray: true });
    if (r.evidence.length === 0) L.text(labels.noEvidence, { size: 9, indent: 14, gray: true });
    r.evidence.forEach((e, j) => {
      L.text(`E${i + 1}.${j + 1}  ${e.claim}`, { size: 10, indent: 14 });
      L.text(`${labels.artifact}: ${e.artifact.title} (${e.artifact.kind}) · ${e.basis} · ${e.relationship}, ${e.attribution}`, {
        size: 8.5,
        indent: 34,
        gray: true,
      });
      L.text(`${labels.source}: ${e.artifact.source ?? "?"} · ${labels.captured} ${shortDate(e.artifact.capturedAt)}`, {
        size: 8.5,
        indent: 34,
        gray: true,
      });
      if (e.artifact.sourceUri) L.text(e.artifact.sourceUri, { size: 8.5, indent: 34, uri: e.artifact.sourceUri });
      if (e.artifact.sha256) L.text(`${labels.sha256}: ${e.artifact.sha256}`, { size: 7.5, indent: 34, gray: true });
      if (e.artifact.excerpt) L.text(`${labels.excerpt}: “${e.artifact.excerpt}”`, { size: 8.5, indent: 34, gray: true });
    });
    L.gap(6);
  });
  L.rule();
  L.text(fill(labels.withheld, { n: dossier.withheld }), { size: 9, gray: true });

  // --- Serialize -------------------------------------------------------------------------------
  const total = L.pages.length;
  const objects: string[] = [];
  const add = (body: string) => void objects.push(body);
  // 1 catalog, 2 pages, 3 F1, 4 F2, 5 info, then per page: page, content, annots…
  add(`<< /Type /Catalog /Pages 2 0 R /Lang ${literal(lang)} /ViewerPreferences << /DisplayDocTitle true >> >>`);
  add("PAGES");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  add(
    `<< /Title ${utf16Hex(`${labels.heading}: ${opp.title}`)} /Producer (ProofBridge OS) /Creator (ProofBridge Share Studio) /CreationDate (${pdfDate(dossier.generatedAt)}) >>`,
  );
  const pageRefs: number[] = [];
  L.pages.forEach((page, i) => {
    const footer = encode(fill(labels.page, { n: i + 1, total }));
    const ops = [
      ...page.ops,
      `0.36 0.38 0.41 rg BT /F1 8 Tf ${MARGIN} 36 Td ${hex(footer.codes)} Tj ET`,
      `0.36 0.38 0.41 rg BT /F1 8 Tf ${(PAGE_W - MARGIN - textWidth(encode("ProofBridge OS").codes, 8, false)).toFixed(2)} 36 Td ${hex(encode("ProofBridge OS").codes)} Tj ET`,
    ].join("\n");
    const pageNum = objects.length + 1;
    const contentNum = pageNum + 1;
    const annotNums = page.links.map((_, k) => contentNum + 1 + k);
    pageRefs.push(pageNum);
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R${
        annotNums.length ? ` /Annots [${annotNums.map((n) => `${n} 0 R`).join(" ")}]` : ""
      } >>`,
    );
    add(`<< /Length ${ops.length} >>\nstream\n${ops}\nendstream`);
    for (const link of page.links) {
      add(
        `<< /Type /Annot /Subtype /Link /Rect [${link.rect.map((n) => n.toFixed(2)).join(" ")}] /Border [0 0 0] /A << /S /URI /URI ${literal(link.uri.replace(/[^\x21-\x7e]/g, encodeURIComponent))} >> >>`,
      );
    }
  });
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((n) => `${n} 0 R`).join(" ")}] /Count ${total} >>`;

  // Everything above is ASCII except the binary-marker comment, so string index == byte offset.
  let out = "%PDF-1.7\n%âãÏÓ\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i);
  return { bytes, pageCount: total, replacedChars: L.replaced };
}
