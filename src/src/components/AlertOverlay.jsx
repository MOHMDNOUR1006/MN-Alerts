import React, { useState, useEffect, useCallback, useRef } from 'react';
import { soundEngine } from '../services/soundEngine';
import { AVATAR_FRAMES_MAP } from '../data/alertsCatalog';
import { initialsAvatar } from './AvatarRing';
import './AlertOverlay.css';

/**
 * Global SVG Filter Definitions
 */
export function GlobalSvgFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        {/* 1. Blood Drip Gooey Filter */}
        <filter id="mn-blood-drip" x="-20%" y="-20%" width="140%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.08" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#be123c" floodOpacity="0.85" />
        </filter>

        {/* 2. Shattered Glass Prismatic Filter */}
        <filter id="mn-glass-refract" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" seed="12" result="turb" />
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="3" />
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#38bdf8" floodOpacity="0.75" />
          <feDropShadow dx="-2" dy="-1" stdDeviation="2" floodColor="#c084fc" floodOpacity="0.65" />
        </filter>

        {/* 3. Rippling Water Caustic Filter */}
        <filter id="mn-water-caustic" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="turbulence" baseFrequency="0.015 0.05" numOctaves="2" seed="4" result="waterNoise" />
          <feDisplacementMap in="SourceGraphic" in2="waterNoise" scale="4" />
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#2dd4bf" floodOpacity="0.7" />
        </filter>

        {/* 4. Royal Fabric Cross-Weave Pattern */}
        <pattern id="mn-fabric-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#18120e" />
          <path d="M0 6 H12 M6 0 V12" stroke="rgba(245, 158, 11, 0.14)" strokeWidth="1.2" strokeDasharray="2 2" />
          <path d="M0 0 L12 12 M12 0 L0 12" stroke="rgba(185, 131, 74, 0.08)" strokeWidth="0.8" />
        </pattern>

        {/* 5. Molten Lava Pattern & Filter */}
        <filter id="mn-lava-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="magma" />
          <feDisplacementMap in="SourceGraphic" in2="magma" scale="4" />
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f97316" floodOpacity="0.9" />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * True Transparent RGBA Avatar Frame Component
 * Wraps the supporter's avatar inside one of our background-removed RGBA PNG frames
 * (`/media/frames/frame-royal-crown.png`, `frame-dragon-fire.png`, `frame-crimson-demon.png`, `frame-pharaoh-void.png`)
 */
export function TransparentFramedAvatar({
  username = 'اسم الداعم',
  avatarUrl,
  frameId = 'royal-crown',
  accentColor = '#fbbf24',
  size = 112,
  rankBadgeText = '#1 TOP',
  showRankPill = true,
}) {
  const rawFrameId = frameId || 'royal-crown';
  const normalizedFrameKey = String(rawFrameId).startsWith('frame-') ? rawFrameId : `frame-${rawFrameId}`;
  const frameObj =
    AVATAR_FRAMES_MAP[rawFrameId] ||
    AVATAR_FRAMES_MAP[normalizedFrameKey] ||
    AVATAR_FRAMES_MAP[String(rawFrameId).replace(/^frame-/, '')] ||
    AVATAR_FRAMES_MAP['royal-crown'];
  const pureFrameId = frameObj ? frameObj.id : 'royal-crown';
  const hasPngFrame = Boolean(frameObj && frameObj.imageUrl);
  const avatarSrc = avatarUrl || initialsAvatar(username);

  return (
    <div
      className={`mn-framed-avatar-box frame-${pureFrameId} frame-id-${pureFrameId} ${hasPngFrame ? 'has-rgba-frame' : 'no-rgba-frame'}`}
      data-frame-id={`frame-${pureFrameId}`}
      style={{
        width: size,
        height: size,
        '--frame-accent': frameObj?.accentColor || accentColor,
        '--frame-glow': frameObj?.glowColor || 'rgba(251, 191, 36, 0.6)',
      }}
    >
      {/* Ambient Aura behind the frame */}
      <div className="mn-framed-avatar-aura" />

      {/* Inner circular supporter photo fitted neatly inside the transparent center hole of the RGBA frame */}
      <div className="mn-framed-avatar-inner">
        <img src={avatarSrc} alt={username} className="mn-framed-avatar-img" />
      </div>

      {/* True Background-Removed RGBA PNG Frame Overlay */}
      {hasPngFrame && (
        <img
          src={frameObj.imageUrl}
          alt={frameObj.nameAr}
          className="mn-rgba-frame-overlay"
          draggable={false}
        />
      )}

      {/* #1 Rank / VIP Crown Badge at bottom of frame */}
      {showRankPill && (
        <span className="mn-framed-rank-pill">
          {rankBadgeText || frameObj?.badgeAr || '#1 VIP'}
        </span>
      )}
    </div>
  );
}

/**
 * Twin Glowing Eyes in the Darkness (`ظهور نورين في الظلام`)
 * Appears in the upper shadow when the screen dims, igniting with piercing lens flares
 */
