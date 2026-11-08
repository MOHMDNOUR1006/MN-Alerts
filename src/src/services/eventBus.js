/**
 * eventBus.js — Isomorphic, Zero-Dependency Central Event Bus
 * Grounded in: PROJECT.md § 1 & § 3, MN_ALERTS_AGENT_RESPONSIBILITIES.md (Agent 10)
 *
 * Implements high-throughput event fanout for stream widgets:
 * - Pure ES module with zero external or Node.js dependencies (CEF / browser & Node safe).
 * - Standard Pub/Sub API: on, off, emit, once, dispatch, removeAllListeners, listenerCount.
 * - Multi-subscriber simultaneous fanout (generic 'stream_event' and typed 'donation', 'follow', etc.).
 * - Error isolation: subscriber exceptions are caught safely without blocking peer listeners.
 * - Memory-leak safe: Set-based listener storage, automatic key cleanup, configurable maxListeners.
 * - Bounded history buffer: late-joining widgets can hydrate recent stream events immediately.
 */

import { normalizeStreamEvent } from '../core/queue/EventNormalizer.js';

export class EventBus {
  /**
   * @param {object} [options]
   * @param {number} [options.maxListeners=50] Warning threshold for subscriber count
   * @param {number} [options.maxHistory=50] Maximum bounded event history buffer
   * @param {boolean} [options.debug=false] Verbose logging flag
   */
  constructor(options = {}) {
    this._events = new Map(); // Map<string, Set<Function>>
    this._maxListeners = typeof options.maxListeners === 'number' ? options.maxListeners : 50;
    this._maxHistory = typeof options.maxHistory === 'number' ? options.maxHistory : 50;
    this._history = [];
    this._debug = Boolean(options.debug);
  }

  /**
   * Subscribes a listener to an event.
   * Returns an unsubscribe function for idiomatic React useEffect cleanup.
   *
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (typeof event !== 'string' || typeof handler !== 'function') {
      return () => {};
    }

    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }

    const listeners = this._events.get(event);
    listeners.add(handler);

    if (listeners.size > this._maxListeners) {
      console.warn(
        `[EventBus] MaxListenersExceededWarning: Possible memory leak detected. ${listeners.size} listeners added for event "${event}".`
      );
    }

    return () => this.off(event, handler);
  }

  /**
   * Removes a subscribed listener from an event.
   *
   * @param {string} event
   * @param {Function} handler
   * @returns {EventBus} this
   */
  off(event, handler) {
    if (!this._events.has(event)) return this;

    const listeners = this._events.get(event);
    listeners.delete(handler);

    if (listeners.size === 0) {
      this._events.delete(event);
    }

    return this;
  }

  /**
   * Alias for off(event, handler)
   */
  removeListener(event, handler) {
    return this.off(event, handler);
  }

  /**
   * Subscribes a listener that runs exactly once and then self-unsubscribes.
   *
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    if (typeof event !== 'string' || typeof handler !== 'function') {
      return () => {};
    }

    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      handler(...args);
    };

    return this.on(event, onceWrapper);
  }

  /**
   * Emits an event to all subscribed listeners synchronously.
   * Wraps each listener execution in a try...catch block for error isolation.
   *
   * @param {string} event
   * @param  {...any} args
   * @returns {boolean} true if listeners were called, false otherwise
   */
  emit(event, ...args) {
    if (!this._events.has(event)) return false;

    const listeners = Array.from(this._events.get(event));
    if (listeners.length === 0) return false;

    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (err) {
        console.error(`[EventBus] Error in listener for event "${event}":`, err);
        // Error isolation: do not throw, allow remaining subscribers to execute
      }
    }

    return true;
  }

  /**
   * Canonical ingress dispatcher for StreamEvents.
   * Normalizes the payload and executes multi-channel fanout:
   * 1. Broadcasts to generic 'stream_event' channel
   * 2. Broadcasts to type-specific channel ('donation', 'follow', 'subscribe', etc.)
   * 3. Broadcasts to 'donation_processed' if monetary
   *
   * @param {object} rawOrNormalizedEvent
   * @returns {object} The normalized StreamEvent that was broadcast
   */
  dispatch(rawOrNormalizedEvent) {
    if (!rawOrNormalizedEvent || typeof rawOrNormalizedEvent !== 'object') {
      return null;
    }

    const evt = rawOrNormalizedEvent.timestamp && rawOrNormalizedEvent.id && rawOrNormalizedEvent.sender
      ? rawOrNormalizedEvent
      : normalizeStreamEvent(rawOrNormalizedEvent);

    // Record in bounded history buffer
    this._history.unshift(evt);
    if (this._history.length > this._maxHistory) {
      this._history.pop();
    }

    // 1. Generic stream event fanout (for EventList, StreamLabels, Logger, etc.)
    this.emit('stream_event', evt);

    // 2. Type-specific channel fanout (for GoalWidget, TipJar, ChatBox, etc.)
    if (evt.type) {
      this.emit(evt.type, evt);
    }

    // 3. Monetary processing channel fanout
    if (evt.type === 'donation' || (evt.payload?.amount !== undefined && evt.payload.amount > 0)) {
      this.emit('donation_processed', evt);
    }

    return evt;
  }

  /**
   * Retrieves a copy of recent stream event history.
   *
   * @param {number} [limit=20]
   * @returns {Array<object>}
   */
  getHistory(limit = 20) {
    return this._history.slice(0, Math.max(0, limit));
  }

  /**
   * Clears event history buffer.
   */
  clearHistory() {
    this._history = [];
  }

  /**
   * Removes all listeners for a given event, or all listeners entirely if event is omitted.
   *
   * @param {string} [event]
   * @returns {EventBus} this
   */
  removeAllListeners(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
    return this;
  }

  /**
   * Returns the count of registered listeners for an event.
   *
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    return this._events.has(event) ? this._events.get(event).size : 0;
  }

  /**
   * Returns array of registered event names.
   *
   * @returns {string[]}
   */
  eventNames() {
    return Array.from(this._events.keys());
  }

  /**
   * Sets max listeners warning threshold.
   *
   * @param {number} n
   */
  setMaxListeners(n) {
    this._maxListeners = Math.max(0, n);
  }

  /**
   * Gets max listeners warning threshold.
   *
   * @returns {number}
   */
  getMaxListeners() {
    return this._maxListeners;
  }
}

// Default singleton instance for application-wide sharing
export const eventBus = new EventBus();
export default eventBus;
