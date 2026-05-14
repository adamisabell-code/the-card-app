import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import teePartyLogo from "../assets/tee-party-logo-transparent.png";
import { SLOT_PLAYER_IDS } from "../game/types.js";
import { aggregateWolfRoundStats, computePointsAwarded, winningPlayerIdsForRecord } from "../game/scoring.js";
import { computeRoundPayout } from "../game/stakes.js";
import { determineReceiptType } from "../receipts/logic/receiptTypeLogic.js";
import { buildEndRoundReceiptTemplate } from "../receipts/services/receiptTemplateService.js";
import { exportReceiptPng } from "../receipts/services/receiptExportService.js";
import { renderDownBadReceiptToDataUrl } from "../receipts/templates/renderDownBadReceiptTemplate.js";
import { renderWinReceiptToDataUrl } from "../receipts/templates/renderWinReceiptTemplate.js";
import { FAKE_DYNAMIC_ROUND_FOR_RECEIPT_LAB, buildReceiptTemplateFromRound } from "../receipts/templates/buildReceiptTemplateFromRound.js";

/** @typedef {import('../game/types.js').GamePlayer} GamePlayer */
/** @typedef {import('../game/types.js').HoleRecord} HoleRecord */
/** @typedef {import('../game/stakes.js').StakesConfig} StakesConfig */

/**
 * Deterministic premium copy (mirrors receipt copy tone; lab does not call AI).
 * @typedef {{
 *   headline: string
 *   subheadline: string
 *   savageCallout: string
 *   groupChatText: string
 *   shareCaption: string
 *   source?: string
 * }} LabReceiptCopy
 */

/**
 * @typedef {{
 *   receiptCopy?: Partial<LabReceiptCopy>
 *   roundStats?: Partial<{
 *     moneyRaw: number
 *     points: number
 *     holesWon: number
 *     record: string
 *     scoreVsPar: string
 *     blindWolf: string
 *     loneWolf: string
 *     badge: string
 *   }>
 *   receiptType?: string
 * }} PremiumLabOverrides
 */

/**
 * @typedef {{
 *   id: string
 *   label: string
 *   renderer?: "premium" | "downBadLexi" | "codedWin" | "dynamicRoundTest"
 *   portraitUrlForDownBad?: string | null
 *   gamePlayers: GamePlayer[]
 *   holeRecords: HoleRecord[]
 *   stakesConfig: StakesConfig
 *   premiumOverrides?: PremiumLabOverrides | null
 * }} ReceiptLabScenario
 */

const LAB_STAKES = /** @type {const} */ ({
  preset: 5,
  customValue: "",
  loneWolf2x: true,
  blindWolf3x: true,
  hideDollarAmounts: false,
});

const IDS = [...SLOT_PLAYER_IDS];

/** Same-origin bitmap for premium portrait slot (brand logo URLs are banned from this pipeline). */
const LAB_PREMIUM_PORTRAIT_URL = typeof teePartyLogo === "string" ? teePartyLogo : String(teePartyLogo);

/**
 * @param {Omit<HoleRecord, "pointsAwardedByPlayerId" | "winningPlayerIds"> & Partial<Pick<HoleRecord, "pointsAwardedByPlayerId" | "winningPlayerIds">>} raw
 * @returns {HoleRecord}
 */
function sealHole(raw) {
  const pa = raw.pointsAwardedByPlayerId ?? computePointsAwarded(raw, IDS);
  const win = raw.winningPlayerIds?.length
    ? raw.winningPlayerIds
    : winningPlayerIdsForRecord({ ...raw, pointsAwardedByPlayerId: pa }, IDS);
  return {
    holeNumber: raw.holeNumber,
    wolfPlayerId: raw.wolfPlayerId,
    holeMode: raw.holeMode,
    partnerPlayerId: raw.holeMode === "normal" ? raw.partnerPlayerId : null,
    winningSide: raw.winningSide,
    pointsAwardedByPlayerId: pa,
    winningPlayerIds: win,
    holeOutcomeLabel: raw.holeOutcomeLabel,
    presses: raw.presses,
  };
}

