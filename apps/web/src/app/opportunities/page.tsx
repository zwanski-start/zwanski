"use client";

import { useState, type FormEvent } from "react";
import {
  MAX_LISTING_CHARS,
  OpportunitySchema,
  REQUIREMENT_STATUS_LABEL,
  RequirementStatusSchema,
  addOpportunity,
  linkEvidence,
  reviewLink,
  setRequirementOverride,
  type Dataset,
  type Opportunity,
  type RequirementStatus,
} from "@proofbridge/core";
import { Button, Card, DemoBadge, ErrorText, PageHeader, StatusBadge, inputClass, labelClass } from "@/components/ui";
import { WithData } from "@/components/WithData";
import { useData } from "@/lib/data";
import { formatDate, requirementPaths, type RequirementPath } from "@/lib/select";
import { useAction } from "@/lib/useAction";

const ATTRIBUTION_LABEL = { parser: "suggested by matcher", human: "linked by you", "ai-suggestion": "AI suggestion" } as const;

function AddOpportunityForm() {
  const { apply } = useData();
  const { run, busy, error } = useAction();
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [kind, setKind] = useState<Opportunity["kind"]>("job");
  const [rawText, setRawText] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await run(() => apply((d, ctx) => addOpportunity(d, { title, organization, kind, rawText }, ctx).data));
    if (ok) {
      setTitle("");
      setOrganization("");
      setRawText("");
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
          onChange={(e) => setRawText(e.target.value)}
          required
          maxLength={MAX_LISTING_CHARS}
          placeholder={"Requirements:\n- TypeScript\n- Two case studies of past work"}
        />
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          Parsed in this browser by fixed keyword rules (no AI). The text is stored as data and never executed.
        </p>
      </div>
      <ErrorText error={error} />
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Parsing…" : "Parse requirements"}
      </Button>
    </form>
  );
}

function RequirementReview({ data, path }: { data: Dataset; path: RequirementPath }) {
  const { apply } = useData();
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
                  {REQUIREMENT_STATUS_LABEL[s]}
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
  return (
    <>
      <PageHeader
        title="Opportunity Lab"
        lede="Paste a listing; requirements are parsed and matched to your evidence deterministically, each with a reason and the claims behind it. You can reject a match, link evidence yourself or set a status. “Supported” means the vault holds evidence — not that anything is formally verified."
      />
      <WithData>
        {(data) => {
          const paths = requirementPaths(data, { includeRejected: true });
          return (
            <div className="space-y-4">
              <Card>
                <details>
                  <summary className="cursor-pointer font-medium">Import an opportunity</summary>
                  <div className="mt-3">
                    <AddOpportunityForm />
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
                    <table className="mt-4 w-full text-left text-sm">
                      <caption className="sr-only">Requirements for {opp.title}</caption>
                      <thead className="text-[var(--fg-muted)]">
                        <tr>
                          <th scope="col" className="py-1 pr-3 font-medium">Requirement</th>
                          <th scope="col" className="py-1 pr-3 font-medium">Status</th>
                          <th scope="col" className="py-1 font-medium">Why</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paths
                          .filter((p) => p.requirement.opportunityId === opp.id)
                          .map((p) => (
                            <tr key={p.requirement.id} className="border-t border-[var(--border)] align-top">
                              <th scope="row" className="py-2 pr-3 font-normal">{p.requirement.text}</th>
                              <td className="py-2 pr-3"><StatusBadge status={p.requirement.status} /></td>
                              <td className="py-2">
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
