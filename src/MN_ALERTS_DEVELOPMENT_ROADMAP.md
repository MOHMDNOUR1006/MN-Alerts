# MN Alerts Creator Streaming & Engagement Platform
## Master Development Roadmap & Milestone Execution Schedule

**Document Identifier**: `MN_ALERTS_DEVELOPMENT_ROADMAP.md`  
**Version**: 1.0.0 (Production Blueprint)  
**Status**: APPROVED & ACTIVE  
**Target Repository**: `/media/mohmad-nour/3AA05211A051D44B1/WebSites/mn-alert-lab-1/src`  

---

## 1. Executive Roadmap Overview

This roadmap defines the sequential engineering lifecycle of the **MN Alerts Creator Platform** across 8 structured milestones (Phase 0 through Phase 7). Every phase specifies rigorous entry criteria, core deliverables, interface contracts, verification procedures, and exit gates to ensure zero-defect progression.

```
[Phase 0: Blueprints & Catalog Recovery] (M0)
                  │
                  ▼
[Phase 1: Alert Engine, Priority Queue & Decoupled OBS Runtime] (M1)
                  │
                  ├──────────────────────────────┐
                  ▼                              ▼
[Phase 2: Audio Limiter & 28-Alert Catalog] (M2)  [Phase 3: 16 Stream Widgets & Platform Adapters] (M3)
                  │                              │
                  └──────────────┬───────────────┘
                                 ▼
[Phase 4: Overlay Studio Visual Editor & Drag-and-Drop Scene Composer] (M4)
                                 │
                                 ▼
[Phase 5: MN Subscriptions Integration, Leaderboards & Analytics] (M5)
                                 │
                                 ▼
[Phase 6: Dual Independent Security Audits (Auditor A & Auditor B)] (M6)
                                 │
                                 ▼
[Phase 7: QA Verification, E2E Testing, 60fps Profiling & Production Vercel Deployment] (M7)
```

---

## 2. Milestone Execution Specifications

### Milestone 0 (Phase 0): Foundational Architecture & Historical Catalog Recovery
- **Status**: IN PROGRESS / ACTIVE (Milestone 0)
- **Primary Agents**: Chief Architect (A01), Codebase Auditor (A07), QA / Forensic Auditor
- **Entry Criteria**: Comprehensive repository survey and user requirement audit completed.
- **Core Deliverables**:
  1. The 5 Foundational Architecture Documents in `/mn-alert-lab-1/src/`:
     - `MN_ALERTS_MASTER_ARCHITECTURE.md`
     - `MN_ALERTS_AGENT_RESPONSIBILITIES.md`
     - `MN_ALERTS_FEATURE_MATRIX.md`
     - `MN_ALERTS_DEVELOPMENT_ROADMAP.md`
     - `MN_ALERTS_RELEASE_ACCEPTANCE.md`
  2. Restoration and enrichment of all 16 historical alert packs alongside the 12 cinematic alerts in `src/src/data/alertsCatalog.js` (total 28 alerts, 42 sub-variations) with complete bilingual Arabic & English metadata, tiers, sound presets, and visual styles.
  3. Clean Vite compilation verification with zero errors (`node node_modules/vite/bin/vite.js build`).
- **Exit Criteria**: All 5 architecture docs validated; `alertsCatalog.js` exports verified; Vite build passes with exit code 0.

---

### Milestone 1 (Phase 1): Core Alert Engine, Queue Priority System & Decoupled Overlay Runtime
- **Primary Agents**: Backend & Event Engineer (A10), Frontend Architect (A07), Security Auditor (A14)
- **Dependencies**: M0
- **Entry Criteria**: M0 approved; catalog schemas locked.
- **Core Deliverables**:
  1. `PriorityAlertQueue` class implementing binary max-heap priority scheduling (0=Critical, 1=Raid, 2=Tip, 3=Sub, 4=Follow).
  2. Sliding-window event deduplicator (5000ms rolling window) preventing duplicate webhooks.
  3. Event TTL expiration engine (30s timeout) and queue burst auto-batching to prevent alert storms.
  4. Decoupled `/overlay` route with standalone lightweight bundle (<150KB) and pure transparent OBS background (`background: transparent !important`).
  5. Cryptographic HMAC tokenized overlay URL verification (`?token=...&scene=...`).
  6. Interactive Test Event Simulator in studio dashboard.
