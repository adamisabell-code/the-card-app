/**
 * First-time activation: single focus — start a Wolf round fast.
 * (Distinct from the full round setup wizard in App.jsx.)
 */
export function StartRoundScreen({ onStartWolfMatch, onJoinExistingRound }) {
  return (
    <div className="activation-flow">
      <div className="activation-flow__center">
        <p className="activation-flow__eyebrow">Tee Party</p>
        <h1 className="activation-flow__title">START YOUR ROUND</h1>
        <p className="activation-flow__sub">
          Track the match. Settle the score. Generate the receipt.
        </p>
      </div>
      <div className="activation-flow__actions">
        <button type="button" className="btn btn--primary activation-flow__btn-main" onClick={onStartWolfMatch}>
          START WOLF MATCH
        </button>
        <button type="button" className="btn btn--outline activation-flow__btn-secondary" onClick={onJoinExistingRound}>
          JOIN EXISTING ROUND
        </button>
      </div>
    </div>
  );
}
