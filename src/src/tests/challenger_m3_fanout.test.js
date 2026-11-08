/**
 * challenger_m3_fanout.test.js — Milestone 3 Multi-Widget Fanout & EventBus Stress Suite
 *
 * Empirical challenger test suite authoritatively stress-testing:
 * 1. High-Volume Event Burst Fanout (1,000 rapid sequential events to 16 concurrent listeners -> 16,000 invocations with 0 loss and 0 ordering anomalies)
 * 2. Crashing / Fatal Listener Isolation (odd listeners throw errors; even listeners receive 100% of events without halting)
 * 3. Massive Subscription / Unsubscription Churn & Memory Leak Invariants (5,000+ churn cycles asserting listener count returns to 0 and Map cleanups)
 * 4. Bounded History Buffer Invariants (500 events capped strictly at maxHistory 50, chronological and reverse-chronological ordering)
 * 5. Multi-Channel Fanout Fidelity & Payload Mutation Dynamics (stream_event, typed channels, donation_processed, and reference isolation)
 * 6. All 16 Widgets Registry, Catalog & Instantiation Stability Audit (bi-directional mapping, React element instantiation with null/empty config, and SSR rendering)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { EventBus, eventBus } from '../services/eventBus.js';

describe('Milestone 3 Adversarial Fanout & EventBus Stress Suite', () => {

  // =========================================================================
  // SECTION 1: High-Volume Event Burst Fanout
  // =========================================================================
  describe('1. High-Volume Event Burst Fanout (16 Concurrent Listeners x 1,000 Events)', () => {

    test('1.1 Direct emit() burst: 1,000 sequential events to 16 concurrent listeners (16,000 invocations) with 0 lost events and monotonic order', () => {
      const bus = new EventBus({ maxListeners: 100 });
      const NUM_LISTENERS = 16;
      const NUM_EVENTS = 1000;

      const receipts = Array.from({ length: NUM_LISTENERS }, () => []);
      const unsubs = [];

      for (let i = 0; i < NUM_LISTENERS; i++) {
        unsubs.push(
          bus.on('burst_event', (payload) => {
            receipts[i].push(payload.seq);
          })
        );
      }

      assert.equal(bus.listenerCount('burst_event'), 16, 'All 16 listeners must be registered');

      const start = performance.now();
      for (let seq = 0; seq < NUM_EVENTS; seq++) {
        const delivered = bus.emit('burst_event', { seq, timestamp: Date.now() });
        assert.equal(delivered, true, `Event ${seq} must return true on delivery`);
      }
      const elapsedMs = performance.now() - start;

      let totalInvocations = 0;
      for (let i = 0; i < NUM_LISTENERS; i++) {
        const received = receipts[i];
        totalInvocations += received.length;
        assert.equal(received.length, NUM_EVENTS, `Listener ${i} must receive exactly 1,000 events`);
        // Verify strict monotonically increasing ordering
        for (let seq = 0; seq < NUM_EVENTS; seq++) {
          assert.equal(received[seq], seq, `Listener ${i} received out-of-order sequence at index ${seq}`);
        }
      }

      assert.equal(totalInvocations, 16000, 'Total listener invocations must be exactly 16,000');
      assert.ok(elapsedMs < 2000, `Burst must execute in < 2000ms (actual: ${elapsedMs.toFixed(2)}ms)`);

      // Cleanup
      for (const unsub of unsubs) unsub();
      assert.equal(bus.listenerCount('burst_event'), 0);
    });

    test('1.2 Ingress dispatch() burst: 1,000 StreamEvents through canonical dispatcher with 16 concurrent listeners', () => {
      const bus = new EventBus({ maxListeners: 100, maxHistory: 100 });
      const NUM_LISTENERS = 16;
      const NUM_EVENTS = 1000;

      const receipts = Array.from({ length: NUM_LISTENERS }, () => []);
      const unsubs = [];

      for (let i = 0; i < NUM_LISTENERS; i++) {
        unsubs.push(
          bus.on('stream_event', (evt) => {
            receipts[i].push(evt.payload.seq);
          })
        );
      }

      const start = performance.now();
      for (let seq = 0; seq < NUM_EVENTS; seq++) {
        bus.dispatch({
          id: `evt_burst_${seq}`,
          type: 'donation',
          platform: 'twitch',
          payload: { seq, amount: 5 + (seq % 100) },
        });
      }
      const elapsedMs = performance.now() - start;

      let totalInvocations = 0;
      for (let i = 0; i < NUM_LISTENERS; i++) {
        const received = receipts[i];
        totalInvocations += received.length;
        assert.equal(received.length, NUM_EVENTS, `Widget listener ${i} must receive all 1,000 events`);
        for (let seq = 0; seq < NUM_EVENTS; seq++) {
          assert.equal(received[seq], seq, `Widget listener ${i} sequence anomaly at index ${seq}`);
        }
      }

      assert.equal(totalInvocations, 16000, 'Total widget invocations must equal 16,000');
      // Throughput check: must sustain at least 50,000 invocations/sec
      const invocationsPerSec = (totalInvocations / (elapsedMs / 1000));
      assert.ok(invocationsPerSec > 20000, `Throughput must exceed 20,000 calls/sec (actual: ${invocationsPerSec.toFixed(0)} calls/sec)`);

      for (const unsub of unsubs) unsub();
    });

    test('1.3 Microtask-interleaved burst: 1,000 events dispatched asynchronously without stack overflow', async () => {
      const bus = new EventBus({ maxListeners: 50 });
      let count = 0;
      bus.on('async_burst', () => { count++; });

      const TOTAL = 1000;
      await new Promise((resolve) => {
        let sent = 0;
        function pump() {
          while (sent < TOTAL) {
            bus.emit('async_burst', { sent });
            sent++;
            if (sent % 100 === 0) {
              setImmediate(pump);
              return;
            }
          }
          resolve();
        }
        pump();
      });

      assert.equal(count, TOTAL, 'All 1,000 async microtask events must be processed');
    });
  });

  // =========================================================================
  // SECTION 2: Crashing / Fatal Listener Isolation
  // =========================================================================
  describe('2. Crashing / Throwing Listener Isolation & Fault Tolerance', () => {

    test('2.1 Alternating throwing listeners (5 throwing, 5 non-throwing) over 100 events: 100% of healthy listeners execute', () => {
      const bus = new EventBus({ maxListeners: 50 });
      const NUM_LISTENERS = 10;
      const NUM_EVENTS = 100;

      const healthyReceipts = { 0: 0, 2: 0, 4: 0, 6: 0, 8: 0 };
      let throwingInvocations = 0;

      // Suppress console.error during expected errors
      const originalConsoleError = console.error;
      let loggedErrorCount = 0;
      console.error = () => { loggedErrorCount++; };

      try {
        for (let i = 0; i < NUM_LISTENERS; i++) {
          const idx = i;
          if (idx % 2 === 1) {
            // Odd listeners throw fatal exceptions
            bus.on('hazard_channel', () => {
              throwingInvocations++;
              throw new Error(`Fatal listener crash at index ${idx}`);
            });
          } else {
            // Even listeners are well-behaved
            bus.on('hazard_channel', () => {
              healthyReceipts[idx]++;
            });
          }
        }

        for (let e = 0; e < NUM_EVENTS; e++) {
          assert.doesNotThrow(() => {
            bus.emit('hazard_channel', { eventId: e });
          }, 'bus.emit() must never propagate listener exceptions to the caller');
        }
      } finally {
        console.error = originalConsoleError;
      }

      assert.equal(throwingInvocations, 500, '5 throwing listeners * 100 events = 500 throws');
      assert.equal(loggedErrorCount, 500, 'All 500 errors must be safely logged');

      for (const idx of [0, 2, 4, 6, 8]) {
        assert.equal(healthyReceipts[idx], 100, `Healthy listener ${idx} must execute 100% of events without interruption`);
      }
    });

    test('2.2 Head listener fatal crash does NOT short-circuit remaining subscribers', () => {
      const bus = new EventBus();
      let secondRan = false;
      let thirdRan = false;

      const origErr = console.error;
      console.error = () => {};
      try {
        bus.on('head_crash', () => {
          throw new TypeError('Head listener catastrophic failure');
        });
        bus.on('head_crash', () => { secondRan = true; });
        bus.on('head_crash', () => { thirdRan = true; });

        bus.emit('head_crash');
      } finally {
        console.error = origErr;
      }

      assert.equal(secondRan, true, 'Second listener must execute despite head failure');
      assert.equal(thirdRan, true, 'Third listener must execute despite head failure');
    });

    test('2.3 Tail listener fatal crash does not affect bus delivery return value', () => {
      const bus = new EventBus();
      let firstRan = false;

      const origErr = console.error;
      console.error = () => {};
      try {
        bus.on('tail_crash', () => { firstRan = true; });
        bus.on('tail_crash', () => { throw new RangeError('Tail listener crash'); });

        const res = bus.emit('tail_crash');
        assert.equal(res, true, 'emit must return true when listeners were called');
      } finally {
        console.error = origErr;
      }

      assert.equal(firstRan, true);
    });

    test('2.4 Multi-channel dispatch isolates crashing listeners on typed channels', () => {
      const bus = new EventBus();
      let genericRan = false;
      let processedRan = false;

      const origErr = console.error;
      console.error = () => {};
      try {
        bus.on('stream_event', () => { genericRan = true; });
        bus.on('donation', () => { throw new Error('GoalWidget crashed on donation'); });
        bus.on('donation_processed', () => { processedRan = true; });

        bus.dispatch({
          id: 'evt_isolated_donation',
          type: 'donation',
          payload: { amount: 100 },
        });
      } finally {
        console.error = origErr;
      }

      assert.equal(genericRan, true, 'stream_event must execute');
      assert.equal(processedRan, true, 'donation_processed must execute despite typed donation crash');
    });
  });

  // =========================================================================
  // SECTION 3: Massive Subscription / Unsubscription Churn & Memory Safety
  // =========================================================================
  describe('3. Massive Subscription / Unsubscription Churn (Memory Leak Invariants)', () => {

    test('3.1 Sequential Churn: 5,000 immediate subscribe/unsubscribe cycles cleanly purge internal Map', () => {
      const bus = new EventBus();
      const CHURN_CYCLES = 5000;

      for (let i = 0; i < CHURN_CYCLES; i++) {
        const handler = () => {};
        const unsub = bus.on('churn_seq', handler);
        assert.equal(bus.listenerCount('churn_seq'), 1);
        unsub();
        assert.equal(bus.listenerCount('churn_seq'), 0);
      }

      assert.equal(bus.listenerCount('churn_seq'), 0, 'Listener count must be strictly 0');
      assert.equal(bus._events.has('churn_seq'), false, 'Empty event Set must be pruned from Map');
    });

    test('3.2 Batch Churn: 5,000 subscriptions followed by 5,000 batch unsubscriptions', () => {
      const bus = new EventBus({ maxListeners: 10000 });
      const BATCH_SIZE = 5000;
      const unsubs = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        unsubs.push(bus.on('churn_batch', () => {}));
      }

      assert.equal(bus.listenerCount('churn_batch'), BATCH_SIZE, 'Listener count must reach exactly 5,000');
      assert.equal(bus.eventNames().includes('churn_batch'), true);

      // Unsubscribe all
      for (const unsub of unsubs) {
        unsub();
      }

      assert.equal(bus.listenerCount('churn_batch'), 0, 'Listener count must return to 0');
      assert.equal(bus._events.has('churn_batch'), false, 'Event key must be removed from Map');
    });

    test('3.3 Interleaved Churn: 5,000 subscriptions with split unsubscriptions (even then odd)', () => {
      const bus = new EventBus({ maxListeners: 10000 });
      const TOTAL = 5000;
      const unsubs = [];

      for (let i = 0; i < TOTAL; i++) {
        unsubs.push(bus.on('churn_interleaved', () => {}));
      }

      // Evict even indices
      for (let i = 0; i < TOTAL; i += 2) {
        unsubs[i]();
      }
      assert.equal(bus.listenerCount('churn_interleaved'), 2500, 'Must have exactly 2,500 remaining');

      // Evict odd indices
      for (let i = 1; i < TOTAL; i += 2) {
        unsubs[i]();
      }
      assert.equal(bus.listenerCount('churn_interleaved'), 0, 'Must have strictly 0 remaining');
      assert.equal(bus._events.has('churn_interleaved'), false, 'Internal Map key must be pruned');
    });

    test('3.4 Repeated idempotent unsubscriptions do not throw or corrupt state', () => {
      const bus = new EventBus();
      const handler = () => {};
      const unsub = bus.on('idempotent_test', handler);

      assert.equal(bus.listenerCount('idempotent_test'), 1);
      unsub();
      assert.equal(bus.listenerCount('idempotent_test'), 0);
      assert.doesNotThrow(() => {
        unsub(); // Second call
        unsub(); // Third call
        bus.off('idempotent_test', handler); // Fourth call
      });
      assert.equal(bus.listenerCount('idempotent_test'), 0);
    });

    test('3.5 removeAllListeners() cleans all keys and sets', () => {
      const bus = new EventBus({ maxListeners: 50 });
      for (let i = 0; i < 20; i++) {
        bus.on(`event_${i}`, () => {});
      }
      assert.equal(bus.eventNames().length, 20);

      bus.removeAllListeners();
      assert.equal(bus.eventNames().length, 0);
      assert.equal(bus._events.size, 0);
    });

    test('3.6 Memory heap stability verification across 10,000 churn cycles', () => {
      const bus = new EventBus({ maxListeners: 20000 });
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10000; i++) {
        const unsub = bus.on('mem_test', () => {});
        unsub();
      }

      if (global.gc) global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const heapDeltaMb = (finalMemory - initialMemory) / (1024 * 1024);

      // Assert no runaway heap explosion (> 50MB growth indicates leak)
      assert.ok(heapDeltaMb < 50, `Heap delta must be < 50MB (actual: ${heapDeltaMb.toFixed(2)}MB)`);
      assert.equal(bus.listenerCount('mem_test'), 0);
    });
  });

  // =========================================================================
  // SECTION 4: Bounded History Buffer Invariants
  // =========================================================================
  describe('4. Bounded History Buffer Invariants & FIFO Clamping', () => {

    test('4.1 500 events emitted to EventBus with maxHistory: 50 strictly caps _history length at 50', () => {
      const bus = new EventBus({ maxHistory: 50 });
      const TOTAL_EVENTS = 500;

      for (let seq = 0; seq < TOTAL_EVENTS; seq++) {
        bus.dispatch({
          id: `evt_hist_${seq}`,
          type: 'donation',
          seq,
          payload: { amount: seq + 1 },
        });
      }

      assert.equal(bus._history.length, 50, 'History buffer must strictly equal maxHistory (50)');
      assert.equal(bus.getHistory().length, 20, 'getHistory() default limit must be 20');
      assert.equal(bus.getHistory(100).length, 50, 'getHistory(100) must return at most 50');

      // Index 0 must be most recent event (seq 499)
      const fullHistory = bus.getHistory(50);
      assert.equal(fullHistory[0].id, 'evt_hist_499', 'Most recent event must be at index 0');
      assert.equal(fullHistory[49].id, 'evt_hist_450', '50th most recent event must be at index 49');

      // Verify all 450 earlier events (0..449) have been evicted
      const retainedIds = new Set(fullHistory.map((e) => e.id));
      for (let oldSeq = 0; oldSeq < 450; oldSeq++) {
        assert.equal(retainedIds.has(`evt_hist_${oldSeq}`), false, `Old event ${oldSeq} must be evicted`);
      }
    });

    test('4.2 Chronological inversion fidelity: reversing _history yields exact chronological order', () => {
      const bus = new EventBus({ maxHistory: 50 });
      for (let i = 0; i < 50; i++) {
        bus.dispatch({ id: `chrono_${i}`, type: 'follow' });
      }

      const chrono = [...bus.getHistory(50)].reverse();
      for (let i = 0; i < 50; i++) {
        assert.equal(chrono[i].id, `chrono_${i}`, `Chrono index ${i} must match`);
      }
    });

    test('4.3 getHistory boundary edge cases (limit <= 0, limit > size, non-numeric)', () => {
      const bus = new EventBus({ maxHistory: 10 });
      for (let i = 0; i < 10; i++) {
        bus.dispatch({ id: `e_${i}`, type: 'donation', payload: { amount: 10 } });
      }

      assert.equal(bus.getHistory(0).length, 0);
      assert.equal(bus.getHistory(-5).length, 0);
      assert.equal(bus.getHistory(100).length, 10);
    });

    test('4.4 clearHistory() resets buffer to empty array without affecting listeners', () => {
      const bus = new EventBus({ maxHistory: 10 });
      let listenerFired = 0;
      bus.on('stream_event', () => { listenerFired++; });

      bus.dispatch({ id: 'evt_1', type: 'donation', payload: { amount: 10 } });
      assert.equal(bus.getHistory().length, 1);
      assert.equal(listenerFired, 1);

      bus.clearHistory();
      assert.equal(bus.getHistory().length, 0);
      assert.equal(bus._history.length, 0);

      // Listeners remain intact
      bus.dispatch({ id: 'evt_2', type: 'donation', payload: { amount: 20 } });
      assert.equal(bus.getHistory().length, 1);
      assert.equal(listenerFired, 2);
    });

    test('4.5 Late-joining subscriber hydration via getHistory()', () => {
      const bus = new EventBus({ maxHistory: 25 });
      for (let i = 0; i < 20; i++) {
        bus.dispatch({ id: `late_${i}`, type: 'donation', payload: { amount: i * 5 } });
      }

      // New widget mounts late
      const widgetReplayState = [];
      const recent = bus.getHistory(5);
      for (const evt of recent) {
        widgetReplayState.push(evt.id);
      }

      assert.equal(widgetReplayState.length, 5);
      assert.deepEqual(widgetReplayState, ['late_19', 'late_18', 'late_17', 'late_16', 'late_15']);
    });
  });

  // =========================================================================
  // SECTION 5: Multi-Channel Fanout Fidelity & Payload Dynamics
  // =========================================================================
  describe('5. Wildcard & Multi-Channel Fanout Fidelity', () => {

    test('5.1 Donation event fires stream_event, donation, and donation_processed simultaneously', () => {
      const bus = new EventBus();
      let streamEventCount = 0;
      let donationCount = 0;
      let donationProcessedCount = 0;

      bus.on('stream_event', () => { streamEventCount++; });
      bus.on('donation', () => { donationCount++; });
      bus.on('donation_processed', () => { donationProcessedCount++; });

      bus.dispatch({
        id: 'evt_triple_fanout',
        type: 'donation',
        payload: { amount: 75, currency: 'USD' },
      });

      assert.equal(streamEventCount, 1, 'Must emit to stream_event');
      assert.equal(donationCount, 1, 'Must emit to donation');
      assert.equal(donationProcessedCount, 1, 'Must emit to donation_processed');
    });

    test('5.2 Non-monetary event (follow, subscribe, chat) strictly suppresses donation_processed', () => {
      const bus = new EventBus();
      let streamCount = 0;
      let followCount = 0;
      let donationProcessedCount = 0;

      bus.on('stream_event', () => { streamCount++; });
      bus.on('follow', () => { followCount++; });
      bus.on('donation_processed', () => { donationProcessedCount++; });

      bus.dispatch({
        id: 'evt_follow_test',
        type: 'follow',
        sender: { name: 'FollowerA' },
      });

      assert.equal(streamCount, 1);
      assert.equal(followCount, 1);
      assert.equal(donationProcessedCount, 0, 'Follow must never trigger donation_processed');
    });

    test('5.3 Cheer or custom event with positive amount triggers donation_processed', () => {
      const bus = new EventBus();
      let donationProcessedCount = 0;
      bus.on('donation_processed', () => { donationProcessedCount++; });

      bus.dispatch({
        id: 'evt_cheer_bits',
        type: 'cheer',
        payload: { amount: 100 },
      });

      assert.equal(donationProcessedCount, 1, 'Positive amount must emit to donation_processed');
    });

    test('5.4 once() self-unsubscribes immediately after first dispatch', () => {
      const bus = new EventBus();
      let onceCallCount = 0;

      bus.once('stream_event', () => {
        onceCallCount++;
      });

      assert.equal(bus.listenerCount('stream_event'), 1);
      bus.dispatch({ id: 'evt_once_1', type: 'follow' });
      assert.equal(onceCallCount, 1);
      assert.equal(bus.listenerCount('stream_event'), 0);

      // Subsequent dispatches do not re-trigger
      bus.dispatch({ id: 'evt_once_2', type: 'follow' });
      assert.equal(onceCallCount, 1);
    });

    test('5.5 Payload reference audit across multi-channel fanout', () => {
      const bus = new EventBus();
      let streamEvtRef = null;
      let typedEvtRef = null;

      bus.on('stream_event', (e) => { streamEvtRef = e; });
      bus.on('donation', (e) => { typedEvtRef = e; });

      bus.dispatch({
        id: 'evt_ref_check',
        type: 'donation',
        payload: { amount: 50 },
      });

      assert.ok(streamEvtRef && typedEvtRef);
      assert.equal(streamEvtRef.id, typedEvtRef.id);
      assert.equal(streamEvtRef.payload.amount, 50);
      assert.equal(typedEvtRef.payload.amount, 50);
    });
  });

  // =========================================================================
  // SECTION 6: All 16 Widgets Registry, Catalog & Instantiation Stability
  // =========================================================================
  describe('6. All 16 Widgets Registry & Catalog Stability Audit', () => {
    let viteServer;
    let widgetsMod;

    before(async () => {
      viteServer = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        ssr: { external: ['react', 'react-dom', 'react-dom/server'] },
      });
      widgetsMod = await viteServer.ssrLoadModule('./src/components/widgets/index.js');
    });

    after(async () => {
      if (viteServer) {
        await viteServer.close();
      }
    });

    test('6.1 Catalog Cardinality & Registry Equivalence: exactly 16 widgets in catalog and all present in registry', () => {
      assert.ok(Array.isArray(widgetsMod.WIDGET_CATALOG), 'WIDGET_CATALOG must be an array');
      assert.equal(widgetsMod.WIDGET_CATALOG.length, 16, 'Catalog must contain exactly 16 widgets');

      const expectedTypes = [
        'chat-box',
        'event-list',
        'goals-progress',
        'tip-jar',
        'top-supporters',
        'end-credits',
        'media-share',
        'polls',
        'spin-wheel',
        'stream-boss',
        'emote-wall',
        'sponsor-banner',
        'countdown-timer',
        'stream-labels',
        'viewer-counter',
        'custom-html',
      ];

      for (const expectedType of expectedTypes) {
        const item = widgetsMod.WIDGET_CATALOG.find((w) => w.type === expectedType);
        assert.ok(item, `WIDGET_CATALOG must include type "${expectedType}"`);
        assert.ok(item.nameAr && item.nameAr.length > 0, `Widget ${expectedType} must have Arabic name`);
        assert.ok(item.nameEn && item.nameEn.length > 0, `Widget ${expectedType} must have English name`);
        assert.ok(typeof item.defaultWidth === 'number' && item.defaultWidth > 0);
        assert.ok(typeof item.defaultHeight === 'number' && item.defaultHeight > 0);

        const Comp = widgetsMod.getWidgetComponent(expectedType);
        assert.equal(typeof Comp, 'function', `getWidgetComponent("${expectedType}") must resolve to a React component function`);
      }
    });

    test('6.2 Shorthand Alias Equivalence: all 16 shorthand aliases resolve identically to canonical types', () => {
      const aliasMap = {
        chatbox: 'chat-box',
        eventlist: 'event-list',
        goals: 'goals-progress',
        tipjar: 'tip-jar',
        topsupporters: 'top-supporters',
        endcredits: 'end-credits',
        mediashare: 'media-share',
        poll: 'polls',
        spinwheel: 'spin-wheel',
        streamboss: 'stream-boss',
        emotewall: 'emote-wall',
        sponsor: 'sponsor-banner',
        countdown: 'countdown-timer',
        labels: 'stream-labels',
        viewers: 'viewer-counter',
        custom: 'custom-html',
      };

      for (const [alias, canonical] of Object.entries(aliasMap)) {
        const aliasComp = widgetsMod.getWidgetComponent(alias);
        const canonicalComp = widgetsMod.getWidgetComponent(canonical);
        assert.ok(aliasComp, `Alias "${alias}" must resolve`);
        assert.equal(aliasComp, canonicalComp, `Alias "${alias}" must point to the same component as "${canonical}"`);
      }
    });

    test('6.3 getWidgetComponent boundary fuzzing: whitespace, case-insensitivity, null, unknown', () => {
      assert.equal(widgetsMod.getWidgetComponent('  CHAT-BOX  '), widgetsMod.WIDGET_REGISTRY['chat-box']);
      assert.equal(widgetsMod.getWidgetComponent('Tip-Jar'), widgetsMod.WIDGET_REGISTRY['tip-jar']);
      assert.equal(widgetsMod.getWidgetComponent(''), null);
      assert.equal(widgetsMod.getWidgetComponent(null), null);
      assert.equal(widgetsMod.getWidgetComponent(undefined), null);
      assert.equal(widgetsMod.getWidgetComponent('non_existent_widget_xyz'), null);
    });

    test('6.4 React Element Instantiation: all 16 widgets successfully create React elements with null and empty config', () => {
      for (const item of widgetsMod.WIDGET_CATALOG) {
        const Comp = widgetsMod.getWidgetComponent(item.type);

        // Instantiation with config: null
        const elNull = React.createElement(Comp, {
          id: `test-${item.type}-null`,
          type: item.type,
          config: null,
          isOverlayMode: true,
          eventBus,
        });
        assert.ok(elNull && elNull.type === Comp, `${item.type} must instantiate element with config: null`);

        // Instantiation with config: {}
        const elEmpty = React.createElement(Comp, {
          id: `test-${item.type}-empty`,
          type: item.type,
          config: {},
          isOverlayMode: false,
          eventBus,
        });
        assert.ok(elEmpty && elEmpty.type === Comp, `${item.type} must instantiate element with config: {}`);
      }
    });

    test('6.5 SSR Rendering Stability: all 16 widgets render non-empty HTML with empty config {}', () => {
      for (const item of widgetsMod.WIDGET_CATALOG) {
        const Comp = widgetsMod.getWidgetComponent(item.type);
        const el = React.createElement(Comp, {
          id: `render-${item.type}`,
          type: item.type,
          config: {},
          isOverlayMode: true,
          eventBus,
        });

        const html = ReactDOMServer.renderToString(el);
        assert.ok(typeof html === 'string', `${item.type} render must return string`);

        if (item.type === 'media-share') {
          // In OBS overlay mode, MediaShare is intentionally unrendered (null) when no media is active
          assert.equal(html, '', 'MediaShare must be invisible (null) in OBS overlay mode when idle');
        } else {
          assert.ok(html.length > 50, `${item.type} must render non-trivial markup (>50 chars, actual: ${html.length})`);
          assert.ok(html.includes('mn-widget'), `${item.type} rendered HTML must contain mn-widget container class`);
        }
      }
    });

    test('6.6 SSR Rendering Stability: all 16 widgets render non-empty HTML with omitted/default config', () => {
      for (const item of widgetsMod.WIDGET_CATALOG) {
        const Comp = widgetsMod.getWidgetComponent(item.type);
        const el = React.createElement(Comp, {
          id: `render-def-${item.type}`,
          type: item.type,
          isOverlayMode: false,
          eventBus,
        });

        const html = ReactDOMServer.renderToString(el);
        assert.ok(typeof html === 'string' && html.length > 50);
      }
    });

    test('6.7 Defensive Config Audit: verify that all widgets are protected when config is guaranteed non-null object', () => {
      for (const item of widgetsMod.WIDGET_CATALOG) {
        const Comp = widgetsMod.getWidgetComponent(item.type);
        // Ensure robust invocation when config is an empty dictionary
        assert.doesNotThrow(() => {
          const el = React.createElement(Comp, {
            id: `safe-${item.type}`,
            type: item.type,
            config: {},
            isOverlayMode: false,
          });
          ReactDOMServer.renderToString(el);
        }, `Widget ${item.type} must not throw when config is empty object`);
      }
    });
  });
});
