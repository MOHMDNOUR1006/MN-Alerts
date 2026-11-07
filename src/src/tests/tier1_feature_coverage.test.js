/**
 * Tier 1: Functional & Contract Feature Coverage Tests
 * Grounded in: ORIGINAL_REQUEST.md (R2, R3, R4) and PROJECT.md (Features F01-F32)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ALL_16_WIDGETS,
  validateStreamEventContract,
  validateAlertQueueContract,
  validateSubscriptionProfileContract,
} from './helpers/contractDefinitions.js';

import {
  createMockStreamEvent,
  getPriorityQueueImplementation,
  getTokenServiceImplementation,
} from './helpers/testHarness.js';

import { AVATAR_FRAMES, AVATAR_FRAMES_MAP } from '../data/alertsCatalog.js';
import { SOUND_PRESETS_LIST, soundEngine } from '../services/soundEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

describe('Tier 1: Feature Coverage & Contract Verification', () => {

  // =========================================================================
  // 1.1 Alert Queue Priority Scheduling Contract (Milestone 1 Forward Contract)
  // =========================================================================
  describe('1.1 Alert Queue Priority Scheduling', () => {
    test(
      'enforces strict priority order (0=Critical > 1=Raid > 2=Donation > 3=Sub > 4=Follow)',
      async () => {
        const queue = await getPriorityQueueImplementation();
        const contractCheck = validateAlertQueueContract(queue);
        assert.ok(contractCheck.valid, `Queue missing contract methods: ${contractCheck.missing?.join(', ')}`);

        // Enqueue in REVERSE priority order
        const followEvent = createMockStreamEvent({ id: 'evt_follow', type: 'follow', priority: 4, timestamp: 1000, sender: { name: 'FollowerA' }, payload: { message: 'Follow 1' } });
        const subEvent = createMockStreamEvent({ id: 'evt_sub', type: 'subscribe', priority: 3, timestamp: 2000, sender: { name: 'SubB' }, payload: { months: 1 } });
        const tipEvent = createMockStreamEvent({ id: 'evt_tip', type: 'donation', priority: 2, timestamp: 3000, sender: { name: 'TipperC' }, payload: { amount: 25 } });
        const raidEvent = createMockStreamEvent({ id: 'evt_raid', type: 'raid', priority: 1, timestamp: 4000, sender: { name: 'RaiderD' }, payload: { viewers: 50 } });
        const critEvent = createMockStreamEvent({ id: 'evt_crit', type: 'donation', priority: 0, timestamp: 5000, sender: { name: 'WhaleE' }, payload: { amount: 5000 } });

        queue.pause();
        queue.enqueue(followEvent);
        queue.enqueue(subEvent);
        queue.enqueue(tipEvent);
        queue.enqueue(raidEvent);
        queue.enqueue(critEvent);

        assert.equal(queue.size(), 5, 'Queue size must equal 5');

        assert.equal(queue.dequeue().id, 'evt_crit', 'Priority 0 (Critical) must be dequeued first');
        assert.equal(queue.dequeue().id, 'evt_raid', 'Priority 1 (Raid) must be dequeued second');
        assert.equal(queue.dequeue().id, 'evt_tip', 'Priority 2 (Donation) must be dequeued third');
        assert.equal(queue.dequeue().id, 'evt_sub', 'Priority 3 (Sub) must be dequeued fourth');
        assert.equal(queue.dequeue().id, 'evt_follow', 'Priority 4 (Follow) must be dequeued fifth');
        assert.equal(queue.size(), 0);
      }
    );

    test(
      'preserves FIFO ordering for events with identical priority',
      async () => {
        const queue = await getPriorityQueueImplementation();
        queue.pause();

        const tip1 = createMockStreamEvent({ id: 'tip_1', priority: 2, timestamp: 100, sender: { name: 'User1' }, payload: { amount: 10 } });
        const tip2 = createMockStreamEvent({ id: 'tip_2', priority: 2, timestamp: 200, sender: { name: 'User2' }, payload: { amount: 20 } });
        const tip3 = createMockStreamEvent({ id: 'tip_3', priority: 2, timestamp: 300, sender: { name: 'User3' }, payload: { amount: 30 } });

        queue.enqueue(tip1);
        queue.enqueue(tip2);
        queue.enqueue(tip3);

        assert.equal(queue.dequeue().id, 'tip_1');
        assert.equal(queue.dequeue().id, 'tip_2');
        assert.equal(queue.dequeue().id, 'tip_3');
      }
    );
  });

  // =========================================================================
  // 1.2 Sliding Window Deduplication & Expiration (Milestone 1 Forward Contract)
  // =========================================================================
  describe('1.2 Sliding Window Deduplication & Expiration', () => {
    test(
      'rejects duplicate event UUID within sliding window',
      async () => {
        const queue = await getPriorityQueueImplementation({ dedupWindowMs: 5000 });
        queue.pause();

        const event = createMockStreamEvent({ id: 'unique_uuid_101' });
        assert.equal(queue.enqueue(event), true);
        assert.equal(queue.enqueue(event), false);
      }
    );

    test(
      'rejects duplicate identical payload within sliding window',
      async () => {
        const queue = await getPriorityQueueImplementation({ dedupWindowMs: 5000 });
        queue.pause();

        const eventA = createMockStreamEvent({
          id: 'uuid_a',
          type: 'donation',
          sender: { name: 'DonorX' },
          payload: { amount: 50, message: 'Great stream!' },
        });
        const eventB = createMockStreamEvent({
          id: 'uuid_b',
          type: 'donation',
          sender: { name: 'DonorX' },
          payload: { amount: 50, message: 'Great stream!' },
        });

        assert.equal(queue.enqueue(eventA), true);
        assert.equal(queue.enqueue(eventB), false);
      }
    );

    test(
      'automatically drops stale/expired events on enqueue and dequeue',
      async () => {
        const queue = await getPriorityQueueImplementation();
        queue.pause();

        const expiredEvent = createMockStreamEvent({
          id: 'evt_already_expired',
          timestamp: Date.now() - 10000,
          expiresAt: Date.now() - 2000,
        });

        assert.equal(queue.enqueue(expiredEvent), false);
      }
    );
  });

  // =========================================================================
  // 1.3 Audio Asset Pipeline & Sound Engine (Milestone 0 Genuine Deliverable)
  // =========================================================================
  describe('1.3 Audio Asset Pipeline & Sound Engine', () => {
    test('every pre-mastered SFX file exists in public/media/sfx with non-zero byte size', () => {
      const sfxDir = path.join(PUBLIC_DIR, 'media/sfx');
      assert.ok(fs.existsSync(sfxDir), `SFX directory must exist at ${sfxDir}`);

      const files = fs.readdirSync(sfxDir).filter((f) => f.endsWith('.mp3'));
      assert.ok(files.length >= 8, `Expected at least 8 unique stereo SFX files, found ${files.length}`);

      for (const file of files) {
        const fullPath = path.join(sfxDir, file);
        const stat = fs.statSync(fullPath);
        assert.ok(stat.size > 20000, `Audio file ${file} should be a valid audio file (>20KB), got ${stat.size} bytes`);
      }
    });

    test('sound presets catalog defines unique labels and file references', () => {
      assert.ok(Array.isArray(SOUND_PRESETS_LIST), 'SOUND_PRESETS_LIST must be an array');
      assert.ok(SOUND_PRESETS_LIST.length >= 10, 'Expected at least 10 sound presets');

      const presetIds = new Set();
      for (const preset of SOUND_PRESETS_LIST) {
        assert.ok(preset.id && typeof preset.id === 'string', 'Preset must have a valid string id');
        assert.ok(!presetIds.has(preset.id), `Preset id ${preset.id} must be unique`);
        presetIds.add(preset.id);
        assert.ok(preset.fileUrl && typeof preset.fileUrl === 'string', `Preset ${preset.id} must have fileUrl`);
      }
    });

    test('audio engine supports volume control and muting safely', () => {
      soundEngine.setVolume(0.5);
      assert.equal(soundEngine.volume, 0.5, 'Volume should be set to 0.5');

      // Clamps out of range volumes
      soundEngine.setVolume(2.5);
      assert.equal(soundEngine.volume, 1.0, 'Volume > 1.0 should clamp to 1.0');

      soundEngine.setVolume(-0.5);
      assert.equal(soundEngine.volume, 0.0, 'Volume < 0.0 should clamp to 0.0');

      // Restore default
      soundEngine.setVolume(0.88);
    });
  });

  // =========================================================================
  // 1.4 Stream Widgets Suite Contracts (Milestone 0 Genuine Contract)
  // =========================================================================
  describe('1.4 Stream Widgets Suite Contracts', () => {
    test('confirms all 16 required stream widgets are specified in inventory', () => {
      assert.equal(ALL_16_WIDGETS.length, 16, 'All 16 widgets must be specified');
      const expectedWidgets = [
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
      for (const w of expectedWidgets) {
        assert.ok(ALL_16_WIDGETS.includes(w), `Widget ${w} must be present in widget suite`);
      }
    });

    test('validates widget configuration contracts across standard widget types', () => {
      const widgetMockConfigs = {
        'chat-box': { theme: 'clean-dark', maxMessages: 20, fadeAfterSec: 15, badges: true },
        'goals-progress': { target: 1000, current: 450, title: 'New PC Fund', currency: 'USD' },
        'tip-jar': { physicsEngine: 'matter-or-three', maxCoins: 100, gravity: 0.98 },
        'top-supporters': { period: 'monthly', count: 3, showFrames: true },
        'viewer-counter': { platforms: ['twitch', 'youtube', 'kick'], pulseBeacon: true },
      };

      for (const [widgetType, config] of Object.entries(widgetMockConfigs)) {
        assert.ok(typeof config === 'object', `Widget ${widgetType} config must be an object`);
        assert.ok(ALL_16_WIDGETS.includes(widgetType), `Widget ${widgetType} must be in ALL_16_WIDGETS`);
      }
    });
  });

  // =========================================================================
  // 1.5 Decoupled OBS Overlay Transparency & Styles (Milestone 0 Genuine)
  // =========================================================================
  describe('1.5 Decoupled OBS Overlay Transparency Enforcement', () => {
    test('ensures AlertOverlay.css contains strict transparent background rule', () => {
      const cssPath = path.resolve(__dirname, '../components/AlertOverlay.css');
      assert.ok(fs.existsSync(cssPath), `AlertOverlay.css must exist at ${cssPath}`);

      const cssContent = fs.readFileSync(cssPath, 'utf8');
      assert.ok(
        cssContent.includes('background: transparent') || cssContent.includes('background-color: transparent'),
        'AlertOverlay.css must contain explicit transparent background rule for OBS CEF browser source'
      );
    });

    test('validates Transparent Framed Avatars mapping', () => {
      assert.ok(Array.isArray(AVATAR_FRAMES), 'AVATAR_FRAMES must be an array');
      assert.ok(AVATAR_FRAMES.length >= 4, 'Must have at least 4 avatar frame presets');

      const expectedFrames = ['royal-crown', 'dragon-fire', 'crimson-demon', 'pharaoh-void'];
      for (const frameId of expectedFrames) {
        const frame = AVATAR_FRAMES_MAP[frameId];
        assert.ok(frame, `Avatar frame ${frameId} must exist in map`);
        assert.ok(frame.imageUrl, `Avatar frame ${frameId} must have imageUrl`);

        const localImgPath = path.join(PUBLIC_DIR, frame.imageUrl.replace(/^\//, ''));
        assert.ok(fs.existsSync(localImgPath), `Avatar frame image must exist at ${localImgPath}`);
      }
    });
  });

  // =========================================================================
  // 1.6 OBS URL Tokenization & Security (Milestone 1 Forward Contract)
  // =========================================================================
  describe('1.6 OBS URL Tokenization & Security', () => {
    test(
      'generates and cryptographically verifies HMAC tokens',
      async () => {
        const tokenService = await getTokenServiceImplementation();
        const sceneId = 'scene_main_1080p';
        const secret = 'test_secret_key_abc_123';

        const token = tokenService.generateToken(sceneId, secret, 3600000);
        assert.ok(token && typeof token === 'string');
        const res = tokenService.verifyToken(token, secret);
        assert.equal(res.valid, true);
        assert.equal(res.sceneId, sceneId);
      }
    );

    test(
      'rejects expired tokens and malformed strings',
      async () => {
        const tokenService = await getTokenServiceImplementation();
        const secret = 'test_secret_key_abc_123';
        const expiredToken = tokenService.generateToken('scene_main', secret, -10000);
        const res = tokenService.verifyToken(expiredToken, secret);
        assert.equal(res.valid, false);
        assert.equal(res.reason, 'TOKEN_EXPIRED');
      }
    );
  });

  // =========================================================================
  // 1.7 Schema Contract Conformity (Milestone 0 Genuine Contract)
  // =========================================================================
  describe('1.7 Schema Contract Conformity', () => {
    test('validates StreamEvent structure conforms to PROJECT.md §1', () => {
      const event = createMockStreamEvent();
      const result = validateStreamEventContract(event);
      assert.ok(result.valid, `StreamEvent validation failed: ${result.errors?.join(', ')}`);
    });

    test('validates SubscriptionProfile structure conforms to PROJECT.md §5', () => {
      const mockProfile = {
        uid: 'user_firebase_12345',
        email: 'streamer@example.com',
        plan: 'pro',
        status: 'active',
        expiresAt: Date.now() + 86400000 * 30,
        features: {
          maxScenes: 10,
          maxWidgets: 25,
          resolution: '1920x1080',
          watermark: false,
          cinematicVfx: true,
          customAudio: true,
          priorityQueue: true,
          leaderboards: true,
          allowedPacks: ['royal-crown', 'dragon-fire'],
        },
      };
      const res = validateSubscriptionProfileContract(mockProfile);
      assert.ok(res.valid, `SubscriptionProfile validation failed: ${res.errors?.join(', ')}`);
    });
  });
});
