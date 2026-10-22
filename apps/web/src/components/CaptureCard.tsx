"use client";

import { useState, type FormEvent } from "react";
import {
  EvidenceArtifactSchema,
  OpportunitySchema,
  addEvidence,
  addOpportunity,
  captureHost,
  captureSourceLabel,
  type Capture,
  type CaptureKind,
  type EvidenceArtifact,
  type Opportunity,
  type Skill,
} from "@proofbridge/core";
import { Button, ErrorText, inputClass, labelClass } from "@/components/ui";
import { useData } from "@/lib/data";
import { formatDateTime, sha256Hex, utf8 } from "@/lib/files";
import { useAction } from "@/lib/useAction";

/**
 * One captured page, shown as inert text for review. Nothing reaches the vault until the user
 * chooses how to save it and presses the import button; the text is parsed as data only.
 */
export function CaptureCard({
  capture,
  skills,
  alreadyImported,
  onDone,
}: {
  capture: Capture;
  skills: Skill[];
  alreadyImported: boolean;
  /** Called after an import or discard so the caller can clear the capture from its queue. */
  onDone: (capture: Capture, outcome: "imported" | "discarded") => Promise<void>;
}) {
  const { apply } = useData();
  const { run, busy, error } = useAction();
  const [as, setAs] = useState<CaptureKind>(capture.kind);
  const [title, setTitle] = useState(capture.title);
  const [oppKind, setOppKind] = useState<Opportunity["kind"]>("job");
  const [organization, setOrganization] = useState("");
  const [artKind, setArtKind] = useState<EvidenceArtifact["kind"]>("note");
  const [claim, setClaim] = useState("");
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const host = captureHost(capture);
  const headingId = `cap-h-${capture.id}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const sourceLabel = captureSourceLabel(capture);
      if (as === "opportunity") {
        await apply(
          (d, ctx) =>
            addOpportunity(
              d,
              { title, organization, kind: oppKind, rawText: capture.text, sourceLabel, sourceUri: capture.pageUrl, retrievedAt: capture.capturedAt },
              ctx,
            ).data,
        );
      } else {
        const sha256 = await sha256Hex(utf8(capture.text));
        await apply(
          (d, ctx) =>
            addEvidence(
              d,
              {
                title,
                kind: artKind,
                content: capture.text,
                sha256,
                mediaType: "text/plain",
                captureMethod: "selected-webpage",
                sourceLabel,
                sourceUri: capture.pageUrl,
                capturedAt: capture.capturedAt,
                claim,
                skillIds,
                visibility: "private",
              },
              ctx,
            ).data,
        );
      }
      await onDone(capture, "imported");
    });
  }

  return (
    <article aria-labelledby={headingId} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 id={headingId} className="font-medium">
        {capture.title}
      </h2>
      <p className="mt-1 text-xs text-[var(--fg-muted)]">
        {capture.method === "selection" ? "Selected text" : "Visible page text"} from{" "}
        <span className="font-mono">{host}</span> · captured {formatDateTime(capture.capturedAt)} ·{" "}
        {capture.text.length.toLocaleString("en")} characters
      </p>
      <p className="mt-1 text-xs break-all text-[var(--fg-muted)]">{capture.pageUrl}</p>
      {alreadyImported && (
        <p role="note" className="mt-2 text-sm text-amber-700 dark:text-amber-400">
          This capture is already in your vault. Importing again creates a second copy.
        </p>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-[var(--accent)]">Show captured text</summary>
        {/* Rendered as escaped text: captured markup or instructions stay inert. */}
        <pre className="mt-2 max-h-64 overflow-auto rounded border border-[var(--border)] bg-[var(--bg)] p-2 text-xs whitespace-pre-wrap">
          {capture.text}
        </pre>
      </details>

      <form onSubmit={(e) => void submit(e)} className="mt-3 space-y-3" aria-label={`Import ${capture.title}`}>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className={labelClass}>Save as</legend>
          {(["opportunity", "evidence"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1">
              <input type="radio" name={`as-${capture.id}`} value={k} checked={as === k} onChange={() => setAs(k)} />
              {k === "opportunity" ? "Opportunity (parse requirements)" : "Evidence (excerpt + your claim)"}
            </label>
          ))}
        </fieldset>
        <div>
          <label htmlFor={`t-${capture.id}`} className={labelClass}>
            Title
          </label>
          <input id={`t-${capture.id}`} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </div>
        {as === "opportunity" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`k-${capture.id}`} className={labelClass}>
                Kind
              </label>
              <select id={`k-${capture.id}`} className={inputClass} value={oppKind} onChange={(e) => setOppKind(e.target.value as Opportunity["kind"])}>
                {OpportunitySchema.shape.kind.options.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`o-${capture.id}`} className={labelClass}>
                Organization <span className="font-normal text-[var(--fg-muted)]">(optional)</span>
              </label>
              <input id={`o-${capture.id}`} className={inputClass} value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={200} />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor={`k-${capture.id}`} className={labelClass}>
                Kind
              </label>
              <select id={`k-${capture.id}`} className={inputClass} value={artKind} onChange={(e) => setArtKind(e.target.value as EvidenceArtifact["kind"])}>
                {EvidenceArtifactSchema.shape.kind.options.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`c-${capture.id}`} className={labelClass}>
                What does this show? (your claim)
              </label>
              <textarea id={`c-${capture.id}`} className={inputClass} rows={2} value={claim} onChange={(e) => setClaim(e.target.value)} required maxLength={1000} />
            </div>
            {skills.length > 0 && (
              <fieldset>
                <legend className={labelClass}>Skills this claim is about</legend>
                <div className="mt-1 flex flex-wrap gap-3 text-sm">
                  {skills.map((s) => (
                    <label key={s.id} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={skillIds.includes(s.id)}
                        onChange={(e) => setSkillIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((i) => i !== s.id)))}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <p className="text-xs text-[var(--fg-muted)]">Saved as private evidence; change visibility later in the Evidence Vault.</p>
          </>
        )}
        <ErrorText error={error} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={busy}>
            {as === "opportunity" ? "Import as opportunity" : "Save as evidence"}
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void run(() => onDone(capture, "discarded"))}>
            Discard capture
          </Button>
        </div>
      </form>
    </article>
  );
}
