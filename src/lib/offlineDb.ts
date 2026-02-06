/**
 * IndexedDB layer for offline spaced repetition reviews.
 * Database: offe-orunmila-offline, version 1
 * Stores:
 *   - spaced_items: cached copy of user's spaced_repetition_items
 *   - pending_reviews: queue of reviews done while offline
 */

const DB_NAME = 'offe-orunmila-offline';
const DB_VERSION = 1;
const STORE_ITEMS = 'spaced_items';
const STORE_PENDING = 'pending_reviews';

export interface PendingReview {
  itemId: string;
  wasCorrect: boolean;
  timestamp: number;
  calculatedUpdate: {
    next_review_at: string;
    interval_days: number;
    ease_factor: number;
    repetitions: number;
    total_reviews: number;
    correct_reviews: number;
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheSpacedItems(items: any[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_ITEMS, 'readwrite');
  const store = tx.objectStore(STORE_ITEMS);

  // Clear existing and add new
  store.clear();
  items.forEach((item) => store.put(item));

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getCachedSpacedItems(): Promise<any[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_ITEMS, 'readonly');
  const store = tx.objectStore(STORE_ITEMS);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function updateCachedItem(id: string, updates: Partial<any>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_ITEMS, 'readwrite');
  const store = tx.objectStore(STORE_ITEMS);
  const getReq = store.get(id);

  return new Promise((resolve, reject) => {
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        store.put({ ...item, ...updates });
      }
      tx.oncomplete = () => { db.close(); resolve(); };
    };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function addPendingReview(review: PendingReview): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_PENDING, 'readwrite');
  tx.objectStore(STORE_PENDING).add(review);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getPendingReviews(): Promise<PendingReview[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_PENDING, 'readonly');
  const request = tx.objectStore(STORE_PENDING).getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => { db.close(); resolve(request.result || []); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function clearPendingReviews(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_PENDING, 'readwrite');
  tx.objectStore(STORE_PENDING).clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(STORE_PENDING, 'readonly');
  const request = tx.objectStore(STORE_PENDING).count();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => { db.close(); resolve(request.result); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
