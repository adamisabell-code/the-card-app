/**
 * Orchestrates deterministic receipt presentation (type, stamp, portrait mood).
 *
 * WHERE TO CALL:
 * - Call `computeReceiptPresentation` once when finalizing a round receipt (client: `buildLastReceiptSnapshot`).
 * - Do NOT call `generatePlayerAvatars` from here — avatars are generated only on profile photo upload (server).
 *
 * WHERE NOT TO CALL AVATAR GENERATION:
 * - Never from receipt rules, receipt engine, or round end handlers — only from profile upload / portrait setup.
 */
import { avatarMoodForReceiptType, portraitModeFromAvatarMood, type AvatarMood } from "./avatarMoodSelector.js";
import { stampForReceiptType } from "./receiptTemplates.js";
import type { ReceiptRoundResult, ReceiptType } from "./receiptTypes.js";
import { classifyReceiptType } from "./receiptRules.js";

export type ReceiptPresentation = {
  receiptType: ReceiptType;
  avatarMood: AvatarMood;
  /** Maps to existing `PortraitMode` for `ReceiptCard` / bundle URLs */
  portraitHeroMode: "winner" | "neutral" | "loser";
  stamp: string;
};

export function computeReceiptPresentation(
  round: ReceiptRoundResult,
  heroPlayerId: string,
): ReceiptPresentation {
  const receiptType = classifyReceiptType(round, heroPlayerId);
  const avatarMood = avatarMoodForReceiptType(receiptType);
  const portraitHeroMode = portraitModeFromAvatarMood(avatarMood);
  const stamp = stampForReceiptType(receiptType);
  return { receiptType, avatarMood, portraitHeroMode, stamp };
}
