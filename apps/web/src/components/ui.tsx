import type { ReactNode } from "react";
import { REQUIREMENT_STATUS_LABEL, type RequirementStatus } from "@proofbridge/core";

export function DemoBadge() {
  return (
    <span className="inline-block rounded border border-dashed border-[var(--fg-muted)] px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wider text-[var(--fg-muted)] uppercase">
      Demo / Synthetic
    </span>
  );
}

const STATUS_STYLE: Record<RequirementStatus, string> = {
  supported: "border-[var(--accent)] text-[var(--accent)]",
  uncertain: "border-amber-600 text-amber-700 dark:text-amber-400",
  "not-yet-supported": "border-rose-600 text-rose-700 dark:text-rose-400",
  "not-applicable": "border-[var(--fg-muted)] text-[var(--fg-muted)]",
  unknown: "border-[var(--fg-muted)] text-[var(--fg-muted)] border-dashed",
};

export function StatusBadge({ status }: { status: RequirementStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {REQUIREMENT_STATUS_LABEL[status]}
    </span>
  );
}

export function PageHeader({ title, lede }: { title: string; lede: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="font-serif text-3xl">{title}</h1>
      <p className="mt-1 max-w-prose text-[var(--fg-muted)]">{lede}</p>
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}>
      {children}
    </section>
  );
}
