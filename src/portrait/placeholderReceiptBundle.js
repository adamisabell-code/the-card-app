import { PORTRAIT_OUTPUT } from "./receiptPortraitSpec.js";

/**
 * Receipt-card-sized placeholder rasters (happy / neutral / sad → winner / neutral / loser keys).
 * Keeps MVP usable without OpenAI or custom image workers.
 *
 * TODO: When OpenAI image generation is wired (`VITE_AI_AVATAR_ENABLED` + `npm run server`),
 * replace this path with real stylized portraits from the upload flow.
 *
 * @param {string} displayName
 * @param {import('./types.js').PortraitMode} [preferredMode]
 * @returns {import('./types.js').PortraitBundle & { isPlaceholder?: true }}
 */
export async function createPlaceholderPortraitBundle(displayName, preferredMode = "neutral") {
  const w = PORTRAIT_OUTPUT.width;
  const h = PORTRAIT_OUTPUT.height;

  const draw = (moodLabel, accent) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported.");
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#070b10");
    g.addColorStop(0.45, "#0d1a18");
    g.addColorStop(1, "#050608");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = "rgba(244,236,216,0.92)";
    ctx.font = "600 28px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Tee Party", w / 2, h * 0.38);
    ctx.font = "500 20px system-ui,Segoe UI,sans-serif";
    ctx.fillStyle = "rgba(244,236,216,0.55)";
    ctx.fillText(displayName.trim() || "Player", w / 2, h * 0.48);
    ctx.fillStyle = accent;
    ctx.font = "700 14px system-ui,Segoe UI,sans-serif";
    ctx.fillText(moodLabel.toUpperCase(), w / 2, h * 0.62);
    ctx.fillStyle = "rgba(244,236,216,0.35)";
    ctx.font = "11px system-ui,Segoe UI,sans-serif";
    ctx.fillText("Placeholder · MVP", w / 2, h * 0.88);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Placeholder encode failed."));
            return;
          }
          resolve(URL.createObjectURL(blob));
        },
        "image/webp",
        0.88,
      );
    });
  };

  const neutral = await draw("Neutral", "#c8e6d9");
  const winner = await draw("Happy", "#d4a853");
  const loser = await draw("Sad", "#8da4b4");
  const raw = neutral;

  return {
    rawImageUrl: raw,
    basePortraitUrl: neutral,
    styledPortraits: { neutral, winner, loser },
    preferredMode,
    regenerateCount: 0,
    isPlaceholder: /** @type {const} */ (true),
  };
}
