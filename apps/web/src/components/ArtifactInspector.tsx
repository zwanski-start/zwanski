"use client";

import {
  RedactionSchema,
  VisibilitySchema,
  deleteArtifact,
  deleteClaim,
  historyForArtifact,
  updateArtifact,
  type Dataset,
  type EvidenceArtifact,
  type Redaction,
} from "@proofbridge/core";
import { ConfirmButton, DemoBadge, ErrorText, StatusBadge, inputClass, labelClass } from "@/components/ui";
import { useData } from "@/lib/data";
import { formatDateTime } from "@/lib/files";
import { BASIS_LABEL, coverageForArtifact, skillsForClaim } from "@/lib/select";
import { useAction } from "@/lib/useAction";

const REDACTION_HELP: Record<Redaction, string> = {
  none: "Shareable in a dossier if visibility allows, including an excerpt of its text.",
  partial: "Title and claims may be shared; its text never leaves the vault.",
  redacted: "Never included in any dossier or share.",
};

/** Inspector for one evidence node: provenance, dates, coverage, redaction and history. */
export function ArtifactInspector({ data, artifact, onDeleted }: { data: Dataset; artifact: EvidenceArtifact; onDeleted: () => void }) {
  const { apply } = useData();
  const { run, busy, error } = useAction();
  const source = data.sources.find((s) => s.id === artifact.sourceId);
  const claims = data.claims.filter((c) => c.artifactId === artifact.id);
  const coverage = coverageForArtifact(data, artifact.id);
  const history = historyForArtifact(data, artifact.id);

  const patch = (p: Parameters<typeof updateArtifact>[2]) =>
    void run(() => apply((d, ctx) => updateArtifact(d, artifact.id, p, ctx)));

  return (
    <div aria-label={`Inspector: ${artifact.title}`} role="region" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl">{artifact.title}</h2>
        {artifact.demo && <DemoBadge />}
      </div>

      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-[var(--fg-muted)]">Source</dt>
        <dd>{source?.label ?? "Unavailable"}</dd>
        {source?.uri && (
          <>
            <dt className="text-[var(--fg-muted)]">Source address</dt>
            {/* Shown as text, not a link: it came from an untrusted page. */}
            <dd className="font-mono text-xs break-all">{source.uri}</dd>
          </>
        )}
        <dt className="text-[var(--fg-muted)]">Captured</dt>
        <dd>{source ? `${formatDateTime(source.capturedAt)} · ${source.captureMethod}` : "Unknown"}</dd>
        <dt className="text-[var(--fg-muted)]">Added</dt>
        <dd>{formatDateTime(artifact.createdAt)}</dd>
        <dt className="text-[var(--fg-muted)]">Last changed</dt>
        <dd>{formatDateTime(artifact.updatedAt)}</dd>
        <dt className="text-[var(--fg-muted)]">Kind</dt>
        <dd>
          {artifact.kind} · {artifact.mediaType}
        </dd>
        <dt className="text-[var(--fg-muted)]">SHA-256</dt>
        <dd className="font-mono text-xs break-all">
          {artifact.sha256 ?? "No bytes"}{" "}
          <span className="font-sans text-[var(--fg-muted)]">(integrity only, not authenticity)</span>
        </dd>
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="insp-visibility" className={labelClass}>
            Visibility
          </label>
          <select
            id="insp-visibility"
            className={inputClass}
            value={artifact.visibility}
            disabled={busy}
            onChange={(e) => patch({ visibility: e.target.value as EvidenceArtifact["visibility"] })}
          >
            {VisibilitySchema.options.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="insp-redaction" className={labelClass}>
            Redaction
          </label>
          <select
            id="insp-redaction"
            className={inputClass}
            value={artifact.redaction}
            disabled={busy}
            onChange={(e) => patch({ redaction: e.target.value as Redaction })}
          >
            {RedactionSchema.options.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-[var(--fg-muted)] sm:col-span-2">
          {REDACTION_HELP[artifact.redaction]} Visibility applies to this evidence’s claims and links too.
        </p>
      </div>

      {artifact.content !== undefined && (
        <section>
          <h3 className="text-sm font-semibold">Captured text</h3>
          {artifact.redaction === "none" ? (
            <pre className="mt-1 max-h-48 overflow-auto rounded border border-[var(--border)] p-2 text-xs whitespace-pre-wrap">
              {artifact.content}
            </pre>
          ) : (
            <p className="mt-1 text-sm text-[var(--fg-muted)]">Hidden ({artifact.redaction}).</p>
          )}
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold">Coverage</h3>
        {coverage.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--fg-muted)]">Not linked to any requirement yet.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm" aria-label="Requirements this evidence covers">
            {coverage.map(({ requirement, opportunity }) => (
              <li key={requirement.id} className="flex flex-wrap items-center gap-2">
                <StatusBadge status={requirement.status} />
                {requirement.text}
                <span className="text-[var(--fg-muted)]">· {opportunity?.title ?? "Unavailable"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold">Claims</h3>
        <ul className="mt-1 space-y-2">
          {claims.map((c) => (
            <li key={c.id} className="rounded border border-[var(--border)] p-2 text-sm">
              <p>{c.statement}</p>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                {BASIS_LABEL[c.basis]} · review: {c.reviewState} · by {c.attribution} · {c.visibility}
                {skillsForClaim(data, c.id).length > 0 &&
                  ` · skills: ${skillsForClaim(data, c.id)
                    .map((s) => s.name)
                    .join(", ")}`}
              </p>
              <div className="mt-2">
                <ConfirmButton
                  label="Remove claim"
                  confirmLabel="Confirm remove"
                  aria-label={`Remove claim: ${c.statement}`}
                  disabled={busy}
                  onConfirm={() => void run(() => apply((d, ctx) => deleteClaim(d, c.id, ctx)))}
                />
              </div>
            </li>
          ))}
          {claims.length === 0 && <li className="text-sm text-[var(--fg-muted)]">No claims left on this artifact.</li>}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Change history</h3>
        {history.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {artifact.demo ? "Seeded from the demo fixture; no changes since." : "No changes recorded."}
          </p>
        ) : (
          <ol className="mt-1 space-y-1 text-sm" aria-label="Change history">
            {history.map((h) => (
              <li key={h.id}>
                <span className="text-[var(--fg-muted)]">{formatDateTime(h.at)}</span> — {h.summary}
              </li>
            ))}
          </ol>
        )}
      </section>

      <ErrorText error={error} />
      <ConfirmButton
        label="Delete artifact"
        confirmLabel="Confirm delete"
        disabled={busy}
        onConfirm={() =>
          void run(async () => {
            await apply((d, ctx) => deleteArtifact(d, artifact.id, ctx));
            onDeleted();
          })
        }
      />
    </div>
  );
}
