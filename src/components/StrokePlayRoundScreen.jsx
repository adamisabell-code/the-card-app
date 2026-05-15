import { useCallback, useEffect, useMemo, useState } from "react";
import { MAX_PLAYABLE_HOLE } from "../game/types.js";
import { buildStrokeHoleRecord, DEFAULT_STROKE_PAR } from "../game/strokeScoring.js";

const STROKE_DRAFT_PREFIX = "the-card-stroke-draft-v1:";

/**
 * @param {string | null | undefined} persistKey
 * @param {string[]} playerIds
 * @returns {{ scoresByHole: Record<string, string>[], holeIndex: number }}
 */
function readStrokeDraft(persistKey, playerIds) {
  const emptyRow = () => Object.fromEntries(playerIds.map((id) => [id, ""]));
  const empty = () => Array.from({ length: MAX_PLAYABLE_HOLE }, () => emptyRow());
  if (!persistKey || typeof sessionStorage === "undefined") {
    return { scoresByHole: empty(), holeIndex: 0 };
  }
  try {
    const raw = sessionStorage.getItem(STROKE_DRAFT_PREFIX + persistKey);
    if (!raw) return { scoresByHole: empty(), holeIndex: 0 };
    const d = JSON.parse(raw);
    if (d.v !== 1 || !Array.isArray(d.rows) || d.rows.length !== MAX_PLAYABLE_HOLE) {
      return { scoresByHole: empty(), holeIndex: 0 };
    }
    for (let i = 0; i < MAX_PLAYABLE_HOLE; i++) {
      const row = d.rows[i];
      if (!row || typeof row !== "object") return { scoresByHole: empty(), holeIndex: 0 };
      for (const id of playerIds) {
        if (!Object.prototype.hasOwnProperty.call(row, id)) return { scoresByHole: empty(), holeIndex: 0 };
      }
    }
    const scoresByHole = empty();
    for (let i = 0; i < MAX_PLAYABLE_HOLE; i++) {
      for (const id of playerIds) {
        const v = d.rows[i][id];
        scoresByHole[i][id] = typeof v === "string" && /^[0-9]{0,2}$/.test(v) ? v : "";
      }
    }
    const hi = Math.min(Math.max(0, Math.floor(Number(d.holeIndex)) || 0), MAX_PLAYABLE_HOLE - 1);
    return { scoresByHole, holeIndex: hi };
  } catch {
    return { scoresByHole: empty(), holeIndex: 0 };
  }
}

/**
 * @param {{
 *   gamePlayers: import('../game/types.js').GamePlayer[]
 *   onComplete: (holeRecords: import('../game/types.js').HoleRecord[]) => void
 *   onExit: () => void
 *   draftPersistKey?: string | null
 * }} props
 */
