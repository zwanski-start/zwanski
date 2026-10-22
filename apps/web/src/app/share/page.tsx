"use client";

import { useState } from "react";
import {
  MAX_BACKUP_BYTES,
  RequirementStatusSchema,
  buildDossier,
  parseBackup,
  renderDossierPdf,
  serializeBackup,
  type Dataset,
} from "@proofbridge/core";
import { Button, Card, DemoBadge, ErrorText, PageHeader, StatusBadge, inputClass, labelClass } from "@/components/ui";
import { WithData } from "@/components/WithData";
import { useData } from "@/lib/data";
import { downloadBytes, downloadText } from "@/lib/files";
import { useI18n } from "@/lib/i18n";
import { PDF_LABELS } from "@/lib/messages";
import { useAction } from "@/lib/useAction";

const fileStamp = () => new Date().toISOString().slice(0, 10);

function DossierPreview({ data }: { data: Dataset }) {
  const { t, locale, status, formatDate, pdfLabels } = useI18n();
  const [oppId, setOppId] = useState(data.opportunities[0]?.id ?? "");
  const [replaced, setReplaced] = useState(0);
  const opp = data.opportunities.find((o) => o.id === oppId) ?? data.opportunities[0];
  if (!opp) return <p className="text-[var(--fg-muted)]">{t("share.noOpportunity")}</p>;
  const dossier = buildDossier(data, opp.id, new Date().toISOString());

  function downloadPdf() {
    const pdf = renderDossierPdf(dossier, pdfLabels, pdfLabels === PDF_LABELS.en ? "en" : locale);
    setReplaced(pdf.replacedChars);
    downloadBytes(`proofbridge-dossier-${fileStamp()}.pdf`, pdf.bytes, "application/pdf");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1">
          <label htmlFor="dossier-opp" className={labelClass}>
            {t("share.opportunity")}
          </label>
          <select id="dossier-opp" className={inputClass} value={opp.id} onChange={(e) => setOppId(e.target.value)}>
            {data.opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="primary"
          onClick={() => downloadText(`proofbridge-dossier-${fileStamp()}.json`, JSON.stringify(dossier, null, 2))}
        >
          {t("share.downloadJson")}
        </Button>
        <Button onClick={downloadPdf}>{t("share.downloadPdf")}</Button>
      </div>

      {locale === "ar" && <p className="text-xs text-[var(--fg-muted)]">{t("share.pdfLabelsNote")}</p>}
      {replaced > 0 && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
          {t("share.pdfReplaced", { n: replaced })}
        </p>
      )}

      <section aria-label="Dossier preview" className="rounded border border-[var(--border)] p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl">{dossier.opportunity.title}</h2>
          {dossier.demo && <DemoBadge />}
        </div>
        <p className="text-sm text-[var(--fg-muted)]">
          {dossier.opportunity.organization} · {dossier.opportunity.kind} · {t("share.retrieved", { date: formatDate(dossier.opportunity.retrievedAt) })}
        </p>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">{dossier.notice}</p>
        <dl className="mt-2 flex flex-wrap gap-x-4 text-sm" aria-label="Dossier requirement counts">
          {RequirementStatusSchema.options.map((s) => (
            <div key={s} className="flex gap-1">
              <dt className="text-[var(--fg-muted)]">{status(s)}:</dt>
              <dd>{dossier.counts[s]}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-3 space-y-3">
          {dossier.requirements.map((r) => (
            <li key={r.text}>
              <p className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} /> <span className="font-medium">{r.text}</span>
                {r.setManually && <span className="text-xs text-[var(--fg-muted)]">{t("share.setManually")}</span>}
                {r.suggestedByAi && <span className="text-xs text-[var(--fg-muted)]">· {t("opportunities.aiOrigin")}</span>}
              </p>
              <p className="text-sm text-[var(--fg-muted)]">{r.rationale}</p>
              {r.evidence.length > 0 && (
                <ul className="mt-1 list-disc ps-5 text-sm">
                  {r.evidence.map((e, i) => (
                    <li key={i}>
                      {e.claim} — <em>{e.artifact.title}</em>
                      {e.artifact.excerpt && <q className="block text-xs text-[var(--fg-muted)]">{e.artifact.excerpt}</q>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm" data-testid="withheld">
          {t("share.withheld", { n: dossier.withheld })}
        </p>
      </section>
    </div>
  );
}

function BackupPanel({ data }: { data: Dataset }) {
  const { restore } = useData();
  const { run, busy, error, setError } = useAction();
  const [pending, setPending] = useState<Dataset | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function choose(file: File | undefined) {
    setDone(null);
    setPending(null);
    if (!file) return;
    await run(async () => {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("Backup file is too large.");
      setPending(parseBackup(await file.text()));
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        A backup is the whole vault as one JSON file. It stays on your device; restoring it on another browser recreates
        every record and relation with the same ids.
      </p>
      <Button onClick={() => downloadText(`proofbridge-vault-${fileStamp()}.json`, serializeBackup(data))}>
        Export vault backup (JSON)
      </Button>
      <div>
        <label htmlFor="restore-file" className={labelClass}>
          Restore from a backup file
        </label>
        <input id="restore-file" type="file" accept="application/json,.json" className="text-sm" onChange={(e) => void choose(e.target.files?.[0])} />
      </div>
      {pending && (
        <div role="alertdialog" aria-label="Confirm restore" className="rounded border border-amber-600 p-2 text-sm">
          <p>
            This backup holds {pending.artifacts.length} artifact(s), {pending.claims.length} claim(s) and{" "}
            {pending.opportunities.length} opportunity(ies). Restoring <strong>replaces</strong> everything in this browser.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await restore(pending);
                  setPending(null);
                  setDone("Vault restored from backup.");
                })
              }
            >
              Replace vault with backup
            </Button>
            <Button
              onClick={() => {
                setPending(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {done && (
        <p role="status" className="text-sm">
          {done}
        </p>
      )}
      <ErrorText error={error} />
    </div>
  );
}

export default function SharePage() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t("share.title")} lede={t("share.lede")} />
      <WithData>
        {(data) => (
          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase">{t("share.dossier")}</h2>
              <DossierPreview data={data} />
            </Card>
            <Card>
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase">{t("share.backup")}</h2>
              <BackupPanel data={data} />
            </Card>
          </div>
        )}
      </WithData>
    </>
  );
}