- **Exit Criteria**: Queue correctly prioritizes Critical over Follows; deduplication drops repeated events; standalone overlay renders in OBS CEF with zero dashboard chrome.

---

### Milestone 2 (Phase 2): Creative Asset Pipeline, Unique Audio & Tiered Alert Catalog
- **Primary Agents**: Audio Engineer (A03), Image/SVG Specialist (A04), Motion VFX Specialist (A05)
- **Dependencies**: M0, M1
- **Entry Criteria**: M1 queue engine operational; audio asset audit completed.
- **Core Deliverables**:
  1. Web Audio `DynamicsCompressorNode` master brickwall limiter (threshold -6dB, knee 12, ratio 16:1, attack 2ms, release 150ms).
  2. Complete elimination of harsh explosion crackle and digital distortion across all SFX assets.
  3. Re-mastering of all audio assets to EBU R128 loudness standards (`Integrated = -16.0 LUFS`, `True Peak <= -2.0 dBFS`, `0` clipped samples).
  4. Implementation of unique audio profiles for all alerts (zero repetition, dedicated audio files for `thunder`, `royal`, `water`, `chime`).
  5. Refinement of the 4 transparent RGBA avatar frames (Crown, Dragon, Demon, Pharaoh).
  6. Full-screen 4-stage alert choreography (Dimming vignette -> Twin glowing eyes -> Screen-blend MP4 video -> Canvas particles -> Supporter reveal).
- **Exit Criteria**: Audio verification script confirms 0.0 clipped samples on all MP3s; zero duplicate audio presets; 60 FPS verified during full-screen detonations.

---

### Milestone 3 (Phase 3): Stream Widgets Suite (16 Widgets) & Platform Integrations
- **Primary Agents**: Overlay & Widget Engineer (A08), Platform Integration Engineer (A11), 3D Graphics Engineer (A06)
- **Dependencies**: M1
- **Entry Criteria**: Decoupled overlay runtime active; `StreamWidgetProps` contract locked.
- **Core Deliverables**:
  1. Implementation of all 16 stream engagement widgets in `src/components/widgets/`:
     - Chat Box, Event List, Goals & Progress Bars, Tip Jar, Top Supporters, End Credits, Media Share, Polls, Spin Wheel, Stream Boss, Emote Wall, Sponsor Banner, Countdown Timer, Stream Labels, Viewer Counter, Custom HTML/URL Widget.
  2. Physics simulations for Tip Jar (falling coins) and Spin Wheel (angular deceleration with audio ticks).
  3. Streaming platform adapters and webhook normalizers for Twitch EventSub, YouTube Live API, and Kick webhooks.
  4. Comprehensive unit & render tests for all 16 widgets.
- **Exit Criteria**: All 16 widgets render cleanly in OBS browser sources; platform events map seamlessly into the normalized `StreamEvent` schema.

---

### Milestone 4 (Phase 4): Overlay Studio Visual Editor & Creator Dashboard
- **Primary Agents**: UI/UX & Design Systems Engineer (A09), Frontend Architect (A07)
- **Dependencies**: M1, M2, M3
- **Entry Criteria**: Widgets and alerts operational in standalone overlay runtime.
- **Core Deliverables**:
  1. 1080p native coordinate canvas with scale-to-fit CSS zoom (landscape 16:9 and portrait 9:16 mobile mode).
  2. 8-point interactive widget transform handles with aspect ratio lock and magnetic grid snapping.
  3. Z-Index Layer Stack Manager (drag reorder, lock, hide, bring-to-front, send-to-back).
  4. Widget Property Inspector (fonts, colors, background opacity, borders, timing, audio volume).
  5. Multi-scene profile management (Gaming, Just Chatting, BRB, Ending) and one-click tokenized OBS URL generator.
- **Exit Criteria**: Creators can drag, resize, layer, customize, and save multi-widget stream scenes; OBS URL renders the exact composed layout.

