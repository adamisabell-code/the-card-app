/**
 * Single source of truth for round game formats (labels, receipt copy, UX strings).
 * @module
 */

/** @typedef {"stroke" | "match" | "skins" | "nassau" | "wolf"} RoundFormatId */

/** @type {RoundFormatId[]} */
export const ROUND_FORMAT_IDS = ["stroke", "match", "skins", "nassau", "wolf"];

/**
 * Full format metadata. Keys must match `RoundFormatId`.
 * @type {Record<RoundFormatId, {
 *   label: string
 *   shortLabel: string
 *   description: string
 *   receiptExamples: string[]
 * }>}
 */
export const GAME_FORMATS = {
  stroke: {
    label: "Stroke Play",
    shortLabel: "Stroke",
    description: "Lowest score wins. Simple.",
    receiptExamples: [
      "LOWEST NUMBER. LOUDEST RECEIPT.",
      "SHOT 84. MADE THEM SIGN THE CARD.",
      "NO MATCHES. NO EXCUSES. JUST SCORE.",
    ],
  },
  match: {
    label: "Match Play",
    shortLabel: "Match",
    description: "Win holes. Close them out.",
    receiptExamples: ["DOG WALKED THEM 4&3.", "NEVER HAD HIM."],
  },
  skins: {
    label: "Skins",
    shortLabel: "Skins",
    description: "Every hole is worth something.",
    receiptExamples: ["TOOK ALL THE SKINS.", "ONE HOLE. ALL THE MONEY."],
  },
  nassau: {
    label: "Nassau",
    shortLabel: "Nassau",
    description: "Front. Back. Total.",
    receiptExamples: ["FRONT. BACK. TOTAL.", "CLEAN SWEEP."],
  },
  wolf: {
    label: "Wolf",
    shortLabel: "Wolf",
    description: "Chaos mode for the brave.",
    receiptExamples: ["CALLED LONE WOLF. CASHED IT.", "THE WOLF ATE."],
  },
};

/**
 * @param {unknown} v
 * @returns {RoundFormatId}
 */
export function normalizeRoundFormat(v) {
  const s = String(v ?? "").toLowerCase();
  if (ROUND_FORMAT_IDS.includes(/** @type {RoundFormatId} */ (s))) return /** @type {RoundFormatId} */ (s);
  return "wolf";
}

/**
 * Receipt header line: `FORMAT: STROKE PLAY`
 * @param {unknown} formatId
 */
export function formatReceiptLine(formatId) {
  const id = normalizeRoundFormat(formatId);
  return `FORMAT: ${GAME_FORMATS[id].label.toUpperCase()}`;
}

/**
 * Deterministic headline pull from config examples (stable per player id).
 * @param {unknown} formatId
 * @param {string} [seedStr]
 */
export function pickReceiptExampleHeadline(formatId, seedStr = "p-0") {
  const id = normalizeRoundFormat(formatId);
  const examples = GAME_FORMATS[id].receiptExamples;
  let h = 0;
  const s = String(seedStr ?? "p-0");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return examples[h % examples.length];
}
