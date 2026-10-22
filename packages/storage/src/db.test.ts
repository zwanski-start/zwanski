import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { ENTITY_TABLES } from "@proofbridge/core";
import { demoDataset } from "@proofbridge/fixtures";
import {
  DB_VERSION,
  MIGRATIONS,
  clearAll,
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
});
