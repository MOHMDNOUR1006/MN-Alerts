/**
 * EventList.jsx - Stream Event List Widget
 * Feature F17: Animated feed of recent stream events with tier styling
 */

import React, { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

const EVENT_TYPE_LABELS = {
  follow: 'متابعة جديدة',
  subscribe: 'اشتراك جديد',
  donation: 'تبرع دعم',
  raid: 'غارة دعم',
  cheer: 'تشجيع بتس',
  chat: 'رسالة',
};

const EVENT_TYPE_ICONS = {
  follow: '👤',
  subscribe: '⭐',
  donation: '💰',
  raid: '⚔️',
  cheer: '💎',
  chat: '💬',
};

export function EventList({
  id = 'event-list',
  type = 'event-list',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    maxItems = 5,
    orientation = 'vertical',
    theme = 'cyber-card',
    showAvatars = true,
    showAmounts = true,
    eventTypes = ['follow', 'subscribe', 'donation', 'raid', 'cheer'],
  } = config;

  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleStreamEvent = (evt) => {
      if (!evt || !evt.type) return;
      if (!eventTypes.includes(evt.type)) return;

      const newEvent = {
        id: evt.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: evt.type,
        tier: evt.tier || 'free',
        senderName: evt.sender?.name || 'Supporter',
        avatarUrl: evt.sender?.avatarUrl,
        amount: evt.payload?.amount,
        currency: evt.payload?.currency || 'USD',
        viewers: evt.payload?.viewers,
        months: evt.payload?.months,
        timestamp: evt.timestamp || Date.now(),
      };

      setEvents((prev) => {
        const filtered = prev.filter((e) => e.id !== newEvent.id);
        const updated = [newEvent, ...filtered];
        return updated.slice(0, maxItems);
      });
    };

    const unsub = eventBus.on('stream_event', handleStreamEvent);
    return () => unsub();
  }, [eventBus, maxItems, eventTypes]);

  const renderEventMeta = (evt) => {
    if (evt.type === 'donation' && showAmounts && evt.amount) {
      return `${evt.amount} ${evt.currency}`;
    }
    if (evt.type === 'raid' && evt.viewers) {
      return `${evt.viewers} مشاهد`;
    }
    if (evt.type === 'subscribe' && evt.months) {
      return `${evt.months} شهر`;
    }
    if (evt.type === 'cheer' && evt.amount) {
      return `${evt.amount} بتس`;
    }
    return EVENT_TYPE_LABELS[evt.type] || evt.type;
  };

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className={`mn-eventlist ${orientation} theme-${theme}`}>
        {events.map((evt) => (
          <div
            key={evt.id}
            className={`mn-eventlist-item mn-eventlist-tier-${evt.tier}`}
          >
            {showAvatars && (
              <div className="mn-eventlist-avatar">
                {evt.avatarUrl ? (
                  <img src={evt.avatarUrl} alt="" />
                ) : (
                  <span>{evt.senderName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            )}
            <div className="mn-eventlist-content">
              <span className="mn-eventlist-name">
                <span style={{ marginRight: '6px' }}>{EVENT_TYPE_ICONS[evt.type] || '✨'}</span>
                {escapeHtml(evt.senderName)}
              </span>
              <span className="mn-eventlist-meta">
                {renderEventMeta(evt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </WidgetContainer>
  );
}

export default EventList;
