/**
 * twitchAdapter.js - Twitch EventSub Webhook Adapter
 * Grounded in: PROJECT.md § 1 & Twitch EventSub Specifications
 */

import { computeHmacSha256, timingSafeEqual, validateTimestampDelta } from './cryptoUtils.js';
import { normalizeStreamEvent } from '../../core/queue/EventNormalizer.js';

export const TWITCH_HEADERS = {
  MESSAGE_ID: 'twitch-eventsub-message-id',
  TIMESTAMP: 'twitch-eventsub-message-timestamp',
  SIGNATURE: 'twitch-eventsub-message-signature',
  MESSAGE_TYPE: 'twitch-eventsub-message-type',
  SUB_TYPE: 'twitch-eventsub-subscription-type',
};

export const TWITCH_MESSAGE_TYPES = {
  VERIFICATION: 'webhook_callback_verification',
  NOTIFICATION: 'notification',
  REVOCATION: 'revocation',
};

/**
 * Extracts case-insensitive header value.
 */
function getHeader(headers = {}, name) {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return Array.isArray(value) ? value[0] : value;
  }
  return null;
}

/**
 * Verifies Twitch EventSub HMAC-SHA256 signature and timestamp drift.
 */
export function verifyTwitchEventSub({ headers, rawBody, secret, maxDriftMs = 600000, now = Date.now() }) {
  const messageId = getHeader(headers, TWITCH_HEADERS.MESSAGE_ID);
  const timestamp = getHeader(headers, TWITCH_HEADERS.TIMESTAMP);
  const signature = getHeader(headers, TWITCH_HEADERS.SIGNATURE);
  const messageType = getHeader(headers, TWITCH_HEADERS.MESSAGE_TYPE);

  if (!messageId || !timestamp || !signature || !messageType) {
    return { valid: false, status: 400, reason: 'MISSING_TWITCH_HEADERS' };
  }

  // 1. Timestamp drift validation (10 minutes)
  const timeCheck = validateTimestampDelta(timestamp, maxDriftMs, now);
  if (!timeCheck.valid) {
    return { valid: false, status: 403, reason: timeCheck.reason, deltaMs: timeCheck.deltaMs };
  }

  // 2. Signature verification: sha256=<hmac_hex>
  const expectedSig = 'sha256=' + computeHmacSha256(secret, messageId + timestamp + (rawBody || ''));
  if (!timingSafeEqual(signature, expectedSig)) {
    return { valid: false, status: 403, reason: 'INVALID_SIGNATURE' };
  }

  return {
    valid: true,
    messageId,
    timestamp: timeCheck.eventTime,
    messageType,
    subscriptionType: getHeader(headers, TWITCH_HEADERS.SUB_TYPE),
  };
}

/**
 * Maps Twitch EventSub tier code to MN Alert Tier and avatar frame.
 */
function mapTwitchTier(tierCode) {
  if (tierCode === '3000') return { tier: 'ultra', tierName: 'Tier 3 Sub', frameId: 'frame-royal-crown' };
  if (tierCode === '2000') return { tier: 'pro', tierName: 'Tier 2 Sub', frameId: 'frame-dragon-fire' };
  return { tier: 'plus', tierName: 'Tier 1 Sub', frameId: undefined };
}

/**
 * Normalizes Twitch EventSub notification payload to canonical StreamEvent.
 */
