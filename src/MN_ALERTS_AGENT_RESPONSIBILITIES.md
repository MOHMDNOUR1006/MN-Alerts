# MN Alerts Creator Streaming & Engagement Platform
## Agent Responsibilities & Multi-Agent Execution Matrix

**Document Identifier**: `MN_ALERTS_AGENT_RESPONSIBILITIES.md`  
**Version**: 1.0.0 (Production Blueprint)  
**Status**: APPROVED & ACTIVE  
**Target Repository**: `/media/mohmad-nour/3AA05211A051D44B1/WebSites/mn-alert-lab-1/src`  

---

## 1. Executive Purpose

To engineer a world-class streaming alerts and overlay studio platform, the project employs a team of **14 specialized autonomous agents** alongside dedicated **Quality Assurance & Verification** and **Teamwork Forensic Auditor** functions. This document defines the clear mandate, technical domains, input contracts, owned deliverables, and strict RACI execution boundaries for each agent across the 7 development milestones.

---

## 2. Agent Roster & Detailed Mandates

### Agent 01: Chief Architect & Technical Lead
- **Primary Domain**: System topology, interface contracts, module boundaries, architectural compliance, code review.
- **Key Responsibilities**:
  - Enforce strict separation between Creator Dashboard SPA and decoupled OBS Overlay Runtime.
  - Review and approve all interface contract definitions (`StreamEvent`, `AlertQueueInterface`, `SoundEngineInterface`, `SceneProfile`).
  - Oversee cross-cutting concerns (performance budgets, bundle splitting, memory management).
  - Serve as the final authority on architectural disputes.
- **Owned Deliverables**:
  - `MN_ALERTS_MASTER_ARCHITECTURE.md`
  - `MN_ALERTS_DEVELOPMENT_ROADMAP.md`
  - Core module interface definitions in `src/core/contracts/`

---

### Agent 02: Product Research & UX Strategist
- **Primary Domain**: Industry benchmarking, feature inventory, competitive analysis, Arabic creator workflow optimization.
- **Key Responsibilities**:
  - Benchmark against market leaders: Streamlabs, StreamElements, and TikAlert.
  - Curate cultural and regional streaming patterns (TikTok likes/taps alerts, Ramadan/Eid themes, Arabic typography).
  - Define creator user personas and workflows for overlay setup, scene switching, and test firing.
  - Ensure feature progression across Free, Plus, Pro, and Ultra tiers incentivizes creator upgrades.
- **Owned Deliverables**:
  - `MN_ALERTS_FEATURE_MATRIX.md`
  - Competitor benchmark analyses and UX flow specifications in `docs/research/`

---

### Agent 03: Audio Engineering Specialist
- **Primary Domain**: Digital signal processing (DSP), Web Audio API architecture, asset re-mastering, audio uniqueness.
- **Key Responsibilities**:
  - Eliminate harsh explosion crackle and distortion via master `DynamicsCompressorNode` brickwall limiting.
  - Re-master all MP3 audio assets to EBU R128 loudness standards (`Integrated = -16.0 LUFS`, `True Peak <= -2.0 dBFS`, `0` clipped samples).
  - Eliminate all audio repetition across the catalog by curating 28+ dedicated stereo soundscapes.
  - Implement smooth, click-free synthesizer attack envelopes (15ms linear ramps) replacing 0ms step discontinuities.
- **Owned Deliverables**:
  - `src/services/soundEngine.js` & `src/core/audio/`
  - Mastered audio assets in `public/media/sfx/*.mp3`
  - Automated audio verification script (`tests/audio_verify.py`)

---

### Agent 04: Image Generation & SVG Specialist
- **Primary Domain**: Vector graphics, SVG displacement filters, transparent RGBA frames, visual badges.
- **Key Responsibilities**:
  - Clean and optimize transparent RGBA 512x512 avatar frames (`frame-royal-crown.png`, `frame-dragon-fire.png`, `frame-crimson-demon.png`, `frame-pharaoh-void.png`).
  - Author and refine custom SVG filters (`feTurbulence`, `feDisplacementMap`, `feColorMatrix`) for live blood drips, glass refraction, water caustics, and gold fabric weaving.
  - Design vector emblem badges for all alert categories and tiers.
  - Guarantee zero haloing or alpha fringing on transparent assets in OBS browser sources.
