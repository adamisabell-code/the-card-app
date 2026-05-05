/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

type CachedLayer = { portraitLayerUrl: string; source: string; cachedAt: number };

const portraitLayerCache = new Map<string, CachedLayer>();
const MAX_CACHE_ITEMS = 128;

function normalizeMood(mood: string): "winner" | "neutral" | "sadMad" | "callout" {
  if (mood === "winner" || mood === "neutral" || mood === "sadMad" || mood === "callout") return mood;
  return "neutral";
}

function fallbackPrompt(mood: string, playerName: string): string {
  const moodLine =
    mood === "winner"
      ? "winner/happy: confident smile, celebratory, dominant, holding golf glove or club, money-winning energy"
      : mood === "sadMad"
        ? "sad/mad/loser: frustrated, arms crossed, disappointed but competitive, down-bad sports villain energy"
        : mood === "callout"
          ? "callout: confident, shushing gesture or pointing at camera, challenger energy, come prove me wrong attitude"
          : "neutral: focused, composed, locked in, serious golfer energy";
  return [
    "Create a vertical cinematic sports trading card portrait background for Tee Party Golf.",
    "Use the uploaded player face photo as the identity reference.",
    "Preserve the person's facial identity, approximate age, skin tone, facial structure, and hairstyle.",
    "Transform them into a dramatic golf competitor portrait.",
    "Style: dark gritty premium sports-card poster, cinematic stadium lighting, black textured background, teal and gold accents for winner/MVP OR orange and gold accents for loser/down-bad, dramatic rim light, high contrast, athletic energy, slightly illustrated hyper-real sports poster look, glossy trading card finish, subtle grunge texture, golf-club atmosphere, intense competitive expression.",
    "Composition: vertical portrait, player positioned on the right side or center-right, upper body visible, enough empty negative space on the left and lower areas for app-rendered text overlays, no readable text, no logos, no QR codes, no numbers, no player name, no fake typography, no brand marks.",
    `Player: ${playerName}`,
    `Mood: ${moodLine}`,
    "Important: Do not generate any readable words, logos, QR codes, fake stats, or fake numbers.",
  ].join("\n");
}

async function loadSourceBuffer(originalPhotoUrl: string): Promise<{ buf: Buffer; mime: string }> {
  if (originalPhotoUrl.startsWith("data:image/")) {
    const [meta, payload] = originalPhotoUrl.split(",", 2);
    const mime = meta.match(/^data:([^;]+)/)?.[1] || "image/png";
    return { buf: Buffer.from(payload || "", "base64"), mime };
  }
  if (originalPhotoUrl.startsWith("blob:")) {
    throw new Error("blob: URL is browser-local and cannot be fetched server-side.");
  }
  const res = await fetch(originalPhotoUrl);
  if (!res.ok) {
    throw new Error(`Could not download source image: HTTP ${res.status}`);
  }
  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const ab = await res.arrayBuffer();
  return { buf: Buffer.from(ab), mime };
}

async function generatePortraitLayerWithOpenAi(input: {
  originalPhotoUrl: string;
  mood: string;
  playerName: string;
  prompt: string;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY missing.");
  }
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const size = (process.env.OPENAI_IMAGE_SIZE?.trim() || "1024x1536") as "1024x1024" | "1024x1536" | "1536x1024";
  const { buf, mime } = await loadSourceBuffer(input.originalPhotoUrl);
  const client = new OpenAI({ apiKey: key });
  const imageFile = await toFile(buf, `profile-${input.mood}.png`, { type: mime });
  const result = await client.images.edit({
    model,
    image: imageFile,
    prompt: input.prompt || fallbackPrompt(input.mood, input.playerName),
    n: 1,
    size,
  });
  const item = result.data?.[0];
  if (!item) throw new Error("OpenAI image edit returned no data.");
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item.url) return item.url;
  throw new Error("OpenAI image edit returned neither b64_json nor url.");
}

function buildCacheKey(input: {
  profileId: string;
  mood: string;
}): string {
  const h = createHash("sha256");
  h.update(input.profileId);
  h.update("|");
  h.update(input.mood);
  return h.digest("hex");
}

function setCache(cacheKey: string, value: CachedLayer) {
  portraitLayerCache.set(cacheKey, value);
  if (portraitLayerCache.size <= MAX_CACHE_ITEMS) return;
  const oldest = portraitLayerCache.keys().next().value;
  if (oldest) portraitLayerCache.delete(oldest);
}

export async function handleGenerateProfilePortraits(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const originalPhotoUrl = typeof body?.originalPhotoUrl === "string" ? body.originalPhotoUrl : "";
    const profileId = typeof body?.profileId === "string" && body.profileId.trim() ? body.profileId.trim() : "p-0";
    const mood = normalizeMood(typeof body?.mood === "string" ? body.mood : "neutral");
    const playerName = typeof body?.playerName === "string" ? body.playerName : "Player";
    const prompt =
      typeof body?.prompt === "string" && body.prompt.trim()
        ? body.prompt.trim()
        : fallbackPrompt(mood, playerName);

    if (!originalPhotoUrl) {
      res.status(400).json({ error: "originalPhotoUrl is required" });
      return;
    }

    console.log("[api/generate-profile-portraits] request", {
      mood,
      profileId,
      playerName,
      hasPrompt: Boolean(prompt?.trim()),
      openAiKeyPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
    });

    const cacheKey = buildCacheKey({ profileId, mood });
    const cached = portraitLayerCache.get(cacheKey);
    if (cached?.portraitLayerUrl) {
      res.status(200).json({
        portraitLayerUrl: cached.portraitLayerUrl,
        mood,
        source: "cache",
      });
      return;
    }

    try {
      console.log("[api/generate-profile-portraits] sending OpenAI image request", {
        mood,
      });
      const portraitLayerUrl = await generatePortraitLayerWithOpenAi({
        originalPhotoUrl,
        mood,
        playerName,
        prompt,
      });
      setCache(cacheKey, { portraitLayerUrl, source: "openai", cachedAt: Date.now() });
      res.status(200).json({
        portraitLayerUrl,
        mood,
        source: "openai",
      });
      return;
    } catch (openAiError) {
      console.error("[api/generate-profile-portraits] OpenAI generation failed; using fallback", openAiError);
    }

    setCache(cacheKey, { portraitLayerUrl: originalPhotoUrl, source: "fallback_mirror", cachedAt: Date.now() });
    res.status(200).json({
      portraitLayerUrl: originalPhotoUrl,
      mood,
      source: "fallback_mirror",
    });
  } catch (error) {
    console.error("[api/generate-profile-portraits] error", error);
    res.status(500).json({ error: "Could not generate profile portrait layer" });
  }
}
