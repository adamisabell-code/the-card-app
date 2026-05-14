/**
 * Coded 1024×1536 round receipt — deterministic template + WIN or DOWN BAD canvas.
 */

import { buildReceiptTemplateFromRound } from "../templates/buildReceiptTemplateFromRound.js";
import { renderDownBadReceiptToDataUrl } from "../templates/renderDownBadReceiptTemplate.js";
import { renderWinReceiptToDataUrl } from "../templates/renderWinReceiptTemplate.js";
import { isWolfHeadReceiptPortraitUrl } from "./profilePortraitService.js";

/**
 * @typedef {import('../../game/types.js').GamePlayer} GamePlayer
 */

/**
 * @param {{ qrUrl?: string | null }} round
 */
function defaultQrUrl(round) {
  const r = round?.qrUrl;
  if (typeof r === "string" && r.trim()) return r.trim();
  if (typeof window !== "undefined" && window.location?.origin) return `${window.location.origin}/`;
  return "https://thecard.local/";
}

/**
 * Highest table money ⇒ win receipt; lowest ⇒ loss; otherwise `money >= 0` ⇒ win else loss.
 *
 * @param {GamePlayer[]} gamePlayers
 * @param {Record<string, number>} moneyByPlayerId
 * @param {string} focusPlayerId
 * @returns {"win" | "loss"}
 */
export function determineWinLossReceiptType(gamePlayers, moneyByPlayerId, focusPlayerId) {
  const ids = gamePlayers.map((p) => p.id).filter(Boolean);
  if (!ids.length) return "loss";

  const nums = ids.map((id) => Number(moneyByPlayerId[id] ?? 0) || 0);
  const focus = Number(moneyByPlayerId[focusPlayerId] ?? 0) || 0;
  const maxM = Math.max(...nums);
  const minM = Math.min(...nums);

  if (maxM === minM) return "win";
  if (focus === maxM) return "win";
  if (focus === minM) return "loss";
  return focus >= 0 ? "win" : "loss";
}

/**
 * Normalize portrait slot (no wolf-head asset URL).
 * @param {string | null | undefined} portraitUrl
 * @returns {string | null}
 */
export function safeCodedReceiptPortraitUrl(portraitUrl) {
  const s = String(portraitUrl ?? "").trim();
  if (!s || isWolfHeadReceiptPortraitUrl(s)) return null;
  return s;
}

/**
 * @param {{
 *   round: {
 *     holeRecords: import('../../game/types.js').HoleRecord[]
 *     gamePlayers: GamePlayer[]
 *     stakesConfig: import('../../game/stakes.js').StakesConfig
 *     qrUrl?: string | null
 *     receiptByPlayerId?: Record<string, Record<string, unknown>>
 *     receiptNumberByPlayerId?: Record<string, string>
 *     scoreVsParByPlayerId?: Record<string, string>
 *   }
 *   player: GamePlayer | null | undefined
 *   receiptType: "win" | "loss"
 *   portraitUrl?: string | null
 * }} input
 * @returns {Promise<string>} PNG data URL (1024×1536)
 */
export async function generateRoundReceiptPng(input) {
  const round = { ...input.round, qrUrl: defaultQrUrl(/** @type {{ qrUrl?: string | null }} */ (input.round)) };
  const kind = input.receiptType === "win" ? "win" : "loss";
  const tpl = buildReceiptTemplateFromRound(round, input.player ?? null, kind);
  const portraitUrl = safeCodedReceiptPortraitUrl(input.portraitUrl ?? null);
  const urlPass = portraitUrl || null;
  if (kind === "win") {
    return renderWinReceiptToDataUrl(tpl, urlPass);
  }
  return renderDownBadReceiptToDataUrl(tpl, urlPass);
}