/** @param {string[]} names */
function slotPlayers(names) {
  return names.map((name, slotIndex) => ({
    id: SLOT_PLAYER_IDS[slotIndex],
    slotIndex,
    name,
  }));
}

/** @param {(h: number) => HoleRecord} fn */
function mapHoles(fn) {
  return Array.from({ length: 18 }, (_, i) => fn(i + 1));
}

function wolfAt(h) {
  return IDS[(h - 1) % 4];
}

function nextPartnerId(wolfId) {
  const i = IDS.indexOf(wolfId);
  return IDS[(i + 1) % 4];
}

/**
 * @param {string} receiptType
 * @param {string} playerName
 * @returns {LabReceiptCopy}
 */
function labReceiptCopyFor(receiptType, playerName) {
  const first = String(playerName || "Player").trim().split(/\s+/)[0] || "Player";
  /** @type {Record<string, Omit<LabReceiptCopy, "source">>} */
  const byType = {
    MVP: {
      headline: "TOOK EVERYTHING",
      subheadline: "CLEAN ROUND. TOTAL CONTROL.",
      savageCallout: "Everybody got receipts tonight.",
      groupChatText: "MVP card posted. Who wants next?",
      shareCaption: "If it's not on the receipt, it didn't happen.",
    },
    Winner: {
      headline: "ROUND WINNER",
      subheadline: "CONTROLLED CHAOS. CASHED OUT.",
      savageCallout: "Scorecard did the talking.",
      groupChatText: "Winner receipt live.",
      shareCaption: "Run it back.",
    },
    "Round Villain": {
      headline: "POSTED",
      subheadline: "THE CARD DOES NOT DO MERCY MINUTES.",
      savageCallout: `${first} still has to sign this.`,
      groupChatText: "Round Villain receipt is live.",
      shareCaption: "Numbers do not lie.",
    },
    "Down Bad": {
      headline: "DOWN BAD",
      subheadline: "THE MATH IS IN. YOU STILL OWE THE TABLE.",
      savageCallout: "Send thoughts and prayers with Venmo.",
      groupChatText: "Down bad receipt posted.",
      shareCaption: "Quiet bus ride.",
    },
    "Wolf King": {
      headline: "BLIND WOLF KING",
      subheadline: "DECLARED IT. SHOWED THE RECEIPT.",
      savageCallout: `${first} smelled blood money.`,
      groupChatText: "Wolf King receipt is live.",
      shareCaption: "Read the blind count.",
    },
    "Pressure King": {
      headline: "PRESSURE KING",
      subheadline: "LONE WOLF ENERGY. NO PARTNER REQUIRED.",
      savageCallout: `${first} wanted the smoke alone.`,
      groupChatText: "Pressure King receipt is live.",
      shareCaption: "Lone wolf receipts hit different.",
    },
    "Press Merchant": {
      headline: "PRESS MERCHANT",
      subheadline: "SIDE ACTION. MAIN CHARACTER.",
      savageCallout: `${first} pressed the room into submission.`,
      groupChatText: "Press Merchant receipt is live.",
      shareCaption: "Side bets on the record.",
    },
    "Ice Cold": {
      headline: "ICE COLD",
      subheadline: "NOT MUCH ON PAPER. STILL LOUD IN THE CART.",
      savageCallout: "Sometimes the receipt is just vibes.",
      groupChatText: "Ice cold receipt is live.",
      shareCaption: "Weird round. Real receipt.",
    },
  };
  const base = byType[receiptType] ?? byType.Winner;
  return { ...base, source: "lab" };
}

/**
 * Premium 1024×1536 PNG via `exportReceiptPng` → `renderPremiumReceiptCard` (`receiptOverlayRenderer.js`).
 * @param {ReceiptLabScenario} scenario
 */
