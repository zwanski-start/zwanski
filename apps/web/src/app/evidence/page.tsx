"use client";

import { Card, DemoBadge, PageHeader } from "@/components/ui";
import { WithData } from "@/components/WithData";
import { claimsForArtifact, formatDate, skillsForClaim } from "@/lib/select";

const BASIS_LABEL = {
  "user-stated": "User-stated",
  "source-present": "Source-present",
  "issuer-verified": "Issuer-verified",
  unverified: "Unverified / uncertain",
} as const;

export default function EvidencePage() {
  return (
    <>
      <PageHeader
        title="Evidence Vault"
        lede="Sources, the artifacts captured from them and the claims each artifact supports. Import, edit and redact arrive in Phase 1."
      />
      <WithData>
        {(data) => (
          <div className="space-y-4">
            {data.artifacts.map((art) => {
              const source = data.sources.find((s) => s.id === art.sourceId);
              return (
                <Card key={art.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-serif text-xl">{art.title}</h2>
                    {art.demo && <DemoBadge />}
                  </div>
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">{art.summary}</p>
                  <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                    <dt className="text-[var(--fg-muted)]">Source</dt>
                    <dd>{source?.label ?? "Unavailable"}</dd>
                    <dt className="text-[var(--fg-muted)]">Captured</dt>
                    <dd>{source ? `${formatDate(source.capturedAt)} · ${source.captureMethod}` : "Unknown"}</dd>
                    <dt className="text-[var(--fg-muted)]">SHA-256</dt>
                    <dd className="font-mono text-xs break-all">
                      {art.sha256 ?? "No bytes"}{" "}
                      <span className="font-sans text-[var(--fg-muted)]">(integrity only, not authenticity)</span>
                    </dd>
                    <dt className="text-[var(--fg-muted)]">Visibility</dt>
                    <dd>{art.visibility}</dd>
                  </dl>
                  <h3 className="mt-4 text-sm font-semibold">Claims</h3>
                  <ul className="mt-1 space-y-2">
                    {claimsForArtifact(data, art.id).map((c) => (
                      <li key={c.id} className="rounded border border-[var(--border)] p-2 text-sm">
                        <p>{c.statement}</p>
                        <p className="mt-1 text-xs text-[var(--fg-muted)]">
                          {BASIS_LABEL[c.basis]} · review: {c.reviewState} · by {c.attribution}
                          {skillsForClaim(data, c.id).length > 0 &&
                            ` · skills: ${skillsForClaim(data, c.id)
                              .map((s) => s.name)
                              .join(", ")}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </WithData>
    </>
  );
}
