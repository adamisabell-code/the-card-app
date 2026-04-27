/**
 * Structured side outcome — never free-text.
 *
 * @param {{
 *   holeMode: 'normal' | 'lone' | 'blind'
 *   wolfName: string
 *   partnerName?: string
 *   fieldLabel: string
 *   value: 'wolf_side' | 'opponent_side' | 'tie' | null
 *   onChange: (v: 'wolf_side' | 'opponent_side' | 'tie') => void
 * }} props
 */
export function HoleWinnerSelector({ holeMode, wolfName, partnerName, fieldLabel, value, onChange }) {
  const wolfKicker =
    holeMode === "blind" ? "Blind Wolf" : holeMode === "lone" ? "Lone Wolf" : "Wolf side";
  const wolfHint =
    holeMode === "blind" ? "3 pts if Wolf wins" : holeMode === "lone" ? "2 pts if Wolf wins" : "1 pt each if Wolf side wins";
  const oppKicker = holeMode === "normal" ? "Hunters" : "Field";
  const oppHint = holeMode === "normal" ? "The other two" : "1 pt each if Field wins";

  const wolfTitle =
    holeMode === "normal" ? `${wolfName} + ${partnerName || "Partner"}` : wolfName;

  return (
    <div className="hole-winner-selector" role="group" aria-label="Hole outcome">
      <button
        type="button"
        className={`hole-winner-selector__opt${value === "wolf_side" ? " is-on" : ""}`}
        onClick={() => onChange("wolf_side")}
      >
        <span className="hole-winner-selector__opt-kicker">{wolfKicker}</span>
        <span className="hole-winner-selector__opt-title">{wolfTitle}</span>
        <span className="hole-winner-selector__opt-hint">{wolfHint}</span>
      </button>
      <button
        type="button"
        className={`hole-winner-selector__opt${value === "opponent_side" ? " is-on" : ""}`}
        onClick={() => onChange("opponent_side")}
      >
        <span className="hole-winner-selector__opt-kicker">{oppKicker}</span>
        <span className="hole-winner-selector__opt-title">{fieldLabel}</span>
        <span className="hole-winner-selector__opt-hint">{oppHint}</span>
      </button>
      <button
        type="button"
        className={`hole-winner-selector__opt hole-winner-selector__opt--tie${value === "tie" ? " is-on" : ""}`}
        onClick={() => onChange("tie")}
      >
        <span className="hole-winner-selector__opt-kicker">Halved</span>
        <span className="hole-winner-selector__opt-title">Tie</span>
        <span className="hole-winner-selector__opt-hint">No points to anyone</span>
      </button>
    </div>
  );
}
