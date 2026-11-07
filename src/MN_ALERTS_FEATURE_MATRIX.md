# MN Alerts Creator Streaming & Engagement Platform
## Feature & Subscription Entitlement Matrix

**Document Identifier**: `MN_ALERTS_FEATURE_MATRIX.md`  
**Version**: 1.0.0 (Production Blueprint)  
**Status**: APPROVED & ACTIVE  
**Target Repository**: `/media/mohmad-nour/3AA05211A051D44B1/WebSites/mn-alert-lab-1/src`  

---

## 1. Executive Summary & Tier Architecture

The MN Alerts Platform implements a comprehensive, 4-tier monetization model seamlessly integrated with the central **MN Subscriptions** service (`subscriptions-88ad4`). Creator feature access, visual fidelity, audio uniqueness, stream widgets, and overlay capabilities scale progressively from **Free Starter** through **Plus**, **Pro**, and **Ultra**, supplemented by **Loyalty** status rewards (for 3+ month consecutive subscribers) and **Store** standalone edition drops.

### 1.1 Subscription Tiers & Pricing Structure

| Tier | Monthly Price (EGP) | Yearly Price (EGP) | USD Equiv. (Approx) | Database Storage Strategy | Primary Creator Audience |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free Starter** | **0 EGP** | **0 EGP** | $0.00 | 0 bytes in Firestore (stateless default) | New streamers testing alerts and basic overlays |
| **Plus** | **5 EGP / mo** | **50 EGP / yr** | ~$0.10 / mo | Active doc in `subscriptions/{uid}` | Growing hobbyist streamers needing no watermarks |
| **Pro** | **250 EGP / mo** | **2,400 EGP / yr** | ~$5.00 / mo | Active doc in `subscriptions/{uid}` | Professional streamers wanting full-screen VFX & audio |
| **Ultra** | **500 EGP / mo** | **4,800 EGP / yr** | ~$10.00 / mo | Active doc in `subscriptions/{uid}` | Top-tier esports streamers & whale creators |
| **Loyalty (3M+)** | *Earned Milestone* | *Earned Milestone* | Included with Pro/Ultra | Tag in `subscriptions/{uid}.loyaltyMonths` | Dedicated veteran subscribers (3+ continuous months) |
| **Store Editions** | Standalone Drop | Standalone Drop | Free for Ultra | Purchases in `creator_purchases/{uid}` | Collectors & creators seeking exclusive anime/boss themes |

---

## 2. Platform Capabilities Matrix by Tier

| Platform Capability | Free Starter (0 EGP) | Plus (5 EGP/mo) | Pro (250 EGP/mo) | Ultra (500 EGP/mo) |
| :--- | :---: | :---: | :---: | :---: |
| **Total Alert Packs Unlocked** | 4 packs | 14 packs | 28 packs | All 42 packs (Full Catalog + Store + Loyalty) |
| **Available Stream Widgets** | 3 widgets max | All 16 widgets | All 16 widgets + custom themes | All 16 widgets + 3D physics & custom CSS/JS |
| **Active Overlay Studio Scenes** | 1 active scene | 3 active scenes | Unlimited scenes | Unlimited scenes + cloud backups |
| **OBS Canvas Resolution** | 720p / 1080p 30 FPS | 1080p 60 FPS | 1080p 60 FPS + 4K | 1080p 60 FPS + 4K + 9:16 Vertical TikTok Mode |
| **Watermark / Platform Branding** | Minimal subtle badge | **Zero Watermark** | **Zero Watermark** | **Zero Watermark** |
| **Multi-Stage Cinematic Detonations** | Basic CSS transitions | Animated SVG Caustics | Full (Twin Eyes + Shockwaves + Royal Frames) | Full + Canvas 2D Rockets + WebGL Full Takeover |
| **Audio Engine Capabilities** | Generic synth presets | Custom MP3 upload | Bespoke stereo SFX + Dynamics Limiter | Mastered stereo stems + Multi-language TTS |
| **Priority Event Queue** | Standard FIFO | Standard FIFO | Priority scheduling + interrupt | Priority scheduling + deduplication + instant clear |
| **Streaming Platform Adapters** | Simulation mode only | Twitch & YouTube | Twitch, YouTube, Kick | Instant low-latency WebSocket platform sync |
| **Supporter Leaderboards** | None | Session only | All-Time, Monthly, Weekly | Real-time global leaderboards + achievements |
| **Transparent RGBA Royal Frames** | None | 1 frame (Crown) | 3 frames (Crown, Dragon, Demon) | All 4 frames (Crown, Dragon, Demon, Pharaoh) |
| **Custom HTML/CSS/JS Widget** | Sandboxed read-only | Sandboxed read-only | Full CodeMirror editor | Full CodeMirror editor + custom WebSockets |

