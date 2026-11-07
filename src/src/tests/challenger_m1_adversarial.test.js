import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  generateToken,
  verifyToken,
  DEFAULT_SECRET,
} from '../services/tokenService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

describe('Milestone 1 Adversarial Security Challenge Suite', () => {

  // =========================================================================
  // SECTION 1: HMAC-SHA256 Cryptographic Tamper Resistance
  // =========================================================================
  describe('1. HMAC-SHA256 Cryptographic Tamper Resistance', () => {

    test('1.1 Generates valid tokens that pass verification and bit-for-bit match native HMAC-SHA256', () => {
      const sceneId = 'scene_main_stage';
      const secret = 'super_secret_key_streamer_2026';
      const expiresInMs = 3600000;

      const token = generateToken(sceneId, secret, expiresInMs);
      assert.ok(typeof token === 'string' && token.length > 0, 'Token must be non-empty string');

      // Decode and verify structure
      const decodedJson = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
      assert.equal(decodedJson.sceneId, sceneId);
      assert.ok(typeof decodedJson.exp === 'number');
      assert.ok(typeof decodedJson.sig === 'string' && decodedJson.sig.length === 64);

      // Verify with tokenService
      const verification = verifyToken(token, secret);
      assert.equal(verification.valid, true);
      assert.equal(verification.sceneId, sceneId);
      assert.equal(verification.exp, decodedJson.exp);

      // Bit-for-bit test against Node's crypto.createHmac
      const expectedNativeSig = crypto
        .createHmac('sha256', secret)
        .update(`${sceneId}:${decodedJson.exp}`)
        .digest('hex');
      assert.equal(decodedJson.sig, expectedNativeSig, 'Signature must match native OpenSSL HMAC-SHA256 bit-for-bit');
    });

    test('1.2 Multi-vector Bit-Flip Attacks: Every single 1-bit flip in the 256-bit signature is rejected', () => {
      const sceneId = 'scene_protected_vip';
      const secret = 'adversarial_bitflip_secret_key_123';
      const token = generateToken(sceneId, secret, 60000);

      const raw = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
      const originalSig = raw.sig; // 64 hex characters = 32 bytes = 256 bits

      // Convert hex signature to Uint8Array bytes
      const sigBytes = Buffer.from(originalSig, 'hex');
      assert.equal(sigBytes.length, 32);

      let bitFlipCount = 0;
      let rejectedCount = 0;

      // Exhaustively flip every single bit across all 32 bytes (256 distinct bit-flip vectors)
      for (let byteIdx = 0; byteIdx < sigBytes.length; byteIdx++) {
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
          bitFlipCount++;
          const corruptedBytes = Buffer.from(sigBytes);
          corruptedBytes[byteIdx] ^= (1 << bitIdx); // Flip exactly 1 bit
          const corruptedSigHex = corruptedBytes.toString('hex');

          const corruptedPayload = { ...raw, sig: corruptedSigHex };
          const corruptedToken = Buffer.from(JSON.stringify(corruptedPayload)).toString('base64url');

          const result = verifyToken(corruptedToken, secret);
          if (!result.valid && result.reason === 'INVALID_SIGNATURE') {
            rejectedCount++;
          }
        }
      }

      assert.equal(bitFlipCount, 256, 'Should test exactly 256 1-bit flips');
      assert.equal(rejectedCount, 256, 'All 256 bit-flipped signatures must be rejected with INVALID_SIGNATURE');
    });

    test('1.3 Payload Tampering: Modifying sceneId (privilege escalation) fails verification', () => {
      const originalSceneId = 'scene_guest_preview';
      const secret = 'prod_secret_live_99';
      const validToken = generateToken(originalSceneId, secret, 120000);

      const parsed = JSON.parse(Buffer.from(validToken, 'base64url').toString('utf8'));

      // Attack: elevate sceneId to admin or protected scenes
      const targets = ['admin', 'scene_admin_control', 'scene_vip_streamer', '', 'root'];
      for (const attackedScene of targets) {
        const tampered = { ...parsed, sceneId: attackedScene };
        const tamperedToken = Buffer.from(JSON.stringify(tampered)).toString('base64url');

        const res = verifyToken(tamperedToken, secret);
        assert.equal(res.valid, false, `Tampered sceneId '${attackedScene}' must fail`);
        if (attackedScene === '') {
          assert.equal(res.reason, 'MALFORMED_PAYLOAD');
        } else {
          assert.equal(res.reason, 'INVALID_SIGNATURE');
        }
      }
    });

    test('1.4 Timestamp Tampering: Extending expiration time fails verification', () => {
      const sceneId = 'scene_expiring_soon';
      const secret = 'expiration_attack_secret_42';
      const validToken = generateToken(sceneId, secret, 5000); // 5 sec validity

      const parsed = JSON.parse(Buffer.from(validToken, 'base64url').toString('utf8'));

      // Attempt extension by +1ms, +1hr, +10 years
      const extensionDeltas = [1, 3600000, 315360000000];
      for (const delta of extensionDeltas) {
        const tampered = { ...parsed, exp: parsed.exp + delta };
        const tamperedToken = Buffer.from(JSON.stringify(tampered)).toString('base64url');

        const res = verifyToken(tamperedToken, secret);
        assert.equal(res.valid, false, `Altering timestamp by +${delta}ms must be rejected`);
        assert.equal(res.reason, 'INVALID_SIGNATURE');
      }
    });

    test('1.5 Key Confusion & Replay with Wrong Secret: Replay attacks fail', () => {
      const sceneId = 'scene_camera_1';
      const secretA = 'correct_secret_key_alpha';
      const secretB = 'attacker_guessed_key_beta';

      const tokenA = generateToken(sceneId, secretA, 60000);

      // Verify with wrong secret
      const resWrongSecret = verifyToken(tokenA, secretB);
      assert.equal(resWrongSecret.valid, false);
      assert.equal(resWrongSecret.reason, 'INVALID_SIGNATURE');

      // Verify with default secret if different
      const resDefault = verifyToken(tokenA, DEFAULT_SECRET);
      assert.equal(resDefault.valid, false);
      assert.equal(resDefault.reason, 'INVALID_SIGNATURE');
    });

    test('1.6 Expired Token: Strictly rejected after expiration duration', async () => {
      const sceneId = 'scene_ephemeral';
      const secret = 'ephemeral_secret_123';

      // Negative expiration duration
      const preExpiredToken = generateToken(sceneId, secret, -5000);
      const resPre = verifyToken(preExpiredToken, secret);
      assert.equal(resPre.valid, false);
      assert.equal(resPre.reason, 'TOKEN_EXPIRED');

      // Short-lived token expiring in 15ms
      const shortToken = generateToken(sceneId, secret, 15);
      // Wait 30ms to guarantee expiration
      await new Promise((r) => setTimeout(r, 30));
      const resShort = verifyToken(shortToken, secret);
      assert.equal(resShort.valid, false);
      assert.equal(resShort.reason, 'TOKEN_EXPIRED');
    });

    test('1.7 Malformed Tokens & Boundary Fuzzing', () => {
      const secret = DEFAULT_SECRET;

      const malformedCases = [
        null,
        undefined,
        '',
        12345,
        {},
        [],
        'not-a-base64-string!@#$%',
        Buffer.from('not json at all').toString('base64url'),
        Buffer.from(JSON.stringify({ only: 'partial' })).toString('base64url'),
        Buffer.from(JSON.stringify({ sceneId: 123, exp: Date.now() + 10000, sig: 'abc' })).toString('base64url'),
        Buffer.from(JSON.stringify({ sceneId: 'test', exp: 'not-a-number', sig: 'abc' })).toString('base64url'),
        Buffer.from(JSON.stringify({ sceneId: 'test', exp: Date.now() + 10000, sig: 12345 })).toString('base64url'),
      ];

      for (const badToken of malformedCases) {
        const res = verifyToken(badToken, secret);
        assert.equal(res.valid, false, `Malformed token should fail: ${JSON.stringify(badToken)}`);
        assert.ok(['EMPTY_OR_INVALID_TOKEN', 'DECODE_ERROR', 'MALFORMED_PAYLOAD', 'INVALID_SIGNATURE'].includes(res.reason));
      }
    });

  });

  // =========================================================================
  // SECTION 2: Constant-Time Comparison Logic & Timing Attack Resistance
  // =========================================================================
  describe('2. Constant-Time Comparison Verification', () => {

    test('2.1 Pure-JS fallback timingSafeEqual handles arbitrary strings and non-strings safely', () => {
      // Test length inequality check
      const sig2 = 'a'.repeat(63);
      const resDiffLength = verifyToken(
        Buffer.from(JSON.stringify({ sceneId: 's', exp: Date.now() + 50000, sig: sig2 })).toString('base64url')
      );
      assert.equal(resDiffLength.valid, false);

      // Verify mismatch calculation does not short-circuit
      // We simulate identical length comparisons where mismatch is at index 0 vs index 63
      const validToken = generateToken('s1', DEFAULT_SECRET, 60000);
      const raw = JSON.parse(Buffer.from(validToken, 'base64url').toString('utf8'));
      const originalSig = raw.sig;

      // Mismatch at first char
      const mismatchAtStart = (originalSig[0] === '0' ? '1' : '0') + originalSig.slice(1);
      // Mismatch at last char
      const mismatchAtEnd = originalSig.slice(0, 63) + (originalSig[63] === '0' ? '1' : '0');

      const tokenStart = Buffer.from(JSON.stringify({ ...raw, sig: mismatchAtStart })).toString('base64url');
      const tokenEnd = Buffer.from(JSON.stringify({ ...raw, sig: mismatchAtEnd })).toString('base64url');

      assert.equal(verifyToken(tokenStart).valid, false);
      assert.equal(verifyToken(tokenEnd).valid, false);
    });

    test('2.2 Timing distribution comparison: early-mismatch vs late-mismatch execution time', () => {
      const validToken = generateToken('bench_scene', DEFAULT_SECRET, 60000);
      const raw = JSON.parse(Buffer.from(validToken, 'base64url').toString('utf8'));
      const originalSig = raw.sig;

      const sigMismatchAt0 = (originalSig[0] === '0' ? '1' : '0') + originalSig.slice(1);
      const sigMismatchAt63 = originalSig.slice(0, 63) + (originalSig[63] === '0' ? '1' : '0');

      const tokenMismatch0 = Buffer.from(JSON.stringify({ ...raw, sig: sigMismatchAt0 })).toString('base64url');
      const tokenMismatch63 = Buffer.from(JSON.stringify({ ...raw, sig: sigMismatchAt63 })).toString('base64url');

      const WARMUP_RUNS = 1000;
      for (let i = 0; i < WARMUP_RUNS; i++) {
        verifyToken(tokenMismatch0);
        verifyToken(tokenMismatch63);
      }

      const BENCH_ITERATIONS = 5000;

      const start0 = process.hrtime.bigint();
      for (let i = 0; i < BENCH_ITERATIONS; i++) {
        verifyToken(tokenMismatch0);
      }
      const duration0 = Number(process.hrtime.bigint() - start0);

      const start63 = process.hrtime.bigint();
      for (let i = 0; i < BENCH_ITERATIONS; i++) {
        verifyToken(tokenMismatch63);
      }
      const duration63 = Number(process.hrtime.bigint() - start63);

      const diffRatio = Math.abs(duration0 - duration63) / Math.max(duration0, duration63);
      // Ensure timing difference is within normal jitter (< 35% variance over 5000 iterations in Node runtime)
      assert.ok(diffRatio < 0.35, `Timing ratio variance should be minimal (got ${diffRatio.toFixed(3)})`);
    });

  });

  // =========================================================================
  // SECTION 3: Bundle Isolation & Zero Heavy Dependencies
  // =========================================================================
  describe('3. Bundle Isolation & Zero Heavy Dependencies', () => {

    test('3.1 StandaloneOverlay.jsx does NOT import firebase, FundingView, or App.css', () => {
      const overlayPath = path.resolve(PROJECT_ROOT, 'src/components/overlay/StandaloneOverlay.jsx');
      assert.ok(fs.existsSync(overlayPath), 'StandaloneOverlay.jsx must exist');
      const code = fs.readFileSync(overlayPath, 'utf8');

      // Disallowed imports in decoupled overlay
      assert.ok(!code.includes('firebase'), 'StandaloneOverlay.jsx must NOT contain firebase imports');
      assert.ok(!code.includes('FundingView'), 'StandaloneOverlay.jsx must NOT contain FundingView');
      assert.ok(!code.includes('App.css'), 'StandaloneOverlay.jsx must NOT import App.css');
      assert.ok(!code.includes('ecosystemAuth'), 'StandaloneOverlay.jsx must NOT import ecosystemAuth');
    });

    test('3.2 main.jsx code-splits StandaloneOverlay dynamically away from App.jsx', () => {
      const mainPath = path.resolve(PROJECT_ROOT, 'src/main.jsx');
      assert.ok(fs.existsSync(mainPath), 'main.jsx must exist');
      const code = fs.readFileSync(mainPath, 'utf8');

      assert.ok(code.includes("url.pathname.startsWith('/overlay')") || code.includes("url.searchParams.get('obs') === '1'"));
      assert.ok(code.includes("import('./components/overlay/StandaloneOverlay.jsx')"), 'Must dynamically import StandaloneOverlay');
      assert.ok(code.includes("import('./App.jsx')"), 'Must dynamically import App.jsx in else branch');
    });

    test('3.3 Production build assets: StandaloneOverlay chunk is strictly < 130KB', () => {
      const distAssetsDir = path.resolve(PROJECT_ROOT, 'dist/assets');
      assert.ok(fs.existsSync(distAssetsDir), 'dist/assets must exist. Run vite build before test if missing.');

      const files = fs.readdirSync(distAssetsDir);
      const overlayJsFiles = files.filter((f) => f.startsWith('StandaloneOverlay-') && f.endsWith('.js'));
      assert.ok(overlayJsFiles.length > 0, 'StandaloneOverlay JS chunk must exist in dist/assets');

      for (const jsFile of overlayJsFiles) {
        const fullPath = path.join(distAssetsDir, jsFile);
        const stats = fs.statSync(fullPath);
        const sizeBytes = stats.size;
        const sizeKb = sizeBytes / 1024;

        console.log(`     [Bundle Analysis] ${jsFile}: ${sizeBytes} bytes (${sizeKb.toFixed(2)} KB)`);

        // Target requirement: strictly < 130KB (expected ~4.29KB)
        assert.ok(sizeKb < 130, `StandaloneOverlay chunk ${jsFile} must be < 130KB, found: ${sizeKb.toFixed(2)} KB`);
        assert.ok(sizeKb < 20, `StandaloneOverlay chunk ${jsFile} should be lightweight (< 20KB), found: ${sizeKb.toFixed(2)} KB`);

        // Verify content does not leak firebase, FundingView or App.css
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(!content.includes('firebase'), `${jsFile} must not contain firebase`);
        assert.ok(!content.includes('FundingView'), `${jsFile} must not contain FundingView`);
      }
    });

  });

  // =========================================================================
  // SECTION 4: CEF Transparency & Preload Verification
  // =========================================================================
  describe('4. CEF Transparency & Preload Verification', () => {

    test('4.1 index.html head script enforces 0ms transparency before DOM parse', () => {
      const indexPath = path.resolve(PROJECT_ROOT, 'index.html');
      assert.ok(fs.existsSync(indexPath), 'index.html must exist');
      const html = fs.readFileSync(indexPath, 'utf8');

      // Check inline script in <head>
      const headContent = html.split('</head>')[0];
      assert.ok(headContent.includes('obs-cef-mode'), 'Head must reference obs-cef-mode');
      assert.ok(headContent.includes('background: transparent !important'), 'Head style must enforce transparent background !important');
      assert.ok(headContent.includes('background-color: transparent !important'), 'Head style must enforce background-color: transparent !important');
      assert.ok(headContent.includes('overflow: hidden !important'), 'Head style must enforce overflow: hidden !important');
    });

    test('4.2 index.html preconnects and preloads streaming typography', () => {
      const indexPath = path.resolve(PROJECT_ROOT, 'index.html');
      const html = fs.readFileSync(indexPath, 'utf8');

      assert.ok(html.includes('https://fonts.googleapis.com'), 'Must preconnect Google Fonts');
      assert.ok(html.includes('https://fonts.gstatic.com'), 'Must preconnect gstatic');
      assert.ok(html.includes('Cairo'), 'Must preload Cairo font');
      assert.ok(html.includes('Tajawal'), 'Must preload Tajawal font');
      assert.ok(html.includes('Anton'), 'Must preload Anton font');
      assert.ok(html.includes('Exo+2') || html.includes('Exo 2'), 'Must preload Exo 2 font');
    });

    test('4.3 StandaloneOverlay.css strictly enforces transparent viewport', () => {
      const cssPath = path.resolve(PROJECT_ROOT, 'src/components/overlay/StandaloneOverlay.css');
      assert.ok(fs.existsSync(cssPath), 'StandaloneOverlay.css must exist');
      const css = fs.readFileSync(cssPath, 'utf8');

      assert.ok(css.includes('background: transparent !important'));
      assert.ok(css.includes('width: 100vw !important'));
      assert.ok(css.includes('height: 100vh !important'));
      assert.ok(css.includes('pointer-events: none'));
    });

  });

});
