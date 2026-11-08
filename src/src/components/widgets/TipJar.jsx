/**
 * TipJar.jsx - 2D Physics Canvas Tip Jar Widget
 * Feature F19: Physics simulation of falling coins/tokens with realistic collision
 */

import React, { useState, useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer.jsx';

export function TipJar({
  id = 'tip-jar',
  type = 'tip-jar',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    jarShape = 'classic-jar',
    maxCoins = 80,
    gravity = 0.5,
    restitution = 0.4,
    coinColors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#F59E0B',
      emerald: '#10B981',
      diamond: '#38BDF8',
    },
  } = config;

  const canvasRef = useRef(null);
  const coinsRef = useRef([]);
  const animFrameRef = useRef(null);
  const isSleepingRef = useRef(false);

  const [coinCount, setCoinCount] = useState(0);

  // Helper to determine coin tier and color
  const getCoinStyle = (amount = 5) => {
    if (amount >= 100) return { color: coinColors.diamond, radius: 14, label: '💎' };
    if (amount >= 50) return { color: coinColors.emerald, radius: 13, label: '👑' };
    if (amount >= 20) return { color: coinColors.gold, radius: 12, label: '$' };
    if (amount >= 5) return { color: coinColors.silver, radius: 11, label: '$' };
    return { color: coinColors.bronze, radius: 10, label: '¢' };
  };

  const spawnCoin = (amount = 10) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { color, radius, label } = getCoinStyle(amount);
    const width = canvas.width;

    // Spawn at top with random horizontal offset and velocity
    const newCoin = {
      id: Math.random(),
      x: width / 2 + (Math.random() - 0.5) * (width * 0.4),
      y: -radius - Math.random() * 20,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2 + 1,
      radius,
      color,
      label,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.1,
    };

    if (coinsRef.current.length >= maxCoins) {
      coinsRef.current.shift(); // Drop oldest coin
    }
    coinsRef.current.push(newCoin);
    setCoinCount(coinsRef.current.length);

    // Wake up physics engine if sleeping
    if (isSleepingRef.current) {
      isSleepingRef.current = false;
      requestPhysicsTick();
    }
  };

  const requestPhysicsTick = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(physicsTick);
  };

  const physicsTick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const coins = coinsRef.current;

    ctx.clearRect(0, 0, width, height);

    // Draw Jar Outline
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(10, 10, width - 20, height - 20, 24);
    ctx.stroke();
    ctx.restore();

    let totalKineticEnergy = 0;

    // 1. Integrate motion & resolve wall/floor bounds
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      c.vy += gravity;
      c.x += c.vx;
      c.y += c.vy;
      c.rotation += c.vRot;

      // Floor bounce
      const floorY = height - 24 - c.radius;
      if (c.y >= floorY) {
        c.y = floorY;
        c.vy = -c.vy * restitution;
        c.vx *= 0.95; // floor friction
        c.vRot *= 0.95;
      }

      // Left & Right wall bounce
      const leftX = 20 + c.radius;
      const rightX = width - 20 - c.radius;
      if (c.x <= leftX) {
        c.x = leftX;
        c.vx = -c.vx * restitution;
      } else if (c.x >= rightX) {
        c.x = rightX;
        c.vx = -c.vx * restitution;
      }

      totalKineticEnergy += (c.vx * c.vx + c.vy * c.vy);
    }

    // 2. Resolve inter-coin circle collisions (2 passes for stability)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < coins.length; i++) {
        for (let j = i + 1; j < coins.length; j++) {
          const c1 = coins[i];
          const c2 = coins[j];

          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const distSq = dx * dx + dy * dy;
          const minDist = c1.radius + c2.radius;

          if (distSq < minDist * minDist && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;

            // Overlap separation
            const overlap = (minDist - dist) * 0.5;
            c1.x -= nx * overlap;
            c1.y -= ny * overlap;
            c2.x += nx * overlap;
            c2.y += ny * overlap;

            // Elastic velocity impulse
            const kx = c1.vx - c2.vx;
            const ky = c1.vy - c2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2;

            c1.vx -= p * nx * restitution;
            c1.vy -= p * ny * restitution;
            c2.vx += p * nx * restitution;
            c2.vy += p * ny * restitution;
          }
        }
      }
    }

    // 3. Render Coins
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);

      // Coin base circle
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Coin label/emblem
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.label, 0, 0);

      ctx.restore();
    }

    // Check for sleep condition to save CPU
    if (coins.length > 0 && totalKineticEnergy < 0.05 && coins.every((c) => c.y >= height - 40 - c.radius)) {
      isSleepingRef.current = true;
      return; // Stop animation loop until new coin wakes it up
    }

    animFrameRef.current = requestAnimationFrame(physicsTick);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement?.clientWidth || 280;
      canvas.height = canvas.parentElement?.clientHeight || 360;
    }

    requestPhysicsTick();

    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleDonation = (evt) => {
      const amount = evt.payload?.amount || evt.amount || 10;
      const count = Math.min(5, Math.max(1, Math.floor(amount / 20) + 1));
      for (let i = 0; i < count; i++) {
        setTimeout(() => spawnCoin(amount), i * 150);
      }
    };

    const handleTipJarDrop = (payload) => {
      spawnCoin(payload?.amount || 10);
    };

    const unsubDon = eventBus.on('donation', handleDonation);
    const unsubProc = eventBus.on('donation_processed', handleDonation);
    const unsubDrop = eventBus.on('tip_jar_drop', handleTipJarDrop);

    return () => {
      unsubDon();
      unsubProc();
      unsubDrop();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [eventBus]);

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className={`mn-tipjar shape-${jarShape}`} style={{ width: '100%', height: '100%' }}>
        <div className="mn-tipjar-badge">💰 {coinCount} قطعة نقدية</div>
        <canvas ref={canvasRef} className="mn-tipjar-canvas" />
      </div>
    </WidgetContainer>
  );
}

export default TipJar;