export function TwinGlowingEyesOverlay({
  eyeColor = '#38bdf8',
  secondaryColor = '#a855f7',
  compact = false,
}) {
  return (
    <div
      className={`mn-twin-eyes-container ${compact ? 'is-compact' : ''}`}
      style={{ '--eye-primary': eyeColor, '--eye-secondary': secondaryColor }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 500 130"
        className="mn-twin-eyes-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="eyeAuraL" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor={eyeColor} stopOpacity="0.95" />
            <stop offset="70%" stopColor={secondaryColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="eyeSlashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity="0" />
            <stop offset="25%" stopColor={eyeColor} stopOpacity="0.95" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="75%" stopColor={eyeColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Left Glowing Eye */}
        <g className="twin-eye-group eye-left">
          <ellipse cx="165" cy="65" rx="68" ry="34" fill="url(#eyeAuraL)" className="eye-outer-bloom" />
          {/* Sharp anime/boss angular eye slit */}
          <path
            d="M112,68 Q155,36 212,62 Q165,82 112,68 Z"
            fill={eyeColor}
            className="eye-iris-shape"
          />
          <path
            d="M126,66 Q160,46 198,62 Q162,74 126,66 Z"
            fill="#ffffff"
          />
          {/* Horizontal & Vertical Lens Flare Spikes */}
          <rect x="80" y="61" width="170" height="3.5" fill="url(#eyeSlashGrad)" className="eye-flare-bar" />
          <circle cx="164" cy="62" r="6" fill="#ffffff" />
        </g>

        {/* Right Glowing Eye */}
        <g className="twin-eye-group eye-right">
          <ellipse cx="335" cy="65" rx="68" ry="34" fill="url(#eyeAuraL)" className="eye-outer-bloom" />
          <path
            d="M388,68 Q345,36 288,62 Q335,82 388,68 Z"
            fill={eyeColor}
            className="eye-iris-shape"
          />
          <path
            d="M374,66 Q340,46 302,62 Q338,74 374,66 Z"
            fill="#ffffff"
          />
          <rect x="250" y="61" width="170" height="3.5" fill="url(#eyeSlashGrad)" className="eye-flare-bar" />
          <circle cx="336" cy="62" r="6" fill="#ffffff" />
        </g>

        {/* Energy arc connecting the two eyes on ignition */}
        <path
          d="M165,62 Q250,35 335,62"
          stroke={eyeColor}
          strokeWidth="1.6"
          strokeDasharray="6 6"
          fill="none"
          opacity="0.55"
          className="eyes-bridge-arc"
        />
      </svg>
    </div>
  );
}

/**
 * Real-Time 60fps HTML5 `<canvas>` VFX Particle, Rocket/Missile, Fireball & Shockwave Engine
 * Renders streaking rockets with smoke/fire trails that detonate into expanding shockwaves,
 * flying embers, energy sparks, or lightning bolts while keeping the canvas transparent!
 */
export function AlertCanvasVFX({
  effect = 'shadow-eyes',
  choreography = 'shadow-eyes-blast',
  accentColor = '#38bdf8',
  secondaryColor = '#f97316',
  compact = false,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = null;
    const W = (canvas.width = compact ? 520 : 1280);
    const H = (canvas.height = compact ? 280 : 720);
    const cx = W / 2;
    const cy = H / 2;

    const isMissileMode =
      effect === 'missile-barrage' ||
      effect === 'nuclear-blast' ||
      choreography === 'missile-fire-strike' ||
      choreography === 'nuclear-tactical-drop';

    const rockets = [];
    const particles = [];
    const shockwaves = [];

    // Spawn a wave of homing rockets or explosion bursts
    function spawnRocket(delayFrames = 0) {
      const side = Math.floor(Math.random() * 4);
      let sx = 0;
      let sy = 0;
      if (side === 0) {
        sx = -30;
        sy = Math.random() * H * 0.6;
      } else if (side === 1) {
        sx = W + 30;
        sy = Math.random() * H * 0.6;
      } else if (side === 2) {
        sx = Math.random() * W;
        sy = -30;
      } else {
        sx = Math.random() * W;
        sy = H + 30;
      }
      const tx = cx + (Math.random() - 0.5) * (W * 0.36);
      const ty = cy + (Math.random() - 0.5) * (H * 0.28);
      const angle = Math.atan2(ty - sy, tx - sx);
      const speed = compact ? 7 + Math.random() * 4 : 14 + Math.random() * 7;

      rockets.push({
        x: sx,
        y: sy,
        tx,
        ty,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        delay: delayFrames,
        exploded: false,
        trail: [],
      });
    }

    function createDetonation(x, y, scale = 1) {
      shockwaves.push({
        x,
        y,
        r: 6,
        maxR: (compact ? 110 : 280) * scale,
        alpha: 0.95,
        color: accentColor,
      });
      shockwaves.push({
        x,
        y,
        r: 2,
        maxR: (compact ? 75 : 190) * scale,
        alpha: 0.85,
        color: '#ffffff',
      });

      const count = compact ? 24 : 52;
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const spd = (1.5 + Math.random() * 8.5) * (compact ? 0.65 : 1.15) * scale;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - Math.random() * 1.2,
          size: (2 + Math.random() * 4.5) * (compact ? 0.75 : 1.1),
          alpha: 1,
          decay: 0.012 + Math.random() * 0.018,
          color:
            i % 3 === 0
              ? '#ffffff'
              : i % 2 === 0
              ? accentColor
              : secondaryColor || '#f97316',
        });
      }
    }

    // Initial choreography setup
    if (isMissileMode) {
      const numRockets = compact ? 4 : 7;
      for (let r = 0; r < numRockets; r++) {
        spawnRocket(r * 14);
      }
    } else {
      // Initial central awakening explosion after twin eyes gleam
      setTimeout(() => {
        createDetonation(cx, cy, 1.25);
      }, compact ? 120 : 420);
    }

    let frame = 0;
    function render() {
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // Periodic ambient embers / sparks rising
      if (frame % (compact ? 4 : 2) === 0 && particles.length < (compact ? 80 : 180)) {
        particles.push({
          x: Math.random() * W,
          y: H + 10,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -(1.4 + Math.random() * 3.4),
          size: 1.5 + Math.random() * 3,
          alpha: 0.85,
          decay: 0.006 + Math.random() * 0.008,
          color: Math.random() > 0.45 ? accentColor : secondaryColor,
        });
      }

      // Periodic extra rockets or blasts so preview stays alive
      if (isMissileMode && frame % 95 === 0) {
        spawnRocket(0);
        spawnRocket(12);
      } else if (!isMissileMode && frame % 130 === 0) {
        createDetonation(
          cx + (Math.random() - 0.5) * (W * 0.35),
          cy + (Math.random() - 0.5) * (H * 0.25),
          0.85
        );
      }

      // Update & draw Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const rk = rockets[i];
        if (rk.delay > 0) {
          rk.delay--;
          continue;
        }
        rk.trail.push({ x: rk.x, y: rk.y });
        if (rk.trail.length > 14) rk.trail.shift();

        rk.x += rk.vx;
        rk.y += rk.vy;

        // Draw fiery exhaust trail
        for (let t = 0; t < rk.trail.length; t++) {
          const pt = rk.trail[t];
          const ratio = (t + 1) / rk.trail.length;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, ratio * (compact ? 4.5 : 8), 0, Math.PI * 2);
          ctx.fillStyle = t > rk.trail.length - 4 ? '#fef08a' : '#f97316';
          ctx.globalAlpha = ratio * 0.75;
          ctx.fill();
        }

        // Draw glowing missile warhead
        ctx.save();
        ctx.translate(rk.x, rk.y);
        ctx.rotate(rk.angle);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, compact ? 9 : 16, compact ? 3.5 : 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Check if reached target
        const dist = Math.hypot(rk.tx - rk.x, rk.ty - rk.y);
        if (dist < 24 || rk.x < -80 || rk.x > W + 80 || rk.y < -80 || rk.y > H + 80) {
          createDetonation(rk.x, rk.y, 1.15);
          rockets.splice(i, 1);
        }
      }

      // Update & draw Shockwave Rings
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.r += (sw.maxR - sw.r) * 0.11;
        sw.alpha *= 0.92;
        if (sw.alpha <= 0.02) {
          shockwaves.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = compact ? 2.5 : 4.5;
        ctx.globalAlpha = sw.alpha;
        ctx.stroke();
      }

      // Update & draw Particles / Embers
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.alpha -= p.decay;
        if (p.alpha <= 0.02) {
          particles.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [effect, choreography, accentColor, secondaryColor, compact]);

  return <canvas ref={canvasRef} className="mn-vfx-canvas-layer" aria-hidden="true" />;
}

