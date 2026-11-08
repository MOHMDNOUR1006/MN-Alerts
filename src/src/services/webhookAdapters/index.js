/**
 * index.js - Unified Streaming Platform Webhook Router
 * Grounded in: PROJECT.md § 1 & Features F32
 */

import { normalizeTwitchEvent } from './twitchAdapter.js';
import { normalizeYouTubeEvent } from './youtubeAdapter.js';
import { normalizeKickEvent } from './kickAdapter.js';
import { ReplayCache } from './cryptoUtils.js';

// Shared singleton replay protection cache
export const globalReplayCache = new ReplayCache(900000); // 15 mins

/**
 * Dispatches raw incoming webhook requests to the appropriate platform adapter.
 *
 * @param {object} params
 * @param {'twitch'|'youtube'|'kick'} params.platform
 * @param {object} params.headers
 * @param {string|object} params.body
 * @param {string} [params.rawBody]
 * @param {object} [params.query]
 * @param {string} [params.secret]
 * @param {ReplayCache} [params.replayCache]
 * @param {number} [params.now]
 * @returns {object} Result object { success, type, status, streamEvent, responseBody, error }
 */
export function dispatchPlatformWebhook({
  platform,
  headers = {},
  body,
  rawBody = typeof body === 'string' ? body : JSON.stringify(body || {}),
  query = {},
  secret,
  replayCache = globalReplayCache,
  now = Date.now(),
}) {
  const normPlatform = String(platform || '').toLowerCase().trim();

  switch (normPlatform) {
    case 'twitch':
      return normalizeTwitchEvent({ headers, body, rawBody, secret, replayCache, now });
    case 'youtube':
      return normalizeYouTubeEvent({ headers, body, rawBody, query, secret, replayCache, now });
    case 'kick':
      return normalizeKickEvent({ headers, body, rawBody, secret, replayCache, now });
    default:
      return { success: false, status: 400, error: `UNSUPPORTED_PLATFORM: ${platform}` };
  }
}

export * from './cryptoUtils.js';
export * from './twitchAdapter.js';
export * from './youtubeAdapter.js';
export * from './kickAdapter.js';
