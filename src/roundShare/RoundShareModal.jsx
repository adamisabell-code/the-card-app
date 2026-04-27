import { useCallback, useEffect, useState } from "react";
import { encodeSnapshotForHash } from "./roundShareCodec.js";
import { putPublicRoundSnapshot } from "./publicRoundApi.js";
import { isValidRoundSharePayload } from "./roundSharePayload.js";

const QR_SIZE = 200;

/**
 * @param {{ open: boolean, onClose: () => void, getSnapshot: () => import('./roundSharePayload.js').RoundSharePayloadV1 | null }} props
 */
export function RoundShareModal({ open, onClose, getSnapshot }) {
  const [shareUrl, setShareUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState(/** @type {string | null} */ (null));
  const [source, setSource] = useState(/** @type { 'api' | 'hash' } */ ("api"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(/** @type {string | null} */ (null));
  const [hashTooLongForQr, setHashTooLongForQr] = useState(false);

  const refresh = useCallback(async () => {
    setErr(null);
    setHashTooLongForQr(false);
    const raw = getSnapshot();
    if (!raw || !isValidRoundSharePayload(raw)) {
      setShareUrl("");
      setQrDataUrl(null);
      setErr("This round is not ready to share yet.");
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
        setSource("api");
      } else {
        const h = await encodeSnapshotForHash(snap);
        url = `${shortUrl}#${h}`;
        setSource("hash");
      }
      setShareUrl(url);

      if (url.length >= 2000) {
        setHashTooLongForQr(true);
        setQrDataUrl(null);
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
    if (open) void refresh();
  }, [open, refresh]);

  const copy = useCallback(() => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
  }, [shareUrl]);

  if (!open) return null;

  return (
    <div className="round-share-modal" role="dialog" aria-modal="true" aria-label="Share round">
      <button type="button" className="round-share-modal__scrim" onClick={onClose} aria-label="Close" />
      <div className="round-share-modal__panel card">
        <div className="round-share-modal__head">
          <h2 className="card__title card__title--sm">Share Round</h2>
          <button type="button" className="round-share-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="round-share-modal__lede">
          Anyone with the link can follow the scorecard in their browser—no app or login. View only.
        </p>
        {!busy && shareUrl && (
          <div className="round-share-modal__status" role="status" aria-label="Round share status">
            <p className="round-share-modal__status-title">Round share status</p>
            <ul className="round-share-modal__status-list">
              <li>
                {source === "api" ? (
                  <span className="round-share-modal__status-ok">Short link active</span>
                ) : (
                  <span className="round-share-modal__status-fallback">Offline fallback link</span>
                )}
              </li>
              {hashTooLongForQr ? (
                <li>
                  <span className="round-share-modal__status-qr-bad">QR unavailable — link too long</span>
                </li>
              ) : qrDataUrl ? (
                <li>
                  <span className="round-share-modal__status-ok">QR available</span>
                </li>
              ) : null}
            </ul>
          </div>
        )}
        {err ? <p className="round-share-modal__err">{err}</p> : null}
        {busy ? (
          <p className="round-share-modal__busy" aria-live="polite">
            Preparing link…
          </p>
        ) : null}

        <div className="round-share-modal__qr">
          {hashTooLongForQr && !busy ? (
            <p className="round-share-modal__qr-skip">This link is long—use Copy. Recipients paste into a browser address bar.</p>
          ) : null}
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR code for round share link" className="round-share-modal__qr-img" width={QR_SIZE} height={QR_SIZE} />
          ) : null}
        </div>

        <label className="round-share-modal__url-field">
          <span className="round-share-modal__url-label">Link</span>
          <input className="round-share-modal__url-input" type="text" readOnly value={shareUrl} />
        </label>
        <div className="round-share-modal__actions">
          <button type="button" className="btn btn--primary btn--compact" onClick={copy} disabled={!shareUrl || busy}>
            Copy link
          </button>
          <button type="button" className="btn btn--outline btn--compact" onClick={() => void refresh()} disabled={busy}>
            Refresh
          </button>
        </div>
        <p className="round-share-modal__hint">Tap Refresh to sync the latest card before you share a screenshot.</p>
      </div>
    </div>
  );
}
