/**
 * SponsorBanner.jsx - Rotating Sponsor Banner Carousel & Dynamic QR Widget
 * Feature F27: Rotating sponsor carousel with link display and dynamic QR codes
 */

import React, { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

const DEFAULT_SPONSORS = [
  {
    id: 'sp1',
    title: 'MN Subscriptions',
    subtitle: 'كود خصم: NOUR20',
    logoUrl: '/media/frames/frame_royal_crown.png',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://mn-alerts.vercel.app',
  },
  {
    id: 'sp2',
    title: 'Apex Energy Drink',
    subtitle: 'طاقة لا تنتهي للبث المباشر ⚡',
    logoUrl: '/media/frames/frame_dragon_fire.png',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://example.com/energy',
  },
];

export function SponsorBanner({
  id = 'sponsor-banner',
  type = 'sponsor-banner',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    rotationIntervalSec = 15,
    transitionEffect = '3d-flip',
    showQrCode = true,
    theme = 'glass-card',
    sponsors = DEFAULT_SPONSORS,
  } = config;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (sponsors.length <= 1) return;

    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % sponsors.length);
        setAnimating(false);
      }, 500);
    }, rotationIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [sponsors.length, rotationIntervalSec]);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % sponsors.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + sponsors.length) % sponsors.length);
    const handleSet = (idx) => {
      if (typeof idx === 'number' && idx >= 0 && idx < sponsors.length) {
        setCurrentIndex(idx);
      }
    };

    const unsubNext = eventBus.on('sponsor_next', handleNext);
    const unsubPrev = eventBus.on('sponsor_prev', handlePrev);
    const unsubSet = eventBus.on('sponsor_set', handleSet);

    return () => {
      unsubNext();
      unsubPrev();
      unsubSet();
    };
  }, [eventBus, sponsors.length]);

  const currentSponsor = sponsors[currentIndex] || DEFAULT_SPONSORS[0];

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div
        className={`mn-sponsorbanner theme-${theme} effect-${transitionEffect}`}
        style={{
          transform: animating ? 'rotateX(90deg) scale(0.95)' : 'none',
          opacity: animating ? 0.4 : 1,
          transition: 'all 0.5s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {currentSponsor.logoUrl && (
            <img
              src={currentSponsor.logoUrl}
              alt=""
              style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b' }}>
              {escapeHtml(currentSponsor.title)}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              {escapeHtml(currentSponsor.subtitle)}
            </span>
          </div>
        </div>

        {showQrCode && currentSponsor.qrCodeUrl && (
          <img
            className="mn-sponsorbanner-qr"
            src={currentSponsor.qrCodeUrl}
            alt="QR Code"
          />
        )}
      </div>
    </WidgetContainer>
  );
}

export default SponsorBanner;
