"use client";

import type React from "react";
import { useState, type ReactNode } from "react";
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

export const inputClass =
  "w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--fg)]";
export const labelClass = "block text-sm font-medium";

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const style = {
    primary: "border-[var(--accent)] bg-[var(--accent)] text-[var(--surface)] hover:opacity-90",
    secondary: "border-[var(--border)] hover:bg-[var(--accent-soft)]",
    danger: "border-rose-600 text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${style} ${className}`}
    />
  );
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
      {error}
    </p>
  );
}

/** A destructive button that asks for a second click before acting. */
export function ConfirmButton({
  label,
  confirmLabel = "Confirm",
  onConfirm,
  disabled,
  ...aria
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <Button variant="danger" disabled={disabled} onClick={() => setArmed(true)} aria-label={aria["aria-label"]}>
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex gap-1">
      <Button
        variant="danger"
        disabled={disabled}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button onClick={() => setArmed(false)}>Cancel</Button>
    </span>
  );
}
