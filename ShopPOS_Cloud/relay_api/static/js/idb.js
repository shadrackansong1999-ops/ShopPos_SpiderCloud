// ShopPOS Cloud - local offline database (IndexedDB)
//
// Separate from the service worker's HTTP cache: this is a real,
// structured, queryable database living in the browser, used to keep the
// last-known dashboard data available when the device is offline or the
// relay is unreachable, including after fully closing and reopening the
// installed app. Each dashboard endpoint's last successful response is
// stored keyed by its exact request URL.

const IDB_NAME = "shoppos-cloud";
const IDB_VERSION = 1;
const IDB_STORE = "api-cache";

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) { reject(new Error("IndexedDB unavailable")); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(url, data) {
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put({ url, data, ts: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    // Offline storage is a nice-to-have, not load-bearing - a failure
    // here should never break the live request that triggered it.
  }
}

async function idbGet(url) {
  try {
    const db = await idbOpen();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch (e) {
    return null;
  }
}
