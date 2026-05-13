import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildHoleOutcomeLabel,
  computePointsAwarded,
  nameByPlayerId,
  winningPlayerIdsForRecord,
} from "../game/scoring.js";
import { HoleResultScreen } from "./HoleResultScreen.jsx";
import { PlayerAvatar } from "./PlayerAvatar.jsx";
import { PlayerIdentityRow } from "./PlayerIdentityRow.jsx";
import { CompactScoreSummary, ScoreStrip } from "./ScoreStrip.jsx";

/**
 * @param {{
 *   gamePlayers: import('../game/types.js').GamePlayer[]
 *   currentHole: number
 *   wolfOrder: string[] | null
 *   assignedWolfPlayerId: string | null
 *   onFirstWolfChosen: (playerId: string) => void
 *   wolfRuleLabel: string | null
 *   portraitByPlayerId: Record<string, import('../portrait/types.js').PortraitBundle | null | undefined>
 *   holeRecords: import('../game/types.js').HoleRecord[]
 *   onHoleComplete: (record: import('../game/types.js').HoleRecord) => void
 *   onEditPreviousHole?: () => void
 *   onEndRound: (mergeLastHole?: import('../game/types.js').HoleRecord | void) => void
 *   onShareRound: () => void
 *   roundElo: null | { byPlayerId: Record<string, { ratingBefore: number, ratingAfter: number, deltaTotal: number, deltaPairwise: number, deltaLoneWolf: number }>, meta: { assumptions: string[] } }
 *   roundResult: import('../game/types.js').RoundResult | null
 * }} props
 */
