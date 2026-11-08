/**
 * kickAdapter.js - Kick Webhook & Pusher Event Adapter
 * Grounded in: PROJECT.md § 1 & Kick Webhook/Pusher Specifications
 */

import { computeHmacSha256, timingSafeEqual, validateTimestampDelta } from './cryptoUtils.js';
import { normalizeStreamEvent } from '../../core/queue/EventNormalizer.js';

export const KICK_SIGNATURE_HEADER = 'x-kick-signature';
export const KICK_TIMESTAMP_HEADER = 'x-kick-timestamp';

/**
 * Verifies Kick webhook HMAC-SHA256 signature if headers & secret are provided.
 */
export function verifyKickSignature({ headers = {}, rawBody = '', secret, maxDriftMs = 600000, now = Date.now() }) {
  if (!secret) return { valid: true };

  const signature = headers[KICK_SIGNATURE_HEADER] || headers['X-Kick-Signature'];
  const timestamp = headers[KICK_TIMESTAMP_HEADER] || headers['X-Kick-Timestamp'];

  if (!signature) {
    return { valid: false, status: 400, reason: 'MISSING_KICK_SIGNATURE' };
  }

  if (timestamp) {
    const timeCheck = validateTimestampDelta(timestamp, maxDriftMs, now);
    if (!timeCheck.valid) {
      return { valid: false, status: 403, reason: timeCheck.reason };
    }
  }

  const messageToSign = timestamp ? `${timestamp}.${rawBody}` : rawBody;
  const expectedSig = computeHmacSha256(secret, messageToSign);
  const cleanSig = signature.replace(/^sha256=/, '');

  if (!timingSafeEqual(cleanSig, expectedSig)) {
    return { valid: false, status: 403, reason: 'INVALID_SIGNATURE' };
  }

  return { valid: true };
}

/**
 * Normalizes Kick webhook or Pusher event payload.
 */
export function normalizeKickEvent({ headers, body, rawBody, secret, replayCache, now = Date.now() }) {
  if (secret && headers) {
    const verify = verifyKickSignature({ headers, rawBody, secret, now });
    if (!verify.valid) {
      return { success: false, status: verify.status, error: verify.reason };
    }
  }

  const payload = typeof body === 'string' ? JSON.parse(body) : (body || {});

  // Support both Pusher format (`{ event, data }`) and Kick Webhook format
  const eventName = payload.event || payload.type;
  let data = payload.data || payload;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch {}
  }

  const eventId = String(data.id || payload.id || `kick_${now}_${Math.random().toString(36).slice(2, 7)}`);

  // Replay Protection
  const dedupKey = `kick:${eventId}`;
  if (replayCache && replayCache.isReplay(dedupKey, now)) {
    return { success: false, status: 409, error: 'REPLAY_DETECTED', eventId };
  }

  let streamEvent = null;

  switch (eventName) {
    case 'App\\Events\\FollowersUpdated':
    case 'channel.follow': {
      const username = data.username || data.follower?.username || 'Kick Follower';
      streamEvent = normalizeStreamEvent({
        id: `kick_follow_${eventId}`,
        type: 'follow',
        platform: 'kick',
        priority: 4,
        tier: 'free',
        sender: { name: username },
        payload: { message: 'New Kick Follower!' },
        timestamp: now,
      });
      break;
    }

    case 'App\\Events\\SubscriptionEvent':
    case 'channel.subscription': {
      const username = data.username || 'Kick Subscriber';
      const months = Number(data.months) || 1;
      const tier = months >= 12 ? 'ultra' : (months >= 3 ? 'pro' : 'plus');
      const frameId = months >= 12 ? 'frame-royal-crown' : (months >= 3 ? 'frame-dragon-fire' : undefined);

      streamEvent = normalizeStreamEvent({
        id: `kick_sub_${eventId}`,
        type: 'subscribe',
        platform: 'kick',
        priority: 3,
        tier,
        sender: { name: username, frameId },
        payload: {
          tierName: 'Kick Sub',
          months,
          message: `Subscribed for ${months} month(s)!`,
        },
        timestamp: now,
      });
      break;
    }

    case 'App\\Events\\GiftedSubscriptionsEvent':
    case 'channel.subscription.gift': {
      const gifter = data.gifter_username || data.username || 'An Anonymous Gifter';
      const count = Number(data.count) || (Array.isArray(data.gifted_usernames) ? data.gifted_usernames.length : 1);
      const tier = count >= 50 ? 'ultra' : (count >= 10 ? 'pro' : 'plus');
      const frameId = count >= 10 ? 'frame-royal-crown' : undefined;

      streamEvent = normalizeStreamEvent({
        id: `kick_gift_${eventId}`,
        type: 'subscribe',
        platform: 'kick',
        priority: 3,
        tier,
        sender: { name: gifter, frameId },
        payload: {
          amount: count,
          tierName: 'Gifted Sub',
          isGift: true,
          message: `Gifted ${count} Kick subscription(s)! 🎁`,
        },
        timestamp: now,
      });
      break;
    }

    case 'channel.tip':
    case 'kicks.gift': {
      const username = data.sender?.username || data.username || 'Kick Supporter';
      const amount = Number(data.amount) || 0;
      const currency = data.currency || 'USD';
      const message = data.message || 'Kick Tip!';

      const priority = amount >= 500 ? 0 : 2;
      const tier = amount >= 100 ? 'ultra' : (amount >= 50 ? 'pro' : (amount >= 10 ? 'plus' : 'free'));
      const frameId = amount >= 100 ? 'frame-pharaoh-void' : (amount >= 50 ? 'frame-dragon-fire' : undefined);

      streamEvent = normalizeStreamEvent({
        id: `kick_tip_${eventId}`,
        type: 'donation',
        platform: 'kick',
        priority,
        tier,
        sender: {
          name: username,
          avatarUrl: data.sender?.avatar_url,
          frameId,
        },
        payload: { amount, currency, message },
        timestamp: now,
      });
      break;
    }

    case 'App\\Events\\StreamHostEvent':
    case 'channel.host': {
      const hostUser = data.host_username || data.username || 'Host Streamer';
      const viewers = Number(data.number_viewers || data.viewers) || 0;
      const tier = viewers >= 500 ? 'ultra' : (viewers >= 100 ? 'pro' : 'plus');
      const frameId = viewers >= 500 ? 'frame-royal-crown' : 'frame-dragon-fire';

      streamEvent = normalizeStreamEvent({
        id: `kick_host_${eventId}`,
        type: 'raid',
        platform: 'kick',
        priority: 1, // Raids / Hosts are priority 1
        tier,
        sender: { name: hostUser, frameId },
        payload: {
          viewers,
          message: `Hosted stream with ${viewers} viewers! ⚔️`,
        },
        timestamp: now,
      });
      break;
    }

    default:
      return { success: false, status: 200, reason: `UNHANDLED_KICK_EVENT: ${eventName}` };
  }

  return { success: true, type: 'event', status: 200, streamEvent };
}
