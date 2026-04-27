import type { ReceiptType } from "./receiptTypes.js";

export type AvatarMood = "happy" | "neutral" | "sad";

/**
 * Maps deterministic receipt type → which **cached** avatar mood URL to show.
 * Do not call OpenAI here — only index into stored happy/neutral/sad (or app winner/neutral/loser).
 */
export function avatarMoodForReceiptType(receiptType: ReceiptType): AvatarMood {
  switch (receiptType) {
    case "domination":
    case "rivalry_win":
    case "comeback":
    case "clean_sweep":
    case "press_merchant":
      return "happy";
    case "default":
    case "normal_result":
      return "neutral";
    case "brutal_loss":
    case "collapse":
    case "rivalry_loss":
      return "sad";
    default: {
      const _exhaustive: never = receiptType;
      return _exhaustive;
    }
  }
}

/** Bridge to existing portrait bundle keys in The Card (`PortraitMode`). */
export function portraitModeFromAvatarMood(mood: AvatarMood): "winner" | "neutral" | "loser" {
  if (mood === "happy") return "winner";
  if (mood === "sad") return "loser";
  return "neutral";
}
