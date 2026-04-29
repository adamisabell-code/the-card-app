function normalizePathname(pathname) {
  const p = (pathname || "/").replace(/\/$/, "");
  return p || "/";
}

/**
 * @param {string} pathname
 */
export function isLeagueInvitePath(pathname) {
  return normalizePathname(pathname) === "/league-invite";
}

