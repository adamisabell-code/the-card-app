import { receiptLog } from "./receiptDebugLogger.js";

function moodColors(receiptType) {
  const loser = ["Down Bad", "Round Villain", "Ice Cold"].includes(receiptType);
  return loser
    ? { a: "#1a0904", b: "#2a0f08", c: "#ff8c42" }
    : { a: "#061310", b: "#0a2a23", c: "#30d5c8" };
}

function drawPanel(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

async function toImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for receipt render."));
    img.src = url;
  });
}

/**
 * @param {{
 * player: { name: string },
 * receiptType: string,
 * moodPortraitUrl: string,
 * roundStats: Record<string, string | number>,
 * receiptCopy: { headline: string, subheadline: string, savageCallout: string, shareCaption: string, groupChatText: string },
 * brandingAssets?: { receiptNumber?: string, shareCta?: string, qrUrl?: string }
 * }} params
 */
export async function generateReceiptImage(params) {
  receiptLog("end-round receipt requested", { player: params.player.name, receiptType: params.receiptType });
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available for receipt renderer.");

  const colors = moodColors(params.receiptType);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, colors.a);
  bg.addColorStop(1, colors.b);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const portrait = await toImage(params.moodPortraitUrl);
  ctx.drawImage(portrait, 80, 180, 920, 980);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(60, 1200, 960, 620);
  ctx.strokeStyle = colors.c;
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 1200, 960, 620);

  ctx.fillStyle = "#f4ecd8";
  ctx.font = "700 48px Inter, system-ui, sans-serif";
  ctx.fillText(params.receiptCopy.headline, 90, 1270);
  ctx.font = "700 30px Inter, system-ui, sans-serif";
  ctx.fillText(params.receiptCopy.subheadline, 90, 1320);

  ctx.fillStyle = colors.c;
  ctx.font = "800 76px Inter, system-ui, sans-serif";
  ctx.fillText(String(params.roundStats.money ?? "+$0"), 90, 1420);

  ctx.fillStyle = "#f4ecd8";
  ctx.font = "700 44px Inter, system-ui, sans-serif";
  ctx.fillText(params.player.name.toUpperCase(), 90, 1490);

  ctx.font = "600 24px Inter, system-ui, sans-serif";
  const statLines = [
    `Type: ${params.receiptType}`,
    `Points: ${params.roundStats.points ?? "-"}`,
    `Holes Won: ${params.roundStats.holesWon ?? "-"}`,
    `Record: ${params.roundStats.record ?? "-"}`,
    `Score vs Par: ${params.roundStats.scoreVsPar ?? "-"}`,
    `Blind Wolf: ${params.roundStats.blindWolf ?? "-"}`,
    `Lone Wolf: ${params.roundStats.loneWolf ?? "-"}`,
    `Biggest swing: ${params.roundStats.biggestSwing ?? "-"}`,
  ];
  statLines.forEach((line, i) => ctx.fillText(line, 90, 1540 + i * 34));

  drawPanel(ctx, 700, 1700, 300, 90, "rgba(0,0,0,0.45)");
  ctx.fillStyle = "#f4ecd8";
  ctx.font = "600 22px Inter, system-ui, sans-serif";
  ctx.fillText(params.brandingAssets?.receiptNumber ?? "RECEIPT #0001", 715, 1752);
  ctx.fillText("THE CARD · AUSTIN TEE PARTY", 715, 1780);

  const qrUrl = params.brandingAssets?.qrUrl ?? window.location.origin;
  try {
    const QR = await import("qrcode");
    const qrDataUrl = await QR.toDataURL(qrUrl, { width: 180, margin: 1, errorCorrectionLevel: "M" });
    const qrImg = await toImage(qrDataUrl);
    ctx.drawImage(qrImg, 790, 1470, 180, 180);
  } catch (error) {
    receiptLog("qr render fallback", { error: error instanceof Error ? error.message : String(error) });
  }

  ctx.fillStyle = "#f4ecd8";
  ctx.font = "600 24px Inter, system-ui, sans-serif";
  ctx.fillText(params.brandingAssets?.shareCta ?? "Share this in your group chat.", 90, 1870);

  const receiptImageUrl = canvas.toDataURL("image/png");
  receiptLog("PNG rendered", { bytesApprox: receiptImageUrl.length });

  return {
    receiptImageUrl,
    receiptData: {
      receiptType: params.receiptType,
      playerName: params.player.name,
      roundStats: params.roundStats,
      receiptCopy: params.receiptCopy,
    },
    shareCaption: params.receiptCopy.shareCaption,
    groupChatText: params.receiptCopy.groupChatText,
  };
}
