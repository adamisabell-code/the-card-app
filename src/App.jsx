import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import teePartyLogo from "./assets/tee-party-logo-transparent.png";
import "./App.css";
import { CreateFirstReceiptScreen } from "./components/CreateFirstReceiptScreen.jsx";
import { ReceiptCard } from "./components/ReceiptCard.jsx";
import { PortraitSetupFlow } from "./components/PortraitSetupFlow.jsx";
import { PlayerAvatar } from "./components/PlayerAvatar.jsx";
import { RoundRecapScreen } from "./components/RoundRecapScreen.jsx";
import { WolfRoundScreen } from "./components/WolfRoundScreen.jsx";
import { ReceiptThemePicker } from "./components/ReceiptThemePicker.jsx";
import { initialsFromName } from "./portrait/types.js";
import { revokePortraitBundle } from "./portrait/pipeline.js";
import { MAX_PLAYABLE_HOLE, SLOT_PLAYER_IDS } from "./game/types.js";
import {
  buildWolfOrderAfterFirstPick,
  getAssignedWolfPlayerId,
  getTiedLowestWolfPointPlayerIds,
} from "./game/wolfRotation.js";
import { computeRoundEloUpdate } from "./game/elo.js";
import { buildRecapShareCards, persistRoundHistoryToSession } from "./game/roundRecap.js";
import { buildRoundResult } from "./game/roundResult.js";
import { aggregateWolfRoundStats } from "./game/scoring.js";
import {
  hydrateBundleFromPersistedRecord,
  loadPersistedPortraitProfile,
} from "./portrait/userPortraitProfile.js";
import {
  DEMO_RECEIPT_HOME,
  buildLastReceiptSnapshot,
  hasReturningUserReceipt,
  loadLastReceiptSnapshot,
  markReturningUserReceipt,
  saveLastReceiptSnapshot,
} from "./home/homeReceipt.js";
import { appendCompletedRound, loadCompletedRounds } from "./home/completedRounds.js";
import { fetchReceiptFlavorIfEnabled } from "./home/receiptFlavorClient.js";
import { usePathname, APP_PATHNAME_CHANGED } from "./hooks/usePathname.js";
import { isFirstReceiptPath } from "./routes/firstReceiptPath.js";
import { isLeagueInvitePath } from "./routes/leagueInvitePath.js";
import { isSettingsPath } from "./routes/settingsPath.js";
import { matchRoundSharePath } from "./roundShare/matchRoundSharePath.js";
import { buildRoundShareSnapshot } from "./roundShare/roundSharePayload.js";
import { putPublicRoundSnapshot } from "./roundShare/publicRoundApi.js";
import { RoundShareModal } from "./roundShare/RoundShareModal.jsx";
import { RoundShareViewerScreen } from "./roundShare/RoundShareViewerScreen.jsx";
import { LeagueInviteScreen } from "./components/LeagueInviteScreen.jsx";
import { DEFAULT_RECEIPT_THEME_ID, normalizeReceiptThemeId } from "./receiptThemes.js";
import { loadPlayerAvatarProfileState } from "./portrait/avatarProfileState.js";

function NavIcon({ name }) {
  const common = { width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "home":
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "rounds":
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h10a2 2 0 0 1 2 2v14l-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1V6a2 2 0 0 1 2-2Z" />
          <path d="M9 9h6M9 13h4" opacity="0.85" />
        </svg>
      );
    case "leaderboard":
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 21V8h5v13M14 21V4h5v17" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.1" />
          <path d="M19 12a7 7 0 0 0-.08-1l2.02-1.57-1.9-3.3-2.46 1a7.1 7.1 0 0 0-1.72-1l-.36-2.62h-3.8l-.36 2.62a7.1 7.1 0 0 0-1.72 1l-2.46-1-1.9 3.3L5.08 11a7 7 0 0 0 0 2l-2.02 1.57 1.9 3.3 2.46-1a7.1 7.1 0 0 0 1.72 1l.36 2.62h3.8l.36-2.62a7.1 7.1 0 0 0 1.72-1l2.46 1 1.9-3.3L18.92 13c.05-.33.08-.66.08-1Z" />
        </svg>
      );
    default:
      return null;
  }
}

const NAV_TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "rounds", label: "Rounds", icon: "rounds" },
  { id: "receipt", label: "Receipt", icon: "receipt" },
  { id: "leaderboard", label: "Leaderboard", icon: "leaderboard" },
  { id: "settings", label: "Settings", icon: "settings" },
];

/** Placeholder league rows — not tied to round scoring or backend. */
const DEMO_CITY_LEADERBOARD_ROWS = [
  { name: "Jordan K.", city: "Austin, TX", points: 842, badge: "Wolf Killer" },
  { name: "Sam R.", city: "Austin, TX", points: 791, badge: "Press Merchant" },
  { name: "Riley M.", city: "Austin, TX", points: 764, badge: "Took Everything" },
  { name: "Casey T.", city: "Round Rock, TX", points: 718 },
  { name: "Drew L.", city: "Austin, TX", points: 702, badge: "Wolf Killer" },
  { name: "Alex P.", city: "Cedar Park, TX", points: 689 },
];

const DEMO_NATIONAL_LEADERBOARD_ROWS = [
  { name: "Morgan V.", city: "Portland, OR", points: 1204, badge: "Took Everything" },
  { name: "Reese Q.", city: "Chicago, IL", points: 1188, badge: "Wolf Killer" },
  { name: "Taylor J.", city: "Dallas, TX", points: 1142, badge: "Press Merchant" },
  { name: "Jordan K.", city: "Austin, TX", points: 1120, badge: "Wolf Killer" },
  { name: "Jamie F.", city: "Atlanta, GA", points: 1096 },
  { name: "Sky B.", city: "Denver, CO", points: 1071, badge: "Press Merchant" },
];

const PLAYER_LABELS = ["Player 1", "Player 2", "Player 3", "Player 4"];

const initialPlayers = () => ["", "", "", ""];

const NEARBY_COURSES = ["Lions Municipal", "Morris Williams", "Avery Ranch"];

const TEE_OPTIONS = ["Tips", "Blue", "White", "Gold", "Forward"];
const THEME_STORAGE_KEY = "theme";
const LEGACY_RECEIPT_THEME_STORAGE_KEY = "the-card-receipt-theme-v1";
const STAKES_CONFIG_KEY = "the-card-stakes-config-v1";
const INSTALL_PROMPT_SHOWN_KEY = "installPromptShown";

function loadStakesConfig() {
  try {
    const raw = localStorage.getItem(STAKES_CONFIG_KEY);
    if (!raw) throw new Error("missing");
    const parsed = JSON.parse(raw);
    return {
      preset: parsed.preset === "custom" || parsed.preset === 1 || parsed.preset === 2 || parsed.preset === 5 ? parsed.preset : 2,
      customValue: typeof parsed.customValue === "string" ? parsed.customValue : "",
      loneWolf2x: parsed.loneWolf2x !== false,
      blindWolf3x: parsed.blindWolf3x !== false,
      hideDollarAmounts: parsed.hideDollarAmounts === true,
    };
  } catch {
    return {
      preset: 2,
      customValue: "",
      loneWolf2x: true,
      blindWolf3x: true,
      hideDollarAmounts: false,
    };
  }
}

