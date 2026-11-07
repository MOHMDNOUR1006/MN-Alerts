/**
 * Browser-safe, zero-dependency EventEmitter compatible with both
 * Node.js test harness and Vite browser runtime.
 */
class BrowserSafeEventEmitter {
  constructor() {
    this._events = new Map();
  }

  on(event, listener) {
    if (typeof listener !== 'function') return this;
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event).add(listener);
    return this;
  }

  off(event, listener) {
    if (this._events.has(event)) {
      this._events.get(event).delete(listener);
      if (this._events.get(event).size === 0) {
        this._events.delete(event);
      }
    }
    return this;
  }

  removeListener(event, listener) {
    return this.off(event, listener);
  }

  emit(event, ...args) {
    if (!this._events.has(event)) return false;
    for (const listener of Array.from(this._events.get(event))) {
      try {
        listener(...args);
      } catch (err) {
        console.error(`PriorityAlertQueue listener error on "${event}":`, err);
      }
    }
    return true;
  }

  once(event, listener) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener(...args);
    };
    return this.on(event, onceWrapper);
  }

  removeAllListeners(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
    return this;
  }

  listenerCount(event) {
    return this._events.has(event) ? this._events.get(event).size : 0;
  }
}

/**
 * PriorityAlertQueue
 *
 * Implements AlertQueueInterface from PROJECT.md:
 * - Binary max-heap priority scheduling (0=Critical, 1=Raid, 2=Donation, 3=Sub, 4=Follow)
 * - Lower integer = higher priority (0 > 1 > 2 > 3 > 4)
 * - Stable FIFO tie-breaking by event timestamp + monotonic sequence counter
 * - 5000ms sliding-window deduplication (UUID & payload signature hash)
 * - Automatic stale event expiration (expiresAt < Date.now() or ttlMs)
 * - Queue overflow protection with capacity bound and low-priority eviction
 * - Critical event immediate preemption
 * - Full playback controls (enqueue, dequeue, peek, skip, clear, pause, resume, size, isEmpty, on, off, emit)
 */
export class PriorityAlertQueue extends BrowserSafeEventEmitter {
  constructor(options = {}) {
    super();
    this.maxCapacity = options.maxCapacity || 100;
    this.dedupWindowMs = options.dedupWindowMs || 5000;
    this.heap = []; // Binary heap array
    this.activeAlert = null;
    this.isPaused = false;
    this._seq = 0; // Monotonic counter for stable tie-breaking
    this.seenEventIds = new Map(); // id -> timestamp
    this.seenPayloadHashes = new Map(); // hash -> timestamp
  }

  _hashPayload(event) {
    const type = event.type || '';
    const src = event.platform || event.source || '';
    const sender = event.sender?.name || '';
    const amount = event.payload?.amount !== undefined ? event.payload.amount : '';
    const message = event.payload?.message !== undefined ? event.payload.message : '';
    return `${type}:${src}:${sender}:${amount}:${message}`;
  }

