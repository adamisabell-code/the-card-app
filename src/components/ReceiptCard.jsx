import { getReceiptPortraitUrl } from "../portrait/types.js";
import { PORTRAIT_OUTPUT } from "../portrait/receiptPortraitSpec.js";

/**
 * Receipt body — same structure/classes as existing receipt preview.
 * Optional portrait: image URL from bundle or initials fallback (no layout breakage).
 *
 * @param {{
 *   playerName: string
 *   amountLabel: string
 *   stamp: string
 *   badges?: string[]
 *   portraitBundle?: import('../portrait/types.js').PortraitBundle | null
 *   portraitDisplayMode?: import('../portrait/types.js').PortraitMode | null
 *   layout?: 'default' | 'hero' | 'compact'
 *   initials: string
 *   aiFlavorText?: string | null
 *   themeId?: string
 * }} props
 */
export function ReceiptCard({
  playerName,
  amountLabel,
  stamp,
  badges = [],
  portraitBundle,
  portraitDisplayMode = null,
  layout = "default",
  initials,
  aiFlavorText = null,
  themeId = "default-dark",
}) {
  const portraitUrl = getReceiptPortraitUrl(portraitBundle, portraitDisplayMode);
  const rootClass = `receipt-preview receipt-card receipt-theme receipt-theme--${themeId}${
    layout === "hero" ? " receipt-preview--hero" : layout === "compact" ? " receipt-preview--compact" : ""
  }`;

  return (
    <div className={rootClass}>
      <div className="receipt-card__portrait-zone">
        <div className={`receipt-card__portrait-frame${portraitUrl ? "" : " receipt-card__portrait-frame--initials"}`}>
          {portraitUrl ? (
            <img
              className="receipt-card__portrait"
              src={portraitUrl}
              alt=""
              width={PORTRAIT_OUTPUT.width}
              height={PORTRAIT_OUTPUT.height}
              decoding="async"
            />
          ) : (
            <div className="receipt-card__initials" aria-hidden="true">
              {initials}
            </div>
          )}
        </div>
      </div>
      <div className="receipt-preview__row receipt-preview__row--name">
        <span>{playerName}</span>
      </div>
      <div className="receipt-preview__row receipt-preview__row--amount">
        <span>{amountLabel}</span>
      </div>
      <p className="receipt-preview__stamp">{stamp}</p>
      {aiFlavorText ? <p className="receipt-preview__flavor">{aiFlavorText}</p> : null}
      {badges.length > 0 && (
        <div className="receipt-preview__badges">
          {badges.map((b, i) => (
            <span key={`${b}-${i}`} className="pill">
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
