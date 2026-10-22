import type { OpportunityRequirement, Skill } from "./schemas";

/** A requirement extracted from listing text, before it gets an id or a status. */
export type ParsedRequirement = Pick<OpportunityRequirement, "text" | "category" | "skillId" | "minCount">;

/** Listings longer than this are rejected rather than parsed (hostile-input bound). */
export const MAX_LISTING_CHARS = 20_000;
/** At most this many requirements are kept from one listing. */
export const MAX_REQUIREMENTS = 40;
const MAX_REQUIREMENT_CHARS = 300;

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const LANGUAGE_RE =
  /\blanguages?\b|\b(english|french|arabic|spanish|german|portuguese|italian|dutch|mandarin)\b|\bfluen(t|cy)\b|\bbilingual\b/i;
const PORTFOLIO_RE = /\b(case stud(y|ies)|portfolio|work samples?|samples? of (past )?work)\b/i;
const ELIGIBILITY_RE = /\b(eligib\w*|citizen\w*|visa|work permit|authori[sz]ed to work|residen(cy|t|ce))\b/i;
const EXPERIENCE_RE = /\b(experience|experienced|years?)\b/i;
const COUNT_RE = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b/i;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-insensitive match that also works for names like "C++" or "Node.js". */
const mentions = (text: string, term: string) =>
  term.trim() !== "" && new RegExp(`(^|[^\\w])${escapeRe(term.trim())}(?=$|[^\\w])`, "i").test(text);

/** The skill whose longest name/alias is mentioned in `text` (ties → lowest id). */
export function findSkill(text: string, skills: readonly Skill[]): Skill | undefined {
  let best: { skill: Skill; len: number } | undefined;
  for (const skill of [...skills].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    for (const term of [skill.name, ...skill.aliases]) {
      if (mentions(text, term) && (!best || term.length > best.len)) best = { skill, len: term.length };
    }
  }
  return best?.skill;
}

/** Splits listing text into candidate requirement lines (after a "Requirements" heading if any). */
export function splitRequirementLines(rawText: string): string[] {
  const text = rawText.slice(0, MAX_LISTING_CHARS);
  const heading = /\b(requirements|qualifications|what you(?:'|’)ll need|you have)\s*:/gi;
  let start = 0;
  for (let m = heading.exec(text); m; m = heading.exec(text)) start = m.index + m[0].length;
  return text
    .slice(start)
    .split(/[\n;]+/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•·▪◦]|\d{1,2}[.)])\s+/, "")
        .trim()
        .replace(/[.,]+$/, "")
        .trim(),
    )
    .filter((line) => line.length > 0 && line.length <= MAX_REQUIREMENT_CHARS);
}

/** Classifies one requirement line. Pure keyword rules — no model, same input → same output. */
export function classifyRequirement(line: string, skills: readonly Skill[]): ParsedRequirement {
  const text = line.charAt(0).toUpperCase() + line.slice(1);
  if (ELIGIBILITY_RE.test(text)) return { text, category: "eligibility" };
  if (PORTFOLIO_RE.test(text)) {
    const n = COUNT_RE.exec(text)?.[1]?.toLowerCase();
    const minCount = n ? (NUMBER_WORDS[n] ?? Number(n)) : 1;
    return { text, category: "portfolio", minCount: minCount > 0 ? minCount : 1 };
  }
  if (LANGUAGE_RE.test(text) && !findSkill(text, skills)) return { text, category: "language" };
  const skill = findSkill(text, skills);
  if (skill) return { text, category: EXPERIENCE_RE.test(text) ? "experience" : "skill", skillId: skill.id };
  return { text, category: EXPERIENCE_RE.test(text) ? "experience" : "other" };
}

/**
 * Deterministic requirement parser (no LLM): splits pasted listing text on lines/semicolons,
 * classifies each line with keyword rules and maps known skills by name or alias. Duplicate
 * lines (case-insensitive) are dropped. The text is treated as data only.
 */
export function parseRequirements(rawText: string, skills: readonly Skill[]): ParsedRequirement[] {
  const seen = new Set<string>();
  const out: ParsedRequirement[] = [];
  for (const line of splitRequirementLines(rawText)) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(classifyRequirement(line, skills));
    if (out.length >= MAX_REQUIREMENTS) break;
  }
  return out;
}