export function StrokePlayRoundScreen({ gamePlayers, onComplete, onExit, draftPersistKey = null }) {
  const ids = useMemo(() => gamePlayers.map((p) => p.id), [gamePlayers]);
  const [holeIndex, setHoleIndex] = useState(() => readStrokeDraft(draftPersistKey, ids).holeIndex);
  const [scoresByHole, setScoresByHole] = useState(() => readStrokeDraft(draftPersistKey, ids).scoresByHole);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draftPersistKey || typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.setItem(
        STROKE_DRAFT_PREFIX + draftPersistKey,
        JSON.stringify({
          v: 1,
          holeIndex,
          rows: scoresByHole,
        }),
      );
    } catch {
      /* quota / private mode */
    }
  }, [draftPersistKey, holeIndex, scoresByHole]);

  const holeNumber = holeIndex + 1;
  const par = DEFAULT_STROKE_PAR;

  const validateCurrentHole = useCallback(() => {
    const row = scoresByHole[holeIndex];
    for (const id of ids) {
      const raw = String(row[id] ?? "").trim();
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n) || n < 1 || n > 20) {
        setError(`Enter strokes 1–20 for every player on hole ${holeNumber}.`);
        return false;
      }
    }
    setError("");
    return true;
  }, [scoresByHole, holeIndex, ids, holeNumber]);

  const persistRow = useCallback(
    (idx) => {
      const row = scoresByHole[idx];
      const gross = Object.fromEntries(ids.map((id) => [id, Number.parseInt(String(row[id]).trim(), 10)]));
      return buildStrokeHoleRecord(idx + 1, gross, par, ids);
    },
    [scoresByHole, ids, par],
  );

  const clearDraft = useCallback(() => {
    if (!draftPersistKey || typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.removeItem(STROKE_DRAFT_PREFIX + draftPersistKey);
    } catch {
      /* ignore */
    }
  }, [draftPersistKey]);

  const goNext = useCallback(() => {
    if (!validateCurrentHole()) return;
    if (holeIndex < MAX_PLAYABLE_HOLE - 1) {
      setHoleIndex((i) => i + 1);
    }
  }, [validateCurrentHole, holeIndex]);

  const goPrev = useCallback(() => {
    setError("");
    setHoleIndex((i) => Math.max(0, i - 1));
  }, []);

  const finishRound = useCallback(() => {
    if (!validateCurrentHole()) return;
    for (let i = 0; i < MAX_PLAYABLE_HOLE; i++) {
      const row = scoresByHole[i];
      const ok = ids.every((id) => {
        const n = Number.parseInt(String(row[id]).trim(), 10);
        return Number.isFinite(n) && n >= 1 && n <= 20;
      });
      if (!ok) {
        setError(`Hole ${i + 1} is incomplete. Fill every score before finishing.`);
        setHoleIndex(i);
        return;
      }
    }
    const records = [];
    for (let i = 0; i < MAX_PLAYABLE_HOLE; i++) {
      records.push(persistRow(i));
    }
    clearDraft();
    onComplete(records);
  }, [validateCurrentHole, scoresByHole, ids, persistRow, onComplete, clearDraft]);

  const setScore = (playerId, value) => {
    setError("");
    setScoresByHole((prev) => {
      const next = prev.map((row) => ({ ...row }));
      next[holeIndex] = { ...next[holeIndex], [playerId]: value };
      return next;
    });
  };

  const handleExit = () => {
    clearDraft();
    onExit();
  };

  return (
    <div className="start-round stroke-play-round">
      <header className="start-round__header">
        <button type="button" className="start-round__back" onClick={handleExit} aria-label="Leave round">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="start-round__heading">Stroke Play</h1>
        <span className="start-round__portrait-entry pick-format__header-spacer" aria-hidden="true" />
      </header>

      <div className="start-round__scroll">
        <section className="card stroke-play-round__hole-card">
          <p className="stroke-play-round__hole-meta">
            Hole <strong>{holeNumber}</strong> of {MAX_PLAYABLE_HOLE}
            <span className="stroke-play-round__par">Par {par}</span>
          </p>
          <p className="card__lede stroke-play-round__hint">Gross strokes only. Lowest total wins.</p>

          <ul className="stroke-play-round__score-list">
            {gamePlayers.map((p) => (
              <li key={p.id} className="stroke-play-round__score-row">
                <label className="stroke-play-round__score-label" htmlFor={`stroke-${p.id}-${holeNumber}`}>
                  {p.name || `Player ${p.slotIndex + 1}`}
                </label>
                <input
                  id={`stroke-${p.id}-${holeNumber}`}
                  className="field__input stroke-play-round__score-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  enterKeyHint="next"
                  maxLength={2}
                  placeholder="—"
                  value={scoresByHole[holeIndex][p.id]}
                  onChange={(e) => setScore(p.id, e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                />
              </li>
            ))}
          </ul>
          {error ? (
            <p className="stroke-play-round__error" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </div>

      <div className="start-round__footer stroke-play-round__footer">
        <button type="button" className="btn btn--outline" onClick={goPrev} disabled={holeIndex === 0}>
          Previous hole
        </button>
        {holeNumber < MAX_PLAYABLE_HOLE ? (
          <button type="button" className="btn btn--primary" onClick={goNext}>
            Next hole
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={finishRound}>
            Finish round
          </button>
        )}
      </div>
    </div>
  );
}
