import { useEffect, useMemo, useState } from "react";
import { ReceiptCard } from "./ReceiptCard.jsx";
import { generateReceiptPortraitBundle, getActivePortraitProviderInfo } from "../portrait/generationService.js";
import { revokePortraitBundle, validateImageFile } from "../portrait/pipeline.js";
import { PORTRAIT_MODES, initialsFromName } from "../portrait/types.js";

const TONE_LABELS = { neutral: "Neutral", winner: "Winner", loser: "Loser" };

/**
 * Developer-facing flow: upload → pick tone → generate → compare original / styled / receipt.
 * Isolated from production receipt home state; reuses the same `generateReceiptPortraitBundle` as the app.
 */
export function PortraitGeneratorDemo() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [tone, setTone] = useState("neutral");
  const [playerName, setPlayerName] = useState("");
  const [baseBundle, setBaseBundle] = useState(null);
  const [promptsByMode, setPromptsByMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const providerInfo = getActivePortraitProviderInfo();

  const displayBundle = useMemo(
    () => (baseBundle ? { ...baseBundle, preferredMode: tone } : null),
    [baseBundle, tone],
  );

  const generatedUrl = useMemo(() => {
    if (!baseBundle) return null;
    return baseBundle.styledPortraits[tone] ?? null;
  }, [baseBundle, tone]);

  const originalUrl = baseBundle?.rawImageUrl ?? filePreview;
  const receiptName = playerName.trim() || "Demo Player";
  const receiptInitials = initialsFromName(receiptName);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  useEffect(() => {
    return () => {
      if (baseBundle) revokePortraitBundle(baseBundle);
    };
  }, [baseBundle]);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const v = validateImageFile(f);
    if (!v.ok) {
      setErr(v.message);
      return;
    }
    setErr(null);
    setFile(f);
    setFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    if (baseBundle) revokePortraitBundle(baseBundle);
    setBaseBundle(null);
    setPromptsByMode(null);
  };

  const onGenerate = async () => {
    if (!file) {
      setErr("Upload a profile photo first.");
      return;
    }
    setLoading(true);
    setErr(null);
    const prevB = baseBundle;
    if (prevB) revokePortraitBundle(prevB);
    setBaseBundle(null);
    setPromptsByMode(null);
    setFilePreview((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
    try {
      const r = await generateReceiptPortraitBundle(file, { playerName });
      setBaseBundle({ ...r.bundle, preferredMode: tone });
      setPromptsByMode(r.promptsByMode);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not build receipt portraits.";
      setErr(message);
      if (file) {
        setFilePreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card portrait-generator-demo" aria-label="Receipt portrait generator demo">
      <h2 className="card__title card__title--sm">Receipt portrait lab</h2>
      <p className="portrait-generator-demo__lede">
        Photoreal cinematic sports-poster portraits for The Card — upload, pick winner / neutral / loser, generate,
        and preview on a sample receipt (same pipeline as the Receipt portrait flow on Recent Receipt). Not a generic
        avatar filter.
      </p>
      <p className="portrait-generator-demo__hint" role="status">
        Active provider: <strong>{providerInfo.id}</strong> ({providerInfo.kind}).{" "}
        {providerInfo.kind === "http" &&
          "All three tones call your image-to-image endpoint in parallel after the same 4:5 prep."}
        {providerInfo.kind === "placeholder" && (
          <>
            Explicit placeholder raster — set <code className="portrait-generator-demo__code">VITE_PORTRAIT_USE_PLACEHOLDER</code>{" "}
            to false (or remove) for local receipt canvas styling, or set{" "}
            <code className="portrait-generator-demo__code">VITE_PORTRAIT_GENERATION_URL</code> for HTTP.
          </>
        )}
        {providerInfo.kind === "local-pass" && "Local canvas pass matches receipt card geometry — no backend required."}
      </p>

      <div className="portrait-generator-demo__controls">
        <label className="field">
          <span className="field__label">Profile photo</span>
          <input
            className="field__input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPick}
            aria-label="Upload profile photo"
          />
        </label>
        <label className="field">
          <span className="field__label">Player name (optional)</span>
          <input
            className="field__input"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            autoComplete="off"
            placeholder="e.g. Miller T."
            aria-label="Player name for prompts and receipt"
          />
        </label>
        <div className="portrait-generator-demo__tones">
          <span className="field__label">Tone</span>
          <div className="portrait-generator-demo__toggle-group" role="group" aria-label="Portrait tone">
            {PORTRAIT_MODES.map((m) => (
              <button
                key={m}
                type="button"
                className={`portrait-generator-demo__toggle${tone === m ? " portrait-generator-demo__toggle--active" : ""}`}
                onClick={() => setTone(m)}
              >
                {TONE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="portrait-generator-demo__actions">
          <button type="button" className="btn btn--primary" onClick={onGenerate} disabled={loading || !file}>
            {loading ? "Generating…" : "Generate receipt portrait"}
          </button>
        </div>
        {err && <p className="portrait-generator-demo__err">{err}</p>}
      </div>

      <div className="portrait-generator-demo__compare" aria-hidden={!originalUrl && !generatedUrl}>
        <figure className="portrait-generator-demo__figure">
          <figcaption>Original (uploaded)</figcaption>
          <div
            className={
              "portrait-generator-demo__img-wrap" + (originalUrl ? " portrait-generator-demo__img-wrap--on" : "")
            }
          >
            {originalUrl ? (
              <img className="portrait-generator-demo__img" src={originalUrl} alt="Uploaded source" decoding="async" />
            ) : (
              <span className="portrait-generator-demo__ph">No image yet</span>
            )}
          </div>
        </figure>
        <figure className="portrait-generator-demo__figure">
          <figcaption>Generated ({TONE_LABELS[tone]})</figcaption>
          <div
            className={
              "portrait-generator-demo__img-wrap" + (generatedUrl ? " portrait-generator-demo__img-wrap--on" : "")
            }
          >
            {generatedUrl ? (
              <img
                className="portrait-generator-demo__img portrait-generator-demo__img--styled"
                src={generatedUrl}
                alt={`${TONE_LABELS[tone]} receipt portrait`}
                decoding="async"
              />
            ) : (
              <span className="portrait-generator-demo__ph">Generate to preview</span>
            )}
          </div>
        </figure>
      </div>

      <div className="portrait-generator-demo__receipt-block">
        <h3 className="portrait-generator-demo__h3">Sample receipt card (uses selected tone)</h3>
        <p className="portrait-generator-demo__sub">
          {displayBundle
            ? `Preferred mode: ${TONE_LABELS[displayBundle.preferredMode]}. Portrait URL matches ReceiptCard.`
            : "Generate a portrait to drive the card."}
        </p>
        <div className="portrait-generator-demo__receipt-wrap">
          <ReceiptCard
            playerName={receiptName}
            amountLabel="+$120"
            stamp="DEMO — RECEIPT PORTRAIT"
            badges={["Receipt Lab"]}
            portraitBundle={displayBundle}
            initials={receiptInitials}
          />
        </div>
      </div>

      {promptsByMode && baseBundle && (
        <details className="portrait-generator-demo__prompts">
          <summary>Locked prompt (current tone, for API audit)</summary>
          <pre className="portrait-generator-demo__pre">{promptsByMode[tone]}</pre>
        </details>
      )}
    </section>
  );
}
