// ==========================================================================
// MNALERTS — OBS STUDIO BROWSER SOURCE BROADCASTER & STANDALONE HTML EXPORTER
// Supports:
// 1. Live BroadcastChannel ('mn_alerts_live_channel') for ?obs=1 Browser Source
// 2. Self-Contained HTML/CSS/SVG/Canvas/Video/Audio Export for OBS local file
// ==========================================================================

import { AVATAR_FRAMES_MAP } from '../data/alertsCatalog';

const CHANNEL_NAME = 'mn_alerts_live_channel';

/**
 * Broadcasts a live alert event to any open OBS Browser Source window (?obs=1)
 * or secondary tab on the same origin.
 */
export function broadcastObsAlert(pack, customOverrides = {}) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({
        type: 'MN_TRIGGER_ALERT',
        timestamp: Date.now(),
        packId: pack.id,
        pack,
        customOverrides,
      });
      ch.close();
    }
    localStorage.setItem(
      'mn_alerts_last_broadcast',
      JSON.stringify({
        type: 'MN_TRIGGER_ALERT',
        timestamp: Date.now(),
        packId: pack.id,
        customOverrides,
      })
    );
  } catch (err) {
    console.warn('OBS Broadcast warning:', err);
  }
}

/**
 * Subscribes to live alert broadcasts (used by ?obs=1 widget mode & dashboard)
 */
