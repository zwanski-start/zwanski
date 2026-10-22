"use client";

import type { ReactNode } from "react";
import type { Dataset } from "@proofbridge/core";
import { useData } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

/** Renders `children` with the local dataset once IndexedDB has loaded. */
export function WithData({ children }: { children: (data: Dataset) => ReactNode }) {
  const { state } = useData();
  const { t } = useI18n();
  if (state.status === "loading") {
    return (
      <p role="status" className="text-[var(--fg-muted)]">
        {t("data.loading")}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-rose-700 dark:text-rose-400">
        {t("data.error", { message: state.message })}
      </p>
    );
  }
  return <>{children(state.data)}</>;
}
