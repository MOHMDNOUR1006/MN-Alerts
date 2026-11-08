/**
 * webhookAdapters.test.js - Platform Webhook Adapters Test Suite
 * Tests Twitch EventSub, YouTube Live, and Kick Webhook Adapters
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import {
  dispatchPlatformWebhook,
  globalReplayCache,
  verifyTwitchEventSub,
  verifyYouTubeHubSignature,
  verifyKickSignature,
  validateTimestampDelta,
  ReplayCache,
} from '../../services/webhookAdapters/index.js';

import { validateStreamEventContract } from '../helpers/contractDefinitions.js';

const TEST_SECRET = 'mn_alerts_platform_test_secret_2026';

describe('Webhook Adapters & Platform Event Relays', () => {
  beforeEach(() => {
    globalReplayCache.clear();
  });

  // =========================================================================
  // 0. Cryptographic Utilities & Direct Signature Verifiers
  // =========================================================================
  describe('0. Cryptographic Utilities & Direct Verifiers', () => {
    test('validateTimestampDelta validates freshness and catches future skew', () => {
      const now = Date.now();
      assert.equal(validateTimestampDelta(now - 1000, 600000, now).valid, true);
      assert.equal(validateTimestampDelta(now - 700000, 600000, now).valid, false);
      assert.equal(validateTimestampDelta(now + 700000, 600000, now).valid, false);
      assert.equal(validateTimestampDelta('invalid-timestamp', 600000, now).valid, false);
    });

    test('ReplayCache enforces sliding-window expiration', () => {
      const cache = new ReplayCache(100);
      assert.equal(cache.isReplay('key_1', 1000), false);
      assert.equal(cache.isReplay('key_1', 1050), true);
      assert.equal(cache.isReplay('key_1', 1200), false); // Expired
      assert.equal(cache.size(), 1);
      cache.clear();
      assert.equal(cache.size(), 0);
    });

    test('verifyTwitchEventSub, verifyYouTubeHubSignature, verifyKickSignature validate headers', () => {
      // Missing headers check
      assert.equal(verifyTwitchEventSub({ headers: {}, rawBody: '', secret: TEST_SECRET }).valid, false);
      assert.equal(verifyYouTubeHubSignature({ headers: {}, rawBody: '', secret: TEST_SECRET }).valid, false);
      assert.equal(verifyKickSignature({ headers: {}, rawBody: '', secret: TEST_SECRET }).valid, false);
    });
  });

  // =========================================================================
  // 1. Twitch EventSub Webhook Tests
  // =========================================================================
  describe('1. Twitch EventSub Adapter', () => {
    const makeTwitchHeaders = ({
      messageId,
      timestamp,
      body,
      type = 'notification',
      subType = 'channel.follow',
      secret = TEST_SECRET,
    }) => {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(messageId + timestamp + body);
      const sig = 'sha256=' + hmac.digest('hex');
      return {
        'twitch-eventsub-message-id': messageId,
        'twitch-eventsub-message-timestamp': timestamp,
        'twitch-eventsub-message-signature': sig,
        'twitch-eventsub-message-type': type,
        'twitch-eventsub-subscription-type': subType,
      };
    };

    test('verifies valid HMAC-SHA256 signature and normalizes channel.follow', () => {
      const now = new Date().toISOString();
      const messageId = 'msg_twitch_follow_001';
      const body = JSON.stringify({
        subscription: { type: 'channel.follow' },
        event: {
          user_id: '12345',
          user_name: 'FollowerGamer',
          user_login: 'followergamer',
          broadcaster_user_id: '99999',
        },
      });

      const headers = makeTwitchHeaders({ messageId, timestamp: now, body });
      const res = dispatchPlatformWebhook({ platform: 'twitch', headers, body, rawBody: body, secret: TEST_SECRET });

      assert.equal(res.success, true);
      assert.equal(res.type, 'event');
      assert.equal(res.streamEvent.type, 'follow');
      assert.equal(res.streamEvent.platform, 'twitch');
      assert.equal(res.streamEvent.priority, 4);
      assert.equal(res.streamEvent.sender.name, 'FollowerGamer');
      assert.ok(validateStreamEventContract(res.streamEvent).valid);
    });

    test('responds correctly to webhook_callback_verification challenge', () => {
      const now = new Date().toISOString();
      const messageId = 'msg_twitch_challenge_001';
      const challengeToken = 'twitch_challenge_string_abc_123';
      const body = JSON.stringify({ challenge: challengeToken });

      const headers = makeTwitchHeaders({
        messageId,
        timestamp: now,
        body,
        type: 'webhook_callback_verification',
      });

      const res = dispatchPlatformWebhook({ platform: 'twitch', headers, body, rawBody: body, secret: TEST_SECRET });
      assert.equal(res.success, true);
      assert.equal(res.type, 'challenge');
      assert.equal(res.status, 200);
      assert.equal(res.responseBody, challengeToken);
    });

    test('strictly rejects tampered Twitch signature bytes', () => {
      const now = new Date().toISOString();
      const messageId = 'msg_twitch_tampered';
      const body = JSON.stringify({ event: { user_name: 'Hacker' } });
      const headers = makeTwitchHeaders({ messageId, timestamp: now, body });

      // Tamper signature
      headers['twitch-eventsub-message-signature'] = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

      const res = dispatchPlatformWebhook({ platform: 'twitch', headers, body, rawBody: body, secret: TEST_SECRET });
      assert.equal(res.success, false);
      assert.equal(res.status, 403);
      assert.equal(res.error, 'INVALID_SIGNATURE');
    });

    test('strictly rejects Twitch events with timestamp older than 10 minutes', () => {
      const staleTime = new Date(Date.now() - 650000).toISOString(); // 10m 50s ago
      const messageId = 'msg_twitch_stale';
      const body = JSON.stringify({ event: { user_name: 'LateUser' } });
      const headers = makeTwitchHeaders({ messageId, timestamp: staleTime, body });

      const res = dispatchPlatformWebhook({ platform: 'twitch', headers, body, rawBody: body, secret: TEST_SECRET });
      assert.equal(res.success, false);
      assert.equal(res.status, 403);
      assert.equal(res.error, 'TIMESTAMP_EXPIRED');
    });

    test('blocks replayed Twitch event with identical messageId', () => {
      const now = new Date().toISOString();
      const messageId = 'msg_twitch_replay_target';
      const body = JSON.stringify({
        subscription: { type: 'channel.follow' },
        event: { user_id: '888', user_name: 'RepeatUser' },
      });
      const headers = makeTwitchHeaders({ messageId, timestamp: now, body });

      // First attempt succeeds
      const res1 = dispatchPlatformWebhook({ platform: 'twitch', headers, body, rawBody: body, secret: TEST_SECRET });
      assert.equal(res1.success, true);

      // Replay attempt fails
      const res2 = dispatchPlatformWebhook({ platform: 'twitch', headers, body, rawBody: body, secret: TEST_SECRET });
      assert.equal(res2.success, false);
      assert.equal(res2.status, 409);
      assert.equal(res2.error, 'REPLAY_DETECTED');
    });

    test('maps channel.raid to Priority 1 with viewer count', () => {
      const now = new Date().toISOString();
      const messageId = 'msg_twitch_raid_001';
      const body = JSON.stringify({
        subscription: { type: 'channel.raid' },
        event: {
          from_broadcaster_user_name: 'MegaRaidStreamer',
          viewers: 650,
        },
      });
      const headers = makeTwitchHeaders({ messageId, timestamp: now, body, subType: 'channel.raid' });

      const res = dispatchPlatformWebhook({ platform: 'twitch', headers, body, rawBody: body, secret: TEST_SECRET });
      assert.equal(res.success, true);
      assert.equal(res.streamEvent.type, 'raid');
      assert.equal(res.streamEvent.priority, 1);
      assert.equal(res.streamEvent.tier, 'ultra'); // >= 500 viewers
      assert.equal(res.streamEvent.payload.viewers, 650);
      assert.equal(res.streamEvent.sender.frameId, 'frame-royal-crown');
    });

    test('preempts with Priority 0 on mega cheer (>= 50,000 bits)', () => {
      const now = new Date().toISOString();
      const messageId = 'msg_twitch_cheer_whale';
      const body = JSON.stringify({
        subscription: { type: 'channel.cheer' },
        event: {
          user_name: 'WhaleCheerer',
          bits: 100000,
          message: 'WHALE BOMB 100K BITS! 💎',
        },
      });
      const headers = makeTwitchHeaders({ messageId, timestamp: now, body, subType: 'channel.cheer' });

      const res = dispatchPlatformWebhook({ platform: 'twitch', headers, body, rawBody: body, secret: TEST_SECRET });
      assert.equal(res.success, true);
      assert.equal(res.streamEvent.priority, 0); // Critical Preemption!
      assert.equal(res.streamEvent.tier, 'ultra');
      assert.equal(res.streamEvent.sender.frameId, 'frame-pharaoh-void');
    });
  });

  // =========================================================================
  // 2. YouTube Live Adapter Tests
  // =========================================================================
  describe('2. YouTube Live Adapter', () => {
    test('handles PubSubHubbub GET subscription verification challenge', () => {
      const query = {
        'hub.mode': 'subscribe',
        'hub.topic': 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=UC123',
        'hub.challenge': 'yt_pubsub_challenge_999',
        'hub.lease_seconds': '864000',
      };

      const res = dispatchPlatformWebhook({ platform: 'youtube', query });
      assert.equal(res.success, true);
      assert.equal(res.type, 'challenge');
      assert.equal(res.body, 'yt_pubsub_challenge_999');
    });

    test('normalizes Super Chat event with micros to currency conversion', () => {
      const body = {
        id: 'yt_sc_001',
        snippet: {
          type: 'superChatEvent',
          superChatDetails: {
            amountMicros: '25000000', // $25.00
            currency: 'USD',
            userComment: 'Love your stream from Alexandria! 🔥',
          },
        },
        authorDetails: {
          displayName: 'AlexStreamFan',
          profileImageUrl: 'https://example.com/alex.jpg',
        },
      };

      const res = dispatchPlatformWebhook({ platform: 'youtube', body });
      assert.equal(res.success, true);
      assert.equal(res.streamEvent.type, 'donation');
      assert.equal(res.streamEvent.priority, 2);
      assert.equal(res.streamEvent.payload.amount, 25);
      assert.equal(res.streamEvent.payload.currency, 'USD');
      assert.equal(res.streamEvent.sender.name, 'AlexStreamFan');
      assert.ok(validateStreamEventContract(res.streamEvent).valid);
    });

    test('promotes whale Super Chat (>= $500) to Priority 0 Critical Preemption', () => {
      const body = {
        id: 'yt_sc_whale',
        snippet: {
          type: 'superChatEvent',
          superChatDetails: {
            amountMicros: '500000000', // $500.00
            currency: 'USD',
            userComment: 'HUGE SUPPORT FOR THE SQUAD! 🚀',
          },
        },
        authorDetails: { displayName: 'WhaleKing' },
      };

      const res = dispatchPlatformWebhook({ platform: 'youtube', body });
      assert.equal(res.streamEvent.priority, 0); // Critical
      assert.equal(res.streamEvent.tier, 'ultra');
      assert.equal(res.streamEvent.sender.frameId, 'frame-pharaoh-void');
    });

    test('normalizes YouTube Member Milestone to Subscription (Priority 3)', () => {
      const body = {
        id: 'yt_member_001',
        snippet: {
          type: 'memberMilestoneChatEvent',
          memberMilestoneChatDetails: {
            memberMonth: 12,
            memberLevelName: 'Diamond Sponsor',
            userComment: 'One whole year supporting! 💎',
          },
        },
        authorDetails: { displayName: 'LoyalSponsor' },
      };

      const res = dispatchPlatformWebhook({ platform: 'youtube', body });
      assert.equal(res.streamEvent.type, 'subscribe');
      assert.equal(res.streamEvent.priority, 3);
      assert.equal(res.streamEvent.tier, 'ultra');
      assert.equal(res.streamEvent.payload.months, 12);
      assert.equal(res.streamEvent.sender.frameId, 'frame-royal-crown');
    });
  });

  // =========================================================================
  // 3. Kick Webhook & Pusher Tests
  // =========================================================================
  describe('3. Kick Adapter', () => {
    test('normalizes Kick Pusher FollowersUpdated event', () => {
      const body = {
        event: 'App\\Events\\FollowersUpdated',
        channel: 'channel.445566',
        data: {
          username: 'GreenNinja',
          followed_at: new Date().toISOString(),
        },
      };

      const res = dispatchPlatformWebhook({ platform: 'kick', body });
      assert.equal(res.success, true);
      assert.equal(res.streamEvent.type, 'follow');
      assert.equal(res.streamEvent.platform, 'kick');
      assert.equal(res.streamEvent.priority, 4);
      assert.equal(res.streamEvent.sender.name, 'GreenNinja');
      assert.ok(validateStreamEventContract(res.streamEvent).valid);
    });

    test('normalizes Kick GiftedSubscriptionsEvent with count', () => {
      const body = {
        event: 'App\\Events\\GiftedSubscriptionsEvent',
        data: {
          gifter_username: 'KickSultan',
          count: 20,
        },
      };

      const res = dispatchPlatformWebhook({ platform: 'kick', body });
      assert.equal(res.success, true);
      assert.equal(res.streamEvent.type, 'subscribe');
      assert.equal(res.streamEvent.priority, 3);
      assert.equal(res.streamEvent.tier, 'pro'); // >= 10 count
      assert.equal(res.streamEvent.payload.amount, 20);
      assert.equal(res.streamEvent.payload.isGift, true);
      assert.equal(res.streamEvent.sender.frameId, 'frame-royal-crown');
    });

    test('normalizes Kick Tip/Kick Gift to donation', () => {
      const body = {
        event: 'channel.tip',
        data: {
          sender: { username: 'DubaiGamer', avatar_url: 'https://kick.com/avatar.jpg' },
          amount: 150,
          currency: 'USD',
          message: 'Greetings from Dubai! Keep streaming!',
        },
      };

      const res = dispatchPlatformWebhook({ platform: 'kick', body });
      assert.equal(res.streamEvent.type, 'donation');
      assert.equal(res.streamEvent.priority, 2);
      assert.equal(res.streamEvent.tier, 'ultra'); // >= 100 USD
      assert.equal(res.streamEvent.payload.amount, 150);
      assert.equal(res.streamEvent.sender.frameId, 'frame-pharaoh-void');
    });

    test('normalizes Kick StreamHostEvent to Raid (Priority 1)', () => {
      const body = {
        event: 'App\\Events\\StreamHostEvent',
        data: {
          host_username: 'HostMaster',
          number_viewers: 220,
        },
      };

      const res = dispatchPlatformWebhook({ platform: 'kick', body });
      assert.equal(res.streamEvent.type, 'raid');
      assert.equal(res.streamEvent.priority, 1);
      assert.equal(res.streamEvent.tier, 'pro'); // >= 100 viewers
      assert.equal(res.streamEvent.payload.viewers, 220);
      assert.equal(res.streamEvent.sender.frameId, 'frame-dragon-fire');
    });
  });
});
