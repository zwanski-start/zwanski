"use client";

import { useState } from "react";
import { AddEvidenceForm } from "@/components/AddEvidenceForm";
import { ArtifactInspector } from "@/components/ArtifactInspector";
import { Card, DemoBadge, PageHeader } from "@/components/ui";
import { WithData } from "@/components/WithData";
import { useI18n } from "@/lib/i18n";
import { claimsForArtifact } from "@/lib/select";

export default function EvidencePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const { t, formatDate } = useI18n();
  return (
    <>
      <PageHeader
        title={t("evidence.title")}
        lede={t("evidence.lede")}
      />
      <WithData>
        {(data) => {
          const current = data.artifacts.find((a) => a.id === selected);
          return (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-4">
                <Card>
                  <details>
                    <summary className="cursor-pointer font-medium">Add evidence</summary>
                    <div className="mt-3">
                      <AddEvidenceForm skills={data.skills} onAdded={setSelected} />
                    </div>
                  </details>
                </Card>
                <ul className="space-y-2" aria-label="Artifacts">
                  {[...data.artifacts]
                    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
                    .map((art) => {
                    const source = data.sources.find((s) => s.id === art.sourceId);
                    const active = art.id === selected;
                    return (
                      <li key={art.id}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelected(art.id)}
                          className={`w-full rounded-lg border p-3 text-start ${
                            active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)]"
                          }`}
                        >
                          <span className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-medium">{art.title}</span>
                            {art.demo && <DemoBadge />}
                          </span>
                          <span className="mt-1 block text-xs text-[var(--fg-muted)]">
                            {art.kind} · {claimsForArtifact(data, art.id).length} claim(s) ·{" "}
                            {source ? formatDate(source.capturedAt) : "unknown date"} · {art.visibility}
                            {art.redaction !== "none" && ` · ${art.redaction}`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {data.artifacts.length === 0 && <li className="text-[var(--fg-muted)]">The vault is empty.</li>}
                </ul>
              </div>
              <Card className="md:sticky md:top-4 md:self-start">
                {current ? (
                  <ArtifactInspector data={data} artifact={current} onDeleted={() => setSelected(null)} />
                ) : (
                  <p className="text-[var(--fg-muted)]">Select an artifact to inspect it.</p>
                )}
              </Card>
            </div>
          );
        }}
      </WithData>
    </>
  );
}
