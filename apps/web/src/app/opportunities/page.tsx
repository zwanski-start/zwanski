"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { buildRequirementRequest, suggestRequirements, type SuggestionResult } from "@proofbridge/ai";
import {
  MAX_LISTING_CHARS,
  OpportunitySchema,
  RequirementStatusSchema,
  addOpportunity,
  linkEvidence,
  reviewLink,
  setRequirementOverride,
  type Dataset,
  type Opportunity,
  type RequirementStatus,
  type Skill,
} from "@proofbridge/core";
import { Button, Card, DemoBadge, ErrorText, PageHeader, StatusBadge, inputClass, labelClass } from "@/components/ui";
import { WithData } from "@/components/WithData";
import { useData } from "@/lib/data";
import { useAiSettings, useEgressLog } from "@/lib/ai";
import { useI18n } from "@/lib/i18n";
import { requirementPaths, type RequirementPath } from "@/lib/select";
import { useAction } from "@/lib/useAction";

const ATTRIBUTION_LABEL = { parser: "suggested by matcher", human: "linked by you", "ai-suggestion": "AI suggestion" } as const;

/**
 * Optional, consent-gated AI suggestions for extra requirement lines. Off by default; when on,
 * the user previews the exact request and sends it explicitly. Any failure falls back to the
 * deterministic parser. Accepted suggestions are classified and matched deterministically.
 */
