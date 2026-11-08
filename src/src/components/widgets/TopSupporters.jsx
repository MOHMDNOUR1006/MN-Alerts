/**
 * TopSupporters.jsx - Top Supporters Podium Widget
 * Feature F20: Multi-period podium (All-Time, Monthly, Weekly) with framed avatars
 */

import React, { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { AVATAR_FRAMES_MAP } from '../../data/alertsCatalog.js';
import { escapeHtml } from '../../core/utils/sanitizer.js';

const DEFAULT_SUPPORTERS = [
  { id: 'sup_1', name: 'Sultan Al-Otaibi', amount: 520, frameId: 'frame-royal-crown' },
  { id: 'sup_2', name: 'Nour Gamer', amount: 340, frameId: 'frame-dragon-fire' },
  { id: 'sup_3', name: 'Apex Legend', amount: 180, frameId: 'frame-crimson-demon' },
];

export function TopSupporters({
  id = 'top-supporters',
  type = 'top-supporters',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    period = 'monthly',
    displayCount = 3,
    layout = 'podium',
    showAmounts = true,
    showFrames = true,
    currency = 'USD',
  } = config;

  const [supporters, setSupporters] = useState(DEFAULT_SUPPORTERS);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleStreamEvent = (evt) => {
      if (!evt) return;
      const amount = Number(evt.payload?.amount);
      if (isNaN(amount) || amount <= 0) return;

      const senderName = evt.sender?.name || 'Supporter';
      const frameId = evt.sender?.frameId;

      setSupporters((prev) => {
        const existingIdx = prev.findIndex((s) => s.name.toLowerCase() === senderName.toLowerCase());
        let updated;
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            amount: updated[existingIdx].amount + amount,
            frameId: frameId || updated[existingIdx].frameId,
          };
        } else {
          updated = [
            ...prev,
            {
              id: `sup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: senderName,
              amount,
              frameId: frameId || (amount >= 100 ? 'frame-royal-crown' : 'frame-dragon-fire'),
            },
          ];
        }

        // Sort descending by amount
        updated.sort((a, b) => b.amount - a.amount);
        return updated.slice(0, 10);
      });
    };

    const handleLeaderboardUpdate = (list) => {
      if (Array.isArray(list)) {
        setSupporters(list.slice(0, 10));
      }
    };

    const unsubEvt = eventBus.on('stream_event', handleStreamEvent);
    const unsubDon = eventBus.on('donation', handleStreamEvent);
    const unsubLead = eventBus.on('leaderboard_update', handleLeaderboardUpdate);

    return () => {
      unsubEvt();
      unsubDon();
      unsubLead();
    };
  }, [eventBus]);

  const topItems = supporters.slice(0, displayCount);

  // Reorder for podium display: [Rank 2 (Silver), Rank 1 (Gold), Rank 3 (Bronze)]
  const podiumOrder = [];
  if (topItems[1]) podiumOrder.push({ ...topItems[1], rank: 2 });
  if (topItems[0]) podiumOrder.push({ ...topItems[0], rank: 1 });
  if (topItems[2]) podiumOrder.push({ ...topItems[2], rank: 3 });

  const getFrameUrl = (frameId) => {
    if (!frameId || !AVATAR_FRAMES_MAP) return null;
    const f = AVATAR_FRAMES_MAP[frameId] || AVATAR_FRAMES_MAP[String(frameId).replace(/^frame-/, '')];
    return f?.file || null;
  };

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className={`mn-topsupporters layout-${layout} period-${period}`}>
        {podiumOrder.map((sup) => {
          const frameUrl = showFrames ? getFrameUrl(sup.frameId) : null;
          return (
            <div
              key={sup.id || sup.rank}
              className={`mn-topsupporters-podium-slot mn-topsupporters-slot-${sup.rank}`}
            >
              <div className="mn-topsupporters-avatar-wrapper">
                <img
                  className="mn-topsupporters-avatar"
                  src={sup.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sup.name)}`}
                  alt=""
                />
                {frameUrl && (
                  <img
                    className="mn-topsupporters-frame"
                    src={frameUrl}
                    alt=""
                  />
                )}
              </div>

              <div className="mn-topsupporters-pillar">
                <span style={{ fontSize: '12px', opacity: 0.8 }}>#{sup.rank}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, maxWidth: '75px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {escapeHtml(sup.name)}
                </span>
                {showAmounts && (
                  <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                    {sup.amount} {currency}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </WidgetContainer>
  );
}

export default TopSupporters;
