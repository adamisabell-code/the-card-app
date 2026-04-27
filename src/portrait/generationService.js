/**
 * Branded receipt portrait **generation** (Austin Tee Party / The Card).
 *
 * **Cached profile model:** generate once per real upload (or explicit regenerate), persist three variants
 * (`userPortraitProfile.js` + IndexedDB). Receipts **only** pick `winner` | `neutral` | `loser` from that cache
 * — they do not call OpenAI or the local provider again unless the profile is missing or the source photo changed.
 *
 * Stack: `prompts.config.js` → `prepareBasePortraitFromFile` → `getPortraitProvider()` →
 * `normalizePortraitRasterToReceiptHero`. HTTP: set `VITE_PORTRAIT_GENERATION_URL` (multipart `image` = prepared
 * 4:5 base from the user’s real photo).
 * TODO (optional): OpenAI server avatars via `VITE_AI_AVATAR_ENABLED` — MVP defaults to placeholders/local provider.
 *
 * @module
 */

import { buildAllTonePrompts, buildFullGenerationPrompt } from "./prompts.config.js";
import { normalizePortraitRasterToReceiptHero, prepareBasePortraitFromFile } from "./pipeline.js";
import { getPortraitProvider, getPortraitProviderRuntimeInfo } from "./providers/registry.js";
import { MAX_PORTRAIT_REGENERATES, PORTRAIT_MODES } from "./types.js";

/** Re-export for apps/tests that inject a custom provider without touching env. */
export { createPortraitProviderFromEnv, getPortraitProvider, resetPortraitProviderCache } from "./providers/registry.js";

/**
 * @param {import('./providers/registry.js').PortraitImageProvider} [provider]
 */
function resolveProvider(provider) {
  return provider ?? getPortraitProvider();
}

/**
 * @param {string} portraitObjectUrl
 * @returns {Promise<string>}
 */
async function toReceiptHeroRatio(portraitObjectUrl) {
  return normalizePortraitRasterToReceiptHero(portraitObjectUrl);
}

/**
 * True when the HTTP image-to-image provider is active (URL set and placeholder mode off).
 * @returns {boolean}
 */
export function isRemotePortraitGenerationConfigured() {
  return getPortraitProviderRuntimeInfo().kind === "http";
}

/**
 * Active provider id + kind (for status banners / analytics).
 * @returns {{ id: string, kind: import('./providers/registry.js').PortraitImageProvider['kind'] }}
 */
export function getActivePortraitProviderInfo() {
  return getPortraitProviderRuntimeInfo();
}

/**
 * Single tone — validate → prep → provider.
 *
 * @param {{
 *   file: File
 *   toneMode: import('./prompts.config.js').ToneMode
 *   playerName?: string
 *   previousBundle?: import('./types.js').PortraitBundle | null
 *   provider?: import('./providers/registry.js').PortraitImageProvider
 * }} params
 */
export async function generateReceiptPortrait({ file, toneMode, playerName, previousBundle = null, provider }) {
  const p = resolveProvider(provider);
  const fullPrompt = buildFullGenerationPrompt(toneMode, playerName);
  const prep = await prepareBasePortraitFromFile(file, { previousBundle });
  const rawOut = await p.generatePortrait({
    basePortraitObjectUrl: prep.basePortraitUrl,
    fullPrompt,
    toneMode,
    playerName,
  });
  const portraitUrl = await toReceiptHeroRatio(rawOut.portraitObjectUrl);
  const source = p.kind === "http" ? "api" : p.kind;
  return {
    ok: true,
    source,
    fullPrompt,
    portraitUrl,
    rawImageUrl: prep.rawImageUrl,
    basePortraitUrl: prep.basePortraitUrl,
    naturalWidth: prep.naturalWidth,
    naturalHeight: prep.naturalHeight,
    toneMode,
    providerId: p.id,
  };
}

/**
 * @param {import('./types.js').PortraitBundle} bundle
 * @param {{ playerName?: string, provider?: import('./providers/registry.js').PortraitImageProvider }} [opts]
 * @returns {Promise<import('./types.js').PortraitBundle>}
 */
export async function regeneratePortraitBundle(bundle, opts = {}) {
  const { playerName = "", provider } = opts;
  const p = resolveProvider(provider);
  if (bundle.regenerateCount >= MAX_PORTRAIT_REGENERATES) {
    throw new Error(`You can regenerate up to ${MAX_PORTRAIT_REGENERATES} times.`);
  }
  const results = await Promise.all(
    PORTRAIT_MODES.map(async (toneMode) => {
      const gen = await p.generatePortrait({
        basePortraitObjectUrl: bundle.basePortraitUrl,
        fullPrompt: buildFullGenerationPrompt(toneMode, playerName),
        toneMode,
        playerName,
      });
      return toReceiptHeroRatio(gen.portraitObjectUrl);
    }),
  );
  for (const u of Object.values(bundle.styledPortraits)) {
    if (typeof u === "string" && u.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        /* ignore */
      }
    }
  }
  return {
    ...bundle,
    styledPortraits: {
      neutral: results[0],
      winner: results[1],
      loser: results[2],
    },
    regenerateCount: bundle.regenerateCount + 1,
  };
}

/**
 * Full receipt bundle — one prep step, then three provider calls (parallel).
 *
 * @param {File} file
 * @param {{
 *   playerName?: string
 *   previousBundle?: import('./types.js').PortraitBundle | null
 *   provider?: import('./providers/registry.js').PortraitImageProvider
 * }} [opts]
 */
export async function generateReceiptPortraitBundle(file, opts = {}) {
  const { playerName = "", previousBundle = null, provider } = opts;
  const p = resolveProvider(provider);
  const promptsByMode = buildAllTonePrompts(playerName);
  const prep = await prepareBasePortraitFromFile(file, { previousBundle });
  const results = await Promise.all(
    PORTRAIT_MODES.map(async (toneMode) => {
      const gen = await p.generatePortrait({
        basePortraitObjectUrl: prep.basePortraitUrl,
        fullPrompt: buildFullGenerationPrompt(toneMode, playerName),
        toneMode,
        playerName,
      });
      return toReceiptHeroRatio(gen.portraitObjectUrl);
    }),
  );
  const bundle = {
    rawImageUrl: prep.rawImageUrl,
    basePortraitUrl: prep.basePortraitUrl,
    styledPortraits: {
      neutral: results[0],
      winner: results[1],
      loser: results[2],
    },
    preferredMode: "neutral",
    regenerateCount: 0,
  };
  const source = p.kind === "http" ? "http" : p.kind;
  return {
    bundle,
    promptsByMode,
    source,
    provider: { id: p.id, kind: p.kind },
  };
}