---

## 3. Complete Alert Catalog Inventory (28 Core Alerts / 42 Sub-Variations)

The 42 alert packs are structured across categories and access tiers, combining the 16 historical recovered packs with the 12 cinematic boss & detonative alerts:

### 3.1 Cinematic Boss & Full-Screen Detonation Alerts (11 Packs)

| # | Pack ID | Title (Arabic) | Title (English) | Category | Tier | Sound Preset | Visual Engine / Choreography |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 01 | `shadow-monarch-twin-eyes` | سيد الظلال: خفوت الإضاءة وظهور نورين ثم انفجار | Shadow Monarch Awakening | `fullscreen` | `ultra` | `shadow-eyes` | `shadow-eyes-blast` (4-stage dimming, eyes, video VFX, frame) |
| 02 | `missile-fire-barrage-strike` | قصف صواريخ حقيقية وانفجارات نارية | Tactical Missile & Fire Barrage | `donation` | `pro` | `missile-barrage` | `missile-fire-strike` (Canvas 2D homing rockets, smoke trails, booms) |
| 03 | `store-crimson-katana-anime` | نصل الكاتانا القرمزية وشطر الشاشة | Crimson Katana Anime Slash | `fullscreen` | `store` | `katana-thunder` | `katana-slash-detonation` (Red eyes, blade whoosh, thunder shockwave) |
| 04 | `golden-lion-king-roar` | زئير الأسد الملكي والذهب المنصهر | Golden Lion King Roar | `subscribe` | `ultra` | `lion-roar` | `lion-roar-shockwave` (Golden eyes, sub-bass roar, golden wave) |
| 05 | `nuclear-megaton-detonation` | الانفجار النووي التكتيكي وموجة الصدمة | Nuclear Megaton Tactical Blast | `fullscreen` | `ultra` | `nuclear-blast` | `nuclear-tactical-drop` (Siren, hypersonic missile, shockwave) |
| 06 | `void-hollow-purple-domain` | انفجار الفراغ الكوني الأرجواني | Void Hollow Purple Singularity | `fullscreen` | `store` | `void-vortex` | `void-singularity` (Purple eyes, black hole vacuum, supernova) |
| 07 | `pharaoh-dark-awakening-curse` | صحوة الفرعون الخالد ولعنة الذهب | Pharaoh Dark Awakening Curse | `fullscreen` | `loyalty` | `pharaoh-curse` | `pharaoh-awakening` (Emerald eyes, scarab wings, sandstorm) |
| 08 | `cyber-plasma-core-overdrive` | قلب البلازما السيبرانية المتفجر | Cyber Plasma Core Overdrive | `raid` | `pro` | `cyber-plasma` | `cyber-overdrive` (Glitch lines, EMP shockwave, RGB shift) |
| 09 | `fullscreen-blood-moon-raid` | غزو القمر القرمزي الشامل | Full-Screen Blood Moon Raid | `fullscreen` | `ultra` | `blood-thunder` | `blood-splatter` (Screen dripping blood, red moon, thunder) |
| 10 | `fullscreen-shattered-dimension` | انشطار الأبعاد الكريستالي الشامل | Full-Screen Dimension Shatter | `fullscreen` | `ultra` | `shatter-drop` | `shatter-prism-blast` (Glass stress fractures, crystalline blast) |
| 11 | `fullscreen-imperial-conquest` | الفتح الإمبراطوري العظيم | Full-Screen Imperial Conquest | `fullscreen` | `store` | `imperial-fanfare` | `imperial-conquest` (Golden eagles, royal brass, cannon fire) |

