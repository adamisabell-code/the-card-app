/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("[api/render-receipt] request received", {
      receiptType: body?.receiptType ?? null,
      player: body?.player?.name ?? null,
    });

    // Rendering is handled by the client template renderer for deterministic visuals.
    res.status(200).json({
      ok: true,
      renderer: "client_template_renderer",
      message: "Use src/receipts/services/receiptRenderer.js to produce PNG deterministically.",
      echo: {
        receiptType: body?.receiptType ?? null,
        playerName: body?.player?.name ?? null,
      },
    });
  } catch (error) {
    console.error("[api/render-receipt] error", error);
    res.status(500).json({ error: "Could not render receipt" });
  }
}
