import type { ReceiptType } from "./receiptTypes.js";

export type ReceiptTemplate = {
  /** Short headline stamp on the receipt slip */
  stamp: string;
};

/** Randomized at round end when receipt type is `domination` */
export const DOMINATION_STAMP_POOL = [
  "TOOK EVERYTHING",
  "ABSOLUTE TAKEOVER",
  "CLEANED THEM OUT",
  "WOLF HUNT SUCCESSFUL",
] as const;

const TEMPLATES: Record<ReceiptType, ReceiptTemplate> = {
  domination: { stamp: "TOOK EVERYTHING" },
  rivalry_win: { stamp: "WON THE ROOM" },
  comeback: { stamp: "CLOSED STRONG" },
  clean_sweep: { stamp: "NO ANSWER" },
  press_merchant: { stamp: "RAN THE TABLE" },
  default: { stamp: "POSTED" },
  normal_result: { stamp: "HELD SERVE" },
  brutal_loss: { stamp: "SENT HOME" },
  collapse: { stamp: "LATE SLIP" },
  rivalry_loss: { stamp: "LOST THE EDGE" },
};

export function getReceiptTemplate(receiptType: ReceiptType): ReceiptTemplate {
  return TEMPLATES[receiptType];
}

/** Stamp line for the slip — domination picks randomly from the pool once per call. */
export function stampForReceiptType(receiptType: ReceiptType): string {
  if (receiptType === "domination") {
    const pool = DOMINATION_STAMP_POOL;
    return pool[Math.floor(Math.random() * pool.length)]!;
  }
  return TEMPLATES[receiptType].stamp;
}
