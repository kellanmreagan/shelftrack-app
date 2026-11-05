import type { BackupFile, BackupPhoto, CollectionEntry, WishlistEntry } from "../types";
import { dataUrlToBlob, blobToDataUrl } from "./blob-url";
import { normalizeISODate } from "./dates";
import { writeTx } from "./db";
import { CollectionStore } from "./collection-store";
import { FigureSearch } from "./figure-search";
import { ImageStore } from "./image-store";
import { WishlistStore } from "./wishlist-store";

const MAX_ENTRIES = 5000;
const MAX_PHOTOS = 500;
const MAX_DATA_URL = 2_500_000;
const IMAGE_PREFIX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;

export type BackupValidation =
  | { ok: true; backup: BackupFile }
  | { ok: false; errors: string[] };

function pushError(errors: string[], message: string): void {
  if (errors.length < 12) errors.push(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class BackupService {
  static async exportAll(): Promise<BackupFile> {
    const [collection, wishlist, images] = await Promise.all([
      CollectionStore.list(),
      WishlistStore.list(),
      ImageStore.list(),
    ]);
    const photos: BackupPhoto[] = [];
    for (const image of images) {
      photos.push({
        figureId: image.figureId,
        dataUrl: await blobToDataUrl(image.blob),
        mime: image.mime || image.blob.type || "image/jpeg",
      });
    }
    return {
      app: "shelftrack",
      version: 1,
      exportedAt: new Date().toISOString(),
      scale: FigureSearch.meta().scale,
      collection,
      wishlist,
      photos,
    };
  }

  static parse(json: string): unknown {
    try {
      return JSON.parse(json) as unknown;
    } catch {
      throw new Error("That file is not valid JSON.");
    }
  }

  static validate(data: unknown): BackupValidation {
    const errors: string[] = [];
    if (!isRecord(data)) {
      return { ok: false, errors: ["Backup file must be a JSON object."] };
    }
    if (data.app !== "shelftrack") {
      pushError(errors, "This file is not a ShelfTrack backup.");
    }
    if (data.version !== 1) {
      pushError(errors, "Unsupported backup version. This app reads version 1.");
    }
    if (!Array.isArray(data.collection)) pushError(errors, "Missing collection array.");
    if (!Array.isArray(data.wishlist)) pushError(errors, "Missing wishlist array.");
    if (!Array.isArray(data.photos)) pushError(errors, "Missing photos array.");
    if (errors.length) return { ok: false, errors };

    const collection: CollectionEntry[] = [];
    const wishlist: WishlistEntry[] = [];
    const photos: BackupPhoto[] = [];
    const collectionIds = new Set<string>();
    const wishlistIds = new Set<string>();
    const wishlistFigures = new Set<string>();
    const photoFigures = new Set<string>();

    const collectionRaw = data.collection as unknown[];
    const wishlistRaw = data.wishlist as unknown[];
    const photosRaw = data.photos as unknown[];
    if (collectionRaw.length > MAX_ENTRIES || wishlistRaw.length > MAX_ENTRIES) {
      return { ok: false, errors: ["Backup has too many entries."] };
    }
    if (photosRaw.length > MAX_PHOTOS) {
      return { ok: false, errors: ["Backup has too many photos."] };
    }

    collectionRaw.forEach((item, index) => {
      const parsed = parseCollection(item, index, errors);
      if (!parsed) return;
      if (collectionIds.has(parsed.id)) {
        pushError(errors, `Duplicate collection id “${parsed.id}”.`);
        return;
      }
      collectionIds.add(parsed.id);
      collection.push(parsed);
    });

    wishlistRaw.forEach((item, index) => {
      const parsed = parseWishlist(item, index, errors);
      if (!parsed) return;
      if (wishlistIds.has(parsed.id)) {
        pushError(errors, `Duplicate wishlist id “${parsed.id}”.`);
        return;
      }
      if (wishlistFigures.has(parsed.figureId)) {
        pushError(errors, `Wishlist lists ${parsed.figureId} more than once.`);
        return;
      }
      wishlistIds.add(parsed.id);
      wishlistFigures.add(parsed.figureId);
      wishlist.push(parsed);
    });

    photosRaw.forEach((item, index) => {
      const parsed = parsePhoto(item, index, errors);
      if (!parsed) return;
      if (photoFigures.has(parsed.figureId)) {
        pushError(errors, `More than one photo for ${parsed.figureId}.`);
        return;
      }
      photoFigures.add(parsed.figureId);
      photos.push(parsed);
    });

    if (errors.length) {
      const extra = collectionRaw.length + wishlistRaw.length + photosRaw.length;
      if (extra > 0 && errors.length >= 12) {
        errors.push("More problems were hidden. Fix the file and try again.");
      }
      return { ok: false, errors };
    }

    return {
      ok: true,
      backup: {
        app: "shelftrack",
        version: 1,
        exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : new Date().toISOString(),
        scale: FigureSearch.meta().scale,
        collection,
        wishlist,
        photos,
      },
    };
  }

  static async importAll(data: unknown): Promise<{ collection: number; wishlist: number; photos: number }> {
    const validated = data && typeof data === "object" && "app" in data && "collection" in data
      ? BackupService.validate(data)
      : { ok: false as const, errors: ["Backup could not be read."] };
    if (!validated.ok) {
      throw new Error(validated.errors.join(" "));
    }
    const backup = validated.backup;
    const photoRecords = backup.photos.map((photo) => {
      const blob = dataUrlToBlob(photo.dataUrl, photo.mime);
      return {
        figureId: photo.figureId,
        blob,
        mime: blob.type,
        updatedAt: new Date().toISOString(),
      };
    });
    await writeTx(["collection", "wishlist", "images"], (tx) => {
      const collectionStore = tx.objectStore("collection");
      const wishlistStore = tx.objectStore("wishlist");
      const imageStore = tx.objectStore("images");
      collectionStore.clear();
      wishlistStore.clear();
      imageStore.clear();
      for (const entry of backup.collection) collectionStore.put(entry);
      for (const entry of backup.wishlist) wishlistStore.put(entry);
      for (const record of photoRecords) imageStore.put(record);
    });
    return {
      collection: backup.collection.length,
      wishlist: backup.wishlist.length,
      photos: backup.photos.length,
    };
  }

  static toJson(backup: BackupFile): string {
    return JSON.stringify(backup, null, 2);
  }
}

function requireString(value: unknown, label: string, errors: string[], max: number): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    pushError(errors, `${label} is missing.`);
    return null;
  }
  if (value.length > max) {
    pushError(errors, `${label} is too long.`);
    return null;
  }
  return value;
}

