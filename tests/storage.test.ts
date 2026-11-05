import { describe, expect, it } from "vitest";
import { BackupService } from "../src/lib/backup-service";
import { blobToDataUrl } from "../src/lib/blob-url";
import { CollectionStore } from "../src/lib/collection-store";
import { ImageStore } from "../src/lib/image-store";
import { WishlistStore } from "../src/lib/wishlist-store";
import { useFreshDb } from "./db";

const LUKE = "kenner-1978-1985-luke-skywalker-1978";
const CHOPPER = "the-vintage-collection-VC304-2024";

describe("stores", () => {
  useFreshDb();

  it("adds, updates, lists, and removes collection entries", async () => {
    const added = await CollectionStore.add({
      figureId: LUKE,
      condition: "loose",
      accessoriesComplete: false,
      location: "  Hall shelf  ",
      notes: "Cape missing",
    });
    expect(added.location).toBe("Hall shelf");
    expect(added.dateAdded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const again = await CollectionStore.add({
      figureId: LUKE,
      condition: "carded",
      accessoriesComplete: true,
      dateAdded: "2020-05-04",
    });
    expect(again.id).not.toBe(added.id);
    const updated = await CollectionStore.update(added.id, {
      condition: "carded",
      accessoriesComplete: true,
      location: "Bin 3",
    });
    expect(updated.condition).toBe("carded");
    expect(updated.location).toBe("Bin 3");
    expect(await CollectionStore.byFigure(LUKE)).toHaveLength(2);
    await CollectionStore.remove(again.id);
    expect(await CollectionStore.list()).toHaveLength(1);
    await expect(
      CollectionStore.add({
        figureId: "not-a-real-figure",
        condition: "loose",
        accessoriesComplete: true,
      }),
    ).rejects.toThrow(/catalog/);
  });

  it("keeps one wishlist row per figure", async () => {
    const first = await WishlistStore.add({ figureId: CHOPPER, notes: "Need a loose one" });
    const second = await WishlistStore.add({ figureId: CHOPPER });
    expect(second.id).toBe(first.id);
    expect(await WishlistStore.list()).toHaveLength(1);
    await WishlistStore.remove(first.id);
    expect(await WishlistStore.list()).toHaveLength(0);
    const restored = await WishlistStore.add(first);
    expect(restored.id).toBe(first.id);
  });

  it("stores and removes a user photo blob", async () => {
    const bytes = Uint8Array.from([1, 2, 3, 4, 5, 9]);
    const blob = new Blob([bytes], { type: "image/png" });
    await ImageStore.put(LUKE, blob);
    const stored = await ImageStore.get(LUKE);
    expect(stored?.mime).toBe("image/png");
    expect(new Uint8Array(await stored!.blob.arrayBuffer())).toEqual(bytes);
    await ImageStore.remove(LUKE);
    expect(await ImageStore.get(LUKE)).toBeUndefined();
  });
});

describe("BackupService", () => {
  useFreshDb();

  it("round-trips collection, wishlist, and photos", async () => {
    await CollectionStore.add({
      id: "col-1",
      figureId: LUKE,
      condition: "loose",
      accessoriesComplete: false,
      location: "Desk",
      notes: "Yellowed card",
      dateAdded: "2024-02-03",
    });
    await WishlistStore.add({
      id: "wish-1",
      figureId: CHOPPER,
      notes: "",
      dateAdded: "2024-03-04",
    });
    const photo = new Blob([Uint8Array.from([9, 8, 7, 6])], { type: "image/png" });
    await ImageStore.put(LUKE, photo);

    const exported = await BackupService.exportAll();
    const parsed = BackupService.parse(BackupService.toJson(exported));
    const validated = BackupService.validate(parsed);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    await CollectionStore.clear();
    await WishlistStore.clear();
    await ImageStore.clear();
    expect(await CollectionStore.list()).toHaveLength(0);

    const result = await BackupService.importAll(validated.backup);
    expect(result).toEqual({ collection: 1, wishlist: 1, photos: 1 });
    const [collection, wishlist, image] = await Promise.all([
      CollectionStore.list(),
      WishlistStore.list(),
      ImageStore.get(LUKE),
    ]);
    expect(collection).toEqual([
      {
        id: "col-1",
        figureId: LUKE,
        condition: "loose",
        accessoriesComplete: false,
        location: "Desk",
        notes: "Yellowed card",
        dateAdded: "2024-02-03",
      },
    ]);
    expect(wishlist[0]?.figureId).toBe(CHOPPER);
    expect(new Uint8Array(await image!.blob.arrayBuffer())).toEqual(Uint8Array.from([9, 8, 7, 6]));
  });

  it("rejects invalid backups", async () => {
    expect(BackupService.validate(null).ok).toBe(false);
    expect(BackupService.validate({ app: "other", version: 1 }).ok).toBe(false);
    const badFigure = BackupService.validate({
      app: "shelftrack",
      version: 1,
      collection: [
        {
          id: "x",
          figureId: "nope",
          condition: "mint",
          accessoriesComplete: "yes",
          location: "",
          notes: "",
          dateAdded: "2020-01-01",
        },
      ],
      wishlist: [],
      photos: [],
    });
    expect(badFigure.ok).toBe(false);
    if (!badFigure.ok) {
      expect(badFigure.errors.join(" ")).toMatch(/unknown figure/i);
      expect(badFigure.errors.join(" ")).toMatch(/condition/i);
    }
    const badPhoto = BackupService.validate({
      app: "shelftrack",
      version: 1,
      collection: [],
      wishlist: [],
      photos: [{ figureId: LUKE, dataUrl: "https://example.com/a.jpg", mime: "image/jpeg" }],
    });
    expect(badPhoto.ok).toBe(false);

    const dataUrl = await blobToDataUrl(new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" }));
    const goodPhoto = BackupService.validate({
      app: "shelftrack",
      version: 1,
      collection: [],
      wishlist: [],
      photos: [{ figureId: LUKE, dataUrl, mime: "image/png" }],
    });
    expect(goodPhoto.ok).toBe(true);
    expect(() => BackupService.parse("{")).toThrow(/JSON/);
  });
});
