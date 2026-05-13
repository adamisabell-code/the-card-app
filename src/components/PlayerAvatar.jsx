import { useEffect, useState } from "react";
import { getReceiptPortraitUrl, initialsFromName } from "../portrait/types.js";

/** Current-hole Wolf tile — transparent PNG in `public/assets/wolf-logo.png`. */
const WOLF_LOGO_PNG = "/assets/wolf-logo.png";

/**
 * @param {{
 *   displayName: string
 *   portraitBundle?: import('../portrait/types.js').PortraitBundle | null
 *   isCurrentWolf: boolean
 *   size?: 'sm' | 'md'
 *   className?: string
 * }} props
 */
export function PlayerAvatar({
  displayName,
  portraitBundle,
  isCurrentWolf,
  size = "sm",
  className = "",
}) {
  const [wolfIconFailed, setWolfIconFailed] = useState(false);
  const initials = initialsFromName(displayName || "?");

  useEffect(() => {
    if (isCurrentWolf) setWolfIconFailed(false);
  }, [isCurrentWolf]);

  const root = `player-avatar player-avatar--${size}${isCurrentWolf ? " player-avatar--wolf" : ""} ${className}`.trim();

  if (isCurrentWolf) {
    return (
      <div className={root} title="Wolf — this hole">
        {wolfIconFailed ? (
          <span className="player-avatar__initials" aria-hidden="true">
            {initials}
          </span>
        ) : (
          <img
            className="player-avatar__wolf-icon"
            src={WOLF_LOGO_PNG}
            alt=""
            width={40}
            height={40}
            decoding="async"
            draggable={false}
            onError={() => setWolfIconFailed(true)}
          />
        )}
      </div>
    );
  }

  const url = getReceiptPortraitUrl(portraitBundle ?? null);

  if (url) {
    return (
      <div className={root}>
        <img className="player-avatar__img" src={url} alt="" width={40} height={40} decoding="async" />
      </div>
    );
  }

  return (
    <div className={root} aria-hidden="true">
      <span className="player-avatar__initials">{initials}</span>
    </div>
  );
}
