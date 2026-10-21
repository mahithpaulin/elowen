/**
 * Small hand-rolled IndexedDB wrapper — zero dependencies.
 * All learner data stays in the browser. localStorage ONLY for settings.
 */

export const DB_NAME = 'elowen';
export const DB_VERSION = 1;

export type StoreName =
  | 'events'
  | 'lessons'
  | 'srs'
  | 'handwriting'
  | 'speaking'
  | 'reading'
  | 'kv';

export interface HandwrittenOpen {
  db: IDBDatabase;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('events')) {
        const s = db.createObjectStore('events', { keyPath: 'id' });
        s.createIndex('ts', 'ts');
        s.createIndex('kind', 'kind');
      }
      for (const name of ['lessons', 'srs', 'reading', 'handwriting', 'speaking', 'kv'] as StoreName[]) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, name === 'kv' ? undefined : { keyPath: keyFor(name) });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
  return dbPromise;
}

function keyFor(name: StoreName): string | null {
  switch (name) {
    case 'lessons':
      return 'lessonId';
    case 'srs':
      return 'wordId';
    case 'reading':
      return 'passageId';
    case 'handwriting':
      return 'id';
    case 'speaking':
      return 'id';
    default:
      return null;
  }
}

/** All records of a store as an array. */
export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error ?? new Error('getAll failed'));
  });
}

export async function get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error ?? new Error('get failed'));
  });
}

export async function put<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('put failed'));
  });
}

export async function putBulk<T>(store: StoreName, values: T[]): Promise<void> {
  if (!values.length) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const v of values) os.put(v);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('putBulk failed'));
  });
}

export async function deleteKey(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('delete failed'));
  });
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('clear failed'));
  });
}

export async function wipeAll(): Promise<void> {
  for (const s of ['events', 'lessons', 'srs', 'handwriting', 'speaking', 'reading', 'kv'] as StoreName[]) {
    await clearStore(s);
  }
}