---

### Milestone 5 (Phase 5): MN Subscriptions Integration, Creator Analytics & Leaderboards
- **Primary Agents**: Subscription & Data Engineer (A12), Product UX Strategist (A02)
- **Dependencies**: M1, M4
- **Entry Criteria**: Central Firebase Auth and Firestore access configured.
- **Core Deliverables**:
  1. Firebase UID authentication synced with central `subscriptions-88ad4`.
  2. Hard server-side and client-side tier entitlement enforcement (Free, Plus, Pro, Ultra).
  3. Free tier zero-byte Firestore strategy (users with no document default to Free).
  4. Real-time Supporter Leaderboards (All-Time, Monthly, Weekly) for top donors and top gifters.
  5. Creator Analytics Dashboard displaying stream event volume, supporter retention, and revenue metrics.
- **Exit Criteria**: Subscription status accurately gates catalog alerts, widgets, and scenes; leaderboards reflect verified donation events.

---

### Milestone 6 (Phase 6): Dual Independent Security Audits
- **Primary Agents**: Security Auditor A (A13), Adversarial Security Auditor B (A14)
- **Dependencies**: M0 through M5
- **Entry Criteria**: Feature-complete application ready for security hardening.
- **Core Deliverables**:
  1. **Audit Report A (Static & Defensive)**:
     - Input sanitization verification (`DOMPurify` on all chat and custom HTML inputs).
     - Session integrity and Firebase Auth token validation.
     - Static code vulnerability analysis.
  2. **Audit Report B (Dynamic & Adversarial)**:
     - Queue flooding and denial-of-service resilience testing.
     - HMAC OBS overlay token tamper testing (preventing unauthorized tier escalation).
     - Cross-tenant event isolation verification.
- **Exit Criteria**: Zero High or Critical security vulnerabilities; signed audit reports published.

---

### Milestone 7 (Phase 7): QA Verification, E2E Testing & Production Vercel Deployment
- **Primary Agents**: Dedicated QA Function, Chief Architect (A01), Forensic Auditor
- **Dependencies**: All prior milestones (M0 through M6)
- **Entry Criteria**: Dual security audits passed; all automated test suites passing.
- **Core Deliverables**:
  1. Automated Vitest suite covering Queue, Audio, Entitlements, and Widgets (100% pass rate).
  2. End-to-end OBS browser source rendering and 60 FPS performance verification.
  3. Clean production compilation (`node node_modules/vite/bin/vite.js build`).
  4. Production deployment to Vercel:
     `cd /media/mohmad-nour/3AA05211A051D44B1/WebSites/mn-alert-lab-1/src && NODE_OPTIONS="--dns-result-order=ipv4first" vercel --prod --yes`
  5. Live production verification at `https://mn-alerts.vercel.app`.
- **Exit Criteria**: Deployment succeeds with HTTP 200; live overlay and studio function flawlessly in production.

---

## 3. Milestone Dependency & Critical Path Graph

```
M0 (Foundations & Catalog) ────► M1 (Queue & Decoupled OBS)
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
        M2 (Audio & Visual Assets)         M3 (16 Stream Widgets)
                      │                                 │
                      └────────────────┬────────────────┘
                                       ▼
                         M4 (Overlay Studio Editor)
                                       │
                                       ▼
                       M5 (MN Subscriptions & Leaderboards)
                                       │
                                       ▼
                       M6 (Dual Independent Security Audits)
                                       │
                                       ▼
                       M7 (QA Verification & Vercel Deploy)
```

---

## 4. Regression Prevention & Rollback Strategy

1. **Continuous Build Gate**: No PR or milestone commit may be merged if `node node_modules/vite/bin/vite.js build` fails or emits warnings.
2. **Audio Regression Gate**: The Python EBU R128 verification script must be executed on all audio files before any asset modification is accepted.
3. **Rollback Protocol**: In the event of a breaking production defect, deployment rollback is executed via Vercel CLI instant alias assignment (`vercel rollback`) to the previous verified deployment SHA.

---

*Approved for roadmap execution by the Chief Technical Lead.*
