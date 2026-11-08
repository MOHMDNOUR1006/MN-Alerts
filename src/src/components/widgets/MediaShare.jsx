/**
 * MediaShare.jsx - Media Share Video Player Widget
 * Feature F22: Moderated video/audio overlay player with skip/pause/volume controls
 */

import React, { useState, useEffect, useRef } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function MediaShare({
  id = 'media-share',
  type = 'media-share',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    maxDurationSec = 60,
    autoPlay = true,
    volume = 0.75,
    allowSkip = true,
    frameBorder = 'neon-cyan',
    showSenderTag = true,
  } = config;

  const [queue, setQueue] = useState([]);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume, currentMedia]);

  useEffect(() => {
    if (!currentMedia && queue.length > 0) {
      setCurrentMedia(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [currentMedia, queue]);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const handleEnqueue = (media) => {
      if (!media || !media.url) return;
      const item = {
        id: media.id || `ms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url: media.url,
        title: media.title || 'طلب وسائط',
        sender: media.sender?.name || media.sender || 'Viewer',
        duration: Math.min(media.duration || maxDurationSec, maxDurationSec),
      };

      setQueue((prev) => [...prev, item]);
    };

    const handleSkip = () => {
      setCurrentMedia(null);
      setProgress(0);
    };

    const handlePause = () => {
      if (videoRef.current) videoRef.current.pause();
    };

    const handleResume = () => {
      if (videoRef.current) videoRef.current.play().catch(() => {});
    };

    const unsubEnq = eventBus.on('media_share_enqueue', handleEnqueue);
    const unsubSkip = eventBus.on('media_share_skip', handleSkip);
    const unsubPause = eventBus.on('media_share_pause', handlePause);
    const unsubResume = eventBus.on('media_share_resume', handleResume);

    return () => {
      unsubEnq();
      unsubSkip();
      unsubPause();
      unsubResume();
    };
  }, [eventBus, maxDurationSec]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 1;
      setProgress(Math.min(100, (cur / dur) * 100));

      if (cur >= maxDurationSec) {
        setCurrentMedia(null);
        setProgress(0);
      }
    }
  };

  const handleEnded = () => {
    setCurrentMedia(null);
    setProgress(0);
  };

  if (!currentMedia) {
    if (isOverlayMode) return null; // Invisible when idle in OBS
    return (
      <WidgetContainer id={id} type={type} config={config} isOverlayMode={isOverlayMode} eventBus={eventBus}>
        <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', border: '1px dashed #374151', borderRadius: '12px' }}>
          🎬 Media Share: قائمة الانتظار فارغة
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div className={`mn-mediashare border-${frameBorder}`}>
        <video
          ref={videoRef}
          className="mn-mediashare-video"
          src={currentMedia.url}
          autoPlay={autoPlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />

        <div className="mn-mediashare-banner">
          <div>
            <span style={{ fontWeight: 700 }}>{escapeHtml(currentMedia.title)}</span>
            {showSenderTag && (
              <span style={{ marginLeft: '8px', color: '#2dd4bf' }}>
                • طلب بواسطة: {escapeHtml(currentMedia.sender)}
              </span>
            )}
          </div>
          {allowSkip && !isOverlayMode && (
            <button
              onClick={() => { setCurrentMedia(null); setProgress(0); }}
              style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px' }}
            >
              تخطي
            </button>
          )}
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', background: 'rgba(255,255,255,0.2)' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#2dd4bf', transition: 'width 0.2s linear' }} />
        </div>
      </div>
    </WidgetContainer>
  );
}

export default MediaShare;
