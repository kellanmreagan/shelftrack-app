import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BackupFile, CollectionEntry, Condition, WishlistEntry } from "../types";
import { BackupService } from "../lib/backup-service";
import { CollectionStore, type CollectionPatch } from "../lib/collection-store";
import { compressImageFile } from "../lib/compress-image";
import { ImageStore } from "../lib/image-store";
import { FigureSearch } from "../lib/figure-search";
import { WishlistStore } from "../lib/wishlist-store";
import { Toasts, type ToastItem } from "../components/Toasts";

type EntryDraft = {
  condition?: Condition;
  accessoriesComplete?: boolean;
  location?: string;
  notes?: string;
  dateAdded?: string;
  id?: string;
};

type ShelfContextValue = {
  collection: CollectionEntry[];
  wishlist: WishlistEntry[];
  photos: Record<string, string>;
  addToCollection: (figureId: string, draft?: EntryDraft) => Promise<void>;
  updateEntry: (id: string, patch: CollectionPatch) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  toggleWishlist: (figureId: string) => Promise<void>;
  removeWishlist: (id: string) => Promise<void>;
  acquireWishlist: (wishlistId: string, draft: EntryDraft) => Promise<void>;
  setPhoto: (figureId: string, file: File) => Promise<void>;
  removePhoto: (figureId: string) => Promise<void>;
  exportBackup: () => Promise<void>;
  commitImport: (backup: BackupFile) => Promise<void>;
  clearAll: () => Promise<void>;
};

const ShelfContext = createContext<ShelfContextValue | null>(null);

export function useShelf(): ShelfContextValue {
  const value = useContext(ShelfContext);
  if (!value) throw new Error("useShelf must be used inside ShelfProvider");
  return value;
}

function emptyBackup(): BackupFile {
  return {
    app: "shelftrack",
    version: 1,
    exportedAt: new Date().toISOString(),
    scale: FigureSearch.meta().scale,
    collection: [],
    wishlist: [],
    photos: [],
  };
}

