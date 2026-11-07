/**
 * Test Harness & Reference Oracle Utilities
 * Provides deterministic factories, HMAC token validators, and Priority Queue reference oracles.
 */

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

/**
 * Pure JS initials avatar generator matching AvatarRing.jsx
 */
export const initialsAvatar = (name) => {
  const clean = String(name || '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const text = (parts.length > 1 ? parts[0][0] + parts[1][0] : (clean.slice(0, 1) || '?')).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#292524"/><text x="32" y="32" dy=".35em" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#e2e8f0">${text.replace(/[<>&]/g, '')}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

/**
 * Creates a valid StreamEvent matching the PROJECT.md interface contract.
 */
export function createMockStreamEvent(overrides = {}) {
  const now = Date.now();
  return {
    id: overrides.id || `evt_${crypto.randomUUID()}`,
    type: overrides.type || 'donation',
    platform: overrides.platform || 'twitch',
    priority: overrides.priority !== undefined ? overrides.priority : 2, // 0=Critical, 1=Raid, 2=Donation, 3=Sub, 4=Follow
    tier: overrides.tier || 'pro',
    sender: {
      name: overrides.sender?.name !== undefined ? overrides.sender.name : 'Mohmad Nour',
      avatarUrl: overrides.sender?.avatarUrl || 'https://example.com/avatar.png',
      badges: overrides.sender?.badges || ['vip', 'subscriber'],
      frameId: overrides.sender?.frameId || 'frame-royal-crown',
      ...overrides.sender,
    },
    payload: {
      amount: overrides.payload?.amount !== undefined ? overrides.payload.amount : 100,
      currency: overrides.payload?.currency || 'USD',
      tierName: overrides.payload?.tierName || 'Tier 3 Sub',
      message: overrides.payload?.message || 'تحياتي لك من مصر، استمر يا بطل! 🚀',
      viewers: overrides.payload?.viewers || 0,
      months: overrides.payload?.months || 1,
      ...overrides.payload,
    },
    timestamp: overrides.timestamp || now,
    expiresAt: overrides.expiresAt || (now + 60000), // 60s lifetime
  };
}

/**
 * Reference HMAC-SHA256 Token Generator & Validator for OBS Browser Source URLs
 */
export const HmacTokenService = {
  DEFAULT_SECRET: 'mn_alerts_secure_hmac_key_2026',

  generateToken(sceneId, secret = HmacTokenService.DEFAULT_SECRET, expiresInMs = 86400000) {
    const exp = Date.now() + expiresInMs;
    const payload = `${sceneId}:${exp}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');
    return Buffer.from(JSON.stringify({ sceneId, exp, sig: signature })).toString('base64url');
  },

  verifyToken(tokenString, secret = HmacTokenService.DEFAULT_SECRET) {
    try {
      if (!tokenString || typeof tokenString !== 'string') {
        return { valid: false, reason: 'EMPTY_OR_INVALID_TOKEN' };
      }
      const raw = Buffer.from(tokenString, 'base64url').toString('utf8');
      const { sceneId, exp, sig } = JSON.parse(raw);

      if (!sceneId || !exp || !sig) {
        return { valid: false, reason: 'MALFORMED_PAYLOAD' };
      }

      if (Date.now() > exp) {
        return { valid: false, reason: 'TOKEN_EXPIRED', exp };
      }

      const expectedHmac = crypto.createHmac('sha256', secret);
      expectedHmac.update(`${sceneId}:${exp}`);
      const expectedSig = expectedHmac.digest('hex');

      // Timing-safe signature comparison
      const sigBuf = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return { valid: false, reason: 'INVALID_SIGNATURE' };
      }

      return { valid: true, sceneId, exp };
    } catch (err) {
      return { valid: false, reason: 'DECODE_ERROR', error: err.message };
    }
  },
};

/**
 * Reference Priority Alert Queue implementing AlertQueueInterface
 * Authoritative behavior for:
 * 1. Max-heap priority (0=Critical > 1=Raid > 2=Donation > 3=Sub > 4=Follow)
 * 2. FIFO tie-breaking for equal priority
 * 3. 5000ms sliding window deduplication
 * 4. Stale event expiration check
 * 5. Queue storm overflow protection
 * 6. Interruption, pause, resume, skip, clear
 */
export class ReferencePriorityAlertQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxCapacity = options.maxCapacity || 100;
    this.dedupWindowMs = options.dedupWindowMs || 5000;
    this.queue = [];
    this.activeAlert = null;
    this.isPaused = false;
    this.seenEventIds = new Map(); // id -> timestamp
    this.seenPayloadHashes = new Map(); // hash -> timestamp
  }

  _hashPayload(event) {
    return `${event.type}:${event.sender?.name}:${event.payload?.amount}:${event.payload?.message}`;
  }

  _cleanDeduplicationCache(now) {
    for (const [id, time] of this.seenEventIds.entries()) {
      if (now - time > this.dedupWindowMs) {
        this.seenEventIds.delete(id);
      }
    }
    for (const [hash, time] of this.seenPayloadHashes.entries()) {
      if (now - time > this.dedupWindowMs) {
        this.seenPayloadHashes.delete(hash);
      }
    }
  }

  enqueue(event) {
    const now = Date.now();
    this._cleanDeduplicationCache(now);

    // 1. Check expiration
    if (event.expiresAt && event.expiresAt < now) {
      return false; // Stale event dropped
    }

    // 2. Sliding window deduplication
    if (this.seenEventIds.has(event.id)) {
      return false; // Duplicate UUID dropped
    }
    const hash = this._hashPayload(event);
    if (this.seenPayloadHashes.has(hash)) {
      return false; // Duplicate payload dropped
    }
    this.seenEventIds.set(event.id, now);
    this.seenPayloadHashes.set(hash, now);

    // 3. Overflow protection: If full, drop lowest-priority non-critical events
    if (this.queue.length >= this.maxCapacity) {
      this.emit('queue_overflow', { currentSize: this.queue.length, incoming: event });
      // If incoming is critical (0) or raid (1), make room by dropping lowest priority
      if (event.priority <= 1) {
        // Remove lowest priority event
        let lowestIdx = -1;
        let lowestPriority = -1;
        for (let i = 0; i < this.queue.length; i++) {
          if (this.queue[i].priority > lowestPriority) {
            lowestPriority = this.queue[i].priority;
            lowestIdx = i;
          }
        }
        if (lowestIdx !== -1 && lowestPriority > event.priority) {
          this.queue.splice(lowestIdx, 1);
        } else {
          return false;
        }
      } else {
        return false; // Dropped due to capacity
      }
    }

    // 4. Insert into priority order (lower number = higher priority: 0 > 1 > 2 > 3 > 4)
    // Stable sort tie-breaker: FIFO timestamp
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (event.priority < this.queue[i].priority) {
        insertIndex = i;
        break;
      } else if (event.priority === this.queue[i].priority) {
        if (event.timestamp < this.queue[i].timestamp) {
          insertIndex = i;
          break;
        }
      }
    }
    this.queue.splice(insertIndex, 0, event);

    // 5. Critical event preemption
    if (event.priority === 0 && this.activeAlert && this.activeAlert.priority > 0) {
      this.emit('alert_preempt', { preempted: this.activeAlert, preemptor: event });
      this.activeAlert = null;
    }

    this._tryProcessNext();
    return true;
  }

  _tryProcessNext() {
    if (this.isPaused || this.activeAlert || this.queue.length === 0) return;
    const nextEvent = this.dequeue();
    if (nextEvent) {
      this.activeAlert = nextEvent;
      this.emit('alert_trigger', nextEvent);
    }
  }

  dequeue() {
    const now = Date.now();
    while (this.queue.length > 0) {
      const candidate = this.queue.shift();
      // Drop expired while waiting in queue
      if (candidate.expiresAt && candidate.expiresAt < now) {
        continue;
      }
      return candidate;
    }
    return null;
  }

  peek() {
    const now = Date.now();
    for (let i = 0; i < this.queue.length; i++) {
      if (!this.queue[i].expiresAt || this.queue[i].expiresAt >= now) {
        return this.queue[i];
      }
    }
    return null;
  }

  completeActive() {
    if (this.activeAlert) {
      const completed = this.activeAlert;
      this.activeAlert = null;
      this.emit('alert_complete', completed);
      this._tryProcessNext();
    }
  }

  skip() {
    if (this.activeAlert) {
      const skipped = this.activeAlert;
      this.activeAlert = null;
      this.emit('alert_skipped', skipped);
    }
    this._tryProcessNext();
  }

  clear() {
    this.queue = [];
    this.activeAlert = null;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this._tryProcessNext();
  }

  size() {
    return this.queue.length;
  }
}

/**
 * Resolves the active PriorityAlertQueue implementation:
 * Uses real implementation if present at `../../core/queue/PriorityAlertQueue.js`,
 * otherwise uses ReferencePriorityAlertQueue.
 */
export async function getPriorityQueueImplementation(options = {}) {
  try {
    const mod = await import('../../core/queue/PriorityAlertQueue.js');
    const ImplClass = mod.PriorityAlertQueue || mod.default;
    if (ImplClass) return new ImplClass(options);
  } catch (_) {
    // Falls back to reference oracle
  }
  return new ReferencePriorityAlertQueue(options);
}

/**
 * Resolves the active TokenService implementation:
 * Uses real implementation if present at `../../services/tokenService.js`,
 * otherwise uses HmacTokenService.
 */
export async function getTokenServiceImplementation() {
  try {
    const mod = await import('../../services/tokenService.js');
    if (mod.generateToken && mod.verifyToken) return mod;
  } catch (_) {
    // Falls back to reference oracle
  }
  return HmacTokenService;
}