// ─── Custom SVG Emblem Icons per Texture / Event ───────────────────────────
export function PackSvgEmblem({ pack, effect, accent, size = 76 }) {
  const resolvedEffect = effect || pack?.textureEffect || pack?.textureEngine || 'shadow-eyes';
  const resolvedAccent = accent || pack?.accentColor || '#2dd4bf';
  switch (resolvedEffect) {
    case 'shadow-eyes':
    case 'pharaoh-curse':
    case 'void-supernova':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120" className="mn-svg-emblem">
          <defs>
            <radialGradient id="shadowEyeGrad" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor={resolvedAccent} />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="48" fill={resolvedAccent} opacity="0.2" style={{ filter: 'blur(8px)' }} />
          <polygon
            points="60,8 104,34 104,86 60,112 16,86 16,34"
            fill="rgba(10, 12, 20, 0.92)"
            stroke={resolvedAccent}
            strokeWidth="2.5"
          />
          {/* Twin glowing eyes inside the emblem */}
          <path d="M26,58 Q40,42 54,56 Q40,66 26,58 Z" fill="url(#shadowEyeGrad)" className="emblem-pulse" />
          <path d="M94,58 Q80,42 66,56 Q80,66 94,58 Z" fill="url(#shadowEyeGrad)" className="emblem-pulse" />
          <circle cx="41" cy="55" r="3" fill="#ffffff" />
          <circle cx="79" cy="55" r="3" fill="#ffffff" />
          <path d="M36,84 L60,72 L84,84" stroke={resolvedAccent} strokeWidth="2.5" fill="none" opacity="0.8" />
        </svg>
      );

    case 'missile-barrage':
    case 'nuclear-blast':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120" className="mn-svg-emblem">
          <defs>
            <radialGradient id="blastGrad" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
          </defs>
          {/* Shockwave rings */}
          <circle cx="60" cy="60" r="48" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="8 4" className="stitch-rotate" />
          <circle cx="60" cy="60" r="34" fill="url(#blastGrad)" opacity="0.35" className="emblem-pulse" />
          {/* Streaking Tactical Missile */}
          <g transform="rotate(-38 60 60)">
            <path d="M60,14 C68,28 70,54 70,74 L50,74 C50,54 52,28 60,14 Z" fill="#f8fafc" stroke="#f97316" strokeWidth="2" />
            <path d="M60,14 C65,24 66,34 66,36 L54,36 C54,34 55,24 60,14 Z" fill="#ef4444" />
            <polygon points="50,62 36,78 50,74" fill="#ef4444" />
            <polygon points="70,62 84,78 70,74" fill="#ef4444" />
            {/* Rocket exhaust flame */}
            <path d="M52,75 Q60,108 60,112 Q60,108 68,75 Z" fill="url(#blastGrad)" className="emblem-pulse" />
          </g>
        </svg>
      );

    case 'golden-lion':
    case 'royal-fabric':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120" className="mn-svg-emblem">
          <defs>
            <linearGradient id="goldSilk" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>
          <polygon
            points="60,8 102,26 94,76 60,110 26,76 18,26"
            fill="rgba(24,18,14,0.9)"
            stroke="url(#goldSilk)"
            strokeWidth="3"
            strokeDasharray="6 3"
            className="stitch-rotate"
          />
          <path
            d="M28,74 L35,40 L50,56 L60,26 L70,56 L85,40 L92,74 Z"
            fill="url(#goldSilk)"
            className="emblem-pulse"
          />
          <rect x="28" y="77" width="64" height="8" rx="4" fill="url(#goldSilk)" />
          <circle cx="60" cy="21" r="5" fill="#fef08a" />
          <circle cx="34" cy="35" r="4" fill="#ef4444" />
          <circle cx="86" cy="35" r="4" fill="#ef4444" />
        </svg>
      );

    case 'blood-splatter':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120" className="mn-svg-emblem">
          <defs>
            <radialGradient id="bloodGrad" cx="40%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="45%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#4c0519" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="56" r="42" fill="#e11d48" opacity="0.25" style={{ filter: 'blur(10px)' }} />
          <path
            d="M60,86 C26,64 14,44 14,31 C14,18 24,10 36,10 C46,10 54,16 60,25 C66,16 74,10 84,10 C96,10 106,18 106,31 C106,44 94,64 60,86 Z"
            fill="url(#bloodGrad)"
            className="emblem-pulse"
          />
          {/* Crossed Katana Slash Line */}
          <line x1="16" y1="96" x2="104" y2="18" stroke="#ffffff" strokeWidth="3" />
          <path d="M36,74 Q36,96 36,102 A4,4 0 1,1 32,102 Q34,88 36,74 Z" fill="#e11d48" className="svg-blood-drop drop-1" />
          <path d="M60,85 Q60,108 60,114 A5,5 0 1,1 55,114 Q57,98 60,85 Z" fill="#be123c" className="svg-blood-drop drop-2" />
          <path d="M82,72 Q82,94 82,99 A3.5,3.5 0 1,1 78,99 Q80,86 82,72 Z" fill="#f43f5e" className="svg-blood-drop drop-3" />
        </svg>
      );

    case 'shattered-glass':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120" className="mn-svg-emblem">
          <defs>
            <linearGradient id="shardGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="shardGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f3e8ff" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          <polygon points="60,8 92,36 60,54 28,36" fill="url(#shardGrad1)" className="shard-float-1" />
          <polygon points="28,36 60,54 44,98 16,66" fill="url(#shardGrad2)" opacity="0.9" className="shard-float-2" />
          <polygon points="92,36 104,68 74,98 60,54" fill="url(#shardGrad1)" opacity="0.85" className="shard-float-3" />
          <polygon points="60,54 74,98 60,112 44,98" fill="#e0f2fe" opacity="0.95" className="emblem-pulse" />
          <polyline
            points="60,8 60,54 28,36 M60,54 92,36 M60,54 74,98 M60,54 44,98"
            stroke="#ffffff"
            strokeWidth="1.8"
            fill="none"
          />
        </svg>
      );

    case 'rippling-water':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120" className="mn-svg-emblem">
          <defs>
            <radialGradient id="aquaGrad" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#99f6e4" />
              <stop offset="55%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0369a1" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="68" r="46" fill="none" stroke="#2dd4bf" strokeWidth="1.5" className="water-ring ring-1" />
          <circle cx="60" cy="68" r="34" fill="none" stroke="#5eead4" strokeWidth="2" className="water-ring ring-2" />
          <path
            d="M60,14 C60,14 90,52 90,72 C90,89 76.5,102 60,102 C43.5,102 30,89 30,72 C30,52 60,14 60,14 Z"
            fill="url(#aquaGrad)"
            className="emblem-pulse"
          />
        </svg>
      );

    case 'molten-lava':
      return (
        <svg width={size} height={size} viewBox="0 0 120 120" className="mn-svg-emblem">
          <defs>
            <radialGradient id="lavaCore" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </radialGradient>
          </defs>
          <path
            d="M60,10 C75,32 98,42 94,72 C90,96 74,110 60,110 C46,110 30,96 26,72 C22,42 45,32 60,10 Z"
            fill="url(#lavaCore)"
            className="emblem-pulse"
          />
          <path
            d="M60,36 C68,50 78,58 75,76 C73,90 66,98 60,98 C54,98 47,90 45,76 C42,58 52,50 60,36 Z"
            fill="#fef08a"
            opacity="0.85"
          />
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 120 120" className="mn-svg-emblem">
          <circle cx="60" cy="60" r="44" fill="none" stroke={resolvedAccent} strokeWidth="3" strokeDasharray="10 5" className="stitch-rotate" />
          <polygon points="60,18 96,60 60,102 24,60" fill={resolvedAccent} opacity="0.25" />
          <polygon points="60,28 86,60 60,92 34,60" fill={resolvedAccent} className="emblem-pulse" />
        </svg>
      );
  }
}

