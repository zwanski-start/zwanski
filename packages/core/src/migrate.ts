import { DatasetSchema, SCHEMA_VERSION, type Dataset } from "./schemas";

/**
 * Upgrades a parsed-JSON dataset of any released schema version to the current one and
 * validates it. Throws on unknown versions or invalid shape — callers treat the input as
 * untrusted (backup files, imports).
 *
 * - v1 → v2: adds `auditEvents`; artifact `redaction` defaults to "none" via the schema.
 */
export function migrateDataset(raw: unknown): Dataset {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Not a ProofBridge dataset: expected a JSON object.");
  }
  const input = { ...(raw as Record<string, unknown>) };
  const version = input.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new Error("Not a ProofBridge dataset: missing schemaVersion.");
  }
  if (version > SCHEMA_VERSION) {
    throw new Error(`Dataset schema v${version} is newer than this app (v${SCHEMA_VERSION}).`);
  }
  if (version < 1) throw new Error(`Unknown dataset schema v${version}.`);

  if (version === 1) {
    input.auditEvents = [];
    input.schemaVersion = 2;
  }
  return DatasetSchema.parse(input);
}
