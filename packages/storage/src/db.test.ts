import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { ENTITY_TABLES, addEvidence, deleteClaim, findDuplicateIds, parseBackup, sequentialIds, serializeBackup } from "@proofbridge/core";
import { demoDataset } from "@proofbridge/fixtures";
import {
  DB_VERSION,
  MIGRATIONS,
  applyChange,
  clearAll,
  replaceAll,
  exportDataset,
  isEmpty,
  openDatabase,
  seedIfEmpty,
  type ProofBridgeDB,
} from "./index";

let n = 0;
const opened: ProofBridgeDB[] = [];
const freshDb = () => {
  const db = openDatabase(`proofbridge-test-${++n}`);
  opened.push(db);
  return db;
};

afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe("storage", () => {
  it("declares strictly increasing migration versions", () => {
    const versions = MIGRATIONS.map((m) => m.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
    expect(DB_VERSION).toBe(versions.at(-1));
  });

  it("seeds the demo dataset once and round-trips it exactly", async () => {
    const db = freshDb();
    expect(await isEmpty(db)).toBe(true);
    expect(await seedIfEmpty(db, demoDataset)).toBe(true);
    expect(await seedIfEmpty(db, demoDataset)).toBe(false);

    const exported = await exportDataset(db);
    const sortById = (rows: readonly { id: string }[]) => [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));
    for (const table of ENTITY_TABLES) {
      expect(exported[table], table).toEqual(sortById(demoDataset[table]));
    }
  });

  it("persists across a close/reopen (reload)", async () => {
    const name = `proofbridge-test-reload-${++n}`;
    const first = openDatabase(name);
    await seedIfEmpty(first, demoDataset);
    first.close();

    const second = openDatabase(name);
    opened.push(second);
    expect(await second.claims.count()).toBe(demoDataset.claims.length);
    expect(await second.requirements.get("req_deployment")).toMatchObject({ status: "uncertain" });
  });

  it("clears all local data", async () => {
    const db = freshDb();
    await seedIfEmpty(db, demoDataset);
    await clearAll(db);
    expect(await isEmpty(db)).toBe(true);
  });

  it("migrates a v1 database in place: data kept, redaction defaulted, history table added", async () => {
    const name = `proofbridge-test-v1-${++n}`;
    const v1 = new Dexie(name);
    v1.version(1).stores(MIGRATIONS[0]!.stores);
    await v1.open();
    const { redaction: _r, ...legacyArtifact } = demoDataset.artifacts[0]!;
    await v1.table("artifacts").put(legacyArtifact);
    v1.close();

    const db = openDatabase(name);
    opened.push(db);
    expect((await db.artifacts.get(legacyArtifact.id))?.redaction).toBe("none");
    expect(await db.auditEvents.count()).toBe(0);
    expect(db.verno).toBe(DB_VERSION);
  });

  it("applies a change atomically and the manual artifact survives a reload", async () => {
    const name = `proofbridge-test-apply-${++n}`;
    const first = openDatabase(name);
    await seedIfEmpty(first, demoDataset);
    const ctx = { now: "2026-03-01T00:00:00.000Z", newId: sequentialIds("st") };
    let artifactId = "";
    const after = await applyChange(first, (d) => {
      const r = addEvidence(
        d,
        { title: "Manual note", kind: "write-up", captureMethod: "manual", sourceLabel: "typed", claim: "Wrote a second case study." },
        ctx,
      );
      artifactId = r.artifactId;
      return r.data;
    });
    expect(after.requirements.find((r) => r.id === "req_case-studies")?.status).toBe("supported");
    first.close();

    const second = openDatabase(name);
    opened.push(second);
    expect(await second.artifacts.get(artifactId)).toMatchObject({ title: "Manual note" });
    expect((await second.requirements.get("req_case-studies"))?.status).toBe("supported");
    expect(await second.auditEvents.where("entityId").equals(artifactId).count()).toBe(1);
  });

  it("rolls back when a change is invalid", async () => {
    const db = freshDb();
    await seedIfEmpty(db, demoDataset);
    await expect(
      applyChange(db, (d) => ({ ...d, claims: [...d.claims, { ...d.claims[0]!, artifactId: "art_missing", id: "claim_new" }] })),
    ).rejects.toThrow(/broken reference/);
    await expect(applyChange(db, (d) => deleteClaim(d, "claim_missing", { now: "2026-03-01T00:00:00.000Z", newId: sequentialIds() }))).rejects.toThrow(
      /not found/,
    );
    expect(await db.claims.get("claim_new")).toBeUndefined();
    expect(await db.claims.count()).toBe(demoDataset.claims.length);
  });

  it("restores a backup into a fresh install without duplicate ids", async () => {
    const source = freshDb();
    await seedIfEmpty(source, demoDataset);
    await applyChange(source, (d) =>
      addEvidence(d, { title: "Extra", kind: "note", captureMethod: "manual", sourceLabel: "typed", claim: "c" }, {
        now: "2026-03-01T00:00:00.000Z",
        newId: sequentialIds("bk"),
      }).data,
    );
    const backup = serializeBackup(await exportDataset(source));

    // A fresh install seeds the demo first; restoring replaces it rather than merging.
    const target = freshDb();
    await seedIfEmpty(target, demoDataset);
    await replaceAll(target, parseBackup(backup));
    const restored = await exportDataset(target);
    expect(restored).toEqual(await exportDataset(source));
    expect(findDuplicateIds(restored)).toEqual([]);
    // Restoring twice is idempotent.
    await replaceAll(target, parseBackup(backup));
    expect(await target.artifacts.count()).toBe(demoDataset.artifacts.length + 1);
  });
});
