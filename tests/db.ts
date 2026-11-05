import "fake-indexeddb/auto";
import { afterEach, beforeEach } from "vitest";
import { closeDb, deleteDatabaseForTests } from "../src/lib/db";

export function useFreshDb(): void {
  beforeEach(async () => {
    await closeDb();
    await deleteDatabaseForTests();
  });
  afterEach(async () => {
    await closeDb();
    await deleteDatabaseForTests();
  });
}
