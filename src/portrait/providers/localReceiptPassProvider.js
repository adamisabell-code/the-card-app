import { applyReceiptStyleLocalPass } from "../pipeline.js";

/**
 * Client-side “stub” that still produces real receipt-card pixels (canvas pass).
 * Default when no HTTP provider is configured — full UI flow is testable offline.
 */
export function createLocalReceiptPassProvider() {
  return {
    id: "local-receipt-pass",
    kind: "local-pass",
    async generatePortrait(req) {
      const portraitObjectUrl = await applyReceiptStyleLocalPass(req.basePortraitObjectUrl, req.toneMode);
      return { portraitObjectUrl, providerId: "local-receipt-pass" };
    },
  };
}
