import { GAME_FORMATS, normalizeRoundFormat } from "../game/gameFormats.js";

/**
 * In-round placeholder until stroke / match / skins / Nassau scoring ships.
 *
 * @param {{
 *   gamePlayers: import('../game/types.js').GamePlayer[]
 *   roundFormat: import('../game/gameFormats.js').RoundFormatId
 *   onFinishToReceipt: () => void
 *   onExit: () => void
 * }} props
 */
export function PlaceholderFormatRoundScreen({ gamePlayers, roundFormat, onFinishToReceipt, onExit }) {
  const fmt = normalizeRoundFormat(roundFormat);
  const meta = GAME_FORMATS[fmt];
  return (
    <div className="start-round placeholder-format-round">
      <header className="start-round__header">
        <button type="button" className="start-round__back" onClick={onExit} aria-label="Leave round">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="start-round__heading">{meta.label}</h1>
        <span className="start-round__portrait-entry pick-format__header-spacer" aria-hidden="true" />
      </header>
      <div className="start-round__scroll">
        <section className="card">
          <p className="card__lede">
            {meta.description} Hole-by-hole scoring for {meta.label} is still in the shop. Keep the card on the course;
            when you&apos;re done, lock a receipt shell so the group has proof of the format you played.
          </p>
          <ul className="placeholder-format-round__roster">
            {gamePlayers.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="start-round__footer">
        <button type="button" className="btn btn--outline" onClick={onExit}>
          Exit without receipt
        </button>
        <button type="button" className="btn btn--primary" onClick={onFinishToReceipt}>
          End round &amp; get receipt
        </button>
      </div>
    </div>
  );
}
