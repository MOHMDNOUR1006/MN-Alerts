/**
 * SpinWheel.jsx - Interactive Prize Wheel Widget
 * Feature F24: Interactive rotating prize wheel with physics deceleration and audio ticks
 */

import React, { useState, useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer.jsx';

const DEFAULT_SLICES = [
  { id: 's1', label: '1000 عملة', color: '#F59E0B' },
  { id: 's2', label: 'VIP رول', color: '#10B981' },
  { id: 's3', label: 'تحدي الحار', color: '#EF4444' },
  { id: 's4', label: 'إهداء اشتراك', color: '#8B5CF6' },
  { id: 's5', label: 'إعادة التدوير', color: '#38BDF8' },
  { id: 's6', label: 'حظ أوفر', color: '#6B7280' },
];

export function SpinWheel({
  id = 'spin-wheel',
  type = 'spin-wheel',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    soundTicks = true,
    theme = 'carnival-gold',
    slices = DEFAULT_SLICES,
  } = config;

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);

  const angleRef = useRef(0);
  const omegaRef = useRef(0); // angular velocity
  const isSpinningRef = useRef(false);
  const lastSliceIdxRef = useRef(-1);

  const [winner, setWinner] = useState(null);

  const playTickSound = () => {
    if (!soundTicks) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtxRef.current.currentTime + 0.04);
        gain.gain.setValueAtTime(0.15, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.04);
      }
    } catch {
      // AudioContext autoplay restrictions safe catch
    }
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 16;
    const numSlices = slices.length;
    const arcSize = (Math.PI * 2) / numSlices;

    ctx.clearRect(0, 0, width, height);

    // Outer rim glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b2e';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
    ctx.restore();

    // Slices
    for (let i = 0; i < numSlices; i++) {
      const sliceAngle = angleRef.current + i * arcSize;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, sliceAngle, sliceAngle + arcSize);
      ctx.closePath();
      ctx.fillStyle = slices[i].color || '#38BDF8';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Slice label
      ctx.translate(centerX, centerY);
      ctx.rotate(sliceAngle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Tajawal, sans-serif';
      ctx.fillText(slices[i].label, radius - 20, 5);
      ctx.restore();
    }

    // Center hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
    ctx.restore();
  };

  const spinTick = () => {
    angleRef.current += omegaRef.current;
    omegaRef.current *= 0.985; // quadratic friction deceleration

    const numSlices = slices.length;
    const arcSize = (Math.PI * 2) / numSlices;
    // Current top pointer slice index
    // Top pointer is at -Math.PI / 2
    const normalizedAngle = (Math.PI * 2 - (angleRef.current % (Math.PI * 2)) + (3 * Math.PI / 2)) % (Math.PI * 2);
    const currentSliceIdx = Math.floor(normalizedAngle / arcSize) % numSlices;

    if (currentSliceIdx !== lastSliceIdxRef.current) {
      lastSliceIdxRef.current = currentSliceIdx;
      playTickSound();
    }

    drawWheel();

    if (omegaRef.current > 0.002) {
      animFrameRef.current = requestAnimationFrame(spinTick);
    } else {
      isSpinningRef.current = false;
      omegaRef.current = 0;
      const winningSlice = slices[currentSliceIdx];
      setWinner(winningSlice);
      if (eventBus && typeof eventBus.emit === 'function') {
        eventBus.emit('wheel_win', winningSlice);
      }
    }
  };

  const startSpin = (force = 0.35) => {
    if (isSpinningRef.current) return;
    setWinner(null);
    isSpinningRef.current = true;
    omegaRef.current = force + Math.random() * 0.2;
    animFrameRef.current = requestAnimationFrame(spinTick);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 320;
      canvas.height = 320;
      drawWheel();
    }

    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleSpin = (data) => startSpin(data?.force || 0.35);
    const handleReset = () => {
      omegaRef.current = 0;
      isSpinningRef.current = false;
      setWinner(null);
      drawWheel();
    };

    const unsubSpin = eventBus.on('wheel_spin', handleSpin);
    const unsubReset = eventBus.on('wheel_reset', handleReset);

    return () => {
      unsubSpin();
      unsubReset();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [eventBus, slices]);

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className={`mn-spinwheel theme-${theme}`}>
        <div className="mn-spinwheel-pointer" />
        <canvas
          ref={canvasRef}
          className="mn-spinwheel-canvas"
          onClick={() => !isOverlayMode && startSpin()}
          style={{ cursor: isOverlayMode ? 'default' : 'pointer' }}
        />
        {winner && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              background: 'rgba(15, 12, 22, 0.9)',
              border: '1px solid #f59e0b',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.5)',
            }}
          >
            🎉 الفائز: {winner.label}
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}

export default SpinWheel;
