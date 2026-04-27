/**
 * The Card — minimal AI API server (OpenAI key stays here only).
 *
 * Routes:
 * - POST /api/avatars — multipart `image`, fields `playerId`, `displayName` (optional)
 * - POST /api/receipt-flavor — JSON body from `ReceiptFlavorContext`
 * - PUT /api/public-round/:id — in-memory public round snapshot for Share Round (short link + QR)
 * - GET /api/public-round/:id
 *
 * Run: `npm run server` (requires OPENAI_API_KEY in `.env` or environment).
 */
import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePlayerAvatars } from "../ai/avatarGenerator.js";
import { createOpenAIClient } from "../ai/openaiClient.js";
import { generateReceiptFlavorLine, isAiReceiptFlavorEnabled } from "../receipts/aiFlavor.js";
import type { ReceiptFlavorContext } from "../receipts/aiFlavor.js";
import { createLocalDiskStorage } from "./storageLocal.js";

// TODO: Production "short link" public round storage must be persistent (e.g. Redis, Postgres, or
// object storage with TTL) — the in-memory `Map` below is per-process, lost on restart, and not
// multi-instance safe. Do not change architecture in this file yet; when moving to production,
// replace the Map with a real store and keep the same JSON shape (v1 snapshot).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ROOT = path.join(__dirname, "public");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

const app = express();
app.use(express.json({ limit: "64kb" }));

const storage = createLocalDiskStorage(PUBLIC_ROOT);
app.use(
  "/avatars-static",
  express.static(PUBLIC_ROOT, {
    fallthrough: false,
    maxAge: "7d",
  }),
);

app.post("/api/avatars", upload.single("image"), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ error: "Missing multipart field `image`." });
      return;
    }
    const playerId = String(req.body?.playerId ?? "p-0").trim() || "p-0";
    const displayName = String(req.body?.displayName ?? "").trim() || "Player";
    const mime = req.file.mimetype || "image/png";

    const openai = createOpenAIClient();
    const out = await generatePlayerAvatars(
      {
        playerId,
        displayName,
        sourceImageFile: req.file.buffer,
        sourceImageMime: mime,
      },
      { openai, storage },
    );

    const host = req.get("host");
    const proto = req.protocol;
    const origin = host ? `${proto}://${host}` : "";
    const absolutize = (u: string) => (u.startsWith("/") ? `${origin}${u}` : u);

    res.json({
      happyAvatarUrl: absolutize(out.happyAvatarUrl),
      neutralAvatarUrl: absolutize(out.neutralAvatarUrl),
      sadAvatarUrl: absolutize(out.sadAvatarUrl),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Avatar generation failed.";
    res.status(500).json({ error: msg });
  }
});

app.post("/api/receipt-flavor", async (req, res) => {
  try {
    if (!isAiReceiptFlavorEnabled()) {
      res.json({ aiFlavorText: null });
      return;
    }
    const body = req.body as Partial<ReceiptFlavorContext>;
    if (!body?.receiptType || typeof body.playerName !== "string" || !Array.isArray(body.badges)) {
      res.status(400).json({ error: "Invalid body; expected receiptType, playerName, badges[], stamp." });
      return;
    }
    const ctx: ReceiptFlavorContext = {
      receiptType: body.receiptType,
      playerName: body.playerName,
      badges: body.badges.map(String),
      stamp: typeof body.stamp === "string" ? body.stamp : "",
    };
    const openai = createOpenAIClient();
    const aiFlavorText = await generateReceiptFlavorLine(openai, ctx);
    res.json({ aiFlavorText });
  } catch {
    res.json({ aiFlavorText: null });
  }
});

const PUBLIC_ROUND_TTL_MS = 48 * 60 * 60 * 1000;
const publicRoundById = new Map<string, { savedAt: number; payload: object }>();
const publicRoundIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sweepPublicRounds() {
  const t = Date.now();
  for (const [k, v] of publicRoundById) {
    if (t - v.savedAt > PUBLIC_ROUND_TTL_MS) publicRoundById.delete(k);
  }
  if (publicRoundById.size > 2000) {
    const byAge = [...publicRoundById.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt);
    while (publicRoundById.size > 2000) {
      publicRoundById.delete(byAge.shift()?.[0] ?? "");
    }
  }
}

app.put(
  "/api/public-round/:id",
  express.json({ limit: "600kb" }),
  (req, res) => {
    try {
      const id = String(req.params.id ?? "");
      if (!publicRoundIdPattern.test(id)) {
        res.status(400).json({ error: "Invalid round id." });
        return;
      }
      const body = req.body;
      if (body == null || typeof body !== "object" || (body as { v?: unknown }).v !== 1) {
        res.status(400).json({ error: "Invalid snapshot; expected { v: 1, ... }" });
        return;
      }
      sweepPublicRounds();
      // Storage is the in-memory Map (see TODO at top) — not durable across restarts.
      publicRoundById.set(id, { savedAt: Date.now(), payload: body as object });
      res.status(204).end();
    } catch {
      res.status(500).json({ error: "Could not store round." });
    }
  },
);

app.get("/api/public-round/:id", (req, res) => {
  const id = String(req.params.id ?? "");
  if (!publicRoundIdPattern.test(id)) {
    res.status(400).json({ error: "Invalid round id." });
    return;
  }
  const row = publicRoundById.get(id);
  if (!row || Date.now() - row.savedAt > PUBLIC_ROUND_TTL_MS) {
    res.status(404).json({ error: "Not found or expired." });
    return;
  }
  res.json(row.payload);
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`The Card AI server listening on http://127.0.0.1:${port}`);
});