---

### 3.2 Tiered Donation & Supporter Alerts (7 Packs)

| # | Pack ID | Title (Arabic) | Title (English) | Category | Tier | Sound Preset | Visual Engine / Choreography |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 12 | `top-1-donor-royal-throne` | عرش الداعم الأول #1 والتاج الملكي | #1 Top Donor Royal Throne | `donation` | `pro` | `royal-fanfare` | `royal-fabric` (Royal crown RGBA frame, gold laurel, velvet) |
| 13 | `abyssal-water-ripple` | أمواج المحيط وتسونامي التبرعات | Abyssal Water Ripple | `donation` | `plus` | `water-splash` | `rippling-water` (SVG turbulence water caustics, wave burst) |
| 14 | `starter-emerald-tip` | العملات الزمردية للتبرعات | Emerald Coin Drop Starter | `donation` | `free` | `coins-register` | `emerald-matrix` (Single coin register drop, green glow) |
| 15 | `warzone-airdrop-missile-crate` | صندوق الإمدادات التكتيكي | Warzone Airdrop Crate | `donation` | `plus` | `crate-drop` | `missile-barrage` (Parachute crate drop, flare smoke, cash burst) |
| 16 | `tiktok-lion-gift-storm` | عاصفة أسد التيك توك الخارق | TikTok Lion Gift Storm | `donation` | `pro` | `lion-roar` | `golden-lion` (Golden lion leap, coin meteor, roar blast) |
| 17 | `tiktok-coins-meteor-shower` | مطر عملات التيك توك الذهبية | TikTok Coins Meteor Shower | `donation` | `plus` | `coins-cascade` | `emerald-matrix` (Showering coins, multiplier counter, bell chime) |
| 18 | `supernova-gift-sub-bomb` | قنبلة الاشتراكات الكونية المزدوجة | Supernova Gift Sub Bomb | `donation` | `pro` | `sub-bomb-blast` | `void-supernova` (Exploding gift crates, cosmic shockwave) |

---

### 3.3 Subscription & Royal Loyalty Alerts (7 Packs)

| # | Pack ID | Title (Arabic) | Title (English) | Category | Tier | Sound Preset | Visual Engine / Choreography |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 19 | `top-1-sub-dragon-frame` | إطار تنين الـ VIP للمشترك الأول | #1 Sub Dragon Lord VIP Frame | `subscribe` | `pro` | `dragon-roar` | `molten-lava` (Dragon fire RGBA frame, magma embers, roar) |
| 20 | `crystal-shatter-prism` | الكريستال المتشظي للاشتراكات | Crystal Shatter Prism | `subscribe` | `pro` | `shatter-chime` | `shattered-glass` (Chromatic refraction, crystal chime, shards) |
| 21 | `sultan-velvet-gold` | الحرير الملكي المطرز بالذهب | Sultan Velvet & Gold Weave | `subscribe` | `pro` | `royal-brass` | `royal-fabric` (SVG cross-weave pattern, golden embroidery) |
| 22 | `loyalty-pharaoh-immortal` | إرث الفراعنة الذهبي الخالد | Immortal Pharaoh Legacy (3M+) | `subscribe` | `loyalty` | `pharaoh-hymn` | `pharaoh-curse` (Scarab medallion, golden sarcophagus glow) |
| 23 | `royal-purple-emperor-sub` | إمبراطور البث الأرجواني | Royal Purple Emperor Sub | `subscribe` | `plus` | `emperor-chime` | `void-supernova` (Purple velvet banner, gold trim, herald horn) |
| 24 | `red-wolf-alpha-howl` | عواء ذئب الألفا الأحمر | Red Wolf Alpha Howl | `subscribe` | `pro` | `wolf-howl` | `blood-splatter` (Crimson moon, wolf silhouette, pack howl) |
| 25 | `crimson-ghoul-awakening` | صحوة الغول القرمزي المقنع | Crimson Ghoul Awakening | `subscribe` | `pro` | `ghoul-snap` | `blood-splatter` (Centipede shadow, eye flare, bone crack) |

