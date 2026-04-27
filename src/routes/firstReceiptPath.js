function normalizePathname(pathname) {
  const p = (pathname || "/").replace(/\/$/, "");
  return p || "/";
}

/**
 * @param {string} pathname
 * @returns {boolean} whether this path should show the First Receipt / preseason flow (e.g. QR from kit)
 */
export function isFirstReceiptPath(pathname) {
  const p = normalizePathname(pathname);
  return p === "/first-receipt" || p === "/receipt-kit";
}
