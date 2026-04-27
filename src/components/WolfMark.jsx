import { useId } from "react";

/**
 * Wolf status mark — reads stronger than a profile chip (current-hole control).
 */
export function WolfMark({ className = "" }) {
  const rid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gid = `wolf-g-${rid}`;
  const fid = `wolf-f-${rid}`;

  return (
    <svg
      className={`wolf-mark ${className}`.trim()}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="6" y1="4" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7ee8ff" />
          <stop offset="0.45" stopColor="#00bfff" />
          <stop offset="1" stopColor="#006080" />
        </linearGradient>
        <filter id={fid} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="14" fill={`url(#${gid})`} opacity="0.22" />
      <path
        filter={`url(#${fid})`}
        fill={`url(#${gid})`}
        d="M16 4.5 20.2 9.1l5.8-1.7-1.4 5.7 4.6 4-5.5 1.5L22 26l-6-2.6L10 26l-1.7-6.5-5.5-1.5 4.6-4-1.4-5.7 5.8 1.7L16 4.5Zm0 4.2-2.8 4.5-5.1-.9 3.1 4.3-2.8 4.8 5.1-1.4L16 23l2.3-4.9 5.1 1.4-2.8-4.8 3.1-4.3-5.1.9L16 8.7Z"
      />
      <path
        fill="#0a1218"
        opacity="0.55"
        d="M12.5 14.2c.9-.6 2.1-.9 3.5-.9s2.6.3 3.5.9c-.4 1.5-1.7 2.5-3.5 2.5s-3.1-1-3.5-2.5Z"
      />
    </svg>
  );
}
