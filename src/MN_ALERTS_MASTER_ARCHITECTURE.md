# MN Alerts Creator Streaming & Engagement Platform
## Master System Architecture Specification

**Document Identifier**: `MN_ALERTS_MASTER_ARCHITECTURE.md`  
**Version**: 1.0.0 (Production Blueprint)  
**Status**: APPROVED & ACTIVE  
**Target Repository**: `/media/mohmad-nour/3AA05211A051D44B1/WebSites/mn-alert-lab-1/src`  
**System Class**: Enterprise Creator Engagement & Real-Time OBS Streaming Runtime  

---

## 1. Executive Summary & Architectural Overview

The **MN Alerts Platform** is an enterprise-grade creator streaming alerts, interactive engagement widgets, and visual overlay studio designed to surpass platforms such as Streamlabs, StreamElements, and TikAlert. The system empowers live streamers across Twitch, YouTube, Kick, and TikTok Live with culturally rich Arabic and international visual alert choreography, high-impact multi-stage detonative animations, dedicated stereo audio soundscapes, and full-fidelity stream engagement widgets.

### 1.1 Core Architectural Principles
1. **Strict Decoupling of Concerns**: The platform maintains complete separation between the **Creator Dashboard & Studio (SPA Management Application)** and the **OBS Overlay Runtime (Headless High-Performance Display Source)**.
2. **Deterministic Event Processing**: Real-time events enter a prioritized, heap-based scheduling queue with deduplication, staleness protection, overflow batching, and instant critical preemption.
3. **Pristine Web Audio Pipeline**: Acoustic playback combines pre-mastered uncompressed stereo audio assets with procedural Web Audio synthesis, conditioned through a master dynamic compression brickwall limiter to eliminate 0 dBFS clipping and crackle.
4. **Hardware-Accelerated 60 FPS Visual Pipeline**: Alert choreography leverages multi-layered Canvas 2D, SVG displacement shaders, and hardware-accelerated video compositing (`mix-blend-mode: screen`), reserving 3D WebGL (Three.js/OGL) strictly for widgets where 3D geometry adds tangible engagement value.
5. **Secure Tokenized Stream Protection**: OBS overlay URLs are HMAC-tokenized and cryptographically bound to creator identities, preventing URL hijacking, queue tampering, or cross-tenant event leakage.
6. **Zero-Overhead Central Subscription Governance**: Hard server-side and client-side tier entitlement (Free, Plus, Pro, Ultra) synced seamlessly with central Firebase Authentication (`subscriptions-88ad4`).

---

## 2. High-Level System Topology

