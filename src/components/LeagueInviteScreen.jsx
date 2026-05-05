import { useCallback, useMemo, useRef, useState } from "react";
import { ReceiptCard } from "./ReceiptCard.jsx";
import { initialsFromName } from "../portrait/types.js";
import { savePersistedPortraitProfile } from "../portrait/userPortraitProfile.js";
import { upsertPlayerAvatarProfileState } from "../portrait/avatarProfileState.js";
import { generateCalloutReceipt } from "../receipts/services/receiptSystemService.js";

const LEAGUE_INVITES_KEY = "the-card-league-invites-v1";
const PRESEASON_STAMPS = ["SEASON ONE LOCKED", "YOU'VE BEEN CALLED OUT", "ANYONE CAN GET IT"];
const PRESEASON_FLAVORS = ["I joined. You better show up.", "Don't hide. I'm coming for you.", "Who's next?"];

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

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)] ?? list[0] ?? "";
}

async function dataUrlToArrayBuffer(dataUrl) {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
}

async function persistInvitePortrait(photoDataUrl) {
  if (!photoDataUrl) return;
  try {
    const buf = await dataUrlToArrayBuffer(photoDataUrl);
    await savePersistedPortraitProfile({
      version: 1,
      sourceFingerprint: `league-invite:${Date.now()}`,
      originalMime: "image/png",
      originalBuf: buf,
      baseBuf: buf,
      styledNeutralBuf: buf,
      styledWinnerBuf: buf,
      styledLoserBuf: buf,
      preferredMode: "neutral",
      regenerateCount: 0,
    });
    upsertPlayerAvatarProfileState("p-0", "ready");
  } catch {
    /* ignore portrait persistence failures */
  }
}

export function LeagueInviteScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [joined, setJoined] = useState(false);
  const [calloutReceipt, setCalloutReceipt] = useState(null);
  const [renderedCalloutImage, setRenderedCalloutImage] = useState("");
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
    const receipt = {
      type: "preseason_callout",
      playerName: cleanName,
      amount: null,
      stamp: randomFrom(PRESEASON_STAMPS),
      flavor: randomFrom(PRESEASON_FLAVORS),
      badges: ["Founding Player"],
      resultType: "callout",
    };
    setCalloutReceipt(receipt);
    setJoined(true);
    void persistInvitePortrait(photoDataUrl);
    const portraitForRender = photoDataUrl || null;
    void generateCalloutReceipt({
      playerName: cleanName,
      profilePhotoPath: portraitForRender,
      portraitUrl: portraitForRender,
    })
      .then((rendered) => {
        setRenderedCalloutImage(rendered.receiptImageUrl);
      })
      .catch((error) => {
        console.error("[receipt-pipeline] callout render failed", error);
      });
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

  const onStartFirstRound = useCallback(() => {
    window.location.href = "/";
  }, []);

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
                  <p className="league-challenge-receipt__name">{calloutReceipt?.playerName ?? name}</p>
                  <p className="league-challenge-receipt__msg">{calloutReceipt?.stamp ?? "SEASON ONE LOCKED"}</p>
                </div>
              </div>
              <div className="league-challenge-receipt__card-wrap">
                <ReceiptCard
                  playerName={calloutReceipt?.playerName ?? name}
                  amountLabel="$—"
                  stamp={calloutReceipt?.stamp ?? "SEASON ONE LOCKED"}
                  badges={calloutReceipt?.badges ?? ["Founding Player"]}
                  aiFlavorText={calloutReceipt?.flavor ?? "I joined. You better show up."}
                  initials={initials}
                  layout="hero"
                />
                <p className="league-challenge-receipt__msg league-challenge-receipt__msg--callout">
                  {calloutReceipt?.flavor ?? "I joined. You better show up."}
                </p>
                {renderedCalloutImage ? (
                  <img
                    className="settings-screen__dev-preview"
                    src={renderedCalloutImage}
                    alt="Rendered callout receipt PNG"
                    decoding="async"
                  />
                ) : null}
              </div>
              <p className="league-challenge-receipt__line">If it&apos;s not on the receipt, it didn&apos;t happen.</p>
            </section>
            <div className="league-invite__actions">
              <button type="button" className="btn btn--primary" onClick={onShareReceipt} disabled={isSharing}>
                {isSharing ? "Sharing..." : "Share Receipt"}
              </button>
              <button type="button" className="btn btn--outline" onClick={onCopyInviteLink}>
                Invite Your Group
              </button>
              <button type="button" className="btn btn--outline" onClick={onStartFirstRound}>
                Start Your First Round
              </button>
              {status ? <p className="league-invite__status">{status}</p> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

