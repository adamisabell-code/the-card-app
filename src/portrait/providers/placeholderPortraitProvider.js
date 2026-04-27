import { PORTRAIT_OUTPUT } from "../receiptPortraitSpec.js";

/**
 * Zero-network placeholder raster — proves wiring, tone tabs, and receipt framing
 * when you explicitly opt out of local canvas styling (`VITE_PORTRAIT_USE_PLACEHOLDER=true`).
 */
export function createPlaceholderPortraitProvider() {
  return {
    id: "placeholder",
    kind: "placeholder",
    async generatePortrait(req) {
      const { width: w, height: h } = PORTRAIT_OUTPUT;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas not supported.");
      }

      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#0a0f14");
      g.addColorStop(1, "#12100c");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      let accent = "rgba(200,218,240,0.35)";
      if (req.toneMode === "winner") accent = "rgba(0,230,255,0.45)";
      if (req.toneMode === "loser") accent = "rgba(255,140,70,0.42)";
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      ctx.fillStyle = "rgba(244,236,216,0.88)";
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Austin Tee Party", w / 2, h * 0.38);
      ctx.font = "500 13px system-ui, sans-serif";
      ctx.fillStyle = "rgba(244,236,216,0.55)";
      ctx.fillText("Rivalry intro — placeholder", w / 2, h * 0.46);
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillStyle = accent;
      ctx.fillText(String(req.toneMode).toUpperCase(), w / 2, h * 0.56);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode placeholder."))), "image/webp", 0.88);
      });
      return {
        portraitObjectUrl: URL.createObjectURL(blob),
        providerId: "placeholder",
      };
    },
  };
}