---

### 3.4 Raids, Taps & Anime Action Alerts (6 Packs)

| # | Pack ID | Title (Arabic) | Title (English) | Category | Tier | Sound Preset | Visual Engine / Choreography |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 26 | `top-1-katana-shogun-frame` | شوغون الكاتانا وبطل الغزو | #1 Katana Shogun Raid Champion | `raid` | `plus` | `katana-draw` | `blood-splatter` (Crimson demon RGBA frame, katana cross) |
| 27 | `loyalty-molten-dragon` | غضب التنين البركاني للغزو | Molten Lava Dragon Raid (3M+) | `raid` | `loyalty` | `dragon-inferno`| `molten-lava` (Flowing magma displacement, fire embers) |
| 28 | `store-cyberpunk-overdrive` | الهولوغرام السيبراني 2099 | Cyberpunk Hologram 2099 | `raid` | `store` | `cyber-warp` | `cyber-glitch` (Neon cyan glitch, scanlines, digital warp) |
| 29 | `tiktok-taps-fire-combo` | كومبو تكبيس التيك توك الناري | TikTok Taps Fire Combo | `raid` | `plus` | `taps-bubble-pop`| `molten-lava` (Rapid bubble pop crescendo, flaming combo counter) |
| 30 | `thunder-breathing-zenitsu-slash`| تنفس الرعد: الهيئة الأولى | Thunder Breathing God Speed | `raid` | `store` | `zenitsu-thunder`| `cyber-glitch` (Golden lightning zig-zag, sonic boom strike) |
| 31 | `anubis-underworld-raid` | غزو أنوبيس حارس العالم السفلي | Anubis Underworld Army Raid | `raid` | `pro` | `anubis-chant` | `pharaoh-curse` (Jackal shadow, emerald flames, weighing of hearts) |

---

### 3.5 Follower Alerts (4 Packs)

| # | Pack ID | Title (Arabic) | Title (English) | Category | Tier | Sound Preset | Visual Engine / Choreography |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 32 | `starter-teal-pulse` | النبض الفيروزي الكلاسيكي | Teal Pulse Starter Follower | `follow` | `free` | `cyber-blip` | `cyber-glitch` (Clean neon teal pulse, minimal cyber blip) |
| 33 | `crimson-blood-reaper` | السيف القرمزي والدماء المتدفقة | Crimson Blood Reaper Follow | `follow` | `pro` | `blood-drip` | `blood-splatter` (SVG live blood dripping from letters, sub-bass) |
| 34 | `dark-omen-shadow-follow` | نذير الظلال للمتابع الجديد | Dark Omen Shadow Follow | `follow` | `plus` | `shadow-whisper` | `shadow-eyes` (Subtle purple eye blink, soft shadow pulse) |
| 35 | `hellfire-rocket-follow` | صاروخ الجحيم الترحيبي | Hellfire Welcome Rocket | `follow` | `free` | `rocket-whistle` | `missile-barrage` (Single upward rocket, spark pop, welcome text) |

---

### 3.6 Stream Scene Suites (4 Packs)

