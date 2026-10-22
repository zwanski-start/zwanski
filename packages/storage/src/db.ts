import Dexie, { type EntityTable as DexieTable, type Transaction } from "dexie";
import {
  DatasetSchema,
  ENTITY_TABLES,
  SCHEMA_VERSION,
  findDanglingReferences,
  findDuplicateIds,
  type AuditEvent,
  type BridgeTask,
  type ClaimSkillLink,
  type Dataset,
  type EvidenceArtifact,
  type EvidenceClaim,
  type EvidenceSource,
  type Opportunity,
  type OpportunityRequirement,
  type PersonProfile,
  type RequirementEvidenceLink,
  type Skill,
} from "@proofbridge/core";

export const DEFAULT_DB_NAME = "proofbridge";

/**
 * Versioned IndexedDB schema. Each entry is one Dexie `version()` — append new versions,
 * never edit a released one, and put data transforms in `upgrade`. `DB_VERSION` must equal the
 * domain `SCHEMA_VERSION` so exports and the database agree on shape.
 */
export const MIGRATIONS: ReadonlyArray<{
  version: number;
  stores: Record<string, string>;
  upgrade?: (tx: Transaction) => Promise<void> | void;
}> = [
  {
    version: 1,
    stores: {
      profiles: "id",
      sources: "id, captureMethod",
      artifacts: "id, sourceId, kind",
      claims: "id, artifactId, reviewState",
      skills: "id, name",
      claimSkillLinks: "id, claimId, skillId",
      opportunities: "id, kind",
      requirements: "id, opportunityId, skillId, status",
      requirementEvidenceLinks: "id, requirementId, claimId",
      bridgeTasks: "id, requirementId, state",
      meta: "key",
    },
  },
  {
    // Phase 1: change history table; artifacts gain a redaction state (defaults to "none").
    version: 2,
    stores: { auditEvents: "id, entityId, at" },
    upgrade: async (tx) => {
      await tx
        .table("artifacts")
        .toCollection()
        .modify((a: { redaction?: string }) => {
          a.redaction ??= "none";
        });
    },
  },
];

export const DB_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;
if (DB_VERSION !== SCHEMA_VERSION) {
  throw new Error(`storage DB_VERSION ${DB_VERSION} != core SCHEMA_VERSION ${SCHEMA_VERSION}`);
}

export interface MetaRow {
  key: string;
  value: string;
}

export type ProofBridgeDB = Dexie & {
  profiles: DexieTable<PersonProfile, "id">;
  sources: DexieTable<EvidenceSource, "id">;
  artifacts: DexieTable<EvidenceArtifact, "id">;
  claims: DexieTable<EvidenceClaim, "id">;
  skills: DexieTable<Skill, "id">;
  claimSkillLinks: DexieTable<ClaimSkillLink, "id">;
  opportunities: DexieTable<Opportunity, "id">;
  requirements: DexieTable<OpportunityRequirement, "id">;
  requirementEvidenceLinks: DexieTable<RequirementEvidenceLink, "id">;
  bridgeTasks: DexieTable<BridgeTask, "id">;
  auditEvents: DexieTable<AuditEvent, "id">;
  meta: DexieTable<MetaRow, "key">;
};

export function openDatabase(name: string = DEFAULT_DB_NAME): ProofBridgeDB {
  const db = new Dexie(name) as ProofBridgeDB;
  for (const m of MIGRATIONS) {
    const v = db.version(m.version).stores(m.stores);
    if (m.upgrade) v.upgrade(m.upgrade);
  }
  return db;
}

/** True when no domain records exist yet (a fresh browser). */
export async function isEmpty(db: ProofBridgeDB): Promise<boolean> {
  const counts = await Promise.all(ENTITY_TABLES.map((t) => db.table(t).count()));
  return counts.every((c) => c === 0);
}

/** Writes every record of a validated dataset in one transaction (upsert by id). */
export async function importDataset(db: ProofBridgeDB, data: Dataset): Promise<void> {
  const parsed = DatasetSchema.parse(data);
  await db.transaction("rw", [...ENTITY_TABLES.map((t) => db.table(t)), db.meta], async () => {
    for (const t of ENTITY_TABLES) await db.table(t).bulkPut(parsed[t]);
    await db.meta.put({ key: "lastImportAt", value: new Date().toISOString() });
  });
}

/** Seeds the database with `dataset` only if it is empty. Returns whether it seeded. */
export async function seedIfEmpty(db: ProofBridgeDB, dataset: Dataset): Promise<boolean> {
  if (!(await isEmpty(db))) return false;
  await importDataset(db, dataset);
  return true;
}

/** Reads the whole local dataset back, validated against the domain schema. */
export async function exportDataset(db: ProofBridgeDB): Promise<Dataset> {
  const entries = await Promise.all(
    ENTITY_TABLES.map(async (t) => [t, await db.table(t).orderBy("id").toArray()] as const),
  );
  return DatasetSchema.parse({ schemaVersion: SCHEMA_VERSION, ...Object.fromEntries(entries) });
}

/** Removes every local record (domain tables and meta). */
export async function clearAll(db: ProofBridgeDB): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

/** Throws unless the dataset is schema-valid with unique ids and no dangling relations. */
function assertIntact(data: Dataset): Dataset {
  const parsed = DatasetSchema.parse(data);
  const dupes = findDuplicateIds(parsed);
  if (dupes.length > 0) throw new Error(`Refusing to write duplicate ids: ${dupes.join(", ")}`);
  const dangling = findDanglingReferences(parsed);
  if (dangling.length > 0) throw new Error(`Refusing to write ${dangling.length} broken reference(s)`);
  return parsed;
}

/**
 * Applies a pure dataset transformation (see `@proofbridge/core` ops) atomically: reads the
 * vault, computes the next state, validates it, and writes only the rows that changed
 * (puts + deletes) in one IndexedDB transaction. Returns the persisted dataset.
 */
export async function applyChange(db: ProofBridgeDB, change: (data: Dataset) => Dataset): Promise<Dataset> {
  return db.transaction("rw", ENTITY_TABLES.map((t) => db.table(t)), async () => {
    const before = await exportDataset(db);
    const after = assertIntact(change(before));
    for (const t of ENTITY_TABLES) {
      const prev = new Map<string, unknown>(before[t].map((r) => [r.id, r]));
      const rows = after[t] as readonly { id: string }[];
      const nextIds = new Set(rows.map((r) => r.id));
      const puts = rows.filter((r) => JSON.stringify(prev.get(r.id)) !== JSON.stringify(r));
      const deletes = [...prev.keys()].filter((id) => !nextIds.has(id));
      if (puts.length) await db.table(t).bulkPut(puts);
      if (deletes.length) await db.table(t).bulkDelete(deletes);
    }
    return exportDataset(db);
  });
}

/**
 * Replaces the whole vault with `data` (restore from backup) in one transaction, so a
 * restore never mixes old and new records or duplicates ids.
 */
export async function replaceAll(db: ProofBridgeDB, data: Dataset): Promise<void> {
  const parsed = assertIntact(data);
  await db.transaction("rw", [...ENTITY_TABLES.map((t) => db.table(t)), db.meta], async () => {
    for (const t of ENTITY_TABLES) {
      await db.table(t).clear();
      await db.table(t).bulkAdd(parsed[t]);
    }
    await db.meta.put({ key: "lastImportAt", value: new Date().toISOString() });
  });
}