export function normalizeTwitchEvent({ headers, body, rawBody, secret, replayCache, now = Date.now() }) {
  const verify = verifyTwitchEventSub({ headers, rawBody, secret, now });
  if (!verify.valid) {
    return { success: false, status: verify.status, error: verify.reason };
  }

  const parsedBody = typeof body === 'string' ? JSON.parse(body) : (body || {});

  // Handle Twitch Webhook Challenge Verification
  if (verify.messageType === TWITCH_MESSAGE_TYPES.VERIFICATION) {
    return {
      success: true,
      type: 'challenge',
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      responseBody: parsedBody.challenge,
    };
  }

  // Handle Revocation
  if (verify.messageType === TWITCH_MESSAGE_TYPES.REVOCATION) {
    return {
      success: true,
      type: 'revocation',
      status: 200,
      subscription: parsedBody.subscription,
    };
  }

  // Replay protection check
  const dedupKey = `twitch:${verify.messageId}`;
  if (replayCache && replayCache.isReplay(dedupKey, now)) {
    return { success: false, status: 409, error: 'REPLAY_DETECTED', messageId: verify.messageId };
  }

  const subType = verify.subscriptionType || parsedBody.subscription?.type;
  const evt = parsedBody.event || {};
  const eventTimestamp = verify.timestamp || now;

  let streamEvent = null;

  switch (subType) {
    case 'channel.follow': {
      streamEvent = normalizeStreamEvent({
        id: `twitch_follow_${evt.user_id || verify.messageId}`,
        type: 'follow',
        platform: 'twitch',
        priority: 4,
        tier: 'free',
        sender: { name: evt.user_name || evt.user_login || 'Twitch Follower' },
        payload: { message: 'New Follower!' },
        timestamp: eventTimestamp,
      });
      break;
    }

    case 'channel.subscribe': {
      const { tier, tierName, frameId } = mapTwitchTier(evt.tier);
      streamEvent = normalizeStreamEvent({
        id: `twitch_sub_${evt.user_id || verify.messageId}`,
        type: 'subscribe',
        platform: 'twitch',
        priority: 3,
        tier,
        sender: { name: evt.user_name || 'Subscriber', frameId },
        payload: {
          tierName,
          months: 1,
          isGift: Boolean(evt.is_gift),
          message: evt.is_gift ? 'Received a gift subscription!' : `Subscribed with ${tierName}!`,
        },
        timestamp: eventTimestamp,
      });
      break;
    }

    case 'channel.subscription.gift': {
      const total = Number(evt.total) || 1;
      const tier = total >= 50 ? 'ultra' : (total >= 10 ? 'pro' : (total >= 5 ? 'plus' : 'free'));
      const frameId = total >= 10 ? 'frame-royal-crown' : (total >= 5 ? 'frame-dragon-fire' : undefined);
      streamEvent = normalizeStreamEvent({
        id: `twitch_gift_${verify.messageId}`,
        type: 'subscribe',
        platform: 'twitch',
        priority: 3,
        tier,
        sender: {
          name: evt.is_anonymous ? 'An Anonymous Gifter' : (evt.user_name || 'Community Gifter'),
          frameId,
        },
        payload: {
          amount: total,
          tierName: 'Gift Sub Bomb',
          isGift: true,
          message: `Gifted ${total} community subscription(s)! 🎁`,
        },
        timestamp: eventTimestamp,
      });
      break;
    }

    case 'channel.subscription.message': {
      const months = Number(evt.cumulative_months) || 1;
      const tier = months >= 12 ? 'ultra' : (months >= 6 ? 'pro' : 'plus');
      const frameId = months >= 12 ? 'frame-royal-crown' : (months >= 6 ? 'frame-dragon-fire' : undefined);
      const { tierName } = mapTwitchTier(evt.tier);
      streamEvent = normalizeStreamEvent({
        id: `twitch_resub_${verify.messageId}`,
        type: 'subscribe',
        platform: 'twitch',
        priority: 3,
        tier,
        sender: { name: evt.user_name || 'Resubscriber', frameId },
        payload: {
          tierName,
          months,
          message: evt.message?.text || `Resubscribed for ${months} months!`,
        },
        timestamp: eventTimestamp,
      });
      break;
    }

    case 'channel.cheer': {
      const bits = Number(evt.bits) || 0;
      // Critical preemption if bits >= 50,000
      const priority = bits >= 50000 ? 0 : 2;
      const tier = bits >= 10000 ? 'ultra' : (bits >= 5000 ? 'pro' : (bits >= 1000 ? 'plus' : 'free'));
      const frameId = bits >= 10000 ? 'frame-pharaoh-void' : (bits >= 5000 ? 'frame-dragon-fire' : undefined);
      streamEvent = normalizeStreamEvent({
        id: `twitch_cheer_${verify.messageId}`,
        type: 'cheer',
        platform: 'twitch',
        priority,
        tier,
        sender: {
          name: evt.is_anonymous ? 'Anonymous Cheer' : (evt.user_name || 'Cheerer'),
          frameId,
        },
        payload: {
          amount: bits,
          currency: 'BITS',
          message: evt.message || `Cheered ${bits} bits! 💎`,
        },
        timestamp: eventTimestamp,
      });
      break;
    }

    case 'channel.raid': {
      const viewers = Number(evt.viewers) || 0;
      const tier = viewers >= 500 ? 'ultra' : (viewers >= 100 ? 'pro' : 'plus');
      const frameId = viewers >= 500 ? 'frame-royal-crown' : 'frame-dragon-fire';
      streamEvent = normalizeStreamEvent({
        id: `twitch_raid_${verify.messageId}`,
        type: 'raid',
        platform: 'twitch',
        priority: 1, // Raids are priority 1
        tier,
        sender: {
          name: evt.from_broadcaster_user_name || evt.from_broadcaster_user_login || 'Raid Streamer',
          frameId,
        },
        payload: {
          viewers,
          message: `Incoming raid with ${viewers} viewers! ⚔️`,
        },
        timestamp: eventTimestamp,
      });
      break;
    }

    default:
      return { success: false, status: 200, reason: `UNHANDLED_EVENT_TYPE: ${subType}` };
  }

  return { success: true, type: 'event', status: 200, streamEvent };
}
