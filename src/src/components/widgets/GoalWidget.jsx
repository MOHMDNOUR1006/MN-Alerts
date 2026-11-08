/**
 * GoalWidget.jsx - Stream Goals & Progress Bar Widget
 * Feature F18: Milestone tracker with glowing animated progress fill
 */

import React, { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function GoalWidget({
  id = 'goals-progress',
  type = 'goals-progress',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    goalType = 'donation',
    title = 'هدف البث الجديد',
    targetAmount = 1000,
    currentAmount: initialAmount = 450,
    currency = 'USD',
    barStyle = 'glowing-gradient',
    showPercentage = true,
    celebrationOnReach = true,
  } = config;

  const [current, setCurrent] = useState(initialAmount);
  const [target, setTarget] = useState(targetAmount);
  const [goalTitle, setGoalTitle] = useState(title);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleStreamEvent = (evt) => {
      if (!evt) return;

      let increment = 0;
      if (goalType === 'donation' && (evt.type === 'donation' || evt.payload?.amount > 0)) {
        increment = Number(evt.payload?.amount) || 0;
      } else if (goalType === 'subscriber' && evt.type === 'subscribe') {
        increment = Number(evt.payload?.amount) || 1; // gift count or 1
      } else if (goalType === 'follower' && evt.type === 'follow') {
        increment = 1;
      } else if (goalType === 'cheer' && evt.type === 'cheer') {
        increment = Number(evt.payload?.amount) || 0;
      }

      if (increment > 0) {
        setCurrent((prev) => {
          const nextVal = prev + increment;
          if (celebrationOnReach && nextVal >= target && prev < target) {
            setCelebrating(true);
            eventBus.emit('goal_reached', { title: goalTitle, target, current: nextVal });
            setTimeout(() => setCelebrating(false), 8000);
          }
          return nextVal;
        });
      }
    };

    const handleGoalUpdate = (update) => {
      if (!update) return;
      if (typeof update.targetAmount === 'number') setTarget(update.targetAmount);
      if (typeof update.currentAmount === 'number') setCurrent(update.currentAmount);
      if (typeof update.title === 'string') setGoalTitle(update.title);
    };

    const unsubEvt = eventBus.on('stream_event', handleStreamEvent);
    const unsubDon = eventBus.on('donation', handleStreamEvent);
    const unsubUpd = eventBus.on('goal_update', handleGoalUpdate);

    return () => {
      unsubEvt();
      unsubDon();
      unsubUpd();
    };
  }, [eventBus, goalType, target, goalTitle, celebrationOnReach]);

  const percentage = Math.min(100, Math.max(0, Math.round((current / (target || 1)) * 100)));

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className={`mn-goals bar-${barStyle} ${celebrating ? 'mn-goals-celebration' : ''}`}>
        <div className="mn-goals-header">
          <span className="mn-goals-title">{escapeHtml(goalTitle)}</span>
          <span className="mn-goals-values">
            {current} / {target} {currency} {showPercentage && `(${percentage}%)`}
          </span>
        </div>

        <div className="mn-goals-bar-bg">
          <div
            className="mn-goals-bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </WidgetContainer>
  );
}

export default GoalWidget;
