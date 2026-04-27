import { HoleWinnerSelector } from "./HoleWinnerSelector.jsx";

/**
 * @param {{
 *   holeNumber: number
 *   wolfPlayerId: string
 *   holeMode: 'normal' | 'lone' | 'blind'
 *   partnerPlayerId: string | null
 *   players: import('../game/types.js').GamePlayer[]
 *   winningSide: 'wolf_side' | 'opponent_side' | 'tie' | null
 *   onWinningSideChange: (v: 'wolf_side' | 'opponent_side' | 'tie') => void
 *   onConfirm: () => void
 *   confirmDisabled?: boolean
 * }} props
 */
export function HoleResultScreen({
  holeNumber,
  wolfPlayerId,
  holeMode,
  partnerPlayerId,
  players,
  winningSide,
  onWinningSideChange,
  onConfirm,
  confirmDisabled,
}) {
  const name = (id) => players.find((p) => p.id === id)?.name ?? id;
  const wolfName = name(wolfPlayerId);
  const partnerName = partnerPlayerId ? name(partnerPlayerId) : "";
  const hunters = players.filter((p) => p.id !== wolfPlayerId && p.id !== partnerPlayerId);
  const fieldLabel = hunters.map((p) => p.name).join(" · ");

  const modeTag =
    holeMode === "blind" ? "Blind Wolf" : holeMode === "lone" ? "Lone Wolf" : "Normal Wolf";

  return (
    <section className="hole-result" aria-label="Hole result">
      <p className="hole-result__eyebrow">Hole {holeNumber}</p>
      <h2 className="hole-result__title">Who took it?</h2>
      <p className="hole-result__context">
        Wolf: <strong>{wolfName}</strong>
        {" · "}
        <span className={`hole-result__tag${holeMode === "blind" ? " hole-result__tag--blind" : ""}`}>{modeTag}</span>
        {holeMode === "normal" && partnerPlayerId ? (
          <>
            {" "}
            · Partner: <strong>{partnerName}</strong>
          </>
        ) : null}
      </p>

      {holeMode === "blind" ? (
        <p className="hole-result__blind-banner" role="status">
          Blind Wolf active · <strong>3-point hole</strong> if the Wolf wins
        </p>
      ) : null}

      <ul className="hole-result__roster" aria-label="Sides this hole">
        <li>
          <span className="hole-result__side-label">Wolf side</span>
          <span className="hole-result__side-names">
            {holeMode === "normal" ? `${wolfName} + ${partnerName}` : wolfName}
          </span>
        </li>
        <li>
          <span className="hole-result__side-label">{holeMode === "normal" ? "Hunters" : "Field"}</span>
          <span className="hole-result__side-names">{fieldLabel}</span>
        </li>
      </ul>

      <HoleWinnerSelector
        holeMode={holeMode}
        wolfName={wolfName}
        partnerName={partnerName}
        fieldLabel={fieldLabel}
        value={winningSide}
        onChange={onWinningSideChange}
      />

      <button type="button" className="btn btn--primary btn--lg hole-result__confirm" onClick={onConfirm} disabled={confirmDisabled}>
        Lock hole result
      </button>
    </section>
  );
}
