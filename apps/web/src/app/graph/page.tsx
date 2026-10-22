"use client";

import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { WithData } from "@/components/WithData";
import { requirementPaths } from "@/lib/select";

export default function GraphPage() {
  return (
    <>
      <PageHeader
        title="Proof Graph"
        lede="The accessible list view of every persisted path from evidence to next step. The interactive 2D graph is built on these same relations in Phase 1."
      />
      <WithData>
        {(data) => (
          <ol className="space-y-3">
            {requirementPaths(data).map((p) => (
              <li key={p.requirement.id}>
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--fg-muted)] uppercase">Requirement</span>
                    <span className="font-medium">{p.requirement.text}</span>
                    <StatusBadge status={p.requirement.status} />
                    <span className="text-sm text-[var(--fg-muted)]">→ {p.opportunity?.title ?? "Unavailable"}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm" aria-label="Evidence paths">
                    {p.evidence.length === 0 && <li className="text-[var(--fg-muted)]">No linked evidence.</li>}
                    {p.evidence.map((e) => (
                      <li key={e.link.id}>
                        {e.source?.label ?? "source unavailable"} → {e.artifact?.title ?? "artifact unavailable"} →
                        “{e.claim.statement}”{p.skill && ` → ${p.skill.name}`}{" "}
                        <span className="text-[var(--fg-muted)]">({e.link.relationship}, {e.link.attribution})</span>
                      </li>
                    ))}
                  </ul>
                  {p.tasks.length > 0 && (
                    <p className="mt-2 text-sm">
                      Next step: {p.tasks.map((t) => t.title).join("; ")}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ol>
        )}
      </WithData>
    </>
  );
}
