import { aggregateWolfRoundStats } from "../../game/scoring.js";
import { computeRoundPayout } from "../../game/stakes.js";
import { determineReceiptType } from "../logic/receiptTypeLogic.js";
import { determineFaceMood } from "../logic/faceMoodLogic.js";
import { generateReceiptCopy } from "./receiptCopyService.js";
import { receiptLog } from "./receiptDebugLogger.js";
import { ensurePortraitLayer } from "./portraitService.js";
import { buildCalloutReceiptTemplate, buildEndRoundReceiptTemplate } from "./receiptTemplateService.js";
import { exportReceiptPng } from "./receiptExportService.js";
import { resolveReceiptProfileImage } from "./receiptProfileImageResolver.js";

/**
 * @param {{
 *  gamePlayers: import('../../game/types.js').GamePlayer[],
 *  holeRecords: import('../../game/types.js').HoleRecord[],
 *  stakesConfig: import('../../game/stakes.js').StakesConfig,
 *  portraitByPlayerId: Record<string, import('../../portrait/types.js').PortraitBundle | null | undefined>,
 *  receiptNumber?: string,
 * }} params
 */
export async function generateEndRoundReceiptForPlayer(params) {
  receiptLog("end-round receipt requested", { holes: params.holeRecords.length });
  const p0 = params.gamePlayers.find((p) => p.id === "p-0") ?? params.gamePlayers[0];
  const allIds = params.gamePlayers.map((p) => p.id);
  const stats = aggregateWolfRoundStats(params.holeRecords, allIds);
  const moneyBy = computeRoundPayout(params.holeRecords, params.gamePlayers, params.stakesConfig);
  const moneyRaw = moneyBy[p0.id] ?? 0;

  const profileStats = {
    money: moneyRaw,
    wolfPoints: stats.wolfPointsByPlayerId[p0.id] ?? 0,
    holesWon: stats.holesWonByPlayerId[p0.id] ?? 0,
    blindWolfWins: stats.blindWolfWins,
    loneWolfWins: stats.loneWolfWins,
    pressInitiated: 0,
    pressLost: 0,
  };

  const receiptType = determineReceiptType(profileStats);
  receiptLog("receipt type selected", { player: p0.name, receiptType, profileStats });

  const baseMood = determineFaceMood({ money: moneyRaw, receiptType });
  const mood = baseMood === "loser" ? "sadMad" : baseMood;
  receiptLog("mood face selected", { mood, baseMood });

  const portraitBundle = params.portraitByPlayerId[p0.id] ?? null;
  const preferredPath = await resolveReceiptProfileImage({
    playerId: p0.id,
    mood,
    portraitBundle,
  });

  const layer = await ensurePortraitLayer({
    mood,
    profileId: p0.id,
    profilePhotoPath: preferredPath,
    playerName: p0.name,
  });

  const roundStats = {
    moneyRaw,
    points: stats.wolfPointsByPlayerId[p0.id] ?? 0,
    holesWon: stats.holesWonByPlayerId[p0.id] ?? 0,
    record: `${stats.holesWonByPlayerId[p0.id] ?? 0}-${Math.max(0, params.holeRecords.length - (stats.holesWonByPlayerId[p0.id] ?? 0))}`,
    scoreVsPar: "N/A",
    blindWolf: `${stats.blindWolfWins}/${stats.blindWolfAttempts}`,
    loneWolf: `${stats.loneWolfWins}/${stats.loneWolfAttempts}`,
    badge: receiptType,
  };

  const receiptCopy = await generateReceiptCopy({
    receiptType,
    playerName: p0.name,
    roundStats,
  });
  receiptLog("AI copy generated or fallback used", { source: receiptCopy.source });

  const template = buildEndRoundReceiptTemplate({
    playerName: p0.name,
    receiptType,
    receiptNumber: params.receiptNumber,
    roundStats,
    receiptCopy,
  });

  const exported = await exportReceiptPng({
    portraitLayerUrl: layer.portraitLayerUrl,
    template,
  });

  receiptLog("receipt saved", { receiptType, source: layer.source });
  receiptLog("share image ready", { shareCaption: template.shareCaption });

  return {
    receiptImageUrl: exported.receiptImageUrl,
    receiptData: template,
    shareCaption: template.shareCaption,
    groupChatText: template.groupChatText,
  };
}

/**
 * @param {{ playerName: string, portraitUrl?: string | null, profilePhotoPath?: string | null, receiptNumber?: string }} input
 */
export async function generateCalloutReceipt(input) {
  receiptLog("callout receipt requested", { playerName: input.playerName });
  const layer = await ensurePortraitLayer({
    mood: "callout",
    profileId: "p-0",
    profilePhotoPath: await resolveReceiptProfileImage({
      playerId: "p-0",
      mood: "callout",
      explicitPath: input.profilePhotoPath ?? input.portraitUrl ?? null,
    }),
    playerName: input.playerName,
  });

  const receiptCopy = await generateReceiptCopy({
    receiptType: "callout",
    playerName: input.playerName,
    roundStats: {},
  });
  receiptLog("AI copy generated or fallback used", { source: receiptCopy.source });

  const template = buildCalloutReceiptTemplate({
    playerName: input.playerName,
    receiptNumber: input.receiptNumber,
    receiptCopy,
  });

  const exported = await exportReceiptPng({
    portraitLayerUrl: layer.portraitLayerUrl,
    template,
  });

  receiptLog("receipt saved", { type: "callout", source: layer.source });
  receiptLog("share image ready", { type: "callout" });

  return {
    receiptImageUrl: exported.receiptImageUrl,
    receiptData: template,
    shareCaption: template.shareCaption,
    groupChatText: template.groupChatText,
  };
}
