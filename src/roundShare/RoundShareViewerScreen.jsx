/**
 * Public spectator shell — no auth, no app state, no localStorage.
 * Scores are not editable: only `ScoreStrip` (readOnly) and `CompactScoreSummary` (readOnly).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAssignedWolfPlayerId, getTiedLowestWolfPointPlayerIds } from "../game/wolfRotation.js";
import { nameByPlayerId } from "../game/scoring.js";
import { computeRoundEloUpdate } from "../game/elo.js";
import { buildRoundResult } from "../game/roundResult.js";
import { buildHoleQuickConfirm } from "../game/holeReceiptPreview.js";
import { MAX_PLAYABLE_HOLE } from "../game/types.js";
import { PlayerAvatar } from "../components/PlayerAvatar.jsx";
import { CompactScoreSummary, ScoreStrip } from "../components/ScoreStrip.jsx";
import { decodeSnapshotFromHash } from "./roundShareCodec.js";
import { getPublicRoundSnapshot } from "./publicRoundApi.js";
import { isValidRoundSharePayload } from "./roundSharePayload.js";

/**
 * @param {{ pathShareId: string }} props
 */
export function RoundShareViewerScreen({ pathShareId }) {
  const [ready, setReady] = useState(/** @type { 'load' | 'ok' | 'err' } */ ("load"));
  const [errMsg, setErrMsg] = useState(/** @type {string | null} */ (null));
  const [p, setP] = useState(/** @type {import('./roundSharePayload.js').RoundSharePayloadV1 | null} */ (null));
  const [scoreOpen, setScoreOpen] = useState(false);

  useEffect(() => {
    let on = true;

    async function load() {
      setReady("load");
      setErrMsg(null);
      setP(null);

      const h = window.location.hash;

      if (h.length > 2) {
        const fromHash = await decodeSnapshotFromHash(h);
        if (!on) return;
        if (fromHash) {
          setP(fromHash);
          setReady("ok");
          return;
        }
        // Malformed or outdated hash: try short-link API before failing (e.g. server had newer PUT).
      }

      const fromApi = await getPublicRoundSnapshot(pathShareId);
      if (!on) return;
      if (fromApi) {
        if (fromApi.id.toLowerCase() !== pathShareId.toLowerCase()) {
          setErrMsg("This link does not match the live snapshot. Ask the group for a fresh “Share Round” copy.");
          setReady("err");
          return;
        }
        setP(fromApi);
        setReady("ok");
        return;
      }

      if (h.length > 2) {
        setErrMsg("We could not read the link. Ask the group for a fresh “Share Round” copy.");
        setReady("err");
        return;
      }
      setErrMsg(
        "This spectator link is not on this device yet. If the group used a short link, the sync server must be running, or they can send the full copy link. Ask for an updated “Share Round” from the card table.",
      );
      setReady("err");
    }

    void load();
    const onHash = () => {
      void load();
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      on = false;
      window.removeEventListener("hashchange", onHash);
    };
  }, [pathShareId]);

  const names = useMemo(() => (p ? nameByPlayerId(p.gamePlayers) : {}), [p]);
  const allPlayerIds = useMemo(() => (p ? p.gamePlayers.map((x) => x.id) : []), [p]);

  const resolvedLowWolfPlayerId = useMemo(() => {
    if (!p) return null;
    if (p.currentHole !== 17 && p.currentHole !== 18) return null;
    const tied = getTiedLowestWolfPointPlayerIds(p.holeRecords, allPlayerIds);
    if (tied.length === 1) return tied[0];
    if (p.selectedWolfOverride?.hole === p.currentHole) {
      return p.selectedWolfOverride.playerId;
    }
    return null;
  }, [p, allPlayerIds]);

  const currentWolfPlayerId = useMemo(() => {
    if (!p || !p.wolfOrder?.length) return null;
    return getAssignedWolfPlayerId({
      holeNumber: p.currentHole,
      wolfOrder: p.wolfOrder,
      holeRecords: p.holeRecords,
      allPlayerIds,
      resolvedLowWolfPlayerId: resolvedLowWolfPlayerId ?? null,
    });
  }, [p, allPlayerIds, resolvedLowWolfPlayerId]);

  const portraitBy = useMemo(
    () => ({
      "p-0": null,
      "p-1": null,
      "p-2": null,
      "p-3": null,
    }),
    [],
  );

  const roundElo = useMemo(() => (p && p.gamePlayers.length === 4 ? computeRoundEloUpdate(p.gamePlayers, p.holeRecords, {}) : null), [p]);

  const roundResult = useMemo(() => (p && p.gamePlayers.length === 4 ? buildRoundResult(p.gamePlayers, p.holeRecords) : null), [p]);

  const moments = useMemo(() => {
    if (!p?.holeRecords?.length) return [];
    const last = p.holeRecords.slice(-3).reverse();
    return last.map((rec) => {
      const qc = buildHoleQuickConfirm(rec, p.gamePlayers);
      return {
        hole: rec.holeNumber,
        line1: rec.holeOutcomeLabel || qc.line1,
        line2: rec.holeOutcomeLabel ? null : qc.line2,
      };
    });
  }, [p]);

  const wolfOrderNames = useMemo(() => {
    if (!p?.wolfOrder?.length) return "";
    return p.wolfOrder.map((id) => names[id] ?? id).join(" → ");
  }, [p?.wolfOrder, names]);

  const wolfRuleLabel = p && (p.currentHole === 17 || p.currentHole === 18) ? "Loser Wolf Rule" : null;

  const onJoin = useCallback(() => {
    window.location.replace(`${window.location.origin}/?join=1&from=round-share`);
  }, []);

  if (ready === "load") {
    return (
      <div className="round-viewer shell">
        <div className="round-viewer__inner" aria-live="polite" aria-busy="true">
          <p className="round-viewer__loading">Loading…</p>
        </div>
      </div>
    );
  }

  if (ready === "err" || !p || !isValidRoundSharePayload(p)) {
    return (
      <div className="round-viewer shell" data-readonly="true">
        <div className="round-viewer__inner">
          <h1 className="round-viewer__brand">The Card</h1>
          <p className="round-viewer__lede">Spectator link</p>
          <div className="card round-viewer__err-card">
            <p className="card__lede">{errMsg || "We couldn’t load this round."}</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={onJoin}>
            Get The Card
          </button>
        </div>
      </div>
    );
  }

  const displayHole = Math.min(p.currentHole, MAX_PLAYABLE_HOLE);
  const isComplete = p.roundStatus === "complete";

  return (
    <div className="round-viewer shell" data-readonly="true">
      <div className="round-viewer__inner">
        <header className="round-viewer__head">
          <h1 className="round-viewer__brand">The Card</h1>
          <p className="round-viewer__badge" role="status">
            Spectator · no login
          </p>
          {p.courseName?.trim() ? <p className="round-viewer__course">{p.courseName}</p> : null}
          {p.selectedTee ? <p className="round-viewer__tee">Tee · {p.selectedTee}</p> : null}
          {isComplete ? (
            <p className="round-viewer__complete" role="status">
              Round complete · final recap snapshot
            </p>
          ) : null}
        </header>

        <div className="round-viewer__board">
          <h2 className="round-viewer__hole">Hole {displayHole}</h2>
          {wolfRuleLabel ? (
            <p className="round-viewer__rule-chip" role="status">
              {wolfRuleLabel} · holes 17–18
            </p>
          ) : null}
          {currentWolfPlayerId ? (
            <p className="round-viewer__wolf">
              Wolf: <strong>{names[currentWolfPlayerId]}</strong>
            </p>
          ) : (
            <p className="round-viewer__wolf">First Wolf is being chosen…</p>
          )}

          {p.wolfOrder?.length ? (
            <p className="round-viewer__order" aria-label="Wolf order this round">
              Order: {wolfOrderNames}
            </p>
          ) : null}

          <ul className="round-viewer__roster" aria-label="Players">
            {p.gamePlayers.map((pl) => {
              const isWolf = pl.id === currentWolfPlayerId;
              return (
                <li key={pl.id} className={`round-viewer__pill${isWolf ? " round-viewer__pill--wolf" : ""}`}>
                  {isWolf && <span className="round-viewer__pill-tag">WOLF</span>}
                  <PlayerAvatar displayName={pl.name} portraitBundle={portraitBy[pl.id] ?? null} isCurrentWolf={isWolf} size="sm" />
                  <span className="round-viewer__pill-name">{pl.name}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {moments.length > 0 && (
          <section className="round-viewer__moments" aria-label="Recent receipt moments">
            <h3 className="round-viewer__moments-title">Recent moments</h3>
            <ul className="round-viewer__moments-list">
              {moments.map((m) => (
                <li key={m.hole} className="round-viewer__moments-line">
                  <span className="round-viewer__moments-hole">H{m.hole}</span>
                  <span className="round-viewer__moments-t">{m.line1}</span>
                  {m.line2 ? <span className="round-viewer__moments-s">{m.line2}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        <ScoreStrip
          players={p.gamePlayers}
          holeRecords={p.holeRecords}
          currentHole={p.currentHole}
          currentWolfPlayerId={currentWolfPlayerId}
          portraitByPlayerId={portraitBy}
          onOpenDetail={() => setScoreOpen(true)}
          readOnly
        />

        <CompactScoreSummary
          open={scoreOpen}
          onClose={() => setScoreOpen(false)}
          players={p.gamePlayers}
          holeRecords={p.holeRecords}
          currentHole={p.currentHole}
          currentWolfPlayerId={currentWolfPlayerId}
          portraitByPlayerId={portraitBy}
          roundElo={roundElo}
          roundResult={roundResult}
          readOnly
        />

        {isComplete && (
          <div className="round-viewer__cta card">
            <p className="round-viewer__cta-line">Want your own receipts?</p>
            <button type="button" className="btn btn--primary btn--lg" onClick={onJoin}>
              Get The Card
            </button>
            <p className="round-viewer__cta-hint">Join the Tee Party line for portraits, the Receipt, and the Card.</p>
          </div>
        )}

        <footer className="round-viewer__foot">
          <p className="round-viewer__time">
            {p.savedAt ? new Date(p.savedAt).toLocaleString(undefined, { timeStyle: "short", dateStyle: "short" }) : null}
          </p>
          <p className="round-viewer__discrete">View only · scoring happens on the card table’s device</p>
        </footer>
      </div>
    </div>
  );
}
