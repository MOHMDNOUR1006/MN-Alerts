/**
 * platformApi.js - Platform Integration & Webhook Ingestion API
 * Fulfills: PROJECT.md § Code Layout (line 223) & Feature F32
 */

import { dispatchPlatformWebhook, globalReplayCache } from './webhookAdapters/index.js';
import { normalizeStreamEvent } from '../core/queue/EventNormalizer.js';

export const platformApi = {
  /**
   * Processes an incoming webhook request and pushes normalized events into an AlertQueue or EventBus.
   *
   * @param {object} req - { platform, headers, body, rawBody, query, secret }
   * @param {object} [target] - Optional PriorityAlertQueue or EventBus instance to push into
   * @returns {object} Result object
   */
  processWebhook(req, target = null) {
    const result = dispatchPlatformWebhook(req);
    if (result.success && result.type === 'event' && result.streamEvent) {
      if (target) {
        if (typeof target.enqueue === 'function') {
          target.enqueue(result.streamEvent);
        } else if (typeof target.dispatch === 'function') {
          target.dispatch(result.streamEvent);
        }
      }
    }
    return result;
  },

  /**
   * Generates a simulated platform event for testing or studio simulation.
   *
   * @param {object} [options]
   * @returns {object} Normalized StreamEvent
   */
  simulateEvent({
    platform = 'twitch',
    type = 'donation',
    senderName = 'Mohmad Nour',
    amount = 100,
    message = 'Testing alerts!',
  } = {}) {
    return normalizeStreamEvent({
      id: `sim_${platform}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      platform,
      type,
      priority: type === 'raid' ? 1 : (type === 'subscribe' ? 3 : (type === 'follow' ? 4 : 2)),
      sender: { name: senderName },
      payload: { amount, message },
    });
  },

  /**
   * Resets replay protection cache (useful for automated testing).
   */
  clearReplayCache() {
    globalReplayCache.clear();
  },
};

export default platformApi;
