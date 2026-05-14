/**
 * DOWN BAD / Lexi coded receipt — visual spec only (1024×1536).
 * Colors come from `getReceiptTheme(layout.themeId)` in receiptThemes.js.
 */

export const DOWN_BAD_RECEIPT_LAYOUT = {
  canvas: { width: 1024, height: 1536 },
  /** @type {'loss'} */
  themeId: "loss",

  effects: {
    vignetteInnerAlpha: 0.14,
    headlineMoneyGlowBlur: 72,
    moneyGlowPasses: 5,
    borderWidthOuter: 4,
    borderWidthInner: 1.5,
    grainIterations: 6400,
    scratchCount: 16,
    distressedEchoAlpha: 0.17,
    distressedOffsets: /** @type {const} */ ([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]),
    stadiumLightCount: 7,
    headerLetterSpacingReceipt: "0.18em",
  },

  fonts: {
    brandTheReceipt: "900 18px Inter, system-ui, sans-serif",
    topCenterLabel: "800 13px Inter, system-ui, sans-serif",
    receiptNumberBadge: "800 14px ui-monospace, 'Cascadia Mono', monospace",
    headlineDown: "900 198px Inter, Impact, Arial Black, sans-serif",
    headlineBad: "italic 900 210px Impact, Arial Black, sans-serif",
    money: "900 146px Inter, Impact, Arial Black, sans-serif",
    subheadline: "800 26px Inter, system-ui, sans-serif",
    badgeCardTitle: "900 24px Inter, system-ui, sans-serif",
    badgeCardStatusLabel: "650 11px Inter, system-ui, sans-serif",
    badgeCardStatus: "900 18px Inter, system-ui, sans-serif",
    roleRibbon: "900 16px Inter, system-ui, sans-serif",
    namePlate: "900 118px Inter, Impact, Arial Black, sans-serif",
    nameSubline: "700 15px Inter, system-ui, sans-serif",
    cutBadge: "800 13px Inter, system-ui, sans-serif",
    statsLabel: "650 11px Inter, system-ui, sans-serif",
    statsValue: "900 30px Inter, system-ui, sans-serif",
    footerBrand: "900 30px Inter, system-ui, sans-serif",
    footerTag: "650 14px Inter, system-ui, sans-serif",
    atpMark: "900 12px Inter, system-ui, sans-serif",
  },

  header: {
    cardMark: { x: 44, y: 36, width: 240 },
    topCenter: { y: 48, labelLift: 0, dividerY: 55, dividerHalfWidth: 96, dividerGapFromCenter: 118 },
    brandRight: {
      labelX: 718,
      labelY: 38,
      receiptNumberX: 798,
      receiptNumberY: 72,
      receiptNumberPadX: 16,
      receiptNumberPadY: 8,
      badgeRadius: 6,
    },
  },

  headline: {
    down: { x: 52, y: 118 },
    bad: { x: 72, y: 296 },
    money: { x: 54, y: 452 },
    sub: { x: 58, y: 632 },
    /** Warm wash behind headline + money column — stops short of portrait for clear hierarchy */
    columnGlow: { x: 12, y: 88, w: 438, h: 598 },
  },

  portrait: {
    x: 498,
    y: 114,
    w: 510,
    h: 726,
    rimPad: 46,
    /** Soft column fade to tuck torso under lower UI */
    bottomFeather: 152,
  },

  lowerPanel: {
    yStart: 732,
    separatorY: 784,
  },

  badgeCard: {
    x: 40,
    y: 788,
    w: 272,
    h: 276,
    pad: 18,
    radius: 10,
    cutCorner: 14,
  },

  roleRibbon: {
    centerX: 526,
    y: 796,
    w: 416,
    h: 64,
    skewDeg: -6.5,
    notch: 14,
  },

  namePlate: {
    x1: 300,
    y1: 852,
    x2: 1000,
    y2: 880,
    x3: 986,
    y3: 1062,
    x4: 278,
    y4: 1034,
  },

  nameText: { x: 556, y: 978 },
  nameSubline: { x: 316, y: 1026, maxW: 900 },

  badgeRow: {
    y: 1088,
    h: 48,
    gap: 12,
    left: 40,
    right: 984,
    cut: 12,
  },

  stats: {
    x: 40,
    y: 1152,
    w: 944,
    h: 124,
    padX: 26,
    padY: 20,
    radius: 8,
  },

  qr: {
    size: 86,
    marginRight: 14,
    marginTop: 14,
  },

  footer: {
    y: 1372,
    leftX: 42,
    atpRadius: 28,
    brandGap: 18,
    rightMargin: 42,
  },
};

/** Default copy for the Lexi R. DOWN BAD lab reference (deterministic). */
export const DEFAULT_DOWN_BAD_TEMPLATE = {
  playerName: "LEXI R.",
  headlineTop: "DOWN",
  headlineBottom: "BAD",
  money: "-$210",
  topLabel: "ROUND VILLAIN",
  roleLabel: "ROUND VILLAIN",
  receiptNumber: "#018",
  badgeTitle: "WOLF QUEEN",
  badgeStatus: "OUTPLAYED",
  subheadline: "COULDN'T HANG.",
  nameSubline: "NEVER HAD A CHANCE.",
  badge1: "OUTPLAYED OUTWORKED",
  badge2: "DOWN BAD ALL ROUND",
  badge3: "PRESS MERCHANT",
  scoreVsPar: "+6",
  holesWon: "3",
  record: "1-5",
  footerLeft: "AUSTIN TEE PARTY",
  footerRight: "WHERE IT ALL BEGAN",
  qrUrl: typeof window !== "undefined" ? `${window.location.origin}/receipt-lab` : "https://thecard.local/receipt-lab",
};
