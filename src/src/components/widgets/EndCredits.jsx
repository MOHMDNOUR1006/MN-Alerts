/**
 * EndCredits.jsx - Cinematic End Credits Widget
 * Feature F21: Cinematic scrolling credits roll honoring top contributors, subs, and followers
 */

import React, { useState, useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

const DEFAULT_SECTIONS = [
  { title: 'كبار الداعمين', items: ['Mohmad Nour', 'Sultan Streamer', 'Apex Legend'] },
  { title: 'مشتركو القناة', items: ['GamerPro', 'NightOwl', 'SubHero', 'Phoenix'] },
  { title: 'طاقم الإشراف', items: ['ModMaster', 'ShieldGuardian', 'Sentinel'] },
];

export function EndCredits({
  id = 'end-credits',
  type = 'end-credits',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    scrollSpeed = 45, // pixels per second
    theme = 'hollywood-gold',
    autoRestart = true,
    leadTitle = 'شكر خاص لجميع الداعمين',
    closingQuote = 'نراكم في البث القادم! ❤️',
    sections = DEFAULT_SECTIONS,
  } = config;

  const [scrollY, setScrollY] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    let currentY = containerRef.current?.clientHeight || 400;
    setScrollY(currentY);

    const tick = (time) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!isPaused) {
        currentY -= scrollSpeed * dt;
        const totalHeight = contentRef.current?.clientHeight || 600;

        if (currentY < -totalHeight) {
          if (autoRestart) {
            currentY = containerRef.current?.clientHeight || 400;
          } else {
            setScrollY(-totalHeight);
            return;
          }
        }
        setScrollY(currentY);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    if (eventBus && typeof eventBus.on === 'function') {
      const handleStart = () => setIsPaused(false);
      const handlePause = () => setIsPaused(true);
      const handleReset = () => {
        currentY = containerRef.current?.clientHeight || 400;
        setScrollY(currentY);
        setIsPaused(false);
      };

      const unsubStart = eventBus.on('credits_start', handleStart);
      const unsubPause = eventBus.on('credits_pause', handlePause);
      const unsubReset = eventBus.on('credits_reset', handleReset);

      return () => {
        unsubStart();
        unsubPause();
        unsubReset();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scrollSpeed, autoRestart, isPaused, eventBus]);

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div ref={containerRef} className={`mn-endcredits theme-${theme}`}>
        <div
          ref={contentRef}
          className="mn-endcredits-scroll"
          style={{ transform: `translateY(${scrollY}px)` }}
        >
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginBottom: '20px' }}>
            {escapeHtml(leadTitle)}
          </h2>

          {sections.map((sec, idx) => (
            <div key={idx} style={{ marginBottom: '24px' }}>
              <div className="mn-endcredits-section-title">{escapeHtml(sec.title)}</div>
              {sec.items.map((item, i) => (
                <div key={i} className="mn-endcredits-item">
                  {escapeHtml(item)}
                </div>
              ))}
            </div>
          ))}

          <div style={{ marginTop: '30px', fontSize: '18px', fontStyle: 'italic', color: '#2dd4bf' }}>
            {escapeHtml(closingQuote)}
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
}

export default EndCredits;
