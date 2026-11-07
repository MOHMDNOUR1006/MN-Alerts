/**
 * HMAC Token Service for MN Alerts OBS Browser Source URLs
 *
 * Implements:
 * 1. generateToken(sceneId, secret, expiresInMs): Generates base64url signed token
 * 2. verifyToken(tokenString, secret): Cryptographically validates HMAC-SHA256 signature,
 *    expiration, payload integrity, and constant-time comparison.
 * 3. generateObsUrl(sceneId, options): Ready-to-use OBS browser source URL
 *
 * Isomorphic Architecture:
 * - Compatible with Node.js runtime (Node test runner) and Browser runtime (OBS CEF / Vite).
 * - Implements pure JavaScript fallback for HMAC-SHA256 and constant-time comparison
 *   to ensure zero external dependencies and seamless browser bundling without polyfills.
 * - Leverages Node.js `node:crypto` when available for maximum C++ acceleration.
 */

// Default shared secret for signing OBS overlay URLs
export const DEFAULT_SECRET = 'mn_alerts_secure_hmac_key_2026';
export const DEFAULT_EXPIRATION_MS = 86400000; // 24 hours

// Optional synchronous reference to node:crypto in Node environment
let _nodeCrypto = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    const req = typeof require !== 'undefined' ? require : null;
    if (req) {
      _nodeCrypto = req('crypto');
    }
  } catch {
    _nodeCrypto = null;
  }
}

// ============================================================================
// Pure JS SHA-256 and HMAC-SHA256 (RFC 2104 / FIPS 180-4)
// ============================================================================

const K = [
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
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
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

function computeHmacSha256(keyStr, msgStr) {
  if (_nodeCrypto && typeof _nodeCrypto.createHmac === 'function') {
    return _nodeCrypto.createHmac('sha256', keyStr).update(msgStr).digest('hex');
  }

  // Pure JS fallback
  const enc = new TextEncoder();
  let key = enc.encode(keyStr);
  const msg = enc.encode(msgStr);

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

  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(oKeyPad, 0);
  outer.set(innerHash, blockSize);
  const outerHash = sha256Bytes(outer);

  return Array.from(outerHash).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Isomorphic Base64URL and Timing-Safe Comparison
// ============================================================================

function encodeBase64Url(str) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64url');
  }
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeBase64Url(b64url) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64url, 'base64url').toString('utf8');
  }
  let base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  if (_nodeCrypto && typeof _nodeCrypto.timingSafeEqual === 'function' && typeof Buffer !== 'undefined') {
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      if (bufA.length === bufB.length) {
        return _nodeCrypto.timingSafeEqual(bufA, bufB);
      }
    } catch {}
  }

  // Constant-time comparison loop
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generates an HMAC-SHA256 signed base64url token for an OBS overlay scene.
 *
 * @param {string} sceneId - Identifier of the scene to grant access to
 * @param {string} [secret=DEFAULT_SECRET] - Shared cryptographic HMAC secret
 * @param {number} [expiresInMs=DEFAULT_EXPIRATION_MS] - Validity duration in milliseconds
 * @returns {string} Base64url encoded token containing { sceneId, exp, sig }
 */
export function generateToken(sceneId, secret = DEFAULT_SECRET, expiresInMs = DEFAULT_EXPIRATION_MS) {
  if (!sceneId || typeof sceneId !== 'string') {
    throw new Error('generateToken: sceneId must be a non-empty string');
  }
  const exp = Date.now() + (typeof expiresInMs === 'number' ? expiresInMs : DEFAULT_EXPIRATION_MS);
  const payload = `${sceneId}:${exp}`;
  const signature = computeHmacSha256(secret, payload);
  return encodeBase64Url(JSON.stringify({ sceneId, exp, sig: signature }));
}

/**
 * Cryptographically verifies an OBS overlay token string.
 *
 * @param {string} tokenString - The base64url token string
 * @param {string} [secret=DEFAULT_SECRET] - Shared cryptographic HMAC secret
 * @returns {{ valid: boolean, sceneId?: string, exp?: number, reason?: string, error?: string }}
 */
export function verifyToken(tokenString, secret = DEFAULT_SECRET) {
  try {
    if (!tokenString || typeof tokenString !== 'string') {
      return { valid: false, reason: 'EMPTY_OR_INVALID_TOKEN' };
    }

    let parsed;
    try {
      const raw = decodeBase64Url(tokenString);
      parsed = JSON.parse(raw);
    } catch (err) {
      return { valid: false, reason: 'DECODE_ERROR', error: err.message };
    }

    const { sceneId, exp, sig } = parsed;
    if (!sceneId || !exp || !sig || typeof sceneId !== 'string' || typeof sig !== 'string') {
      return { valid: false, reason: 'MALFORMED_PAYLOAD' };
    }

    if (Date.now() > exp) {
      return { valid: false, reason: 'TOKEN_EXPIRED', exp };
    }

    const expectedSig = computeHmacSha256(secret, `${sceneId}:${exp}`);

    if (!timingSafeEqual(sig, expectedSig)) {
      return { valid: false, reason: 'INVALID_SIGNATURE' };
    }

    return { valid: true, sceneId, exp };
  } catch (err) {
    return { valid: false, reason: 'DECODE_ERROR', error: err.message };
  }
}

/**
 * Generates a full OBS Browser Source URL with HMAC token and scene parameters.
 *
 * @param {string} sceneId - Scene identifier
 * @param {object} [options={}] - Options including secret, expiresInMs, and baseUrl
 * @returns {string} Ready-to-use OBS browser source URL
 */
export function generateObsUrl(sceneId, options = {}) {
  const {
    secret = DEFAULT_SECRET,
    expiresInMs = DEFAULT_EXPIRATION_MS,
    baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mn-alert.vercel.app',
  } = options;

  const token = generateToken(sceneId, secret, expiresInMs);
  const url = new URL('/overlay', baseUrl);
  url.searchParams.set('token', token);
  url.searchParams.set('scene', sceneId);
  url.searchParams.set('obs', '1');
  return url.toString();
}

export const TokenService = {
  DEFAULT_SECRET,
  DEFAULT_EXPIRATION_MS,
  generateToken,
  verifyToken,
  generateObsUrl,
};

export default TokenService;