export function WolfRoundScreen({
  gamePlayers,
  currentHole,
  wolfOrder,
  assignedWolfPlayerId,
  onFirstWolfChosen,
  wolfRuleLabel,
  portraitByPlayerId,
  holeRecords,
  onHoleComplete,
  onEditPreviousHole,
  onEndRound,
  onShareRound,
  roundElo,
  roundResult,
}) {
  const [flow, setFlow] = useState(
    /** @type {'selectFirstWolf' | 'wolfPath' | 'pickPartner' | 'holeResult'} */ (
      wolfOrder?.length ? "wolfPath" : "selectFirstWolf"
    ),
  );
  const [selectedFirstWolfId, setSelectedFirstWolfId] = useState(() => gamePlayers[0]?.id ?? "p-0");
  /** @type {'normal' | 'lone' | 'blind' | null} */
  const [holeMode, setHoleMode] = useState(/** @type {'normal' | 'lone' | 'blind' | null} */ (null));
  const [partnerPlayerId, setPartnerPlayerId] = useState(/** @type {string | null} */ (null));
  const [pickSelection, setPickSelection] = useState(/** @type {number | null} */ (null));
  /** @type {'wolf_side' | 'opponent_side' | 'tie' | null} */
  const [winningSide, setWinningSide] = useState(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  /** Prevents double-tap on outcome buttons from recording two holes. */
  const outcomeSubmitLockRef = useRef(false);

  const prevHoleRef = useRef(currentHole);
  const prevHadOrderRef = useRef(!!wolfOrder?.length);

  useEffect(() => {
    const holeChanged = prevHoleRef.current !== currentHole;
    const hadOrder = !!wolfOrder?.length;
    const orderBecameReady = !prevHadOrderRef.current && hadOrder;
    prevHoleRef.current = currentHole;
    prevHadOrderRef.current = hadOrder;

    if (!hadOrder) return;
    if (holeChanged || orderBecameReady) {
      outcomeSubmitLockRef.current = false;
      setFlow("wolfPath");
      setHoleMode(null);
      setPartnerPlayerId(null);
      setPickSelection(null);
      setWinningSide(null);
    }
  }, [currentHole, wolfOrder]);

  useEffect(() => {
    if (wolfOrder?.length && flow === "selectFirstWolf") {
      setFlow("wolfPath");
    }
  }, [wolfOrder, flow]);

  const names = useMemo(() => nameByPlayerId(gamePlayers), [gamePlayers]);

  const partnerOptions = useMemo(() => {
    const wid = assignedWolfPlayerId;
    if (!wid) return [];
    return gamePlayers.filter((p) => p.id !== wid).map((p) => p.slotIndex);
  }, [gamePlayers, assignedWolfPlayerId]);

  const displayName = useCallback(
    (slotIndex) => gamePlayers[slotIndex]?.name ?? `Player ${slotIndex + 1}`,
    [gamePlayers],
  );

  const wolfOrderNames = useMemo(() => {
    if (!wolfOrder?.length) return "";
    return wolfOrder.map((id) => names[id] ?? id).join(" → ");
  }, [wolfOrder, names]);

  const handleEndRoundClick = useCallback(() => {
    onEndRound();
  }, [onEndRound]);

  const confirmFirstWolf = () => {
    onFirstWolfChosen(selectedFirstWolfId);
  };

  const chooseNormalWolf = () => {
    setHoleMode("normal");
    setPartnerPlayerId(null);
    setPickSelection(null);
    setWinningSide(null);
    setFlow("pickPartner");
  };

  const chooseBlindWolf = () => {
    setHoleMode("blind");
    setPartnerPlayerId(null);
    setPickSelection(null);
    setWinningSide(null);
    setFlow("holeResult");
  };

  const goLoneFromPartnerStep = () => {
    setHoleMode("lone");
    setPartnerPlayerId(null);
    setPickSelection(null);
    setWinningSide(null);
    setFlow("holeResult");
  };

  /** One tap: partner row commits and opens hole result. */
  const selectPartnerAndAdvance = useCallback(
    (slotIndex) => {
      const pid = gamePlayers[slotIndex]?.id ?? null;
      setPickSelection(slotIndex);
      setPartnerPlayerId(pid);
      setHoleMode("normal");
      setWinningSide(null);
      setFlow("holeResult");
    },
    [gamePlayers],
  );

  const submitHoleWithSide = useCallback(
    (side) => {
      if (outcomeSubmitLockRef.current) return;
      if (!assignedWolfPlayerId || !holeMode) return;
      if (holeMode === "normal" && !partnerPlayerId) return;

      outcomeSubmitLockRef.current = true;
      const allIds = gamePlayers.map((p) => p.id);
      const partnerId = holeMode === "normal" ? partnerPlayerId : null;
      const draft = {
        holeNumber: currentHole,
        wolfPlayerId: assignedWolfPlayerId,
        holeMode,
        partnerPlayerId: partnerId,
        winningSide: side,
        pointsAwardedByPlayerId: {},
        winningPlayerIds: [],
        holeOutcomeLabel: "",
        presses: [],
      };
      const pointsAwardedByPlayerId = computePointsAwarded(draft, allIds);
      const winningPlayerIds = winningPlayerIdsForRecord({ ...draft, pointsAwardedByPlayerId }, allIds);
      const holeOutcomeLabel = buildHoleOutcomeLabel({ ...draft, pointsAwardedByPlayerId, winningPlayerIds }, names);
      const finalRecord = { ...draft, pointsAwardedByPlayerId, winningPlayerIds, holeOutcomeLabel };
      onHoleComplete(finalRecord);
    },
    [assignedWolfPlayerId, holeMode, partnerPlayerId, currentHole, gamePlayers, names, onHoleComplete],
  );

  const handleResultSelect = useCallback(
    (v) => {
      setWinningSide(v);
      submitHoleWithSide(v);
    },
    [submitHoleWithSide],
  );

  /** Back from hole result → re-pick partner/mode for this hole (no hole record mutation). */
  const handleBackFromHoleResult = useCallback(() => {
    outcomeSubmitLockRef.current = false;
    setWinningSide(null);
    if (holeMode === "blind") {
      setHoleMode(null);
      setPartnerPlayerId(null);
      setPickSelection(null);
      setFlow("wolfPath");
      return;
    }
    if (holeMode === "lone") {
      setHoleMode("normal");
      setPartnerPlayerId(null);
      setPickSelection(null);
      setFlow("pickPartner");
      return;
    }
    setFlow("pickPartner");
  }, [holeMode]);

  const canEditPreviousHole = Boolean(onEditPreviousHole && holeRecords.length > 0);

  const modePill = () => {
    if (!holeMode || flow === "wolfPath") return null;
    if (holeMode === "blind") return <span className="wolf-round__mode-pill wolf-round__mode-pill--blind">Blind Wolf</span>;
    if (holeMode === "lone") return <span className="wolf-round__mode-pill wolf-round__mode-pill--lone">Lone Wolf</span>;
    if (holeMode === "normal" && partnerPlayerId && flow === "holeResult")
      return <span className="wolf-round__mode-pill">+ {names[partnerPlayerId]}</span>;
    return null;
  };

  const showWolfHeader = Boolean(wolfOrder?.length && assignedWolfPlayerId && flow !== "selectFirstWolf");

  return (
    <div className="wolf-round wolf-round--scored">
      <div className="wolf-round__toolbar">
        <button type="button" className="wolf-round__share" onClick={onShareRound} aria-label="Share this round (link and QR)">
          Share Round
        </button>
        <button
          type="button"
          className="wolf-round__new-round"
          onClick={handleEndRoundClick}
          aria-label="End round and return home"
        >
          End round
        </button>
      </div>

      <header className="wolf-round__top">
        <h1 className="wolf-round__title">Hole {currentHole}</h1>
        {wolfRuleLabel ? (
          <p className="wolf-round__rule-chip" role="status">
            <span className="wolf-round__rule-chip-label">{wolfRuleLabel}</span>
            <span className="wolf-round__rule-chip-sub">Lowest Wolf points is Wolf · ties: one random pick per hole</span>
          </p>
        ) : null}
        {showWolfHeader ? (
          <p className="wolf-round__wolf">
            Wolf: <strong>{names[assignedWolfPlayerId]}</strong>
            {modePill()}
          </p>
        ) : flow === "selectFirstWolf" ? (
          <p className="wolf-round__helper">Who tees first as Wolf? Order for holes 1–16 is set from your pick.</p>
        ) : (
          <p className="wolf-round__helper">Scorekeeper: choose Normal or Blind Wolf.</p>
        )}

        {wolfOrder?.length ? (
          <p className="wolf-round__wolf-order" aria-label="Wolf order this round">
            Wolf order: {wolfOrderNames}
          </p>
        ) : null}

        {holeMode === "blind" && flow !== "selectFirstWolf" && flow !== "wolfPath" ? (
          <div className="wolf-round__blind-strip" role="status">
            <span className="wolf-round__blind-strip-title">Blind Wolf active</span>
            <span className="wolf-round__blind-strip-sub">3-point hole if the Wolf wins · no partner</span>
          </div>
        ) : null}

        <div className="wolf-round__roster" aria-label="Players this hole">
          {gamePlayers.map((p) => {
            const isWolfAvatar = Boolean(
              assignedWolfPlayerId && wolfOrder?.length && flow !== "selectFirstWolf" && p.id === assignedWolfPlayerId,
            );
            return (
              <div
                key={p.id}
                className={`wolf-round__pill${isWolfAvatar ? " wolf-round__pill--wolf" : " wolf-round__pill--neutral"}`}
              >
                {isWolfAvatar && <span className="wolf-round__pill-badge">WOLF</span>}
                <PlayerIdentityRow
                  displayName={p.name}
                  portraitBundle={portraitByPlayerId[p.id] ?? null}
                  isCurrentWolf={isWolfAvatar}
                  size="sm"
                />
              </div>
            );
          })}
        </div>

        {canEditPreviousHole && flow !== "selectFirstWolf" ? (
          <div className="wolf-round__undo-row">
            <button type="button" className="btn btn--ghost btn--lg wolf-round__edit-prev" onClick={onEditPreviousHole}>
              Edit previous hole
            </button>
          </div>
        ) : null}
      </header>

      <div className="wolf-round__body">
        {flow === "selectFirstWolf" && (
          <section className="wolf-round__panel" aria-label="First Wolf">
            <h2 className="wolf-round__panel-title">Who is first Wolf?</h2>
            <p className="wolf-round__helper wolf-round__helper--tight">
              The other three rotate in random order. Holes 17–18: lowest Wolf points is Wolf.
            </p>
            <div className="wolf-select-list">
              {gamePlayers.map((p) => (
                <PlayerIdentityRow
                  key={p.id}
                  displayName={p.name}
                  portraitBundle={portraitByPlayerId[p.id] ?? null}
                  isCurrentWolf={false}
                  selected={selectedFirstWolfId === p.id}
                  onClick={() => setSelectedFirstWolfId(p.id)}
                  size="md"
                />
              ))}
            </div>
            <button type="button" className="btn btn--primary btn--lg" onClick={confirmFirstWolf}>
              Continue
            </button>
          </section>
        )}

        {flow === "wolfPath" && assignedWolfPlayerId && (
          <section className="wolf-round__panel" aria-label="Wolf path">
            <h2 className="wolf-round__panel-title">This hole — before tee shots</h2>
            <p className="wolf-round__helper wolf-round__helper--tight">
              <strong>{names[assignedWolfPlayerId]}</strong> is Wolf. Choose how this hole is played.
            </p>
            <div className="wolf-round__actions wolf-round__actions--split">
              <button type="button" className="btn btn--outline btn--lg" onClick={chooseNormalWolf}>
                Normal Wolf
              </button>
              <button type="button" className="btn btn--blind-wolf btn--lg" onClick={chooseBlindWolf}>
                Blind Wolf
              </button>
            </div>
            <p className="wolf-round__blind-risk">
              Blind Wolf is declared <strong>before</strong> any tee shots — 1 vs 3, no partner. Win the hole for{" "}
              <strong>3 points</strong>; lose and the field takes 1 each.
            </p>
          </section>
        )}

        {flow === "pickPartner" && (
          <section className="wolf-round__panel" aria-label="Partner selection">
            <h2 className="wolf-round__panel-title">Wolf&apos;s partner</h2>
            <p className="wolf-round__helper wolf-round__helper--tight">Tap a partner for 2 vs 2, or Lone Wolf (1 vs 3).</p>
            <div className="partner-grid partner-grid--has-selection">
              {partnerOptions.map((idx) => {
                const isSelected = pickSelection === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`partner-card${isSelected ? " partner-card--selected" : ""}`}
                    onClick={() => selectPartnerAndAdvance(idx)}
                    aria-pressed={isSelected}
                  >
                    <span className="partner-card__avatar">
                      <PlayerAvatar
                        displayName={displayName(idx)}
                        portraitBundle={portraitByPlayerId[gamePlayers[idx].id] ?? null}
                        isCurrentWolf={false}
                        size="sm"
                      />
                    </span>
                    <span className="partner-card__name">{displayName(idx)}</span>
                  </button>
                );
              })}
            </div>
            <div className="wolf-round__lone-fallback">
              <button type="button" className="btn btn--ghost btn--lg wolf-round__lone-btn" onClick={goLoneFromPartnerStep}>
                Lone Wolf — pass on all partners
              </button>
            </div>
            <div className="wolf-round__pick-back">
              <button
                type="button"
                className="btn btn--ghost btn--lg"
                onClick={() => {
                  setHoleMode(null);
                  setPartnerPlayerId(null);
                  setPickSelection(null);
                  setWinningSide(null);
                  setFlow("wolfPath");
                }}
              >
                Back
              </button>
            </div>
          </section>
        )}

        {flow === "holeResult" && assignedWolfPlayerId && holeMode && (
          <HoleResultScreen
            holeNumber={currentHole}
            wolfPlayerId={assignedWolfPlayerId}
            holeMode={holeMode}
            partnerPlayerId={partnerPlayerId}
            players={gamePlayers}
            winningSide={winningSide}
            onResultSelect={handleResultSelect}
            onBackFromResult={handleBackFromHoleResult}
          />
        )}
      </div>

      <ScoreStrip
        players={gamePlayers}
        holeRecords={holeRecords}
        currentHole={currentHole}
        currentWolfPlayerId={assignedWolfPlayerId}
        portraitByPlayerId={portraitByPlayerId}
        onOpenDetail={() => setScoreOpen(true)}
      />

      <CompactScoreSummary
        open={scoreOpen}
        onClose={() => setScoreOpen(false)}
        players={gamePlayers}
        holeRecords={holeRecords}
        currentHole={currentHole}
        currentWolfPlayerId={assignedWolfPlayerId}
        portraitByPlayerId={portraitByPlayerId}
        roundElo={roundElo}
        roundResult={roundResult}
      />
    </div>
  );
}
