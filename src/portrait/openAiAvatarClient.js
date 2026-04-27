/**
 * Server-side OpenAI avatar pipeline (3 moods). Proxied via Vite to `npm run server`.
 * Maps API fields happy/neutral/sad → existing bundle keys winner/neutral/loser.
 *
 * TODO: MVP ships with local/placeholder portraits by default — only enable
 * `VITE_AI_AVATAR_ENABLED` when your hosted `POST /api/avatars` is live (never fake responses).
 */

import { generateReceiptPortraitBundle } from "./generationService.js";
import { normalizePortraitRasterToReceiptHero, prepareBasePortraitFromFile } from "./pipeline.js";

function avatarEndpoint() {
  const base = String(import.meta.env.VITE_AI_AVATAR_SERVER_URL ?? "").trim().replace(/\/$/, "");
  return base ? `${base}/api/avatars` : "/api/avatars";
}

/**
 * @returns {boolean}
 */
export function isOpenAiAvatarClientEnabled() {
  return import.meta.env.VITE_AI_AVATAR_ENABLED === "true";
}

/**
 * @param {File} file
 * @param {{ playerId?: string, displayName?: string, previousBundle?: import('./types.js').PortraitBundle | null }} [opts]
 * @returns {Promise<{ bundle: import('./types.js').PortraitBundle, source: string, provider: { id: string, kind: string } }>}
 */
export async function generateReceiptPortraitBundleFromOpenAiServer(file, opts = {}) {
  const { playerId = "p-0", displayName = "Player", previousBundle = null } = opts;
  const prep = await prepareBasePortraitFromFile(file, { previousBundle });
  const baseBlob = await fetch(prep.basePortraitUrl).then((r) => r.blob());
  const fd = new FormData();
  fd.append("image", baseBlob, "portrait-base.webp");
  fd.append("playerId", playerId);
  fd.append("displayName", displayName);

  const res = await fetch(avatarEndpoint(), { method: "POST", body: fd });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Avatar server ${res.status}`);
  }
  /** @type {{ happyAvatarUrl?: string, neutralAvatarUrl?: string, sadAvatarUrl?: string }} */
  const data = await res.json();
  if (!data.happyAvatarUrl || !data.neutralAvatarUrl || !data.sadAvatarUrl) {
    throw new Error("Avatar server returned incomplete URLs.");
  }

  const [neutral, winner, loser] = await Promise.all([
    normalizePortraitRasterToReceiptHero(data.neutralAvatarUrl),
    normalizePortraitRasterToReceiptHero(data.happyAvatarUrl),
    normalizePortraitRasterToReceiptHero(data.sadAvatarUrl),
  ]);

  const bundle = {
    rawImageUrl: prep.rawImageUrl,
    basePortraitUrl: prep.basePortraitUrl,
    styledPortraits: { neutral, winner, loser },
    preferredMode: "neutral",
    regenerateCount: 0,
  };
  return { bundle, source: "openai-server", provider: { id: "openai-server", kind: "http" } };
}

/**
 * Try OpenAI server bundle; on failure fall back to local `generateReceiptPortraitBundle`.
 * @param {File} file
 * @param {{ playerId?: string, displayName?: string, previousBundle?: import('./types.js').PortraitBundle | null }} [opts]
 */
export async function generateReceiptPortraitBundleWithOpenAiFallback(file, opts = {}) {
  if (!isOpenAiAvatarClientEnabled()) {
    return generateReceiptPortraitBundle(file, { previousBundle: opts.previousBundle ?? null });
  }
  try {
    return await generateReceiptPortraitBundleFromOpenAiServer(file, opts);
  } catch {
    return generateReceiptPortraitBundle(file, { previousBundle: opts.previousBundle ?? null });
  }
}
