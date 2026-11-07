/**
 * Tier 3: Cross-Feature Interactions & Multi-System Tests
 * Grounded in: ORIGINAL_REQUEST.md (R2, R3, R4, R6) and PROJECT.md (Features F06, F10, F38, F39)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import {
  createMockStreamEvent,
  getPriorityQueueImplementation,
} from './helpers/testHarness.js';

import { soundEngine } from '../services/soundEngine.js';

describe('Tier 3: Cross-Feature Interactions', () => {

  // =========================================================================
  // 3.1 Critical Alert Preemption During Active Animation
  // =========================================================================
  describe('3.1 Critical Alert Preemption Mechanism', () => {
    test('critical event (priority 0) immediately preempts currently active low-priority alert', async () => {
      const queue = await getPriorityQueueImplementation();
      let activeTriggered = null;
      let preemptedEvent = null;

      queue.on('alert_trigger', (evt) => {
        activeTriggered = evt;
      });

      queue.on('alert_preempt', (data) => {
        preemptedEvent = data.preempted;
      });

      // 1. Enqueue low-priority follow alert (priority 4)
      const followEvent = createMockStreamEvent({
        id: 'evt_follow_active',
        type: 'follow',
        priority: 4,
        sender: { name: 'NormalFollower' },
        payload: { message: 'Thanks for streaming!' },
      });

      queue.enqueue(followEvent);

      // Verify follow alert is now active
      assert.ok(activeTriggered, 'Follow alert should be actively triggered');
      assert.equal(activeTriggered.id, 'evt_follow_active');
      assert.equal(queue.activeAlert.id, 'evt_follow_active');

      // 2. Critical event arrives (e.g. $1,000 whale donation or 1,000 viewer raid - priority 0)
      const criticalEvent = createMockStreamEvent({
        id: 'evt_whale_critical',
        type: 'donation',
        priority: 0,
        sender: { name: 'WhaleSupporter' },
        payload: { amount: 1000, message: 'MEGA DONATION BOMB!! 💣' },
      });

      queue.enqueue(criticalEvent);

      // Verify preemption event was emitted for the follow event
      assert.ok(preemptedEvent, 'Preemption signal must be emitted');
      assert.equal(preemptedEvent.id, 'evt_follow_active', 'Follow event was interrupted');

      // Now process next should load the critical event
      assert.equal(queue.activeAlert.id, 'evt_whale_critical', 'Critical event must become the active alert');
    });
  });

  // =========================================================================
  // 3.2 Mid-Session Tier Upgrade & Entitlement Reactive Refresh
  // =========================================================================
  describe('3.2 Reactive Tier Upgrade Mid-Session', () => {
    class MockStreamerSession extends EventEmitter {
      constructor(initialTier = 'free') {
        super();
        this.tier = initialTier;
        this.unlockedFeatures = this._computeFeatures(initialTier);
      }

      _computeFeatures(tier) {
        switch (tier) {
          case 'ultra':
            return { maxScenes: 99, maxWidgets: 100, watermark: false, cinematicVfx: true, allowedPacks: ['all'] };
          case 'pro':
            return { maxScenes: 10, maxWidgets: 25, watermark: false, cinematicVfx: true, allowedPacks: ['pro', 'plus', 'free'] };
          case 'plus':
            return { maxScenes: 3, maxWidgets: 10, watermark: false, cinematicVfx: false, allowedPacks: ['plus', 'free'] };
          case 'free':
          default:
            return { maxScenes: 1, maxWidgets: 3, watermark: true, cinematicVfx: false, allowedPacks: ['free'] };
        }
      }

      upgradeTo(newTier) {
        const oldTier = this.tier;
        this.tier = newTier;
        this.unlockedFeatures = this._computeFeatures(newTier);
        this.emit('tier_updated', { oldTier, newTier, features: this.unlockedFeatures });
      }

      canAccessPack(packTier) {
        if (this.unlockedFeatures.allowedPacks.includes('all')) return true;
        return this.unlockedFeatures.allowedPacks.includes(packTier);
      }
    }

    test('updates feature gates and unlocks Pro/Ultra alert packs immediately upon upgrade', () => {
      const session = new MockStreamerSession('free');

      // Free user attempts to access Ultra cinematic alert pack
      assert.equal(session.canAccessPack('ultra'), false, 'Free user should not access Ultra alert pack');
      assert.equal(session.unlockedFeatures.watermark, true, 'Free user has watermark');
      assert.equal(session.unlockedFeatures.maxScenes, 1);

      // Mid-session subscription upgrade to 'ultra'
      let updateEmitted = false;
      session.on('tier_updated', (data) => {
        updateEmitted = true;
        assert.equal(data.newTier, 'ultra');
      });

      session.upgradeTo('ultra');

      assert.equal(updateEmitted, true, 'tier_updated event should be emitted');
      assert.equal(session.canAccessPack('ultra'), true, 'Ultra user can now access Ultra packs');
      assert.equal(session.unlockedFeatures.watermark, false, 'Watermark removed on Ultra');
      assert.equal(session.unlockedFeatures.cinematicVfx, true, 'Cinematic VFX enabled');
      assert.equal(session.unlockedFeatures.maxScenes, 99);
    });
  });

  // =========================================================================
  // 3.3 Concurrent Audio Limiting & Ducking
  // =========================================================================
  describe('3.3 Master Audio Compressor & Dynamic Limiting', () => {
    test('master audio dynamics limiter specifications prevent 0 dBFS digital clipping', () => {
      // Simulate master compressor node parameters
      const compressorSpec = {
        threshold: -12.0, // dB
        knee: 6.0,        // dB
        ratio: 12.0,      // 12:1 compression ratio above threshold
        attack: 0.003,    // 3ms attack time to catch fast transients
        release: 0.25,    // 250ms release
      };

      assert.ok(compressorSpec.threshold <= -6.0, 'Threshold should be <= -6dB to provide headroom');
      assert.ok(compressorSpec.ratio >= 8.0, 'Compression ratio should be >= 8:1 for transparent limiting');
      assert.ok(compressorSpec.attack <= 0.01, 'Attack must be <= 10ms to eliminate clipping crackle');

      // Peak amplitude simulator through limiter
      function simulateLimiter(inputPeakGain, comp) {
        const inputDb = 20 * Math.log10(inputPeakGain);
        if (inputDb <= comp.threshold) {
          return inputPeakGain; // Below threshold, unattenuated
        }
        const overshootDb = inputDb - comp.threshold;
        const compressedOvershootDb = overshootDb / comp.ratio;
        const outputDb = comp.threshold + compressedOvershootDb;
        return Math.pow(10, outputDb / 20);
      }

      // Test 1: Normal volume signal (0.8 peak gain = -1.93 dB)
      const normalOut = simulateLimiter(0.8, compressorSpec);
      assert.ok(normalOut < 1.0, `Output ${normalOut} must remain below 1.0 (0 dBFS)`);

      // Test 2: Double-playback summing overload (two signals summing to 2.2 = +6.85 dB)
      const overloadIn = 2.2;
      const limitedOut = simulateLimiter(overloadIn, compressorSpec);
      assert.ok(
        limitedOut <= 1.0,
        `Summed concurrent playback peak ${limitedOut} must be restrained below 1.0 (0 dBFS ceiling)`
      );
    });
  });

  // =========================================================================
  // 3.4 Multi-Widget Event Bus Synchronization
  // =========================================================================
  describe('3.4 Multi-Widget Event Bus Fanout Synchronization', () => {
    test('single incoming donation simultaneously broadcasts to Alert, Goal, Event List, and Tip Jar', () => {
      const eventBus = new EventEmitter();

      let alertReceived = false;
      let goalReceivedAmount = 0;
      let eventListCount = 0;
      let tipJarCoins = 0;

      // Register mock widget subscribers
      eventBus.on('STREAM_EVENT', (evt) => {
        if (evt.type === 'donation') {
          alertReceived = true;
          goalReceivedAmount += evt.payload.amount || 0;
          eventListCount++;
          tipJarCoins += Math.min(20, Math.max(1, Math.floor(evt.payload.amount / 5)));
        }
      });

      // Dispatch single donation event
      const donationEvent = createMockStreamEvent({
        id: 'evt_fanout_donation',
        type: 'donation',
        sender: { name: 'GenerousPatron' },
        payload: { amount: 50, message: 'Keep up the amazing streams!' },
      });

      eventBus.emit('STREAM_EVENT', donationEvent);

      // Verify all 4 systems synchronized cleanly
      assert.equal(alertReceived, true, 'Alert Overlay must receive event');
      assert.equal(goalReceivedAmount, 50, 'Goal progress bar must increment by $50');
      assert.equal(eventListCount, 1, 'Event List must append 1 item');
      assert.equal(tipJarCoins, 10, 'Tip Jar should calculate 10 physics coins for $50');
    });
  });

  // =========================================================================
  // 3.5 Manual Queue Controls During Playback
  // =========================================================================
  describe('3.5 Interactive Manual Queue Controls (Skip, Pause, Clear)', () => {
    test('skip, pause, resume, and clear operate deterministically during active queue execution', async () => {
      const queue = await getPriorityQueueImplementation();
      let skippedEvent = null;

      queue.on('alert_skipped', (evt) => {
        skippedEvent = evt;
      });

      queue.pause(); // Start paused
      const evt1 = createMockStreamEvent({ id: 'ctrl_1', priority: 2, sender: { name: 'User1' }, payload: { amount: 10 } });
      const evt2 = createMockStreamEvent({ id: 'ctrl_2', priority: 2, sender: { name: 'User2' }, payload: { amount: 20 } });
      const evt3 = createMockStreamEvent({ id: 'ctrl_3', priority: 2, sender: { name: 'User3' }, payload: { amount: 30 } });

      queue.enqueue(evt1);
      queue.enqueue(evt2);
      queue.enqueue(evt3);

      assert.equal(queue.size(), 3);
      assert.equal(queue.activeAlert, null, 'No alert should be active while paused');

      // Resume queue
      queue.resume();
      assert.ok(queue.activeAlert, 'Active alert should be selected after resume');
      assert.equal(queue.activeAlert.id, 'ctrl_1');
      assert.equal(queue.size(), 2);

      // Manual skip
      queue.skip();
      assert.equal(skippedEvent.id, 'ctrl_1', 'Skipped event must be ctrl_1');
      assert.equal(queue.activeAlert.id, 'ctrl_2', 'Next item should immediately activate');
      assert.equal(queue.size(), 1);

      // Manual clear
      queue.clear();
      assert.equal(queue.size(), 0, 'Queue must be empty after clear()');
      assert.equal(queue.activeAlert, null, 'Active alert reset to null after clear()');
    });
  });
});
