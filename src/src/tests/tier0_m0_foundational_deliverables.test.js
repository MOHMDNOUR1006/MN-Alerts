/**
 * Tier 0: Milestone 0 Foundational Deliverables & Catalog Integrity
 * Strictly verifies genuine Milestone 0 deliverables:
 * 1. The 5 Foundational Architecture Documents
 * 2. 42-Pack Alert Catalog Scale & Historical Alert Recovery (16 Historical Packs)
 * 3. Bilingual Metadata Completeness (Zero Arabic Fallback for English fields)
 * 4. Transparent RGBA Avatar Frames & Audio Assets Baseline
 *
 * Grounded in: ORIGINAL_REQUEST.md (R1, R3) and PROJECT.md (Milestone M0)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ALERT_PACKS,
  ALERTS_CATALOG,
  AVATAR_FRAMES,
  AVATAR_FRAMES_MAP,
} from '../data/alertsCatalog.js';

import { SOUND_PRESETS_LIST, soundEngine } from '../services/soundEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const PUBLIC_DIR = path.resolve(__dirname, '../../public');

describe('Tier 0: Milestone 0 Foundational Deliverables & Catalog Integrity', () => {

  // =========================================================================
  // 0.1 Foundational Architecture Documents Integrity
  // =========================================================================
  describe('0.1 Foundational Architecture Documents Integrity', () => {
    test('confirms all 5 foundational architecture documents exist in root with substantive size (>5KB)', () => {
      const requiredDocs = [
        'MN_ALERTS_MASTER_ARCHITECTURE.md',
        'MN_ALERTS_AGENT_RESPONSIBILITIES.md',
        'MN_ALERTS_FEATURE_MATRIX.md',
        'MN_ALERTS_DEVELOPMENT_ROADMAP.md',
        'MN_ALERTS_RELEASE_ACCEPTANCE.md',
      ];

      for (const doc of requiredDocs) {
        const fullPath = path.join(ROOT_DIR, doc);
        assert.ok(fs.existsSync(fullPath), `Foundational doc missing: ${doc}`);
        const stat = fs.statSync(fullPath);
        assert.ok(
          stat.size > 5000,
          `Document ${doc} must have substantive technical content (>5KB), got ${stat.size} bytes`
        );
      }
    });

    test('confirms MN_ALERTS_MASTER_ARCHITECTURE.md specifies dual architecture and interface contracts', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'MN_ALERTS_MASTER_ARCHITECTURE.md'), 'utf8');
      assert.ok(content.includes('Creator Dashboard'), 'Master doc missing Creator Dashboard architecture');
      assert.ok(content.includes('OBS Overlay Runtime'), 'Master doc missing OBS Overlay Runtime specification');
      assert.ok(content.includes('Priority Alert Queue'), 'Master doc missing Priority Alert Queue system');
      assert.ok(content.includes('HMAC'), 'Master doc missing HMAC tokenized security');
    });

    test('confirms MN_ALERTS_AGENT_RESPONSIBILITIES.md specifies all 14 specialized agent roles', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'MN_ALERTS_AGENT_RESPONSIBILITIES.md'), 'utf8');
      for (let i = 1; i <= 14; i++) {
        const agentTag = `Agent ${String(i).padStart(2, '0')}`;
        assert.ok(content.includes(agentTag), `Responsibilities doc missing ${agentTag}`);
      }
    });

    test('confirms MN_ALERTS_FEATURE_MATRIX.md maps 4-tier monetization, 42 packs, and 16 widgets', () => {
      const content = fs.readFileSync(path.join(ROOT_DIR, 'MN_ALERTS_FEATURE_MATRIX.md'), 'utf8');
      assert.ok(content.includes('42 packs') || content.includes('42'), 'Matrix missing 42 packs scale');
      assert.ok(
        content.includes('16 widgets') || content.includes('16 Stream Engagement Widgets'),
        'Matrix missing 16 widgets specification'
      );
      assert.ok(content.includes('Free Starter'), 'Matrix missing Free Starter tier');
      assert.ok(content.includes('Plus'), 'Matrix missing Plus tier');
      assert.ok(content.includes('Pro'), 'Matrix missing Pro tier');
      assert.ok(content.includes('Ultra'), 'Matrix missing Ultra tier');
    });

    test('confirms MN_ALERTS_DEVELOPMENT_ROADMAP.md and MN_ALERTS_RELEASE_ACCEPTANCE.md define milestones M0 through M6', () => {
      const roadContent = fs.readFileSync(path.join(ROOT_DIR, 'MN_ALERTS_DEVELOPMENT_ROADMAP.md'), 'utf8');
      const accContent = fs.readFileSync(path.join(ROOT_DIR, 'MN_ALERTS_RELEASE_ACCEPTANCE.md'), 'utf8');
      for (const phase of ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6']) {
        assert.ok(roadContent.includes(phase), `Roadmap missing ${phase}`);
      }
      assert.ok(
        accContent.includes('Gate') || accContent.includes('Acceptance'),
        'Acceptance doc missing gate criteria'
      );
    });
  });

  // =========================================================================
  // 0.2 Alerts Catalog Scale & Historical Alert Recovery (42 Packs)
  // =========================================================================
  describe('0.2 Alerts Catalog Scale & Historical Alert Recovery (42 Packs)', () => {
    test('confirms ALERT_PACKS contains exactly 42 unique alert packs', () => {
      assert.equal(ALERT_PACKS.length, 42, `Expected exactly 42 packs in ALERT_PACKS, found ${ALERT_PACKS.length}`);
      const uniqueIds = new Set(ALERT_PACKS.map((p) => p.id));
      assert.equal(uniqueIds.size, 42, 'All 42 alert packs must possess unique IDs');
    });

    test('confirms all 16 historical alert IDs from git logs are recovered and active in catalog', () => {
      const HISTORICAL_IDS = [
        'crimson-blood-reaper',
        'crystal-shatter-prism',
        'abyssal-water-ripple',
        'sultan-velvet-gold',
        'fullscreen-blood-moon-raid',
        'fullscreen-shattered-dimension',
        'starter-teal-pulse',
        'starter-emerald-tip',
        'loyalty-pharaoh-immortal',
        'loyalty-molten-dragon',
        'store-crimson-katana-anime',
        'store-cyberpunk-overdrive',
        'scene-starting-soon-oasis',
        'scene-brb-velvet',
        'scene-ending-supernova',
        'widget-all-in-one-hud',
      ];

      const packIds = new Set(ALERT_PACKS.map((p) => p.id));
      for (const id of HISTORICAL_IDS) {
        assert.ok(packIds.has(id), `Missing recovered historical alert: ${id}`);
      }
    });

    test('confirms catalog access tiers span Free, Plus, Pro, Ultra, Loyalty, and Store', () => {
      const counts = {};
      for (const p of ALERT_PACKS) {
        counts[p.accessType] = (counts[p.accessType] || 0) + 1;
      }
      assert.ok(counts.free >= 4, `Expected >= 4 free packs, got ${counts.free}`);
      assert.ok(counts.plus >= 10, `Expected >= 10 plus packs, got ${counts.plus}`);
      assert.ok(counts.pro >= 14, `Expected >= 14 pro packs, got ${counts.pro}`);
      assert.ok(counts.ultra >= 6, `Expected >= 6 ultra packs, got ${counts.ultra}`);
      assert.ok(counts.loyalty >= 3, `Expected >= 3 loyalty packs, got ${counts.loyalty}`);
      assert.ok(counts.store >= 5, `Expected >= 5 store packs, got ${counts.store}`);
    });

    test('confirms ALERTS_CATALOG exported array provides 42 fully enriched items', () => {
      assert.equal(ALERTS_CATALOG.length, 42, `Expected 42 items in ALERTS_CATALOG, got ${ALERTS_CATALOG.length}`);
      for (const item of ALERTS_CATALOG) {
        assert.ok(item.id, 'Item missing id');
        assert.ok(item.name, `Item missing name: ${item.id}`);
        assert.ok(item.title, `Item missing title: ${item.id}`);
        assert.ok(item.techSpecs, `Item missing techSpecs: ${item.id}`);
      }
    });
  });

  // =========================================================================
  // 0.3 Bilingual Metadata Integrity (Zero Arabic Fallback for English Fields)
  // =========================================================================
  describe('0.3 Bilingual Metadata Integrity (Zero Arabic Fallback)', () => {
    test('every pack in ALERT_PACKS defines non-empty titleAr and titleEn with appropriate scripts', () => {
      for (const p of ALERT_PACKS) {
        assert.ok(p.titleAr && /[\u0600-\u06FF]/.test(p.titleAr), `${p.id} missing Arabic text in titleAr`);
        assert.ok(p.titleEn && /[A-Za-z]/.test(p.titleEn), `${p.id} missing English text in titleEn`);
      }
    });

    test('every pack in ALERT_PACKS defines non-empty descriptionAr and descriptionEn', () => {
      for (const p of ALERT_PACKS) {
        assert.ok(p.descriptionAr && /[\u0600-\u06FF]/.test(p.descriptionAr), `${p.id} missing Arabic in descriptionAr`);
        assert.ok(
          p.descriptionEn && /[A-Za-z]/.test(p.descriptionEn) && !/[\u0600-\u06FF]/.test(p.descriptionEn),
          `${p.id} missing valid Latin English descriptionEn (or contained Arabic fallback)`
        );
      }
    });

    test('every pack in ALERT_PACKS defines includesAr and includesEn as non-empty arrays', () => {
      for (const p of ALERT_PACKS) {
        assert.ok(
          Array.isArray(p.includesAr) && p.includesAr.length >= 2,
          `${p.id} includesAr must be an array of >= 2 items`
        );
        assert.ok(
          Array.isArray(p.includesEn) && p.includesEn.length >= 2,
          `${p.id} includesEn must be an array of >= 2 items`
        );
        for (const bullet of p.includesEn) {
          assert.ok(
            /[A-Za-z]/.test(bullet) && !/[\u0600-\u06FF]/.test(bullet),
            `${p.id} includesEn bullet contains Arabic characters or lacks English: "${bullet}"`
          );
        }
      }
    });

    test('every pack in ALERT_PACKS defines bilingual category labels, texture labels, and price labels', () => {
      for (const p of ALERT_PACKS) {
        assert.ok(p.categoryLabelAr, `${p.id} missing categoryLabelAr`);
        assert.ok(p.categoryLabelEn && /[A-Za-z]/.test(p.categoryLabelEn), `${p.id} missing categoryLabelEn`);
        assert.ok(p.textureLabelAr, `${p.id} missing textureLabelAr`);
        assert.ok(p.textureLabelEn && /[A-Za-z]/.test(p.textureLabelEn), `${p.id} missing textureLabelEn`);
        assert.ok(p.priceLabelAr, `${p.id} missing priceLabelAr`);
        assert.ok(p.priceLabelEn && /[A-Za-z]/.test(p.priceLabelEn), `${p.id} missing priceLabelEn`);
      }
    });

    test('every pack in ALERT_PACKS defines bilingual defaultSample event texts', () => {
      for (const p of ALERT_PACKS) {
        assert.ok(p.defaultSample, `${p.id} missing defaultSample`);
        const s = p.defaultSample;
        assert.ok(s.headerText, `${p.id} missing defaultSample.headerText`);
        assert.ok(s.headerTextEn && /[A-Za-z]/.test(s.headerTextEn), `${p.id} missing defaultSample.headerTextEn`);
        assert.ok(s.subText, `${p.id} missing defaultSample.subText`);
        assert.ok(s.subTextEn && /[A-Za-z]/.test(s.subTextEn), `${p.id} missing defaultSample.subTextEn`);
        assert.ok(s.message, `${p.id} missing defaultSample.message`);
        assert.ok(s.messageEn && /[A-Za-z]/.test(s.messageEn), `${p.id} missing defaultSample.messageEn`);
      }
    });

    test('confirms ALERTS_CATALOG exported items resolve descriptionEn and includesEn to pure English without fallback', () => {
      for (const item of ALERTS_CATALOG) {
        assert.ok(
          item.descriptionEn && /[A-Za-z]/.test(item.descriptionEn) && !/[\u0600-\u06FF]/.test(item.descriptionEn),
          `ALERTS_CATALOG item ${item.id} descriptionEn has Arabic fallback: "${item.descriptionEn?.slice(0, 40)}..."`
        );
        assert.ok(
          Array.isArray(item.includesEn) && item.includesEn.length > 0,
          `ALERTS_CATALOG item ${item.id} missing includesEn`
        );
        for (const b of item.includesEn) {
          assert.ok(
            /[A-Za-z]/.test(b) && !/[\u0600-\u06FF]/.test(b),
            `ALERTS_CATALOG item ${item.id} includesEn bullet has Arabic fallback: "${b}"`
          );
        }
      }
    });
  });

  // =========================================================================
  // 0.4 Supporter Avatar Frames & Audio Asset Pipeline Baseline
  // =========================================================================
  describe('0.4 Avatar Frames & Asset Files Verification', () => {
    test('confirms AVATAR_FRAMES and AVATAR_FRAMES_MAP export 4 supporter frames with valid disk images', () => {
      assert.ok(Array.isArray(AVATAR_FRAMES), 'AVATAR_FRAMES must be an array');
      assert.ok(AVATAR_FRAMES.length >= 4, 'Must have at least 4 avatar frames');

      const expectedFrames = ['royal-crown', 'dragon-fire', 'crimson-demon', 'pharaoh-void'];
      for (const frameId of expectedFrames) {
        const frame = AVATAR_FRAMES_MAP[frameId];
        assert.ok(frame, `Missing frame in map: ${frameId}`);
        assert.ok(frame.imageUrl, `Frame missing imageUrl: ${frameId}`);

        const localImgPath = path.join(PUBLIC_DIR, frame.imageUrl.replace(/^\//, ''));
        assert.ok(fs.existsSync(localImgPath), `Avatar frame image file missing: ${localImgPath}`);
        const stat = fs.statSync(localImgPath);
        assert.ok(stat.size > 1000, `Avatar frame image must be > 1KB, got ${stat.size} bytes: ${localImgPath}`);
      }
    });

    test('confirms pre-mastered SFX files exist in public/media/sfx with non-zero size', () => {
      const sfxDir = path.join(PUBLIC_DIR, 'media/sfx');
      assert.ok(fs.existsSync(sfxDir), `SFX directory must exist at ${sfxDir}`);
      const files = fs.readdirSync(sfxDir).filter((f) => f.endsWith('.mp3'));
      assert.ok(files.length >= 8, `Expected at least 8 SFX audio files, found ${files.length}`);
      for (const f of files) {
        const full = path.join(sfxDir, f);
        const stat = fs.statSync(full);
        assert.ok(stat.size > 20000, `Audio file ${f} must be > 20KB, got ${stat.size} bytes`);
      }
    });

    test('confirms SOUND_PRESETS_LIST defines unique sound presets with valid audio paths', () => {
      assert.ok(Array.isArray(SOUND_PRESETS_LIST), 'SOUND_PRESETS_LIST must be an array');
      assert.ok(SOUND_PRESETS_LIST.length >= 10, 'Expected at least 10 sound presets');

      const presetIds = new Set();
      for (const preset of SOUND_PRESETS_LIST) {
        assert.ok(preset.id && typeof preset.id === 'string', 'Preset must have a string id');
        assert.ok(!presetIds.has(preset.id), `Preset id ${preset.id} must be unique`);
        presetIds.add(preset.id);
        assert.ok(preset.fileUrl && typeof preset.fileUrl === 'string', `Preset ${preset.id} must have fileUrl`);
      }
    });

    test('confirms AlertOverlay.css strictly enforces transparent OBS background', () => {
      const cssPath = path.join(ROOT_DIR, 'src/components/AlertOverlay.css');
      assert.ok(fs.existsSync(cssPath), `AlertOverlay.css must exist at ${cssPath}`);
      const css = fs.readFileSync(cssPath, 'utf8');
      assert.ok(
        css.includes('background: transparent') || css.includes('background-color: transparent'),
        'AlertOverlay.css must enforce transparent background for OBS CEF'
      );
    });

    test('confirms index.html includes typography link for Arabic and Latin fonts', () => {
      const indexPath = path.join(ROOT_DIR, 'index.html');
      assert.ok(fs.existsSync(indexPath), `index.html must exist at ${indexPath}`);
      const html = fs.readFileSync(indexPath, 'utf8');
      assert.ok(
        html.includes('Cairo') || html.includes('Tajawal') || html.includes('fonts.googleapis.com'),
        'index.html must include Google Fonts link for Arabic/Latin typography'
      );
    });
  });
});
