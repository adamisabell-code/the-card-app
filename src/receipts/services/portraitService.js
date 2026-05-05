import { loadStoredPortraitBundle, resolveProfilePhotoPath, RECEIPT_PORTRAIT_PLACEHOLDER_PATH } from "./profilePortraitService.js";
import { receiptLog } from "./receiptDebugLogger.js";

const PORTRAIT_LAYER_CACHE_KEY = "the-card-portrait-layer-cache-v1";

const MOOD_TO_STYLE = {
  winner: "winner/happy: confident smile, celebratory, dominant, holding golf glove or club, money-winning energy",
  neutral: "neutral: focused, composed, locked in, serious golfer energy",
  sadMad: "sad/mad/loser: frustrated, arms crossed, disappointed but competitive, down-bad sports villain energy",
  callout: "callout: confident, shushing gesture or pointing at camera, challenger energy, come prove me wrong attitude",
};

function readCache() {
  try {
    const raw = localStorage.getItem(PORTRAIT_LAYER_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(PORTRAIT_LAYER_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

export function buildAiPortraitPrompt(mood) {
  const moodLine = MOOD_TO_STYLE[mood] ?? MOOD_TO_STYLE.neutral;
  return [
    "Create a vertical cinematic sports trading card portrait background for Tee Party Golf.",
    "Use the uploaded player face photo as the identity reference.",
    "Preserve the person's facial identity, approximate age, skin tone, facial structure, and hairstyle.",
    "Transform them into a dramatic golf competitor portrait.",
    "Style: dark gritty premium sports-card poster, cinematic stadium lighting, black textured background, teal and gold accents for winner/MVP OR orange and gold accents for loser/down-bad, dramatic rim light, high contrast, athletic energy, slightly illustrated hyper-real sports poster look, glossy trading card finish, subtle grunge texture, golf-club atmosphere, intense competitive expression.",
    "Composition: vertical portrait, player positioned on the right side or center-right, upper body visible, face and torso should occupy about 35-45 percent of frame width, keep left side and lower third clean with simple dark gradient for text overlays.",
    "Do not clutter the frame. Avoid crowds, extra people, floating props, random symbols, confetti, fireworks, or busy backgrounds.",
    "No readable text, no logos, no QR codes, no numbers, no player name, no fake typography, no brand marks.",
    `Mood: ${moodLine}`,
    "Do not generate any readable words. Do not generate fake logos. Do not generate fake stats. Do not generate QR codes.",
    "Output a polished cinematic portrait layer suitable for a sports receipt card, with clean negative space for code-rendered overlays.",
  ].join("\n");
}

async function fetchApiPortraitLayer(profilePhotoPath, mood, playerName, profileId) {
  const prompt = buildAiPortraitPrompt(mood);
  try {
    const res = await fetch("/api/generate-profile-portraits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        originalPhotoUrl: profilePhotoPath,
        profileId,
        mood,
        playerName,
        prompt,
      }),
    });
    if (!res.ok) {
      receiptLog("portrait layer api failed", { mood, status: res.status });
      return null;
    }
    const data = await res.json();
    return typeof data.portraitLayerUrl === "string" && data.portraitLayerUrl ? data.portraitLayerUrl : null;
  } catch (error) {
    receiptLog("portrait layer api error", { mood, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function fallbackPortraitLayer(profilePhotoPath, mood) {
  const stored = await loadStoredPortraitBundle();
  if (stored?.styledPortraits) {
    const byMood = {
      winner: stored.styledPortraits.winner,
      neutral: stored.styledPortraits.neutral,
      sadMad: stored.styledPortraits.loser,
      callout: stored.styledPortraits.winner || stored.styledPortraits.neutral,
    };
    return byMood[mood] || stored.rawImageUrl || profilePhotoPath || RECEIPT_PORTRAIT_PLACEHOLDER_PATH;
  }
  return profilePhotoPath || RECEIPT_PORTRAIT_PLACEHOLDER_PATH;
}

export async function ensurePortraitLayer(params) {
  const mood = params.mood;
  const playerName = params.playerName ?? "Player";
  const profileId = params.profileId ?? "p-0";
  const profilePhotoPath = await resolveProfilePhotoPath(params.profilePhotoPath ?? null);

  const cache = readCache();
  const cacheKey = `${profileId}::${mood}`;
  if (cache[cacheKey]?.url) {
    return { portraitLayerUrl: cache[cacheKey].url, source: "cache", profilePhotoPath };
  }

  const fromApi = await fetchApiPortraitLayer(profilePhotoPath, mood, playerName, profileId);
  if (fromApi) {
    cache[cacheKey] = { url: fromApi, generatedAt: Date.now(), mood };
    writeCache(cache);
    receiptLog("portrait layer cached", { mood, source: "api" });
    return { portraitLayerUrl: fromApi, source: "api", profilePhotoPath };
  }

  const fallback = await fallbackPortraitLayer(profilePhotoPath, mood);
  cache[cacheKey] = { url: fallback, generatedAt: Date.now(), mood, fallback: true };
  writeCache(cache);
  receiptLog("portrait layer cached", { mood, source: "fallback" });
  return { portraitLayerUrl: fallback, source: "fallback", profilePhotoPath };
}

export async function primePortraitLayers(params) {
  const moods = ["winner", "neutral", "sadMad", "callout"];
  const out = {};
  for (const mood of moods) {
    const ensured = await ensurePortraitLayer({
      mood,
      profileId: params.profileId ?? "p-0",
      profilePhotoPath: params.profilePhotoPath,
      playerName: params.playerName,
    });
    out[mood] = ensured.portraitLayerUrl;
  }
  receiptLog("portrait variants generated", { source: "hybrid", moods: Object.keys(out) });
  return out;
}