async function generateLabPremiumPng(scenario) {
  const r = scenario.renderer ?? "premium";
  if (r === "downBadLexi" || r === "codedWin" || r === "dynamicRoundTest") {
    throw new Error("coded poster scenarios must use renderDownBadReceiptToDataUrl or renderWinReceiptToDataUrl");
  }
  const p0 = scenario.gamePlayers[0];
  const allIds = scenario.gamePlayers.map((p) => p.id);
  const stats = aggregateWolfRoundStats(scenario.holeRecords, allIds);
  const moneyBy = computeRoundPayout(scenario.holeRecords, scenario.gamePlayers, scenario.stakesConfig);
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

  let receiptType = determineReceiptType(profileStats);
  let receiptCopy = labReceiptCopyFor(receiptType, p0.name);
  let roundStats = {
    moneyRaw,
    points: stats.wolfPointsByPlayerId[p0.id] ?? 0,
    holesWon: stats.holesWonByPlayerId[p0.id] ?? 0,
    record: `${stats.holesWonByPlayerId[p0.id] ?? 0}-${Math.max(0, scenario.holeRecords.length - (stats.holesWonByPlayerId[p0.id] ?? 0))}`,
    scoreVsPar: "N/A",
    blindWolf: `${stats.blindWolfWins}/${stats.blindWolfAttempts}`,
    loneWolf: `${stats.loneWolfWins}/${stats.loneWolfAttempts}`,
    badge: receiptType,
  };

  const ov = scenario.premiumOverrides;
  if (ov) {
    if (ov.receiptType) receiptType = ov.receiptType;
    receiptCopy = { ...receiptCopy, ...ov.receiptCopy, source: "lab" };
    roundStats = { ...roundStats, ...ov.roundStats };
    if (ov.roundStats?.badge == null && ov.receiptType) {
      roundStats.badge = ov.receiptType;
    }
  }

  const template = buildEndRoundReceiptTemplate({
    playerName: p0.name,
    receiptType,
    receiptNumber: `RECEIPT #LAB-${scenario.id.replace(/[^a-z0-9-]/gi, "").slice(0, 18).toUpperCase()}`,
    roundStats,
    receiptCopy,
    profilePhotoUrl: null,
  });

  return exportReceiptPng({
    portraitLayerUrl: LAB_PREMIUM_PORTRAIT_URL,
    template,
  });
}

