/**
 * ChatBox.jsx - Stream Chat Box Widget
 * Feature F16: Real-time chat feed with badge parsing, emote support, and auto-fade
 */

import React, { useState, useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function ChatBox({
  id = 'chat-box',
  type = 'chat-box',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    theme = 'clean-dark',
    maxMessages = 25,
    fadeAfterSec = 15,
    showBadges = true,
    showAvatars = false,
    fontSize = 16,
    textShadow = true,
    direction = 'bottom-to-top',
  } = config;

  const [messages, setMessages] = useState([]);
  const messageTimers = useRef(new Map());

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleMessage = (payload) => {
      const msgId = payload.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newMessage = {
        id: msgId,
        sender: payload.sender?.name || payload.sender || payload.username || 'Viewer',
        text: payload.payload?.message || payload.message || payload.text || '',
        badges: payload.sender?.badges || payload.badges || [],
        color: payload.sender?.color || payload.color || '#38BDF8',
        timestamp: payload.timestamp || Date.now(),
        fading: false,
      };

      setMessages((prev) => {
        const updated = [...prev, newMessage];
        if (updated.length > maxMessages) {
          return updated.slice(updated.length - maxMessages);
        }
        return updated;
      });

      // Auto fade-out timer
      if (fadeAfterSec > 0) {
        const timer = setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, fading: true } : m))
          );
          // Remove from state after fade animation completes
          setTimeout(() => {
            setMessages((prev) => prev.filter((m) => m.id !== msgId));
          }, 450);
        }, fadeAfterSec * 1000);

        messageTimers.current.set(msgId, timer);
      }
    };

    const handleStreamEvent = (evt) => {
      if (evt && evt.type === 'chat') {
        handleMessage(evt);
      }
    };

    const handleClear = () => {
      setMessages([]);
      messageTimers.current.forEach((t) => clearTimeout(t));
      messageTimers.current.clear();
    };

    const handleDelete = (targetId) => {
      setMessages((prev) => prev.filter((m) => m.id !== targetId));
    };

    const unsubMsg = eventBus.on('chat_message', handleMessage);
    const unsubEvt = eventBus.on('stream_event', handleStreamEvent);
    const unsubClear = eventBus.on('chat_clear', handleClear);
    const unsubDel = eventBus.on('chat_delete', handleDelete);

    return () => {
      unsubMsg();
      unsubEvt();
      unsubClear();
      unsubDel();
      messageTimers.current.forEach((t) => clearTimeout(t));
      messageTimers.current.clear();
    };
  }, [eventBus, maxMessages, fadeAfterSec]);

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div
        className={`mn-chatbox theme-${theme}`}
        style={{ fontSize: `${fontSize}px`, textShadow: textShadow ? '0 1px 3px rgba(0,0,0,0.8)' : 'none' }}
      >
        <div className={`mn-chatbox-messages direction-${direction}`}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mn-chatbox-item ${msg.fading ? 'fading' : ''}`}
            >
              {showAvatars && (
                <span className="mn-chatbox-avatar" style={{ marginRight: '4px', fontSize: '12px' }}>
                  👤
                </span>
              )}
              {showBadges && msg.badges && msg.badges.length > 0 && (
                <span className="mn-chatbox-badges">
                  {msg.badges.map((b, idx) => (
                    <span
                      key={idx}
                      className={`mn-chatbox-badge mn-chatbox-badge-${String(b).toLowerCase()}`}
                    >
                      {String(b)}
                    </span>
                  ))}
                </span>
              )}
              <span
                className="mn-chatbox-sender"
                style={{ color: msg.color }}
              >
                {escapeHtml(msg.sender)}:
              </span>
              <span className="mn-chatbox-text">
                {escapeHtml(msg.text)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </WidgetContainer>
  );
}

export default ChatBox;
