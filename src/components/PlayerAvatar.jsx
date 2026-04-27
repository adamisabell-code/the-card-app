import { useEffect, useState } from "react";
import { getReceiptPortraitUrl, initialsFromName } from "../portrait/types.js";

const WOLF_HEAD_SRC = "/assets/wolf-head.png";

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
  const [wolfImgFailed, setWolfImgFailed] = useState(false);
  const initials = initialsFromName(displayName || "?");

  useEffect(() => {
    if (isCurrentWolf) setWolfImgFailed(false);
  }, [isCurrentWolf]);

  const root = `player-avatar player-avatar--${size}${isCurrentWolf ? " player-avatar--wolf" : ""} ${className}`.trim();

  if (isCurrentWolf) {
    return (
      <div className={root} title="Wolf — this hole">
        {wolfImgFailed ? (
          <span className="player-avatar__initials" aria-hidden="true">
            {initials}
          </span>
        ) : (
          <img
            className="player-avatar__wolf-mark"
            src={WOLF_HEAD_SRC}
            alt=""
            width={40}
            height={40}
            decoding="async"
            onError={() => setWolfImgFailed(true)}
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
