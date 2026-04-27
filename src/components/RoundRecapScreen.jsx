import { useState } from "react";
import { ReceiptCard } from "./ReceiptCard.jsx";
import { ReceiptThemePicker } from "./ReceiptThemePicker.jsx";
import { initialsFromName } from "../portrait/types.js";
import { DEFAULT_RECEIPT_THEME_ID, normalizeReceiptThemeId } from "../receiptThemes.js";

/**
 * @param {{
 *   recap: { finalStandings: object, bestMoment: object, worstBeat: object, groupRecap: object } | null
 *   onDone: () => void
 * }} props
 */
export function RoundRecapScreen({ recap, onDone }) {
  if (!recap) return null;
  const [receiptThemeId, setReceiptThemeId] = useState(DEFAULT_RECEIPT_THEME_ID);

  const { finalStandings, bestMoment, worstBeat, groupRecap } = recap;

  const block = (label, props) => (
    <div className="round-recap__block">
      <h3 className="round-recap__eyebrow">{label}</h3>
      <ReceiptCard
        playerName={props.playerName}
        amountLabel={props.amountLabel}
        stamp={props.stamp}
        badges={props.badges}
        portraitBundle={props.portraitBundle}
        portraitDisplayMode={props.portraitDisplayMode}
        layout="default"
        initials={initialsFromName(props.playerName)}
        aiFlavorText={props.aiFlavorText ?? null}
        themeId={receiptThemeId}
      />
    </div>
  );

  return (
    <div className="round-recap round-recap--in-shell">
      <header className="round-recap__head">
        <h1 className="round-recap__title">End of round</h1>
        <p className="round-recap__lede">Final receipts — standings, best beat, worst beat, group stamp.</p>
        <ReceiptThemePicker value={receiptThemeId} onChange={(themeId) => setReceiptThemeId(normalizeReceiptThemeId(themeId))} />
      </header>
      <div className="round-recap__scroll" role="region" aria-label="Recap cards">
        {block("1 · Final standings", finalStandings)}
        {block("2 · Best moment", bestMoment)}
        {block("3 · Worst beat", worstBeat)}
        {block("4 · Group recap", groupRecap)}
      </div>
      <div className="round-recap__footer">
        <button type="button" className="btn btn--primary round-recap__done" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