/**
 * Renders the custom SVG Texture Background & Overlay inside an Alert Card or Full-Screen Stage
 */
export function TextureBackdropSVG({ effect, accent = '#2dd4bf', secondary = '#b9834a' }) {
  if (effect === 'blood-splatter') {
    return (
      <svg className="mn-texture-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bloodBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a0309" stopOpacity="0.88" />
            <stop offset="55%" stopColor="#3b0714" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#0f0206" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect width="800" height="300" fill="url(#bloodBg)" />
        <path
          d="M0,0 L800,0 L800,38 Q760,85 735,34 Q700,115 670,32 Q620,65 590,28 Q540,130 505,34 Q450,70 410,25 Q360,120 325,35 Q270,80 230,30 Q175,140 140,32 Q90,75 50,28 L0,42 Z"
          fill="#9f1239"
          opacity="0.75"
          className="blood-ceiling-wave"
        />
        <path
          d="M0,0 L800,0 L800,22 Q720,68 680,18 Q610,95 570,20 Q480,55 430,16 Q340,105 295,22 Q190,65 140,18 Q70,88 30,20 L0,25 Z"
          fill="#e11d48"
          opacity="0.85"
        />
      </svg>
    );
  }

  if (effect === 'shattered-glass') {
    return (
      <svg className="mn-texture-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="glassBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#091326" stopOpacity="0.86" />
            <stop offset="50%" stopColor="#111c38" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#1e1035" stopOpacity="0.88" />
          </linearGradient>
        </defs>
        <rect width="800" height="300" fill="url(#glassBg)" />
        <g stroke="rgba(186, 230, 253, 0.35)" strokeWidth="1.5" fill="none">
          <polygon points="0,0 210,0 140,110 0,85" fill="rgba(56, 189, 248, 0.08)" />
          <polygon points="210,0 440,0 380,95 140,110" fill="rgba(192, 132, 252, 0.06)" />
          <polygon points="440,0 650,0 590,125 380,95" fill="rgba(56, 189, 248, 0.11)" />
          <polygon points="650,0 800,0 800,140 590,125" fill="rgba(255, 255, 255, 0.05)" />
        </g>
        <path
          d="M400,150 L210,0 M400,150 L650,0 M400,150 L800,140 M400,150 L660,300 M400,150 L160,300 M400,150 L0,110"
          stroke="rgba(224, 242, 254, 0.55)"
          strokeWidth="1.8"
          strokeDasharray="12 4"
        />
      </svg>
    );
  }

  if (effect === 'rippling-water') {
    return (
      <svg className="mn-texture-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="waterBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#041f24" stopOpacity="0.86" />
            <stop offset="50%" stopColor="#06343d" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#082032" stopOpacity="0.88" />
          </linearGradient>
        </defs>
        <rect width="800" height="300" fill="url(#waterBg)" />
        <path
          d="M0,190 Q200,130 400,190 T800,190 L800,300 L0,300 Z"
          fill="rgba(45, 212, 191, 0.14)"
          className="water-wave-1"
        />
        <path
          d="M0,220 Q200,270 400,220 T800,220 L800,300 L0,300 Z"
          fill="rgba(56, 189, 248, 0.18)"
          className="water-wave-2"
        />
      </svg>
    );
  }

  if (effect === 'royal-fabric' || effect === 'golden-lion') {
    return (
      <svg className="mn-texture-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
        <rect width="800" height="300" fill="url(#mn-fabric-pattern)" opacity="0.88" />
        <rect
          x="14"
          y="14"
          width="772"
          height="272"
          rx="18"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="10 6"
          opacity="0.7"
        />
      </svg>
    );
  }

  if (effect === 'molten-lava' || effect === 'missile-barrage' || effect === 'nuclear-blast') {
    return (
      <svg className="mn-texture-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
        <rect width="800" height="300" fill="#180604" opacity="0.84" />
        <path
          d="M0,260 L120,210 L240,250 L390,185 L520,245 L670,195 L800,240 L800,300 L0,300 Z"
          fill="rgba(234, 88, 12, 0.28)"
        />
        <path
          d="M60,300 L140,190 L210,220 M450,300 L510,160 L590,210 M690,300 L730,180"
          stroke="#f97316"
          strokeWidth="3"
          fill="none"
          opacity="0.6"
        />
      </svg>
    );
  }

  return (
    <svg className="mn-texture-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
      <rect width="800" height="300" fill="#090b12" opacity="0.84" />
      <path d="M0,150 Q200,60 400,150 T800,150" stroke={accent} strokeWidth="2" fill="none" opacity="0.35" />
      <path d="M0,210 Q200,130 400,210 T800,210" stroke={secondary} strokeWidth="1.5" fill="none" opacity="0.28" />
    </svg>
  );
}

