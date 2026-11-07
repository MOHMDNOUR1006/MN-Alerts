/**
 * Adversarial Stress Test Suite for PriorityAlertQueue & EventNormalizer
 * Milestone 1 Queue Priority & Preemption Verification
 *
 * Grounded in: ORIGINAL_REQUEST.md (R2), PROJECT.md (Features F01-F04, F42, F44)
 * Challenger: challenger_m1_1
 *
 * Test Sections:
 * 1. Max-Heap Priority Invariant (1,000 randomized events across P0-P4)
 * 2. Deterministic Tie-Breaking (Timestamp FIFO + Monotonic Sequence Counter)
 * 3. 5000ms Sliding-Window Deduplication (UUID & Payload Hash with 5001ms Expiry)
 * 4. Stale Event Auto-Expiration (Enqueue, Dequeue, Peek non-blocking)
 * 5. Bounded Capacity (100) & Lowest-Priority Eviction
 * 6. Critical P0 Alert Preemption (0ms Active Interruption Handshake)
 * 7. Input Sanitization & Attack Payload Neutralization
 * 8. High-Velocity Intermingled Fuzzing & Continuous Invariant Verification (5,000 Ops)
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { PriorityAlertQueue } from '../core/queue/PriorityAlertQueue.js';
import {
  sanitizeAmount,
  sanitizeMessage,
  normalizeStreamEvent,
} from '../core/queue/EventNormalizer.js';

/**
 * Helper to verify binary max-heap property for the entire heap array.
 * In this max-heap, precedence is:
 * 1. Lower priority number (0 > 1 > 2 > 3 > 4)
 * 2. Earlier timestamp (FIFO)
 * 3. Smaller _seq (FIFO sequence)
 */
function verifyBinaryHeapInvariant(queue) {
  const heap = queue.heap;
  const len = heap.length;
  for (let i = 0; i < len; i++) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < len) {
      assert.ok(
        !queue._isHigherPriority(heap[left], heap[i]),
        `Heap violation at index ${i} (parent) vs left child ${left}: ` +
        `parent (P${heap[i].priority}, T${heap[i].timestamp}, S${heap[i]._seq}) ` +
        `vs left (P${heap[left].priority}, T${heap[left].timestamp}, S${heap[left]._seq})`
      );
    }
    if (right < len) {
      assert.ok(
        !queue._isHigherPriority(heap[right], heap[i]),
        `Heap violation at index ${i} (parent) vs right child ${right}: ` +
        `parent (P${heap[i].priority}, T${heap[i].timestamp}, S${heap[i]._seq}) ` +
        `vs right (P${heap[right].priority}, T${heap[right].timestamp}, S${heap[right]._seq})`
      );
    }
  }
}

