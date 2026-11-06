import type { ImageRecord } from "../types";
import { readStore, writeTx } from "./db";
import { FigureSearch } from "./figure-search";

export class ImageStore {
  static async list(): Promise<ImageRecord[]> {
    const items = await readStore<ImageRecord[]>("images", (store) => store.getAll());
    return items ?? [];
  }

  static async get(figureId: string): Promise<ImageRecord | undefined> {
    return readStore<ImageRecord | undefined>("images", (store) => store.get(figureId));
  }

  static async put(figureId: string, blob: Blob): Promise<ImageRecord> {
    if (!FigureSearch.get(figureId)) {
      throw new Error("That figure is not in the catalog.");
    }
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error("Photo was empty.");
    }
    const record: ImageRecord = {
      figureId,
      blob,
      mime: blob.type || "image/jpeg",
      updatedAt: new Date().toISOString(),
    };
    await writeTx("images", (tx) => {
      tx.objectStore("images").put(record);
    });
    return record;
  }

  static async remove(figureId: string): Promise<void> {
    await writeTx("images", (tx) => {
      tx.objectStore("images").delete(figureId);
    });
  }

  static async clear(): Promise<void> {
    await writeTx("images", (tx) => {
      tx.objectStore("images").clear();
    });
  }
}
