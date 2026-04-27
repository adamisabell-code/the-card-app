/**
 * Portrait **image provider** registry (Phase 2 — provider-ready).
 *
 * To plug a new backend (e.g. Replicate, fal, OpenAI images):
 * 1. Add `createMyPortraitProvider.js` exporting a factory that returns an object with
 *    `{ id, kind, generatePortrait(req) }` matching {@link PortraitImageProvider}.
 * 2. Wire it in `createPortraitProviderFromEnv()` (e.g. read `VITE_PORTRAIT_PROVIDER=my-api`).
 *
 * Phase 1 stays testable without any backend: default is {@link createLocalReceiptPassProvider}.
 *
 * @typedef {import('../prompts.config.js').ToneMode} ToneMode
 *
 * @typedef {{
 *   basePortraitObjectUrl: string
 *   fullPrompt: string
 *   toneMode: ToneMode
 *   playerName?: string
 * }} PortraitGenRequest
 *
 * @typedef {{ portraitObjectUrl: string, providerId: string }} PortraitGenResult
 *
 * @typedef {{
 *   id: string
 *   kind: 'local-pass' | 'http' | 'placeholder'
 *   generatePortrait: (req: PortraitGenRequest) => Promise<PortraitGenResult>
 * }} PortraitImageProvider
 */

import { createHttpImageToImagePortraitProvider } from "./httpImageToImageProvider.js";
import { createLocalReceiptPassProvider } from "./localReceiptPassProvider.js";
import { createPlaceholderPortraitProvider } from "./placeholderPortraitProvider.js";

function readEnvUrl() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_PORTRAIT_GENERATION_URL) {
    const u = String(import.meta.env.VITE_PORTRAIT_GENERATION_URL).trim();
    return u || null;
  }
  return null;
}

function readPlaceholderEnvFlag() {
  if (typeof import.meta === "undefined") return false;
  return String(import.meta.env?.VITE_PORTRAIT_USE_PLACEHOLDER || "").toLowerCase() === "true";
}

/**
 * Build the active provider from Vite env. Call once per session via {@link getPortraitProvider}.
 * @returns {PortraitImageProvider}
 */
export function createPortraitProviderFromEnv() {
  if (readPlaceholderEnvFlag()) {
    return createPlaceholderPortraitProvider();
  }
  const endpoint = readEnvUrl();
  if (endpoint) {
    return createHttpImageToImagePortraitProvider({ endpointUrl: endpoint });
  }
  return createLocalReceiptPassProvider();
}

/** @type {PortraitImageProvider | null} */
let cached = null;

/**
 * Singleton provider for the browser session (env is static at build time in Vite).
 * @returns {PortraitImageProvider}
 */
export function getPortraitProvider() {
  if (!cached) {
    cached = createPortraitProviderFromEnv();
  }
  return cached;
}

/**
 * @returns {{ id: string, kind: PortraitImageProvider['kind'] }}
 */
export function getPortraitProviderRuntimeInfo() {
  const p = getPortraitProvider();
  return { id: p.id, kind: p.kind };
}

/** For unit tests or hot-reload experiments only. */
export function resetPortraitProviderCache() {
  cached = null;
}
