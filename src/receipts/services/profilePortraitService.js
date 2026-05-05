import { generateReceiptPortraitBundle } from "../../portrait/generationService.js";
import {
  buildPersistedRecordFromBundle,
  loadPersistedPortraitProfile,
  savePersistedPortraitProfile,
} from "../../portrait/userPortraitProfile.js";
import { upsertPlayerAvatarProfileState } from "../../portrait/avatarProfileState.js";
import { receiptLog } from "./receiptDebugLogger.js";

export const RECEIPT_PORTRAIT_PLACEHOLDER_PATH = "/assets/wolf-head.png";

/**
 * @param {{ file: File, playerId?: string, playerName?: string, previousBundle?: import('../../portrait/types.js').PortraitBundle | null }} input
 */
export async function uploadAndGenerateProfilePortraits(input) {
  const { file, playerId = "p-0", playerName = "Player", previousBundle = null } = input;
  receiptLog("original photo uploaded", { playerId, playerName, fileName: file?.name ?? null, size: file?.size ?? 0 });
  const generated = await generateReceiptPortraitBundle(file, { playerName, previousBundle });
  receiptLog("portrait variants generated", { source: generated.source, provider: generated.provider?.id ?? "unknown" });

  const existing = await loadPersistedPortraitProfile();
  const persisted = await buildPersistedRecordFromBundle(generated.bundle, file, existing);
  await savePersistedPortraitProfile(persisted);
  upsertPlayerAvatarProfileState(playerId, "ready");
  receiptLog("portrait variants stored", { playerId });
  try {
    const { primePortraitLayers } = await import("./portraitService.js");
    await primePortraitLayers({
      profileId: playerId,
      profilePhotoPath: generated.bundle.rawImageUrl,
      playerName,
    });
  } catch (error) {
    receiptLog("portrait cache prime skipped", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  return generated.bundle;
}

export async function loadStoredPortraitBundle() {
  const persisted = await loadPersistedPortraitProfile();
  if (!persisted) return null;
  return {
    rawImageUrl: URL.createObjectURL(new Blob([persisted.originalBuf], { type: persisted.originalMime || "image/jpeg" })),
    basePortraitUrl: URL.createObjectURL(new Blob([persisted.baseBuf], { type: "image/webp" })),
    styledPortraits: {
      neutral: URL.createObjectURL(new Blob([persisted.styledNeutralBuf], { type: "image/webp" })),
      winner: URL.createObjectURL(new Blob([persisted.styledWinnerBuf], { type: "image/webp" })),
      loser: URL.createObjectURL(new Blob([persisted.styledLoserBuf], { type: "image/webp" })),
    },
    preferredMode: persisted.preferredMode ?? "neutral",
    regenerateCount: persisted.regenerateCount ?? 0,
  };
}

/**
 * Resolve the current profile photo path for identity reference.
 * If no uploaded photo exists yet, falls back to a placeholder image path.
 *
 * @param {string | null | undefined} explicitPath
 * @returns {Promise<string>}
 */
export async function resolveProfilePhotoPath(explicitPath) {
  if (explicitPath && explicitPath.trim()) {
    return explicitPath;
  }
  const stored = await loadStoredPortraitBundle();
  if (stored?.rawImageUrl) {
    return stored.rawImageUrl;
  }
  return RECEIPT_PORTRAIT_PLACEHOLDER_PATH;
}

/**
 * Build the callout portrait-layer request payload for cinematic background generation.
 * Wired so the real uploaded profile photo path can always be passed in when available.
 *
 * @param {{ mood: "callout", profilePhotoPath?: string | null, playerName?: string }} input
 */
export async function buildCalloutPortraitLayerRequest(input) {
  const profilePhotoPath = await resolveProfilePhotoPath(input.profilePhotoPath ?? null);
  const payload = {
    mood: input.mood,
    playerName: input.playerName ?? "Player",
    profilePhotoPath,
    style:
      "dark gritty premium sports-card poster, cinematic stadium lighting, black textured background, teal and gold accents, dramatic rim light, high contrast, athletic energy, glossy trading card finish, subtle grunge texture, golf-club atmosphere",
    composition:
      "vertical portrait, subject on center-right, upper body visible, clear negative space on left and lower areas, no readable text, no logos, no QR codes",
  };
  receiptLog("callout portrait layer request built", {
    mood: payload.mood,
    profilePhotoPath: payload.profilePhotoPath,
  });
  return payload;
}
