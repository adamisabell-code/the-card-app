/**
 * WIN / Marcus coded receipt — same geometry as DOWN BAD (`DOWN_BAD_RECEIPT_LAYOUT`),
 * `themeId: "win"` for victory tokens from `receiptThemes.js`.
 */

import { DOWN_BAD_RECEIPT_LAYOUT } from "./downBadReceiptLayoutSpec.js";

/** @type {typeof DOWN_BAD_RECEIPT_LAYOUT & { themeId: 'win' }} */
export const WIN_RECEIPT_LAYOUT = {
  ...DOWN_BAD_RECEIPT_LAYOUT,
  themeId: "win",
};

/** Default copy for the Marcus T. WIN coded lab reference (deterministic). */
export const DEFAULT_WIN_TEMPLATE = {
  playerName: "MARCUS T.",
  headlineTop: "BUILT",
  headlineBottom: "DIFFERENT",
  money: "+$340",
  topLabel: "ROUND HERO",
  roleLabel: "ROUND HERO",
  receiptNumber: "#019",
  badgeTitle: "WOLF KING",
  badgeStatus: "PAID",
  subheadline: "CASHED EVERYBODY OUT.",
  nameSubline: "LEFT WITH THE MONEY.",
  badge1: "BUILT DIFFERENT",
  badge2: "CASHED OUT",
  badge3: "NO FREE HOLES",
  scoreVsPar: "-2",
  holesWon: "7",
  record: "5-1",
  footerLeft: "AUSTIN TEE PARTY",
  footerRight: "WHERE IT ALL BEGAN",
  qrUrl: typeof window !== "undefined" ? `${window.location.origin}/receipt-lab` : "https://thecard.local/receipt-lab",
};