export function listenObsBroadcast(onAlertReceived) {
  let ch = null;
  if (typeof BroadcastChannel !== 'undefined') {
    ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = (ev) => {
      if (ev.data && ev.data.type === 'MN_TRIGGER_ALERT') {
        onAlertReceived(ev.data);
      }
    };
  }

  const handleStorage = (ev) => {
    if (ev.key === 'mn_alerts_last_broadcast' && ev.newValue) {
      try {
        const parsed = JSON.parse(ev.newValue);
        if (parsed && parsed.type === 'MN_TRIGGER_ALERT') {
          onAlertReceived(parsed);
        }
      } catch (_) {}
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    if (ch) ch.close();
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Generates the OBS Studio Browser Source URL for a specific pack or the user's active library
 */
export function getObsBrowserSourceUrl(packId = 'all', customOverrides = {}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mn-alert.vercel.app';
  const params = new URLSearchParams();
  params.set('obs', '1');
  params.set('pack', packId);
  if (customOverrides.username) params.set('username', customOverrides.username);
  if (customOverrides.amount) params.set('amount', customOverrides.amount);
  if (customOverrides.subtext) params.set('subtext', customOverrides.subtext);
  if (customOverrides.message) params.set('message', customOverrides.message);
  if (customOverrides.soundPreset) params.set('sound', customOverrides.soundPreset);
  if (customOverrides.avatarFrame) params.set('frame', customOverrides.avatarFrame);
  if (customOverrides.choreography) params.set('choreo', customOverrides.choreography);
  return `${origin}/?${params.toString()}`;
}

/**
 * Generates and downloads a 100% self-contained standalone HTML/CSS/SVG/Canvas/JS alert file
 * with Multi-Stage Choreography (Dimming -> Twin Glowing Eyes -> Rockets/Fireballs Canvas + Video + Transparent RGBA Frame)
 */
export function downloadStandaloneAlertHTML(pack, customOverrides = {}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultName = customOverrides.username || pack.defaultSupporter || 'اسم الداعم';
  const defaultAmount = customOverrides.amount || pack.defaultAmount || '500 EGP';
  const defaultSubtext = customOverrides.subtext || pack.defaultSubtext || pack.headline;
  const defaultMessage = customOverrides.message ?? pack.defaultMessage ?? '';
  const frameId = customOverrides.avatarFrame || pack.avatarFrame || 'royal-crown';
  const frameObj = AVATAR_FRAMES_MAP[frameId] || AVATAR_FRAMES_MAP['royal-crown'];
  const frameUrl = frameObj?.imageUrl ? `${origin}${frameObj.imageUrl}` : '';
  const vfxUrl = pack.vfxVideo ? `${origin}${pack.vfxVideo}` : '';
  const eyeColor = pack.eyeColor || pack.accentColor || '#38bdf8';

  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>mnalerts — ${pack.name} (OBS Cinematic Widget)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Tajawal:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --alert-accent: ${pack.accentColor || '#2DD4BF'};
      --alert-secondary: ${pack.secondaryColor || '#B9834A'};
      --alert-glow: ${pack.glowColor || 'rgba(45, 212, 191, 0.45)'};
      --eye-color: ${eyeColor};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: transparent !important;
      font-family: 'Tajawal', 'Cairo', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #F5F1EA;
    }
    .mn-stage-vignette {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 50% 45%, rgba(8, 10, 18, 0.25) 0%, rgba(4, 5, 10, 0.82) 100%);
      opacity: 0;
      transition: opacity 0.45s ease;
      pointer-events: none;
    }
    body.alert-active .mn-stage-vignette { opacity: 1; }
    #mn-vfx-canvas {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      mix-blend-mode: screen;
      z-index: 2;
    }
    .mn-vfx-video {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      object-fit: cover;
      mix-blend-mode: screen;
      opacity: 0;
      transition: opacity 0.45s ease;
      pointer-events: none;
      z-index: 1;
    }
    body.alert-active .mn-vfx-video { opacity: 0.85; }
    .mn-widget-stage {
      position: relative;
      z-index: 5;
      width: min(740px, 92vw);
      padding: 28px 34px;
      border-radius: 28px;
      background: linear-gradient(135deg, rgba(16, 14, 18, 0.88), rgba(10, 8, 12, 0.82));
      border: 1.5px solid rgba(255, 255, 255, 0.18);
      box-shadow: 0 28px 70px rgba(0, 0, 0, 0.82), 0 0 54px var(--alert-glow);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
      opacity: 0;
      transform: scale(0.86) translateY(28px);
      transition: all 0.52s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(14px);
    }
    body.alert-active .mn-widget-stage {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    .mn-twin-eyes {
      width: 320px;
      height: 64px;
      filter: drop-shadow(0 0 18px var(--eye-color));
    }
    .mn-framed-avatar {
      position: relative;
      width: 124px;
      height: 124px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mn-avatar-circle {
      width: 58%;
      height: 58%;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--alert-accent), var(--alert-secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Cairo', sans-serif;
      font-size: 28px;
      font-weight: 900;
      color: #090706;
    }
    .mn-frame-png {
      position: absolute;
      inset: -6%;
      width: 112%;
      height: 112%;
      object-fit: contain;
      pointer-events: none;
    }
    .mn-pills { display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; }
    .mn-pill {
      padding: 5px 16px;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 800;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.22);
    }
    .mn-amount {
      padding: 6px 20px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: 900;
      background: linear-gradient(135deg, #fff, var(--alert-accent), var(--alert-secondary));
      color: #0D0B0A;
      box-shadow: 0 0 24px var(--alert-glow);
    }
    .mn-username {
      font-family: 'Cairo', sans-serif;
      font-size: clamp(30px, 4.5vw, 46px);
      font-weight: 900;
      background: linear-gradient(180deg, #FFFFFF 0%, var(--alert-accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 3px 16px var(--alert-glow));
    }
    .mn-subtext { font-size: 15px; color: #E5DEC9; }
    .mn-msg {
      margin-top: 4px;
      padding: 10px 18px;
      border-radius: 12px;
      background: rgba(0,0,0,0.48);
      border: 1px solid rgba(255,255,255,0.14);
      font-size: 14px;
      color: #F5F1EA;
    }
  </style>
</head>
<body>
  <div class="mn-stage-vignette"></div>
  ${vfxUrl ? `<video class="mn-vfx-video" src="${vfxUrl}" autoplay muted loop playsinline></video>` : ''}
  <canvas id="mn-vfx-canvas"></canvas>

  <div id="mn-alert-box" class="mn-widget-stage">
    <!-- Stage 2: Twin Glowing Eyes in the Darkness -->
    <svg class="mn-twin-eyes" viewBox="0 0 500 110">
      <path d="M112,58 Q155,28 212,52 Q165,72 112,58 Z" fill="var(--eye-color)" />
      <path d="M128,56 Q160,38 196,52 Q162,64 128,56 Z" fill="#ffffff" />
      <path d="M388,58 Q345,28 288,52 Q335,72 388,58 Z" fill="var(--eye-color)" />
      <path d="M372,56 Q340,38 304,52 Q338,64 372,56 Z" fill="#ffffff" />
    </svg>

    <!-- Stage 4: True Transparent RGBA Royal Frame -->
    <div class="mn-framed-avatar">
      <div class="mn-avatar-circle" id="el-initials">👑</div>
      ${frameUrl ? `<img class="mn-frame-png" src="${frameUrl}" alt="Frame" />` : ''}
    </div>

    <div class="mn-pills">
      <span class="mn-pill" id="el-headline">${pack.headline}</span>
      <span class="mn-amount" id="el-amount">${defaultAmount}</span>
    </div>
    <div class="mn-username" id="el-username">${defaultName}</div>
    <div class="mn-subtext" id="el-subtext">${defaultSubtext}</div>
    <div class="mn-msg" id="el-msg" style="${defaultMessage ? '' : 'display:none'}">${defaultMessage}</div>
  </div>

  <script>
    const canvas = document.getElementById('mn-vfx-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let particles = [];
    let rockets = [];

    function spawnExplosion(x, y) {
      for (let i = 0; i < 60; i++) {
        const ang = (Math.PI * 2 * i) / 60;
        const spd = 2 + Math.random() * 10;
        particles.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 2 + Math.random() * 5,
          alpha: 1,
          color: i % 2 === 0 ? '${pack.accentColor || '#fbbf24'}' : '#ffffff'
        });
      }
    }

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.016;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(loop);
    }
    loop();

    function playExplosionSound() {
      try {
        const actx = new (window.AudioContext || window.webkitAudioContext)();
        const now = actx.currentTime;
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(24, now + 1.4);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(now);
        osc.stop(now + 1.55);
      } catch (e) {}
    }

    let hideTimer = null;
    window.MNAlerts = {
      trigger: function(data = {}) {
        if (data.username) document.getElementById('el-username').textContent = data.username;
        if (data.amount) document.getElementById('el-amount').textContent = data.amount;
        if (data.subtext) document.getElementById('el-subtext').textContent = data.subtext;
        if (data.message !== undefined) {
          const m = document.getElementById('el-msg');
          m.textContent = data.message;
          m.style.display = data.message ? 'block' : 'none';
        }
        document.body.classList.add('alert-active');
        spawnExplosion(canvas.width / 2, canvas.height / 2);
        playExplosionSound();
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          document.body.classList.remove('alert-active');
        }, data.duration || ${(pack.duration || 9) * 1000});
      }
    };

    setTimeout(() => window.MNAlerts.trigger(), 350);
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('${CHANNEL_NAME}');
      ch.onmessage = (e) => {
        if (e.data && e.data.type === 'MN_TRIGGER_ALERT') {
          window.MNAlerts.trigger(e.data.customOverrides || {});
        }
      };
    }
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mnalerts-${pack.id}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
