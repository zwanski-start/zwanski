"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Dataset } from "@proofbridge/core";
import { demoDataset } from "@proofbridge/fixtures";
import { clearAll, exportDataset, openDatabase, seedIfEmpty, type ProofBridgeDB } from "@proofbridge/storage";

export type DataState =
  | { status: "loading" }
  | { status: "ready"; data: Dataset; seeded: boolean }
  | { status: "error"; message: string };

interface DataContextValue {
  state: DataState;
  /** Wipes local data and restores the synthetic demo. */
  resetDemo: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

/**
 * Loads the local dataset from IndexedDB, seeding the DEMO / SYNTHETIC fixture on a fresh
 * browser. No network access is involved at any point.
 */
export function DataProvider({ children, dbName }: { children: ReactNode; dbName?: string }) {
  const [state, setState] = useState<DataState>({ status: "loading" });
  const dbRef = useRef<ProofBridgeDB | null>(null);

  const load = useCallback(async (db: ProofBridgeDB) => {
    const seeded = await seedIfEmpty(db, demoDataset);
    const data = await exportDataset(db);
    return { status: "ready", data, seeded } as const;
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Dexie opens lazily, so failures (e.g. IndexedDB blocked) surface in `load`.
    const db = openDatabase(dbName);
    dbRef.current = db;
    load(db).then(
      (s) => !cancelled && setState(s),
      (e: unknown) => !cancelled && setState({ status: "error", message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      cancelled = true;
      db.close();
      dbRef.current = null;
    };
  }, [dbName, load]);

  const resetDemo = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    setState({ status: "loading" });
    try {
      await clearAll(db);
      setState(await load(db));
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }, [load]);

  return <DataContext.Provider value={{ state, resetDemo }}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
