const DB_NAME = "shelftrack";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function createStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains("collection")) {
    const collection = db.createObjectStore("collection", { keyPath: "id" });
    collection.createIndex("byFigure", "figureId", { unique: false });
  }
  if (!db.objectStoreNames.contains("wishlist")) {
    const wishlist = db.createObjectStore("wishlist", { keyPath: "id" });
    wishlist.createIndex("byFigure", "figureId", { unique: true });
  }
  if (!db.objectStoreNames.contains("images")) {
    db.createObjectStore("images", { keyPath: "figureId" });
  }
}

export function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        createStores(req.result);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbPromise = null;
        reject(req.error ?? new Error("Could not open ShelfTrack storage."));
      };
    });
  }
  return dbPromise;
}

export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.onversionchange = null;
  db.close();
  dbPromise = null;
}

export function deleteDatabaseForTests(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("deleteDatabase failed"));
    req.onblocked = () => resolve();
  });
}

export function writeTx(
  storeNames: string | string[],
  run: (tx: IDBTransaction) => void,
): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeNames, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
        tx.onerror = () => reject(tx.error ?? new Error("Transaction failed"));
        try {
          run(tx);
        } catch (error) {
          reject(error);
        }
      }),
  );
}

export function readStore<T>(
  storeName: string,
  read: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = read(tx.objectStore(storeName));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Read failed"));
      }),
  );
}