- **Owned Deliverables**:
  - `src/components/GlobalSvgFilters.jsx`
  - Avatar frame assets in `public/media/frames/`
  - Vector textures in `public/media/textures/`

---

### Agent 05: Motion Graphics & VFX Specialist
- **Primary Domain**: 60 FPS Canvas 2D particle simulation, CSS keyframe choreographies, video overlay compositing.
- **Key Responsibilities**:
  - Build high-performance Canvas 2D particle engine for homing rockets, smoke trails, shockwave rings, and floating embers.
  - Composite multi-stage MP4 video overlays utilizing hardware-accelerated `mix-blend-mode: screen`.
  - Implement the 4-stage alert choreography (Dimming vignette -> Twin glowing eyes -> Detonation VFX -> Supporter reveal).
  - Guarantee constant 60 FPS performance without frame drops during full-screen takeovers.
- **Owned Deliverables**:
  - `src/components/AlertCanvasVFX.jsx` & `src/core/vfx/`
  - `src/components/AlertOverlay.css` (choreography keyframes and textured typography)
  - Video asset pipeline in `public/media/vfx/`

---

### Agent 06: 3D Graphics Engineer
- **Primary Domain**: WebGL, OGL procedural shaders, selective Three.js geometry integration.
- **Key Responsibilities**:
  - Maintain and optimize lightweight procedural wave shaders using `ogl` (`GhostFibers.jsx`) with WebGL context recovery.
  - Integrate Three.js selectively and lazily only where genuine 3D geometry adds visual value (e.g. 3D physics Tip Jar, interactive 3D Spin Wheel).
  - Enforce strict WebGL resource disposal (`geometry.dispose()`, `material.dispose()`, `texture.dispose()`) to prevent GPU memory leaks during 24/7 OBS stream sessions.
- **Owned Deliverables**:
  - `src/components/GhostFibers.jsx`
  - 3D widget modules in `src/components/widgets/three/`

---

### Agent 07: Frontend Architecture Engineer
- **Primary Domain**: React 19 architecture, Vite build pipeline, code-splitting, bundle size optimization, OBS CEF compatibility.
- **Key Responsibilities**:
  - Decouple the `/overlay` route into an independent, lightweight OBS browser source bundle (<150KB).
  - Implement parser-blocking font preloading in the overlay head to eliminate Flash of Unstyled Text (FOUT).
  - Configure Vite build scripts for direct Node execution on Linux NTFS3 partitions.
  - Implement robust React 19 memoization, concurrent rendering safeguards, and error boundaries.
- **Owned Deliverables**:
  - `src/App.jsx` route decomposition
  - `src/components/overlay/StandaloneOverlay.jsx`
  - `vite.config.js` and build scripts

---

### Agent 08: Overlay & Widget Engineer
- **Primary Domain**: Stream engagement widget suite (The 16 Widgets), widget state management, responsive OBS layout.
- **Key Responsibilities**:
  - Implement all 16 stream widgets:
    1. Chat Box (real-time chat with badge & emote parsing)
    2. Event List (rolling feed of recent events)
    3. Goals & Progress Bars (animated SVG glowing milestone bars)
    4. Tip Jar (falling physics coins container)
    5. Top Supporters (framed avatar podium)
    6. End Credits (cinematic rolling credits)
    7. Media Share (moderated video player overlay)
    8. Polls (live viewer voting with percentage bars)
    9. Spin Wheel (interactive prize wheel with peg ticks)
    10. Stream Boss (boss battle HP bar damaged by donations)
    11. Emote Wall (exploding particle shower of chat emotes)
    12. Sponsor Banner (rotating logo carousel & QR codes)
    13. Countdown Timer (stream start / break countdown)
    14. Stream Labels (modular single-metric indicators)
    15. Viewer Counter (multi-platform live viewer badge)
    16. Custom HTML/URL Widget (sandboxed iframe with live editor)
  - Ensure all widgets render transparently and reliably in OBS browser sources.
