const PROFILE_STATE_KEY = "the-card-avatar-profile-state-v1";

/**
 * @typedef {'pending' | 'ready' | 'failed'} AvatarStatus
 */

/**
 * @typedef {{
 *   profileImageUrl: string
 *   avatarHappyUrl: string
 *   avatarNeutralUrl: string
 *   avatarSadUrl: string
 *   avatarStatus: AvatarStatus
 *   updatedAt: number
 * }} PlayerAvatarProfileState
 */

function readAll() {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROFILE_STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeAll(state) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PROFILE_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore private mode / quota */
  }
}

function buildAvatarPaths(playerId) {
  return {
    profileImageUrl: `players/${playerId}/profile_clean.webp`,
    avatarHappyUrl: `players/${playerId}/avatar_happy.png`,
    avatarNeutralUrl: `players/${playerId}/avatar_neutral.png`,
    avatarSadUrl: `players/${playerId}/avatar_sad.png`,
  };
}

/**
 * @param {string} playerId
 * @returns {PlayerAvatarProfileState | null}
 */
export function loadPlayerAvatarProfileState(playerId) {
  const all = readAll();
  return all[playerId] ?? null;
}

/**
 * @param {string} playerId
 * @param {AvatarStatus} avatarStatus
 * @returns {PlayerAvatarProfileState}
 */
export function upsertPlayerAvatarProfileState(playerId, avatarStatus) {
  const all = readAll();
  const prev = all[playerId] ?? {};
  const next = {
    ...prev,
    ...buildAvatarPaths(playerId),
    avatarStatus,
    updatedAt: Date.now(),
  };
  all[playerId] = next;
  writeAll(all);
  return next;
}

