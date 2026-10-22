"use client";

import { useState } from "react";
import { grantConsent, loopbackOrigin, revokeConsent, setEndpoint } from "@proofbridge/ai";
import { Button, Card, ErrorText, PageHeader, inputClass, labelClass } from "@/components/ui";
import { LanguageSelect } from "@/components/Shell";
import { useAiSettings, useEgressLog } from "@/lib/ai";
import { useI18n } from "@/lib/i18n";

const sectionTitle = "mb-3 text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase";

function AiSettingsPanel() {
  const { t, formatDateTime } = useI18n();
  const [settings, save] = useAiSettings();
  const { log, clear } = useEgressLog();
  const [endpoint, setEndpointDraft] = useState(settings.endpoint);
  const [model, setModel] = useState(settings.model);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftOrigin = loopbackOrigin(endpoint);
  const on = settings.enabled && settings.consent !== null;

  function saveDraft() {
    if ("error" in draftOrigin) return;
    save({ ...setEndpoint(settings, endpoint.trim()), model: model.trim() || settings.model });
  }

  function enable() {
    try {
      save(grantConsent({ ...setEndpoint(settings, endpoint.trim()), model: model.trim() || settings.model }, new Date().toISOString()));
      setError(null);
      setUnderstood(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">{t("settings.ai.intro")}</p>
      <p role="status" data-testid="ai-status" className="text-sm font-medium">
        {on && settings.consent
          ? t("settings.ai.status.on", { origin: settings.consent.origin, date: formatDateTime(settings.consent.grantedAt) })
          : t("settings.ai.status.off")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ai-endpoint" className={labelClass}>
            {t("settings.ai.endpoint")}
          </label>
          <input
            id="ai-endpoint"
            dir="ltr"
            className={inputClass}
            value={endpoint}
            onChange={(e) => setEndpointDraft(e.target.value)}
            maxLength={200}
            spellCheck={false}
          />
        </div>
        <div>
          <label htmlFor="ai-model" className={labelClass}>
            {t("settings.ai.model")}
          </label>
          <input id="ai-model" dir="ltr" className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} maxLength={100} />
        </div>
      </div>
      <p className="rounded border border-[var(--border)] p-2 text-sm">{t("settings.ai.egress")}</p>
      {!on ? (
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-1" />
            <span>{t("settings.ai.consent")}</span>
          </label>
          <Button variant="primary" disabled={!understood || "error" in draftOrigin} onClick={enable}>
            {t("settings.ai.enable")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveDraft}>{t("settings.ai.save")}</Button>
          <Button variant="danger" onClick={() => save(revokeConsent(settings))}>
            {t("settings.ai.disable")}
          </Button>
        </div>
      )}
      <ErrorText error={error ?? ("error" in draftOrigin ? draftOrigin.error : null)} />

      <div>
        <h3 className="text-sm font-medium">{t("settings.ai.log")}</h3>
        {log.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">{t("settings.ai.logEmpty")}</p>
        ) : (
          <>
            <ul className="mt-1 space-y-1 text-xs" aria-label={t("settings.ai.log")} dir="ltr">
              {log.map((r, i) => (
                <li key={i}>
                  {t("settings.ai.logEntry", {
                    at: formatDateTime(r.at),
                    origin: r.origin,
                    path: r.path,
                    bytes: r.bytes,
                    fields: r.fields.join(", "),
                    outcome: r.outcome,
                  })}
                </li>
              ))}
            </ul>
            <Button className="mt-2" onClick={clear}>
              {t("settings.ai.clearLog")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [ai] = useAiSettings();
  return (
    <>
      <PageHeader title={t("settings.title")} lede={t("settings.lede")} />
      <div className="space-y-4">
        <Card>
          <h2 className={sectionTitle}>{t("settings.language")}</h2>
          <LanguageSelect id="settings-language" label={t("settings.language")} />
        </Card>
        <Card>
          <h2 className={sectionTitle}>{t("settings.ai")}</h2>
          {/* Re-key on the saved values: the prerendered shell starts from defaults. */}
          <AiSettingsPanel key={`${ai.endpoint}|${ai.model}`} />
        </Card>
      </div>
    </>
  );
}
