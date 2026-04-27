import { isValidRoundSharePayload } from "./roundSharePayload.js";

/**
 * @param {Uint8Array} u8
 * @returns {string}
 */
function uint8ToBase64Url(u8) {
  let binary = "";
  for (let i = 0; i < u8.length; i += 1) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * @param {string} b64url
 * @returns {Uint8Array}
 */
function base64UrlToUint8(b64url) {
  let s = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "====".slice(0, 4 - pad);
  const binary = atob(s);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) u8[i] = binary.charCodeAt(i);
  return u8;
}

/**
 * @param {Uint8Array} u8
 * @returns {Promise<Uint8Array>}
 */
async function gzipCompress(u8) {
  if (typeof CompressionStream === "undefined") {
    return u8;
  }
  const stream = new Blob([u8]).stream().pipeThrough(new CompressionStream("gzip"));
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * @param {Uint8Array} u8
 * @returns {Promise<Uint8Array>}
 */
async function gzipDecompress(u8) {
  if (u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Gzip not supported in this browser.");
    }
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"));
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  }
  return u8;
}

/**
 * Encode snapshot for hash-only links (no server). Returns `p=...` query-style fragment.
 * @param {import('./roundSharePayload.js').RoundSharePayloadV1} snap
 * @returns {Promise<string>}
 */
export async function encodeSnapshotForHash(snap) {
  const json = JSON.stringify(snap);
  const raw = new TextEncoder().encode(json);
  const compressed = await gzipCompress(raw);
  const b64 = uint8ToBase64Url(compressed);
  return `p=${encodeURIComponent(b64)}`;
}

/**
 * @param {string} hash — full `location.hash` (with #) or body only
 * @returns {Promise<import('./roundSharePayload.js').RoundSharePayloadV1 | null>}
 */
export async function decodeSnapshotFromHash(hash) {
  try {
    const h = (hash && hash[0] === "#" ? hash.slice(1) : hash).trim();
    if (!h) return null;
    const q = h.includes("=") ? h : `p=${h}`;
    const p = new URLSearchParams(q).get("p");
    if (!p) return null;
    const decodedP = decodeURIComponent(p);
    const u8 = base64UrlToUint8(decodedP);
    const out = await gzipDecompress(u8);
    const text = new TextDecoder().decode(out);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }
    if (!isValidRoundSharePayload(data)) return null;
    return data;
  } catch {
    return null;
  }
}