| # | Pack ID | Title (Arabic) | Title (English) | Category | Tier | Sound Preset | Visual Engine / Choreography |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 36 | `scene-starting-soon-oasis` | شاشة بدء البث: الواحة الفيروزية | Starting Soon Oasis Scene | `scenes` | `plus` | `oasis-ambient` | `rippling-water` (Flowing water caustic background, timer HUD) |
| 37 | `scene-brb-velvet` | شاشة الاستراحة: المخمل الذهبي | Be Right Back Velvet Intermission | `scenes` | `plus` | `lounge-lofi` | `royal-fabric` (Breathing gold texture, coffee steam, social links) |
| 38 | `scene-ending-supernova` | شاشة نهاية البث: شكر النجوم | Stream Ending Supernova Credits | `scenes` | `pro` | `supernova-outro`| `void-supernova` (Cosmic drift, scrolling supporter thank-you roll) |
| 39 | `scene-boss-arena-starting` | شاشة ساحة المعركة: بدء البث الأسطوري | Boss Arena Battle Starting | `scenes` | `ultra` | `epic-orchestral`| `shadow-eyes-blast` (Dual battle horns, fiery arena countdown) |

---

### 3.7 Integrated Stream Widget Packs (3 Packs)

| # | Pack ID | Title (Arabic) | Title (English) | Category | Tier | Sound Preset | Visual Engine / Choreography |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 40 | `widget-all-in-one-hud` | شريط أدوات البث المتكامل (HUD) | All-In-One Streamer HUD Bar | `widgets` | `pro` | `hud-beep` | `emerald-matrix` (Progress bar + latest supporter + framed badge) |
| 41 | `widget-top-supporters-podium`| منصة تيجان الداعمين الثلاثة | Top Supporters Crown Podium | `widgets` | `plus` | `podium-fanfare` | `royal-fabric` (Gold/Silver/Bronze framed avatars podium) |
| 42 | `widget-dragon-fire-goal` | عداد أهداف التنين المشتعل | Dragon Fire Milestone Goal | `widgets` | `free` | `goal-ding` | `molten-lava` (Animated fiery progress bar with goal milestone) |

---

## 4. The 16 Stream Engagement Widgets Specification

