/**
 * EmoteWall.jsx - Emote Wall Particle Shower Widget
 * Feature F26: Explosive particle shower of chat emotes across the screen
 */

import React, { useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer.jsx';

const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

export function EmoteWall({
  id = 'emote-wall',
  type = 'emote-wall',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    maxParticles = 80,
    gravity = 0.25,
    animationMode = 'fountain',
    defaultEmotes = ['🔥', '🚀', '👑', '💎', '❤️', '⚡'],
  } = config;

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const isLoopRunningRef = useRef(false);

  const spawnParticles = (emotes = defaultEmotes, count = 20, mode = animationMode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= maxParticles) break;

      const emote = emotes[Math.floor(Math.random() * emotes.length)] || '🔥';
      let x, y, vx, vy;

      if (mode === 'fountain') {
        x = width / 2 + (Math.random() - 0.5) * (width * 0.2);
        y = height + 10;
        vx = (Math.random() - 0.5) * 12;
        vy = -Math.random() * 14 - 10;
      } else if (mode === 'fireworks') {
        x = width * (0.3 + Math.random() * 0.4);
        y = height * (0.3 + Math.random() * 0.4);
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 4;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      } else if (mode === 'rain') {
        x = Math.random() * width;
        y = -20;
        vx = (Math.random() - 0.5) * 2;
        vy = Math.random() * 4 + 3;
      } else { // bubble
        x = Math.random() * width;
        y = height + 20;
        vx = (Math.random() - 0.5) * 3;
        vy = -Math.random() * 4 - 2;
      }

      particlesRef.current.push({
        id: Math.random(),
        text: emote,
        x,
        y,
        vx,
        vy,
        rotation: (Math.random() - 0.5) * 0.5,
        vRot: (Math.random() - 0.5) * 0.08,
        scale: Math.random() * 0.6 + 0.8,
        alpha: 1,
        life: 1,
        decay: Math.random() * 0.008 + 0.006,
        mode,
      });
    }

    if (!isLoopRunningRef.current) {
      isLoopRunningRef.current = true;
      animFrameRef.current = requestAnimationFrame(particleLoop);
    }
  };

  const particleLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;
    const nextParticles = [];

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (p.mode === 'fountain' || p.mode === 'fireworks') {
        p.vy += gravity;
      } else if (p.mode === 'bubble') {
        p.vx += Math.sin(p.y * 0.05) * 0.1;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;
      p.life -= p.decay;
      p.alpha = Math.max(0, p.life);

      if (p.alpha > 0.02 && p.y < height + 60 && p.y > -80) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text, 0, 0);
        ctx.restore();

        nextParticles.push(p);
      }
    }

    particlesRef.current = nextParticles;

    if (nextParticles.length > 0) {
      animFrameRef.current = requestAnimationFrame(particleLoop);
    } else {
      isLoopRunningRef.current = false; // Sleep to save OBS CPU
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight || 600;
    }

    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleEmoteTrigger = (data) => {
      const emotes = data?.emotes || defaultEmotes;
      spawnParticles(emotes, data?.count || 25, data?.mode || animationMode);
    };

    const handleChatMessage = (msg) => {
      const text = msg?.payload?.message || msg?.text || '';
      const matches = text.match(EMOJI_REGEX);
      if (matches && matches.length > 0) {
        spawnParticles(matches, Math.min(15, matches.length * 3), animationMode);
      }
    };

    const unsubTrigger = eventBus.on('emote_trigger', handleEmoteTrigger);
    const unsubChat = eventBus.on('chat_message', handleChatMessage);

    return () => {
      unsubTrigger();
      unsubChat();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [eventBus, defaultEmotes, animationMode]);

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className="mn-emotewall">
        <canvas ref={canvasRef} className="mn-emotewall-canvas" />
      </div>
    </WidgetContainer>
  );
}

export default EmoteWall;