function saveStakesConfig(config) {
  try {
    localStorage.setItem(STAKES_CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

function loadThemePreference() {
  try {
    const primary = localStorage.getItem(THEME_STORAGE_KEY);
    if (primary) return normalizeReceiptThemeId(primary);
    return normalizeReceiptThemeId(localStorage.getItem(LEGACY_RECEIPT_THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_RECEIPT_THEME_ID;
  }
}

function newRoundShareId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SPLASH_1_TOTAL_MS = 2300;
const SPLASH_2_MS = 1450;
/** Handoff window — covers staged tee-party exit + The Card copy stagger (~0.76s). */
const SPLASH_CROSSFADE_MS = 780;
const SPLASH_1_XFADE_AT = SPLASH_1_TOTAL_MS - SPLASH_CROSSFADE_MS;

function displayPlayerName(players, index) {
  const raw = players[index]?.trim();
  return raw || PLAYER_LABELS[index];
}

function buildGamePlayersFromSlots(players) {
  return SLOT_PLAYER_IDS.map((id, i) => ({
    id,
    slotIndex: i,
    name: displayPlayerName(players, i),
  }));
}

/** phase: s1 → xfade (overlap) → s2 → (caller hides at home) */
function OpeningSequence({ phase }) {
  const showTeeParty = phase === "s1" || phase === "xfade";
  const showTheCard = phase === "xfade" || phase === "s2";

  return (
    <div className="splash-flow splash-screen splash-screen--brand" aria-hidden="true">
      {showTeeParty && (
        <div
          className={`splash-flow__layer splash-flow__layer--tp${
            phase === "xfade" ? " splash-flow__layer--tp-out" : ""
          }`}
        >
          <div className="splash-screen__inner">
            <div className="splash-apt">
              <div className="splash-apt__logo-wrap">
                <img
                  className="splash-apt__logo"
                  src={teePartyLogo}
                  alt="Austin Tee Party"
                  width={175}
                  decoding="async"
                />
              </div>
            </div>
            <p className="splash-screen__eyebrow">Where it all began</p>
          </div>
        </div>
      )}
      {showTheCard && (
        <div
          className={`splash-flow__layer splash-flow__layer--tc${
            phase === "xfade" ? " splash-flow__layer--tc-in" : " splash-flow__layer--tc-held"
          }`}
        >
          <div className="splash-screen__inner">
            <h1 className="splash-tc-title">The Card</h1>
            <p className="splash-tc-official">Official scorecard of Austin Tee Party</p>
            <p className="splash-tc-line">Track rounds. Post the Receipt. Prove it.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function roundSummaryForList(round) {
  const ids = round.players.map((p) => p.id);
  const stats = aggregateWolfRoundStats(round.holeRecords, ids);
  const sorted = [...round.players]
    .map((p) => ({ ...p, wpts: stats.wolfPointsByPlayerId[p.id] ?? 0 }))
    .sort((a, b) => b.wpts - a.wpts || a.slotIndex - b.slotIndex);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  return {
    winnerName: top?.name ?? "—",
    topPts: top?.wpts ?? 0,
    spread: (top?.wpts ?? 0) - (bottom?.wpts ?? 0),
    holeCount: round.holeRecords.length,
  };
}

function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="tab-bar" aria-label="Primary">
      <ul className="tab-bar__list">
        {NAV_TABS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <li key={item.id} className="tab-bar__item">
              <button
                type="button"
                className={`tab-bar__btn${isActive ? " tab-bar__btn--active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onTabChange(item.id)}
              >
                <span className="tab-bar__icon">
                  <NavIcon name={item.icon} />
                </span>
                <span className="tab-bar__label">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeScreen({
  activeTab,
  onTabChange,
  completedRounds,
  onViewRoundRecap,
  onNewRound,
  onRunItBack,
  onNewGroup,
  onShareReceipt,
  onPortraitSetup,
  receiptPortrait,
  receiptPortraitDisplayMode,
  currentUserDisplayName,
  lastReceiptSnapshot,
  receiptThemeId,
}) {
  const isReturning = hasReturningUserReceipt();
  const snap = isReturning ? lastReceiptSnapshot ?? loadLastReceiptSnapshot() : null;
  const receipt =
    snap?.playerName != null
      ? {
          playerName: snap.playerName,
          amountLabel: snap.amountLabel,
          stamp: snap.stamp,
          badges: snap.badges?.length >= 2 ? snap.badges : [...DEMO_RECEIPT_HOME.badges],
        }
      : DEMO_RECEIPT_HOME;
  const initials = initialsFromName(receipt.playerName);
  const portraitBundle = isReturning && snap?.playerName != null ? receiptPortrait : null;
  let portraitDisplay = null;
  if (isReturning && snap?.playerName != null) {
    portraitDisplay = snap.portraitHeroMode ?? receiptPortraitDisplayMode ?? null;
  }

  const [leagueLeaderboardScope, setLeagueLeaderboardScope] = useState("city");

  useEffect(() => {
    if (activeTab === "leaderboard") {
      setLeagueLeaderboardScope("city");
    }
  }, [activeTab]);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteQrDataUrl, setInviteQrDataUrl] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const inviteUrl = `${window.location.origin}/league-invite`;
  const [deferredInstallPromptEvent, setDeferredInstallPromptEvent] = useState(null);
  const [showReceiptInstallPrompt, setShowReceiptInstallPrompt] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPromptEvent(event);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!(activeTab === "receipt" && isReturning && snap?.playerName)) return;
    let alreadyShown = false;
    try {
      alreadyShown = localStorage.getItem(INSTALL_PROMPT_SHOWN_KEY) === "true";
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) return;
    setShowReceiptInstallPrompt(true);
    try {
      localStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, "true");
    } catch {
      /* ignore */
    }
  }, [activeTab, isReturning, snap?.playerName]);

  useEffect(() => {
    if (!inviteModalOpen) return;
    let dead = false;
    void import("qrcode")
      .then((QR) => QR.toDataURL(inviteUrl, { width: 220, margin: 1, errorCorrectionLevel: "M" }))
      .then((url) => {
        if (!dead) setInviteQrDataUrl(url);
      });
    return () => {
      dead = true;
    };
  }, [inviteModalOpen, inviteUrl]);

  useEffect(() => {
    if (!inviteStatus) return;
    const timer = window.setTimeout(() => setInviteStatus(""), 1800);
    return () => window.clearTimeout(timer);
  }, [inviteStatus]);

  const handleCopyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteStatus("Copied");
    } catch {
      setInviteStatus("Could not copy");
    }
  }, [inviteUrl]);

  const handleShareInviteLink = useCallback(async () => {
    const text = "I just joined The Card to prove I’m him. Join and try to prove me wrong.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join The Card", text, url: inviteUrl });
        setInviteStatus("Shared");
        return;
      }
      await navigator.clipboard.writeText(`${text} ${inviteUrl}`);
      setInviteStatus("Copied");
    } catch {
      setInviteStatus("Share canceled");
    }
  }, [inviteUrl]);

  const handleInstallFromReceipt = useCallback(async () => {
    if (deferredInstallPromptEvent) {
      try {
        await deferredInstallPromptEvent.prompt();
        await deferredInstallPromptEvent.userChoice;
      } catch {
        /* ignore */
      } finally {
        setDeferredInstallPromptEvent(null);
      }
      return;
    }
    setShowInstallInstructions(true);
  }, [deferredInstallPromptEvent]);

  return (
    <>
      <div className="shell__viewport shell__viewport--home">
        <div className="home-receipt-root">
          <header className="app-header app-header--home-min">
            <div className="app-header__titles">
              <div className="app-header__brand-lockup">
                <img
                  className="app-header__wolf-mark"
                  src="/assets/wolf-head.png"
                  alt=""
                  decoding="async"
                />
                <h1 className="app-header__name app-header__name--home">The Card</h1>
              </div>
              <p className="app-header__tagline">{"Tee Party's Scorekeeper"}</p>
            </div>
            <button
              type="button"
              className="home-header-profile-btn"
              onClick={onPortraitSetup}
              aria-label="Profile and portrait"
            >
              <PlayerAvatar
                displayName={currentUserDisplayName}
                portraitBundle={receiptPortrait}
                isCurrentWolf={false}
                size="sm"
              />
            </button>
          </header>

          {activeTab === "home" && (
            <main className={`home-receipt-main${!isReturning ? " home-receipt-main--new" : ""}`}>
              <section className="home-league-invite" aria-label="League invite">
                <div className="home-league-invite__card">
                  <p className="home-league-invite__copy">
                    Invite your group.
                    <br />
                    Let them prove they belong.
                  </p>
                  <button
                    type="button"
                    className="btn home-league-invite__btn"
                    onClick={() => setInviteModalOpen(true)}
                  >
                    Show Invite QR
                  </button>
                </div>
              </section>
              <div className={`home-receipt-stage${!isReturning ? " home-receipt-stage--demo-preview" : ""}`}>
                <ReceiptCard
                  playerName={receipt.playerName}
                  amountLabel={receipt.amountLabel}
                  stamp={receipt.stamp}
                  badges={receipt.badges}
                  portraitBundle={portraitBundle}
                  portraitDisplayMode={portraitDisplay}
                  layout="hero"
                  initials={initials}
                  aiFlavorText={snap?.aiFlavorText ?? null}
                  themeId={receiptThemeId}
                />
              </div>
              <div className="home-receipt-cta">
                <button type="button" className="btn btn--primary btn--home-cta" onClick={isReturning ? onRunItBack : onNewRound}>
                  {isReturning ? "Run It Back" : "Start First Round"}
                </button>
                {isReturning ? (
                  <>
                    <button type="button" className="btn btn--outline btn--home-cta-secondary" onClick={onNewGroup}>
                      New Group
                    </button>
                    <button type="button" className="btn btn--outline btn--home-cta-secondary" onClick={onShareReceipt}>
                      Share Receipt
                    </button>
                  </>
                ) : null}
              </div>
            </main>
          )}

          {activeTab === "rounds" && (
            <main className="home-receipt-main home-tab-main" role="tabpanel" aria-label="Rounds">
              {completedRounds.length === 0 ? (
                <div className="card home-tab-empty">
                  <p className="card__lede">No rounds yet. Play your first round.</p>
                  <button type="button" className="btn btn--primary btn--compact" onClick={onNewRound}>
                    Play your first round
                  </button>
                </div>
              ) : (
                <ul className="home-rounds-list">
                  {completedRounds.map((round) => {
                    const { winnerName, topPts, spread, holeCount } = roundSummaryForList(round);
                    const when = new Date(round.savedAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    return (
                      <li key={round.id} className="card home-round-card">
                        <div className="home-round-card__meta">
                          <span className="home-round-card__date">{when}</span>
                          <span className="home-round-card__holes">{holeCount} holes</span>
                        </div>
                        <p className="home-round-card__winner">
                          Winner: <strong>{winnerName}</strong>
                        </p>
                        <p className="home-round-card__score">Final: +{topPts} Wolf pts · spread +{spread}</p>
                        <button
                          type="button"
                          className="btn btn--outline btn--compact"
                          onClick={() => onViewRoundRecap(round)}
                        >
                          View recap
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </main>
          )}

          {activeTab === "receipt" && (
            <main className="home-receipt-main home-tab-main" role="tabpanel" aria-label="Receipt">
              {!isReturning || !snap?.playerName ? (
                <div className="card home-tab-empty">
                  <p className="card__lede">No receipts yet. Finish a round to generate one.</p>
                  <button type="button" className="btn btn--primary btn--compact" onClick={onNewRound}>
                    Play your first round
                  </button>
                </div>
              ) : (
                <div className="home-receipt-stage">
                  <ReceiptCard
                    playerName={receipt.playerName}
                    amountLabel={receipt.amountLabel}
                    stamp={receipt.stamp}
                    badges={receipt.badges}
                    portraitBundle={portraitBundle}
                    portraitDisplayMode={portraitDisplay}
                    layout="hero"
                    initials={initials}
                    aiFlavorText={snap?.aiFlavorText ?? null}
                    themeId={receiptThemeId}
                  />
                </div>
              )}
              {showReceiptInstallPrompt && isReturning && snap?.playerName ? (
                <section className="receipt-install-prompt" aria-label="Install prompt">
                  <p className="receipt-install-prompt__copy">
                    Save The Card to your home screen so your group is always one tap away.
                  </p>
                  <button type="button" className="btn btn--outline btn--compact receipt-install-prompt__btn" onClick={handleInstallFromReceipt}>
                    Add to Home Screen
                  </button>
                  {showInstallInstructions ? (
                    <p className="receipt-install-prompt__hint">
                      Tap the share icon and select &quot;Add to Home Screen&quot;.
                    </p>
                  ) : null}
                </section>
              ) : null}
            </main>
          )}

          {activeTab === "leaderboard" && (
            <main className="home-receipt-main home-tab-main" role="tabpanel" aria-label="Leaderboard">
              <div className="home-lb-league">
                <div className="home-lb-scope" role="radiogroup" aria-label="Leaderboard scope">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={leagueLeaderboardScope === "city"}
                    className={`home-lb-scope__btn${leagueLeaderboardScope === "city" ? " home-lb-scope__btn--active" : ""}`}
                    onClick={() => setLeagueLeaderboardScope("city")}
                  >
                    City
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={leagueLeaderboardScope === "national"}
                    className={`home-lb-scope__btn${leagueLeaderboardScope === "national" ? " home-lb-scope__btn--active" : ""}`}
                    onClick={() => setLeagueLeaderboardScope("national")}
                  >
                    National
                  </button>
                </div>

                {leagueLeaderboardScope === "city" ? (
                  <>
                    <header className="home-lb-league__head">
                      <h2 className="home-lb-league__title">Austin Leaderboard</h2>
                      <p className="home-lb-league__subtitle">Top players in your city</p>
                    </header>
                    <p className="home-lb-league__demo-note">Demo standings until live league data is connected.</p>
                    <ul className="home-lb-league-list">
                      {DEMO_CITY_LEADERBOARD_ROWS.map((row, i) => (
                        <li key={`city-${row.name}-${i}`} className={`home-lb-league-row${i === 0 ? " home-lb-league-row--top" : ""}`}>
                          <span className="home-lb-league-row__rank">{i + 1}</span>
                          <div className="home-lb-league-row__main">
                            <span className="home-lb-league-row__name">{row.name}</span>
                            <span className="home-lb-league-row__city">{row.city}</span>
                            {row.badge ? <span className="home-lb-league-row__badge">{row.badge}</span> : null}
                          </div>
                          <span className="home-lb-league-row__pts">{row.points} pts</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <header className="home-lb-league__head">
                      <h2 className="home-lb-league__title">National Leaderboard</h2>
                      <p className="home-lb-league__subtitle">Top Tee Party players nationwide</p>
                    </header>
                    <p className="home-lb-league__demo-note">Demo standings until live league data is connected.</p>
                    <ul className="home-lb-league-list">
                      {DEMO_NATIONAL_LEADERBOARD_ROWS.map((row, i) => (
                        <li key={`nat-${row.name}-${i}`} className={`home-lb-league-row${i === 0 ? " home-lb-league-row--top" : ""}`}>
                          <span className="home-lb-league-row__rank">{i + 1}</span>
                          <div className="home-lb-league-row__main">
                            <span className="home-lb-league-row__name">{row.name}</span>
                            <span className="home-lb-league-row__city">{row.city}</span>
                            {row.badge ? <span className="home-lb-league-row__badge">{row.badge}</span> : null}
                          </div>
                          <span className="home-lb-league-row__pts">{row.points} pts</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <p className="home-lb-league__footnote">Live league standings connect after account + season tracking.</p>
              </div>
            </main>
          )}
        </div>

        {activeTab === "home" && inviteModalOpen ? (
          <div
            className="home-add-to-home-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-league-invite-modal-title"
          >
            <button
              type="button"
              className="home-add-to-home-modal__scrim"
              aria-label="Close invite QR"
              onClick={() => setInviteModalOpen(false)}
            />
            <div className="home-add-to-home-modal__panel home-league-invite-modal" role="document">
              <button
                type="button"
                className="home-add-to-home-modal__close"
                onClick={() => setInviteModalOpen(false)}
                aria-label="Close"
              >
                <span aria-hidden="true">×</span>
              </button>
              <h2 id="home-league-invite-modal-title" className="home-add-to-home-modal__title">
                Invite your group
              </h2>
              <p className="home-league-invite-modal__lede">Scan to join The Card league invite flow.</p>
              {inviteQrDataUrl ? (
                <img className="home-league-invite-modal__qr" src={inviteQrDataUrl} alt="League invite QR code" decoding="async" />
              ) : (
                <p className="home-league-invite-modal__lede">Generating QR...</p>
              )}
              <div className="home-league-invite-modal__actions">
                <button type="button" className="btn btn--outline btn--compact" onClick={handleCopyInviteLink}>
                  Copy invite link
                </button>
                <button type="button" className="btn btn--outline btn--compact" onClick={handleShareInviteLink}>
                  Share invite link
                </button>
              </div>
              {inviteStatus ? <p className="league-invite__status">{inviteStatus}</p> : null}
            </div>
          </div>
        ) : null}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );
}

function SettingsScreen({ themeId, onThemeChange, onBack, onTabChange }) {
  return (
    <div className="start-round settings-screen">
      <header className="start-round__header">
        <button type="button" className="start-round__back" onClick={onBack} aria-label="Back to home">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="start-round__heading">Settings</h1>
      </header>
      <div className="start-round__scroll">
        <section className="card settings-screen__section">
          <h2 className="card__title card__title--sm">Appearance</h2>
          <ReceiptThemePicker value={themeId} onChange={onThemeChange} />
        </section>
        <section className="card settings-screen__section settings-screen__section--placeholder">
          <h2 className="card__title card__title--sm">Profile</h2>
          <p className="card__lede">Coming soon.</p>
        </section>
        <section className="card settings-screen__section settings-screen__section--placeholder">
          <h2 className="card__title card__title--sm">Notifications</h2>
          <p className="card__lede">Coming soon.</p>
        </section>
        <section className="card settings-screen__section settings-screen__section--placeholder">
          <h2 className="card__title card__title--sm">Help / Support</h2>
          <p className="card__lede">Coming soon.</p>
        </section>
      </div>
      <BottomNav activeTab="settings" onTabChange={onTabChange} />
    </div>
  );
}

function StartRoundScreen({
  onBack,
  onPortraitSetup,
  players,
  setPlayers,
  onContinueToStakes,
  courseName,
  setCourseName,
  showNearbyCourses,
  setShowNearbyCourses,
  selectedTee,
  setSelectedTee,
  startVariant,
  portraitByPlayerId,
  resolveDisplayName,
  avatarStatus,
}) {
  const courseAckTimerRef = useRef(null);
  const [coursePickAck, setCoursePickAck] = useState(false);
  const [showPlayerEditor, setShowPlayerEditor] = useState(startVariant !== "runback");
  const [showCourseEditor, setShowCourseEditor] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    return () => {
      if (courseAckTimerRef.current) {
        clearTimeout(courseAckTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (startVariant !== "new-group") {
      setQrDataUrl("");
      return;
    }
    let dead = false;
    const joinUrl = `${window.location.origin}${window.location.pathname}`;
    void import("qrcode").then((QR) => {
      return QR.toDataURL(joinUrl, { width: 192, margin: 1, errorCorrectionLevel: "M" });
    }).then((url) => {
      if (!dead) setQrDataUrl(url);
    });
    return () => {
      dead = true;
    };
  }, [startVariant]);

  const setPlayerAt = (index, value) => {
    setPlayers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleUseLocation = () => {
    setShowNearbyCourses(true);
  };

  const handlePickNearbyCourse = (name) => {
    setCourseName(name);
    setShowNearbyCourses(false);
    if (courseAckTimerRef.current) {
      clearTimeout(courseAckTimerRef.current);
    }
    setCoursePickAck(true);
    courseAckTimerRef.current = setTimeout(() => {
      setCoursePickAck(false);
      courseAckTimerRef.current = null;
    }, 720);
  };

  return (
    <div className="start-round">
      <header className="start-round__header">
        <button type="button" className="start-round__back" onClick={onBack} aria-label="Back to home">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="start-round__heading">Start Round</h1>
        <button type="button" className="start-round__portrait-entry" onClick={onPortraitSetup}>
          Portrait
        </button>
      </header>
      <p className="start-round__avatar-status" role="status">
        {avatarStatus === "ready"
          ? "Receipt look ready."
          : "Preparing your receipt look... round can still start with fallback initials."}
      </p>
      {startVariant === "new-group" && (
        <section className="start-round__quick card">
          <h2 className="card__title card__title--sm">Add your group</h2>
          <p className="card__lede">Scan to join quickly. Name required, photo optional.</p>
          {qrDataUrl ? <img className="start-round__qr" src={qrDataUrl} alt="Join round QR code" decoding="async" /> : null}
        </section>
      )}

      <div className="start-round__scroll">
        {startVariant === "runback" ? (
          <section className="start-round__quick card">
            <h2 className="card__title card__title--sm">Run It Back</h2>
            <p className="card__lede">Previous group loaded. Settle it.</p>
            <div className="start-round__quick-actions">
              <button type="button" className="btn btn--outline btn--compact" onClick={() => setShowPlayerEditor((v) => !v)}>
                Edit Players
              </button>
            </div>
          </section>
        ) : null}
        {(showPlayerEditor || startVariant !== "runback") && (
        <section className="start-round__section">
          <h2 className="start-round__section-title">Players</h2>
          <div className="start-round__fields">
            {PLAYER_LABELS.map((label, i) => (
              <div key={label} className="start-round__player-row">
                <PlayerAvatar
                  displayName={resolveDisplayName(players, i)}
                  portraitBundle={portraitByPlayerId[SLOT_PLAYER_IDS[i]] ?? null}
                  isCurrentWolf={false}
                  size="sm"
                />
                <label className="field field--inline">
                  <span className="field__label">{label}</span>
                  <input
                    className="field__input"
                    type="text"
                    autoComplete="name"
                    value={players[i]}
                    onChange={(e) => setPlayerAt(i, e.target.value)}
                    placeholder="Name"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
        )}

        <section className="start-round__section">
          <button type="button" className="btn btn--outline btn--compact" onClick={() => setShowCourseEditor((v) => !v)}>
            {showCourseEditor ? "Hide Course" : "Add Course"}
          </button>
          {showCourseEditor ? (
            <>
              <h2 className="start-round__section-title">Course (optional)</h2>
              <label className={`field field--solo course-field-wrap${coursePickAck ? " course-field-wrap--ack" : ""}`}>
                <span className="visually-hidden">Course name</span>
                <input
                  className="field__input field__input--course"
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Casual Round"
                  autoComplete="off"
                />
                <span className="course-field-wrap__check" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              </label>
              <button type="button" className="btn btn--outline btn--compact" onClick={handleUseLocation}>
                Use Current Location
              </button>
              {showNearbyCourses && (
                <div className="nearby-card">
                  <h3 className="nearby-card__title">Nearby Courses</h3>
                  <ul className="nearby-card__list">
                    {NEARBY_COURSES.map((name) => (
                      <li key={name}>
                        <button type="button" className="nearby-course" onClick={() => handlePickNearbyCourse(name)}>
                          {name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </section>

        <section className="start-round__section">
          <h2 className="start-round__section-title">Tee</h2>
          <div className="tee-bar" role="radiogroup" aria-label="Tee">
            {TEE_OPTIONS.map((tee) => {
              const active = selectedTee === tee;
              return (
                <button
                  key={tee}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`tee-chip${active ? " tee-chip--active" : ""}`}
                  onClick={() => setSelectedTee(tee)}
                >
                  {tee}
                </button>
              );
            })}
          </div>
        </section>

        <section className="card start-round__format">
          <h2 className="card__title card__title--sm">Game Format</h2>
          <p className="start-round__format-name">Wolf (Season One)</p>
          <p className="start-round__format-hint">
            4 players. Normal Wolf, Lone Wolf, or declare Blind Wolf before tee shots.
          </p>
        </section>
      </div>

      <div className="start-round__footer">
        <p className="start-round__quick-copy">{avatarStatus === "ready" ? "Settle it." : "Receipts loading..."}</p>
        <button type="button" className="btn btn--primary" onClick={onContinueToStakes}>
          Continue to Stakes Setup
        </button>
      </div>
    </div>
  );
}

function StakesSetupScreen({ onBack, stakesConfig, setStakesConfig, onStartRound }) {
  const baseStake = stakesConfig.preset === "custom"
    ? Number.parseFloat(stakesConfig.customValue || "") || 2
    : stakesConfig.preset;
  const toggle = (key) => setStakesConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  return (
    <div className="start-round">
      <header className="start-round__header">
        <button type="button" className="start-round__back" onClick={onBack} aria-label="Back to start round">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="start-round__heading">Stakes Setup</h1>
      </header>
      <div className="start-round__scroll">
        <section className="start-round__section card">
          <h2 className="card__title card__title--sm">Base stake per hole</h2>
          <div className="stakes-setup__presets" role="radiogroup" aria-label="Base stake per hole">
            {[1, 2, 5].map((v) => {
              const active = stakesConfig.preset === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`tee-chip${active ? " tee-chip--active" : ""}`}
                  onClick={() => setStakesConfig((prev) => ({ ...prev, preset: v }))}
                >
                  ${v}
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={stakesConfig.preset === "custom"}
              className={`tee-chip${stakesConfig.preset === "custom" ? " tee-chip--active" : ""}`}
              onClick={() => setStakesConfig((prev) => ({ ...prev, preset: "custom" }))}
            >
              Custom
            </button>
          </div>
          {stakesConfig.preset === "custom" ? (
            <label className="field field--solo stakes-setup__custom">
              <span className="field__label">Custom base</span>
              <input
                className="field__input"
                type="number"
                min="0.25"
                step="0.25"
                value={stakesConfig.customValue}
                onChange={(e) => setStakesConfig((prev) => ({ ...prev, customValue: e.target.value }))}
                placeholder="2"
              />
            </label>
          ) : null}
          <p className="card__lede">Current base: ${Number.isInteger(baseStake) ? baseStake : baseStake.toFixed(2)}</p>
        </section>

        <section className="start-round__section card">
          <h2 className="card__title card__title--sm">Payout rules</h2>
          <button type="button" className="stakes-setup__toggle" onClick={() => toggle("loneWolf2x")} aria-pressed={stakesConfig.loneWolf2x}>
            <span>Lone Wolf = 2x multiplier</span>
            <strong>{stakesConfig.loneWolf2x ? "ON" : "OFF"}</strong>
          </button>
          <button type="button" className="stakes-setup__toggle" onClick={() => toggle("blindWolf3x")} aria-pressed={stakesConfig.blindWolf3x}>
            <span>Blind Wolf = 3x multiplier</span>
            <strong>{stakesConfig.blindWolf3x ? "ON" : "OFF"}</strong>
          </button>
          <button type="button" className="stakes-setup__toggle" onClick={() => toggle("hideDollarAmounts")} aria-pressed={stakesConfig.hideDollarAmounts}>
            <span>Hide dollar amounts on receipt</span>
            <strong>{stakesConfig.hideDollarAmounts ? "ON" : "OFF"}</strong>
          </button>
        </section>
      </div>
      <div className="start-round__footer">
        <button type="button" className="btn btn--primary" onClick={onStartRound}>
          Start Round
        </button>
      </div>
    </div>
  );
}

function TheCardApp() {
  const [splashPhase, setSplashPhase] = useState("s1");
  const [screen, setScreen] = useState("home");
  const [players, setPlayers] = useState(initialPlayers);
  const [courseName, setCourseName] = useState("");
  const [showNearbyCourses, setShowNearbyCourses] = useState(false);
  const [selectedTee, setSelectedTee] = useState("White");
  const [startVariant, setStartVariant] = useState("standard");
  const [stakesConfig, setStakesConfig] = useState(() => loadStakesConfig());
  const [currentHole, setCurrentHole] = useState(1);
  const [receiptPortrait, setReceiptPortrait] = useState(null);
  /** Which cached portrait variant the receipt hero uses (from last round or persisted snapshot). */
  const [receiptPortraitDisplayMode, setReceiptPortraitDisplayMode] = useState(
    () => loadLastReceiptSnapshot()?.portraitHeroMode ?? null,
  );
  /** Last completed round receipt copy for the home hero (localStorage). */
  const [lastReceiptSnapshot, setLastReceiptSnapshot] = useState(() => loadLastReceiptSnapshot());
  /** @type {import('./game/types.js').GamePlayer[]} */
  const [gamePlayers, setGamePlayers] = useState([]);
  /** @type {import('./game/types.js').HoleRecord[]} */
  const [holeRecords, setHoleRecords] = useState([]);
  /** @type {string[] | null} fixed rotation [firstWolf, ...shuffled rest]; null until first Wolf is chosen */
  const [wolfOrder, setWolfOrder] = useState(/** @type {string[] | null} */ (null));
  /** Holes 17–18 only: when ≥2 players tie for lowest Wolf points, random pick is stored once per hole */
  const [selectedWolfOverride, setSelectedWolfOverride] = useState(
    /** @type {{ hole: number, playerId: string } | null} */ (null),
  );
  const [roundRecap, setRoundRecap] = useState(null);
  /** @type {'idle' | 'playing' | 'complete'} */
  const [roundStatus, setRoundStatus] = useState("idle");
  /** @type {'home' | 'rounds' | 'receipt' | 'leaderboard'} */
  const [activeTab, setActiveTab] = useState("home");
  const [completedRounds, setCompletedRounds] = useState(() => loadCompletedRounds());
  const [roundShareId, setRoundShareId] = useState(/** @type {string | null} */ (null));
  const [roundShareModalOpen, setRoundShareModalOpen] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState("pending");
  const [receiptThemeId, setReceiptThemeId] = useState(() => loadThemePreference());
  const pathname = usePathname();
  const lowWolfPickCommittedHoleRef = useRef(/** @type {number} */ (-1));
  const holeRecordsForLowWolfRef = useRef(/** @type {import('./game/types.js').HoleRecord[]} */ ([]));
  const allPlayerIdsForLowWolfRef = useRef(/** @type {string[]} */ ([]));

  const portraitByPlayerId = useMemo(
    () => ({
      "p-0": receiptPortrait,
      "p-1": null,
      "p-2": null,
      "p-3": null,
    }),
    [receiptPortrait],
  );

  const allPlayerIds = useMemo(() => gamePlayers.map((p) => p.id), [gamePlayers]);

  holeRecordsForLowWolfRef.current = holeRecords;
  allPlayerIdsForLowWolfRef.current = allPlayerIds;

  const resolvedLowWolfPlayerId = useMemo(() => {
    if (currentHole !== 17 && currentHole !== 18) return null;
    if (gamePlayers.length !== 4) return null;
    const tied = getTiedLowestWolfPointPlayerIds(holeRecords, allPlayerIds);
    if (tied.length === 1) return tied[0];
    if (selectedWolfOverride?.hole === currentHole) return selectedWolfOverride.playerId;
    return null;
  }, [currentHole, holeRecords, allPlayerIds, gamePlayers.length, selectedWolfOverride]);

  // One random tie-break per hole 17/18; latest `holeRecords` / `allPlayerIds` read from refs (not effect deps).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (currentHole !== 17 && currentHole !== 18) {
      setSelectedWolfOverride(null);
      lowWolfPickCommittedHoleRef.current = -1;
      return;
    }
    if (gamePlayers.length !== 4) return;

    if (lowWolfPickCommittedHoleRef.current === currentHole) {
      return;
    }

    const tied = getTiedLowestWolfPointPlayerIds(
      holeRecordsForLowWolfRef.current,
      allPlayerIdsForLowWolfRef.current,
    );
    if (tied.length === 0) {
      lowWolfPickCommittedHoleRef.current = currentHole;
      setSelectedWolfOverride(null);
      return;
    }
    if (tied.length === 1) {
      lowWolfPickCommittedHoleRef.current = currentHole;
      setSelectedWolfOverride(null);
      return;
    }
    const pick = tied[Math.floor(Math.random() * tied.length)];
    lowWolfPickCommittedHoleRef.current = currentHole;
    setSelectedWolfOverride({ hole: currentHole, playerId: pick });
  }, [currentHole, gamePlayers.length]);

  const assignedWolfPlayerId = useMemo(() => {
    if (gamePlayers.length !== 4) return null;
    return getAssignedWolfPlayerId({
      holeNumber: currentHole,
      wolfOrder,
      holeRecords,
      allPlayerIds,
      resolvedLowWolfPlayerId:
        currentHole === 17 || currentHole === 18 ? resolvedLowWolfPlayerId : null,
    });
  }, [currentHole, wolfOrder, holeRecords, allPlayerIds, gamePlayers.length, resolvedLowWolfPlayerId]);

  const wolfRuleLabel = useMemo(() => {
    if (currentHole !== 17 && currentHole !== 18) return null;
    return "Loser Wolf Rule";
  }, [currentHole]);

  const handleFirstWolfChosen = useCallback(
    (playerId) => {
      const ids = gamePlayers.map((p) => p.id);
      setWolfOrder(buildWolfOrderAfterFirstPick(playerId, ids));
    },
    [gamePlayers],
  );

  const roundElo = useMemo(() => {
    if (gamePlayers.length !== 4) return null;
    return computeRoundEloUpdate(gamePlayers, holeRecords, {});
  }, [gamePlayers, holeRecords]);

  const roundResult = useMemo(() => {
    if (gamePlayers.length !== 4) return null;
    return buildRoundResult(gamePlayers, holeRecords);
  }, [gamePlayers, holeRecords]);

  const getRoundShareSnapshot = useCallback(() => {
    if (!roundShareId || gamePlayers.length !== 4) return null;
    return buildRoundShareSnapshot({
      id: roundShareId,
      courseName,
      selectedTee,
      gamePlayers,
      holeRecords,
      currentHole,
      roundStatus,
      wolfOrder,
      selectedWolfOverride,
    });
  }, [
    roundShareId,
    courseName,
    selectedTee,
    gamePlayers,
    holeRecords,
    currentHole,
    roundStatus,
    wolfOrder,
    selectedWolfOverride,
  ]);

  useEffect(() => {
    persistRoundHistoryToSession(holeRecords, gamePlayers);
  }, [holeRecords, gamePlayers]);

  /** Pushes the final completed snapshot so short links (no hash) work for spectators after hole 18. */
  useEffect(() => {
    if (screen !== "recap" || !roundShareId || gamePlayers.length !== 4) return;
    if (roundStatus !== "complete" || holeRecords.length < 1) return;
    const snap = getRoundShareSnapshot();
    if (!snap) return;
    void putPublicRoundSnapshot(snap.id, snap);
  }, [screen, roundShareId, gamePlayers, roundStatus, holeRecords, getRoundShareSnapshot]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rec = await loadPersistedPortraitProfile();
      if (!rec || cancelled) return;
      try {
        const b = await hydrateBundleFromPersistedRecord(rec);
        if (cancelled) {
          revokePortraitBundle(b);
          return;
        }
        setReceiptPortrait((prev) => {
          if (prev) revokePortraitBundle(prev);
          return b;
        });
      } catch {
        /* ignore corrupt store */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refreshStatus = () => {
      const profile = loadPlayerAvatarProfileState("p-0");
      setAvatarStatus(profile?.avatarStatus ?? "pending");
    };
    refreshStatus();
    window.addEventListener("focus", refreshStatus);
    return () => window.removeEventListener("focus", refreshStatus);
  }, []);

  useEffect(() => {
    const startCrossfade = window.setTimeout(() => setSplashPhase("xfade"), SPLASH_1_XFADE_AT);
    const endSplash1 = window.setTimeout(() => setSplashPhase("s2"), SPLASH_1_TOTAL_MS);
    const toApp = window.setTimeout(
      () => setSplashPhase("home"),
      SPLASH_1_TOTAL_MS + SPLASH_2_MS,
    );
    return () => {
      window.clearTimeout(startCrossfade);
      window.clearTimeout(endSplash1);
      window.clearTimeout(toApp);
    };
  }, []);

  const handlePreseasonPortraitSaved = useCallback((bundle) => {
    setReceiptPortrait(bundle);
    setReceiptPortraitDisplayMode(bundle.preferredMode ?? "neutral");
    setAvatarStatus("ready");
  }, []);

  const handlePreseasonCommit = useCallback((data) => {
    setPlayers((prev) => {
      const n = [...prev];
      n[0] = data.playerName;
      return n;
    });
    setReceiptPortrait(data.bundle);
    setReceiptPortraitDisplayMode(data.bundle.preferredMode ?? "neutral");
  }, []);

  const goHome = () => {
    setScreen("home");
    setActiveTab("home");
  };

  const goStartRound = () => {
    setCourseName("Casual Round");
    setShowNearbyCourses(false);
    setSelectedTee("White");
    setStartVariant("standard");
    setScreen("startRound");
  };

  const goStakesSetup = useCallback(() => {
    setScreen("stakesSetup");
  }, []);

  const goRunItBack = useCallback(() => {
    const last = loadCompletedRounds()[0];
    if (last?.players?.length) {
      const seeded = ["", "", "", ""];
      for (const p of last.players) {
        if (typeof p.slotIndex === "number" && p.slotIndex >= 0 && p.slotIndex < 4) {
          seeded[p.slotIndex] = p.name ?? "";
        }
      }
      setPlayers(seeded);
    }
    setCourseName("Casual Round");
    setShowNearbyCourses(false);
    setSelectedTee("White");
    setStakesConfig(loadStakesConfig());
    setStartVariant("runback");
    setScreen("startRound");
  }, []);

  const goNewGroup = useCallback(() => {
    setPlayers(initialPlayers());
    setCourseName("Casual Round");
    setShowNearbyCourses(false);
    setSelectedTee("White");
    setStakesConfig(loadStakesConfig());
    setStartVariant("new-group");
    setScreen("startRound");
  }, []);

  const clearFirstReceiptPath = useCallback(() => {
    if (isFirstReceiptPath(pathname)) {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new Event(APP_PATHNAME_CHANGED));
    }
  }, [pathname]);

  const leavePreseasonToHome = useCallback(() => {
    clearFirstReceiptPath();
    setActiveTab("home");
    setScreen("home");
  }, [clearFirstReceiptPath]);

  const goStartRoundFromPreseason = useCallback(() => {
    clearFirstReceiptPath();
    setCourseName("Casual Round");
    setShowNearbyCourses(false);
    setSelectedTee("White");
    setScreen("startRound");
  }, [clearFirstReceiptPath]);

  // Sync in-app `screen` when deep-linked to /first-receipt or /receipt-kit (static hosting has no real router).
  useEffect(() => {
    if (splashPhase !== "home") return;
    if (isFirstReceiptPath(pathname)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL is external source; maps path → first-receipt step
      setScreen("createFirstReceipt");
      return;
    }
    if (isSettingsPath(pathname)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL is external source; maps path → settings step
      setScreen("settings");
    }
  }, [splashPhase, pathname]);

  const handleThemeChange = useCallback((nextThemeId) => {
    const normalized = normalizeReceiptThemeId(nextThemeId);
    setReceiptThemeId(normalized);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
      localStorage.setItem(LEGACY_RECEIPT_THEME_STORAGE_KEY, normalized);
    } catch {
      /* ignore */
    }
  }, []);

  const goPortraitSetup = () => {
    setScreen("portraitSetup");
  };

  const handlePrimaryTabChange = useCallback((tabId) => {
    if (tabId === "settings") {
      setScreen("settings");
      window.history.pushState(null, "", "/settings");
      window.dispatchEvent(new Event(APP_PATHNAME_CHANGED));
      return;
    }
    setScreen("home");
    setActiveTab(tabId);
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new Event(APP_PATHNAME_CHANGED));
  }, []);

  const handlePortraitSave = (bundle) => {
    setReceiptPortraitDisplayMode(null);
    setReceiptPortrait((prev) => {
      if (prev) revokePortraitBundle(prev);
      return bundle;
    });
    setAvatarStatus("ready");
  };

  const handleStartGame = () => {
    setReceiptPortraitDisplayMode(null);
    const seededPlayers = buildGamePlayersFromSlots(players);
    setGamePlayers(seededPlayers);
    setHoleRecords([]);
    const ids = seededPlayers.map((p) => p.id);
    const firstWolf = ids[Math.floor(Math.random() * ids.length)] ?? "p-0";
    setWolfOrder(buildWolfOrderAfterFirstPick(firstWolf, ids));
    setSelectedWolfOverride(null);
    lowWolfPickCommittedHoleRef.current = -1;
    setCurrentHole(1);
    setRoundStatus("playing");
    setRoundShareId(newRoundShareId());
    saveStakesConfig(stakesConfig);
    setScreen("wolfRound");
  };

  const handleHoleComplete = useCallback(
    (record) => {
      const merged = [...holeRecords, record];
      setHoleRecords(merged);
      if (record.holeNumber < MAX_PLAYABLE_HOLE) {
        setCurrentHole((h) => h + 1);
        return;
      }
      setRoundStatus("complete");
      setRoundRecap(buildRecapShareCards(merged, gamePlayers, portraitByPlayerId, stakesConfig));
      setScreen("recap");
    },
    [holeRecords, gamePlayers, portraitByPlayerId, stakesConfig],
  );

  const openRecapFromHistory = useCallback(
    (round) => {
      setRoundRecap(buildRecapShareCards(round.holeRecords, round.players, portraitByPlayerId, stakesConfig));
      setScreen("recap");
    },
    [portraitByPlayerId, stakesConfig],
  );

  const handleRecapComplete = () => {
    if (gamePlayers.length === 4 && holeRecords.length > 0) {
      appendCompletedRound(gamePlayers, holeRecords);
      setCompletedRounds(loadCompletedRounds());
      const snap = buildLastReceiptSnapshot(gamePlayers, holeRecords, stakesConfig);
      setReceiptPortraitDisplayMode(snap.portraitHeroMode);
      saveLastReceiptSnapshot(snap);
      markReturningUserReceipt();
      setLastReceiptSnapshot(snap);
      void fetchReceiptFlavorIfEnabled(snap).then((text) => {
        if (!text) return;
        const merged = { ...snap, aiFlavorText: text };
        saveLastReceiptSnapshot(merged);
        setLastReceiptSnapshot(merged);
      });
    } else {
      setReceiptPortraitDisplayMode(null);
    }
    setRoundRecap(null);
    setHoleRecords([]);
    setWolfOrder(null);
    setSelectedWolfOverride(null);
    lowWolfPickCommittedHoleRef.current = -1;
    setCurrentHole(1);
    setGamePlayers([]);
    setRoundStatus("idle");
    setRoundShareId(null);
    setActiveTab("home");
    setScreen("home");
  };

  /**
   * @param {import('./game/types.js').HoleRecord | undefined} mergeLastHole — hole locked but confirmation toast not finished
   */
  const handleEndRound = (mergeLastHole) => {
    if (gamePlayers.length !== 4) {
      setReceiptPortraitDisplayMode(null);
      setHoleRecords([]);
      setWolfOrder(null);
      setSelectedWolfOverride(null);
      lowWolfPickCommittedHoleRef.current = -1;
      setCurrentHole(1);
      setGamePlayers([]);
      setRoundStatus("idle");
      setRoundShareId(null);
      setActiveTab("home");
      setScreen("home");
      return;
    }
    const merged = mergeLastHole ? [...holeRecords, mergeLastHole] : holeRecords;
    if (mergeLastHole) {
      setHoleRecords(merged);
    }
    if (merged.length > 0) {
      setRoundStatus("complete");
      setRoundRecap(buildRecapShareCards(merged, gamePlayers, portraitByPlayerId, stakesConfig));
      setScreen("recap");
    } else {
      setReceiptPortraitDisplayMode(null);
      setHoleRecords([]);
      setWolfOrder(null);
      setSelectedWolfOverride(null);
      lowWolfPickCommittedHoleRef.current = -1;
      setCurrentHole(1);
      setGamePlayers([]);
      setRoundStatus("idle");
      setRoundShareId(null);
      setActiveTab("home");
      setScreen("home");
    }
  };

  return (
    <>
      {splashPhase !== "home" && <OpeningSequence phase={splashPhase} />}
      {splashPhase === "home" && (
        <div className="shell shell--app-enter" data-round-status={roundStatus}>
          {screen === "createFirstReceipt" && (
            <CreateFirstReceiptScreen
              onBack={leavePreseasonToHome}
              onPortraitSaved={handlePreseasonPortraitSaved}
              onCommitPreseason={handlePreseasonCommit}
              onStartFirstRound={goStartRoundFromPreseason}
            />
          )}
          {screen === "home" && (
            <HomeScreen
              activeTab={activeTab}
              onTabChange={setActiveTab}
              completedRounds={completedRounds}
              onViewRoundRecap={openRecapFromHistory}
              onNewRound={goStartRound}
              onRunItBack={goRunItBack}
              onNewGroup={goNewGroup}
              onShareReceipt={() => setActiveTab("receipt")}
              onPortraitSetup={goPortraitSetup}
              receiptPortrait={receiptPortrait}
              receiptPortraitDisplayMode={receiptPortraitDisplayMode}
              currentUserDisplayName={displayPlayerName(players, 0)}
              lastReceiptSnapshot={lastReceiptSnapshot}
              receiptThemeId={receiptThemeId}
              onTabChange={handlePrimaryTabChange}
            />
          )}
          {screen === "settings" && (
            <SettingsScreen
              themeId={receiptThemeId}
              onThemeChange={handleThemeChange}
              onTabChange={handlePrimaryTabChange}
              onBack={() => {
                window.history.pushState(null, "", "/");
                window.dispatchEvent(new Event(APP_PATHNAME_CHANGED));
                setActiveTab("home");
                setScreen("home");
              }}
            />
          )}
          {screen === "portraitSetup" && (
            <PortraitSetupFlow
              onBack={goHome}
              onSave={handlePortraitSave}
              initialBundle={receiptPortrait}
              heroDisplayName={displayPlayerName(players, 0)}
              playerId="p-0"
            />
          )}
          {screen === "startRound" && (
            <StartRoundScreen
              onBack={goHome}
              onPortraitSetup={goPortraitSetup}
              players={players}
              setPlayers={setPlayers}
              onContinueToStakes={goStakesSetup}
              courseName={courseName}
              setCourseName={setCourseName}
              showNearbyCourses={showNearbyCourses}
              setShowNearbyCourses={setShowNearbyCourses}
              selectedTee={selectedTee}
              setSelectedTee={setSelectedTee}
              startVariant={startVariant}
              portraitByPlayerId={portraitByPlayerId}
              resolveDisplayName={displayPlayerName}
              avatarStatus={avatarStatus}
            />
          )}
          {screen === "stakesSetup" && (
            <StakesSetupScreen
              onBack={() => setScreen("startRound")}
              stakesConfig={stakesConfig}
              setStakesConfig={setStakesConfig}
              onStartRound={handleStartGame}
            />
          )}
          {screen === "recap" && roundRecap && (
            <RoundRecapScreen recap={roundRecap} onDone={handleRecapComplete} themeId={receiptThemeId} />
          )}
          {screen === "wolfRound" && gamePlayers.length === 4 && (
            <WolfRoundScreen
              gamePlayers={gamePlayers}
              currentHole={currentHole}
              wolfOrder={wolfOrder}
              assignedWolfPlayerId={assignedWolfPlayerId}
              onFirstWolfChosen={handleFirstWolfChosen}
              wolfRuleLabel={wolfRuleLabel}
              portraitByPlayerId={portraitByPlayerId}
              holeRecords={holeRecords}
              onHoleComplete={handleHoleComplete}
              onEndRound={handleEndRound}
              roundElo={roundElo}
              roundResult={roundResult}
              onShareRound={() => setRoundShareModalOpen(true)}
            />
          )}
        </div>
      )}
      <RoundShareModal
        open={roundShareModalOpen}
        onClose={() => setRoundShareModalOpen(false)}
        getSnapshot={getRoundShareSnapshot}
      />
    </>
  );
}

export default function App() {
  const pathname = usePathname();
  const shareRoute = useMemo(() => matchRoundSharePath(pathname), [pathname]);
  if (shareRoute) {
    return <RoundShareViewerScreen pathShareId={shareRoute.shareId} />;
  }
  if (isLeagueInvitePath(pathname)) {
    return <LeagueInviteScreen />;
  }
  return <TheCardApp />;
}
