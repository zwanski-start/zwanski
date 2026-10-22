import { findDanglingReferences, findDuplicateIds } from "./integrity";
import { migrateDataset } from "./migrate";
import type { Dataset } from "./schemas";

/** Backup files larger than this are refused before parsing (hostile-input bound). */
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

/** Serializes the whole vault (a schema-versioned `Dataset`) as a portable JSON backup. */
export function serializeBackup(data: Dataset): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Parses an untrusted backup file into a validated dataset: size-bounded, JSON only (never
 * evaluated), migrated to the current schema, and rejected if any id is duplicated or any
 * relation dangles — so a restore can never create duplicate ids or broken links.
 */
export function parseBackup(text: string): Dataset {
  // A UTF-16 code unit is at least one UTF-8 byte, so the cheap length check rejects huge input first.
  if (text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw new Error("Backup file is too large.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Backup file is not valid JSON.");
  }
  const data = migrateDataset(raw);
  const dupes = findDuplicateIds(data);
  if (dupes.length > 0) throw new Error(`Backup has duplicate ids: ${dupes.slice(0, 5).join(", ")}`);
  const dangling = findDanglingReferences(data);
  if (dangling.length > 0) {
    const d = dangling[0]!;
    throw new Error(`Backup has ${dangling.length} broken reference(s), e.g. ${d.table}.${d.field} → ${d.missing}`);
  }
  return data;
}
