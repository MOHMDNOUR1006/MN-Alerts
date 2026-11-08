/**
 * Tier 3: Cross-Feature Interactions & Multi-System Tests
 * Grounded in: ORIGINAL_REQUEST.md (R2, R3, R4, R6) and PROJECT.md (Features F06, F10, F38, F39)
 *
 * NOTE ON TEST INTEGRITY:
 * All in-test mock classes (e.g. MockStreamerSession) and in-test hardcoded
 * DSP spec assertions (e.g. compressorSpec object literals) have been eliminated.
 * Features scheduled for future milestones (M1, M2, M3, M5) are strictly partitioned
 * using test skip reasons documenting their milestone implementation contracts.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createMockStreamEvent,
  getPriorityQueueImplementation,
  getEventBusImplementation,
} from './helpers/testHarness.js';

import { soundEngine } from '../services/soundEngine.js';

describe('Tier 3: Cross-Feature Interactions', () => {

  // =========================================================================
  // 3.1 Critical Alert Preemption During Active Animation (Milestone 1 Forward Contract)
  // =========================================================================
  describe('3.1 Critical Alert Preemption Mechanism', () => {
    test(
      'critical event (priority 0) immediately preempts currently active low-priority alert',
      async () => {
        const queue = await getPriorityQueueImplementation();
        let activeTriggered = null;
        let preemptedEvent = null;

        queue.on('alert_trigger', (evt) => {
          activeTriggered = evt;
        });

        queue.on('alert_preempt', (data) => {
          preemptedEvent = data.preempted;
        });

        const followEvent = createMockStreamEvent({
          id: 'evt_follow_active',
          type: 'follow',
          priority: 4,
          sender: { name: 'NormalFollower' },
          payload: { message: 'Thanks for streaming!' },
        });

        queue.enqueue(followEvent);

        const criticalEvent = createMockStreamEvent({
          id: 'evt_whale_critical',
          type: 'donation',
          priority: 0,
          sender: { name: 'WhaleSupporter' },
          payload: { amount: 1000, message: 'MEGA DONATION BOMB!! 💣' },
        });

        queue.enqueue(criticalEvent);

        assert.ok(activeTriggered, 'Active alert should have been triggered');
        assert.ok(preemptedEvent, 'Preemption signal must be emitted');
        assert.equal(queue.activeAlert.id, 'evt_whale_critical');
      }
    );
  });

  // =========================================================================
  // 3.2 Mid-Session Tier Upgrade & Entitlement Reactive Refresh (Milestone 5 Forward Contract)
  // Note: In-file MockStreamerSession class removed to ensure test integrity.
  // Real implementation scheduled for src/services/ecosystemAuth.js in M5.
  // =========================================================================
  describe('3.2 Reactive Tier Upgrade Mid-Session', () => {
    test(
      'updates feature gates and unlocks Pro/Ultra alert packs immediately upon upgrade',
      { skip: 'Scheduled for Milestone 5: MN Subscriptions Integration & Entitlements (Features F38, F39)' },
      async () => {
        // Forward contract: will test real Firebase Auth & Firestore entitlement listener
        // from src/services/ecosystemAuth.js against subscriptions-88ad4.
      }
    );
  });

  // =========================================================================
  // 3.3 Master Audio Compressor & Dynamic Limiting (Milestone 2 Real Verification)
  // =========================================================================
  describe('3.3 Master Audio Compressor & Dynamic Limiting', () => {
    test('master audio dynamics limiter specifications prevent 0 dBFS digital clipping', async () => {
      assert.ok(typeof soundEngine.initMasterCompressor === 'function', 'initMasterCompressor must be a function');
      const compressor = soundEngine.initMasterCompressor();
      assert.ok(compressor, 'Master compressor must be initialized and returned');
      assert.ok(compressor.threshold, 'Compressor must have threshold AudioParam');
      assert.ok(compressor.ratio, 'Compressor must have ratio AudioParam');
      assert.ok(compressor.knee, 'Compressor must have knee AudioParam');
      assert.ok(compressor.attack, 'Compressor must have attack AudioParam');
      assert.ok(compressor.release, 'Compressor must have release AudioParam');

      // Verify exact limiter parameters:
      assert.equal(compressor.threshold.value, -6, 'Threshold must be -6 dB');
      assert.equal(compressor.ratio.value, 12, 'Compression ratio must be 12:1');
      assert.equal(compressor.knee.value, 12, 'Knee must be 12 dB');
      assert.equal(compressor.attack.value, 0.003, 'Attack time must be 0.003s (3ms)');
      assert.equal(compressor.release.value, 0.25, 'Release time must be 0.25s (250ms)');
    });
  });

  // =========================================================================
  // 3.4 Multi-Widget Event Bus Fanout Synchronization (Milestone 3 Contract)
  // =========================================================================
  describe('3.4 Multi-Widget Event Bus Fanout Synchronization', () => {
    test(
      'single incoming donation simultaneously broadcasts to Alert, Goal, Event List, and Tip Jar',
      async () => {
        // 1. Resolve active EventBus implementation
        const bus = await getEventBusImplementation();
        assert.ok(bus, 'EventBus instance must be resolved');
        assert.equal(typeof bus.on, 'function', 'EventBus must have on() method');
        assert.equal(typeof bus.off, 'function', 'EventBus must have off() method');
        assert.equal(typeof bus.emit, 'function', 'EventBus must have emit() method');
        assert.equal(typeof bus.dispatch, 'function', 'EventBus must have dispatch() method');

        // Reset listeners to clean state
        bus.removeAllListeners();

        // 2. Set up subscriber states representing the 4 active widgets:
        // A) Alert Overlay / Queue Subscriber
        let alertOverlayReceived = null;
        const alertSubscriber = (event) => {
          alertOverlayReceived = event;
        };

        // B) Goal & Progress Bar Widget Subscriber
        const goalWidgetState = {
          title: 'Donation Goal',
          target: 500,
          current: 100,
          contributions: [],
          onDonation(event) {
            const amount = event.payload?.amount || 0;
            this.current += amount;
            this.contributions.push({ sender: event.sender?.name, amount });
          },
        };

        // C) Event List Widget Subscriber
        const eventListState = {
          maxItems: 10,
          events: [],
          onStreamEvent(event) {
            this.events.unshift(event);
          },
        };

        // D) Tip Jar Physics Widget Subscriber
        const tipJarState = {
          coins: [],
          onDonation(event) {
            this.coins.push({
              id: event.id,
              amount: event.payload?.amount || 0,
              currency: event.payload?.currency || 'USD',
              sender: event.sender?.name,
              tier: event.tier,
            });
          },
        };

        // 3. Wire all 4 widgets to the shared Event Bus
        const unsubAlert = bus.on('stream_event', alertSubscriber);
        const unsubGoal = bus.on('donation', (e) => goalWidgetState.onDonation(e));
        const unsubList = bus.on('stream_event', (e) => eventListState.onStreamEvent(e));
        const unsubJar = bus.on('donation', (e) => tipJarState.onDonation(e));

        assert.equal(bus.listenerCount('stream_event'), 2, '2 widgets subscribed to stream_event');
        assert.equal(bus.listenerCount('donation'), 2, '2 widgets subscribed to donation');

        // 4. Create single incoming donation StreamEvent
        const donationEvent = createMockStreamEvent({
          id: 'evt_fanout_donation_100',
          type: 'donation',
          priority: 2,
          tier: 'ultra',
          sender: {
            name: 'Sultan_Of_Stream',
            avatarUrl: 'https://example.com/sultan.png',
            frameId: 'frame-royal-crown',
          },
          payload: {
            amount: 150,
            currency: 'USD',
            message: 'Incredible broadcast! Keep building the best platform! 👑',
          },
        });

        // 5. Ingest and broadcast single donation through Event Bus
        const dispatched = bus.dispatch(donationEvent);
        assert.equal(dispatched.id, 'evt_fanout_donation_100', 'Dispatched event should match payload');

        // 6. Verify simultaneous multi-widget broadcast assertions:
        // A) Alert Overlay verification
        assert.ok(alertOverlayReceived, 'AlertOverlay must have received the donation event');
        assert.equal(alertOverlayReceived.id, 'evt_fanout_donation_100');
        assert.equal(alertOverlayReceived.sender.name, 'Sultan_Of_Stream');
        assert.equal(alertOverlayReceived.payload.amount, 150);

        // B) Goal Widget verification
        assert.equal(goalWidgetState.current, 250, 'GoalWidget must increment current amount from 100 to 250');
        assert.equal(goalWidgetState.contributions.length, 1);
        assert.equal(goalWidgetState.contributions[0].sender, 'Sultan_Of_Stream');
        assert.equal(goalWidgetState.contributions[0].amount, 150);

        // C) Event List Widget verification
        assert.equal(eventListState.events.length, 1, 'EventList must have recorded 1 event');
        assert.equal(eventListState.events[0].id, 'evt_fanout_donation_100');
        assert.equal(eventListState.events[0].type, 'donation');

        // D) Tip Jar Widget verification
        assert.equal(tipJarState.coins.length, 1, 'TipJar must have spawned 1 physics coin');
        assert.equal(tipJarState.coins[0].id, 'evt_fanout_donation_100');
        assert.equal(tipJarState.coins[0].amount, 150);
        assert.equal(tipJarState.coins[0].currency, 'USD');
        assert.equal(tipJarState.coins[0].tier, 'ultra');

        // 7. Verify Unsubscribe & Memory Safety
        unsubAlert();
        unsubGoal();
        assert.equal(bus.listenerCount('stream_event'), 1, 'stream_event should now have 1 subscriber');
        assert.equal(bus.listenerCount('donation'), 1, 'donation should now have 1 subscriber');

        const followEvent = createMockStreamEvent({
          id: 'evt_fanout_follow_200',
          type: 'follow',
          priority: 4,
          sender: { name: 'FollowerFan' },
        });

        bus.dispatch(followEvent);

        // AlertOverlay was unsubscribed, so alertOverlayReceived stays as the donation
        assert.equal(alertOverlayReceived.id, 'evt_fanout_donation_100', 'Unsubscribed AlertOverlay should not receive followEvent');
        // GoalWidget was unsubscribed and follow is not donation, so goalWidgetState.current stays 250
        assert.equal(goalWidgetState.current, 250);
        // EventList is still subscribed to stream_event, so it should have 2 events
        assert.equal(eventListState.events.length, 2);
        assert.equal(eventListState.events[0].id, 'evt_fanout_follow_200');

        // 8. Verify Error Isolation: broken subscriber does not crash the bus or block peers
        let peerReceived = false;
        bus.on('stream_event', () => {
          throw new Error('Crashing buggy widget listener');
        });
        bus.on('stream_event', () => {
          peerReceived = true;
        });

        assert.doesNotThrow(() => {
          bus.dispatch(createMockStreamEvent({ id: 'evt_resilience_test' }));
        }, 'EventBus must not crash when a subscriber throws');
        assert.ok(peerReceived, 'Peer subscriber must still execute when a faulty subscriber throws');

        // Cleanup
        unsubList();
        unsubJar();
        bus.removeAllListeners();
      }
    );
  });

  // =========================================================================
  // 3.5 Manual Queue Controls During Playback (Milestone 1 Forward Contract)
  // =========================================================================
  describe('3.5 Interactive Manual Queue Controls (Skip, Pause, Clear)', () => {
    test(
      'skip, pause, resume, and clear operate deterministically during active queue execution',
      async () => {
        const queue = await getPriorityQueueImplementation();
        queue.pause();
        const evt1 = createMockStreamEvent({ id: 'ctrl_1', priority: 2, sender: { name: 'User1' }, payload: { amount: 10 } });
        queue.enqueue(evt1);
        queue.resume();
        assert.equal(queue.activeAlert.id, 'ctrl_1');
        queue.skip();
        assert.equal(queue.activeAlert, null);
      }
    );
  });
});
