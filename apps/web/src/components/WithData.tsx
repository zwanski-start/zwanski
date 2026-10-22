"use client";

import type { ReactNode } from "react";
import type { Dataset } from "@proofbridge/core";
import { useData } from "@/lib/data";

/** Renders `children` with the local dataset once IndexedDB has loaded. */
export function WithData({ children }: { children: (data: Dataset) => ReactNode }) {
  const { state } = useData();
  if (state.status === "loading") {
    return (
      <p role="status" className="text-[var(--fg-muted)]">
        Opening local vault…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-rose-700 dark:text-rose-400">
        Could not open the local database (IndexedDB): {state.message}
      </p>
    );
  }
  return <>{children(state.data)}</>;
}
