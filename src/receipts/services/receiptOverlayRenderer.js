import { receiptLog } from "./receiptDebugLogger.js";

async function toImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = url;
  });
}

function chooseColors(template) {
  const loser = /DOWN BAD|VILLAIN|ICE COLD|LOSER/i.test(template.badge || "") || /^-/.test(template.moneyLabel || "");
  return loser
    ? { top: "#140807", bottom: "#2a1109", accent: "#ff8c42", gold: "#e4b35a" }
    : { top: "#05110f", bottom: "#0a221d", accent: "#30d5c8", gold: "#e4b35a" };
}

/**
 * @param {{
 *  portraitLayerUrl: string,
 *  template: {
 *   receiptNumber: string,
 *   playerName: string,
 *   headline: string,
 *   subheadline: string,
 *   moneyLabel: string,
 *   scoreVsPar: string,
 *   holesWon: string,
 *   record: string,
 *   badge: string,
 *   wolfStats: string,
 *   shareCta: string,
 *   qrUrl: string,
 *   branding: string,
 *  }
 * }} params
 */
export async function renderReceiptOverlay(params) {
  const W = 1024;
  const H = 1536;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const colors = chooseColors(params.template);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, colors.top);
  grad.addColorStop(1, colors.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const portrait = await toImage(params.portraitLayerUrl);
  ctx.drawImage(portrait, 0, 0, W, H);

  ctx.fillStyle = "rgba(0,0,0,0.46)";
  ctx.fillRect(36, 926, W - 72, 570);
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 926, W - 72, 570);

  ctx.fillStyle = colors.gold;
  ctx.font = "700 26px Inter, system-ui, sans-serif";
  ctx.fillText(params.template.branding, 54, 82);
  ctx.fillStyle = "#f4ecd8";
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.fillText(params.template.receiptNumber, W - 300, 82);

  ctx.fillStyle = "#f4ecd8";
  ctx.font = "800 58px Inter, system-ui, sans-serif";
  ctx.fillText(params.template.headline, 64, 1000);
  ctx.font = "700 30px Inter, system-ui, sans-serif";
  ctx.fillText(params.template.subheadline, 64, 1050);

  ctx.fillStyle = colors.accent;
  ctx.font = "800 86px Inter, system-ui, sans-serif";
  ctx.fillText(params.template.moneyLabel, 64, 1150);

  ctx.fillStyle = "#f4ecd8";
  ctx.font = "800 56px Inter, system-ui, sans-serif";
  ctx.fillText(params.template.playerName.toUpperCase(), 64, 1228);

  ctx.font = "600 28px Inter, system-ui, sans-serif";
  const statLines = [
    `Score vs Par: ${params.template.scoreVsPar}`,
    `Holes Won: ${params.template.holesWon}`,
    `Record: ${params.template.record}`,
    `Status: ${params.template.badge}`,
    params.template.wolfStats,
  ];
  statLines.forEach((line, i) => ctx.fillText(line, 64, 1288 + i * 42));

  ctx.fillStyle = "rgba(228,179,90,0.15)";
  ctx.fillRect(56, 1466, 640, 42);
  ctx.fillStyle = colors.gold;
  ctx.font = "700 24px Inter, system-ui, sans-serif";
  ctx.fillText(params.template.shareCta, 66, 1494);

  try {
    const QR = await import("qrcode");
    const qrData = await QR.toDataURL(params.template.qrUrl, { width: 170, margin: 1, errorCorrectionLevel: "M" });
    const qrImg = await toImage(qrData);
    ctx.drawImage(qrImg, W - 226, H - 240, 170, 170);
  } catch (error) {
    receiptLog("qr render fallback", { error: error instanceof Error ? error.message : String(error) });
  }

  return canvas;
}
