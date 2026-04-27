const RE = /^\/round\/([^/]+)\/?$/;

/**
 * @param {string} pathname
 * @returns {{ kind: 'share', shareId: string } | null}
 */
export function matchRoundSharePath(pathname) {
  if (!pathname || typeof pathname !== "string") return null;
  const m = RE.exec(pathname);
  if (!m) return null;
  const shareId = m[1];
  if (!shareId) return null;
  return { kind: "share", shareId };
}