/** @returns {ReceiptLabScenario} */
function scenarioTrevorBrutalLoss() {
  const gamePlayers = slotPlayers(["Trevor M.", "Marcus L.", "Jordan T.", "Mia R."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "blind", partnerPlayerId: null, winningSide: "opponent_side" });
    }
    const p = nextPartnerId(w);
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
  });
  return {
    id: "trevor-brutal-loss",
    label: "Trevor M. brutal loss",
    renderer: "premium",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: {
      receiptType: "Round Villain",
      receiptCopy: {
        headline: "BRUTAL",
        subheadline: "THE CARD KEPT SCORE. YOU KEPT PAYING.",
        savageCallout: "Quiet ride home. Loud receipt.",
        groupChatText: "Trevor's cinematic receipt is posted.",
        shareCaption: "Read the room. Then read the receipt.",
      },
      roundStats: {
        moneyRaw: -247,
        points: 2,
        holesWon: 1,
        record: "1-17",
        scoreVsPar: "N/A",
        blindWolf: "0/5",
        loneWolf: "0/0",
        badge: "ROUND VILLAIN",
      },
    },
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioLexiDownBadReference() {
  const gamePlayers = slotPlayers(["Lexi R.", "Marcus L.", "Jordan T.", "Mia R."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    const p = nextPartnerId(w);
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "tie" });
  });
  return {
    id: "lexi-down-bad-reference",
    label: "Lexi R. down bad reference",
    renderer: "downBadLexi",
    portraitUrlForDownBad: null,
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioWinnerReference() {
  const gamePlayers = slotPlayers(["Marcus T.", "Lexi R.", "Jordan T.", "Mia R."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    const p = nextPartnerId(w);
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
    }
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
  });
  return {
    id: "winner-reference",
    label: "Winner reference",
    renderer: "codedWin",
    portraitUrlForDownBad: null,
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioDynamicRoundDataTest() {
  const { holeRecords, gamePlayers, stakesConfig } = FAKE_DYNAMIC_ROUND_FOR_RECEIPT_LAB;
  return {
    id: "dynamic-round-data-test",
    label: "Dynamic round data test",
    renderer: "dynamicRoundTest",
    portraitUrlForDownBad: null,
    gamePlayers,
    holeRecords,
    stakesConfig,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioMarcusTakeover() {
  const gamePlayers = slotPlayers(["Marcus L.", "Jordan T.", "Mia R.", "Trevor M."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "blind", partnerPlayerId: null, winningSide: "wolf_side" });
    }
    const p = nextPartnerId(w);
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
  });
  return {
    id: "marcus-takeover",
    label: "Marcus L. absolute takeover",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioJordanComeback() {
  const gamePlayers = slotPlayers(["Jordan T.", "Mia R.", "Trevor M.", "Marcus L."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    if (h <= 9) {
      if (w === "p-0") {
        const p = nextPartnerId(w);
        return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
      }
      const p = nextPartnerId(w);
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
    }
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "lone", partnerPlayerId: null, winningSide: "wolf_side" });
    }
    const p = nextPartnerId(w);
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
  });
  return {
    id: "jordan-comeback",
    label: "Jordan T. comeback kid",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioMiaPressureQueen() {
  const gamePlayers = slotPlayers(["Mia R.", "Trevor M.", "Jordan T.", "Marcus L."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    const p = nextPartnerId(w);
    const pressWin = /** @type {const} */ ("wolf_side");
    if ((h === 1 || h === 5 || h === 9 || h === 13) && w === "p-0") {
      return sealHole({
        holeNumber: h,
        wolfPlayerId: w,
        holeMode: "normal",
        partnerPlayerId: p,
        winningSide: "wolf_side",
        presses: [
          {
            id: `press-mia-${h}`,
            initiatorPlayerId: "p-0",
            counterpartyPlayerIds: ["p-1", "p-2", "p-3"],
            units: 2,
            backedSide: "wolf_side",
            pressWinningSide: pressWin,
          },
        ],
      });
    }
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
    }
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
  });
  return {
    id: "mia-pressure",
    label: "Mia R. pressure queen",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioJakeBlindWolfBandit() {
  const gamePlayers = slotPlayers(["Jake Smith", "Mia R.", "Jordan T.", "Marcus L."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "blind", partnerPlayerId: null, winningSide: "wolf_side" });
    }
    const p = nextPartnerId(w);
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
  });
  return {
    id: "jake-blind-bandit",
    label: "Jake Smith blind wolf bandit",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioFailedBlindWolf() {
  const gamePlayers = slotPlayers(["Trevor M.", "Jake Smith", "Jordan T.", "Mia R."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    if (w === "p-0" || w === "p-1") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "blind", partnerPlayerId: null, winningSide: "opponent_side" });
    }
    const p = nextPartnerId(w);
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
  });
  return {
    id: "failed-blind-wolf",
    label: "failed blind wolf",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioCollapseAfterLeading() {
  const gamePlayers = slotPlayers(["Jordan T.", "Marcus L.", "Mia R.", "Trevor M."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    const p = nextPartnerId(w);
    if (h <= 12) {
      if (w === "p-0") {
        return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "lone", partnerPlayerId: null, winningSide: "wolf_side" });
      }
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
    }
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "blind", partnerPlayerId: null, winningSide: "opponent_side" });
    }
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
  });
  return {
    id: "collapse-leading",
    label: "collapse after leading",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioSideBetDisaster() {
  const gamePlayers = slotPlayers(["Trevor M.", "Jordan T.", "Mia R.", "Marcus L."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    const p = nextPartnerId(w);
    if (h === 4 || h === 6 || h === 10 || h === 11 || h === 16) {
      return sealHole({
        holeNumber: h,
        wolfPlayerId: w,
        holeMode: "normal",
        partnerPlayerId: p,
        winningSide: "wolf_side",
        presses: [
          {
            id: `press-loss-${h}`,
            initiatorPlayerId: "p-0",
            counterpartyPlayerIds: ["p-1", "p-2", "p-3"],
            units: 3,
            backedSide: "opponent_side",
            pressWinningSide: "wolf_side",
          },
        ],
      });
    }
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
    }
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
  });
  return {
    id: "side-bet-disaster",
    label: "side bet disaster",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioWinningStreak() {
  const gamePlayers = slotPlayers(["Marcus L.", "Trevor M.", "Mia R.", "Jordan T."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    const p = nextPartnerId(w);
    if (h <= 10) {
      if (w === "p-0") {
        return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
      }
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
    }
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
  });
  return {
    id: "winning-streak",
    label: "winning streak",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioLosingStreak() {
  const gamePlayers = slotPlayers(["Mia R.", "Marcus L.", "Trevor M.", "Jordan T."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    const p = nextPartnerId(w);
    if (h <= 9) {
      if (w === "p-0") {
        return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
      }
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
    }
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "tie" });
  });
  return {
    id: "losing-streak",
    label: "losing streak",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioZeroHolesWon() {
  const gamePlayers = slotPlayers(["Trevor M.", "Jordan T.", "Mia R.", "Marcus L."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    const p = nextPartnerId(w);
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
    }
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
  });
  return {
    id: "zero-holes-won",
    label: "zero holes won",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

/** @returns {ReceiptLabScenario} */
function scenarioBiggestMoneySwing() {
  const gamePlayers = slotPlayers(["Jordan T.", "Mia R.", "Trevor M.", "Marcus L."]);
  const holeRecords = mapHoles((h) => {
    const w = wolfAt(h);
    const p = nextPartnerId(w);
    if (h === 14) {
      return sealHole({ holeNumber: h, wolfPlayerId: "p-0", holeMode: "blind", partnerPlayerId: null, winningSide: "wolf_side" });
    }
    if (w === "p-0") {
      return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "opponent_side" });
    }
    return sealHole({ holeNumber: h, wolfPlayerId: w, holeMode: "normal", partnerPlayerId: p, winningSide: "wolf_side" });
  });
  return {
    id: "biggest-money-swing",
    label: "biggest money swing",
    gamePlayers,
    holeRecords,
    stakesConfig: LAB_STAKES,
    premiumOverrides: null,
  };
}

const SCENARIO_BUILDERS = [
  scenarioTrevorBrutalLoss,
  scenarioLexiDownBadReference,
  scenarioWinnerReference,
  scenarioDynamicRoundDataTest,
  scenarioMarcusTakeover,
  scenarioJordanComeback,
  scenarioMiaPressureQueen,
  scenarioJakeBlindWolfBandit,
  scenarioFailedBlindWolf,
  scenarioCollapseAfterLeading,
  scenarioSideBetDisaster,
  scenarioWinningStreak,
  scenarioLosingStreak,
  scenarioZeroHolesWon,
  scenarioBiggestMoneySwing,
];

export function ReceiptLab() {
  const [activeId, setActiveId] = useState(SCENARIO_BUILDERS[0]().id);
  const [premiumPngUrl, setPremiumPngUrl] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const genSeq = useRef(0);

  const scenarios = useMemo(() => SCENARIO_BUILDERS.map((fn) => fn()), []);
  const active = useMemo(() => scenarios.find((s) => s.id === activeId) ?? scenarios[0], [scenarios, activeId]);

  const runPremiumExport = useCallback(async () => {
    const seq = ++genSeq.current;
    setBusy(true);
    setStatus("");
    try {
      let receiptImageUrl;
      if (active.renderer === "downBadLexi") {
        receiptImageUrl = await renderDownBadReceiptToDataUrl({}, active.portraitUrlForDownBad ?? null);
      } else if (active.renderer === "codedWin") {
        receiptImageUrl = await renderWinReceiptToDataUrl({}, active.portraitUrlForDownBad ?? null);
      } else if (active.renderer === "dynamicRoundTest") {
        const marcus = FAKE_DYNAMIC_ROUND_FOR_RECEIPT_LAB.gamePlayers[0];
        const tpl = buildReceiptTemplateFromRound(FAKE_DYNAMIC_ROUND_FOR_RECEIPT_LAB, marcus, "win");
        receiptImageUrl = await renderWinReceiptToDataUrl(tpl, active.portraitUrlForDownBad ?? null);
      } else {
        const out = await generateLabPremiumPng(active);
        receiptImageUrl = out.receiptImageUrl;
      }
      if (seq !== genSeq.current) return;
      setPremiumPngUrl(receiptImageUrl);
      setStatus(
        active.renderer === "downBadLexi"
          ? "DOWN BAD coded template — 1024×1536 PNG ready."
          : active.renderer === "codedWin"
            ? "WIN coded template — 1024×1536 PNG ready."
            : active.renderer === "dynamicRoundTest"
              ? "Dynamic WIN receipt from buildReceiptTemplateFromRound — 1024×1536 PNG ready."
              : "Premium 1024×1536 PNG ready.",
      );
    } catch (e) {
      if (seq !== genSeq.current) return;
      setPremiumPngUrl(null);
      setStatus(e instanceof Error ? e.message : "Export failed.");
    } finally {
      if (seq === genSeq.current) setBusy(false);
    }
  }, [active]);

  useEffect(() => {
    void runPremiumExport();
  }, [runPremiumExport]);

  return (
    <div
      className="receipt-lab"
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "20px 16px 32px",
        background: "#070b0d",
        color: "#e6edf2",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 6px" }}>Receipt Lab</h1>
        <p style={{ margin: 0, opacity: 0.72, fontSize: "0.9rem" }}>
          {active.renderer === "downBadLexi" || active.renderer === "codedWin" || active.renderer === "dynamicRoundTest" ? (
            <>
              <strong>Coded poster receipts</strong> use the shared parts pipeline (1024×1536):{" "}
              <code style={{ fontSize: "0.82em" }}>renderDownBadReceiptTemplate</code> or{" "}
              <code style={{ fontSize: "0.82em" }}>renderWinReceiptTemplate</code> — no ReceiptCard; optional portrait URL only; empty slot
              uses the cinematic silhouette (no wolf portrait fallback).
            </>
          ) : (
            <>
              Other scenarios use production export: <code style={{ fontSize: "0.82em" }}>exportReceiptPng</code> →{" "}
              <code style={{ fontSize: "0.82em" }}>renderPremiumReceiptCard</code> (1024×1536).
            </>
          )}
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 320px) 1fr",
          gap: 20,
          alignItems: "start",
        }}
        className="receipt-lab__grid"
      >
        <section aria-label="Scenarios">
          <h2 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.55, margin: "0 0 10px" }}>
            Scenarios
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scenarios.map((s) => {
              const on = s.id === active.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: on ? "1px solid #3d8b6e" : "1px solid #243038",
                    background: on ? "#12221c" : "#0f1418",
                    color: "#e6edf2",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Premium receipt preview">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => void runPremiumExport()}
              disabled={busy}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #3d8b6e",
                background: "#1a3d30",
                color: "#e8fff4",
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {busy ? "Generating…" : "Generate Preview PNG"}
            </button>
            {premiumPngUrl ? (
              <a
                href={premiumPngUrl}
                download={`receipt-lab-premium-${active.id}.png`}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #4a5c68",
                  background: "#141c22",
                  color: "#dbe8f0",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Download PNG
              </a>
            ) : null}
            {status ? <span style={{ fontSize: "0.85rem", opacity: 0.85 }}>{status}</span> : null}
          </div>
          {premiumPngUrl ? (
            <div
              style={{
                display: "inline-block",
                padding: 12,
                background: "#050808",
                borderRadius: 12,
                border: "1px solid #1e2a32",
                maxWidth: "100%",
              }}
            >
              <img
                src={premiumPngUrl}
                alt={`Premium receipt preview: ${active.label}`}
                width={512}
                height={768}
                style={{ width: "min(512px, 100%)", height: "auto", display: "block" }}
                decoding="async"
              />
              <p style={{ margin: "10px 0 0", fontSize: "0.75rem", opacity: 0.55 }}>Native export 1024×1536 (preview scaled).</p>
            </div>
          ) : (
            <p style={{ opacity: 0.65, fontSize: "0.9rem" }}>{busy ? "Rendering premium canvas…" : "No preview yet."}</p>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .receipt-lab__grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
