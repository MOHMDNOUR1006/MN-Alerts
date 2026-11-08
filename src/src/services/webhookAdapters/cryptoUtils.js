/**
 * cryptoUtils.js - Webhook Cryptographic & Security Utilities
 * Grounded in: PROJECT.md § 1 & Twitch/YouTube/Kick Webhook Security Specifications
 * Zero external dependencies. Works in Node.js and Browser environments.
 */

let _nodeCrypto = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    const req = typeof require !== 'undefined' ? require : null;
    if (req) _nodeCrypto = req('crypto');
  } catch {
    _nodeCrypto = null;
  }
}

// SHA-256 constants for pure JS fallback
const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Bytes(data) {
  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  const len = data.length;
  const bitLenHi = Math.floor(len / 0x20000000);
  const bitLenLo = (len << 3) >>> 0;

  const totalLen = (((len + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(totalLen);
  padded.set(data);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, bitLenHi, false);
  view.setUint32(totalLen - 4, bitLenLo, false);

  const W = new Uint32Array(64);
  const rotr = (n, x) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + (t << 2), false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K256[t] + W[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, H0, false);
  outView.setUint32(4, H1, false);
  outView.setUint32(8, H2, false);
  outView.setUint32(12, H3, false);
  outView.setUint32(16, H4, false);
  outView.setUint32(20, H5, false);
  outView.setUint32(24, H6, false);
  outView.setUint32(28, H7, false);
  return out;
}

/**
 * Timing-safe string comparison preventing timing side-channel attacks.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  if (_nodeCrypto && typeof _nodeCrypto.timingSafeEqual === 'function' && typeof Buffer !== 'undefined') {
    try {
      const bufA = Buffer.from(a, 'utf8');
      const bufB = Buffer.from(b, 'utf8');
      if (bufA.length === bufB.length) {
        return _nodeCrypto.timingSafeEqual(bufA, bufB);
      }
    } catch {}
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Computes HMAC-SHA256 signature in hexadecimal.
 *
 * @param {string} secret
 * @param {string} message
 * @returns {string} Hex-encoded HMAC-SHA256
 */
export function computeHmacSha256(secret, message) {
  const secretStr = String(secret || '');
  const messageStr = String(message || '');

  if (_nodeCrypto && typeof _nodeCrypto.createHmac === 'function') {
    return _nodeCrypto.createHmac('sha256', secretStr).update(messageStr).digest('hex');
  }

  // Pure JS fallback
  const enc = new TextEncoder();
  let key = enc.encode(secretStr);
  const msg = enc.encode(messageStr);

  const blockSize = 64;
  if (key.length > blockSize) {
    key = sha256Bytes(key);
  }
  const keyPadded = new Uint8Array(blockSize);
  keyPadded.set(key);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyPadded[i] ^ 0x5c;
    iKeyPad[i] = keyPadded[i] ^ 0x36;
  }

  const inner = new Uint8Array(blockSize + msg.length);
  inner.set(iKeyPad, 0);
  inner.set(msg, blockSize);
  const innerHash = sha256Bytes(inner);

  const outer = new Uint8Array(blockSize + 32);
  outer.set(oKeyPad, 0);
  outer.set(innerHash, blockSize);
  const outerHash = sha256Bytes(outer);

  let hex = '';
  for (let i = 0; i < outerHash.length; i++) {
    hex += outerHash[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Computes HMAC-SHA1 signature in hexadecimal (used by PubSubHubbub).
 *
 * @param {string} secret
 * @param {string} message
 * @returns {string} Hex-encoded HMAC-SHA1
 */
export function computeHmacSha1(secret, message) {
  const secretStr = String(secret || '');
  const messageStr = String(message || '');

  if (_nodeCrypto && typeof _nodeCrypto.createHmac === 'function') {
    return _nodeCrypto.createHmac('sha1', secretStr).update(messageStr).digest('hex');
  }
  throw new Error('HMAC-SHA1 requires Node crypto environment');
}

/**
 * Validates that an incoming timestamp is within acceptable drift window (default 10 mins).
 * Protects against replay attacks and clock skew.
 *
 * @param {string|number} timestampInput
 * @param {number} [maxDriftMs=600000]
 * @param {number} [now=Date.now()]
 * @returns {{ valid: boolean, reason?: string, deltaMs?: number, eventTime?: number }}
 */
export function validateTimestampDelta(timestampInput, maxDriftMs = 600000, now = Date.now()) {
  let eventTime = NaN;
  if (typeof timestampInput === 'number') {
    eventTime = timestampInput;
  } else if (typeof timestampInput === 'string') {
    eventTime = Date.parse(timestampInput);
  }

  if (isNaN(eventTime)) {
    return { valid: false, reason: 'INVALID_TIMESTAMP', eventTime: null };
  }

  const delta = now - eventTime;

  // Reject events older than maxDriftMs (10 minutes)
  if (delta > maxDriftMs) {
    return { valid: false, reason: 'TIMESTAMP_EXPIRED', deltaMs: delta, eventTime };
  }

  // Reject events from the future beyond maxDriftMs (clock skew protection)
  if (delta < -maxDriftMs) {
    return { valid: false, reason: 'TIMESTAMP_FUTURE_SKEW', deltaMs: delta, eventTime };
  }

  return { valid: true, deltaMs: Math.abs(delta), eventTime };
}

/**
 * In-memory sliding-window replay protection cache.
 */
export class ReplayCache {
  constructor(ttlMs = 900000) { // 15 minutes default TTL
    this.ttlMs = ttlMs;
    this.seen = new Map(); // key -> timestamp
  }

  _cleanup(now = Date.now()) {
    for (const [key, timestamp] of this.seen.entries()) {
      if (now - timestamp > this.ttlMs) {
        this.seen.delete(key);
      }
    }
  }

  /**
   * Checks if an event key has already been seen. If not, records it.
   *
   * @param {string} key
   * @param {number} [now=Date.now()]
   * @returns {boolean} True if duplicate/replay, false if fresh.
   */
  isReplay(key, now = Date.now()) {
    if (!key) return false;
    this._cleanup(now);
    if (this.seen.has(key)) {
      return true;
    }
    this.seen.set(key, now);
    return false;
  }

  clear() {
    this.seen.clear();
  }

  size() {
    return this.seen.size;
  }
}
