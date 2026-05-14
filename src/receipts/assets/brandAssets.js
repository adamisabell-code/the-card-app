import wordmarkUrl from "./brand/the-card-wordmark.png";

/** @type {HTMLImageElement | null} */
let wordmarkImage = null;

/** @type {Promise<HTMLImageElement | null> | null} */
let wordmarkPromise = null;

/**
 * Preloads the locked "THE CARD" wordmark once. Safe to call repeatedly.
 * Resolves `null` if the asset fails to load (receipt still renders without it).
 * @returns {Promise<HTMLImageElement | null>}
 */
export function loadCardWordmark() {
  if (wordmarkPromise) return wordmarkPromise;
  wordmarkPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      wordmarkImage = img;
      resolve(img);
    };
    img.onerror = () => {
      console.warn("[receipts] Failed to load the-card-wordmark.png; header wordmark omitted.");
      wordmarkImage = null;
      resolve(null);
    };
    img.src = wordmarkUrl;
  });
  return wordmarkPromise;
}

/**
 * Cached wordmark (`null` until `loadCardWordmark` completes successfully).
 * @returns {HTMLImageElement | null}
 */
export function getCardWordmark() {
  return wordmarkImage;
}
