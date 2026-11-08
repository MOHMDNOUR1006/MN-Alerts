/**
 * ViewerCounter.jsx - Multi-Platform Concurrent Viewer Counter Widget
 * Feature F30: Multi-platform concurrent viewer tally badge with live pulsing beacon
 */

import React, { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer.jsx';

const PLATFORM_COLORS = {
  twitch: '#9146FF',
  youtube: '#FF0000',
  kick: '#53FC18',
};

const PLATFORM_ICONS = {
  twitch: '🟣',
  youtube: '🔴',
  kick: '🟢',
};

export function ViewerCounter({
  id = 'viewer-counter',
  type = 'viewer-counter',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    platforms = ['twitch', 'youtube', 'kick'],
    showPerPlatform = true,
    showTotal = true,
    pulseBeacon = true,
    counts: initialCounts = { twitch: 1420, youtube: 850, kick: 310 },
  } = config;

  const [counts, setCounts] = useState(initialCounts);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleUpdate = (newCounts) => {
      if (newCounts && typeof newCounts === 'object') {
        setCounts((prev) => ({ ...prev, ...newCounts }));
      }
    };

    const unsub = eventBus.on('viewer_count_update', handleUpdate);
    return () => unsub();
  }, [eventBus]);

  const total = platforms.reduce((acc, p) => acc + (counts[p] || 0), 0);

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className="mn-viewercounter">
        {pulseBeacon && <div className="mn-viewercounter-beacon" />}

        {showTotal && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#9ca3af' }}>المشاهدون:</span>
            <span style={{ color: '#fff', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {total.toLocaleString()}
            </span>
          </div>
        )}

        {showPerPlatform && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '8px' }}>
            {platforms.map((p) => {
              const val = counts[p] || 0;
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px' }}>
                  <span>{PLATFORM_ICONS[p] || '•'}</span>
                  <span style={{ color: PLATFORM_COLORS[p] || '#fff', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {val.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}

export default ViewerCounter;