/**
 * Renders any Pack (Card Alert, Full-Screen Cinematic Boss Overtake, Stream Scene, or HUD Widget + Top #1 Podium)
 * Supports `mode="stage"` (interactive customizer preview) and `mode="overlay"` (live full-viewport explosion).
 */
export function AlertStageRenderer({ pack, customData = {}, mode = 'stage', onClose }) {
  if (!pack) return null;

  const normalizedCustom = {
    ...(customData.username ? { username: customData.username } : {}),
    ...(customData.amount ? { amount: customData.amount } : {}),
    ...(customData.subtext ? { subText: customData.subtext } : {}),
    ...(customData.subText ? { subText: customData.subText } : {}),
    ...(customData.message !== undefined && customData.message !== '' ? { message: customData.message } : {}),
  };
  const sample = { ...pack.defaultSample, ...normalizedCustom };
  const effect = pack.textureEffect || pack.textureEngine || 'shadow-eyes';
  const choreography = customData.choreography || pack.choreography || 'shadow-eyes-blast';
  const selectedFrameId = customData.avatarFrame || pack.avatarFrame || 'royal-crown';
  const layout = pack.layoutMode || 'card';
  const vfxVideoUrl = pack.vfxVideo || '/media/vfx/fireball-shockwave.mp4';
  const heroArtUrl = pack.heroArt || '/media/art/shadow-twin-eyes.jpg';

  const usernameFilterClass =
    effect === 'blood-splatter'
      ? 'tx-blood-text'
      : effect === 'shattered-glass'
      ? 'tx-glass-text'
      : effect === 'rippling-water' || effect === 'pharaoh-curse'
      ? 'tx-water-text'
      : effect === 'royal-fabric' || effect === 'golden-lion'
      ? 'tx-fabric-text'
      : effect === 'molten-lava' || effect === 'missile-barrage' || effect === 'nuclear-blast'
      ? 'tx-lava-text'
      : 'tx-cyber-text';

  // 1. STREAM SCENE (Starting Soon / Be Right Back / Stream Ending)
  if (layout === 'scene') {
    return (
      <div className={`mn-scene-canvas effect-${effect} ${mode === 'overlay' ? 'is-fullscreen-overlay' : ''}`}>
        <TextureBackdropSVG effect={effect} accent={pack.accentColor} secondary={pack.secondaryColor} />
        {heroArtUrl && (
          <img src={heroArtUrl} alt="" className="mn-hero-art-backdrop" aria-hidden="true" />
        )}
        {vfxVideoUrl && (
          <video
            src={vfxVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="mn-vfx-video-layer"
          />
        )}

        <div className="scene-content-layer">
          <div className="scene-top-bar">
            <span className="scene-live-pill" style={{ borderColor: pack.accentColor, color: pack.accentColor }}>
              ● {sample.headerText}
            </span>
            <span className="scene-brand-watermark">mnalerts · 1080p60 Pro Scene</span>
          </div>

          <div className="scene-center-focus">
            <TwinGlowingEyesOverlay
              eyeColor={pack.eyeColor || pack.accentColor}
              secondaryColor={pack.secondaryColor}
              compact={true}
            />
            <h2 className={`scene-main-heading ${usernameFilterClass}`}>{sample.username}</h2>
            <p className="scene-sub-heading">{sample.subText}</p>
            {sample.amount && (
              <div className="scene-timer-box" style={{ borderColor: pack.accentColor, color: pack.accentColor }}>
                {sample.amount}
              </div>
            )}
          </div>

          <div className="scene-bottom-ticker">
            <div className="ticker-chip">
              <span>👑 #1 الداعم الأول:</span>
              <strong style={{ color: '#fbbf24' }}>الشيخ_سلطان</strong>
            </div>
            <div className="ticker-chip">
              <span>🐉 #1 كبير المشتركين:</span>
              <strong style={{ color: '#f97316' }}>DragonKing_EG</strong>
            </div>
            <div className="ticker-chip">
              <span>❤️ آخر متابع:</span>
              <strong style={{ color: '#2dd4bf' }}>Sniper_Wolf</strong>
            </div>
          </div>
        </div>
        {mode === 'overlay' && onClose && (
          <button className="overlay-dismiss-btn" onClick={onClose}>
            ✕ إغلاق المعاينة
          </button>
        )}
      </div>
    );
  }

  // 2. STREAM HUD WIDGET SUITE + TOP #1 SUPPORTERS ROYAL FRAMES PODIUM
  if (layout === 'widget') {
    return (
      <div className={`mn-widget-suite-canvas ${mode === 'overlay' ? 'is-fullscreen-overlay' : ''}`}>
        {/* Top #1 Supporters Podium with True Transparent RGBA Frames */}
        <div className="hud-top-podium-row">
          <div className="hud-podium-card is-rank-1">
            <TransparentFramedAvatar
              username={sample.username || 'الملك_عبدالله'}
              frameId="royal-crown"
              size={84}
              rankBadgeText="👑 #1 أكثر داعم"
            />
            <div className="hud-podium-meta">
              <span className="podium-role-tag" style={{ color: '#fbbf24' }}>المركز الأول في الدعم</span>
              <strong className="podium-user-name">{sample.username || 'الملك_عبدالله'}</strong>
              <span className="podium-amount-val">5,000 ج.م</span>
            </div>
          </div>

          <div className="hud-podium-card is-rank-sub">
            <TransparentFramedAvatar
              username="DragonKing_EG"
              frameId="dragon-fire"
              size={84}
              rankBadgeText="🐉 #1 أكثر مشترك"
            />
            <div className="hud-podium-meta">
              <span className="podium-role-tag" style={{ color: '#f97316' }}>المركز الأول اشتراكات</span>
              <strong className="podium-user-name">DragonKing_EG</strong>
              <span className="podium-amount-val">25 اشتراك مهدى</span>
            </div>
          </div>
        </div>

        {/* Goal Progress Bar Widget */}
        <div className="hud-goal-widget">
          <div className="hud-goal-header">
            <span>🎯 {sample.subText}</span>
            <strong style={{ color: pack.accentColor }}>{sample.amount || '72%'}</strong>
          </div>
          <div className="hud-goal-track">
            <div
              className="hud-goal-fill"
              style={{
                width: '78%',
                background: `linear-gradient(90deg, ${pack.accentColor}, ${pack.secondaryColor})`,
              }}
            />
          </div>
        </div>

        {/* Transparent Stream Chat Box Preview */}
        <div className="hud-chat-box">
          <div className="hud-chat-line">
            <span className="chat-badge" style={{ color: '#fbbf24' }}>[👑 #1 VIP] {sample.username}:</span>
            <span>{sample.message || 'أقوى بث في مصر، استمر يا بطل! 🔥'}</span>
          </div>
          <div className="hud-chat-line">
            <span className="chat-badge" style={{ color: '#2dd4bf' }}>[SUB] Itachi_EG:</span>
            <span>الإطارات الملكية والانفجارات خرافية! 🚀👑</span>
          </div>
        </div>

        {mode === 'overlay' && onClose && (
          <button className="overlay-dismiss-btn" onClick={onClose}>
            ✕ إغلاق المعاينة
          </button>
        )}
      </div>
    );
  }

  // 3. FULL-SCREEN MULTI-STAGE CINEMATIC OVERTAKE ALERT
  // Choreography: Stage 1 (Dimming Shadow) -> Stage 2 (Twin Glowing Eyes) -> Stage 3 (Video + Canvas Rockets/Fire) -> Stage 4 (Framed Supporter Reveal)
  if (layout === 'fullscreen') {
    return (
      <div
        className={`mn-fullscreen-takeover effect-${effect} choreo-${choreography} ${
          mode === 'overlay' ? 'is-fullscreen-overlay cinematic-camera-shake' : 'is-stage-fullscreen'
        }`}
        style={{ '--pack-accent': pack.accentColor, '--pack-secondary': pack.secondaryColor }}
      >
        {/* Stage 1: Semi-transparent Edge Vignette & Rising Boss Shadow (leaves stream gameplay visible!) */}
        <div className="mn-stage1-shadow-vignette" />

        {heroArtUrl && (
          <img
            src={heroArtUrl}
            alt=""
            className="mn-hero-art-backdrop"
            aria-hidden="true"
          />
        )}

        {/* Stage 3A: Composited MP4 Video VFX (`mix-blend-mode: screen` so black is 100% transparent) */}
        {vfxVideoUrl && (
          <video
            src={vfxVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="mn-vfx-video-layer"
          />
        )}

        {/* Stage 3B: Real-Time 60fps HTML5 Canvas Rockets, Fireballs, Shockwaves & Embers */}
        <AlertCanvasVFX
          effect={effect}
          choreography={choreography}
          accentColor={pack.accentColor}
          secondaryColor={pack.secondaryColor}
          compact={mode !== 'overlay'}
        />

        {/* Diagonal Katana / Lightning Vectors */}
        <svg className="fullscreen-fx-vectors" viewBox="0 0 1200 675" preserveAspectRatio="none">
          {(effect === 'blood-splatter' || choreography === 'katana-slash-detonation') && (
            <>
              <line x1="0" y1="620" x2="1200" y2="55" stroke="#ffffff" strokeWidth="6" className="katana-slash-line" />
              <line
                x1="0"
                y1="620"
                x2="1200"
                y2="55"
                stroke={pack.accentColor}
                strokeWidth="24"
                opacity="0.5"
                style={{ filter: 'blur(8px)' }}
              />
              <polyline
                points="220,0 190,180 260,230 205,460 280,675"
                stroke="#fda4af"
                strokeWidth="3"
                fill="none"
                className="lightning-bolt"
              />
              <polyline
                points="980,0 1020,210 940,280 1010,510 950,675"
                stroke="#fda4af"
                strokeWidth="2.5"
                fill="none"
                className="lightning-bolt"
              />
            </>
          )}
          {effect === 'shattered-glass' && (
            <g stroke="rgba(224,242,254,0.65)" strokeWidth="2" fill="none">
              <line x1="600" y1="337" x2="0" y2="0" />
              <line x1="600" y1="337" x2="600" y2="0" />
              <line x1="600" y1="337" x2="1200" y2="0" />
              <line x1="600" y1="337" x2="1200" y2="675" />
              <line x1="600" y1="337" x2="0" y2="675" />
              <polygon points="600,110 830,337 600,565 370,337" stroke="#c084fc" strokeWidth="2.5" />
            </g>
          )}
        </svg>

        {/* Stage 2 & Stage 4: Twin Glowing Eyes in Darkness + Heroic Supporter Reveal */}
        <div className="fullscreen-center-content">
          {/* Stage 2: Twin Glowing Eyes Awakening in the Upper Shadow */}
          <TwinGlowingEyesOverlay
            eyeColor={pack.eyeColor || pack.accentColor}
            secondaryColor={pack.eyeSecondaryColor || pack.secondaryColor}
            compact={mode !== 'overlay'}
          />

          <div className="fs-badge" style={{ background: pack.accentColor }}>
            {sample.headerText}
          </div>

          {/* Stage 4: Supporter Avatar inside True Transparent RGBA Royal Frame */}
          <div className="fs-emblem-row">
            <TransparentFramedAvatar
              username={sample.username}
              avatarUrl={customData.avatarUrl}
              frameId={selectedFrameId}
              accentColor={pack.accentColor}
              size={mode === 'overlay' ? 142 : 108}
              rankBadgeText={pack.avatarFrameBadge || '👑 #1 VIP'}
            />
          </div>

          <div className={`fs-username ${usernameFilterClass}`} data-text={sample.username}>
            {sample.username}
          </div>

          {sample.amount && (
            <div className="fs-amount-explosion-pill" style={{ '--pill-color': pack.accentColor }}>
              {sample.amount}
            </div>
          )}

          <div className="fs-subtext">{sample.subText}</div>
          {sample.message && <div className="fs-message">“{sample.message}”</div>}
        </div>

        {mode === 'overlay' && onClose && (
          <button className="overlay-dismiss-btn" onClick={onClose}>
            ✕ إغلاق ملء الشاشة
          </button>
        )}
      </div>
    );
  }

  // 4. CINEMATIC STREAM ALERT CARD (With Video VFX Layer, Canvas Particles & Transparent RGBA Royal Frame)
  return (
    <div
      className={`mn-textured-alert-card effect-${effect} ${
        mode === 'overlay' ? 'cinematic-camera-shake' : ''
      }`}
      style={{ '--pack-accent': pack.accentColor, '--pack-secondary': pack.secondaryColor }}
    >
      <TextureBackdropSVG effect={effect} accent={pack.accentColor} secondary={pack.secondaryColor} />

      {heroArtUrl && (
        <img src={heroArtUrl} alt="" className="mn-card-hero-art" aria-hidden="true" />
      )}

      {vfxVideoUrl && (
        <video
          src={vfxVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="mn-vfx-video-layer"
        />
      )}

      <AlertCanvasVFX
        effect={effect}
        choreography={choreography}
        accentColor={pack.accentColor}
        secondaryColor={pack.secondaryColor}
        compact={true}
      />

      <div className="alert-card-body">
        {/* Left/Right Supporter Avatar wrapped in True Transparent RGBA Frame */}
        <div className="alert-emblem-col">
          <TransparentFramedAvatar
            username={sample.username}
            avatarUrl={customData.avatarUrl}
            frameId={selectedFrameId}
            accentColor={pack.accentColor}
            size={96}
            rankBadgeText={pack.avatarFrameBadge || '#1 VIP'}
          />
        </div>

        <div className="alert-text-col">
          <div className="alert-header-row">
            <span className="alert-header-tag" style={{ color: pack.accentColor }}>
              {sample.headerText}
            </span>
            <PackSvgEmblem effect={effect} accent={pack.accentColor} size={34} />
          </div>

          <div className={`alert-supporter-name ${usernameFilterClass}`} data-text={sample.username}>
            {sample.username}
            {effect === 'blood-splatter' && (
              <span className="inline-blood-drips" aria-hidden="true">
                <i className="b-drip d1" />
                <i className="b-drip d2" />
                <i className="b-drip d3" />
                <i className="b-drip d4" />
              </span>
            )}
          </div>

          <div className="alert-meta-row">
            {sample.subText && <span className="alert-subtext">{sample.subText}</span>}
            {sample.amount && (
              <span className="alert-amount-pill" style={{ background: pack.accentColor, color: '#0d0b0a' }}>
                {sample.amount}
              </span>
            )}
          </div>

          {sample.message && <p className="alert-user-msg">“{sample.message}”</p>}
        </div>
      </div>

      <div className="alert-progress-bar">
        <div
          className="alert-progress-fill"
          style={{
            background: `linear-gradient(90deg, ${pack.accentColor}, ${pack.secondaryColor})`,
            animationDuration: `${pack.durationMs || 8000}ms`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Live Overlay Queue Manager (Always mounted at bottom/full-screen for live firing & `window.MNAlerts` OBS API)
 */
export default function AlertOverlay({
  alertRef,
  activeAlert: externalAlert,
  isObsWidget = false,
  onComplete,
}) {
  const [activeAlert, setActiveAlert] = useState(null);
  const queueRef = useRef([]);
  const busyRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (externalAlert && externalAlert.pack) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setActiveAlert(externalAlert);
      const preset =
        externalAlert.customData?.soundPreset ||
        externalAlert.pack?.soundPreset ||
        'shadow-eyes';
      soundEngine.play(preset);
      const dur = externalAlert.pack?.durationMs || 8500;
      timerRef.current = setTimeout(() => {
        setActiveAlert(null);
        if (onComplete) onComplete();
      }, dur);
    }
  }, [externalAlert]);

  const processNext = useCallback(() => {
    if (busyRef.current || queueRef.current.length === 0) return;
    busyRef.current = true;
    const nextItem = queueRef.current.shift();
    setActiveAlert(nextItem);
    soundEngine.play(nextItem.pack?.soundPreset || 'shadow-eyes', nextItem.customSoundUrl);

    const dur = nextItem.pack?.durationMs || 8500;
    timerRef.current = setTimeout(() => {
      setActiveAlert(null);
      busyRef.current = false;
      setTimeout(processNext, 300);
    }, dur);
  }, []);

  const dismissNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveAlert(null);
    busyRef.current = false;
    if (onComplete) onComplete();
    setTimeout(processNext, 250);
  }, [processNext, onComplete]);

  const triggerPack = useCallback(
    (pack, customOverride = {}) => {
      if (!pack) return;
      queueRef.current.push({
        id: `${pack.id}_${Date.now()}`,
        pack,
        customData: customOverride,
      });
      processNext();
    },
    [processNext]
  );

  useEffect(() => {
    const api = {
      triggerPack,
      dismissNow,
      setVolume: (v) => soundEngine.setVolume(v),
      setSound: (preset, url) => soundEngine.setCustomSound(preset, url),
    };
    if (alertRef) alertRef.current = api;
    window.MNAlerts = api;
  }, [alertRef, triggerPack, dismissNow]);

  if (!activeAlert) {
    return <GlobalSvgFilters />;
  }

  const isFullscreenMode =
    activeAlert.pack.layoutMode === 'fullscreen' || activeAlert.pack.layoutMode === 'scene';

  return (
    <>
      <GlobalSvgFilters />
      <div
        className={`mn-live-overlay-host ${isFullscreenMode ? 'host-fullscreen' : 'host-toast'} ${
          isObsWidget ? 'is-obs-widget' : ''
        }`}
      >
        <AlertStageRenderer
          key={activeAlert.id || activeAlert.ts}
          pack={activeAlert.pack}
          customData={activeAlert.customData}
          mode="overlay"
          onClose={dismissNow}
        />
      </div>
    </>
  );
}
