import { GAME_FORMATS, ROUND_FORMAT_IDS } from "../game/gameFormats.js";

/**
 * @param {{
 *   onBack: () => void
 *   onSelectFormat: (formatId: import('../game/gameFormats.js').RoundFormatId) => void
 * }} props
 */
export function PickGameFormatScreen({ onBack, onSelectFormat }) {
  return (
    <div className="start-round pick-format">
      <header className="start-round__header">
        <button type="button" className="start-round__back" onClick={onBack} aria-label="Back to home">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="start-round__heading">Pick Your Game</h1>
        <span className="start-round__portrait-entry pick-format__header-spacer" aria-hidden="true" />
      </header>
      <div className="start-round__scroll">
        <p className="pick-format__subtext card__lede">
          Track the games your group already plays. Generate the receipt when it&apos;s over.
        </p>
        <div className="pick-format__grid" role="list">
          {ROUND_FORMAT_IDS.map((id) => {
            const cfg = GAME_FORMATS[id];
            return (
              <button
                key={id}
                type="button"
                className="pick-format__card card"
                onClick={() => onSelectFormat(id)}
                role="listitem"
              >
                <h2 className="card__title card__title--sm">{cfg.label}</h2>
                <p className="card__lede pick-format__card-desc">{cfg.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
