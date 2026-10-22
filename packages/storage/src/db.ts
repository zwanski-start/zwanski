import Dexie, { type EntityTable as DexieTable, type Transaction } from "dexie";
import {
  DatasetSchema,
  ENTITY_TABLES,
  SCHEMA_VERSION,
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
