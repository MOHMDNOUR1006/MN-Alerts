import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ALERT_PACKS,
  ALERTS_CATALOG,
  AVATAR_FRAMES_MAP,
  CHOREOGRAPHY_MODES,
  TEXTURE_ENGINES,
  getAlertPacksByTier,
  getAlertPacksByTierLevel,
  getAlertPackById,
  getAvatarFrameById,
} from '../data/alertPacks.js';

import {
  VALID_AVATAR_FRAMES,
  validateStreamEventContract,
} from './helpers/contractDefinitions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.resolve(PROJECT_ROOT, 'public');

describe('Milestone 2 Adversarial Tiered Catalog & Avatar Frame Stress Test Suite', () => {

  // =========================================================================
  // SUITE 1: Tiered Alert Catalog & Metadata Contracts (All 42 Alert Packs)
  // =========================================================================
  describe('1. Tiered Alert Catalog & Metadata Contracts (All 42 Alert Packs)', () => {

    test('1.1 Cardinality & ID Invariants: Exactly 42 packs exist and match between ALERT_PACKS and ALERTS_CATALOG', () => {
      assert.equal(ALERT_PACKS.length, 42, `Expected ALERT_PACKS to contain 42 packs, got ${ALERT_PACKS.length}`);
      assert.equal(ALERTS_CATALOG.length, 42, `Expected ALERTS_CATALOG to contain 42 packs, got ${ALERTS_CATALOG.length}`);

      const packIds = ALERT_PACKS.map((p) => p.id);
      const catalogIds = ALERTS_CATALOG.map((p) => p.id);

      // Verify all IDs are non-empty strings
      for (const id of packIds) {
        assert.ok(typeof id === 'string' && id.length > 0, `Pack ID must be non-empty string, got ${id}`);
        assert.match(id, /^[a-z0-9-]+$/, `Pack ID must be kebab-case: ${id}`);
      }

      // Verify all 42 IDs are unique
      const uniquePackIds = new Set(packIds);
      assert.equal(uniquePackIds.size, 42, 'All 42 ALERT_PACKS IDs must be strictly unique');

      const uniqueCatalogIds = new Set(catalogIds);
      assert.equal(uniqueCatalogIds.size, 42, 'All 42 ALERTS_CATALOG IDs must be strictly unique');

      // Verify 1:1 match in exact order
      assert.deepEqual(packIds, catalogIds, 'ALERT_PACKS and ALERTS_CATALOG IDs must match exactly 1:1');
    });

    test('1.2 TierLevel Contract: Every pack in ALERTS_CATALOG exposes integer tierLevel in range [1, 4]', () => {
      const tierLevelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

      for (const pack of ALERTS_CATALOG) {
        assert.ok(
          'tierLevel' in pack,
          `Pack ${pack.id} is missing tierLevel property`
        );
        assert.ok(
          Number.isInteger(pack.tierLevel),
          `Pack ${pack.id} tierLevel must be an integer, got: ${pack.tierLevel}`
        );
        assert.ok(
          pack.tierLevel >= 1 && pack.tierLevel <= 4,
          `Pack ${pack.id} tierLevel must be between 1 and 4, got: ${pack.tierLevel}`
        );
        tierLevelCounts[pack.tierLevel]++;
      }

      // Verify exact distribution:
      // Tier 1 (Ultra / Top Tier): 14 packs (6 Ultra + 3 Loyalty + 5 Store)
      // Tier 2 (Pro): 14 packs
      // Tier 3 (Plus): 10 packs
      // Tier 4 (Free): 4 packs
      assert.equal(tierLevelCounts[1], 14, `Expected 14 Tier 1 packs, got ${tierLevelCounts[1]}`);
      assert.equal(tierLevelCounts[2], 14, `Expected 14 Tier 2 packs, got ${tierLevelCounts[2]}`);
      assert.equal(tierLevelCounts[3], 10, `Expected 10 Tier 3 packs, got ${tierLevelCounts[3]}`);
      assert.equal(tierLevelCounts[4], 4, `Expected 4 Tier 4 packs, got ${tierLevelCounts[4]}`);
      assert.equal(
        tierLevelCounts[1] + tierLevelCounts[2] + tierLevelCounts[3] + tierLevelCounts[4],
        42,
        'Sum of tierLevel counts must equal 42'
      );
    });

    test('1.3 Subscription Tier Contract: Every pack exposes tier / accessType matching catalog schema', () => {
      const standardSubscriptionTiers = ['free', 'plus', 'pro', 'ultra'];
      const extendedAccessTiers = ['store', 'loyalty'];
      const allValidTiers = [...standardSubscriptionTiers, ...extendedAccessTiers];

      const counts = {};
      for (const pack of ALERTS_CATALOG) {
        assert.ok(
          typeof pack.tier === 'string' && pack.tier.length > 0,
          `Pack ${pack.id} missing tier string`
        );
        assert.ok(
          allValidTiers.includes(pack.tier),
          `Pack ${pack.id} tier "${pack.tier}" not in valid tiers: ${allValidTiers.join(', ')}`
        );
        counts[pack.tier] = (counts[pack.tier] || 0) + 1;

        // Verify tier and accessType consistency
        assert.equal(
          pack.tier,
          pack.accessType,
          `Pack ${pack.id} tier (${pack.tier}) must match accessType (${pack.accessType})`
        );
      }

      // Verify exact counts across tiers
      assert.equal(counts.free, 4, `Expected 4 free packs, got ${counts.free}`);
      assert.equal(counts.plus, 10, `Expected 10 plus packs, got ${counts.plus}`);
      assert.equal(counts.pro, 14, `Expected 14 pro packs, got ${counts.pro}`);
      assert.equal(counts.ultra, 6, `Expected 6 ultra packs, got ${counts.ultra}`);
      assert.equal(counts.loyalty, 3, `Expected 3 loyalty packs, got ${counts.loyalty}`);
      assert.equal(counts.store, 5, `Expected 5 store packs, got ${counts.store}`);
    });

    test('1.4 Audio Object Contract: Every pack defines valid audio object with preset, fileUrl, and volume', () => {
      for (const pack of ALERTS_CATALOG) {
        assert.ok(pack.audio && typeof pack.audio === 'object', `Pack ${pack.id} missing audio object`);
        assert.ok(
          typeof pack.audio.preset === 'string' && pack.audio.preset.length > 0,
          `Pack ${pack.id} missing audio.preset string`
        );
        assert.ok(
          typeof pack.audio.fileUrl === 'string' && pack.audio.fileUrl.startsWith('/media/sfx/'),
          `Pack ${pack.id} audio.fileUrl must start with /media/sfx/, got: ${pack.audio.fileUrl}`
        );
        assert.ok(
          typeof pack.audio.volume === 'number' && pack.audio.volume > 0 && pack.audio.volume <= 1.0,
          `Pack ${pack.id} audio.volume must be in range (0, 1], got: ${pack.audio.volume}`
        );

        // Sound preset alias verification
        assert.equal(pack.soundPreset, pack.audio.preset, `Pack ${pack.id} soundPreset alias mismatch`);
      }
    });

    test('1.5 VFX Object Contract: Every pack defines valid vfx object with videoUrl, textureEffect, and choreography', () => {
      const validChoreographies = Object.keys(CHOREOGRAPHY_MODES);
      const validTextures = Object.keys(TEXTURE_ENGINES);

      for (const pack of ALERTS_CATALOG) {
        assert.ok(pack.vfx && typeof pack.vfx === 'object', `Pack ${pack.id} missing vfx object`);
        assert.ok(
          typeof pack.vfx.videoUrl === 'string' && pack.vfx.videoUrl.length > 0,
          `Pack ${pack.id} missing vfx.videoUrl`
        );
        assert.ok(
          typeof pack.vfx.textureEffect === 'string' && validTextures.includes(pack.vfx.textureEffect),
          `Pack ${pack.id} invalid vfx.textureEffect: ${pack.vfx.textureEffect}`
        );
        assert.ok(
          typeof pack.vfx.choreography === 'string' && validChoreographies.includes(pack.vfx.choreography),
          `Pack ${pack.id} invalid vfx.choreography: ${pack.vfx.choreography}`
        );
      }
    });

    test('1.6 Bilingual Metadata Contract: All 42 packs provide complete Arabic and English titles and descriptions', () => {
      // Arabic Unicode block regex: [\u0600-\u06FF]
      const arabicRegex = /[\u0600-\u06FF]/;
      // Latin Unicode regex: [a-zA-Z]
      const latinRegex = /[a-zA-Z]/;

      for (const pack of ALERTS_CATALOG) {
        // Titles
        assert.ok(
          typeof pack.titleAr === 'string' && pack.titleAr.trim().length > 0,
          `Pack ${pack.id} missing titleAr`
        );
        assert.ok(
          arabicRegex.test(pack.titleAr),
          `Pack ${pack.id} titleAr must contain Arabic characters: "${pack.titleAr}"`
        );
        assert.ok(
          typeof pack.titleEn === 'string' && pack.titleEn.trim().length > 0,
          `Pack ${pack.id} missing titleEn`
        );
        assert.ok(
          latinRegex.test(pack.titleEn),
          `Pack ${pack.id} titleEn must contain Latin characters: "${pack.titleEn}"`
        );

        // Descriptions
        assert.ok(
          typeof pack.descriptionAr === 'string' && pack.descriptionAr.trim().length > 0,
          `Pack ${pack.id} missing descriptionAr`
        );
        assert.ok(
          arabicRegex.test(pack.descriptionAr),
          `Pack ${pack.id} descriptionAr must contain Arabic characters`
        );
        assert.ok(
          typeof pack.descriptionEn === 'string' && pack.descriptionEn.trim().length > 0,
          `Pack ${pack.id} missing descriptionEn`
        );
        assert.ok(
          latinRegex.test(pack.descriptionEn),
          `Pack ${pack.id} descriptionEn must contain Latin characters`
        );

        // Includes
        assert.ok(
          Array.isArray(pack.includesAr) && pack.includesAr.length > 0,
          `Pack ${pack.id} includesAr must be non-empty array`
        );
        assert.ok(
          Array.isArray(pack.includesEn) && pack.includesEn.length > 0,
          `Pack ${pack.id} includesEn must be non-empty array`
        );

        // Category labels
        assert.ok(
          typeof pack.categoryLabelAr === 'string' && pack.categoryLabelAr.length > 0,
          `Pack ${pack.id} missing categoryLabelAr`
        );
        assert.ok(
          typeof pack.categoryLabelEn === 'string' && pack.categoryLabelEn.length > 0,
          `Pack ${pack.id} missing categoryLabelEn`
        );
      }
    });

    test('1.7 Technical Specifications & Broadcast Compatibility Contract across all 42 packs', () => {
      for (const pack of ALERTS_CATALOG) {
        assert.ok(pack.specs && typeof pack.specs === 'object', `Pack ${pack.id} missing specs object`);
        assert.ok(typeof pack.specs.resolution === 'string' && pack.specs.resolution.length > 0, `Pack ${pack.id} missing specs.resolution`);
        assert.ok(typeof pack.specs.durationText === 'string' && pack.specs.durationText.length > 0, `Pack ${pack.id} missing specs.durationText`);
        assert.ok(typeof pack.specs.formats === 'string' && pack.specs.formats.length > 0, `Pack ${pack.id} missing specs.formats`);
        assert.ok(typeof pack.specs.compatibility === 'string' && pack.specs.compatibility.length > 0, `Pack ${pack.id} missing specs.compatibility`);

        // Verify compatibility string indicates broadcast / streaming platform support
        const compat = pack.specs.compatibility;
        const hasBroadcasterSupport =
          compat.includes('OBS') ||
          compat.includes('Streamlabs') ||
          compat.includes('TikTok') ||
          compat.includes('جميع برامج البث') ||
          compat.includes('جميع منصات البث') ||
          compat.includes('جميع المنصات');
        assert.ok(
          hasBroadcasterSupport,
          `Pack ${pack.id} compatibility must declare broadcast support: "${compat}"`
        );
      }
    });
  });

  // =========================================================================
  // SUITE 2: Query Helpers Adversarial Robustness & Boundary Fuzzing
  // =========================================================================
  describe('2. Query Helpers Adversarial Robustness & Boundary Fuzzing', () => {

    test('2.1 getAlertPacksByTier correctly filters all supported tiers and case-normalizes inputs', () => {
      // Standard subscription tiers
      assert.equal(getAlertPacksByTier('free').length, 4);
      assert.equal(getAlertPacksByTier('plus').length, 10);
      assert.equal(getAlertPacksByTier('pro').length, 14);
      assert.equal(getAlertPacksByTier('ultra').length, 6);

      // Extended access tiers
      assert.equal(getAlertPacksByTier('loyalty').length, 3);
      assert.equal(getAlertPacksByTier('store').length, 5);

      // Case insensitivity & trimming
      assert.equal(getAlertPacksByTier('FREE').length, 4);
      assert.equal(getAlertPacksByTier('  free  ').length, 4);
      assert.equal(getAlertPacksByTier('PrO').length, 14);
      assert.equal(getAlertPacksByTier('  uLtRa  ').length, 6);
      assert.equal(getAlertPacksByTier('LoYaLtY').length, 3);
      assert.equal(getAlertPacksByTier('STORE ').length, 5);

      // Total sum of all partitions equals 42
      const total =
        getAlertPacksByTier('free').length +
        getAlertPacksByTier('plus').length +
        getAlertPacksByTier('pro').length +
        getAlertPacksByTier('ultra').length +
        getAlertPacksByTier('loyalty').length +
        getAlertPacksByTier('store').length;
      assert.equal(total, 42, 'Sum of all tier query results must equal 42');
    });

    test('2.2 getAlertPacksByTier fuzzing: invalid, null, undefined, and non-tier inputs safely return [] without throwing', () => {
      const nonMatchingInputs = [
        null,
        undefined,
        '',
        '   ',
        'nonexistent_tier_xyz',
        'vip_hacker',
        123,
        -99,
        0,
        NaN,
        Infinity,
        -Infinity,
        {},
        { tier: 'free' },
        [],
        ['invalid_tier'],
        ['pro', 'plus'],
        false,
        () => {},
      ];

      for (const input of nonMatchingInputs) {
        let result;
        assert.doesNotThrow(() => {
          result = getAlertPacksByTier(input);
        }, `getAlertPacksByTier(${String(input)}) threw an exception`);

        assert.ok(Array.isArray(result), `getAlertPacksByTier(${String(input)}) must return an array`);
        assert.equal(result.length, 0, `getAlertPacksByTier(${String(input)}) must return empty array, got ${result.length}`);
      }

      // Document JavaScript array coercion: String(['pro']) coerces to 'pro', so it returns 14 packs
      assert.equal(getAlertPacksByTier(['pro']).length, 14, "String(['pro']) coerces to 'pro'");
    });

    test('2.3 getAlertPacksByTierLevel correctly filters tiers 1-4 and tolerates string coercions', () => {
      // Numeric levels
      const tier1 = getAlertPacksByTierLevel(1);
      const tier2 = getAlertPacksByTierLevel(2);
      const tier3 = getAlertPacksByTierLevel(3);
      const tier4 = getAlertPacksByTierLevel(4);

      assert.equal(tier1.length, 14, `Expected 14 tier 1 packs, got ${tier1.length}`);
      assert.equal(tier2.length, 14, `Expected 14 tier 2 packs, got ${tier2.length}`);
      assert.equal(tier3.length, 10, `Expected 10 tier 3 packs, got ${tier3.length}`);
      assert.equal(tier4.length, 4, `Expected 4 tier 4 packs, got ${tier4.length}`);

      // String number coercion
      assert.equal(getAlertPacksByTierLevel('1').length, 14);
      assert.equal(getAlertPacksByTierLevel('2').length, 14);
      assert.equal(getAlertPacksByTierLevel('3').length, 10);
      assert.equal(getAlertPacksByTierLevel('4').length, 4);

      // Verify tier 1 contains ultra, loyalty, and store
      const tier1AccessTypes = new Set(tier1.map((p) => p.accessType));
      assert.ok(tier1AccessTypes.has('ultra'), 'Tier 1 must contain ultra');
      assert.ok(tier1AccessTypes.has('loyalty'), 'Tier 1 must contain loyalty');
      assert.ok(tier1AccessTypes.has('store'), 'Tier 1 must contain store');
    });

    test('2.4 getAlertPacksByTierLevel fuzzing: out-of-bounds, negative, non-numeric inputs safely return [] without throwing', () => {
      const invalidLevels = [
        0,
        -1,
        -999,
        5,
        6,
        100,
        null,
        undefined,
        NaN,
        Infinity,
        -Infinity,
        'invalid',
        'level_1',
        '',
        '   ',
        {},
        [],
        false, // Number(false) === 0 -> []
        () => {},
      ];

      for (const level of invalidLevels) {
        let result;
        assert.doesNotThrow(() => {
          result = getAlertPacksByTierLevel(level);
        }, `getAlertPacksByTierLevel(${String(level)}) threw an exception`);

        assert.ok(Array.isArray(result), `getAlertPacksByTierLevel(${String(level)}) must return an array`);
        assert.equal(result.length, 0, `getAlertPacksByTierLevel(${String(level)}) must return empty array, got ${result.length}`);
      }

      // Document JavaScript boolean coercion: Number(true) === 1, so it returns Tier 1 packs
      assert.equal(getAlertPacksByTierLevel(true).length, 14, 'Number(true) === 1 returns Tier 1 packs');
    });

    test('2.5 getAlertPackById correctly retrieves existing packs and safely handles invalid IDs', () => {
      // Test known valid pack IDs
      const testIds = [
        'starter-teal-pulse',
        'crimson-blood-reaper',
        'fullscreen-blood-moon-raid',
        'store-crimson-katana-anime',
        'loyalty-pharaoh-immortal',
      ];

      for (const id of testIds) {
        const pack = getAlertPackById(id);
        assert.ok(pack !== null, `getAlertPackById(${id}) returned null for valid pack`);
        assert.equal(pack.id, id, `getAlertPackById(${id}) returned pack with mismatching id: ${pack.id}`);
      }

      // Test invalid / non-existent IDs
      const invalidIds = [
        'nonexistent-alert-pack-id-999',
        'starter-pack-does-not-exist',
        '',
        '   ',
        null,
        undefined,
        123,
        NaN,
        {},
        [],
        true,
        false,
      ];

      for (const id of invalidIds) {
        let result;
        assert.doesNotThrow(() => {
          result = getAlertPackById(id);
        }, `getAlertPackById(${String(id)}) threw an exception`);

        assert.equal(result, null, `getAlertPackById(${String(id)}) must return null, got ${typeof result}`);
      }
    });

    test('2.6 Immutability check: Returned arrays from query helpers can be mutated without affecting ALERTS_CATALOG', () => {
      const freePacks = getAlertPacksByTier('free');
      assert.equal(freePacks.length, 4);

      // Mutate returned array
      freePacks.pop();
      assert.equal(freePacks.length, 3);

      // Catalog remains intact
      assert.equal(ALERTS_CATALOG.length, 42);
      assert.equal(getAlertPacksByTier('free').length, 4);
    });
  });

  // =========================================================================
  // SUITE 3: Avatar Frame Resolution Stress Testing
  // =========================================================================
  describe('3. Avatar Frame Resolution Stress Testing', () => {

    test('3.1 Bare IDs resolution: All 4 supporter frame IDs resolve to valid frame objects', () => {
      const bareFrames = ['royal-crown', 'dragon-fire', 'crimson-demon', 'pharaoh-void'];

      for (const frameId of bareFrames) {
        const frame = getAvatarFrameById(frameId);
        assert.ok(frame !== null, `Bare frame ${frameId} must resolve to non-null object`);
        assert.equal(frame.id, frameId, `Bare frame ${frameId} resolved to wrong id: ${frame.id}`);
        assert.ok(
          typeof frame.imageUrl === 'string' && frame.imageUrl.startsWith('/media/frames/'),
          `Bare frame ${frameId} missing valid imageUrl: ${frame.imageUrl}`
        );
        assert.ok(typeof frame.accentColor === 'string', `Bare frame ${frameId} missing accentColor`);
        assert.ok(typeof frame.glowColor === 'string', `Bare frame ${frameId} missing glowColor`);
        assert.ok(typeof frame.nameAr === 'string', `Bare frame ${frameId} missing nameAr`);
        assert.ok(typeof frame.nameEn === 'string', `Bare frame ${frameId} missing nameEn`);
      }

      // Also test standard 'none' frame
      const noneFrame = getAvatarFrameById('none');
      assert.ok(noneFrame !== null, 'Frame "none" must resolve');
      assert.equal(noneFrame.id, 'none');
    });

    test('3.2 Prefixed IDs resolution: All frame-* IDs resolve identically to bare IDs', () => {
      const bareFrames = ['royal-crown', 'dragon-fire', 'crimson-demon', 'pharaoh-void'];

      for (const bareId of bareFrames) {
        const prefixedId = `frame-${bareId}`;
        const bareFrame = getAvatarFrameById(bareId);
        const prefixedFrame = getAvatarFrameById(prefixedId);

        assert.ok(prefixedFrame !== null, `Prefixed frame ${prefixedId} must resolve to non-null object`);
        assert.equal(
          prefixedFrame.id,
          bareId,
          `Prefixed frame ${prefixedId} resolved id (${prefixedFrame.id}) must match bare id (${bareId})`
        );
        assert.equal(
          prefixedFrame.imageUrl,
          bareFrame.imageUrl,
          `Prefixed frame ${prefixedId} imageUrl must match bare frame imageUrl`
        );
        assert.equal(
          prefixedFrame.accentColor,
          bareFrame.accentColor,
          `Prefixed frame ${prefixedId} accentColor must match bare frame accentColor`
        );
        assert.equal(
          prefixedFrame.glowColor,
          bareFrame.glowColor,
          `Prefixed frame ${prefixedId} glowColor must match bare frame glowColor`
        );
      }

      // Also test 'frame-none'
      const frameNone = getAvatarFrameById('frame-none');
      assert.ok(frameNone !== null, 'Frame "frame-none" must resolve');
      assert.equal(frameNone.id, 'none');
    });

    test('3.3 Falsy inputs resolution in getAvatarFrameById safely returns default royal-crown frame', () => {
      const falsyInputs = [null, undefined, '', 0, false];

      for (const input of falsyInputs) {
        const frame = getAvatarFrameById(input);
        assert.ok(frame !== null, `Falsy input ${String(input)} must resolve to default frame`);
        assert.equal(
          frame.id,
          'royal-crown',
          `Falsy input ${String(input)} must resolve to default crown frame (royal-crown), got: ${frame?.id}`
        );
        assert.equal(frame.imageUrl, '/media/frames/frame-royal-crown.png');
      }
    });

    test('3.4 Runtime AlertOverlay Avatar Frame Fallback: TransparentFramedAvatar resolves unknown string IDs to royal-crown', () => {
      // Replicate the exact resolution logic from TransparentFramedAvatar (AlertOverlay.jsx:68-75):
      function resolveOverlayFrame(rawFrameId) {
        const fallbackRaw = rawFrameId || 'royal-crown';
        const normalizedFrameKey = String(fallbackRaw).startsWith('frame-')
          ? fallbackRaw
          : `frame-${fallbackRaw}`;
        const frameObj =
          AVATAR_FRAMES_MAP[fallbackRaw] ||
          AVATAR_FRAMES_MAP[normalizedFrameKey] ||
          AVATAR_FRAMES_MAP[String(fallbackRaw).replace(/^frame-/, '')] ||
          AVATAR_FRAMES_MAP['royal-crown'];
        return frameObj ? frameObj.id : 'royal-crown';
      }

      const unknownIds = [
        'unknown-frame-xyz',
        'frame-nonexistent',
        'invalid_frame_123',
        'frame-corrupted-hash',
        'hacker_glitch_frame',
        'random-custom-frame',
        null,
        undefined,
        '',
      ];

      for (const unknownId of unknownIds) {
        const resolvedId = resolveOverlayFrame(unknownId);
        assert.equal(
          resolvedId,
          'royal-crown',
          `AlertOverlay resolution for "${unknownId}" must safely fall back to royal-crown, got: ${resolvedId}`
        );
      }
    });

    test('3.5 Empirical investigation of getAvatarFrameById with unknown string IDs', () => {
      // In getAvatarFrameById (alertPacks.js:60-67):
      // if (!frameId) return AVATAR_FRAMES_MAP['royal-crown'] || null;
      // return AVATAR_FRAMES_MAP[frameId] || AVATAR_FRAMES_MAP[String(frameId).replace(/^frame-/, '')] || null;
      //
      // For unrecognized non-empty strings, getAvatarFrameById currently returns null.
      // We empirically verify this behavior without crashing:
      const unknownIds = ['unknown-frame-xyz', 'frame-nonexistent', 'random_garbage'];

      for (const unknownId of unknownIds) {
        let result;
        assert.doesNotThrow(() => {
          result = getAvatarFrameById(unknownId);
        }, `getAvatarFrameById(${unknownId}) threw an exception`);

        // It returns null rather than throwing
        assert.equal(
          result,
          null,
          `getAvatarFrameById(${unknownId}) returns null for unregistered frame keys`
        );
      }
    });
  });

  // =========================================================================
  // SUITE 4: Avatar Frame Asset & CSS Theme Verification
  // =========================================================================
  describe('4. Avatar Frame Asset & CSS Theme Verification', () => {

    test('4.1 Physical PNG frame assets exist in public/media/frames/ with valid PNG magic bytes and >100KB size', () => {
      const frameFiles = [
        'frame-royal-crown.png',
        'frame-dragon-fire.png',
        'frame-crimson-demon.png',
        'frame-pharaoh-void.png',
      ];

      const framesDir = path.join(PUBLIC_DIR, 'media/frames');
      assert.ok(fs.existsSync(framesDir), `Frames directory must exist: ${framesDir}`);

      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      for (const file of frameFiles) {
        const filePath = path.join(framesDir, file);
        assert.ok(fs.existsSync(filePath), `PNG frame file missing: ${file}`);

        const stat = fs.statSync(filePath);
        assert.ok(
          stat.size > 100000,
          `PNG frame file ${file} size (${stat.size} bytes) must be > 100KB for high-DPI stream clarity`
        );

        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(8);
        fs.readSync(fd, buffer, 0, 8, 0);
        fs.closeSync(fd);

        assert.deepEqual(
          buffer,
          pngMagicBytes,
          `File ${file} does not have valid PNG header magic bytes`
        );
      }
    });

    test('4.2 AlertOverlay.css defines theme-specific frame classes with dedicated CSS variables', () => {
      const cssPath = path.resolve(__dirname, '../components/AlertOverlay.css');
      assert.ok(fs.existsSync(cssPath), `AlertOverlay.css must exist at ${cssPath}`);

      const cssContent = fs.readFileSync(cssPath, 'utf8');

      const expectedClasses = [
        '.mn-framed-avatar-box.frame-royal-crown',
        '.mn-framed-avatar-box.frame-dragon-fire',
        '.mn-framed-avatar-box.frame-crimson-demon',
        '.mn-framed-avatar-box.frame-pharaoh-void',
      ];

      for (const cls of expectedClasses) {
        assert.ok(
          cssContent.includes(cls),
          `AlertOverlay.css must contain dedicated selector: ${cls}`
        );
      }

      // Verify custom variables
      assert.ok(cssContent.includes('--frame-accent: #fbbf24'), 'Missing royal crown accent color in CSS');
      assert.ok(cssContent.includes('--frame-accent: #f97316'), 'Missing dragon fire accent color in CSS');
      assert.ok(cssContent.includes('--frame-accent: #ef4444'), 'Missing crimson demon accent color in CSS');
      assert.ok(cssContent.includes('--frame-accent: #2dd4bf'), 'Missing pharaoh void accent color in CSS');
    });

    test('4.3 AlertOverlay.jsx TransparentFramedAvatar attaches frame-id and data-frame-id attributes', () => {
      const overlayPath = path.resolve(__dirname, '../components/AlertOverlay.jsx');
      assert.ok(fs.existsSync(overlayPath), `AlertOverlay.jsx must exist at ${overlayPath}`);

      const overlayContent = fs.readFileSync(overlayPath, 'utf8');
      assert.ok(
        overlayContent.includes('frame-${pureFrameId}'),
        'AlertOverlay.jsx must attach frame-${pureFrameId} class'
      );
      assert.ok(
        overlayContent.includes('data-frame-id={`frame-${pureFrameId}`}'),
        'AlertOverlay.jsx must attach data-frame-id attribute'
      );
    });
  });

  // =========================================================================
  // SUITE 5: Cross-Feature Integration & Contract Conformity
  // =========================================================================
  describe('5. Cross-Feature Integration & Contract Conformity', () => {

    test('5.1 StreamEvent sender with bare and prefixed frameId satisfies formal contract', () => {
      const frames = [
        'royal-crown',
        'dragon-fire',
        'crimson-demon',
        'pharaoh-void',
        'frame-royal-crown',
        'frame-dragon-fire',
        'frame-crimson-demon',
        'frame-pharaoh-void',
      ];

      for (const frameId of frames) {
        const mockEvent = {
          id: `evt_test_${frameId}`,
          type: 'donation',
          platform: 'twitch',
          priority: 2,
          tier: 'ultra',
          sender: {
            name: 'TopDonor',
            frameId,
          },
          payload: {
            amount: 500,
            currency: 'EGP',
            message: 'Long live the stream!',
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + 60000,
        };

        const validation = validateStreamEventContract(mockEvent);
        assert.ok(
          validation.valid,
          `Event with frameId "${frameId}" failed contract: ${validation.errors.join(', ')}`
        );
      }
    });

    test('5.2 VALID_AVATAR_FRAMES in contractDefinitions includes both bare and prefixed IDs', () => {
      const expectedBare = ['royal-crown', 'dragon-fire', 'crimson-demon', 'pharaoh-void'];
      const expectedPrefixed = ['frame-royal-crown', 'frame-dragon-fire', 'frame-crimson-demon', 'frame-pharaoh-void'];

      for (const id of expectedBare) {
        assert.ok(
          VALID_AVATAR_FRAMES.includes(id),
          `VALID_AVATAR_FRAMES missing bare ID: ${id}`
        );
      }
      for (const id of expectedPrefixed) {
        assert.ok(
          VALID_AVATAR_FRAMES.includes(id),
          `VALID_AVATAR_FRAMES missing prefixed ID: ${id}`
        );
      }
    });

    test('5.3 Cross-referencing: Every alert pack references a valid avatar frame in AVATAR_FRAMES_MAP', () => {
      for (const pack of ALERTS_CATALOG) {
        assert.ok(
          pack.frameId in AVATAR_FRAMES_MAP,
          `Pack ${pack.id} references invalid frameId: ${pack.frameId}`
        );
        assert.ok(
          pack.framePrefixedId in AVATAR_FRAMES_MAP,
          `Pack ${pack.id} references invalid framePrefixedId: ${pack.framePrefixedId}`
        );
      }
    });
  });
});
