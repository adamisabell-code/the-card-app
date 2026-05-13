import { ReceiptCard } from "./ReceiptCard.jsx";
import { buildReturningLaunchpadHero } from "../home/returningLaunchpadHero.js";

/**
 * Returning-user home: launchpad (not a receipt museum).
 *
 * @param {{
 *   snap: import('../home/homeReceipt.js').LastReceiptSnapshot
 *   lastRound: { holeRecords: import('../game/types.js').HoleRecord[], players: import('../game/types.js').GamePlayer[] } | null
 *   stakesConfig: import('../game/stakes.js').StakesConfig
 *   receipt: { playerName: string, amountLabel: string, stamp: string, badges: string[] }
 *   portraitBundle: import('../portrait/types.js').PortraitBundle | null
 *   portraitDisplay: import('../portrait/types.js').PortraitMode | null
 *   initials: string
 *   receiptThemeId: string
 *   onRunItBack: () => void
 *   onEditGroup: () => void
 *   onShareLastReceipt: () => void
 *   onNewGroupFresh: () => void
 *   onViewFullReceipt: () => void
 *   onLeagueInvite: () => void
 * }} props
 */
export function ReturningHomeLaunchpad({
  snap,
  lastRound,
  stakesConfig,
  receipt,
  portraitBundle,
  portraitDisplay,
  initials,
  receiptThemeId,
  onRunItBack,
  onEditGroup,
  onShareLastReceipt,
  onNewGroupFresh,
  onViewFullReceipt,
  onLeagueInvite,
}) {
  const hero = buildReturningLaunchpadHero({ snap, lastRound, stakesConfig });

  return (
    <main className="returning-launchpad">
      <section className={`returning-launchpad__hero returning-launchpad__hero--${hero.variant}`} aria-label="Last round result">
        <p className="returning-launchpad__hero-eyebrow">Last round · you</p>
        <h2 className="returning-launchpad__hero-headline">{hero.headline}</h2>
        <p className="returning-launchpad__hero-amount">{hero.amountLine}</p>
        <p className="returning-launchpad__hero-sub">{hero.subline}</p>
      </section>

      <div className="returning-launchpad__ctas">
        <button type="button" className="btn btn--primary returning-launchpad__btn-primary" onClick={onRunItBack}>
          RUN IT BACK
        </button>
        <button type="button" className="btn btn--outline returning-launchpad__btn-secondary" onClick={onEditGroup}>
          EDIT GROUP
        </button>
      </div>

      <div className="returning-launchpad__extras" role="group" aria-label="More actions">
        <button type="button" className="btn btn--ghost returning-launchpad__linkish" onClick={onShareLastReceipt}>
          Share last receipt
        </button>
        <button type="button" className="btn btn--ghost returning-launchpad__linkish" onClick={onNewGroupFresh}>
          New group
        </button>
      </div>

      <section className="returning-launchpad__proof" aria-label="Receipt preview">
        <button type="button" className="returning-launchpad__proof-hit" onClick={onViewFullReceipt}>
          <span className="returning-launchpad__proof-label">Last receipt</span>
          <div className="returning-launchpad__receipt-wrap">
            <ReceiptCard
              playerName={receipt.playerName}
              amountLabel={receipt.amountLabel}
              stamp={receipt.stamp}
              badges={receipt.badges.slice(0, 2)}
              portraitBundle={portraitBundle}
              portraitDisplayMode={portraitDisplay}
              layout="compact"
              initials={initials}
              aiFlavorText={snap?.aiFlavorText ?? null}
              themeId={receiptThemeId}
            />
          </div>
          <span className="returning-launchpad__proof-hint">Tap for full receipt</span>
        </button>
      </section>

      <section className="returning-launchpad__league" aria-label="League invite">
        <button type="button" className="btn btn--outline returning-launchpad__league-btn" onClick={onLeagueInvite}>
          Invite the league
        </button>
      </section>
    </main>
  );
}
