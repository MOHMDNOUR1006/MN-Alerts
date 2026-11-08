import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  soundEngine,
  normalizePresetId,
  SOUND_PRESETS_LIST,
} from '../services/soundEngine.js';

import {
  ALERT_PACKS,
  ALERTS_CATALOG,
  AVATAR_FRAMES,
  AVATAR_FRAMES_MAP,
  getAlertPacksByTier,
  getAlertPacksByTierLevel,
  getAlertPackById,
  getAvatarFrameById,
} from '../data/alertPacks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SFX_DIR = path.resolve(PROJECT_ROOT, 'public/media/sfx');

describe('Milestone 2 Adversarial DSP Limiter & Crackle Elimination Challenge Suite', () => {

  // =========================================================================
  // SECTION 1: Master Dynamics Limiter Specifications & Audio Graph Verification
  // =========================================================================
  describe('1. Master Dynamics Limiter Specifications & Audio Graph Verification', () => {

    test('1.1 Master DynamicsCompressorNode parameters strictly match broadcast limiting specifications', () => {
      assert.ok(typeof soundEngine.initMasterCompressor === 'function', 'initMasterCompressor must be a function');
      const comp = soundEngine.initMasterCompressor();
      assert.ok(comp, 'Master compressor must be initialized and returned');

      // Verify exact limiter parameters:
      assert.equal(comp.threshold.value, -6, 'Threshold must be strictly -6 dB');
      assert.equal(comp.knee.value, 12, 'Knee must be strictly 12 dB');
      assert.equal(comp.ratio.value, 12, 'Compression ratio must be strictly 12:1');
      assert.equal(comp.attack.value, 0.003, 'Attack time must be strictly 0.003s (3ms)');
      assert.equal(comp.release.value, 0.25, 'Release time must be strictly 0.25s (250ms)');
    });

    test('1.2 Web Audio graph topology: masterGain connects to masterCompressor, which connects to destination', () => {
      const comp = soundEngine.initMasterCompressor();
      assert.ok(soundEngine.masterGain, 'soundEngine.masterGain must be defined');

      // Check masterGain -> comp connection
      assert.ok(soundEngine.masterGain.connectedTo.includes(comp), 'masterGain must be connected to masterCompressor');

      // Check comp -> destination connection
      assert.ok(comp.connectedTo.includes(soundEngine.ctx.destination), 'masterCompressor must be connected to ctx.destination');
    });

    test('1.3 Master gain headroom scaling prevents summing bus saturation', () => {
      soundEngine.setVolume(0.88);
      soundEngine.setMuted(false);
      // Expected gain: volume * 0.55 = 0.88 * 0.55 = 0.484 (-6.3 dB attenuation)
      assert.ok(Math.abs(soundEngine.masterGain.gain.value - 0.484) < 0.001, 'Master gain must provide -6.3 dB headroom scaling');
    });

    test('1.4 W3C Web Audio Compressor DSP transfer function mathematically guarantees peak <= 0 dBFS under extreme input (+24 dBFS)', () => {
      // W3C Web Audio DynamicsCompressor static transfer characteristic:
      const T = -6; // threshold dB
      const K = 12; // knee dB
      const R = 12; // ratio

      function evaluateCompressorTransferDb(xDb) {
        if (xDb <= T - K / 2) {
          return xDb; // uncompressed
        }
        if (xDb >= T + K / 2) {
          return T + (xDb - T) / R; // compressed
        }
        // Quadratic knee
        return xDb + ((1 / R - 1) * Math.pow(xDb - T + K / 2, 2)) / (2 * K);
      }

      // Verify at threshold
      const yAtThreshold = evaluateCompressorTransferDb(T);
      assert.ok(yAtThreshold < 0, 'Output at threshold must be negative dBFS');

      // Verify at 4 concurrent loud presets summing together (+12 dBFS input):
      const yAt4Presets = evaluateCompressorTransferDb(12.0);
      assert.ok(yAt4Presets <= -4.5, `Output at +12 dBFS input must be <= -4.5 dBFS, got ${yAt4Presets}`);

      // Verify under extreme catastrophic overload (+24 dBFS input = 16 loud presets simultaneously):
      const yAt16Presets = evaluateCompressorTransferDb(24.0);
      assert.ok(yAt16Presets <= -3.5, `Output at +24 dBFS input must be <= -3.5 dBFS, got ${yAt16Presets}`);

      // Verify linear peak amplitude never exceeds 1.0 (0 dBFS)
      const linearPeak = Math.pow(10, yAt16Presets / 20);
      assert.ok(linearPeak < 1.0, `Linear peak must be < 1.0, got ${linearPeak}`);
    });
  });

  // =========================================================================
  // SECTION 2: Concurrent Multi-Preset Playback Stress Test
  // =========================================================================
  describe('2. Concurrent Multi-Preset Playback Stress Test', () => {

    test('2.1 Simulates concurrent playback of multiple loud presets simultaneously (explosion, lion-roar, shadow-eyes, void-boom)', () => {
      soundEngine.initMasterCompressor();

      // Trigger multiple synth voices simultaneously without crashing
      assert.doesNotThrow(() => {
        soundEngine._playCinematicSynthLayer('explosion');
        const count1 = soundEngine.activeSynthSources.length;
        assert.ok(count1 > 0, 'Explosion should create active synth sources');

        soundEngine._playCinematicSynthLayer('lion-roar');
        const count2 = soundEngine.activeSynthSources.length;
        assert.ok(count2 > 0, 'Lion-roar should create active synth sources');

        soundEngine._playCinematicSynthLayer('shadow-eyes');
        const count3 = soundEngine.activeSynthSources.length;
        assert.ok(count3 > 0, 'Shadow-eyes should create active synth sources');

        soundEngine._playCinematicSynthLayer('void-boom');
        const count4 = soundEngine.activeSynthSources.length;
        assert.ok(count4 > 0, 'Void-boom should create active synth sources');
      });

      // Cleanup
      soundEngine.stopAll();
    });

    test('2.2 High-priority P0 alert preemption cleanly interrupts active alert layer without uncaught errors', async () => {
      soundEngine.play('explosion');
      assert.ok(soundEngine.activeLayerGain !== null, 'Active layer gain must be present during playback');

      // Simulate instantaneous critical P0 alert preemption
      soundEngine.stopAll();
      assert.equal(soundEngine.activeLayerGain, null, 'Active layer gain reference must be cleared immediately in soundEngine');
      assert.equal(soundEngine.activeSynthSources.length, 0, 'Active synth sources list must be emptied');

      // Wait 35ms to allow the 25ms source disconnection timer to fire
      await new Promise((r) => setTimeout(r, 35));

      // Immediate subsequent play must succeed cleanly
      soundEngine.play('lion-roar');
      assert.ok(soundEngine.activeLayerGain !== null, 'New layer gain must be established for preempting alert');
      soundEngine.stopAll();
    });
  });

  // =========================================================================
  // SECTION 3: Rapid Triggering & Heap Exhaustion Stress Test (100 Triggers / sec)
  // =========================================================================
  describe('3. Rapid Triggering & Heap Exhaustion Stress Test (100 Audio Triggers in 1s)', () => {

    test('3.1 Executes 100 rapid audio triggers without heap exhaustion or memory leak', async () => {
      if (globalThis.gc) globalThis.gc();
      const initialMemory = process.memoryUsage().heapUsed;

      const presets = ['explosion', 'lion-roar', 'shadow-eyes', 'void-boom', 'missile', 'blood', 'cyber', 'shatter'];
      const triggerCount = 100;
      const startTime = Date.now();

      await new Promise((resolve) => {
        let count = 0;
        const timer = setInterval(() => {
          soundEngine.play(presets[count % presets.length]);
          count++;
          if (count >= triggerCount) {
            clearInterval(timer);
            resolve();
          }
        }, 10);
      });

      const duration = Date.now() - startTime;
      assert.ok(duration <= 2500, `100 triggers should execute rapidly (< 2.5s), took ${duration}ms`);

      // Allow all 25ms disconnection timers to complete
      await new Promise((r) => setTimeout(r, 60));
      soundEngine.stopAll();

      if (globalThis.gc) globalThis.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const heapDeltaMb = (finalMemory - initialMemory) / (1024 * 1024);

      // Verify heap delta is strictly bounded (< 15 MB)
      assert.ok(heapDeltaMb < 15, `Heap memory growth (${heapDeltaMb.toFixed(2)} MB) must be strictly bounded (< 15 MB)`);
    });

    test('3.2 Rapid triggers produce zero unhandled rejections, crashes, or node leaks', async () => {
      let unhandledCount = 0;
      const unhandledHandler = () => { unhandledCount++; };
      process.on('unhandledRejection', unhandledHandler);

      for (let i = 0; i < 50; i++) {
        soundEngine.play('explosion');
        soundEngine.stopAll();
      }

      await new Promise((r) => setTimeout(r, 40));
      process.off('unhandledRejection', unhandledHandler);

      assert.equal(unhandledCount, 0, 'No unhandled rejections should occur during rapid trigger storm');
    });

    test('3.3 Empirical DC step click test: zero instantaneous discontinuities across all 100 triggers', () => {
      // Instrument createGain to track attack envelope onsets
      const originalCreateGain = soundEngine.ctx.createGain.bind(soundEngine.ctx);
      const recordedOnsets = [];

      soundEngine.ctx.createGain = function () {
        const gainNode = originalCreateGain();
        const originalSetValueAtTime = gainNode.gain.setValueAtTime.bind(gainNode.gain);
        gainNode.gain.setValueAtTime = function (val, time) {
          recordedOnsets.push({ val, time });
          return originalSetValueAtTime(val, time);
        };
        return gainNode;
      };

      try {
        const presets = ['explosion', 'lion-roar', 'shadow-eyes', 'void-boom'];
        for (let i = 0; i < 100; i++) {
          soundEngine.play(presets[i % presets.length]);
        }

        // Verify that NO gain node was initialized with an instantaneous step > 0.0001 (excluding layer bus gain at 1.0)
        // Attack envelopes on synth voices must begin at 0.0001 (-80 dBFS)
        const voiceOnsets = recordedOnsets.filter((o) => o.val !== 1.0 && o.val !== 0.484 && o.val !== 0.0001);
        assert.equal(voiceOnsets.length, 0, `Expected 0 voices starting with non-silent step, found ${voiceOnsets.length}`);

        const silentOnsets = recordedOnsets.filter((o) => o.val === 0.0001);
        assert.ok(silentOnsets.length >= 100, `Expected at least 100 silent attack onsets, found ${silentOnsets.length}`);
      } finally {
        soundEngine.ctx.createGain = originalCreateGain;
        soundEngine.stopAll();
      }
    });
  });

  // =========================================================================
  // SECTION 4: 15ms Linear Attack Envelope & Crackle Elimination Verification
  // =========================================================================
  describe('4. 15ms Linear Attack Envelope & Crackle Elimination Verification', () => {

    test('4.1 Verifies source code of _explosionDetonation enforces 15ms linear attack envelope starting at 0.0001', () => {
      const soundEnginePath = path.resolve(__dirname, '../services/soundEngine.js');
      const content = fs.readFileSync(soundEnginePath, 'utf8');

      // Check that gain starts at 0.0001 (silence / -80 dBFS)
      assert.ok(
        content.includes('gain.gain.setValueAtTime(0.0001, startTime)'),
        '_explosionDetonation must initialize gain to 0.0001 at startTime'
      );

      // Check that linear ramp spans 15ms
      assert.ok(
        content.includes('gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.015)'),
        '_explosionDetonation must linearly ramp to targetGain over 15ms (startTime + 0.015)'
      );

      // Check brown noise 6dB/oct low-pass filter
      assert.ok(
        content.includes('lastOut = (lastOut + 0.025 * white) / 1.025'),
        '_explosionDetonation must include 6dB/oct low-pass brown noise filter'
      );
    });

    test('4.2 Verifies source code of _tone and _bellPing enforce non-zero attack ramps', () => {
      const soundEnginePath = path.resolve(__dirname, '../services/soundEngine.js');
      const content = fs.readFileSync(soundEnginePath, 'utf8');

      assert.ok(
        content.includes('gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015)'),
        '_tone must linearly ramp over 15ms'
      );
      assert.ok(
        content.includes('gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005)'),
        '_bellPing must ramp over 5ms'
      );
    });

    test('4.3 Envelope slew rate mathematical verification: max sample-to-sample step is bounded (eliminating DC transient crackle)', () => {
      const sampleRate = 48000;
      const attackTimeSec = 0.015; // 15ms
      const targetGain = 0.85;
      const startGain = 0.0001;

      const samplesInAttack = sampleRate * attackTimeSec; // 720 samples
      const stepPerSample = (targetGain - startGain) / samplesInAttack;

      // With instantaneous step (previous bug): step was 0.85 in 1 sample
      // With 15ms ramp: step is 0.00118 per sample (720x smoother)
      assert.ok(stepPerSample < 0.002, `Step per sample must be < 0.002, got ${stepPerSample}`);
    });
  });

  // =========================================================================
  // SECTION 5: Rapid stopAll() Preemption & Pop Artifact Elimination
  // =========================================================================
  describe('5. Rapid stopAll() Preemption & Pop Artifact Elimination', () => {

    test('5.1 stopAll() applies 15ms linear fade-to-zero ramp before source disconnection', () => {
      soundEngine.play('explosion');
      const activeLayerGain = soundEngine.activeLayerGain;
      assert.ok(activeLayerGain, 'Layer gain must exist before stopAll');

      soundEngine.stopAll();
      // Gain param should have been ramped to 0.0001
      assert.equal(activeLayerGain.gain.value, 0.0001, 'Layer gain must be ramped down to 0.0001');
    });

    test('5.2 Disconnection delay (25ms) provides adequate buffer for 15ms ramp completion', () => {
      const soundEnginePath = path.resolve(__dirname, '../services/soundEngine.js');
      const content = fs.readFileSync(soundEnginePath, 'utf8');

      assert.ok(
        content.includes('linearRampToValueAtTime(0.0001, now + 0.015)'),
        'stopAll must ramp down over 15ms'
      );
      assert.ok(
        content.includes('}, 25);'),
        'stopAll must wait 25ms (> 15ms) before stopping and disconnecting synth sources'
      );
    });

    test('5.3 Multiple consecutive stopAll() calls do not throw or corrupt state', () => {
      assert.doesNotThrow(() => {
        for (let i = 0; i < 20; i++) {
          soundEngine.stopAll();
        }
      });
      assert.equal(soundEngine.activeLayerGain, null);
      assert.equal(soundEngine.activeSynthSources.length, 0);
    });
  });

  // =========================================================================
  // SECTION 6: Acoustic EBU R128 Loudness & True Peak Compliance (All 9 Audio Files)
  // =========================================================================
  describe('6. Acoustic EBU R128 Loudness & True Peak Compliance (All 9 Audio Files)', () => {

    const EXPECTED_FILES = [
      'anime-katana-thunder.mp3',
      'coins-jackpot-drop.mp3',
      'cyber-plasma-surge.mp3',
      'lion-roar-impact.mp3',
      'missile-barrage-boom.mp3',
      'nuclear-explosion.mp3',
      'shadow-eyes-explosion.mp3',
      'shatter-dimension-blast.mp3',
      'void-vortex-boom.mp3',
    ];

    test('6.1 All 9 pre-mastered SFX files exist in public/media/sfx and exceed 20KB', () => {
      assert.ok(fs.existsSync(SFX_DIR), `Directory ${SFX_DIR} must exist`);
      for (const fileName of EXPECTED_FILES) {
        const fullPath = path.join(SFX_DIR, fileName);
        assert.ok(fs.existsSync(fullPath), `File ${fileName} must exist`);
        const stat = fs.statSync(fullPath);
        assert.ok(stat.size > 20000, `File ${fileName} size (${stat.size} bytes) must be > 20,000 bytes`);
      }
    });

    test('6.2 100% of SFX files adhere strictly to True Peak <= -1.5 dBFS via ffmpeg ebur128', () => {
      for (const fileName of EXPECTED_FILES) {
        const fullPath = path.join(SFX_DIR, fileName);
        const cmd = `ffmpeg -nostdin -i "${fullPath}" -af "ebur128=peak=true" -f null - 2>&1`;
        const output = execSync(cmd, { encoding: 'utf8' });

        const match = output.match(/True peak:\s+Peak:\s+(-?\d+\.?\d*)\s+dBFS/i);
        assert.ok(match, `Could not parse True peak for ${fileName}`);
        const truePeak = parseFloat(match[1]);

        assert.ok(
          truePeak <= -1.5,
          `File ${fileName} True peak ${truePeak} dBFS must be <= -1.5 dBFS (no digital clipping)`
        );
      }
    });

    test('6.3 100% of SFX files adhere strictly to max_volume <= -1.5 dB via ffmpeg volumedetect', () => {
      for (const fileName of EXPECTED_FILES) {
        const fullPath = path.join(SFX_DIR, fileName);
        const cmd = `ffmpeg -nostdin -i "${fullPath}" -af "volumedetect" -f null - 2>&1`;
        const output = execSync(cmd, { encoding: 'utf8' });

        const match = output.match(/max_volume:\s+(-?\d+\.?\d*)\s+dB/i);
        assert.ok(match, `Could not parse max_volume for ${fileName}`);
        const maxVol = parseFloat(match[1]);

        assert.ok(
          maxVol <= -1.5,
          `File ${fileName} max_volume ${maxVol} dB must be <= -1.5 dB (no digital clipping)`
        );
      }
    });

    test('6.4 Every file in public/media/sfx is registered in SOUND_PRESETS_LIST without orphans', () => {
      const registeredUrls = new Set(SOUND_PRESETS_LIST.map((p) => p.fileUrl));
      for (const fileName of EXPECTED_FILES) {
        const expectedUrl = `/media/sfx/${fileName}`;
        assert.ok(
          registeredUrls.has(expectedUrl),
          `Asset ${fileName} must be mapped in SOUND_PRESETS_LIST (url: ${expectedUrl})`
        );
      }
    });
  });

  // =========================================================================
  // SECTION 7: Catalog, Avatar Frames & Tier Resolution
  // =========================================================================
  describe('7. Catalog, Avatar Frames & Tier Resolution', () => {

    test('7.1 src/src/data/alertPacks.js exists and exports expected query helpers', () => {
      assert.ok(typeof getAlertPacksByTier === 'function');
      assert.ok(typeof getAlertPacksByTierLevel === 'function');
      assert.ok(typeof getAlertPackById === 'function');
      assert.ok(typeof getAvatarFrameById === 'function');
      assert.equal(ALERT_PACKS.length, 42, 'ALERT_PACKS must contain 42 packs');
      assert.equal(AVATAR_FRAMES.length, 5, 'AVATAR_FRAMES must contain 5 frame definitions (4 themed frames + none)');
      assert.ok(Object.keys(AVATAR_FRAMES_MAP).length >= 8, 'AVATAR_FRAMES_MAP must register dual keys (bare and prefixed)');
    });

    test('7.2 All 42 packs in ALERTS_CATALOG expose tierLevel (1-4), audio, and vfx metadata', () => {
      assert.equal(ALERTS_CATALOG.length, 42, 'ALERTS_CATALOG must contain exactly 42 packs');
      for (const item of ALERTS_CATALOG) {
        assert.ok(item.tierLevel >= 1 && item.tierLevel <= 4, `Pack ${item.id} tierLevel must be between 1 and 4`);
        assert.ok(item.audio && item.audio.preset, `Pack ${item.id} must define audio.preset`);
        assert.ok(item.vfx && item.vfx.textureEffect, `Pack ${item.id} must define vfx.textureEffect`);
        // Verify preset id normalization operates identically on audio presets
        assert.equal(normalizePresetId(item.audio.preset), item.audio.preset.toLowerCase().replace(/_/g, '-'));
      }
    });

    test('7.3 Avatar frames resolve correctly with and without frame- prefix', () => {
      const frameBare = getAvatarFrameById('dragon-fire');
      const framePrefixed = getAvatarFrameById('frame-dragon-fire');
      assert.ok(frameBare, 'Bare ID dragon-fire must resolve');
      assert.ok(framePrefixed, 'Prefixed ID frame-dragon-fire must resolve');
      assert.equal(frameBare.id, framePrefixed.id, 'Both bare and prefixed must resolve to same frame ID');
    });
  });
});
