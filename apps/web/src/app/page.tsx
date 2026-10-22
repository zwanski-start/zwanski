"use client";

import Link from "next/link";
import { countRequirementStatuses, REQUIREMENT_STATUS_LABEL, RequirementStatusSchema } from "@proofbridge/core";
import { Card, DemoBadge, PageHeader } from "@/components/ui";
import { ProfileLanguages } from "@/components/ProfileLanguages";
import { WithData } from "@/components/WithData";
import { useData } from "@/lib/data";
import { formatDate, nextAction } from "@/lib/select";

export default function CompassPage() {
  const { resetDemo } = useData();
  return (
    <>
      <PageHeader
        title="Compass"
        lede="One meaningful next action, your saved opportunities and open evidence gaps — all stored locally in this browser."
      />
      <WithData>
        {(data) => {
          const action = nextAction(data);
          const counts = countRequirementStatuses(data.requirements);
          const gaps = data.requirements.filter((r) => r.status !== "supported" && r.status !== "not-applicable");
          const lastCapture = [...data.sources].sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1))[0];
          const isDemo = data.profiles.some((p) => p.demo);
          return (
            <div className="grid gap-4 md:grid-cols-2">
              {isDemo && (
                <Card className="md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm">
                      <DemoBadge /> You are viewing an explicitly synthetic demo vault. No real person or
                      organization is represented.
                    </p>
                    <button
                      type="button"
                      onClick={() => void resetDemo()}
                      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--accent-soft)]"
                    >
                      Reset demo data
                    </button>
                  </div>
                </Card>
              )}
              <Card>
                <h2 className="text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase">Next action</h2>
                {action ? (
                  <p className="mt-2 font-serif text-xl">
                    {action.title}{" "}
                    <span className="text-sm text-[var(--fg-muted)]">· ~{action.effortHours} h</span>
                  </p>
                ) : (
                  <p className="mt-2">No open tasks.</p>
                )}
                <Link href="/plan" className="mt-3 inline-block text-sm text-[var(--accent)] underline">
                  Open Bridge Plan
                </Link>
              </Card>
              <Card>
                <h2 className="text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase">
                  Saved opportunities
                </h2>
                <ul className="mt-2 space-y-1">
                  {data.opportunities.map((o) => (
                    <li key={o.id}>
                      <Link href="/opportunities" className="underline">
                        {o.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Requirement counts">
                  {RequirementStatusSchema.options.map((s) => (
                    <div key={s} className="flex gap-1">
                      <dt className="text-[var(--fg-muted)]">{REQUIREMENT_STATUS_LABEL[s]}:</dt>
                      <dd>{counts[s]}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <Card>
                <h2 className="text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase">
                  Open evidence gaps ({gaps.length})
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {gaps.map((g) => (
                    <li key={g.id}>
                      {g.text} — <span className="text-[var(--fg-muted)]">{REQUIREMENT_STATUS_LABEL[g.status]}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h2 className="text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase">
                  Last evidence capture
                </h2>
                {lastCapture ? (
                  <p className="mt-2">
                    {lastCapture.label}
                    <br />
                    <span className="text-sm text-[var(--fg-muted)]">
                      {formatDate(lastCapture.capturedAt)} · {lastCapture.captureMethod}
                    </span>
                  </p>
                ) : (
                  <p className="mt-2">Nothing captured yet.</p>
                )}
              </Card>
              {data.profiles[0] && (
                <Card className="md:col-span-2">
                  <h2 className="text-sm font-semibold tracking-wide text-[var(--fg-muted)] uppercase">Your profile</h2>
                  <p className="mt-1 text-sm">{data.profiles[0].displayName}</p>
                  <ProfileLanguages key={data.profiles[0].updatedAt} profile={data.profiles[0]} />
                </Card>
              )}
            </div>
          );
        }}
      </WithData>
    </>
  );
}
