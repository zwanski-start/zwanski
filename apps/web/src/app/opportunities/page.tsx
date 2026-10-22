"use client";

import { Card, DemoBadge, PageHeader, StatusBadge } from "@/components/ui";
import { WithData } from "@/components/WithData";
import { formatDate, requirementPaths } from "@/lib/select";

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeader
        title="Opportunity Lab"
        lede="Each requirement shows its evidence status with a reason and the claims behind it. Pasting new listings and the deterministic matcher arrive in Phase 1."
      />
      <WithData>
        {(data) => {
          const paths = requirementPaths(data);
          return (
            <div className="space-y-4">
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
                        .map(({ requirement: r, evidence }) => (
                          <tr key={r.id} className="border-t border-[var(--border)] align-top">
                            <th scope="row" className="py-2 pr-3 font-normal">{r.text}</th>
                            <td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
                            <td className="py-2">
                              {r.rationale}
                              {evidence.length > 0 && (
                                <ul className="mt-1 text-xs text-[var(--fg-muted)]">
                                  {evidence.map((e) => (
                                    <li key={e.link.id}>
                                      ↳ {e.claim.statement} ({e.artifact?.title ?? "artifact unavailable"})
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </Card>
              ))}
            </div>
          );
        }}
      </WithData>
    </>
  );
}