function parseCollection(item: unknown, index: number, errors: string[]): CollectionEntry | null {
  const label = `Collection item ${index + 1}`;
  if (!isRecord(item)) {
    pushError(errors, `${label} is not an object.`);
    return null;
  }
  const id = requireString(item.id, `${label} id`, errors, 80);
  const figureId = requireString(item.figureId, `${label} figure`, errors, 200);
  if (figureId && !FigureSearch.get(figureId)) {
    pushError(errors, `${label} has unknown figure id “${figureId}”.`);
  }
  if (item.condition !== "loose" && item.condition !== "carded") {
    pushError(errors, `${label} condition must be loose or carded.`);
  }
  if (typeof item.accessoriesComplete !== "boolean") {
    pushError(errors, `${label} accessoriesComplete must be true or false.`);
  }
  const location = typeof item.location === "string" ? item.location.trim().slice(0, 120) : null;
  const notes = typeof item.notes === "string" ? item.notes.trim().slice(0, 2000) : null;
  if (location === null) pushError(errors, `${label} location must be a string.`);
  if (notes === null) pushError(errors, `${label} notes must be a string.`);
  const dateAdded = typeof item.dateAdded === "string" ? normalizeISODate(item.dateAdded) : null;
  if (!dateAdded) pushError(errors, `${label} dateAdded must be a real calendar date.`);
  if (
    !id ||
    !figureId ||
    !FigureSearch.get(figureId) ||
    (item.condition !== "loose" && item.condition !== "carded") ||
    typeof item.accessoriesComplete !== "boolean" ||
    location === null ||
    notes === null ||
    !dateAdded
  ) {
    return null;
  }
  return {
    id,
    figureId,
    condition: item.condition,
    accessoriesComplete: item.accessoriesComplete,
    location,
    notes,
    dateAdded,
  };
}

function parseWishlist(item: unknown, index: number, errors: string[]): WishlistEntry | null {
  const label = `Wishlist item ${index + 1}`;
  if (!isRecord(item)) {
    pushError(errors, `${label} is not an object.`);
    return null;
  }
  const id = requireString(item.id, `${label} id`, errors, 80);
  const figureId = requireString(item.figureId, `${label} figure`, errors, 200);
  if (figureId && !FigureSearch.get(figureId)) {
    pushError(errors, `${label} has unknown figure id “${figureId}”.`);
  }
  const notes = typeof item.notes === "string" ? item.notes.trim().slice(0, 2000) : "";
  if (item.notes !== undefined && typeof item.notes !== "string") {
    pushError(errors, `${label} notes must be a string.`);
  }
  const dateAdded = typeof item.dateAdded === "string" ? normalizeISODate(item.dateAdded) : null;
  if (!dateAdded) pushError(errors, `${label} dateAdded must be a real calendar date.`);
  if (!id || !figureId || !FigureSearch.get(figureId) || !dateAdded || (item.notes !== undefined && typeof item.notes !== "string")) {
    return null;
  }
  return { id, figureId, notes, dateAdded };
}

function parsePhoto(item: unknown, index: number, errors: string[]): BackupPhoto | null {
  const label = `Photo ${index + 1}`;
  if (!isRecord(item)) {
    pushError(errors, `${label} is not an object.`);
    return null;
  }
  const figureId = requireString(item.figureId, `${label} figure`, errors, 200);
  if (figureId && !FigureSearch.get(figureId)) {
    pushError(errors, `${label} has unknown figure id “${figureId}”.`);
  }
  if (typeof item.dataUrl !== "string" || !IMAGE_PREFIX.test(item.dataUrl)) {
    pushError(errors, `${label} must be a base64 PNG, JPEG, WEBP, or GIF data URL.`);
    return null;
  }
  if (item.dataUrl.length > MAX_DATA_URL) {
    pushError(errors, `${label} is too large.`);
    return null;
  }
  const mime = typeof item.mime === "string" ? item.mime : item.dataUrl.slice(5, item.dataUrl.indexOf(";"));
  if (!mime.startsWith("image/")) {
    pushError(errors, `${label} mime type must be an image.`);
    return null;
  }
  if (!figureId || !FigureSearch.get(figureId)) return null;
  try {
    dataUrlToBlob(item.dataUrl, mime);
  } catch {
    pushError(errors, `${label} could not be decoded.`);
    return null;
  }
  return { figureId, dataUrl: item.dataUrl, mime };
}