  _cleanDeduplicationCache(now = Date.now()) {
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

  _isExpired(event, now = Date.now()) {
    const exp = event.expiresAt || (event.ttlMs && event.timestamp ? event.timestamp + event.ttlMs : null);
    return Boolean(exp && exp < now);
  }

  /**
   * Evaluates if event `a` has strictly higher precedence than event `b`.
   * Precedence rules:
   * 1. Lower priority number (0 is highest, 4 is lowest)
   * 2. Earlier timestamp (FIFO tie-breaker)
   * 3. Monotonic sequence counter if timestamps match
   */
  _isHigherPriority(a, b) {
    if (a.priority !== b.priority) {
      return a.priority < b.priority;
    }
    const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0;
    const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0;
    if (aTime !== bTime) {
      return aTime < bTime;
    }
    return (a._seq || 0) < (b._seq || 0);
  }

  _heapifyUp(startIndex) {
    let index = startIndex;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this._isHigherPriority(this.heap[index], this.heap[parentIndex])) {
        const temp = this.heap[index];
        this.heap[index] = this.heap[parentIndex];
        this.heap[parentIndex] = temp;
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  _heapifyDown(startIndex) {
    let index = startIndex;
    const length = this.heap.length;
    while (true) {
      let highestIndex = index;
      const leftIndex = 2 * index + 1;
      const rightIndex = 2 * index + 2;

      if (leftIndex < length && this._isHigherPriority(this.heap[leftIndex], this.heap[highestIndex])) {
        highestIndex = leftIndex;
      }
      if (rightIndex < length && this._isHigherPriority(this.heap[rightIndex], this.heap[highestIndex])) {
        highestIndex = rightIndex;
      }
      if (highestIndex !== index) {
        const temp = this.heap[index];
        this.heap[index] = this.heap[highestIndex];
        this.heap[highestIndex] = temp;
        index = highestIndex;
      } else {
        break;
      }
    }
  }

  _insertIntoHeap(event) {
    event._seq = ++this._seq;
    this.heap.push(event);
    this._heapifyUp(this.heap.length - 1);
  }

  _extractRoot() {
    if (this.heap.length === 0) return null;
    const root = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._heapifyDown(0);
    }
    return root;
  }

  _removeFromHeap(index) {
    if (index < 0 || index >= this.heap.length) return null;
    const removed = this.heap[index];
    const last = this.heap.pop();
    if (index < this.heap.length) {
      this.heap[index] = last;
      this._heapifyDown(index);
      this._heapifyUp(index);
    }
    return removed;
  }

  enqueue(event) {
    if (!event || typeof event !== 'object') return false;
    const now = Date.now();
    this._cleanDeduplicationCache(now);

    // 1. Expiration check
    if (this._isExpired(event, now)) {
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

    // 3. Overflow protection: If full, drop lowest-priority item if incoming is higher priority
    if (this.heap.length >= this.maxCapacity) {
      this.emit('queue_overflow', { currentSize: this.heap.length, incoming: event });
      
      let lowestIndex = -1;
      let lowestPriority = -1;
      let lowestTimestamp = Infinity;
      let lowestSeq = Infinity;

      for (let i = 0; i < this.heap.length; i++) {
        const item = this.heap[i];
        if (item.priority > lowestPriority) {
          lowestPriority = item.priority;
          lowestTimestamp = item.timestamp || 0;
          lowestSeq = item._seq || 0;
          lowestIndex = i;
        } else if (item.priority === lowestPriority) {
          if ((item.timestamp || 0) < lowestTimestamp ||
              ((item.timestamp || 0) === lowestTimestamp && (item._seq || 0) < lowestSeq)) {
            lowestTimestamp = item.timestamp || 0;
            lowestSeq = item._seq || 0;
            lowestIndex = i;
          }
        }
      }

      if (lowestIndex !== -1 && event.priority < lowestPriority) {
        this._removeFromHeap(lowestIndex);
      } else {
        return false; // Dropped due to capacity
      }
    }

    // 4. Critical event preemption
    if (event.priority === 0 && this.activeAlert && this.activeAlert.priority > 0) {
      const preempted = this.activeAlert;
      this.activeAlert = null;
      this.emit('alert_preempt', { preempted, preemptor: event });
    }

    // 5. Insert into priority heap
    this._insertIntoHeap(event);

    this._tryProcessNext();
    return true;
  }

  _tryProcessNext() {
    if (this.isPaused || this.activeAlert || this.heap.length === 0) return;
    const nextEvent = this.dequeue();
    if (nextEvent) {
      this.activeAlert = nextEvent;
      this.emit('alert_trigger', nextEvent);
    }
  }

  dequeue() {
    const now = Date.now();
    while (this.heap.length > 0) {
      const candidate = this._extractRoot();
      if (this._isExpired(candidate, now)) {
        continue; // Discard expired event sitting in queue
      }
      return candidate;
    }
    return null;
  }

  peek() {
    const now = Date.now();
    while (this.heap.length > 0) {
      const root = this.heap[0];
      if (this._isExpired(root, now)) {
        this._extractRoot();
      } else {
        return root;
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
    this.heap = [];
    this.activeAlert = null;
    this.emit('queue_cleared');
  }

  pause() {
    this.isPaused = true;
    this.emit('queue_paused');
  }

  resume() {
    this.isPaused = false;
    this.emit('queue_resumed');
    this._tryProcessNext();
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }
}

export default PriorityAlertQueue;
