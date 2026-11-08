/**
 * MN Alerts — Alert Packs & Tiered Catalog Facade
 * Provides unified access, tier filtering, and helper query methods.
 */

import {
  ALERT_PACKS,
  ALERTS_CATALOG,
  AVATAR_FRAMES,
  AVATAR_FRAMES_MAP,
  ACCESS_TIERS,
  CATEGORIES,
  CHOREOGRAPHY_MODES,
  TEXTURE_ENGINES,
} from './alertsCatalog.js';

export {
  ALERT_PACKS,
  ALERTS_CATALOG,
  AVATAR_FRAMES,
  AVATAR_FRAMES_MAP,
  ACCESS_TIERS,
  CATEGORIES,
  CHOREOGRAPHY_MODES,
  TEXTURE_ENGINES,
};

/**
 * Returns all alert packs matching a given subscription tier name ('free' | 'plus' | 'pro' | 'ultra').
 */
export function getAlertPacksByTier(tier) {
  const normalizedTier = String(tier || '').toLowerCase().trim();
  return ALERTS_CATALOG.filter(
    (pack) => pack.tier === normalizedTier || pack.accessType === normalizedTier
  );
}

/**
 * Returns all alert packs matching a numeric tierLevel:
 * 1 = Ultra / Loyalty / Store
 * 2 = Pro
 * 3 = Plus
 * 4 = Free
 */
export function getAlertPacksByTierLevel(tierLevel) {
  const level = Number(tierLevel);
  return ALERTS_CATALOG.filter((pack) => pack.tierLevel === level);
}

/**
 * Looks up an alert pack by its unique ID.
 */
export function getAlertPackById(id) {
  return ALERTS_CATALOG.find((pack) => pack.id === id) || null;
}

/**
 * Looks up an avatar frame by ID, supporting both 'frame-royal-crown' and 'royal-crown'.
 */
export function getAvatarFrameById(frameId) {
  if (!frameId) return AVATAR_FRAMES_MAP['royal-crown'] || null;
  return (
    AVATAR_FRAMES_MAP[frameId] ||
    AVATAR_FRAMES_MAP[String(frameId).replace(/^frame-/, '')] ||
    null
  );
}
