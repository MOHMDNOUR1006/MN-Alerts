/**
 * StreamLabels.jsx - Modular Stream Metric Labels Widget
 * Feature F29: Modular single-metric indicators (latest follower, top donor, uptime)
 */

import React, { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

const LABEL_TITLES = {
  latest_follower: 'آخر متابع',
  latest_sub: 'آخر مشترك',
  latest_donation: 'آخر داعم',
  top_donor: 'أكبر داعم',
  uptime: 'مدة البث',
  sub_goal: 'هدف الاشتراكات',
};

const LABEL_ICONS = {
  latest_follower: '👤',
  latest_sub: '⭐',
  latest_donation: '💰',
  top_donor: '👑',
  uptime: '⏱️',
  sub_goal: '🎯',
};

export function StreamLabels({
  id = 'stream-labels',
  type = 'stream-labels',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    labelType = 'latest_follower',
    template = '{label}: {value}',
    theme = 'ticker-pill',
  } = config;

  const [value, setValue] = useState('لا يوجد بيانات بعد');
  const [startTime] = useState(Date.now());
  const [uptimeStr, setUptimeStr] = useState('00:00:00');

  useEffect(() => {
    if (labelType !== 'uptime') return;

    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      const hrs = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
      const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
      const secs = String(elapsedSec % 60).padStart(2, '0');
      setUptimeStr(`${hrs}:${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [labelType, startTime]);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleStreamEvent = (evt) => {
      if (!evt) return;

      if (labelType === 'latest_follower' && evt.type === 'follow') {
        setValue(evt.sender?.name || 'متابع');
      } else if (labelType === 'latest_sub' && evt.type === 'subscribe') {
        setValue(evt.sender?.name || 'مشترك');
      } else if (labelType === 'latest_donation' && (evt.type === 'donation' || evt.payload?.amount > 0)) {
        setValue(`${evt.sender?.name || 'داعم'} (${evt.payload?.amount || 0} ${evt.payload?.currency || 'USD'})`);
      }
    };

    const handleCustomUpdate = (data) => {
      if (data?.labelType === labelType && data?.value) {
        setValue(data.value);
      }
    };

    const unsubEvt = eventBus.on('stream_event', handleStreamEvent);
    const unsubUpd = eventBus.on('stream_labels_update', handleCustomUpdate);

    return () => {
      unsubEvt();
      unsubUpd();
    };
  }, [eventBus, labelType]);

  const displayLabel = LABEL_TITLES[labelType] || labelType;
  const displayVal = labelType === 'uptime' ? uptimeStr : value;
  const textOutput = template
    .replace('{label}', displayLabel)
    .replace('{value}', displayVal);

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className={`mn-streamlabels theme-${theme}`}>
        <span className="mn-streamlabels-icon">
          {LABEL_ICONS[labelType] || '✨'}
        </span>
        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {escapeHtml(textOutput)}
        </span>
      </div>
    </WidgetContainer>
  );
}

export default StreamLabels;
