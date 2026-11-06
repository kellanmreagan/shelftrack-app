import type { CollectionEntry, Condition } from "../types";
import { normalizeISODate, todayISODate } from "./dates";
import { openDb, readStore, writeTx } from "./db";
import { FigureSearch } from "./figure-search";

export type NewCollectionEntry = {
  id?: string;
  figureId: string;
  condition: Condition;
  accessoriesComplete: boolean;
  location?: string;
  notes?: string;
  dateAdded?: string;
};

export type CollectionPatch = Partial<
  Pick<
    CollectionEntry,
    "condition" | "accessoriesComplete" | "location" | "notes" | "dateAdded"
  >
>;

function cleanEntry(input: NewCollectionEntry): CollectionEntry {
  if (input.condition !== "loose" && input.condition !== "carded") {
    throw new Error("Condition must be loose or carded.");
  }
  if (!FigureSearch.get(input.figureId)) {
    throw new Error("That figure is not in the catalog.");
  }
  const dateAdded = normalizeISODate(input.dateAdded ?? todayISODate());
  if (!dateAdded) {
    throw new Error("Date added must be YYYY-MM-DD.");
  }
  return {
    id: input.id ?? crypto.randomUUID(),
    figureId: input.figureId,
    condition: input.condition,
    accessoriesComplete: Boolean(input.accessoriesComplete),
    location: (input.location ?? "").trim().slice(0, 120),
    notes: (input.notes ?? "").trim().slice(0, 2000),
    dateAdded,
  };
}

export class CollectionStore {
  static async list(): Promise<CollectionEntry[]> {
    const items = await readStore<CollectionEntry[]>("collection", (store) => store.getAll());
    return items ?? [];
  }

  static async get(id: string): Promise<CollectionEntry | undefined> {
    const item = await readStore<CollectionEntry | undefined>("collection", (store) => store.get(id));
    return item;
  }

  static async byFigure(figureId: string): Promise<CollectionEntry[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("collection", "readonly");
      const req = tx.objectStore("collection").index("byFigure").getAll(figureId);
      req.onsuccess = () => resolve(req.result as CollectionEntry[]);
      req.onerror = () => reject(req.error ?? new Error("Could not read collection."));
    });
  }

  static async add(input: NewCollectionEntry): Promise<CollectionEntry> {
    const entry = cleanEntry(input);
    await writeTx("collection", (tx) => {
      tx.objectStore("collection").put(entry);
    });
    return entry;
  }

  static async update(id: string, patch: CollectionPatch): Promise<CollectionEntry> {
    const existing = await CollectionStore.get(id);
    if (!existing) throw new Error("That collection entry is gone.");
    const next = cleanEntry({
      ...existing,
      ...patch,
      id: existing.id,
      figureId: existing.figureId,
    });
    await writeTx("collection", (tx) => {
      tx.objectStore("collection").put(next);
    });
    return next;
  }

  static async remove(id: string): Promise<void> {
    await writeTx("collection", (tx) => {
      tx.objectStore("collection").delete(id);
    });
  }

  static async clear(): Promise<void> {
    await writeTx("collection", (tx) => {
      tx.objectStore("collection").clear();
    });
  }
}
