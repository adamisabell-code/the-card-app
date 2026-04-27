/** @typedef {'neutral' | 'winner' | 'loser'} PortraitMode */

/**
 * Lean portrait bundle for Receipt — three cached URL variants (same identity).
 * @typedef {{
 *   rawImageUrl: string
 *   basePortraitUrl: string
 *   styledPortraits: { neutral: string, winner: string, loser: string }
 *   preferredMode: PortraitMode
 *   regenerateCount: number
 *   isPlaceholder?: boolean
 * }} PortraitBundle
 */

export const PORTRAIT_MODES = /** @type {const} */ (["neutral", "winner", "loser"]);

export const MAX_PORTRAIT_REGENERATES = 3;

/**
 * @param {PortraitBundle | null | undefined} bundle
 * @param {PortraitMode | null | undefined} displayModeOverride receipt context (e.g. round); omit to use `preferredMode`
 * @returns {string | null} URL for ReceiptCard, or null → use initials
 */
export function getReceiptPortraitUrl(bundle, displayModeOverride = null) {
  if (!bundle?.styledPortraits) return null;
  const mode = displayModeOverride ?? bundle.preferredMode ?? "neutral";
  const url = bundle.styledPortraits[mode];
  return url || bundle.styledPortraits.neutral || null;
}

/**
 * @param {string} name "Miller T." → "MT"
 */
export function initialsFromName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