```
+----------------------------------------------------------------------------------------------------+
|                                    STREAMING PLATFORM ECOSYSTEM                                    |
|              Twitch EventSub   |   YouTube Live Streaming API   |   Kick Webhooks & Chat            |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                      INGESTION & EVENT NORMALIZER                                   |
|   Platform Event Normalizer ────► Event Deduplication Window (5000ms) ────► Schema Validation       |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                        PRIORITY ALERT QUEUE                                        |
|   Max-Heap Priority Scheduler (0=Critical, 1=Raid, 2=Tip, 3=Sub, 4=Follow)                          |
|   Overflow Auto-Batching ─── TTL Expiration Monitor ─── Interruption & Preemption Engine           |
+----------------------------------------------------------------------------------------------------+
                         │                                                 │
                         ▼                                                 ▼
+──────────────────────────────────────────────+ +──────────────────────────────────────────────────+
|      CREATOR DASHBOARD & STUDIO (SPA)        | |           OBS OVERLAY RUNTIME (/overlay)         |
|  - 1080p Drag-and-Drop Scene Composer        | |  - Lightweight Standalone Bundle (<150 KB)       |
|  - 8-Point Transform & Snapping Canvas       | |  - Zero Chrome / Zero Dashboard UI Overhead      |
|  - Z-Index Layer Stack Manager               | |  - Parser-Blocking Arabic/Latin Typography Preload|
|  - 42-Pack Tiered Alert Catalog              | |  - Transparent Background (CEF 60 FPS Target)    |
|  - Interactive Test Event Simulator          | |  - Real-Time Firestore onSnapshot & WebSockets   |
|  - Firebase Auth & MN Subscriptions Sync     | |  - HMAC Token Verification Engine                |
|  - Tokenized OBS URL Exporter                | |  - Multi-Layer Canvas/SVG/MP4 Detonation Engine  |
+──────────────────────────────────────────────+ +──────────────────────────────────────────────────+
                         │                                                 │
                         └─────────────────────────┬───────────────────────┘
                                                   ▼
+----------------------------------------------------------------------------------------------------+
|                                 SHARED CORE ENGINES & SUBSYSTEMS                                   |
|  SoundEngine (DynamicsCompressor + Stereo SFX) │ VfxPipeline (Canvas2D + SVG Filters + MP4 Screen) |
|  TokenService (HMAC-SHA256 Token Validator)   │ EcosystemAuth (Firestore `subscriptions-88ad4`)    |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Subsystem Specifications

### 3.1 Priority Alert Queue Subsystem (`core/queue/`)

The Priority Alert Queue guarantees reliable, deterministic ordering and real-time responsiveness under high stream throughput (e.g. raid spikes or gift sub bombs).

#### A. Priority Weighting Structure
Events are assigned numerical priority levels (lower integer = higher priority):
- **Level 0 (CRITICAL)**: Emergency broadcast alerts, stream boss defeat, ultra tier milestones. Can preempt running alerts.
- **Level 1 (RAID / HYPE TRAIN)**: Community raids, high-tier gift sub bombs (10+ subs), TikTok tap combo milestones.
- **Level 2 (DONATIONS & TIPS)**: Direct monetary donations, super chats, high bits donations (>100 EGP / 500 bits).
- **Level 3 (SUBSCRIPTIONS)**: New recurring subs, tier upgrades, resub anniversaries.
- **Level 4 (FOLLOWS & LOW-TIER TIPS)**: Free followers, micro-donations, chat badge milestones.

#### B. Data Structure & Scheduling Algorithm
- Implemented as a **Binary Max-Heap** keyed by composite score:  
  $$\text{Score} = (1000 - \text{Priority} \times 200) + \min\left(50, \frac{\text{CurrentTime} - \text{Timestamp}}{1000}\right)$$
  This guarantees priority preemption while introducing linear age weighting to prevent lower-tier starvation during prolonged stream traffic.
- **Sliding Window Deduplication**:
  - Memory-efficient Set indexed by `SHA256(platform + eventType + senderId + amount + Math.floor(timestamp / 5000))`.
  - Events matching an active signature within a 5,000ms rolling window are discarded as duplicate platform webhooks.
- **Staleness Expiration (TTL)**:
  - Every queue item carries an `expiresAt` epoch timestamp (default: 30,000ms from creation).
  - Stale events exceeding TTL are automatically purged before scheduling.
- **Queue Overflow & Auto-Batching**:
  - If the queue exceeds 25 pending events, the system enters **Burst Batching Mode**:
    - Low-priority follow events are coalesced into batch summary alerts (e.g., *"Ahmed and 14 others just followed!"*).
    - Sub gifts are rolled up into an aggregate milestone alert (e.g., *"Sara gifted 20 Subs!"*).
- **Control Interface**:
  - `enqueue(event: StreamEvent): boolean`
  - `dequeue(): StreamEvent | null`
  - `skip(): void` — Instantly cancels current visual/audio execution and triggers next item.
  - `clear(): void` — Purges all pending items from memory.
  - `pause(): void` / `resume(): void` — Halts queue consumption during streamer breaks.

---

### 3.2 Decoupled OBS Overlay Runtime (`components/overlay/`)

#### A. OBS Chromium Embedded Framework (CEF) Optimization
- **Route**: Dedicated `/overlay` route completely decoupled from dashboard routes.
- **Bundle Footprint**: Sub-150KB tree-shaken JavaScript bundle with zero dashboard dependencies.
- **Background Transparency**:
  ```css
  html, body, #root, .mn-obs-transparent-root {
    background: transparent !important;
    background-color: rgba(0, 0, 0, 0) !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    width: 100vw !important;
    height: 100vh !important;
  }
  ```
- **Font Pop-in (FOUT) Prevention**:
  A blocking preload link is injected into the HTML document head containing exact font weights for:
  `Cairo (700, 900)`, `Tajawal (700, 800)`, `IBM Plex Sans Arabic (700)`, `Anton`, `Exo 2 (800)`.
  Canvas rendering routines execute a `document.fonts.ready` promise resolution prior to initiating first frame drawing.

#### B. Cross-Machine Real-Time Synchronization
OBS browser sources operate in isolated process sandboxes on streamers' encoding rigs. To guarantee seamless cross-machine triggering:
1. **Primary Transport**: Firebase Firestore real-time snapshot listener on `creators/{uid}/event_queue`. Low-latency write-trigger-ack flow guarantees sub-120ms global delivery.
2. **Secondary Transport**: Local `BroadcastChannel('mn_alerts_live_channel')` and `localStorage` storage-event listeners for same-machine browser testing and dashboard previews.

---

### 3.3 Audio Architecture & De-Clipping Limiter Pipeline (`core/audio/`)

#### A. Root Cause of Previous Distortion
The legacy audio engine suffered from:
1. Hard digital 0 dBFS clipping in source MP3 files (`nuclear-explosion.mp3` pegged 8,541 clipped samples with 320 consecutive flat-topped samples).
2. Summed generator gain in Web Audio synthesizers exceeding 2.35 into master without dynamic range control.
3. 0ms instantaneous attack step discontinuities creating harsh click/pop transients.
4. Concurrent dual-playback of HTML5 Audio and Web Audio synthesizer layers without ducking.

#### B. Master Dynamic Compression Topology
All audio generation routes through a dedicated **Master Dynamics Compressor Node**:
```
[Synthesizer Voices (0.35 sine + 0.15 saw)] ──┐
[Noise Generator (15ms linear attack)]        ───► [Master Gain Node (0.55)] ──► [DynamicsCompressorNode] ──► [AudioDestination]
[HTML5 Audio MediaElementSource (MP3 Sample)] ──┘
```
**Compressor Parameters**:
- `threshold`: `-6.0 dBFS`
- `knee`: `12.0 dB`
- `ratio`: `16.0:1` (Brickwall Limiting)
- `attack`: `0.002s` (2 ms fast response)
- `release`: `0.150s` (150 ms smooth recovery)

#### C. Audio Uniqueness Guarantee
- Every alert category and subscription tier is paired with a distinct, acoustically mastered stereo audio profile.
- Eliminates aliased/duplicate presets (`thunder`, `royal`, `water`, `chime` each receive dedicated stereo audio stems).
- Re-mastered MP3 assets are loudness-normalized to **EBU R128 (-16 LUFS, True Peak <= -2.0 dBFS)**, mathematically guaranteeing 0 clipped samples.

---

### 3.4 Visual Effects (VFX) Pipeline & Choreography (`core/vfx/`)

The platform executes a 6-layer visual composition stack during full-screen alert detonations:

```
+───────────────────────────────────────────────────────────────────────────+
| LAYER 5: Transparent RGBA Avatar Frames (Crown, Dragon, Demon, Pharaoh)   |
+───────────────────────────────────────────────────────────────────────────+
| LAYER 4: SVG Displacement Filtered Typography & Live Blood/Water Caustics |
+───────────────────────────────────────────────────────────────────────────+
| LAYER 3: 60 FPS Canvas 2D Particle Engine (Rockets, Sparks, Shockwaves)   |
+───────────────────────────────────────────────────────────────────────────+
| LAYER 2: Composited MP4 Video VFX (Screen-Blend Transparency)             |
+───────────────────────────────────────────────────────────────────────────+
| LAYER 1: Procedural WebGL / OGL Shaders (Waveforms & Vignette Grain)      |
+───────────────────────────────────────────────────────────────────────────+
| LAYER 0: Dynamic Cinematic Backdrop Dimming (Game Visibility Maintained)  |
+───────────────────────────────────────────────────────────────────────────+
```

#### A. Multi-Stage Choreography Lifecycle
1. **Stage 1 (0.0s - 1.2s) — Atmosphere & Lighting Shift**:
   Ambient screen lighting dims via radial vignette backdrop while preserving transparent game viewport visibility.
2. **Stage 2 (1.0s - 2.5s) — The Omen / Awakening**:
   Twin glowing boss eyes ignite with chromatic lens flares and connecting bezier energy arcs.
3. **Stage 3 (2.2s - 5.5s) — Detonation & Shockwave**:
   Hardware-accelerated screen-blend MP4 video overlays composite over the stream accompanied by Canvas 2D homing rocket trajectories, particle shockwave rings, and sub-bass detonation audio.
4. **Stage 4 (4.5s - 9.5s) — Supporter Reveal & Royal Frame**:
   The supporter's name, donation message, amount, and transparent RGBA avatar frame glide into position with glowing text displacement filters.
5. **Stage 5 (9.0s - 9.5s) — Dissolve & Cleanup**:
   Smooth opacity ramp-down, canvas particle memory clearance, and queue notification emit.

#### B. Selective Three.js Integration Policy
- **OGL (15 KB)** handles lightweight procedural WebGL background wave shaders.
- **Three.js** is loaded dynamically via code-splitting (`React.lazy`) exclusively for features requiring true 3D meshes (e.g. 3D physics Tip Jar, interactive 3D Spin Wheel).
- Standard 2D alerts rely exclusively on CSS3 hardware-accelerated transforms, Canvas 2D, and SVG filters to sustain a rock-solid 60 FPS on low-power streamer laptops.

---

### 3.5 Security, Authentication & Tokenization (`services/`)

#### A. Central Firebase Ecosystem Authentication
- Central authentication is managed via Firebase Auth and Firestore database `subscriptions-88ad4`.
- **Zero-Byte Free User Pattern**: Users without an active subscription document in `subscriptions/{uid}` are automatically treated as Free Tier members without consuming write quotas or database storage.

#### B. HMAC-Signed OBS Overlay URL Tokenization
OBS browser source URLs are secured with cryptographic signatures:
- **URL Schema**:  
  `https://mn-alerts.vercel.app/overlay?token=<HMAC_TOKEN>&scene=<SCENE_ID>&lang=ar`
