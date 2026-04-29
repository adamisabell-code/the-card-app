function normalizePathname(pathname) {
  const p = (pathname || "/").replace(/\/$/, "");
  return p || "/";
}

/**
 * @param {string} pathname
 */
export function isSettingsPath(pathname) {
  return normalizePathname(pathname) === "/settings";
}

