import { useCallback, useRef, useState } from "react";
import { MAX_PORTRAIT_REGENERATES, PORTRAIT_MODES } from "../portrait/types.js";
import { PORTRAIT_OUTPUT } from "../portrait/receiptPortraitSpec.js";
import { regeneratePortraitBundle } from "../portrait/generationService.js";
import {
  generateReceiptPortraitBundleFromOpenAiServer,
  generateReceiptPortraitBundleWithOpenAiFallback,
  isOpenAiAvatarClientEnabled,
} from "../portrait/openAiAvatarClient.js";
import { createPlaceholderPortraitBundle } from "../portrait/placeholderReceiptBundle.js";
import { revokePortraitBundle, validateImageFile } from "../portrait/pipeline.js";
import {
  buildPersistedRecordFromBundle,
  fingerprintForFile,
  hydrateBundleFromPersistedRecord,
  loadPersistedPortraitProfile,
  savePersistedPortraitProfile,
} from "../portrait/userPortraitProfile.js";
import {
  loadPlayerAvatarProfileState,
  upsertPlayerAvatarProfileState,
} from "../portrait/avatarProfileState.js";

const STEPS = ["validate", "preprocess", "stylize"];

/**
 * @param {{
 *   onBack: () => void
 *   onSave: (bundle: import('../portrait/types.js').PortraitBundle) => void
 *   initialBundle?: import('../portrait/types.js').PortraitBundle | null
 *   heroDisplayName?: string
 *   returnAfterSave?: boolean — if false, does not call onBack after a successful save (e.g. embedded in another flow)
 *   headerTitle?: string — override main heading (e.g. preseason flow)
 *   playerId?: string
 * }} props
 */
