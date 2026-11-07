# MN Alerts Creator Streaming & Engagement Platform
## Production Release Acceptance & Quality Gate Checklist

**Document Identifier**: `MN_ALERTS_RELEASE_ACCEPTANCE.md`  
**Version**: 1.0.0 (Production Blueprint)  
**Status**: APPROVED & ACTIVE  
**Target Repository**: `/media/mohmad-nour/3AA05211A051D44B1/WebSites/mn-alert-lab-1/src`  

---

## 1. Executive Purpose

This document establishes the mandatory, non-negotiable **Quality Gates and Release Acceptance Criteria** that must be fully satisfied before any production release or deployment to `https://mn-alerts.vercel.app`. Every test gate provides an exact verification command, expected mathematical or behavioral standard, and strict pass/fail condition.

---

## 2. Comprehensive Quality Acceptance Gates

### Gate 1: Audio Engineering & Acoustic Quality
- **Mandate**: Zero digital clipping, elimination of explosion static/crackle, and zero acoustic repetition across the entire catalog.

| Check ID | Verification Item | Standard & Threshold | Verification Method | Pass/Fail Condition |
| :--- | :--- | :--- | :--- | :--- |
| **AUD-01** | **Explosion Crackle Elimination** | Zero 0 dBFS clipped samples in `nuclear-explosion.mp3` and related SFX assets. | `ffmpeg -i <file> -af volumedetect -f null -` | `histogram_0db: 0` AND `max_volume <= -1.5 dB` |
| **AUD-02** | **Loudness Normalization (EBU R128)** | Integrated loudness = -16.0 LUFS (±0.5 LUFS), True Peak <= -2.0 dBFS. | `ffmpeg -i <file> -af loudnorm=print_format=json -f null -` | `input_i: -16.0` (±0.5), `input_tp <= -2.0` |
| **AUD-03** | **Zero Repetition Guarantee** | 100% of alert sound presets map to unique audio files; zero aliasing or duplicate paths. | Python assertion comparing preset map to unique file paths. | Zero unmapped presets, zero duplicated file paths across distinct categories. |
| **AUD-04** | **Master Dynamics Compressor** | Master `DynamicsCompressorNode` brickwall limiter active in Web Audio signal graph. | Inspect Web Audio topology in `soundEngine.js`. | Compressor connected prior to `ctx.destination` (ratio >= 16:1, attack <= 3ms). |
| **AUD-05** | **Click-Free Attack Envelopes** | All synthesizer generators utilize linear attack ramps >= 10ms. | Code inspection of `_explosionDetonation` in `soundEngine.js`. | Attack ramp >= 10ms (no `setValueAtTime(peak, startTime)` step discontinuities). |

---

### Gate 2: Visual Performance & Animation Fidelity
- **Mandate**: Rock-solid 60 FPS performance, seamless multi-stage choreography, and zero Flash of Unstyled Text (FOUT).

| Check ID | Verification Item | Standard & Threshold | Verification Method | Pass/Fail Condition |
| :--- | :--- | :--- | :--- | :--- |
| **VFX-01** | **Frame Rate Stability** | Minimum 58 FPS, target 60 FPS during full-screen detonations with particles. | Chromium DevTools Performance Profiler / `requestAnimationFrame` delta logging. | Zero frames exceeding 20.0ms frame time during detonation peak. |
| **VFX-02** | **Screen-Blend Video Overlay** | Black backgrounds in MP4 VFX videos composite with 100% transparency. | Inspect CSS `mix-blend-mode: screen` on `<video>` elements in `AlertOverlay.jsx`. | Video black pixels render transparent over underlying gameplay. |
| **VFX-03** | **Avatar Frame Transparency** | Transparent RGBA 512x512 PNG frames render cleanly with zero white haloing. | Pixel inspection of avatar frames against high-contrast backgrounds. | Alpha channel clean; zero fringe artifacts in OBS browser source. |
| **VFX-04** | **Zero FOUT (Font Pop-in)** | Arabic and Latin fonts render immediately with zero unstyled layout shifts. | Preload stylesheet inspection and `document.fonts.ready` resolution check. | All typography renders with specified custom font on frame 1. |
| **VFX-05** | **GPU Context Cleanup** | WebGL and Canvas instances properly dispose of geometries and particle arrays. | Heap snapshot inspection after 50 consecutive alert detonations. | Memory delta < 5 MB; zero detached DOM or WebGL context leaks. |

---

### Gate 3: OBS Browser Source Compatibility & Decoupled Runtime
- **Mandate**: Lightweight, transparent, secure standalone overlay execution in OBS Chromium Embedded Framework (CEF).

| Check ID | Verification Item | Standard & Threshold | Verification Method | Pass/Fail Condition |
| :--- | :--- | :--- | :--- | :--- |
| **OBS-01** | **Strict Decoupling** | Dedicated `/overlay` route loads with zero dashboard UI components. | Rollup bundle analyzer & DOM inspection of `/overlay` route. | Bundle size < 150 KB; zero dashboard navigation or settings DOM nodes rendered. |
| **OBS-02** | **True Background Transparency**| Root containers enforce `background: transparent !important`. | Inspect rendered styles in OBS Studio browser source. | Browser source is 100% transparent when idle; underlying stream content fully visible. |
| **OBS-03** | **Cross-Machine Synchronization** | Events triggered on streamer laptop appear on dedicated OBS encoding rig. | Firebase Firestore `onSnapshot` listener verification across two IP endpoints. | Sub-150ms event delivery latency across distinct networks. |
| **OBS-04** | **Aspect Ratio Versatility** | Flawless rendering in both 16:9 Landscape (1920x1080) and 9:16 Portrait (1080x1920). | Viewport emulation in OBS browser source settings. | Layout automatically adapts without element clipping or overflow scrollbars. |

