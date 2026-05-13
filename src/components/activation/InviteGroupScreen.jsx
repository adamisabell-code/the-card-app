import { useCallback, useEffect, useState } from "react";
import { encodeSnapshotForHash } from "../../roundShare/roundShareCodec.js";
import { putPublicRoundSnapshot } from "../../roundShare/publicRoundApi.js";
import { isValidRoundSharePayload } from "../../roundShare/roundSharePayload.js";

const QR_SIZE = 200;

/**
 * Shown only after a round exists (scorekeeper-first). Reuses the same share URL + QR pipeline as RoundShareModal.
 *
 * @param {{
 *   getSnapshot: () => import('../../roundShare/roundSharePayload.js').RoundSharePayloadV1 | null
 *   onContinueToScoring: () => void
 *   onCancelRound: () => void
 * }} props
 */
export function InviteGroupScreen({ getSnapshot, onContinueToScoring, onCancelRound }) {
  const [shareUrl, setShareUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(/** @type {string | null} */ (null));
  const [hashTooLongForQr, setHashTooLongForQr] = useState(false);

  const refresh = useCallback(async () => {
    setErr(null);
    setHashTooLongForQr(false);
    const raw = getSnapshot();
    if (!raw || !isValidRoundSharePayload(raw)) {
      setShareUrl("");
      setQrDataUrl(null);
      setErr("Round is not ready to share yet.");
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const snap = { ...raw, savedAt: Date.now() };
      const origin = window.location.origin;
      const path = `/round/${encodeURIComponent(snap.id)}`;
      const shortUrl = `${origin}${path}`;

      const putOk = await putPublicRoundSnapshot(snap.id, snap);
      let url;
      if (putOk) {
        url = shortUrl;
      } else {
        const h = await encodeSnapshotForHash(snap);
        url = `${shortUrl}#${h}`;
      }
      setShareUrl(url);

      if (url.length >= 2000) {
        setHashTooLongForQr(true);
        setQrDataUrl(null);
        setBusy(false);
        return;
      }
      setHashTooLongForQr(false);
      try {
        const QR = await import("qrcode");
        const data = await QR.default.toDataURL(url, { width: QR_SIZE, margin: 1, errorCorrectionLevel: "M" });
        setQrDataUrl(data);
      } catch {
        setQrDataUrl(null);
        setErr("Could not build QR. Copy the link below.");
      }
    } finally {
      setBusy(false);
    }
  }, [getSnapshot]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const copy = useCallback(() => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
  }, [shareUrl]);

  return (
    <div className="activation-flow activation-flow--padded activation-flow--invite">
      <div className="activation-flow__center activation-flow__center--compact">
        <h1 className="activation-flow__title activation-flow__title--sm">LET THE GROUP WATCH LIVE</h1>
        <p className="activation-flow__sub">Scan to follow the round live.</p>
      </div>

      <div className="activation-invite__qr card">
        {busy ? <p className="activation-flow__hint">Preparing link…</p> : null}
        {err ? <p className="activation-invite__err">{err}</p> : null}
        {hashTooLongForQr && !busy ? (
          <p className="activation-flow__hint">QR unavailable — link too long. Use Copy link.</p>
        ) : null}
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR code to follow this round live" className="round-share-modal__qr-img" width={QR_SIZE} height={QR_SIZE} />
        ) : null}
        {!busy && shareUrl ? (
          <button type="button" className="btn btn--outline btn--compact activation-invite__copy" onClick={copy}>
            Copy link
          </button>
        ) : null}
      </div>

      <div className="activation-flow__footer activation-flow__footer--split">
        <button type="button" className="btn btn--ghost btn--compact" onClick={onCancelRound}>
          Cancel round
        </button>
        <button type="button" className="btn btn--primary activation-flow__btn-main" onClick={onContinueToScoring}>
          START SCORING
        </button>
      </div>
    </div>
  );
}
