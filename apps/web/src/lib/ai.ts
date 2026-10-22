"use client";

import { useCallback, useMemo } from "react";
import { DEFAULT_AI_SETTINGS, parseAiSettings, type AiSettings, type EgressRecord } from "@proofbridge/ai";
import { useLocalValue } from "./localStore";

/** Device-local AI preferences + consent (never part of the vault or its backups). */
export const AI_SETTINGS_KEY = "proofbridge.ai.v1";
/** Metadata-only record of what left the browser (never content). Newest first, capped. */
export const EGRESS_LOG_KEY = "proofbridge.ai.egress.v1";
const MAX_LOG = 50;

export function useAiSettings(): [AiSettings, (s: AiSettings) => void] {
  const [raw, setRaw] = useLocalValue(AI_SETTINGS_KEY);
  const settings = useMemo(() => (raw ? parseAiSettings(raw) : DEFAULT_AI_SETTINGS), [raw]);
  return [settings, useCallback((s: AiSettings) => setRaw(JSON.stringify(s)), [setRaw])];
}

export function useEgressLog(): { log: EgressRecord[]; append: (r: EgressRecord) => void; clear: () => void } {
  const [raw, setRaw] = useLocalValue(EGRESS_LOG_KEY);
  const log = useMemo(() => {
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as EgressRecord[]) : [];
    } catch {
      return [];
    }
  }, [raw]);
  return {
    log,
    append: useCallback((r: EgressRecord) => setRaw(JSON.stringify([r, ...log].slice(0, MAX_LOG))), [log, setRaw]),
    clear: useCallback(() => setRaw(null), [setRaw]),
  };
}
