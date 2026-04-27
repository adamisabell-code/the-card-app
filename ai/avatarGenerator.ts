import OpenAI from "openai";
import { toFile } from "openai/uploads";
import type { StorageAdapter } from "../storage/storageAdapter.js";

/** Where to call: once on profile photo upload/update (server route). Do NOT call from receipt generation. */
export type GeneratePlayerAvatarsInput = {
  playerId: string;
  displayName: string;
} & (
  | { sourceImageFile: Buffer; sourceImageMime?: string }
  | { sourceImageUrl: string }
);

export type GeneratePlayerAvatarsResult = {
  happyAvatarUrl: string;
  neutralAvatarUrl: string;
  sadAvatarUrl: string;
};

const HAPPY_PROMPT =
  "Create a premium sports-card style avatar portrait based on the uploaded person. Preserve their facial likeness. Mood: victorious, confident, slight smile, winner energy. Dark athletic background, teal and gold accent lighting, high contrast, clean dramatic composition, 4:5 portrait, Tee Party Golf style.";

const NEUTRAL_PROMPT =
  "Create a premium sports-card style avatar portrait based on the uploaded person. Preserve their facial likeness. Mood: focused, calm, competitive, game-face expression. Dark athletic background, teal and cream accent lighting, high contrast, clean dramatic composition, 4:5 portrait, Tee Party Golf style.";

const SAD_PROMPT =
  "Create a premium sports-card style avatar portrait based on the uploaded person. Preserve their facial likeness. Mood: disappointed but not pathetic, defeated after a tough round, subtle frustration, still premium and athletic. Dark athletic background, muted teal and amber lighting, high contrast, clean dramatic composition, 4:5 portrait, Tee Party Golf style.";

async function loadSourceBuffer(input: GeneratePlayerAvatarsInput): Promise<{ buf: Buffer; mime: string }> {
  if ("sourceImageFile" in input) {
    return {
      buf: input.sourceImageFile,
      mime: input.sourceImageMime?.trim() || "image/png",
    };
  }
  const res = await fetch(input.sourceImageUrl);
  if (!res.ok) {
    throw new Error(`Could not download source image: HTTP ${res.status}`);
  }
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const ab = await res.arrayBuffer();
  return { buf: Buffer.from(ab), mime };
}

function extensionForMime(mime: string): string {
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "png";
}

async function editOnePortrait(openai: OpenAI, imageBytes: Buffer, filename: string, mime: string, prompt: string): Promise<Buffer> {
  const imageFile = await toFile(imageBytes, filename, { type: mime });
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const size = (process.env.OPENAI_IMAGE_SIZE?.trim() || "1024x1024") as "1024x1024" | "1024x1536" | "1536x1024";

  const resp = await openai.images.edit({
    model,
    image: imageFile,
    prompt,
    n: 1,
    size,
  });

  const item = resp.data?.[0];
  if (!item) throw new Error("OpenAI image edit returned no data.");

  if (item.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error("Could not download edited image URL from OpenAI.");
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error("OpenAI image edit returned neither b64_json nor url.");
}

/**
 * Generates three mood variants and stores them via `storage`.
 * Call only from a trusted server route when the user uploads/changes their profile photo.
 */
export async function generatePlayerAvatars(
  input: GeneratePlayerAvatarsInput,
  deps: { openai: OpenAI; storage: StorageAdapter },
): Promise<GeneratePlayerAvatarsResult> {
  const { playerId, displayName } = input;
  const safeId = playerId.replace(/[^a-zA-Z0-9_-]/g, "") || "player";
  const { buf, mime } = await loadSourceBuffer(input);
  const ext = extensionForMime(mime);
  const uploadName = `upload-${safeId}.${ext}`;

  void displayName;

  const [happyBuf, neutralBuf, sadBuf] = await Promise.all([
    editOnePortrait(deps.openai, buf, uploadName, mime, HAPPY_PROMPT),
    editOnePortrait(deps.openai, buf, uploadName, mime, NEUTRAL_PROMPT),
    editOnePortrait(deps.openai, buf, uploadName, mime, SAD_PROMPT),
  ]);

  const baseKey = `avatars/${safeId}`;
  const outMime = "image/png";

  const [happy, neutral, sad] = await Promise.all([
    deps.storage.putObject(`${baseKey}/happy.png`, happyBuf, outMime),
    deps.storage.putObject(`${baseKey}/neutral.png`, neutralBuf, outMime),
    deps.storage.putObject(`${baseKey}/sad.png`, sadBuf, outMime),
  ]);

  return {
    happyAvatarUrl: happy.publicUrl,
    neutralAvatarUrl: neutral.publicUrl,
    sadAvatarUrl: sad.publicUrl,
  };
}
