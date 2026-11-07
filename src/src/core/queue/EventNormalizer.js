/**
 * EventNormalizer.js
 * Grounded in: PROJECT.md §1 & Security Audits A/B (Features F04, F42)
 *
 * Normalizes and sanitizes external stream event fields:
 * - Sanitizes donation amount boundaries (negative, zero, floating point, non-numeric)
 * - Sanitizes and truncates message payloads against layout/memory explosion
 * - Maps platform-specific fields into contract-compliant StreamEvent interface
 */

export const STREAM_EVENT_TYPES = ['follow', 'subscribe', 'donation', 'raid', 'cheer', 'chat'];
export const STREAM_PLATFORMS = ['twitch', 'youtube', 'kick', 'test'];
export const STREAM_TIERS = ['free', 'plus', 'pro', 'ultra'];
export const PRIORITY_LEVELS = [0, 1, 2, 3, 4]; // 0=Critical, 1=Raid, 2=Donation, 3=Sub, 4=Follow

/**
 * Sanitizes donation amount into a safe non-negative floating-point number rounded to 2 decimals.
 * Invalid, negative, NaN, Infinity, or non-numeric values clamp to 0.
 *
 * @param {any} amount
 * @returns {number}
 */
export function sanitizeAmount(amount) {
  if (amount === null || amount === undefined) return 0;
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    return 0;
  }
  return Math.round(num * 100) / 100;
}

/**
 * Sanitizes and truncates message text to prevent memory/DOM overflow attacks.
 *
 * @param {string} msg
 * @param {number} [maxLength=250]
 * @returns {string}
 */
export function sanitizeMessage(msg, maxLength = 250) {
  if (typeof msg !== 'string') return '';
  const trimmed = msg.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength) + '...';
}

/**
 * Normalizes an incoming raw platform event into a contract-compliant StreamEvent.
 *
 * @param {object} raw
 * @returns {object} Normalized StreamEvent
 */
export function normalizeStreamEvent(raw = {}) {
  const now = Date.now();
  const id = String(raw.id || `evt_${Math.random().toString(36).slice(2)}_${now}`);
  const type = STREAM_EVENT_TYPES.includes(raw.type) ? raw.type : 'donation';
  const platform = STREAM_PLATFORMS.includes(raw.platform) ? raw.platform : 'twitch';

  // Default priority based on event type if not explicitly set:
  // 0=Critical, 1=Raid, 2=Donation, 3=Subscription, 4=Follow
  let defaultPriority = 2;
  if (type === 'raid') defaultPriority = 1;
  else if (type === 'subscribe') defaultPriority = 3;
  else if (type === 'follow') defaultPriority = 4;

  const priority = (raw.priority !== undefined && PRIORITY_LEVELS.includes(raw.priority))
    ? raw.priority
    : defaultPriority;

  const tier = STREAM_TIERS.includes(raw.tier) ? raw.tier : 'free';

  const sender = {
    name: typeof raw.sender?.name === 'string' ? raw.sender.name.trim() : (typeof raw.sender === 'string' ? raw.sender.trim() : 'Anonymous'),
    avatarUrl: typeof raw.sender?.avatarUrl === 'string' ? raw.sender.avatarUrl : undefined,
    badges: Array.isArray(raw.sender?.badges) ? raw.sender.badges : [],
    frameId: typeof raw.sender?.frameId === 'string' ? raw.sender.frameId : undefined,
  };

  const amountRaw = raw.amount !== undefined ? raw.amount : raw.payload?.amount;
  const currencyRaw = raw.currency !== undefined ? raw.currency : raw.payload?.currency;
  const messageRaw = raw.message !== undefined ? raw.message : raw.payload?.message;

  const payload = {
    amount: amountRaw !== undefined ? sanitizeAmount(amountRaw) : undefined,
    currency: typeof currencyRaw === 'string' ? currencyRaw : 'USD',
    tierName: typeof raw.payload?.tierName === 'string' ? raw.payload.tierName : undefined,
    message: typeof messageRaw === 'string' ? sanitizeMessage(messageRaw) : undefined,
    viewers: typeof raw.payload?.viewers === 'number' ? Math.max(0, raw.payload.viewers) : (typeof raw.viewers === 'number' ? Math.max(0, raw.viewers) : 0),
    months: typeof raw.payload?.months === 'number' ? Math.max(1, raw.payload.months) : (typeof raw.months === 'number' ? Math.max(1, raw.months) : 1),
    ...raw.payload,
  };

  if (payload.amount !== undefined) payload.amount = sanitizeAmount(payload.amount);
  if (payload.message !== undefined) payload.message = sanitizeMessage(payload.message);

  const timestamp = typeof raw.timestamp === 'number' && !isNaN(raw.timestamp) ? raw.timestamp : now;
  const expiresAt = typeof raw.expiresAt === 'number' && !isNaN(raw.expiresAt)
    ? raw.expiresAt
    : (typeof raw.ttlMs === 'number' ? timestamp + raw.ttlMs : now + 60000);

  const metadata = typeof raw.metadata === 'object' && raw.metadata !== null ? raw.metadata : {};

  return {
    id,
    type,
    platform,
    priority,
    tier,
    sender,
    payload,
    metadata,
    timestamp,
    expiresAt,
  };
}

export default {
  STREAM_EVENT_TYPES,
  STREAM_PLATFORMS,
  STREAM_TIERS,
  PRIORITY_LEVELS,
  sanitizeAmount,
  sanitizeMessage,
  normalizeStreamEvent,
};
