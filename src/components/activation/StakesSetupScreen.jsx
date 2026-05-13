import { useMemo, useState } from "react";

/**
 * Maps quick activation choices onto existing StakesConfig (preset per hole + flags).
 * @param {'none' | 'friendly' | '20' | '50' | 'custom'} choice
 * @param {string} customAmount
 */
export function buildActivationStakesConfig(choice, customAmount) {
  const base = {
    loneWolf2x: true,
    blindWolf3x: true,
  };
  switch (choice) {
    case "none":
      return { ...base, preset: /** @type {const} */ (1), customValue: "", hideDollarAmounts: true };
    case "friendly":
      return { ...base, preset: /** @type {const} */ (1), customValue: "", hideDollarAmounts: false };
    case "20":
      return { ...base, preset: /** @type {const} */ ("custom"), customValue: "20", hideDollarAmounts: false };
    case "50":
      return { ...base, preset: /** @type {const} */ ("custom"), customValue: "50", hideDollarAmounts: false };
    case "custom": {
      const parsed = Number.parseFloat(customAmount || "");
      const v =
        Number.isFinite(parsed) && parsed > 0 ? String(Math.min(999, Math.max(0.25, parsed))) : "2";
      return { ...base, preset: /** @type {const} */ ("custom"), customValue: v, hideDollarAmounts: false };
    }
    default:
      return { ...base, preset: /** @type {const} */ (2), customValue: "", hideDollarAmounts: false };
  }
}

/**
 * @param {{
 *   onBack: () => void
 *   onLetsGo: (config: {
 *     preset: 1 | 2 | 5 | 'custom'
 *     customValue: string
 *     loneWolf2x: boolean
 *     blindWolf3x: boolean
 *     hideDollarAmounts: boolean
 *   }) => void
 * }} props
 */
export function StakesSetupScreen({ onBack, onLetsGo }) {
  const [choice, setChoice] = useState(/** @type {'none' | 'friendly' | '20' | '50' | 'custom'} */ ("friendly"));
  const [customAmount, setCustomAmount] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const config = useMemo(() => buildActivationStakesConfig(choice, customAmount), [choice, customAmount]);

  return (
    <div className="activation-flow activation-flow--padded">
      <header className="activation-flow__header">
        <button type="button" className="start-round__back" onClick={onBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="activation-flow__heading">ANY ACTION TODAY?</h1>
        <span className="activation-flow__header-spacer" aria-hidden="true" />
      </header>

      <div className="activation-stakes__choices" role="radiogroup" aria-label="Stakes">
        {(
          [
            ["none", "NONE"],
            ["friendly", "FRIENDLY"],
            ["20", "$20"],
            ["50", "$50"],
            ["custom", "CUSTOM"],
          ]
        ).map(([id, label]) => {
          const active = choice === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`activation-stakes__chip${active ? " activation-stakes__chip--active" : ""}`}
              onClick={() => setChoice(/** @type {'none' | 'friendly' | '20' | '50' | 'custom'} */ (id))}
            >
              {label}
            </button>
          );
        })}
      </div>

      {choice === "custom" ? (
        <div className="activation-stakes__custom">
          <label className="field field--solo">
            <span className="field__label">Amount per hole ($)</span>
            <input
              className="field__input"
              type="number"
              min="0.25"
              step="0.25"
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="e.g. 10"
            />
          </label>
          <label className="field field--solo">
            <span className="field__label">Label (optional)</span>
            <input
              className="field__input"
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Nassau side bet, etc."
            />
          </label>
          {/* customLabel reserved for future receipt / settlement copy — not yet wired to game state */}
        </div>
      ) : null}

      <p className="activation-flow__hint" aria-live="polite">
        {choice === "none"
          ? "Wolf points only — money hidden on the receipt."
          : choice === "friendly"
            ? "$1 base per hole — easy math."
            : null}
      </p>

      <div className="activation-flow__footer">
        <button
          type="button"
          className="btn btn--primary activation-flow__btn-main"
          onClick={() => onLetsGo(config)}
          aria-label={
            customLabel.trim()
              ? `Start round. Note: ${customLabel.trim()}`
              : "Start round and show group invite"
          }
        >
          LET&apos;S GO
        </button>
      </div>
    </div>
  );
}
