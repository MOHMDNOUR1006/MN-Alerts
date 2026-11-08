/**
 * CountdownTimer.jsx - Stream Countdown Timer & Subathon Tracker Widget
 * Feature F28: Stream starting / BRB / subathon countdown with sound alarms and pulse effects
 */

import React, { useState, useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function CountdownTimer({
  id = 'countdown-timer',
  type = 'countdown-timer',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    durationSec = 300, // 5 minutes
    timerStyle = 'digital-led',
    label = 'البث سيبدأ بعد',
    subathonMode = false,
    secondsPerSub = 60,
    secondsPerDollar = 30,
    alarmSound = true,
  } = config;

  const [secondsRemaining, setSecondsRemaining] = useState(durationSec);
  const [isRunning, setIsRunning] = useState(true);
  const audioCtxRef = useRef(null);

  const playAlarm = () => {
    if (!alarmSound) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        const now = audioCtxRef.current.currentTime;
        for (let i = 0; i < 3; i++) {
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now + i * 0.25);
          gain.gain.setValueAtTime(0.2, now + i * 0.25);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.18);
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          osc.start(now + i * 0.25);
          osc.stop(now + i * 0.25 + 0.18);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          playAlarm();
          if (eventBus && typeof eventBus.emit === 'function') {
            eventBus.emit('timer_completed', { id });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, alarmSound, id, eventBus]);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleStart = () => setIsRunning(true);
    const handlePause = () => setIsRunning(false);
    const handleReset = (sec) => {
      setSecondsRemaining(typeof sec === 'number' ? sec : durationSec);
      setIsRunning(true);
    };
    const handleAddSeconds = (sec) => {
      if (typeof sec === 'number') {
        setSecondsRemaining((prev) => prev + sec);
      }
    };

    const handleStreamEvent = (evt) => {
      if (!subathonMode || !evt) return;
      let addedSec = 0;
      if (evt.type === 'subscribe') {
        const count = Number(evt.payload?.amount) || 1;
        addedSec = count * secondsPerSub;
      } else if (evt.type === 'donation') {
        const dollars = Number(evt.payload?.amount) || 0;
        addedSec = Math.floor(dollars * secondsPerDollar);
      }

      if (addedSec > 0) {
        setSecondsRemaining((prev) => prev + addedSec);
      }
    };

    const unsubStart = eventBus.on('timer_start', handleStart);
    const unsubPause = eventBus.on('timer_pause', handlePause);
    const unsubReset = eventBus.on('timer_reset', handleReset);
    const unsubAdd = eventBus.on('timer_add_seconds', handleAddSeconds);
    const unsubEvt = eventBus.on('stream_event', handleStreamEvent);

    return () => {
      unsubStart();
      unsubPause();
      unsubReset();
      unsubAdd();
      unsubEvt();
    };
  }, [eventBus, durationSec, subathonMode, secondsPerSub, secondsPerDollar]);

  const formatTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const isUrgent = secondsRemaining < 60 && secondsRemaining > 0;

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className={`mn-countdowntimer style-${timerStyle} ${isUrgent ? 'mn-countdowntimer-urgent' : ''}`}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af', marginBottom: '4px' }}>
          {escapeHtml(label)} {subathonMode && '🔥 (Subathon)'}
        </span>
        <div className="mn-countdowntimer-digits">
          {formatTime(secondsRemaining)}
        </div>
      </div>
    </WidgetContainer>
  );
}

export default CountdownTimer;
