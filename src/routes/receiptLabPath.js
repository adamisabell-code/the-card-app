function normalizePathname(pathname) {
  const p = (pathname || "/").replace(/\/$/, "");
  return p || "/";
}

/**
 * @param {string} pathname
 * @returns {boolean} developer receipt scenario lab
 */
export function isReceiptLabPath(pathname) {
  return normalizePathname(pathname) === "/receipt-lab";
}