export function PortraitSetupFlow({
  onBack,
  onSave,
  initialBundle = null,
  heroDisplayName = "Player",
  returnAfterSave = true,
  headerTitle = "Receipt portrait",
  playerId = "p-0",
}) {
  const [phase, setPhase] = useState(initialBundle ? "preview" : "pick");
  const [bundle, setBundle] = useState(initialBundle);
  const [processStep, setProcessStep] = useState(0);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(
    initialBundle?.preferredMode || "neutral",
  );
  /** Receipt tone chosen before upload — becomes default on-card portrait after generation. */
  const [preferredToneChoice, setPreferredToneChoice] = useState(
    initialBundle?.preferredMode || "neutral",
  );
  /** Source file for this session — used to persist originals and skip regen when fingerprint matches. */
  const lastSourceFileRef = useRef(null);

  const runProcess = useCallback(async (file) => {
    setError(null);
    setPhase("process");
    setProcessStep(0);
    upsertPlayerAvatarProfileState(playerId, "pending");
    try {
      const persisted = await loadPersistedPortraitProfile();
      if (persisted && fingerprintForFile(file) === persisted.sourceFingerprint) {
        await new Promise((r) => setTimeout(r, 200));
        setProcessStep(2);
        const hydrated = await hydrateBundleFromPersistedRecord(persisted);
        lastSourceFileRef.current = file;
        const merged = { ...hydrated, preferredMode: preferredToneChoice };
        setBundle(merged);
        setPreviewMode(preferredToneChoice);
        setPhase("preview");
        upsertPlayerAvatarProfileState(playerId, "ready");
        return;
      }

      await new Promise((r) => setTimeout(r, 280));
      setProcessStep(1);
      await new Promise((r) => setTimeout(r, 320));
      setProcessStep(2);
      const { bundle: next } = await generateReceiptPortraitBundleWithOpenAiFallback(file, {
        previousBundle: bundle,
        displayName: heroDisplayName,
        playerId: "p-0",
      });
      lastSourceFileRef.current = file;
      const merged = { ...next, preferredMode: preferredToneChoice };
      setBundle(merged);
      setPreviewMode(preferredToneChoice);
      setPhase("preview");
      upsertPlayerAvatarProfileState(playerId, "ready");
    } catch (e) {
      upsertPlayerAvatarProfileState(playerId, "failed");
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("pick");
    }
  }, [bundle, preferredToneChoice, heroDisplayName, playerId]);

  const handleUsePlaceholders = async () => {
    setError(null);
    setPhase("process");
    setProcessStep(2);
    try {
      await new Promise((r) => setTimeout(r, 160));
      setProcessStep(1);
      await new Promise((r) => setTimeout(r, 120));
      setProcessStep(2);
      if (bundle) revokePortraitBundle(bundle);
      const next = await createPlaceholderPortraitBundle(heroDisplayName, preferredToneChoice);
      lastSourceFileRef.current = null;
      const merged = { ...next, preferredMode: preferredToneChoice };
      setBundle(merged);
      setPreviewMode(preferredToneChoice);
      setPhase("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build placeholders.");
      setPhase("pick");
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.ok) {
      setError(v.message);
      return;
    }
    setError(null);
    runProcess(file);
  };

  const handleRegenerate = async () => {
    if (!bundle || bundle.isPlaceholder) return;
    setError(null);
    setPhase("process");
    setProcessStep(2);
    upsertPlayerAvatarProfileState(playerId, "pending");
    try {
      await new Promise((r) => setTimeout(r, 200));
      let next;
      if (isOpenAiAvatarClientEnabled() && lastSourceFileRef.current) {
        const { bundle: regen } = await generateReceiptPortraitBundleFromOpenAiServer(lastSourceFileRef.current, {
          previousBundle: bundle,
          displayName: heroDisplayName,
          playerId: "p-0",
        });
        next = {
          ...regen,
          regenerateCount: Math.min(bundle.regenerateCount + 1, MAX_PORTRAIT_REGENERATES),
        };
      } else {
        next = await regeneratePortraitBundle(bundle);
      }
      const existing = await loadPersistedPortraitProfile();
      const record = await buildPersistedRecordFromBundle(next, lastSourceFileRef.current, existing);
      await savePersistedPortraitProfile(record);
      setBundle(next);
      setPhase("preview");
      upsertPlayerAvatarProfileState(playerId, "ready");
    } catch (e) {
      upsertPlayerAvatarProfileState(playerId, "failed");
      setError(e instanceof Error ? e.message : "Regenerate failed.");
      setPhase("preview");
    }
  };

  const handleSave = async () => {
    if (!bundle) return;
    try {
      const existing = await loadPersistedPortraitProfile();
      const toSave = { ...bundle, preferredMode: previewMode };
      const record = await buildPersistedRecordFromBundle(toSave, lastSourceFileRef.current, existing);
      await savePersistedPortraitProfile(record);
      upsertPlayerAvatarProfileState(playerId, "ready");
      onSave(toSave);
      if (returnAfterSave) onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save portrait profile.");
    }
  };

  const canRegenerate =
    bundle && !bundle.isPlaceholder && bundle.regenerateCount < MAX_PORTRAIT_REGENERATES;
  const avatarProfileState = loadPlayerAvatarProfileState(playerId);

  return (
    <div className="portrait-setup">
      <header className="portrait-setup__header">
        <button type="button" className="start-round__back" onClick={onBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="portrait-setup__title">{headerTitle}</h1>
      </header>

      <div className="portrait-setup__body">
        {phase === "pick" && (
          <section className="portrait-setup__section">
            <p className="portrait-setup__lede">
              Upload a photo for stylized portraits, or use on-card placeholders (Happy / Neutral / Sad) while you
              wire optional AI later — both work for receipts.
            </p>
            <p className="portrait-setup__hint portrait-setup__hint--pick">Receipt tone for your card</p>
            <div className="portrait-setup__tabs portrait-setup__tabs--pick" role="tablist" aria-label="Receipt portrait tone">
              {PORTRAIT_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={preferredToneChoice === mode}
                  className={`portrait-setup__tab${preferredToneChoice === mode ? " is-active" : ""}`}
                  onClick={() => setPreferredToneChoice(mode)}
                >
                  {mode === "neutral" && "Neutral"}
                  {mode === "winner" && "Happy"}
                  {mode === "loser" && "Sad"}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn--outline portrait-setup__placeholder-btn" onClick={handleUsePlaceholders}>
              Use placeholder card art (no upload)
            </button>
            <label className="portrait-setup__upload btn btn--primary">
              Choose photo
              <input className="portrait-setup__file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
            </label>
            {error && <p className="portrait-setup__error">{error}</p>}
          </section>
        )}

        {phase === "process" && (
          <section className="portrait-setup__section portrait-setup__section--center">
            <p className="portrait-setup__status">Preparing your receipt look…</p>
            <ol className="portrait-setup__steps">
              {STEPS.map((label, i) => (
                <li key={label} className={`portrait-setup__step${i <= processStep ? " is-done" : ""}`}>
                  {label === "validate" && "Checking photo"}
                  {label === "preprocess" && "Chest-up crop (4:5)"}
                  {label === "stylize" && "Apply receipt styles"}
                </li>
              ))}
            </ol>
          </section>
        )}

        {phase === "preview" && bundle && (
          <section className="portrait-setup__section">
            <p className="portrait-setup__hint">
              Preview — three receipt moods{bundle?.isPlaceholder ? " (placeholder art)" : ""} (Happy / Neutral / Sad).
            </p>
            <div className="portrait-setup__tabs" role="tablist" aria-label="Portrait style">
              {PORTRAIT_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={previewMode === mode}
                  className={`portrait-setup__tab${previewMode === mode ? " is-active" : ""}`}
                  onClick={() => setPreviewMode(mode)}
                >
                  {mode === "neutral" && "Neutral"}
                  {mode === "winner" && "Happy"}
                  {mode === "loser" && "Sad"}
                </button>
              ))}
            </div>
            <div className="portrait-setup__preview">
              <div className="portrait-setup__preview-frame">
                <img
                  className="portrait-setup__preview-img"
                  src={bundle.styledPortraits[previewMode]}
                  alt={`${previewMode} portrait preview`}
                  width={PORTRAIT_OUTPUT.width}
                  height={PORTRAIT_OUTPUT.height}
                  decoding="async"
                />
              </div>
            </div>
            <p className="portrait-setup__meta">
              {bundle?.isPlaceholder
                ? "Placeholder portraits — swap to a photo anytime."
                : `Regenerations left: ${MAX_PORTRAIT_REGENERATES - bundle.regenerateCount}`}
            </p>
            <p className="portrait-setup__meta">Locked in. This is how you'll show up on receipts.</p>
            <p className="portrait-setup__meta">
              Avatar status: <strong>{avatarProfileState?.avatarStatus ?? "pending"}</strong>
            </p>
            <div className="portrait-setup__actions">
              <button type="button" className="btn btn--outline" onClick={handleRegenerate} disabled={!canRegenerate}>
                Regenerate styles
              </button>
              <label className="btn btn--outline portrait-setup__upload-inline">
                Choose different photo
                <input className="portrait-setup__file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
              </label>
              <button type="button" className="btn btn--primary" onClick={handleSave}>
                Use on receipts
              </button>
            </div>
            {error && <p className="portrait-setup__error">{error}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
