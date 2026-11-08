/**
 * widgets_m3_suite.test.js - Milestone 3 Stream Widgets & Infrastructure Suite
 * Validates:
 * - 16 Widgets Codebase Files, Contracts & Component Signatures
 * - StreamWidgetProps & Container Architecture
 * - Defensive HTML/CSS Sanitizer & XSS Neutralization
 * - Isomorphic EventBus Fanout & Memory Safety
 * - Platform API Facade & Event Simulation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  escapeHtml,
  sanitizeHtml,
  sanitizeCss,
} from '../../core/utils/sanitizer.js';

import { EventBus } from '../../services/eventBus.js';
import { platformApi } from '../../services/platformApi.js';
import { validateStreamEventContract } from '../helpers/contractDefinitions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WIDGETS_DIR = path.resolve(__dirname, '../../components/widgets');

describe('Milestone 3 Stream Widgets Suite & Infrastructure Tests', () => {

  // =========================================================================
  // 1. Widget Files & Contract Scale (16 Widgets)
  // =========================================================================
  describe('1. Widget Files & Contract Scale', () => {
    const EXPECTED_WIDGET_FILES = [
      { file: 'ChatBox.jsx', type: 'chat-box' },
      { file: 'EventList.jsx', type: 'event-list' },
      { file: 'GoalWidget.jsx', type: 'goals-progress' },
      { file: 'TipJar.jsx', type: 'tip-jar' },
      { file: 'TopSupporters.jsx', type: 'top-supporters' },
      { file: 'EndCredits.jsx', type: 'end-credits' },
      { file: 'MediaShare.jsx', type: 'media-share' },
      { file: 'PollWidget.jsx', type: 'polls' },
      { file: 'SpinWheel.jsx', type: 'spin-wheel' },
      { file: 'StreamBoss.jsx', type: 'stream-boss' },
      { file: 'EmoteWall.jsx', type: 'emote-wall' },
      { file: 'SponsorBanner.jsx', type: 'sponsor-banner' },
      { file: 'CountdownTimer.jsx', type: 'countdown-timer' },
      { file: 'StreamLabels.jsx', type: 'stream-labels' },
      { file: 'ViewerCounter.jsx', type: 'viewer-counter' },
      { file: 'CustomWidget.jsx', type: 'custom-html' },
    ];

    test('confirms all 16 widget files exist on disk with non-empty content', () => {
      assert.ok(fs.existsSync(WIDGETS_DIR), 'src/components/widgets directory must exist');

      for (const { file } of EXPECTED_WIDGET_FILES) {
        const fullPath = path.join(WIDGETS_DIR, file);
        assert.ok(fs.existsSync(fullPath), `Widget file ${file} must exist`);
        const stats = fs.statSync(fullPath);
        assert.ok(stats.size > 500, `Widget file ${file} must contain substantive implementation (>500 bytes)`);
      }
    });

    test('confirms all 16 widgets accept StreamWidgetProps and wrap with WidgetContainer', () => {
      for (const { file, type } of EXPECTED_WIDGET_FILES) {
        const fullPath = path.join(WIDGETS_DIR, file);
        const code = fs.readFileSync(fullPath, 'utf8');

        assert.ok(code.includes('WidgetContainer'), `${file} must import and use WidgetContainer`);
        assert.ok(code.includes('isOverlayMode'), `${file} must accept isOverlayMode prop`);
        assert.ok(code.includes('eventBus'), `${file} must accept eventBus prop`);
        assert.ok(code.includes('config'), `${file} must accept config prop`);
        assert.ok(code.includes(`type = '${type}'`) || code.includes(`type: '${type}'`) || code.includes(type), `${file} must specify type "${type}"`);
      }
    });

    test('confirms WidgetContainer.jsx exports WidgetContainer and WidgetErrorBoundary', () => {
      const containerPath = path.join(WIDGETS_DIR, 'WidgetContainer.jsx');
      assert.ok(fs.existsSync(containerPath), 'WidgetContainer.jsx must exist');
      const code = fs.readFileSync(containerPath, 'utf8');
      assert.ok(code.includes('export class WidgetErrorBoundary'), 'Must export WidgetErrorBoundary');
      assert.ok(code.includes('export function WidgetContainer'), 'Must export WidgetContainer');
      assert.ok(code.includes('background: \'transparent !important\'') || code.includes('mn-widget-overlay-mode'), 'Must enforce OBS transparency');
    });

    test('confirms Widgets.css defines scoped styles for all 16 widgets and OBS transparency', () => {
      const cssPath = path.join(WIDGETS_DIR, 'Widgets.css');
      assert.ok(fs.existsSync(cssPath), 'Widgets.css must exist');
      const css = fs.readFileSync(cssPath, 'utf8');

      assert.ok(css.includes('background: transparent !important'), 'Widgets.css must enforce transparency in overlay mode');
      assert.ok(css.includes('.mn-chatbox'), 'Must style chatbox');
      assert.ok(css.includes('.mn-eventlist'), 'Must style eventlist');
      assert.ok(css.includes('.mn-goals'), 'Must style goals');
      assert.ok(css.includes('.mn-tipjar'), 'Must style tipjar');
      assert.ok(css.includes('.mn-topsupporters'), 'Must style topsupporters');
      assert.ok(css.includes('.mn-endcredits'), 'Must style endcredits');
      assert.ok(css.includes('.mn-mediashare'), 'Must style mediashare');
      assert.ok(css.includes('.mn-polls'), 'Must style polls');
      assert.ok(css.includes('.mn-spinwheel'), 'Must style spinwheel');
      assert.ok(css.includes('.mn-streamboss'), 'Must style streamboss');
      assert.ok(css.includes('.mn-emotewall'), 'Must style emotewall');
      assert.ok(css.includes('.mn-sponsorbanner'), 'Must style sponsorbanner');
      assert.ok(css.includes('.mn-countdowntimer'), 'Must style countdowntimer');
      assert.ok(css.includes('.mn-streamlabels'), 'Must style streamlabels');
      assert.ok(css.includes('.mn-viewercounter'), 'Must style viewercounter');
      assert.ok(css.includes('.mn-customwidget'), 'Must style customwidget');
    });

    test('confirms index.js exports WIDGET_REGISTRY, WIDGET_CATALOG, and getWidgetComponent', () => {
      const indexPath = path.join(WIDGETS_DIR, 'index.js');
      assert.ok(fs.existsSync(indexPath), 'widgets/index.js must exist');
      const code = fs.readFileSync(indexPath, 'utf8');

      assert.ok(code.includes('export const WIDGET_REGISTRY'), 'Must export WIDGET_REGISTRY');
      assert.ok(code.includes('export const WIDGET_CATALOG'), 'Must export WIDGET_CATALOG');
      assert.ok(code.includes('export function getWidgetComponent'), 'Must export getWidgetComponent');

      // Verify all 16 types are cataloged in index.js
      for (const { type } of EXPECTED_WIDGET_FILES) {
        assert.ok(code.includes(`'${type}'`), `index.js must register type "${type}"`);
      }
    });
  });

  // =========================================================================
  // 2. Defensive Sanitizer & XSS Defense
  // =========================================================================
  describe('2. Defensive Sanitizer & XSS Defense', () => {
    test('escapeHtml neutralizes HTML control characters', () => {
      const dirty = '<script>alert("XSS" & \'test\')</script>';
      const clean = escapeHtml(dirty);
      assert.ok(!clean.includes('<'));
      assert.ok(!clean.includes('>'));
      assert.ok(!clean.includes('"'));
      assert.ok(!clean.includes("'"));
      assert.ok(clean.includes('&lt;script&gt;'));
    });

    test('sanitizeHtml strictly removes dangerous script and iframe tags', () => {
      const malicious = '<div class="alert">Hello<script>alert(document.cookie)</script></div><iframe src="evil.com"></iframe>';
      const clean = sanitizeHtml(malicious);
      assert.ok(!clean.includes('<script>'), 'Must remove <script> tags');
      assert.ok(!clean.includes('document.cookie'), 'Must remove script contents');
      assert.ok(!clean.includes('<iframe'), 'Must remove <iframe> tags');
      assert.ok(clean.includes('<div class="alert">Hello</div>'), 'Must preserve safe markup');
    });

    test('sanitizeHtml removes inline event handlers (onerror, onload, onclick)', () => {
      const payload = '<img src="https://example.com/pic.png" onerror="alert(1)" onload="evil()" onclick="steal()" />';
      const clean = sanitizeHtml(payload);
      assert.ok(!clean.includes('onerror'), 'Must strip onerror');
      assert.ok(!clean.includes('onload'), 'Must strip onload');
      assert.ok(!clean.includes('onclick'), 'Must strip onclick');
      assert.ok(clean.includes('src="https://example.com/pic.png"'), 'Must keep safe src');
    });

    test('sanitizeHtml strictly strips javascript: and data:text/html URI schemes', () => {
      const maliciousLink = '<a href="javascript:alert(1)">Click Me</a><img src="data:text/html,<script>alert(1)</script>" />';
      const clean = sanitizeHtml(maliciousLink);
      assert.ok(!clean.includes('javascript:'), 'Must reject javascript: href');
      assert.ok(!clean.includes('data:text/html'), 'Must reject data:text/html src');
    });

    test('sanitizeCss strips expression, behavior, and javascript: URLs', () => {
      const badCss = 'body { color: red; width: expression(alert(1)); behavior: url(test.htc); background: url(javascript:evil()); }';
      const cleanCss = sanitizeCss(badCss);
      assert.ok(!cleanCss.includes('expression'), 'Must strip CSS expressions');
      assert.ok(!cleanCss.includes('behavior'), 'Must strip behavior:');
      assert.ok(!cleanCss.includes('javascript:'), 'Must strip javascript: in url()');
      assert.ok(cleanCss.includes('color: red'), 'Must preserve safe styles');
    });
  });

  // =========================================================================
  // 3. Central EventBus & Multi-Channel Fanout
  // =========================================================================
  describe('3. Central EventBus & Multi-Channel Fanout', () => {
    test('supports on, off, once, emit, and returns unsubscribe callback', () => {
      const bus = new EventBus();
      let callCount = 0;

      const unsub = bus.on('test_event', () => {
        callCount++;
      });

      assert.equal(bus.listenerCount('test_event'), 1);
      bus.emit('test_event');
      assert.equal(callCount, 1);

      unsub();
      assert.equal(bus.listenerCount('test_event'), 0);
      bus.emit('test_event');
      assert.equal(callCount, 1); // Unsubscribed, does not increment
    });

    test('once handler executes exactly once and cleans up listener', () => {
      const bus = new EventBus();
      let onceCalls = 0;

      bus.once('single_tick', () => {
        onceCalls++;
      });

      assert.equal(bus.listenerCount('single_tick'), 1);
      bus.emit('single_tick');
      assert.equal(onceCalls, 1);
      assert.equal(bus.listenerCount('single_tick'), 0);

      bus.emit('single_tick');
      assert.equal(onceCalls, 1);
    });

    test('dispatch executes triple fanout and stores in bounded history buffer', () => {
      const bus = new EventBus({ maxHistory: 3 });
      let streamEventReceived = false;
      let typedReceived = false;
      let donationProcReceived = false;

      bus.on('stream_event', () => { streamEventReceived = true; });
      bus.on('donation', () => { typedReceived = true; });
      bus.on('donation_processed', () => { donationProcReceived = true; });

      const rawEvt = {
        id: 'evt_history_001',
        type: 'donation',
        platform: 'twitch',
        payload: { amount: 50, currency: 'USD' },
      };

      bus.dispatch(rawEvt);

      assert.ok(streamEventReceived, 'Must emit to stream_event');
      assert.ok(typedReceived, 'Must emit to donation');
      assert.ok(donationProcReceived, 'Must emit to donation_processed');
      assert.equal(bus.getHistory().length, 1);

      // Verify bounded history
      bus.dispatch({ id: 'evt_history_002', type: 'follow' });
      bus.dispatch({ id: 'evt_history_003', type: 'follow' });
      bus.dispatch({ id: 'evt_history_004', type: 'follow' });

      assert.equal(bus.getHistory().length, 3, 'History buffer must be clamped to maxHistory (3)');
      assert.equal(bus.getHistory()[0].id, 'evt_history_004', 'Most recent event must be at index 0');
    });

    test('isolates listener errors preventing crash of peer subscribers', () => {
      const bus = new EventBus();
      let peerRan = false;

      bus.on('hazard_test', () => {
        throw new Error('Fatal listener exception');
      });
      bus.on('hazard_test', () => {
        peerRan = true;
      });

      assert.doesNotThrow(() => {
        bus.emit('hazard_test');
      });
      assert.ok(peerRan, 'Peer listener must run even if previous listener threw an error');
    });
  });

  // =========================================================================
  // 4. Platform API Facade & Event Simulation
  // =========================================================================
  describe('4. Platform API Facade', () => {
    test('platformApi.simulateEvent produces contract-valid StreamEvent', () => {
      const sim = platformApi.simulateEvent({
        platform: 'twitch',
        type: 'donation',
        senderName: 'Sultan',
        amount: 250,
      });

      assert.equal(sim.platform, 'twitch');
      assert.equal(sim.type, 'donation');
      assert.equal(sim.payload.amount, 250);
      assert.equal(sim.sender.name, 'Sultan');
      assert.ok(validateStreamEventContract(sim).valid);
    });

    test('platformApi.processWebhook handles challenge and enqueues events', () => {
      const challengeReq = {
        platform: 'youtube',
        query: { 'hub.mode': 'subscribe', 'hub.challenge': 'yt_test_challenge_abc' },
      };

      const res = platformApi.processWebhook(challengeReq);
      assert.equal(res.success, true);
      assert.equal(res.type, 'challenge');
      assert.equal(res.body, 'yt_test_challenge_abc');
    });
  });
});