| # | Widget Name | Component Identifier | Min Tier | OBS Capabilities & Key Features |
| :--- | :--- | :--- | :---: | :--- |
| 01 | **Chat Box** | `ChatBoxWidget.jsx` | Free | Real-time chat feed with Twitch/Kick/YouTube badge parsing, custom emotes, configurable font size, message fading (5s–60s or persist), and background opacity. |
| 02 | **Event List** | `EventListWidget.jsx` | Plus | Rolling vertical or horizontal feed of recent stream events (Follow, Sub, Tip, Raid) with category icons, tier styling, and slide-in choreography. |
| 03 | **Goals & Progress Bars** | `GoalWidget.jsx` | Free | Milestone tracker for Followers, Subs, Donations, or Bits with animated SVG/Canvas glowing progress fill, remaining time counter, and celebration confetti. |
| 04 | **Tip Jar** | `TipJarWidget.jsx` | Plus | Canvas 2D / Matter.js physics simulation of falling coins/tokens dropping into a glass jar upon tips, with bouncy collision and level-fill indicators. |
| 05 | **Top Supporters** | `TopSupportersWidget.jsx`| Plus | Supporter podium featuring transparent RGBA royal frames (`frame-royal-crown.png`, `frame-dragon-fire.png`) for #1, #2, #3 top contributors with all-time/monthly filters. |
| 06 | **End Credits** | `EndCreditsWidget.jsx` | Pro | Cinematic vertical scrolling credit roll honoring all stream supporters, mods, VIPs, and gifters with custom scroll velocity and musical crescendo. |
| 07 | **Media Share** | `MediaShareWidget.jsx` | Pro | Screen overlay video player for viewer-donated YouTube/MP4 clips with moderation approval queue, skip/pause hotkeys, volume attenuation, and blacklisting. |
| 08 | **Polls** | `PollWidget.jsx` | Plus | Interactive live viewer voting HUD with animated percentage bars, voting timer, and winner celebration burst. |
| 09 | **Spin Wheel** | `SpinWheelWidget.jsx` | Pro | Physics-based rotating prize wheel for creator challenges, sub goals, and giveaways with audible peg ticks and prize popup celebration. |
| 10 | **Stream Boss** | `StreamBossWidget.jsx` | Pro | Gamified boss battle widget with an HP bar reduced by viewer cheers/subs. The viewer dealing the final blow assumes the role of the new Boss with their avatar in a royal frame. |
| 11 | **Emote Wall** | `EmoteWallWidget.jsx` | Plus | Explosive reaction engine rendering chat emotes as floating, rotating, bursting particles across the stream upon hype commands or celebrations. |
| 12 | **Sponsor Banner** | `SponsorBannerWidget.jsx`| Plus | Timed rotation carousel for brand sponsor logos, social handles, and dynamic QR codes with smooth 3D flip transitions. |
| 13 | **Countdown Timer** | `CountdownTimerWidget.jsx`| Free | Precision stream countdown / subathon timer with digital LED, flip clock, and minimal bar styles with audio alarm at zero. |
| 14 | **Stream Labels** | `StreamLabelsWidget.jsx` | Free | Modular single-metric indicators (Latest Follower, Latest Sub, Latest Donator, Top Donor Today, Stream Uptime) with customizable prefix icons. |
| 15 | **Viewer Counter** | `ViewerCounterWidget.jsx`| Free | Multi-platform concurrent viewer aggregate indicator (Twitch + YouTube + Kick) with pulsing LIVE dot. |
| 16 | **Custom HTML/URL Widget**| `CustomHtmlWidget.jsx` | Pro | Sandboxed iframe embedding creator custom HTML/CSS/JS with CodeMirror editor and live preview in dashboard. |

---

## 5. Transparent RGBA Avatar Frames Matrix

| Frame ID | Frame Title (Arabic) | Frame Title (English) | Tier | Resolution | Intended Visual Use |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `frame-royal-crown` | 👑 التاج الملكي وغصن الذهب | #1 Top Donor Gold Crown & Laurel | Plus | 512×512 RGBA | #1 Top Donor podium, highest single tip alert, sultan alerts |
| `frame-dragon-fire` | 🐉 التنين البركاني والنيران | Dragon Lord VIP Magma Frame | Pro | 512×512 RGBA | Top subscriber, raid champions, molten dragon alerts |
| `frame-crimson-demon`| ⚔️ سيوف الكاتana وشوغون الظلال | Crimson Shogun Crossed Katana Frame | Pro | 512×512 RGBA | Anime katana alerts, top gifter, raid battle leaders |
| `frame-pharaoh-void` | 🏺 الفرعون الخالد والجعران المجنح | Immortal Pharaoh Scarab Emerald Frame | Ultra | 512×512 RGBA | Ultra tier subscribers, loyalty 3M+ members, pharaoh awakening |

---

## 6. Monetization Hooks & Upgrade Triggers

1. **Watermark Removal Hook**: Free tier overlays display a subtle, non-intrusive `MN Alerts` badge in the corner. Upgrading to Plus (5 EGP/mo) instantly removes all branding.
2. **Full-Screen Detonations Gate**: Attempting to select `shadow-monarch-twin-eyes` or `nuclear-megaton-detonation` in Free/Plus triggers the Pro/Ultra VIP modal showcasing a live 60 FPS preview.
3. **Audio Freedom Gate**: Uploading custom MP3s and accessing bespoke stereo soundscapes is unlocked at Plus/Pro.
4. **Multi-Scene Studio Gate**: Free tier creators are restricted to 1 active scene; Plus unlocks 3 scenes; Pro unlocks unlimited scenes with profile switching.

---

*Approved for platform feature enforcement across the MN Alerts Creator Ecosystem.*
