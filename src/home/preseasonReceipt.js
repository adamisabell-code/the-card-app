/**
 * Preseason / “First Receipt Kit” — separate from post-round (game) receipts.
 * @module
 */

const SNAPSHOT_KEY = "the-card-preseason-receipt-v1";

/**
 * @typedef {'joined' | 'callout' | 'ready'} PreseasonReceiptTypeId
 */

/**
 * @typedef {{
 *   typeId: PreseasonReceiptTypeId
 *   playerName: string
 *   stamp: string
 *   flavor: string
 *   amountLabel: string
 *   badges: string[]
 *   savedAt: number
 * }} PreseasonReceiptSnapshot
 */

export const PRESEASON_RECEIPT_TYPES = /** @type {const} */ [
  {
    id: "joined",
    label: "Joined the League",
    stamp: "SEASON ONE LOCKED",
    flavor: "I'm in. You better be too.",
  },
  {
    id: "callout",
    label: "Callout",
    stamp: "YOU'VE BEEN CALLED OUT",
    flavor: "I joined this league so I can beat you. Don't hide.",
  },
  {
    id: "ready",
    label: "Ready for Anyone",
    stamp: "ANYONE CAN GET IT",
    flavor: "I'm ready for whoever shows up.",
  },
];

/** Display line (not stake money) — matches receipt row styling. */
export const PRESEASON_AMOUNT_LABEL = "S1 · CHALLENGE";

export const PRESEASON_BADGES = Object.freeze(["Preseason", "The Card"]);

/**
 * @param {string} id
 * @returns {typeof PRESEASON_RECEIPT_TYPES[number] | null}
 */
export function getPreseasonTypeById(id) {
  return PRESEASON_RECEIPT_TYPES.find((t) => t.id === id) ?? null;
}

/**
 * @param {PreseasonReceiptSnapshot} snap
 */
export function savePreseasonReceiptSnapshot(snap) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    /* ignore quota */
  }
}

/**
 * @returns {PreseasonReceiptSnapshot | null}
 */
export function loadPreseasonReceiptSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.typeId !== "string" || typeof o.playerName !== "string") return null;
    if (!getPreseasonTypeById(o.typeId)) return null;
    return {
      typeId: o.typeId,
      playerName: o.playerName,
      stamp: typeof o.stamp === "string" ? o.stamp : "",
      flavor: typeof o.flavor === "string" ? o.flavor : "",
      amountLabel: typeof o.amountLabel === "string" ? o.amountLabel : PRESEASON_AMOUNT_LABEL,
      badges: Array.isArray(o.badges) ? o.badges : [...PRESEASON_BADGES],
      savedAt: typeof o.savedAt === "number" ? o.savedAt : 0,
    };
  } catch {
    return null;
  }
}
