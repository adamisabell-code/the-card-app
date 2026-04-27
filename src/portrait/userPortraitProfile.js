/**
 * Cached user receipt portraits — **not** regenerated per receipt.
 * Persists original upload + three styled variants (winner / neutral / loser) in IndexedDB
 * so the same identity anchor is reused until the user changes their photo or explicitly regenerates.
 *
 * @typedef {{
 *   version: 1
 *   sourceFingerprint: string
 *   originalMime: string
 *   originalBuf: ArrayBuffer
 *   baseBuf: ArrayBuffer
 *   styledNeutralBuf: ArrayBuffer
 *   styledWinnerBuf: ArrayBuffer
 *   styledLoserBuf: ArrayBuffer
 *   preferredMode: import('./types.js').PortraitMode
 *   regenerateCount: number
 *   styledVillainBuf?: ArrayBuffer
 * }} PersistedPortraitRecord
 *
 * @module
 */

const DB_NAME = "the-card-app";
const DB_VERSION = 1;
const STORE = "userPortraitProfile";
const RECORD_KEY = "v1";

/**
 * @param {File} file
 * @returns {string}
 */
export function fingerprintForFile(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

/**
 * @returns {Promise<PersistedPortraitRecord | null>}
 */
export async function loadPersistedPortraitProfile() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(RECORD_KEY);
      r.onerror = () => reject(r.error);
      r.onsuccess = () => resolve(r.result ?? null);
    });
  } catch {
    return null;
  }
}

/**
 * @param {PersistedPortraitRecord} record
 */
export async function savePersistedPortraitProfile(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record, RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function blobUrlToArrayBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not read portrait bytes for save.");
  return res.arrayBuffer();
}

function bufToObjectUrl(buf, mime) {
  return URL.createObjectURL(new Blob([buf], { type: mime || "image/webp" }));
}

/**
 * @param {import('./types.js').PortraitBundle} bundle
 * @param {File | null} file source upload; null when persisting after regenerate only
 * @param {PersistedPortraitRecord | null} [existing]
 */
export async function buildPersistedRecordFromBundle(bundle, file, existing = null) {
  const originalMime = file?.type || existing?.originalMime || "image/jpeg";
  const originalBuf = file
    ? await file.arrayBuffer()
    : existing?.originalBuf ?? (await blobUrlToArrayBuffer(bundle.rawImageUrl));
  const fingerprint = file ? fingerprintForFile(file) : existing?.sourceFingerprint ?? "";
  const [baseBuf, nBuf, wBuf, lBuf] = await Promise.all([
    blobUrlToArrayBuffer(bundle.basePortraitUrl),
    blobUrlToArrayBuffer(bundle.styledPortraits.neutral),
    blobUrlToArrayBuffer(bundle.styledPortraits.winner),
    blobUrlToArrayBuffer(bundle.styledPortraits.loser),
  ]);
  return {
    version: 1,
    sourceFingerprint: fingerprint,
    originalMime,
    originalBuf,
    baseBuf,
    styledNeutralBuf: nBuf,
    styledWinnerBuf: wBuf,
    styledLoserBuf: lBuf,
    preferredMode: bundle.preferredMode,
    regenerateCount: bundle.regenerateCount,
  };
}

/**
 * @param {PersistedPortraitRecord} record
 * @returns {Promise<import('./types.js').PortraitBundle>}
 */
export async function hydrateBundleFromPersistedRecord(record) {
  if (!record || record.version !== 1) {
    throw new Error("Invalid persisted portrait record.");
  }
  const loserBuf = record.styledLoserBuf ?? /** @type {any} */ (record).styledVillainBuf;
  if (!loserBuf) {
    throw new Error("Missing loser portrait in persisted record.");
  }
  return {
    rawImageUrl: bufToObjectUrl(record.originalBuf, record.originalMime),
    basePortraitUrl: bufToObjectUrl(record.baseBuf, "image/webp"),
    styledPortraits: {
      neutral: bufToObjectUrl(record.styledNeutralBuf, "image/webp"),
      winner: bufToObjectUrl(record.styledWinnerBuf, "image/webp"),
      loser: bufToObjectUrl(loserBuf, "image/webp"),
    },
    preferredMode: record.preferredMode ?? "neutral",
    regenerateCount: record.regenerateCount ?? 0,
  };
}
