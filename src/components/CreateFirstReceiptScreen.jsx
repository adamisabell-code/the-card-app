import { useCallback, useState } from "react";
import { PortraitSetupFlow } from "./PortraitSetupFlow.jsx";
import { ReceiptCard } from "./ReceiptCard.jsx";
import { ReceiptThemePicker } from "./ReceiptThemePicker.jsx";
import {
  getPreseasonTypeById,
  PRESEASON_AMOUNT_LABEL,
  PRESEASON_BADGES,
  PRESEASON_RECEIPT_TYPES,
  savePreseasonReceiptSnapshot,
} from "../home/preseasonReceipt.js";
import { initialsFromName } from "../portrait/types.js";
import { revokePortraitBundle } from "../portrait/pipeline.js";
import { DEFAULT_RECEIPT_THEME_ID, normalizeReceiptThemeId } from "../receiptThemes.js";

/**
 * @param {{
 *   onBack: () => void
 *   onPortraitSaved: (bundle: import('../portrait/types.js').PortraitBundle) => void
 *   onCommitPreseason: (data: { playerName: string, typeId: import('../home/preseasonReceipt.js').PreseasonReceiptTypeId, bundle: import('../portrait/types.js').PortraitBundle }) => void
 *   onStartFirstRound: () => void
 * }} props
 */
export function CreateFirstReceiptScreen({ onBack, onPortraitSaved, onCommitPreseason, onStartFirstRound }) {
  const [step, setStep] = useState(/** @type { 'name' | 'portrait' | 'choose' } */ ("name"));
  const [playerName, setPlayerName] = useState("");
  const [portraitBundle, setPortraitBundle] = useState(/** @type {import('../portrait/types.js').PortraitBundle | null} */ (null));
  const [typeId, setTypeId] = useState(/** @type {import('../home/preseasonReceipt.js').PreseasonReceiptTypeId | null} */ (null));
  const [receiptThemeId, setReceiptThemeId] = useState(DEFAULT_RECEIPT_THEME_ID);

  const nameOk = playerName.trim().length >= 1;
  const selected = typeId ? getPreseasonTypeById(typeId) : null;

  const persistAndShare = useCallback(
    (after) => {
      if (!portraitBundle || !typeId || !selected) return;
      const snap = {
        typeId,
        playerName: playerName.trim(),
        stamp: selected.stamp,
        flavor: selected.flavor,
        amountLabel: PRESEASON_AMOUNT_LABEL,
        badges: [...PRESEASON_BADGES],
        savedAt: Date.now(),
      };
      savePreseasonReceiptSnapshot(snap);
      onCommitPreseason({ playerName: playerName.trim(), typeId, bundle: portraitBundle });
      if (after) after();
    },
    [onCommitPreseason, playerName, portraitBundle, selected, typeId],
  );

  const shareReceipt = useCallback(() => {
    if (!portraitBundle || !typeId || !selected) return;
    const title = `The Card — ${selected.label}`;
    const text = `${playerName.trim()} — ${selected.stamp}. ${selected.flavor}`;
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) {
      void navigator.share({ title, text, url }).catch(() => {
        void navigator.clipboard.writeText(`${text}\n${url}`);
      });
    } else {
      void navigator.clipboard.writeText(`${text}\n${url}`);
    }
  }, [playerName, portraitBundle, selected, typeId]);

  const inviteGroup = useCallback(() => {
    const kitUrl = `${window.location.origin}/first-receipt`;
    const body = `Join the league and create your first receipt: ${kitUrl}`;
    if (navigator.share) {
      void navigator.share({ title: "The Card — invite", text: body, url: kitUrl }).catch(() => {
        void navigator.clipboard.writeText(body);
      });
    } else {
      void navigator.clipboard.writeText(body);
    }
  }, []);

  const handleStartRound = useCallback(() => {
    persistAndShare(() => onStartFirstRound());
  }, [onStartFirstRound, persistAndShare]);

  if (step === "portrait") {
    return (
      <PortraitSetupFlow
        onBack={() => setStep("name")}
        onSave={(b) => {
          if (portraitBundle) revokePortraitBundle(portraitBundle);
          setPortraitBundle(b);
          onPortraitSaved(b);
          setStep("choose");
        }}
        returnAfterSave={false}
        headerTitle="Your photo for the Card"
        heroDisplayName={playerName.trim() || "Player"}
        initialBundle={portraitBundle}
      />
    );
  }

  return (
    <div className="start-round create-first-receipt">
      <header className="create-first-receipt__header">
        <button type="button" className="start-round__back" onClick={onBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="create-first-receipt__head-text">
          <h1 className="create-first-receipt__title">Create Your First Receipt</h1>
          <p className="create-first-receipt__sub">Preseason — before your first round</p>
        </div>
      </header>

      {step === "name" && (
        <div className="create-first-receipt__body">
          <section className="card create-first-receipt__section">
            <h2 className="card__title card__title--sm">Your name</h2>
            <p className="create-first-receipt__lede">This name appears on your receipt and as Player 1 when you start a round.</p>
            <label className="field field--solo">
              <span className="field__label">Display name</span>
              <input
                className="field__input"
                type="text"
                autoComplete="name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your name"
                maxLength={64}
              />
            </label>
            <button type="button" className="btn btn--primary" disabled={!nameOk} onClick={() => setStep("portrait")}>
              Next — add photo
            </button>
          </section>
        </div>
      )}

      {step === "choose" && (
        <div className="create-first-receipt__body create-first-receipt__body--scroll">
          <section className="create-first-receipt__section create-first-receipt__section--types">
            <h2 className="card__title card__title--sm">Choose your receipt</h2>
            <p className="create-first-receipt__lede">Pick a preseason challenge. You can always play rounds for a game receipt later.</p>
            <div className="create-first-receipt__type-grid" role="radiogroup" aria-label="Preseason receipt type">
              {PRESEASON_RECEIPT_TYPES.map((t) => {
                const active = typeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`create-first-receipt__type-btn${active ? " create-first-receipt__type-btn--active" : ""}`}
                    onClick={() => setTypeId(t.id)}
                  >
                    <span className="create-first-receipt__type-label">{t.label}</span>
                    <span className="create-first-receipt__type-stamp">{t.stamp}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {portraitBundle && selected && (
            <section className="create-first-receipt__preview" aria-label="Receipt preview">
              <ReceiptThemePicker
                className="create-first-receipt__theme-picker"
                value={receiptThemeId}
                onChange={(themeId) => setReceiptThemeId(normalizeReceiptThemeId(themeId))}
              />
              <div className="home-receipt-stage home-receipt-stage--demo-preview">
                <ReceiptCard
                  playerName={playerName.trim() || "Player"}
                  amountLabel={PRESEASON_AMOUNT_LABEL}
                  stamp={selected.stamp}
                  badges={[...PRESEASON_BADGES]}
                  portraitBundle={portraitBundle}
                  portraitDisplayMode={portraitBundle.preferredMode ?? "neutral"}
                  layout="hero"
                  initials={initialsFromName(playerName || "P1")}
                  aiFlavorText={selected.flavor}
                  themeId={receiptThemeId}
                />
              </div>
            </section>
          )}

          {portraitBundle && typeId && selected && (
            <section className="create-first-receipt__ctas">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => {
                  persistAndShare(null);
                  shareReceipt();
                }}
              >
                Share this
              </button>
              <button type="button" className="btn btn--primary" onClick={handleStartRound}>
                Start your first round
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => {
                  persistAndShare(null);
                  inviteGroup();
                }}
              >
                Invite your group
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
