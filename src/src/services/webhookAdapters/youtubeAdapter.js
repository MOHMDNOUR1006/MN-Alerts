/**
 * youtubeAdapter.js - YouTube Live & PubSubHubbub Adapter
 * Grounded in: PROJECT.md § 1 & YouTube Live Streaming API specifications
 */

import { computeHmacSha1, timingSafeEqual } from './cryptoUtils.js';
import { normalizeStreamEvent } from '../../core/queue/EventNormalizer.js';

/**
 * Handles PubSubHubbub subscriber handshake (GET query verification).
 */
export function handleYouTubeHubChallenge(query = {}) {
  const mode = query['hub.mode'];
  const challenge = query['hub.challenge'];
  if ((mode === 'subscribe' || mode === 'unsubscribe') && challenge) {
    return {
      success: true,
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: challenge,
    };
  }
  return null;
}

/**
 * Verifies YouTube PubSubHubbub HMAC-SHA1 signature.
 */
export function verifyYouTubeHubSignature({ headers = {}, rawBody = '', secret }) {
  if (!secret) return { valid: true }; // Allow unauthenticated if secret not configured

  const sigHeader = headers['x-hub-signature'] || headers['X-Hub-Signature'];
  if (!sigHeader) {
    return { valid: false, status: 400, reason: 'MISSING_HUB_SIGNATURE' };
  }

  const expectedSig = 'sha1=' + computeHmacSha1(secret, rawBody);
  if (!timingSafeEqual(sigHeader, expectedSig)) {
    return { valid: false, status: 403, reason: 'INVALID_HUB_SIGNATURE' };
  }

  return { valid: true };
}

/**
 * Normalizes YouTube Live streaming API payloads into canonical StreamEvent.
 */
export function normalizeYouTubeEvent({ headers, body, rawBody, query, secret, replayCache, now = Date.now() }) {
  // 1. PubSubHubbub GET Challenge
  if (query && query['hub.challenge']) {
    const challengeRes = handleYouTubeHubChallenge(query);
    if (challengeRes) {
      return { success: true, type: 'challenge', ...challengeRes };
    }
  }

  // 2. Hub Signature Verification (if header present)
  if (headers && (headers['x-hub-signature'] || headers['X-Hub-Signature'])) {
    const hubVerify = verifyYouTubeHubSignature({ headers, rawBody, secret });
    if (!hubVerify.valid) {
      return { success: false, status: hubVerify.status, error: hubVerify.reason };
    }
  }

  const payload = typeof body === 'string' ? JSON.parse(body) : (body || {});

  // Extract ID
  const eventId = String(payload.id || `yt_${now}_${Math.random().toString(36).slice(2, 7)}`);

  // Replay Protection
  const dedupKey = `youtube:${eventId}`;
  if (replayCache && replayCache.isReplay(dedupKey, now)) {
    return { success: false, status: 409, error: 'REPLAY_DETECTED', eventId };
  }

  const snippet = payload.snippet || {};
  const authorDetails = payload.authorDetails || {};
  const eventType = snippet.type || payload.type;
  const publishedAt = snippet.publishedAt ? Date.parse(snippet.publishedAt) : now;

  let streamEvent = null;

  switch (eventType) {
    case 'superChatEvent': {
      const details = snippet.superChatDetails || {};
      const amount = details.amountMicros ? (Number(details.amountMicros) / 1000000) : (Number(details.amount) || 0);
      const currency = details.currency || 'USD';
      const message = details.userComment || details.amountDisplayString || 'Super Chat!';

      // Critical preemption for whale super chats >= $500
      const priority = amount >= 500 ? 0 : 2;
      const tier = amount >= 100 ? 'ultra' : (amount >= 50 ? 'pro' : (amount >= 10 ? 'plus' : 'free'));
      const frameId = amount >= 100 ? 'frame-pharaoh-void' : (amount >= 50 ? 'frame-dragon-fire' : undefined);

      streamEvent = normalizeStreamEvent({
        id: `yt_superchat_${eventId}`,
        type: 'donation',
        platform: 'youtube',
        priority,
        tier,
        sender: {
          name: authorDetails.displayName || 'YouTube Supporter',
          avatarUrl: authorDetails.profileImageUrl,
          frameId,
        },
        payload: { amount, currency, message },
        timestamp: publishedAt,
      });
      break;
    }

    case 'superStickerEvent': {
      const details = snippet.superStickerDetails || {};
      const amount = details.amountMicros ? (Number(details.amountMicros) / 1000000) : (Number(details.amount) || 5);
      const currency = details.currency || 'USD';
      const stickerText = details.superStickerMetadata?.altText || 'Super Sticker';

      streamEvent = normalizeStreamEvent({
        id: `yt_sticker_${eventId}`,
        type: 'donation',
        platform: 'youtube',
        priority: 2,
        tier: amount >= 50 ? 'pro' : 'plus',
        sender: {
          name: authorDetails.displayName || 'YouTube Supporter',
          avatarUrl: authorDetails.profileImageUrl,
        },
        payload: { amount, currency, message: stickerText },
        timestamp: publishedAt,
      });
      break;
    }

    case 'newSponsorEvent':
    case 'memberMilestoneChatEvent':
    case 'membershipGiftingEvent': {
      const milestone = snippet.memberMilestoneChatDetails || {};
      const gifting = snippet.membershipGiftingDetails || {};
      const months = milestone.memberMonth || 1;
      const giftCount = gifting.giftMembershipsCount || 0;
      const tierName = milestone.memberLevelName || gifting.giftMembershipsLevelName || 'Channel Member';

      const tier = months >= 12 || giftCount >= 20 ? 'ultra' : (months >= 6 || giftCount >= 5 ? 'pro' : 'plus');
      const frameId = tier === 'ultra' ? 'frame-royal-crown' : (tier === 'pro' ? 'frame-dragon-fire' : undefined);

      streamEvent = normalizeStreamEvent({
        id: `yt_member_${eventId}`,
        type: 'subscribe',
        platform: 'youtube',
        priority: 3,
        tier,
        sender: {
          name: authorDetails.displayName || 'Channel Member',
          avatarUrl: authorDetails.profileImageUrl,
          frameId,
        },
        payload: {
          tierName,
          months,
          amount: giftCount > 0 ? giftCount : undefined,
          isGift: giftCount > 0,
          message: milestone.userComment || (giftCount > 0 ? `Gifted ${giftCount} memberships!` : `Joined as a ${tierName}!`),
        },
        timestamp: publishedAt,
      });
      break;
    }

    case 'subscription':
    case 'channelSubscriber': {
      const subTitle = snippet.subscriberSnippet?.title || authorDetails.displayName || 'New Subscriber';
      streamEvent = normalizeStreamEvent({
        id: `yt_sub_${eventId}`,
        type: 'follow',
        platform: 'youtube',
        priority: 4,
        tier: 'free',
        sender: { name: subTitle, avatarUrl: authorDetails.profileImageUrl },
        payload: { message: 'New Subscriber!' },
        timestamp: publishedAt,
      });
      break;
    }

    default:
      return { success: false, status: 200, reason: `UNHANDLED_YOUTUBE_EVENT: ${eventType}` };
  }

  return { success: true, type: 'event', status: 200, streamEvent };
}
