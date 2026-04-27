import { PlayerAvatar } from "./PlayerAvatar.jsx";

/**
 * @param {{
 *   playerId: string
 *   displayName: string
 *   portraitBundle?: import('../portrait/types.js').PortraitBundle | null
 *   isCurrentWolf: boolean
 *   subtitle?: string
 *   selected?: boolean
 *   onClick?: () => void
 *   size?: 'sm' | 'md'
 *   className?: string
 * }} props
 */
export function PlayerIdentityRow({
  displayName,
  portraitBundle,
  isCurrentWolf,
  subtitle,
  selected,
  onClick,
  size = "sm",
  className = "",
}) {
  const inner = (
    <>
      <PlayerAvatar displayName={displayName} portraitBundle={portraitBundle} isCurrentWolf={isCurrentWolf} size={size} />
      <div className="player-identity-row__text">
        <span className="player-identity-row__name">{displayName}</span>
        {subtitle ? <span className="player-identity-row__sub">{subtitle}</span> : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`player-identity-row player-identity-row--btn${selected ? " is-selected" : ""} ${className}`.trim()}
        onClick={onClick}
      >
        {inner}
      </button>
    );
  }

  return <div className={`player-identity-row ${className}`.trim()}>{inner}</div>;
}
