import { useCallback, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { initialsFromName } from "../portrait/types.js";

const LEAGUE_INVITES_KEY = "the-card-league-invites-v1";

const CHALLENGE_LINES = [
  "{name} just joined The Card to prove he's him.",
  "{name} says your foursome isn't ready.",
  "{name} just put the group on notice.",
  "{name} joined The Card. Now somebody has to prove him wrong.",
  "{name} is officially on the receipt watchlist.",
  "Your group has been challenged. {name} is in.",
  "{name} joined the league. Bring your scorecard or bring excuses.",
  "{name} just made it official. The next round counts.",
];

function saveInviteProfile(profile) {
  try {
    const raw = localStorage.getItem(LEAGUE_INVITES_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    const next = [profile, ...(Array.isArray(prev) ? prev : [])].slice(0, 40);
    localStorage.setItem(LEAGUE_INVITES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function randomChallenge(name) {
  const pick = CHALLENGE_LINES[Math.floor(Math.random() * CHALLENGE_LINES.length)] ?? CHALLENGE_LINES[0];
  return pick.replaceAll("{name}", name);
}

export function LeagueInviteScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [joined, setJoined] = useState(false);
  const [challengeLine, setChallengeLine] = useState("");
  const [status, setStatus] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const receiptRef = useRef(null);
  const inviteUrl = `${window.location.origin}/league-invite`;

  const initials = useMemo(() => initialsFromName(name || "Player"), [name]);

  const onPickPhoto = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setPhotoPreview(result);
      setPhotoDataUrl(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const onJoin = useCallback(() => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanEmail) {
      setStatus("Name and email are required.");
      return;
    }
    const profile = {
      name: cleanName,
      email: cleanEmail,
      profileImageUrl: photoDataUrl || null,
      createdAt: Date.now(),
      source: "league_invite_qr",
    };
    saveInviteProfile(profile);
    setChallengeLine(randomChallenge(cleanName));
    setJoined(true);
    setStatus("You're in. Receipt generated.");
  }, [email, name, photoDataUrl]);

  const onCopyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setStatus("Copied");
    } catch {
      setStatus("Could not copy");
    }
  }, [inviteUrl]);

  const onShareReceipt = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    const text = "I just joined The Card to prove I’m him. Join and try to prove me wrong.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join The Card", text, url: inviteUrl });
      } else {
        await navigator.clipboard.writeText(`${text} ${inviteUrl}`);
        setStatus("Copied");
      }
    } catch {
      setStatus("Share canceled");
    } finally {
      setIsSharing(false);
    }
  }, [inviteUrl, isSharing]);

  const onDownloadReceipt = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#07140f",
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
      });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "tee-party-receipt.png";
      a.click();
      setStatus("Saved");
    } catch {
      setStatus("Could not export image");
    }
  }, []);

  return (
    <div className="league-invite">
      <div className="league-invite__shell">
        {!joined ? (
          <>
            <header className="league-invite__head">
              <h1 className="league-invite__title">Join The Card</h1>
              <p className="league-invite__sub">
                I just joined this league to prove I&apos;m him.
                <br />
                Join and try to prove me wrong.
              </p>
            </header>

            <section className="league-invite__form card">
              <label className="field field--solo">
                <span className="field__label">Profile photo (strongly recommended)</span>
                <input className="field__input" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto} />
              </label>
              <label className="field field--solo">
                <span className="field__label">Name</span>
                <input className="field__input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </label>
              <label className="field field--solo">
                <span className="field__label">Email</span>
                <input className="field__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </label>
              <button type="button" className="btn btn--primary" onClick={onJoin}>
                Join The League
              </button>
              {status ? <p className="league-invite__status">{status}</p> : null}
            </section>
          </>
        ) : (
          <>
            <header className="league-invite__head">
              <h1 className="league-invite__title">Challenge Receipt</h1>
            </header>
            <section ref={receiptRef} className="league-challenge-receipt">
              <p className="league-challenge-receipt__brand">Tee Party · The Card</p>
              <div className="league-challenge-receipt__hero">
                <div className="league-challenge-receipt__avatar">
                  {photoPreview ? (
                    <img src={photoPreview} alt={`${name} profile`} decoding="async" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="league-challenge-receipt__who">
                  <p className="league-challenge-receipt__name">{name}</p>
                  <p className="league-challenge-receipt__msg">{challengeLine}</p>
                </div>
              </div>
              <p className="league-challenge-receipt__line">If it&apos;s not on the receipt, it didn&apos;t happen.</p>
            </section>
            <div className="league-invite__actions">
              <button type="button" className="btn btn--primary" onClick={onShareReceipt} disabled={isSharing}>
                {isSharing ? "Sharing..." : "Share Receipt"}
              </button>
              <button type="button" className="btn btn--outline" onClick={onDownloadReceipt}>
                Download Receipt
              </button>
              <button type="button" className="btn btn--outline" onClick={onCopyInviteLink}>
                Copy Invite Link
              </button>
              {status ? <p className="league-invite__status">{status}</p> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