- **Token Payload**:
  ```json
  {
    "uid": "FIREBASE_USER_UID",
    "sceneId": "scene_gaming_1080p",
    "tier": "ultra",
    "issuedAt": 1731000000000,
    "revocationKey": "rev_seq_003"
  }
  ```
- **Security Protections**:
  - Cryptographic validation prevents URL parameter tampering (e.g. escalating tier from `free` to `ultra`).
  - Instant one-click token regeneration invalidates leaked stream URLs immediately without affecting account credentials.
  - Rate limiting protects ingestion webhooks from Denial of Service (DoS) attacks.
  - All user-supplied text inputs in chat widgets and donation messages pass through `DOMPurify` sanitization to prevent Cross-Site Scripting (XSS).

---

## 4. Technical File & Module Organization

```
mn-alert-lab-1/src/
├── MN_ALERTS_MASTER_ARCHITECTURE.md    # Master Architecture Blueprint (This Document)
├── MN_ALERTS_AGENT_RESPONSIBILITIES.md # 14-Agent Operational Matrix & RACI Guide
├── MN_ALERTS_FEATURE_MATRIX.md         # 4-Tier Feature, Alert & Widget Inventory
├── MN_ALERTS_DEVELOPMENT_ROADMAP.md    # Milestone-by-Milestone Execution Schedule
├── MN_ALERTS_RELEASE_ACCEPTANCE.md     # Production Verification Gates & Acceptance Checklist
├── public/
│   ├── media/
│   │   ├── sfx/                        # EBU R128 Normalized Stereo Audio Assets (.mp3)
│   │   ├── frames/                     # Background-Removed 512x512 RGBA PNG Avatar Frames
│   │   ├── vfx/                        # Screen-Blend H.264 Video Overlay Clips (.mp4)
│   │   └── textures/                   # SVG Vector Patterns and Displacement Textures
├── src/
│   ├── core/
│   │   ├── queue/                      # PriorityAlertQueue, Deduplicator, EventNormalizer
│   │   ├── audio/                      # SoundEngine, DynamicsCompressor, ProceduralSynth
│   │   └── vfx/                        # CanvasVfxEngine, OglShaderCanvas, GlobalSvgFilters
│   ├── components/
│   │   ├── overlay/                    # Standalone Lightweight OBS Browser Source Runtime
│   │   ├── studio/                     # Drag-and-Drop Scene Canvas, Z-Index Stack, Inspector
│   │   ├── widgets/                    # The 16 Stream Engagement Widget Implementations
│   │   ├── catalog/                    # Tiered Alert Gallery, Visual Cards, Audio Previews
│   │   └── dashboard/                  # Creator Analytics, Settings, Leaderboards, Auth Modal
│   ├── services/
│   │   ├── ecosystemAuth.js            # Firebase Auth & Firestore Entitlement Client
│   │   ├── tokenService.js             # HMAC Token Generation & Verification
│   │   ├── soundEngine.js              # Sound Manager with Brickwall Limiting
│   │   └── obsBundleExporter.js        # Tokenized Scene URL Exporter & Standalone Bundler
│   ├── data/
│   │   └── alertsCatalog.js            # Master Catalog (28 alerts, 42 sub-variations)
│   └── tests/
│       ├── unit/                       # Vitest Unit Tests (Queue, Audio, Entitlements)
│       └── e2e/                        # OBS Browser Source Integration & Render Tests
```

---

## 5. Architectural Quality Attributes & Non-Functional Requirements

| Metric | Target Standard | Verification Strategy |
| :--- | :--- | :--- |
| **OBS Overlay Bundle Size** | `< 150 KB` gzip | Rollup bundle analyzer during production Vite build |
| **Animation Frame Rate** | Constant `60 FPS` (<= 16.6ms frame time) | Chromium Performance Profiler during full-screen detonations |
| **Audio Peak Headroom** | Max True Peak `<= -1.5 dBFS`, `0` clips | FFmpeg `volumedetect` and Web Audio analyzer pass |
| **Event Ingestion Latency** | `< 120 ms` from webhook to OBS render | High-precision performance timestamp instrumentation |
| **FOUT (Unstyled Text)** | `0 ms` (Zero font pop-in) | Parser-blocking font stylesheet injection and `document.fonts.ready` |
| **Cross-Platform Compatibility** | 100% transparent in OBS, Streamlabs, Prism, TikTok | Chromium Embedded Framework (CEF) headless rendering validation |

---

*Authored and verified for the MN Alerts Platform Architecture Foundation.*
