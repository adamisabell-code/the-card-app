/**
 * Austin Tee Party — **locked** receipt portrait prompts for image generation.
 * Edit this file to tune look & feel. Generation service sends these to the API when connected;
 * the localpass renderer does not use pixel ML — it only shares this module for copy/preview/audit.
 */

/** @typedef {'neutral' | 'winner' | 'loser'} ToneMode */

export const PORTRAIT_BASE_PROMPT = `Transform this uploaded profile photo into a photoreal, cinematic sports-poster portrait for Austin Tee Party — a premium competitive social golf app (The Card / official receipt energy). This is a head-to-head rivalry broadcast intro, not a generic avatar filter, not beauty-mode skin smoothing, not illustration or caricature. Preserve the person's identity, facial structure, skin tone, and recognizable likeness. Use dramatic high-contrast athletic lighting, moody premium poster finish, shallow depth of field, dark textured or void backdrop, sharp micro-detail in eyes and skin, and an intense locked-in competitive expression. The result must feel print- and social-share worthy: gritty but expensive, edgy but believable.`;

export const TONE_ADDITIONS = {
  winner: `Winner / home-hero tone: brighter heroic key light, teal-cyan energy in highlights and rim light, confident dominant posture read, cleaner speculars — still photoreal and receipt-branded, never cartoon or plastic.`,
  loser: `Loser / rough-round tone: deeper crushed shadows, orange-ember accent light, higher tension in the eyes and jaw — same player, clearly recognizable, just a tougher read after a bad beat; not horror, not a meme filter, not a different face.`,
  neutral: `Neutral rivalry tone: balanced steel-cool broadcast lighting, serious documentary-grade skin, premium drama without picking a side — two players could share the same neutral package on a match graphic.`,
};

const PRODUCT_LINE =
  " Output must visually lock to The Card receipt portrait system: same premium rivalry attitude as the slip — gritty, slightly shit-talky competitive golf energy, never ring-light flatness or casual social profile softness. Winner, neutral, and loser variants must still read as the same real person (identity locked), with only lighting and mood shifting. Final raster: vertical 4:5 portrait (width:height = 4:5) matching the receipt hero tile — not square, not landscape.";

/**
 * @param {ToneMode} toneMode
 * @param {string} [playerName] optional, included for API metadata only
 * @returns {string}
 */
export function buildFullGenerationPrompt(toneMode, playerName) {
  const add = TONE_ADDITIONS[toneMode] ?? TONE_ADDITIONS.neutral;
  const who = playerName?.trim() ? ` Subject: ${playerName.trim()}.` : "";
  return [PORTRAIT_BASE_PROMPT, who, add, PRODUCT_LINE].filter(Boolean).join(" ");
}

/**
 * Map of prompts for a full round of three receipt tones (e.g. logging / batch API).
 * @param {string} [playerName]
 * @returns {Record<ToneMode, string>}
 */
export function buildAllTonePrompts(playerName) {
  return {
    neutral: buildFullGenerationPrompt("neutral", playerName),
    winner: buildFullGenerationPrompt("winner", playerName),
    loser: buildFullGenerationPrompt("loser", playerName),
  };
}