- **Owned Deliverables**:
  - `src/components/widgets/` (all 16 widget components)
  - Standardized `StreamWidgetProps` interface implementations

---

### Agent 09: UI/UX & Design Systems Engineer
- **Primary Domain**: Creator Dashboard UI, 1080p Drag-and-Drop Scene Composer, Z-Index Layer Stack, Design System.
- **Key Responsibilities**:
  - Build the visual Overlay Studio editor with native 1920x1080 coordinate canvas and scale-to-fit CSS zoom.
  - Implement 8-point interactive resize handles with aspect ratio lock and magnetic grid snapping.
  - Build the Z-Index Layer Panel with drag reordering, lock, hide, bring-to-front, and send-to-back.
  - Implement the Widget Property Inspector (fonts, colors, borders, timing, audio volume).
  - Ensure flawless RTL/Arabic layout typography and theme styling.
- **Owned Deliverables**:
  - `src/components/studio/` (SceneComposer, TransformBox, LayerPanel, PropertyInspector)
  - Design system tokens and UI controls in `src/components/ui/`

---

### Agent 10: Backend & Event Infrastructure Engineer
- **Primary Domain**: Priority Alert Queue, event deduplication, real-time sync, Firestore event infrastructure.
- **Key Responsibilities**:
  - Implement binary max-heap `PriorityAlertQueue` with priority levels (0=Critical, 1=Raid, 2=Tip, 3=Sub, 4=Follow).
  - Implement sliding-window deduplication (5000ms window) and TTL staleness expiration.
  - Implement queue burst auto-batching to prevent alert storm lockups.
  - Implement real-time cross-machine event synchronization via Firestore real-time snapshots and WebSockets.
  - Implement queue controls: skip, clear, pause, resume.
- **Owned Deliverables**:
  - `src/core/queue/PriorityAlertQueue.js`
  - `src/core/queue/EventDeduplicator.js`
  - `src/services/eventBus.js`

---

### Agent 11: Platform Integration Engineer
- **Primary Domain**: Streaming platform adapters (Twitch, YouTube, Kick), interactive Test Event Simulator.
- **Key Responsibilities**:
  - Build webhook receivers and event normalizers for Twitch EventSub, YouTube Live API, and Kick webhooks.
  - Implement the interactive Test Event Simulator inside the Studio dashboard, allowing creators to fire simulated events across all platforms and tiers.
  - Map external platform event payloads into the unified `StreamEvent` data contract.
- **Owned Deliverables**:
  - `src/services/platformAdapters/` (Twitch, YouTube, Kick normalizers)
  - `src/components/studio/TestEventSimulator.jsx`

---

### Agent 12: Subscription, Analytics & Data Engineer
- **Primary Domain**: MN Subscriptions sync, Firebase UID authentication, supporter leaderboards, creator analytics.
- **Key Responsibilities**:
  - Maintain integration with central Firebase Auth and Firestore collection `subscriptions/{uid}` (`subscriptions-88ad4`).
  - Enforce server-side and client-side tier entitlements (Free, Plus, Pro, Ultra).
  - Build supporter leaderboards (All-Time, Monthly, Weekly) for top donors and top gifters.
  - Build creator analytics charts (revenue insights, stream event counts, top supporter badges).
- **Owned Deliverables**:
  - `src/services/ecosystemAuth.js`
  - `src/components/dashboard/SupporterLeaderboard.jsx`
  - `src/components/dashboard/CreatorAnalytics.jsx`

---

### Agent 13: Independent Security Auditor A (Static & Defensive)
- **Primary Domain**: Static code analysis, input sanitization, XSS prevention, authentication & session integrity.
- **Key Responsibilities**:
  - Conduct thorough vulnerability scanning across all input handling routines.
  - Enforce strict `DOMPurify` sanitization on all user-supplied text (chat messages, custom HTML widget code, supporter names).
  - Verify Firestore security rules compliance (`subscriptions/{uid}` read-only for non-admin, Free user 0 bytes).
  - Author formal Security Audit Report A.
- **Owned Deliverables**:
  - `SECURITY_AUDIT_REPORT_A.md`
  - Automated security assertion tests

