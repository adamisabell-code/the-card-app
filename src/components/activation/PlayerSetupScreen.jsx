const SLOT_LABELS = ["Player 1", "Player 2", "Player 3", "Player 4"];

/**
 * @param {{
 *   players: string[]
 *   setPlayers: React.Dispatch<React.SetStateAction<string[]>>
 *   onBack: () => void
 *   onContinue: () => void
 * }} props
 */
export function PlayerSetupScreen({ players, setPlayers, onBack, onContinue }) {
  const setAt = (index, value) => {
    setPlayers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return (
    <div className="activation-flow activation-flow--padded">
      <header className="activation-flow__header">
        <button type="button" className="start-round__back" onClick={onBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="activation-flow__heading">WHO&apos;S PLAYING?</h1>
        <span className="activation-flow__header-spacer" aria-hidden="true" />
      </header>

      <div className="activation-flow__fields">
        {SLOT_LABELS.map((label, i) => (
          <label key={label} className="field field--solo activation-flow__field">
            <span className="field__label">{label}</span>
            <input
              className="field__input"
              type="text"
              autoComplete="name"
              value={players[i] ?? ""}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder={label}
            />
          </label>
        ))}
      </div>

      <div className="activation-flow__footer">
        <button type="button" className="btn btn--primary activation-flow__btn-main" onClick={onContinue}>
          CONTINUE
        </button>
      </div>
    </div>
  );
}
