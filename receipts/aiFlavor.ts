import type OpenAI from "openai";
import type { ReceiptType } from "./receiptTypes.js";

/**
 * Server-only: uses OpenAI chat. Do not import this module from client bundles.
 * Controlled by `ENABLE_AI_RECEIPT_FLAVOR` (must be the string `"true"`).
 */
export function isAiReceiptFlavorEnabled(): boolean {
  return process.env.ENABLE_AI_RECEIPT_FLAVOR === "true";
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeFlavor(raw: string): string | null {
  const oneLine = raw.replace(/\s+/g, " ").replace(/["'`]/g, "").trim();
  if (!oneLine) return null;
  const firstSentence = oneLine.split(/[.!?]/)[0]?.trim() ?? oneLine;
  const words = firstSentence.split(/\s+/).filter(Boolean);
  const clipped = words.slice(0, 10).join(" ");
  if (wordCount(clipped) > 10) return null;
  if (wordCount(clipped) < 2) return null;
  return clipped;
}

export type ReceiptFlavorContext = {
  receiptType: ReceiptType;
  playerName: string;
  badges: string[];
  stamp: string;
};

/**
 * Returns a single short line or `null` on disable / failure / unsafe output.
 * AI must not decide receipt type or amounts — caller passes those as read-only context.
 */
export async function generateReceiptFlavorLine(
  client: OpenAI,
  ctx: ReceiptFlavorContext,
  opts?: { onRaw?: (raw: string | undefined) => void },
): Promise<string | null> {
  if (!isAiReceiptFlavorEnabled()) return null;

  const model = process.env.OPENAI_FLAVOR_MODEL?.trim() || "gpt-4o-mini";

  const system = [
    "You write optional one-liner flavor for a competitive golf receipt.",
    "Rules: one sentence max; prefer 8 words or fewer; competitive golf tone;",
    "slightly savage but not hateful; no profanity; no slurs; no cringe slang;",
    "do not mention protected traits; no gambling advice; safe to post publicly.",
    "Output ONLY the line, no quotes, no punctuation at end required.",
  ].join(" ");

  const user = [
    `Receipt archetype: ${ctx.receiptType}`,
    `Player: ${ctx.playerName}`,
    `Stamp: ${ctx.stamp}`,
    `Badges: ${ctx.badges.join(", ")}`,
    "Write one short flavor line (not a full receipt).",
  ].join("\n");

  try {
    console.log("[receipt-flavor][server] OpenAI chat.completions.create", { model, receiptType: ctx.receiptType });
    const res = await client.chat.completions.create({
      model,
      temperature: 0.85,
      max_tokens: 48,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = res.choices[0]?.message?.content;
    opts?.onRaw?.(typeof raw === "string" ? raw : undefined);
    console.log("[receipt-flavor][server] raw model content (pre-sanitize):", raw);
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return null;
    const out = sanitizeFlavor(text);
    console.log("[receipt-flavor][server] sanitized flavor:", out);
    return out;
  } catch (e) {
    console.error("[receipt-flavor][server] OpenAI error", e);
    return null;
  }
}
