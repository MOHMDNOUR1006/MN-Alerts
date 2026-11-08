/**
 * PollWidget.jsx - Live Stream Poll Widget
 * Feature F23: Live viewer voting display with real-time percentage bars
 */

import React, { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

const DEFAULT_OPTIONS = [
  { id: 'opt_1', label: 'Elden Ring', votes: 14, color: '#F59E0B' },
  { id: 'opt_2', label: 'Cyberpunk 2077', votes: 9, color: '#38BDF8' },
  { id: 'opt_3', label: 'Valorant', votes: 5, color: '#EF4444' },
];

export function PollWidget({
  id = 'polls',
  type = 'polls',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    question = 'ما هي اللعبة التالية في البث؟',
    durationSec = 120,
    theme = 'cyber-poll',
    options = DEFAULT_OPTIONS,
  } = config;

  const [pollOptions, setPollOptions] = useState(options);
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [isActive, setIsActive] = useState(true);

  const totalVotes = pollOptions.reduce((acc, opt) => acc + (opt.votes || 0), 0);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleVote = (voteData) => {
      if (!isActive) return;
      const targetId = voteData.optionId || voteData.id;
      setPollOptions((prev) =>
        prev.map((opt) =>
          opt.id === targetId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
        )
      );
    };

    const handleStart = (pollConfig) => {
      if (pollConfig?.options) setPollOptions(pollConfig.options);
      if (pollConfig?.durationSec) setTimeLeft(pollConfig.durationSec);
      setIsActive(true);
    };

    const handleEnd = () => {
      setIsActive(false);
      setTimeLeft(0);
    };

    const unsubVote = eventBus.on('poll_vote', handleVote);
    const unsubStart = eventBus.on('poll_start', handleStart);
    const unsubEnd = eventBus.on('poll_end', handleEnd);

    return () => {
      unsubVote();
      unsubStart();
      unsubEnd();
    };
  }, [eventBus, isActive]);

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className={`mn-polls theme-${theme}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="mn-polls-question">{escapeHtml(question)}</span>
          <span style={{ fontSize: '12px', color: isActive ? '#2dd4bf' : '#9ca3af', fontWeight: 600 }}>
            {isActive ? `⏱️ ${timeLeft}s` : 'انتهى التصويت'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          {pollOptions.map((opt) => {
            const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            return (
              <div key={opt.id} className="mn-polls-option">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>{escapeHtml(opt.label)}</span>
                  <span style={{ fontWeight: 700 }}>{pct}% ({opt.votes})</span>
                </div>
                <div className="mn-polls-bar-track">
                  <div
                    className="mn-polls-bar-fill"
                    style={{ width: `${pct}%`, background: opt.color || '#38bdf8' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'left', fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
          إجمالي الأصوات: {totalVotes}
        </div>
      </div>
    </WidgetContainer>
  );
}

export default PollWidget;
