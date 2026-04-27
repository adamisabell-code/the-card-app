export const RECEIPT_THEME_IDS = {
  DEFAULT_DARK: "default-dark",
  TEAL_GLOW: "teal-glow",
  ORANGE_HIGH_STAKES: "orange-high-stakes",
};

export const DEFAULT_RECEIPT_THEME_ID = RECEIPT_THEME_IDS.DEFAULT_DARK;

/**
 * Theme metadata is intentionally flat and id-based so we can later extend with
 * unlock conditions (premium, season rewards, etc.) without changing receipt rendering.
 */
export const RECEIPT_THEMES = [
  { id: RECEIPT_THEME_IDS.DEFAULT_DARK, label: "Default (dark)", tier: "free" },
  { id: RECEIPT_THEME_IDS.TEAL_GLOW, label: "Teal glow", tier: "free" },
  { id: RECEIPT_THEME_IDS.ORANGE_HIGH_STAKES, label: "Orange high-stakes", tier: "free" },
];

export function normalizeReceiptThemeId(themeId) {
  return RECEIPT_THEMES.some((theme) => theme.id === themeId) ? themeId : DEFAULT_RECEIPT_THEME_ID;
}