export function ShelfProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());
  const listGen = useRef(0);
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, onUndo?: () => Promise<void>) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-1), { id, message, onUndo }]);
      const timer = window.setTimeout(() => dismiss(id), 8000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const undoToast = useCallback(
    async (id: string) => {
      const action = toastsRef.current.find((toast) => toast.id === id)?.onUndo;
      dismiss(id);
      if (!action) return;
      try {
        await action();
      } catch (error) {
        showToastRef.current(error instanceof Error ? error.message : "Could not undo.");
      }
    },
    [dismiss],
  );

  const loadLists = useCallback(async () => {
    const generation = ++listGen.current;
    const [nextCollection, nextWishlist] = await Promise.all([
      CollectionStore.list(),
      WishlistStore.list(),
    ]);
    if (generation !== listGen.current) return;
    setCollection(nextCollection);
    setWishlist(nextWishlist);
  }, []);

  const replacePhotos = useCallback(async () => {
    const images = await ImageStore.list();
    setPhotos((previous) => {
      for (const url of Object.values(previous)) URL.revokeObjectURL(url);
      const next: Record<string, string> = {};
      for (const image of images) next[image.figureId] = URL.createObjectURL(image.blob);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadLists();
        if (cancelled) return;
        await replacePhotos();
        if (cancelled) return;
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : "Could not open storage on this device.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLists, replacePhotos]);

  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active.values()) window.clearTimeout(timer);
    };
  }, []);

  const addToCollection = useCallback(
    async (figureId: string, draft: EntryDraft = {}) => {
      const figure = FigureSearch.get(figureId);
      if (!figure) return;
      const before = await CollectionStore.byFigure(figureId);
      const entry = await CollectionStore.add({
        id: draft.id,
        figureId,
        condition: draft.condition ?? "loose",
        accessoriesComplete: draft.accessoriesComplete ?? true,
        location: draft.location ?? "",
        notes: draft.notes ?? "",
        dateAdded: draft.dateAdded,
      });
      await loadLists();
      showToast(
        before.length > 0 ? `Added another ${figure.name}` : `Added ${figure.name} to your collection`,
        async () => {
          await CollectionStore.remove(entry.id);
          await loadLists();
        },
      );
    },
    [loadLists, showToast],
  );

  const updateEntry = useCallback(
    async (id: string, patch: CollectionPatch) => {
      const previous = await CollectionStore.get(id);
      if (!previous) {
        showToast("That figure is no longer in your collection.");
        await loadLists();
        return;
      }
      await CollectionStore.update(id, patch);
      await loadLists();
      showToast("Saved changes", async () => {
        await CollectionStore.add(previous);
        await loadLists();
      });
    },
    [loadLists, showToast],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      const previous = await CollectionStore.get(id);
      if (!previous) return;
      const figure = FigureSearch.get(previous.figureId);
      await CollectionStore.remove(id);
      await loadLists();
      showToast(`Removed ${figure?.name ?? "figure"}`, async () => {
        await CollectionStore.add(previous);
        await loadLists();
      });
    },
    [loadLists, showToast],
  );

  const toggleWishlist = useCallback(
    async (figureId: string) => {
      const figure = FigureSearch.get(figureId);
      if (!figure) return;
      const existing = await WishlistStore.byFigure(figureId);
      if (existing) {
        await WishlistStore.remove(existing.id);
        await loadLists();
        showToast(`Removed ${figure.name} from wishlist`, async () => {
          await WishlistStore.add(existing);
          await loadLists();
        });
        return;
      }
      const entry = await WishlistStore.add({ figureId });
      await loadLists();
      showToast(`Saved ${figure.name} to wishlist`, async () => {
        await WishlistStore.remove(entry.id);
        await loadLists();
      });
    },
    [loadLists, showToast],
  );

  const removeWishlist = useCallback(
    async (id: string) => {
      const previous = await WishlistStore.get(id);
      if (!previous) return;
      const figure = FigureSearch.get(previous.figureId);
      await WishlistStore.remove(id);
      await loadLists();
      showToast(`Removed ${figure?.name ?? "figure"} from wishlist`, async () => {
        await WishlistStore.add(previous);
        await loadLists();
      });
    },
    [loadLists, showToast],
  );

  const acquireWishlist = useCallback(
    async (wishlistId: string, draft: EntryDraft) => {
      const wish = await WishlistStore.get(wishlistId);
      if (!wish) {
        showToast("That wish is no longer saved.");
        await loadLists();
        return;
      }
      const figure = FigureSearch.get(wish.figureId);
      const entry = await CollectionStore.add({
        figureId: wish.figureId,
        condition: draft.condition ?? "loose",
        accessoriesComplete: draft.accessoriesComplete ?? true,
        location: draft.location ?? "",
        notes: draft.notes ?? wish.notes,
        dateAdded: draft.dateAdded,
      });
      await WishlistStore.remove(wish.id);
      await loadLists();
      showToast(`Moved ${figure?.name ?? "figure"} into your collection`, async () => {
        await CollectionStore.remove(entry.id);
        await WishlistStore.add(wish);
        await loadLists();
      });
    },
    [loadLists, showToast],
  );

  const setPhoto = useCallback(
    async (figureId: string, file: File) => {
      if (!FigureSearch.get(figureId)) return;
      try {
        const previous = await ImageStore.get(figureId);
        const blob = await compressImageFile(file);
        await ImageStore.put(figureId, blob);
        const url = URL.createObjectURL(blob);
        setPhotos((current) => {
          const next = { ...current };
          if (next[figureId]) URL.revokeObjectURL(next[figureId]);
          next[figureId] = url;
          return next;
        });
        showToast("Photo saved on this device", async () => {
          if (previous) {
            await ImageStore.put(figureId, previous.blob);
            const restored = URL.createObjectURL(previous.blob);
            setPhotos((current) => {
              const next = { ...current };
              if (next[figureId]) URL.revokeObjectURL(next[figureId]);
              next[figureId] = restored;
              return next;
            });
          } else {
            await ImageStore.remove(figureId);
            setPhotos((current) => {
              if (!current[figureId]) return current;
              URL.revokeObjectURL(current[figureId]);
              const next = { ...current };
              delete next[figureId];
              return next;
            });
          }
        });
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not save that photo.");
      }
    },
    [showToast],
  );

  const removePhoto = useCallback(
    async (figureId: string) => {
      const previous = await ImageStore.get(figureId);
      if (!previous) return;
      await ImageStore.remove(figureId);
      setPhotos((current) => {
        if (!current[figureId]) return current;
        URL.revokeObjectURL(current[figureId]);
        const next = { ...current };
        delete next[figureId];
        return next;
      });
      showToast("Removed your photo", async () => {
        await ImageStore.put(figureId, previous.blob);
        const restored = URL.createObjectURL(previous.blob);
        setPhotos((current) => ({ ...current, [figureId]: restored }));
      });
    },
    [showToast],
  );

  const exportBackup = useCallback(async () => {
    const backup = await BackupService.exportAll();
    const blob = new Blob([BackupService.toJson(backup)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shelftrack-backup-${backup.exportedAt.slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded");
  }, [showToast]);

  const commitImport = useCallback(
    async (backup: BackupFile) => {
      const snapshot = await BackupService.exportAll();
      await BackupService.importAll(backup);
      await loadLists();
      await replacePhotos();
      showToast("Backup restored on this device", async () => {
        await BackupService.importAll(snapshot);
        await loadLists();
        await replacePhotos();
      });
    },
    [loadLists, replacePhotos, showToast],
  );

  const clearAll = useCallback(async () => {
    const snapshot = await BackupService.exportAll();
    await BackupService.importAll(emptyBackup());
    await loadLists();
    await replacePhotos();
    showToast("Cleared collection, wishlist, and photos", async () => {
      await BackupService.importAll(snapshot);
      await loadLists();
      await replacePhotos();
    });
  }, [loadLists, replacePhotos, showToast]);

  const value = useMemo<ShelfContextValue>(
    () => ({
      collection,
      wishlist,
      photos,
      addToCollection,
      updateEntry,
      removeEntry,
      toggleWishlist,
      removeWishlist,
      acquireWishlist,
      setPhoto,
      removePhoto,
      exportBackup,
      commitImport,
      clearAll,
    }),
    [
      collection,
      wishlist,
      photos,
      addToCollection,
      updateEntry,
      removeEntry,
      toggleWishlist,
      removeWishlist,
      acquireWishlist,
      setPhoto,
      removePhoto,
      exportBackup,
      commitImport,
      clearAll,
    ],
  );

  if (bootError) {
    return (
      <div className="boot" role="alert">
        <p className="brand-mark" aria-hidden="true">
          St
        </p>
        <h1>Storage is unavailable</h1>
        <p>{bootError}</p>
        <p>ShelfTrack keeps your shelf in this browser. Private mode can block it.</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="boot" role="status">
        <p className="brand-mark" aria-hidden="true">
          St
        </p>
        <p>Opening your shelf…</p>
      </div>
    );
  }

  return (
    <ShelfContext.Provider value={value}>
      {children}
      <Toasts toasts={toasts} onDismiss={dismiss} onUndo={(id) => void undoToast(id)} />
    </ShelfContext.Provider>
  );
}
