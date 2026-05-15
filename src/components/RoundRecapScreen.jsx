import { useCallback, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { ReceiptCard } from "./ReceiptCard.jsx";
import { initialsFromName } from "../portrait/types.js";
import { formatReceiptLine, GAME_FORMATS, normalizeRoundFormat } from "../game/gameFormats.js";

/**
 * @param {{
 *   recap: { finalStandings: object, bestMoment: object, worstBeat: object, groupRecap: object } | null
 *   recapSessionKey?: number
 *   receiptContext?: unknown
 *   roundId?: string | null
 *   formatId?: import('../game/gameFormats.js').RoundFormatId
 *   onDone: () => void
 *   themeId?: string
 * }} props
 */
export function RoundRecapScreen({ recap, onDone, themeId = "default-dark", formatId = "wolf" }) {
  const fmt = normalizeRoundFormat(formatId);
  const formatMeta = GAME_FORMATS[fmt];
  const [shareStatus, setShareStatus] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [capturePulse, setCapturePulse] = useState(false);
  const scrollRef = useRef(null);
  const pulseTimerRef = useRef(null);

  const prepareCaptureMoment = useCallback(async () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    setCapturePulse(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setCapturePulse(false);
      pulseTimerRef.current = null;
    }, 420);
    await new Promise((resolve) => setTimeout(resolve, 180));
  }, []);

  const handleShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    setShareStatus("");
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
      await prepareCaptureMoment();
      const shareUrl = window.location.href;
      const title = "The Card — round results";
      const text = "Receipts don't lie. Look what just happened.";
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
      } else {
        const msg = `${text}: ${shareUrl}`;
        await navigator.clipboard.writeText(msg);
        setShareStatus("Copied — paste in your group chat");
      }
    } catch {
      setShareStatus("Share canceled");
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, prepareCaptureMoment]);

  const handleSaveImage = useCallback(async () => {
    if (isSavingImage) return;
    if (!scrollRef.current) return;
    setIsSavingImage(true);
    setShareStatus("");
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
      await prepareCaptureMoment();
      const canvas = await html2canvas(scrollRef.current, {
        backgroundColor: "#050808",
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
      });
      const data = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = data;
      a.download = "tee-party-receipt.png";
      a.click();
      setShareStatus("Saved — ready to post");
    } catch {
      setShareStatus("Could not save image");
    } finally {
      setIsSavingImage(false);
    }
  }, [isSavingImage, prepareCaptureMoment]);

  if (!recap) return null;

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
        themeId={themeId}
      />
    </div>
  );

  return (
    <div className="round-recap round-recap--in-shell">
      <header className="round-recap__head">
        <h1 className="round-recap__title">End of round</h1>
        <p className="round-recap__format-line">{formatReceiptLine(fmt)}</p>
        <p className="round-recap__format-sub">{formatMeta.description}</p>
        <p className="round-recap__lede">Final receipts — standings, best beat, worst beat, group stamp.</p>
      </header>
      <div
        ref={scrollRef}
        className={`round-recap__scroll${capturePulse ? " round-recap__scroll--capture" : ""}`}
        role="region"
        aria-label="Recap cards"
      >
        {block("1 · Final standings", finalStandings)}
        {block("2 · Best moment", bestMoment)}
        {block("3 · Worst beat", worstBeat)}
        {block("4 · Group recap", groupRecap)}
      </div>
      <div className="round-recap__footer">
        <p className="round-recap__microcopy">If it’s not here, it didn’t happen.</p>
        <button
          type="button"
          className="btn btn--primary round-recap__share-primary"
          onClick={handleShare}
          disabled={isSharing}
        >
          {isSharing ? "Opening share..." : "Send this to the group chat"}
        </button>
        <button
          type="button"
          className="btn btn--outline round-recap__save-image"
          onClick={handleSaveImage}
          disabled={isSavingImage}
        >
          {isSavingImage ? "Saving..." : "Save to Photos"}
        </button>
        {shareStatus ? <p className="round-recap__share-status">{shareStatus}</p> : null}
        <button type="button" className="btn btn--primary round-recap__done" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
