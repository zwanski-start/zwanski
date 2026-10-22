"use client";

import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { WithData } from "@/components/WithData";
import { useI18n } from "@/lib/i18n";

export default function PlanPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader
        title={t("plan.title")}
        lede={t("plan.lede")}
      />
      <WithData>
        {(data) => {
          const total = data.bridgeTasks.reduce((sum, t) => sum + t.effortHours, 0);
          return (
            <Card>
              <ul className="divide-y divide-[var(--border)]">
                {data.bridgeTasks.map((t) => {
                  const req = data.requirements.find((r) => r.id === t.requirementId);
                  return (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p>{t.title}</p>
                        <p className="text-sm text-[var(--fg-muted)]">
                          Closes gap: {req?.text ?? "Unavailable"} · {t.state}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {req && <StatusBadge status={req.status} />}
                        <span>~{t.effortHours} h</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-sm text-[var(--fg-muted)]">Total estimated effort: ~{total} h</p>
            </Card>
          );
        }}
      </WithData>
    </>
  );
}