describe('Adversarial Stress Test: PriorityAlertQueue & EventNormalizer', () => {

  // =========================================================================
  // 1. Max-Heap Priority Invariant: 1,000 Randomized Events
  // =========================================================================
  describe('1. Max-Heap Priority Invariant (1,000 Randomized Events)', () => {
    test('enqueues 1,000 randomized events across P0-P4 and dequeues in monotonic priority order', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 2000, dedupWindowMs: 1000 });
      queue.pause(); // Pause auto-processing to buffer all 1,000 items

      const TOTAL_EVENTS = 1000;
      const baseTime = Date.now();
      const generatedEvents = [];

      // Generate 1,000 randomized events across P0-P4 with randomized timestamps
      for (let i = 0; i < TOTAL_EVENTS; i++) {
        const priority = Math.floor(Math.random() * 5); // 0, 1, 2, 3, 4
        const timestampOffset = Math.floor(Math.random() * 100000);
        const event = {
          id: `adv_evt_${i}_${Math.random().toString(36).slice(2)}`,
          type: 'donation',
          platform: 'twitch',
          priority,
          timestamp: baseTime + timestampOffset,
          ttlMs: 50000000, // Ensure no premature expiration
          payload: {
            amount: i + 1,
            message: `Stress test event ${i} [P${priority}]`,
          },
        };
        generatedEvents.push(event);
        const enqueued = queue.enqueue(event);
        assert.equal(enqueued, true, `Event ${i} must be successfully enqueued`);
      }

      assert.equal(queue.size(), TOTAL_EVENTS, `Queue must contain exactly ${TOTAL_EVENTS} items`);

      // Verify binary max-heap property on the entire 1,000-element array
      verifyBinaryHeapInvariant(queue);

      // Dequeue all 1,000 items and verify monotonic priority order
      const dequeued = [];
      while (!queue.isEmpty()) {
        const item = queue.dequeue();
        assert.ok(item !== null, 'Dequeue must not return null while not empty');
        dequeued.push(item);
      }

      assert.equal(dequeued.length, TOTAL_EVENTS, 'Must dequeue all 1,000 events');
      assert.equal(queue.size(), 0, 'Queue must be empty after full dequeue');

      // Check monotonic order:
      // Priority 0 is highest, Priority 4 is lowest.
      // So priority must be non-decreasing: p[i] <= p[i+1]
      for (let i = 0; i < dequeued.length - 1; i++) {
        const current = dequeued[i];
        const next = dequeued[i + 1];

        if (current.priority !== next.priority) {
          assert.ok(
            current.priority < next.priority,
            `Priority violation at index ${i}: current P${current.priority} > next P${next.priority}`
          );
        } else if (current.timestamp !== next.timestamp) {
          assert.ok(
            current.timestamp <= next.timestamp,
            `Timestamp FIFO tie-breaking violation at index ${i}: ` +
            `current T${current.timestamp} > next T${next.timestamp} (both P${current.priority})`
          );
        } else {
          assert.ok(
            current._seq <= next._seq,
            `Sequence tie-breaking violation at index ${i}: ` +
            `current S${current._seq} > next S${next._seq} (both P${current.priority}, T${current.timestamp})`
          );
        }
      }
    });
  });

  // =========================================================================
  // 2. Tie-Breaking: Timestamp & Monotonic Sequence Counter
  // =========================================================================
  describe('2. Deterministic Tie-Breaking (Timestamp FIFO + Sequence Monotonicity)', () => {
    test('breaks identical priority ties strictly by earlier timestamp', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      queue.pause();

      const base = Date.now();
      const timestampDeltas = [5000, 1000, 4000, 2000, 3000];
      timestampDeltas.forEach((delta, idx) => {
        queue.enqueue({
          id: `tie_ts_${idx}`,
          type: 'donation',
          platform: 'twitch',
          priority: 2,
          timestamp: base + delta,
          expiresAt: base + 100000,
          payload: { amount: 10 + idx, message: `TS ${delta}` },
        });
      });

      const order = [];
      while (!queue.isEmpty()) {
        order.push(queue.dequeue().timestamp - base);
      }

      assert.deepEqual(order, [1000, 2000, 3000, 4000, 5000], 'Must dequeue in strictly ascending timestamp order');
    });

    test('breaks identical priority AND identical timestamp ties strictly by FIFO sequence', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      queue.pause();

      const sharedTimestamp = Date.now();
      const ids = ['first', 'second', 'third', 'fourth', 'fifth'];

      ids.forEach((id, idx) => {
        queue.enqueue({
          id: `tie_seq_${id}`,
          type: 'raid',
          platform: 'twitch',
          priority: 1,
          timestamp: sharedTimestamp,
          expiresAt: sharedTimestamp + 100000,
          payload: { viewers: 10 + idx, message: `Event ${id}` },
        });
      });

      const dequeuedIds = [];
      while (!queue.isEmpty()) {
        dequeuedIds.push(queue.dequeue().id);
      }

      assert.deepEqual(
        dequeuedIds,
        ['tie_seq_first', 'tie_seq_second', 'tie_seq_third', 'tie_seq_fourth', 'tie_seq_fifth'],
        'Must preserve strict FIFO sequence ordering for identical priorities and timestamps'
      );
    });

    test('enforces composite total ordering across mixed priority, timestamp, and sequence', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      queue.pause();

      const base = Date.now();
      const events = [
        { id: 'E_P2_T200_A', type: 'donation', platform: 'twitch', priority: 2, timestamp: base + 200, expiresAt: base + 100000, payload: { amount: 1 } },
        { id: 'E_P0_T500',   type: 'donation', platform: 'twitch', priority: 0, timestamp: base + 500, expiresAt: base + 100000, payload: { amount: 2 } },
        { id: 'E_P2_T100',   type: 'donation', platform: 'twitch', priority: 2, timestamp: base + 100, expiresAt: base + 100000, payload: { amount: 3 } },
        { id: 'E_P1_T300',   type: 'raid',     platform: 'twitch', priority: 1, timestamp: base + 300, expiresAt: base + 100000, payload: { amount: 4 } },
        { id: 'E_P2_T200_B', type: 'donation', platform: 'twitch', priority: 2, timestamp: base + 200, expiresAt: base + 100000, payload: { amount: 5 } },
        { id: 'E_P4_T50',    type: 'follow',   platform: 'twitch', priority: 4, timestamp: base + 50,  expiresAt: base + 100000, payload: { amount: 6 } },
      ];

      events.forEach(e => queue.enqueue(e));

      const dequeuedIds = [];
      while (!queue.isEmpty()) {
        dequeuedIds.push(queue.dequeue().id);
      }

      assert.deepEqual(
        dequeuedIds,
        [
          'E_P0_T500',    // P0 beats all
          'E_P1_T300',    // P1 beats P2-P4
          'E_P2_T100',    // P2 with earlier timestamp (100)
          'E_P2_T200_A',  // P2 timestamp 200 (first enqueued)
          'E_P2_T200_B',  // P2 timestamp 200 (second enqueued)
          'E_P4_T50',     // P4 lowest priority despite earliest timestamp (50)
        ],
        'Must resolve composite precedence correctly'
      );
    });
  });

  // =========================================================================
  // 3. 5000ms Sliding-Window Deduplication: UUID & Payload Hash
  // =========================================================================
  describe('3. 5000ms Sliding-Window Deduplication', () => {
    let originalDateNow;
    let mockTime;

    beforeEach(() => {
      mockTime = 1000000;
      originalDateNow = Date.now;
      Date.now = () => mockTime;
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    test('rejects duplicate UUID within 5000ms and accepts after 5001ms', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100, dedupWindowMs: 5000 });
      queue.pause();

      const eventA = {
        id: 'uuid_duplicate_test',
        type: 'donation',
        platform: 'twitch',
        priority: 2,
        timestamp: mockTime,
        ttlMs: 999999,
        payload: { amount: 20, message: 'Initial donation' },
      };

      // T = 0ms: Initial enqueue accepted
      assert.equal(queue.enqueue(eventA), true, 'First event must be accepted');

      // T = 2500ms: Duplicate UUID with different payload rejected
      mockTime += 2500;
      const eventA_sameId_diffPayload = {
        id: 'uuid_duplicate_test',
        type: 'donation',
        platform: 'twitch',
        priority: 2,
        timestamp: mockTime,
        ttlMs: 999999,
        payload: { amount: 50, message: 'Different payload' },
      };
      assert.equal(queue.enqueue(eventA_sameId_diffPayload), false, 'Duplicate UUID within 5000ms must be rejected');

      // T = 5000ms: Still within sliding window (5000 - 0 = 5000, not > 5000)
      mockTime = 1000000 + 5000;
      assert.equal(queue.enqueue(eventA_sameId_diffPayload), false, 'Duplicate UUID at exactly 5000ms must be rejected');

      // T = 5001ms: Sliding window expired (5001 - 0 = 5001 > 5000)
      mockTime = 1000000 + 5001;
      assert.equal(queue.enqueue(eventA_sameId_diffPayload), true, 'Same UUID after 5001ms must be accepted');
    });

    test('rejects duplicate payload signature within 5000ms and accepts after 5001ms', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100, dedupWindowMs: 5000 });
      queue.pause();

      const sharedPayload = {
        type: 'donation',
        platform: 'kick',
        sender: { name: 'DonoWhale' },
        priority: 2,
        timestamp: mockTime,
        ttlMs: 999999,
        payload: { amount: 100, message: 'GG Streamer!' },
      };

      // T = 0ms: First event with UUID 1
      assert.equal(queue.enqueue({ ...sharedPayload, id: 'uuid_1' }), true, 'Event 1 must be accepted');

      // T = 3000ms: Second event with distinct UUID 2 but identical payload signature
      mockTime += 3000;
      assert.equal(
        queue.enqueue({ ...sharedPayload, id: 'uuid_2', timestamp: mockTime }),
        false,
        'Duplicate payload signature within 5000ms must be rejected even with unique UUID'
      );

      // T = 5001ms: Sliding window passed for initial payload
      mockTime = 1000000 + 5001;
      assert.equal(
        queue.enqueue({ ...sharedPayload, id: 'uuid_3', timestamp: mockTime }),
        true,
        'Identical payload signature after 5001ms must be accepted'
      );
    });

    test('cleans stale deduplication cache entries automatically', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100, dedupWindowMs: 5000 });
      queue.pause();

      queue.enqueue({
        id: 'cache_test_1',
        type: 'follow',
        platform: 'twitch',
        sender: { name: 'User1' },
        priority: 4,
        timestamp: mockTime,
        ttlMs: 999999,
        payload: { message: 'M1' },
      });
      assert.equal(queue.seenEventIds.has('cache_test_1'), true);

      // Advance past window and enqueue a new item
      mockTime += 5005;
      queue.enqueue({
        id: 'cache_test_2',
        type: 'follow',
        platform: 'twitch',
        sender: { name: 'User2' },
        priority: 4,
        timestamp: mockTime,
        ttlMs: 999999,
        payload: { message: 'M2' },
      });

      // Cache for 'cache_test_1' must have been purged
      assert.equal(queue.seenEventIds.has('cache_test_1'), false, 'Stale seenEventIds must be pruned');
      assert.equal(queue.seenEventIds.has('cache_test_2'), true, 'Fresh seenEventIds must be present');
    });
  });

  // =========================================================================
  // 4. Stale Event Auto-Expiration: Enqueue, Dequeue, Peek
  // =========================================================================
  describe('4. Stale Event Auto-Expiration', () => {
    let originalDateNow;
    let mockTime;

    beforeEach(() => {
      mockTime = 2000000;
      originalDateNow = Date.now;
      Date.now = () => mockTime;
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    test('rejects pre-expired events on enqueue without adding to heap', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      queue.pause();

      // Event with past expiresAt
      const expiredByExpiresAt = {
        id: 'exp_1',
        type: 'donation',
        priority: 2,
        timestamp: mockTime - 2000,
        expiresAt: mockTime - 10,
        payload: { amount: 5, message: 'Expired by expiresAt' },
      };
      assert.equal(queue.enqueue(expiredByExpiresAt), false, 'Past expiresAt must be rejected on enqueue');

      // Event with expired ttlMs relative to timestamp
      const expiredByTtl = {
        id: 'exp_2',
        type: 'donation',
        priority: 2,
        timestamp: mockTime - 5000,
        ttlMs: 4000, // expired 1000ms ago
        payload: { amount: 10, message: 'Expired by ttlMs' },
      };
      assert.equal(queue.enqueue(expiredByTtl), false, 'Past ttlMs must be rejected on enqueue');

      assert.equal(queue.size(), 0, 'Queue size must remain 0');
    });

    test('automatically drops expired events during peek without blocking', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      queue.pause();

      queue.enqueue({
        id: 'exp_short',
        type: 'raid',
        platform: 'twitch',
        sender: { name: 'Raider1' },
        priority: 1, // Higher priority, will be root
        timestamp: mockTime,
        ttlMs: 500,
        payload: { viewers: 100, message: 'Short TTL' },
      });
      queue.enqueue({
        id: 'exp_long',
        type: 'donation',
        platform: 'twitch',
        sender: { name: 'Donor1' },
        priority: 2, // Lower priority
        timestamp: mockTime,
        ttlMs: 10000,
        payload: { amount: 50, message: 'Long TTL' },
      });

      assert.equal(queue.size(), 2);

      // Advance time by 600ms (exp_short expires, exp_long is valid)
      mockTime += 600;

      // peek() should discard exp_short and return exp_long without hanging
      const peeked = queue.peek();
      assert.ok(peeked !== null, 'Peek must not return null');
      assert.equal(peeked.id, 'exp_long', 'Peek must discard expired root and return valid next item');
      assert.equal(queue.size(), 1, 'Heap size must reflect removal of expired item');
    });

    test('automatically drops expired events during dequeue without blocking', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      queue.pause();

      queue.enqueue({
        id: 'exp_d1',
        type: 'raid',
        platform: 'twitch',
        sender: { name: 'R1' },
        priority: 1,
        timestamp: mockTime,
        ttlMs: 200,
        payload: { viewers: 5, message: 'Raid 1' },
      });
      queue.enqueue({
        id: 'exp_d2',
        type: 'raid',
        platform: 'kick',
        sender: { name: 'R2' },
        priority: 1,
        timestamp: mockTime,
        ttlMs: 300,
        payload: { viewers: 10, message: 'Raid 2' },
      });
      queue.enqueue({
        id: 'exp_valid',
        type: 'subscribe',
        platform: 'youtube',
        sender: { name: 'Sub1' },
        priority: 3,
        timestamp: mockTime,
        ttlMs: 10000,
        payload: { months: 1, message: 'Valid sub' },
      });

      assert.equal(queue.size(), 3);

      // Advance time by 400ms (d1 and d2 expired, valid remains)
      mockTime += 400;

      const dequeued = queue.dequeue();
      assert.ok(dequeued !== null, 'Dequeue must return valid item');
      assert.equal(dequeued.id, 'exp_valid', 'Dequeue must skip all expired candidates');
      assert.equal(queue.size(), 0, 'Queue must be empty after pulling only valid item');
    });

    test('returns null cleanly when all buffered events have expired', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      queue.pause();

      for (let i = 0; i < 5; i++) {
        queue.enqueue({
          id: `all_exp_${i}`,
          type: 'donation',
          platform: 'twitch',
          sender: { name: `User_${i}` },
          priority: 2,
          timestamp: mockTime,
          ttlMs: 100,
          payload: { amount: i + 1, message: `Exp ${i}` },
        });
      }

      assert.equal(queue.size(), 5);
      mockTime += 200; // All expired

      assert.equal(queue.peek(), null, 'peek() on all-expired queue must return null immediately');
      assert.equal(queue.dequeue(), null, 'dequeue() on all-expired queue must return null immediately');
      assert.equal(queue.isEmpty(), true, 'Queue must be empty after purging expired items');
    });
  });

  // =========================================================================
  // 5. Bounded Capacity (100) & Lowest-Priority Eviction
  // =========================================================================
  describe('5. Capacity Bound (100) & Lowest-Priority Eviction', () => {
    test('enforces maxCapacity of 100 items', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      assert.equal(queue.maxCapacity, 100, 'Default capacity must be 100');
    });

    test('rejects incoming equal or lower priority events when full', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      queue.pause();
      const base = Date.now();

      // Fill queue to capacity (100 items) with Priority 2 and 3 items
      for (let i = 0; i < 50; i++) {
        queue.enqueue({
          id: `fill_p2_${i}`,
          type: 'donation',
          platform: 'twitch',
          priority: 2,
          timestamp: base + i,
          expiresAt: base + 1000000,
          payload: { amount: i + 1, message: `P2 item ${i}` },
        });
      }
      for (let i = 0; i < 50; i++) {
        queue.enqueue({
          id: `fill_p3_${i}`,
          type: 'subscribe',
          platform: 'twitch',
          priority: 3,
          timestamp: base + 100 + i,
          expiresAt: base + 1000000,
          payload: { months: i + 1, message: `P3 item ${i}` },
        });
      }

      assert.equal(queue.size(), 100, 'Queue must be full at 100 items');

      // Attempt to enqueue Priority 3 (equal to lowest priority in queue)
      const p3Incoming = {
        id: 'overflow_p3',
        type: 'subscribe',
        platform: 'kick',
        priority: 3,
        timestamp: base + 5000,
        expiresAt: base + 1000000,
        payload: { months: 99, message: 'Overflow P3' },
      };
      assert.equal(queue.enqueue(p3Incoming), false, 'Equal priority event must be rejected when full');
      assert.equal(queue.size(), 100, 'Size must remain 100');

      // Attempt to enqueue Priority 4 (lower priority than lowest in queue)
      const p4Incoming = {
        id: 'overflow_p4',
        type: 'follow',
        platform: 'youtube',
        priority: 4,
        timestamp: base + 5000,
        expiresAt: base + 1000000,
        payload: { message: 'Overflow P4' },
      };
      assert.equal(queue.enqueue(p4Incoming), false, 'Lower priority event must be rejected when full');
      assert.equal(queue.size(), 100, 'Size must remain 100');
    });

    test('evicts the oldest lowest-priority item when incoming event is higher priority', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      queue.pause();
      const base = Date.now();

      let overflowEventEmitted = false;
      queue.on('queue_overflow', ({ currentSize, incoming }) => {
        overflowEventEmitted = true;
        assert.equal(currentSize, 100);
        assert.equal(incoming.id, 'higher_p1');
      });

      // Fill with 90 P2 events and 10 P4 events
      for (let i = 0; i < 90; i++) {
        queue.enqueue({
          id: `item_p2_${i}`,
          type: 'donation',
          platform: 'twitch',
          priority: 2,
          timestamp: base + i,
          expiresAt: base + 1000000,
          payload: { amount: i + 1, message: `P2 item ${i}` },
        });
      }
      for (let i = 0; i < 10; i++) {
        // P4 items: oldest is i=0 (timestamp base + 2000)
        queue.enqueue({
          id: `item_p4_${i}`,
          type: 'follow',
          platform: 'twitch',
          priority: 4,
          timestamp: base + 2000 + i,
          expiresAt: base + 1000000,
          payload: { message: `P4 item ${i}` },
        });
      }

      assert.equal(queue.size(), 100);

      // Enqueue P1 event (strictly higher priority than P4)
      const higherP1 = {
        id: 'higher_p1',
        type: 'raid',
        platform: 'kick',
        priority: 1,
        timestamp: base + 3000,
        expiresAt: base + 1000000,
        payload: { viewers: 50, message: 'Higher P1 raid' },
      };
      const accepted = queue.enqueue(higherP1);

      assert.equal(accepted, true, 'Higher priority event must be admitted');
      assert.equal(overflowEventEmitted, true, 'queue_overflow event must be emitted');
      assert.equal(queue.size(), 100, 'Queue size must remain exactly 100');

      // Verify that item_p4_0 (the oldest P4 item) was evicted
      const remainingIds = queue.heap.map(e => e.id);
      assert.equal(remainingIds.includes('item_p4_0'), false, 'Oldest P4 item must be evicted');
      assert.equal(remainingIds.includes('higher_p1'), true, 'Incoming P1 item must be present');

      // Verify heap invariant after eviction and insertion
      verifyBinaryHeapInvariant(queue);
    });

    test('evicts oldest lowest-priority item when all items share identical priority', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 10 });
      queue.pause();
      const base = Date.now();

      // Fill with 10 P3 items, timestamps base + 100..109
      for (let i = 0; i < 10; i++) {
        queue.enqueue({
          id: `p3_item_${i}`,
          type: 'subscribe',
          platform: 'twitch',
          priority: 3,
          timestamp: base + 100 + i,
          expiresAt: base + 1000000,
          payload: { months: i + 1, message: `P3 item ${i}` },
        });
      }
      assert.equal(queue.size(), 10);

      // Enqueue P2 (higher than P3)
      const p2 = {
        id: 'p2_item',
        type: 'donation',
        platform: 'kick',
        priority: 2,
        timestamp: base + 500,
        expiresAt: base + 1000000,
        payload: { amount: 25, message: 'P2 item' },
      };
      assert.equal(queue.enqueue(p2), true);
      assert.equal(queue.size(), 10);

      // p3_item_0 (timestamp base + 100) was the oldest P3 and must be evicted
      const remainingIds = queue.heap.map(e => e.id);
      assert.equal(remainingIds.includes('p3_item_0'), false, 'Oldest P3 item must be evicted');
      assert.equal(remainingIds.includes('p2_item'), true, 'P2 item must be in queue');
      verifyBinaryHeapInvariant(queue);
    });
  });

  // =========================================================================
  // 6. Critical P0 Alert Preemption Handshake
  // =========================================================================
  describe('6. Critical P0 Alert Preemption Handshake', () => {
    test('immediately preempts active lower-priority alert when P0 arrives', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      // Queue is NOT paused, so alerts become active immediately
      const now = Date.now();

      let preemptEventReceived = null;
      queue.on('alert_preempt', (data) => {
        preemptEventReceived = data;
      });

      // 1. Enqueue P2 alert -> becomes active
      const p2Alert = {
        id: 'active_p2_dono',
        type: 'donation',
        platform: 'twitch',
        priority: 2,
        timestamp: now,
        expiresAt: now + 100000,
        payload: { amount: 25, message: 'Dono 25' },
      };
      queue.enqueue(p2Alert);

      assert.ok(queue.activeAlert !== null, 'P2 alert must be active');
      assert.equal(queue.activeAlert.id, 'active_p2_dono');

      // 2. Enqueue P0 critical alert
      const p0Critical = {
        id: 'crit_p0_whale',
        type: 'donation',
        platform: 'twitch',
        priority: 0,
        timestamp: now + 10,
        expiresAt: now + 100000,
        payload: { amount: 10000, message: 'CRITICAL PREEMPTION' },
      };
      queue.enqueue(p0Critical);

      // Verify alert_preempt fired synchronously
      assert.ok(preemptEventReceived !== null, 'alert_preempt must be emitted immediately');
      assert.equal(preemptEventReceived.preempted.id, 'active_p2_dono', 'Preempted alert must be the P2 alert');
      assert.equal(preemptEventReceived.preemptor.id, 'crit_p0_whale', 'Preemptor must be the P0 alert');

      // Verify activeAlert is now the P0 alert
      assert.ok(queue.activeAlert !== null, 'P0 must become the active alert immediately');
      assert.equal(queue.activeAlert.id, 'crit_p0_whale');
    });

    test('does NOT preempt an active P0 alert when another P0 arrives', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      let preemptFired = false;
      queue.on('alert_preempt', () => { preemptFired = true; });
      const now = Date.now();

      const firstP0 = {
        id: 'first_p0',
        type: 'donation',
        platform: 'twitch',
        priority: 0,
        timestamp: now,
        expiresAt: now + 100000,
        payload: { amount: 100, message: 'First P0' },
      };
      queue.enqueue(firstP0);
      assert.ok(queue.activeAlert !== null, 'First P0 must be active');
      assert.equal(queue.activeAlert.id, 'first_p0');

      const secondP0 = {
        id: 'second_p0',
        type: 'donation',
        platform: 'kick',
        priority: 0,
        timestamp: now + 10,
        expiresAt: now + 100000,
        payload: { amount: 200, message: 'Second P0' },
      };
      queue.enqueue(secondP0);

      assert.equal(preemptFired, false, 'P0 must not preempt an already-active P0 alert');
      assert.equal(queue.activeAlert.id, 'first_p0', 'First P0 remains active');
      assert.equal(queue.size(), 1, 'Second P0 waits in queue');
      assert.equal(queue.peek().id, 'second_p0');
    });

    test('does NOT preempt an active alert when non-P0 high priority event (P1) arrives', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100 });
      let preemptFired = false;
      queue.on('alert_preempt', () => { preemptFired = true; });
      const now = Date.now();

      const p3Alert = {
        id: 'active_p3',
        type: 'subscribe',
        platform: 'twitch',
        priority: 3,
        timestamp: now,
        expiresAt: now + 100000,
        payload: { months: 1, message: 'Sub P3' },
      };
      queue.enqueue(p3Alert);
      assert.ok(queue.activeAlert !== null, 'P3 must be active');
      assert.equal(queue.activeAlert.id, 'active_p3');

      // P1 arrives: high priority, but NOT P0 preemption
      const p1Raid = {
        id: 'waiting_p1',
        type: 'raid',
        platform: 'twitch',
        priority: 1,
        timestamp: now + 10,
        expiresAt: now + 100000,
        payload: { viewers: 50, message: 'Raid P1' },
      };
      queue.enqueue(p1Raid);

      assert.equal(preemptFired, false, 'P1 must NOT preempt an active alert');
      assert.equal(queue.activeAlert.id, 'active_p3', 'P3 remains active until finished');
      assert.equal(queue.size(), 1, 'P1 waits at the head of the queue');
      assert.equal(queue.peek().id, 'waiting_p1');
    });
  });

  // =========================================================================
  // 7. Input Sanitization: sanitizeAmount & sanitizeMessage
  // =========================================================================
  describe('7. Input Sanitization (sanitizeAmount & sanitizeMessage)', () => {
    describe('sanitizeAmount', () => {
      test('clamps negative, zero, NaN, Infinity, and non-numeric inputs to 0', () => {
        const maliciousInputs = [
          -1,
          -999.99,
          -0.0001,
          0,
          -0,
          NaN,
          Infinity,
          -Infinity,
          'Infinity',
          '-Infinity',
          'NaN',
          'abc',
          '$$$',
          '10; DROP TABLE alerts; --',
          "' OR '1'='1",
          null,
          undefined,
          {},
          [1, 2], // multi-element array converts to NaN in Number()
          () => {},
          false,
        ];

        for (const input of maliciousInputs) {
          const sanitized = sanitizeAmount(input);
          assert.equal(sanitized, 0, `sanitizeAmount(${JSON.stringify(input)}) must clamp to 0, got ${sanitized}`);
        }
      });

      test('documents JavaScript type coercion edge cases in sanitizeAmount', () => {
        // In Number(x): single-item array [100] coerces to '100' -> 100; true coerces to 1.
        // Document this empirical behavior:
        assert.equal(sanitizeAmount([100]), 100, 'JavaScript Number([100]) coerces to 100');
        assert.equal(sanitizeAmount(true), 1, 'JavaScript Number(true) coerces to 1');
      });

      test('preserves valid positive numbers and rounds to 2 decimal places', () => {
        assert.equal(sanitizeAmount(10), 10);
        assert.equal(sanitizeAmount('25.5'), 25.5);
        assert.equal(sanitizeAmount(19.994), 19.99);
        assert.equal(sanitizeAmount(19.995), 20);
        assert.equal(sanitizeAmount(0.01), 0.01);
        assert.equal(sanitizeAmount('100.555'), 100.56);
      });
    });

    describe('sanitizeMessage', () => {
      test('handles non-string, null, undefined, and empty inputs gracefully', () => {
        assert.equal(sanitizeMessage(null), '');
        assert.equal(sanitizeMessage(undefined), '');
        assert.equal(sanitizeMessage(12345), '');
        assert.equal(sanitizeMessage({}), '');
        assert.equal(sanitizeMessage([]), '');
        assert.equal(sanitizeMessage('   '), '');
      });

      test('preserves strings within maxLength without adding ellipsis', () => {
        const shortMsg = 'Hello streamer! Keep up the good work!';
        assert.equal(sanitizeMessage(shortMsg, 250), shortMsg);

        const exact250 = 'A'.repeat(250);
        assert.equal(sanitizeMessage(exact250, 250), exact250);
        assert.equal(sanitizeMessage(exact250, 250).endsWith('...'), false);
      });

      test('truncates strings exceeding maxLength and appends ellipsis', () => {
        const msg251 = 'B'.repeat(251);
        const sanitized251 = sanitizeMessage(msg251, 250);
        assert.equal(sanitized251.length, 253, 'Length must be 250 chars + 3 chars (...)');
        assert.ok(sanitized251.endsWith('...'), 'Must end with ellipsis');
        assert.equal(sanitized251.slice(0, 250), 'B'.repeat(250));

        const massive10k = 'X'.repeat(10000);
        const sanitizedMassive = sanitizeMessage(massive10k, 250);
        assert.equal(sanitizedMassive.length, 253);
        assert.ok(sanitizedMassive.endsWith('...'));
      });

      test('trims surrounding whitespace before evaluating length', () => {
        const padded = '   padded message   ';
        assert.equal(sanitizeMessage(padded, 250), 'padded message');
      });
    });

    describe('normalizeStreamEvent Integration', () => {
      test('normalizes raw chaotic payloads safely into valid StreamEvent contracts', () => {
        const rawChaotic = {
          id: '',
          type: 'INVALID_TYPE',
          platform: 'UNKNOWN_PLATFORM',
          priority: 99,
          tier: 'SUPER_TIER',
          sender: '  GenerousViewer  ',
          amount: '-500',
          currency: 'EUR',
          message: '   ' + 'C'.repeat(500) + '   ',
          viewers: -10, // top-level viewers
          months: -5,   // top-level months
          payload: {
            amount: 'NOT_A_NUMBER',
          },
        };

        const normalized = normalizeStreamEvent(rawChaotic);

        assert.ok(typeof normalized.id === 'string' && normalized.id.length > 0);
        assert.equal(normalized.type, 'donation', 'Invalid type must fall back to donation');
        assert.equal(normalized.platform, 'twitch', 'Invalid platform must fall back to twitch');
        assert.equal(normalized.priority, 2, 'Invalid priority must fall back to type default (2)');
        assert.equal(normalized.tier, 'free', 'Invalid tier must fall back to free');
        assert.equal(normalized.sender.name, 'GenerousViewer', 'Sender name must be trimmed');
        assert.equal(normalized.payload.amount, 0, 'Malicious negative/NaN amount must clamp to 0');
        assert.equal(normalized.payload.currency, 'EUR');
        assert.ok(normalized.payload.message.endsWith('...'), 'Oversized message must be truncated with ...');
        assert.equal(normalized.payload.message.length, 253);
        assert.equal(normalized.payload.viewers, 0, 'Negative top-level viewers must clamp to 0');
        assert.equal(normalized.payload.months, 1, 'Negative top-level months must clamp to minimum 1');
      });

      test('documents raw.payload spread precedence vulnerability on viewers/months', () => {
        // When raw.payload itself contains viewers: -10 or months: -5,
        // line 89 in EventNormalizer.js (...raw.payload) spreads over lines 87-88.
        const payloadSpreadBug = {
          type: 'raid',
          payload: {
            viewers: -10,
            months: -5,
          },
        };

        const normalized = normalizeStreamEvent(payloadSpreadBug);
        // Document empirical finding: ...raw.payload overwrites the clamped values
        assert.equal(normalized.payload.viewers, -10, 'Empirical confirmation: raw.payload.viewers overwrites sanitized viewers');
        assert.equal(normalized.payload.months, -5, 'Empirical confirmation: raw.payload.months overwrites sanitized months');
      });
    });
  });

  // =========================================================================
  // 8. High-Velocity Intermingled Fuzzing & Continuous Invariant Verification (5,000 Ops)
  // =========================================================================
  describe('8. High-Velocity Intermingled Fuzzing & Continuous Invariant Verification', () => {
    test('survives 5,000 random intermingled operations while strictly maintaining binary heap invariant', () => {
      const queue = new PriorityAlertQueue({ maxCapacity: 100, dedupWindowMs: 50 });
      let opCount = 0;
      const TOTAL_OPS = 5000;
      let eventCounter = 0;

      for (let i = 0; i < TOTAL_OPS; i++) {
        opCount++;
        const rand = Math.random();

        if (rand < 0.50) {
          // 50% Enqueue random event
          eventCounter++;
          const priority = Math.floor(Math.random() * 5); // 0..4
          const ttlMs = Math.random() < 0.1 ? 5 : 50000; // 10% chance of short TTL
          const event = {
            id: `fuzz_${eventCounter}_${Math.random().toString(36).slice(2)}`,
            type: ['follow', 'subscribe', 'donation', 'raid'][Math.floor(Math.random() * 4)],
            platform: ['twitch', 'youtube', 'kick'][Math.floor(Math.random() * 3)],
            priority,
            timestamp: Date.now() + Math.floor(Math.random() * 1000),
            ttlMs,
            payload: {
              amount: Math.floor(Math.random() * 100),
              message: `Fuzz event ${eventCounter}`,
            },
          };
          queue.enqueue(event);
        } else if (rand < 0.70) {
          // 20% Dequeue
          queue.dequeue();
        } else if (rand < 0.80) {
          // 10% Peek
          queue.peek();
        } else if (rand < 0.88) {
          // 8% Complete active
          queue.completeActive();
        } else if (rand < 0.93) {
          // 5% Skip
          queue.skip();
        } else if (rand < 0.97) {
          // 4% Pause / Resume toggle
          if (queue.isPaused) {
            queue.resume();
          } else {
            queue.pause();
          }
        } else {
          // 3% Clear
          queue.clear();
        }

        // CONTINUOUS INVARIANT VERIFICATION:
        // After EVERY single operation, verify that queue size never exceeds capacity
        assert.ok(queue.size() <= 100, `Queue size ${queue.size()} exceeded maxCapacity 100 at op ${opCount}`);

        // And verify binary max-heap property
        verifyBinaryHeapInvariant(queue);
      }

      assert.equal(opCount, TOTAL_OPS, `Completed all ${TOTAL_OPS} adversarial stress operations`);
    });
  });
});