---

### Gate 4: Stream Engagement Widgets Suite (16 Widgets)
- **Mandate**: All 16 widgets implemented, customizable, and verified in OBS.

| Check ID | Widget Name | Functional Verification Requirement | Pass/Fail Standard |
| :--- | :--- | :--- | :--- |
| **WGT-01** | **Chat Box** | Renders live chat with badges and Twitch/YouTube emotes with auto-fade. | PASS / FAIL |
| **WGT-02** | **Event List** | Displays rolling feed of recent Follows, Subs, Tips, and Raids with animations. | PASS / FAIL |
| **WGT-03** | **Goals & Progress Bars** | Renders milestone goal with animated glowing fill and celebration confetti at 100%. | PASS / FAIL |
| **WGT-04** | **Tip Jar** | Simulates falling 2D physics coins into glass container on donation events. | PASS / FAIL |
| **WGT-05** | **Top Supporters** | Displays #1, #2, #3 supporter podium with transparent RGBA royal frames. | PASS / FAIL |
| **WGT-06** | **End Credits** | Executes smooth cinematic vertical scrolling credits roll with sound sync. | PASS / FAIL |
| **WGT-07** | **Media Share** | Overlay video player renders viewer-submitted video clips with moderation controls. | PASS / FAIL |
| **WGT-08** | **Polls** | Displays live viewer voting HUD with animated percentage bars and timer. | PASS / FAIL |
| **WGT-09** | **Spin Wheel** | Interactive prize wheel spins with physics deceleration and audible peg clicks. | PASS / FAIL |
| **WGT-10** | **Stream Boss** | Gamified boss HP bar diminishes on cheers; final blow inherits boss crown. | PASS / FAIL |
| **WGT-11** | **Emote Wall** | Showers screen with bursting, floating chat emotes upon hype triggers. | PASS / FAIL |
| **WGT-12** | **Sponsor Banner** | Rotating carousel cycles brand sponsor logos and dynamic QR codes. | PASS / FAIL |
| **WGT-13** | **Countdown Timer** | Precision countdown timer for stream starting/breaks with zero-alarm audio. | PASS / FAIL |
| **WGT-14** | **Stream Labels** | Modular single-metric indicators display live follower/sub/uptime values. | PASS / FAIL |
| **WGT-15** | **Viewer Counter** | Live multi-platform concurrent viewer tally badge with pulsing beacon. | PASS / FAIL |
| **WGT-16** | **Custom HTML/URL** | Sandboxed iframe renders creator custom HTML/CSS/JS safely without XSS. | PASS / FAIL |

---

### Gate 5: Security, Entitlements & Cryptographic Integrity
- **Mandate**: Hard server-side tier enforcement, secure HMAC tokens, and zero vulnerability surface.

| Check ID | Verification Item | Standard & Threshold | Verification Method | Pass/Fail Condition |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **HMAC OBS Token Validation** | OBS URL parameters are cryptographically signed with HMAC-SHA256. | Attempt tampering with `tier=free` to `tier=ultra` in overlay URL. | System rejects tampered URL; displays access denied warning. |
| **SEC-02** | **Token Revocation** | One-click token refresh in dashboard instantly invalidates previous OBS URLs. | Refresh token in dashboard; verify old token returns 401 Unauthorized. | Old token ceases to receive stream events immediately. |
| **SEC-03** | **Input Sanitization & XSS** | All user-supplied text (chat, supporter names, HTML) is purified via `DOMPurify`. | Inject `<script>alert('xss')</script>` and `<img onerror=...>` payloads. | Payloads neutralized; zero JavaScript execution. |
| **SEC-04** | **Firestore Entitlement Rules** | Non-admin users cannot write to `/subscriptions/{uid}` or tamper with tiers. | Attempt unauthorized client write to Firestore `subscriptions` collection. | Firebase Security Rules reject request with Permission Denied. |
| **SEC-05** | **Free Tier 0-Byte Strategy** | Users without an active subscription document consume zero bytes in Firestore. | Query Firestore for new Free user UID. | Document does not exist; client gracefully defaults to Free tier features. |

---

### Gate 6: Build Integrity & Production Deployment
- **Mandate**: Clean build compilation, zero lint errors, and verified Vercel production deployment.

| Check ID | Verification Item | Standard & Threshold | Verification Method | Pass/Fail Condition |
| :--- | :--- | :--- | :--- | :--- |
| **BLD-01** | **Vite Production Compilation**| Zero errors, zero unresolved imports, clean production bundle generated. | `cd /mn-alert-lab-1/src && node node_modules/vite/bin/vite.js build` | Exit code 0; `dist/index.html` and assets created in < 5.0s. |
| **BLD-02** | **Production Vercel Deployment**| Live deployment to production Vercel environment. | `cd /mn-alert-lab-1/src && NODE_OPTIONS="--dns-result-order=ipv4first" vercel --prod --yes` | Exit code 0; production URL resolves to `https://mn-alerts.vercel.app`. |
| **BLD-03** | **Live Production Health** | Production URL responds with HTTP 200 and loads both Studio and Overlay. | `curl -I https://mn-alerts.vercel.app` & browser verification. | HTTP 200 OK; SSL certificate valid; zero console errors on initial load. |

---

## 3. Final Release Sign-Off Attestation

A production release is authorized **only** when all Quality Gates above achieve a verified **PASS** status and are signed off by:
1. **Chief Technical Lead (Agent 01)**
2. **Audio Engineering Specialist (Agent 03)**
3. **Independent Security Auditor A (Agent 13)**
4. **Independent Adversarial Security Auditor B (Agent 14)**
5. **Teamwork Forensic Integrity Auditor**

---

*Approved for release gate enforcement across all deployment pipelines.*
