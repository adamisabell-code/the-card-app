import { isValidRoundSharePayload } from "./roundSharePayload.js";

/**
 * Round share — short-link API (dev: via Vite proxy to `npm run server`).
 *
 * **Limitations (intentional for this build):**
 * - Static production deploys (Vercel `vercel.json` rewrites) serve the SPA; they do not include this
 *   Express API unless you add a serverless/edge API or an app server. Use the **hash fallback** link in
 *   that case, or deploy the Node server.
 * - No auth: anyone with a round id can `GET` a stored snapshot (ids are unguessable UUIDs).
 * - CORS: same-origin only; cross-origin `fetch` to another host will need CORS headers on the API.
 *
 * @param {string} id
 * @param {import('./roundSharePayload.js').RoundSharePayloadV1} payload
 * @returns {Promise<boolean>} true if API accepted
 */
export async function putPublicRoundSnapshot(id, payload) {
  try {
    const res = await fetch(`/api/public-round/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * @param {string} id
 * @returns {Promise<import('./roundSharePayload.js').RoundSharePayloadV1 | null>}
 */
export async function getPublicRoundSnapshot(id) {
  try {
    const res = await fetch(`/api/public-round/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!isValidRoundSharePayload(data)) return null;
    if (data.id !== id) return null;
    return data;
  } catch {
    return null;
  }
}
