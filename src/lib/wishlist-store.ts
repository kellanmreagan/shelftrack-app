import type { WishlistEntry } from "../types";
import { normalizeISODate, todayISODate } from "./dates";
import { openDb, readStore, writeTx } from "./db";
import { FigureSearch } from "./figure-search";

export type NewWishlistEntry = {
  id?: string;
  figureId: string;
  notes?: string;
  dateAdded?: string;
};

function clean(input: NewWishlistEntry): WishlistEntry {
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
    notes: (input.notes ?? "").trim().slice(0, 2000),
    dateAdded,
  };
}

export class WishlistStore {
  static async list(): Promise<WishlistEntry[]> {
    const items = await readStore<WishlistEntry[]>("wishlist", (store) => store.getAll());
    return items ?? [];
  }

  static async get(id: string): Promise<WishlistEntry | undefined> {
    return readStore<WishlistEntry | undefined>("wishlist", (store) => store.get(id));
  }

  static async byFigure(figureId: string): Promise<WishlistEntry | undefined> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("wishlist", "readonly");
      const req = tx.objectStore("wishlist").index("byFigure").get(figureId);
      req.onsuccess = () => resolve(req.result as WishlistEntry | undefined);
      req.onerror = () => reject(req.error ?? new Error("Could not read wishlist."));
    });
  }

  static async add(input: NewWishlistEntry): Promise<WishlistEntry> {
    const existing = await WishlistStore.byFigure(input.figureId);
    if (existing && existing.id !== input.id) return existing;
    const entry = clean(input);
    await writeTx("wishlist", (tx) => {
      tx.objectStore("wishlist").put(entry);
    });
    return entry;
  }

  static async remove(id: string): Promise<void> {
    await writeTx("wishlist", (tx) => {
      tx.objectStore("wishlist").delete(id);
    });
  }

  static async clear(): Promise<void> {
    await writeTx("wishlist", (tx) => {
      tx.objectStore("wishlist").clear();
    });
  }
}