function AiSuggestions({
  rawText,
  skills,
  accepted,
  setAccepted,
}: {
  rawText: string;
  skills: readonly Skill[];
  accepted: string[];
  setAccepted: (lines: string[]) => void;
}) {
  const { t } = useI18n();
  const [settings] = useAiSettings();
  const { append } = useEgressLog();
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ text: string; value: SuggestionResult } | null>(null);
  const on = settings.enabled && settings.consent !== null;

  if (!on) {
    return (
      <p className="text-xs text-[var(--fg-muted)]" data-testid="ai-off">
        {t("ai.off")}{" "}
        <Link href="/settings" className="underline">
          {t("nav.settings")}
        </Link>
      </p>
    );
  }

  const request = buildRequirementRequest(settings, rawText);
  // Suggestions belong to the text they were made for; editing the listing discards them.
  const current = result && result.text === rawText ? result.value : null;

  async function send() {
    setSending(true);
    setAccepted([]);
    const value = await suggestRequirements(settings, rawText, skills, {
      fetch: (url, init) => fetch(url, init),
      now: () => new Date().toISOString(),
      onEgress: append,
    });
    setResult({ text: rawText, value });
    setPreviewing(false);
    setSending(false);
  }

  return (
    <section aria-label={t("ai.panel")} className="space-y-2 rounded border border-dashed border-[var(--border)] p-2">
      <h3 className="text-sm font-medium">{t("ai.panel")}</h3>
      {!previewing ? (
        <Button disabled={!rawText.trim() || sending} onClick={() => setPreviewing(true)}>
          {t("ai.preview")}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs">{t("ai.previewHelp", { url: request.url })}</p>
          <pre
            data-testid="ai-request-preview"
            dir="ltr"
            className="max-h-48 overflow-auto rounded bg-[var(--bg)] p-2 text-xs whitespace-pre-wrap"
          >
            {JSON.stringify(request.body, null, 2)}
          </pre>
          <div className="flex gap-2">
            <Button variant="primary" disabled={sending} onClick={() => void send()}>
              {sending ? t("ai.sending") : t("ai.send")}
            </Button>
            <Button disabled={sending} onClick={() => setPreviewing(false)}>
              {t("ai.cancel")}
            </Button>
          </div>
        </div>
      )}
      {current?.mode === "deterministic" && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
          {t("ai.fallback", { reason: current.reason })}
        </p>
      )}
      {current?.mode === "ai" && current.suggestions.length === 0 && (
        <p role="status" className="text-xs">
          {t("ai.none")}
        </p>
      )}
      {current?.mode === "ai" && current.suggestions.length > 0 && (
        <fieldset>
          <legend className="text-xs font-medium">{t("ai.suggestions")}</legend>
          <ul className="mt-1 space-y-1">
            {current.suggestions.map((s) => (
              <li key={s.text}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={accepted.includes(s.text)}
                    onChange={(e) =>
                      setAccepted(e.target.checked ? [...accepted, s.text] : accepted.filter((a) => a !== s.text))
                    }
                  />
                  <span>
                    {s.text} <span className="text-xs text-[var(--fg-muted)]">({s.category})</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </section>
  );
}

function AddOpportunityForm({ skills }: { skills: readonly Skill[] }) {
  const { apply } = useData();
  const { run, busy, error } = useAction();
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [kind, setKind] = useState<Opportunity["kind"]>("job");
  const [rawText, setRawText] = useState("");
  const [accepted, setAccepted] = useState<string[]>([]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await run(() =>
      apply((d, ctx) => addOpportunity(d, { title, organization, kind, rawText, acceptedSuggestions: accepted }, ctx).data),
    );
    if (ok) {
      setTitle("");
      setOrganization("");
      setRawText("");
      setAccepted([]);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3" aria-label="Import an opportunity">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="opp-title" className={labelClass}>
            Title
          </label>
          <input id="opp-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </div>
        <div>
          <label htmlFor="opp-kind" className={labelClass}>
            Kind
          </label>
          <select id="opp-kind" className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as Opportunity["kind"])}>
            {OpportunitySchema.shape.kind.options.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="opp-org" className={labelClass}>
          Organization <span className="font-normal text-[var(--fg-muted)]">(optional)</span>
        </label>
        <input id="opp-org" className={inputClass} value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={200} />
      </div>
      <div>
        <label htmlFor="opp-text" className={labelClass}>
          Listing text
        </label>
        <textarea
          id="opp-text"
          className={inputClass}
          rows={5}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setAccepted([]);
          }}
          required
          maxLength={MAX_LISTING_CHARS}
          placeholder={"Requirements:\n- TypeScript\n- Two case studies of past work"}
        />
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          Parsed in this browser by fixed keyword rules (no AI). The text is stored as data and never executed.
        </p>
      </div>
      <AiSuggestions rawText={rawText} skills={skills} accepted={accepted} setAccepted={setAccepted} />
      <ErrorText error={error} />
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Parsing…" : "Parse requirements"}
      </Button>
    </form>
  );
}

function RequirementReview({ data, path }: { data: Dataset; path: RequirementPath }) {
  const { apply } = useData();
  const i18n = useI18n();
  const { run, busy, error } = useAction();
  const r = path.requirement;
  const [status, setStatus] = useState<RequirementStatus | "">(r.override?.status ?? "");
  const [note, setNote] = useState(r.override?.note ?? "");
  const linked = new Set(path.evidence.map((e) => e.claim.id));
  const linkable = data.claims.filter((c) => !linked.has(c.id));
  const [claimId, setClaimId] = useState("");

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-[var(--accent)] underline">Review “{r.text}”</summary>
      <div className="mt-2 space-y-3 rounded border border-[var(--border)] p-2">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={`ov-${r.id}`} className="block text-xs">
              Status decision
            </label>
            <select
              id={`ov-${r.id}`}
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as RequirementStatus | "")}
            >
              <option value="">Let the matcher decide</option>
              {RequirementStatusSchema.options.map((s) => (
                <option key={s} value={s}>
                  {i18n.status(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-40 flex-1">
            <label htmlFor={`ovn-${r.id}`} className="block text-xs">
              Note
            </label>
            <input id={`ovn-${r.id}`} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </div>
          <Button
            disabled={busy}
            onClick={() => void run(() => apply((d, ctx) => setRequirementOverride(d, r.id, status || null, note, ctx)))}
          >
            Save decision
          </Button>
        </div>
        {linkable.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1">
              <label htmlFor={`link-${r.id}`} className="block text-xs">
                Link a claim as evidence
              </label>
              <select id={`link-${r.id}`} className={inputClass} value={claimId} onChange={(e) => setClaimId(e.target.value)}>
                <option value="">Choose a claim…</option>
                {linkable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.statement}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={busy || !claimId}
              onClick={() =>
                void run(async () => {
                  await apply((d, ctx) => linkEvidence(d, r.id, claimId, ctx));
                  setClaimId("");
                })
              }
            >
              Link
            </Button>
          </div>
        )}
        <ErrorText error={error} />
      </div>
    </details>
  );
}

function EvidenceList({ path }: { path: RequirementPath }) {
  const { apply } = useData();
  const { run, busy, error } = useAction();
  if (path.evidence.length === 0) return null;
  return (
    <>
      <ul className="mt-1 space-y-1 text-xs text-[var(--fg-muted)]">
        {path.evidence.map(({ link, claim, artifact }) => {
          const rejected = link.reviewState === "rejected";
          return (
            <li key={link.id} className="flex flex-wrap items-center gap-2">
              <span className={rejected ? "line-through" : ""}>
                ↳ {claim.statement} ({artifact?.title ?? "artifact unavailable"})
              </span>
              <span>
                · {ATTRIBUTION_LABEL[link.attribution]}
                {rejected ? " · rejected" : link.reviewState === "approved" ? " · approved" : ""}
              </span>
              <button
                type="button"
                disabled={busy}
                className="underline"
                aria-label={`${rejected ? "Restore" : "Reject"} evidence: ${claim.statement}`}
                onClick={() => void run(() => apply((d, ctx) => reviewLink(d, link.id, rejected ? "approved" : "rejected", ctx)))}
              >
                {rejected ? "Restore" : "Reject"}
              </button>
            </li>
          );
        })}
      </ul>
      <ErrorText error={error} />
    </>
  );
}

export default function OpportunitiesPage() {
  const { t, formatDate } = useI18n();
  return (
    <>
      <PageHeader title={t("opportunities.title")} lede={t("opportunities.lede")} />
      <WithData>
        {(data) => {
          const paths = requirementPaths(data, { includeRejected: true });
          return (
            <div className="space-y-4">
              <Card>
                <details>
                  <summary className="cursor-pointer font-medium">{t("opportunities.import")}</summary>
                  <div className="mt-3">
                    <AddOpportunityForm skills={data.skills} />
                  </div>
                </details>
              </Card>
              {data.opportunities.map((opp) => (
                <Card key={opp.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-serif text-xl">{opp.title}</h2>
                    {opp.demo && <DemoBadge />}
                  </div>
                  <p className="text-sm text-[var(--fg-muted)]">
                    {opp.organization} · {opp.kind} · location: {opp.location} · remote: {opp.remote} · retrieved{" "}
                    {formatDate(opp.retrievedAt)} from {opp.sourceLabel}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="mt-4 w-full text-start text-sm">
                      <caption className="sr-only">Requirements for {opp.title}</caption>
                      <thead className="text-[var(--fg-muted)]">
                        <tr>
                          <th scope="col" className="py-1 pe-3 font-medium">{t("opportunities.col.requirement")}</th>
                          <th scope="col" className="py-1 pe-3 font-medium">{t("opportunities.col.status")}</th>
                          <th scope="col" className="py-1 font-medium">{t("opportunities.col.why")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paths
                          .filter((p) => p.requirement.opportunityId === opp.id)
                          .map((p) => (
                            <tr key={p.requirement.id} className="border-t border-[var(--border)] align-top">
                              <th scope="row" className="py-2 pe-3 font-normal">{p.requirement.text}</th>
                              <td className="py-2 pe-3"><StatusBadge status={p.requirement.status} /></td>
                              <td className="py-2">
                                {p.requirement.origin === "ai-suggestion" && (
                                  <span className="me-1 inline-block rounded border border-dashed border-[var(--fg-muted)] px-1 text-xs text-[var(--fg-muted)]">
                                    {t("opportunities.aiOrigin")}
                                  </span>
                                )}
                                {p.requirement.rationale}
                                <EvidenceList path={p} />
                                <RequirementReview key={p.requirement.override?.at ?? "auto"} data={data} path={p} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          );
        }}
      </WithData>
    </>
  );
}
