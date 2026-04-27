import { MAX_PLAYABLE_HOLE } from "../game/types.js";
import { aggregateWolfRoundStats, computeStandings } from "../game/scoring.js";
import { suggestPressBadgeHints } from "../game/roundResult.js";
import { PlayerAvatar } from "./PlayerAvatar.jsx";

/**
 * Compact persistent standings — tap for full sheet.
 *
 * @param {{
 *   players: import('../game/types.js').GamePlayer[]
 *   holeRecords: import('../game/types.js').HoleRecord[]
 *   currentHole: number
 *   currentWolfPlayerId: string | null
 *   portraitByPlayerId: Record<string, import('../portrait/types.js').PortraitBundle | null | undefined>
 *   onOpenDetail: () => void
 *   readOnly?: boolean
 * }} props
 */
export function ScoreStrip({
  players,
  holeRecords,
  currentHole,
  currentWolfPlayerId,
  portraitByPlayerId,
  onOpenDetail,
  readOnly = false,
}) {
  const allIds = players.map((p) => p.id);
  const wolfStats = aggregateWolfRoundStats(holeRecords, allIds);
  const standings = computeStandings(holeRecords, players);
  const rows = standings
    .map((r) => ({
      ...r,
      wolfPts: wolfStats.wolfPointsByPlayerId[r.playerId] ?? 0,
    }))
    .sort((a, b) => b.wolfPts - a.wolfPts || b.holesWon - a.holesWon || a.slotIndex - b.slotIndex);

  const displayHole = Math.min(currentHole, MAX_PLAYABLE_HOLE);

  const body = (
    <>
      <div className="score-strip__meta">
        <span className="score-strip__meta-main">
          <span className="score-strip__hole">Hole {displayHole}</span>
          {currentWolfPlayerId ? (
            <span className="score-strip__wolf">
              Wolf: <strong>{players.find((pl) => pl.id === currentWolfPlayerId)?.name}</strong>
            </span>
          ) : null}
        </span>
        <span className="score-strip__hint" aria-hidden="true">
          {readOnly ? "Spectator view" : "View scorecard"}
        </span>
      </div>
      <div className="score-strip__grid">
        {rows.map((r) => (
          <div key={r.playerId} className="score-strip__cell">
            <PlayerAvatar
              displayName={r.name}
              portraitBundle={portraitByPlayerId[r.playerId] ?? null}
              isCurrentWolf={r.playerId === currentWolfPlayerId}
              size="sm"
            />
            <span className="score-strip__num" aria-hidden="true">
              {r.wolfPts}
            </span>
            <span className="score-strip__sub" aria-hidden="true">
              {r.holesWon}h
            </span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <button
      type="button"
      className={`score-strip${readOnly ? " score-strip--read-only" : ""}`}
      onClick={onOpenDetail}
      aria-label={readOnly ? "Open spectator scoreboard" : "Open scorecard"}
    >
      {body}
    </button>
  );
}

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   players: import('../game/types.js').GamePlayer[]
 *   holeRecords: import('../game/types.js').HoleRecord[]
 *   currentHole: number
 *   currentWolfPlayerId: string | null
 *   portraitByPlayerId: Record<string, import('../portrait/types.js').PortraitBundle | null | undefined>
 *   roundElo?: null | {
 *     byPlayerId: Record<string, { ratingBefore: number, ratingAfter: number, deltaTotal: number, deltaPairwise: number, deltaLoneWolf: number }>
 *     meta: { assumptions: string[] }
 *   }
 *   roundResult?: import('../game/types.js').RoundResult | null
 *   readOnly?: boolean
 * }} props
 */
export function CompactScoreSummary({
  open,
  onClose,
  players,
  holeRecords,
  currentHole,
  currentWolfPlayerId,
  portraitByPlayerId,
  roundElo = null,
  roundResult = null,
  readOnly = false,
}) {
  if (!open) return null;

  const allIds = players.map((p) => p.id);
  const wolfStats = aggregateWolfRoundStats(holeRecords, allIds);
  const standings = computeStandings(holeRecords, players);
  const merged = standings
    .map((r) => ({
      ...r,
      wolfPts: wolfStats.wolfPointsByPlayerId[r.playerId] ?? 0,
    }))
    .sort((a, b) => b.wolfPts - a.wolfPts || b.holesWon - a.holesWon || a.slotIndex - b.slotIndex);

  const displayHole = Math.min(currentHole, MAX_PLAYABLE_HOLE);

  const names = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const pressHints = roundResult ? suggestPressBadgeHints(roundResult) : [];

  return (
    <div className="score-drawer" role="dialog" aria-modal="true" aria-label="Standings" data-readonly={readOnly || undefined}>
      <button type="button" className="score-drawer__scrim" onClick={onClose} aria-label="Close" />
      <div className="score-drawer__panel" data-spectator={readOnly || undefined}>
        <header className="score-drawer__head">
          <h2 className="score-drawer__title">{readOnly ? "Spectator · standings" : "Live standing"}</h2>
          {readOnly ? (
            <p className="score-drawer__spectator-note" role="note">
              You can’t score or edit this round—this is a follow-along view only.
            </p>
          ) : null}
          <p className="score-drawer__sub">
            Hole {displayHole}
            {currentWolfPlayerId ? ` · Wolf: ${names[currentWolfPlayerId]}` : ""}
          </p>
          <button type="button" className="score-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {holeRecords.length > 0 && (
          <div className="score-drawer__wolf-summary" aria-label="Wolf round stats">
            <h3 className="score-drawer__wolf-summary-title">Wolf scoring</h3>
            <ul className="score-drawer__wolf-summary-list">
              <li>
                Blind Wolf: <strong>{wolfStats.blindWolfAttempts}</strong> attempt
                {wolfStats.blindWolfAttempts === 1 ? "" : "s"}, <strong>{wolfStats.blindWolfWins}</strong> win
                {wolfStats.blindWolfWins === 1 ? "" : "s"}
              </li>
              <li>
                Lone Wolf: <strong>{wolfStats.loneWolfAttempts}</strong> attempt
                {wolfStats.loneWolfAttempts === 1 ? "" : "s"}, <strong>{wolfStats.loneWolfWins}</strong> win
                {wolfStats.loneWolfWins === 1 ? "" : "s"}
              </li>
              <li>
                Partner picks: <strong>{wolfStats.partnerSelections}</strong>
              </li>
            </ul>
          </div>
        )}

        <ol className="score-drawer__standings">
          {merged.map((r, i) => (
            <li key={r.playerId} className="score-drawer__row">
              <span className="score-drawer__rank">{i + 1}</span>
              <PlayerAvatar
                displayName={r.name}
                portraitBundle={portraitByPlayerId[r.playerId] ?? null}
                isCurrentWolf={r.playerId === currentWolfPlayerId}
                size="md"
              />
              <span className="score-drawer__name">{r.name}</span>
              <span className="score-drawer__pts" title="Wolf points · holes won (any positive score)">
                {r.wolfPts} pts · {r.holesWon} holes
              </span>
            </li>
          ))}
        </ol>
        {holeRecords.length > 0 && (
          <div className="score-drawer__history">
            <h3 className="score-drawer__history-title">Card</h3>
            <ul className="score-drawer__holes">
              {[...holeRecords].reverse().map((h) => (
                <li key={h.holeNumber} className="score-drawer__hole-line">
                  <span className="score-drawer__hole-n">
                    H{h.holeNumber} ·{" "}
                    {h.holeMode === "blind" ? "Blind" : h.holeMode === "lone" ? "Lone" : "Normal"}
                  </span>
                  <span className="score-drawer__hole-t">{h.holeOutcomeLabel || "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {roundElo && holeRecords.length > 0 && (
          <div className="score-drawer__rating">
            <h3 className="score-drawer__rating-title">Elo (skill) preview</h3>
            <p className="score-drawer__rating-lede">
              Pairwise holes vs Elo expectations. Presses and money are excluded — not used for this number.
            </p>
            <ul className="score-drawer__rating-rows">
              {players.map((p) => {
                const row = roundElo.byPlayerId[p.id];
                if (!row) return null;
                return (
                  <li key={p.id} className="score-drawer__rating-row">
                    <span className="score-drawer__rating-name">{p.name}</span>
                    <span
                      className="score-drawer__rating-bits"
                      title="pairwise Δ + lone/blind wolf nudge = total; rating after round (preview)"
                    >
                      {row.ratingBefore} → {row.ratingAfter}{" "}
                      <span className="score-drawer__elo-split">
                        ({row.deltaPairwise >= 0 ? `+${row.deltaPairwise}` : row.deltaPairwise} Δpair
                        {row.deltaLoneWolf !== 0
                          ? ` ${row.deltaLoneWolf >= 0 ? `+${row.deltaLoneWolf}` : row.deltaLoneWolf} 1v3`
                          : ""}
                        )
                      </span>{" "}
                      <strong>{row.deltaTotal >= 0 ? `+${row.deltaTotal}` : row.deltaTotal}</strong>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {roundResult && (roundResult.pressStats.totalPresses > 0 || pressHints.length > 0) && (
          <div className="score-drawer__social">
            <h3 className="score-drawer__social-title">Receipts &amp; social</h3>
            <p className="score-drawer__social-lede">Badges and drama — not skill rating.</p>
            {roundResult.pressStats.totalPresses > 0 && (
              <p className="score-drawer__press-meta">Presses logged: {roundResult.pressStats.totalPresses} (money layer separate).</p>
            )}
            {pressHints.length > 0 && (
              <ul className="score-drawer__badge-hints">
                {pressHints.map((h, idx) => (
                  <li key={`${h.id}-${h.playerId ?? "r"}-${idx}`} className="score-drawer__badge-hint">
                    {h.label}
                    {h.playerId && names[h.playerId] ? ` — ${names[h.playerId]}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