---

### Agent 14: Independent Adversarial Security Auditor B (Dynamic & Offensive)
- **Primary Domain**: Adversarial attack simulation, rate-limiting verification, queue tampering, OBS token security.
- **Key Responsibilities**:
  - Attempt high-throughput queue flooding attacks to test overflow protection and denial of service resistance.
  - Test cryptographic integrity of HMAC OBS overlay tokens (attempt tier escalation from Free to Ultra via URL manipulation).
  - Test cross-tenant event isolation to ensure Creator A cannot receive or intercept Creator B's stream events.
  - Author formal Adversarial Security Audit Report B.
- **Owned Deliverables**:
  - `SECURITY_AUDIT_REPORT_B.md`
  - Adversarial attack reproduction scripts and verification proofs

---

### Dedicated QA & Performance Verification Function
- **Primary Domain**: Automated test suites, end-to-end integration testing, 60 FPS performance profiling, OBS CEF verification.
- **Key Responsibilities**:
  - Maintain comprehensive Vitest unit test suite covering Queue, Audio, and Entitlements.
  - Verify zero-error Vite build (`node node_modules/vite/bin/vite.js build`).
  - Execute 60 FPS performance profiling during full-screen alert detonations.
  - Verify OBS browser source transparency and rendering across 1080p and 9:16 mobile canvas modes.
- **Owned Deliverables**:
  - `src/tests/` (unit, widget, and e2e test suites)
  - `QA_VERIFICATION_REPORT.md`

---

### Independent Teamwork Forensic Auditor Function
- **Primary Domain**: Integrity verification, anti-cheat enforcement, attestation auditing.
- **Key Responsibilities**:
  - Verify that no agent hardcoded test results or fabricated verification logs.
  - Confirm genuine state maintenance and real DSP/Canvas/Queue logic in production code.
  - Review git commit diffs, handoff reports, and build artifacts for full integrity compliance.

---

## 3. RACI Responsibility Assignment Matrix

**R** = Responsible (Executes the task)  
**A** = Accountable (Approves and owns final outcome)  
**C** = Consulted (Provides inputs and expertise)  
**I** = Informed (Receives updates on progress)

| Milestone / Deliverable | A01 | A02 | A03 | A04 | A05 | A06 | A07 | A08 | A09 | A10 | A11 | A12 | A13 | A14 | QA | Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **M0: Architecture & Catalog Recovery** | **A** | C | C | C | C | C | R | C | C | R | C | C | I | I | R | **A** |
| **M1: Queue System & Decoupled OBS** | A | I | I | I | I | I | R | C | I | **R** | C | I | C | C | R | I |
| **M2: Audio Limiter & 28-Alert Catalog** | A | C | **R** | R | R | C | C | I | C | I | I | C | I | I | R | I |
| **M3: 16 Stream Widgets & Adapters** | A | C | C | C | C | R | C | **R** | C | C | R | I | C | I | R | I |
| **M4: Overlay Studio Visual Editor** | A | C | I | I | C | I | R | C | **R** | I | C | I | C | I | R | I |
| **M5: MN Subscriptions & Analytics** | A | C | I | I | I | I | C | I | C | C | I | **R** | C | I | R | I |
| **M6: Dual Security Audits** | A | I | I | I | I | I | C | C | I | C | C | C | **R** | **R** | R | **A** |
| **M7: QA Verification & Deployment** | **A** | I | C | C | C | C | R | C | C | C | C | C | C | C | **R** | **A** |

---

## 4. Multi-Agent Hand-Off & Communication Protocol

1. **Self-Contained Handoff Reports**: Every agent completing a milestone must generate a 5-component `handoff.md` (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
2. **Exclusively Owned Files**: Agents must strictly respect file ownership. Cross-file modifications are coordinated via interface contracts defined in Section 2.
3. **Continuous Build Verification**: Any code modification must be verified immediately with `node node_modules/vite/bin/vite.js build` before submitting handoff.
4. **Heartbeat Logging**: Agents must update `progress.md` after every meaningful subtask to maintain active situational awareness.

---

*Approved for multi-agent system execution across the MN Alerts Creator Platform.*
