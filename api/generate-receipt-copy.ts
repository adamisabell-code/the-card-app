/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";

type CopyPayload = {
  receiptType?: string;
  playerName?: string;
  roundStats?: Record<string, unknown>;
};

const FALLBACK = {
  headline: "ROUND LOCKED",
  subheadline: "RESULTS POSTED.",
  savageCallout: "Receipts don't lie.",
  groupChatText: "Receipt is up.",
  shareCaption: "If it's not on the receipt, it didn't happen.",
  source: "fallback",
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    res.status(200).json({ ...FALLBACK, reason: "OPENAI_API_KEY missing" });
    return;
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as CopyPayload;
    const client = new OpenAI({ apiKey: key });
    const prompt = [
      "You write lightweight copy for a golf receipt.",
      "Never invent stats or money.",
      `receiptType: ${body.receiptType ?? "Winner"}`,
      `playerName: ${body.playerName ?? "Player"}`,
      `roundStats: ${JSON.stringify(body.roundStats ?? {})}`,
      "Return strict JSON with keys: headline,subheadline,savageCallout,groupChatText,shareCaption",
    ].join("\n");

    console.log("[api/generate-receipt-copy] sending OpenAI request");
    const out = await client.chat.completions.create({
      model: process.env.OPENAI_FLAVOR_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 180,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = out.choices[0]?.message?.content?.trim() ?? "";
    console.log("[api/generate-receipt-copy] raw OpenAI response", raw);
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    res.status(200).json({
      headline: parsed.headline || FALLBACK.headline,
      subheadline: parsed.subheadline || FALLBACK.subheadline,
      savageCallout: parsed.savageCallout || FALLBACK.savageCallout,
      groupChatText: parsed.groupChatText || FALLBACK.groupChatText,
      shareCaption: parsed.shareCaption || FALLBACK.shareCaption,
      source: parsed.headline ? "ai" : "fallback",
    });
  } catch (error) {
    console.error("[api/generate-receipt-copy] error", error);
    res.status(200).json({ ...FALLBACK, reason: "OpenAI request failed" });
  }
}
