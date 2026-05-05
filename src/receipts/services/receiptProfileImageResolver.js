import { RECEIPT_PORTRAIT_PLACEHOLDER_PATH, loadStoredPortraitBundle } from "./profilePortraitService.js";

const PORTRAIT_LAYER_CACHE_KEY = "the-card-portrait-layer-cache-v1";

function readLayerCache() {
  try {
    const raw = localStorage.getItem(PORTRAIT_LAYER_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Resolves a receipt-safe profile image path in this order:
 * 1) uploaded profile photo
 * 2) cached/generated portrait layer
 * 3) stored stylized portrait
 * 4) placeholder avatar
 *
 * @param {{
 *  playerId?: string,
 *  mood?: "winner" | "neutral" | "sadMad" | "callout",
 *  portraitBundle?: import("../../portrait/types.js").PortraitBundle | null,
 *  explicitPath?: string | null,
 * }} input
 * @returns {Promise<string>}
 */
export async function resolveReceiptProfileImage(input) {
  const playerId = input.playerId ?? "p-0";
  const mood = input.mood ?? "neutral";
  const explicitPath = input.explicitPath?.trim() ?? "";
  if (explicitPath) return explicitPath;

  const bundle = input.portraitBundle ?? null;
  const uploadedPath = bundle?.rawImageUrl?.trim() ?? "";
  if (uploadedPath) return uploadedPath;

  const cache = readLayerCache();
  const cachedLayer = cache?.[`${playerId}::${mood}`]?.url;
  if (typeof cachedLayer === "string" && cachedLayer.trim()) return cachedLayer;

  if (bundle?.styledPortraits) {
    const stylized =
      (mood === "winner" && bundle.styledPortraits.winner) ||
      (mood === "sadMad" && bundle.styledPortraits.loser) ||
      bundle.styledPortraits.neutral ||
      bundle.styledPortraits.winner;
    if (stylized?.trim()) return stylized;
  }

  const stored = await loadStoredPortraitBundle();
  if (stored?.styledPortraits) {
    const storedStylized =
      (mood === "winner" && stored.styledPortraits.winner) ||
      (mood === "sadMad" && stored.styledPortraits.loser) ||
      stored.styledPortraits.neutral ||
      stored.styledPortraits.winner;
    if (storedStylized?.trim()) return storedStylized;
  }
  if (stored?.rawImageUrl?.trim()) return stored.rawImageUrl;

  console.warn("[receipt-pipeline] using placeholder receipt profile image", { playerId, mood });
  return RECEIPT_PORTRAIT_PLACEHOLDER_PATH;
}
