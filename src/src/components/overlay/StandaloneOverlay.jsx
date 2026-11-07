import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AlertOverlay, { GlobalSvgFilters } from '../AlertOverlay';
import { ALERTS_CATALOG } from '../../data/alertsCatalog';
import { soundEngine } from '../../services/soundEngine';
import { listenObsBroadcast } from '../../services/obsBundleExporter';
import { verifyToken } from '../../services/tokenService';
import { PriorityAlertQueue } from '../../core/queue/PriorityAlertQueue';
import { normalizeStreamEvent } from '../../core/queue/EventNormalizer';
import './StandaloneOverlay.css';

export default function StandaloneOverlay() {
  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const token = urlParams.get('token');
  const sceneId = urlParams.get('scene') || 'scene_default';
  const packParam = urlParams.get('pack');

  // Cryptographic HMAC token authentication gate
  const tokenStatus = useMemo(() => {
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '');

    // Allow dev preview on localhost if no token is provided
    if (!token && isLocalhost) {
      return { valid: true, sceneId, isDevBypass: true };
    }
    if (!token) {
      return { valid: false, reason: 'MISSING_TOKEN' };
    }
    return verifyToken(token);
  }, [token, sceneId]);

  const [liveAlert, setLiveAlert] = useState(null);
  const queueRef = useRef(null);

  if (!queueRef.current) {
    queueRef.current = new PriorityAlertQueue({ maxCapacity: 100, dedupWindowMs: 5000 });
  }

  const queue = queueRef.current;

  // Handle alert trigger from priority queue
  const handleAlertTrigger = useCallback((event) => {
    const targetPack =
      event.pack ||
      ALERTS_CATALOG.find((p) => p.id === event.packId || p.id === event.payload?.packId) ||
      (packParam ? ALERTS_CATALOG.find((p) => p.id === packParam) : null) ||
      ALERTS_CATALOG[0];

    const customOverrides = {
      username: event.sender?.name || event.customOverrides?.username,
      amount: event.payload?.amount !== undefined ? `${event.payload.amount} ${event.payload?.currency || 'USD'}` : event.customOverrides?.amount,
      subtext: event.payload?.tierName || event.customOverrides?.subtext || targetPack.headline,
      message: event.payload?.message || event.customOverrides?.message,
      soundPreset: event.customOverrides?.soundPreset || targetPack.soundPreset,
      avatarFrame: event.sender?.frameId || event.customOverrides?.avatarFrame || targetPack.avatarFrameId,
      choreography: event.customOverrides?.choreography || targetPack.choreographyId,
      ...(event.customOverrides || {}),
    };

    setLiveAlert({
      pack: targetPack,
      customData: customOverrides,
      ts: Date.now(),
      eventId: event.id,
    });
  }, [packParam]);

  // Handle critical interruption preemption
  const handleAlertPreempt = useCallback((data) => {
    // Instantly halt audio engine to eliminate sound overlap
    try {
      soundEngine.stopAll();
    } catch (_) {}

    // Clear active alert immediately so the preempting alert renders with 0ms delay
    setLiveAlert(null);
  }, []);

  useEffect(() => {
    if (!tokenStatus.valid) return;

    queue.on('alert_trigger', handleAlertTrigger);
    queue.on('alert_preempt', handleAlertPreempt);

    // Initial alert if specified in URL query
    if (packParam) {
      const initialPack = ALERTS_CATALOG.find((p) => p.id === packParam);
      if (initialPack) {
        const urlOverrides = {
          username: urlParams.get('username') || undefined,
          amount: urlParams.get('amount') || undefined,
          subtext: urlParams.get('subtext') || undefined,
          message: urlParams.get('message') || undefined,
          soundPreset: urlParams.get('sound') || undefined,
          avatarFrame: urlParams.get('frame') || undefined,
          choreography: urlParams.get('choreo') || undefined,
        };
        queue.enqueue(
          normalizeStreamEvent({
            id: `init_${Date.now()}`,
            type: initialPack.category || 'donation',
            priority: 2,
            sender: { name: urlOverrides.username || initialPack.defaultSupporter },
            payload: {
              amount: urlOverrides.amount ? parseFloat(urlOverrides.amount) : undefined,
              message: urlOverrides.message,
            },
            customOverrides: urlOverrides,
            pack: initialPack,
          })
        );
      }
    }

    // Subscribe to cross-tab / cross-window live broadcasts
    const unsubBroadcast = listenObsBroadcast((payload) => {
      const targetPack =
        ALERTS_CATALOG.find((p) => p.id === payload.packId) ||
        payload.pack ||
        ALERTS_CATALOG[0];

      const streamEvent = normalizeStreamEvent({
        id: `bcast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: targetPack.category || 'donation',
        priority: payload.priority !== undefined ? payload.priority : 2,
        sender: { name: payload.customOverrides?.username || targetPack.defaultSupporter },
        payload: {
          amount: payload.customOverrides?.amount ? parseFloat(payload.customOverrides.amount) : undefined,
          message: payload.customOverrides?.message,
        },
        customOverrides: payload.customOverrides,
        pack: targetPack,
      });

      queue.enqueue(streamEvent);
    });

    // Expose window.MNAlerts for OBS Browser Source JavaScript execution
    window.MNAlerts = {
      trigger: (packIdOrData, customData = {}) => {
        let pack = ALERTS_CATALOG[0];
        let overrides = {};
        let priority = 2;

        if (typeof packIdOrData === 'string') {
          pack = ALERTS_CATALOG.find((p) => p.id === packIdOrData) || ALERTS_CATALOG[0];
          overrides = customData;
          if (customData.priority !== undefined) priority = customData.priority;
        } else if (typeof packIdOrData === 'object' && packIdOrData !== null) {
          pack = packIdOrData.pack || (packIdOrData.packId ? ALERTS_CATALOG.find((p) => p.id === packIdOrData.packId) : null) || ALERTS_CATALOG[0];
          overrides = packIdOrData.customOverrides || packIdOrData;
          if (packIdOrData.priority !== undefined) priority = packIdOrData.priority;
        }

        const streamEvent = normalizeStreamEvent({
          id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: pack.category || 'donation',
          priority,
          sender: { name: overrides.username || pack.defaultSupporter },
          payload: {
            amount: overrides.amount ? parseFloat(overrides.amount) : undefined,
            message: overrides.message,
          },
          customOverrides: overrides,
          pack,
        });

        queue.enqueue(streamEvent);
      },
      skip: () => {
        soundEngine.stopAll();
        setLiveAlert(null);
        queue.skip();
      },
      clear: () => {
        soundEngine.stopAll();
        setLiveAlert(null);
        queue.clear();
      },
      pause: () => queue.pause(),
      resume: () => queue.resume(),
      setVolume: (v) => soundEngine.setVolume(v),
      setSound: (preset, url) => soundEngine.setCustomSound(preset, url),
    };

    return () => {
      unsubBroadcast();
      queue.removeAllListeners();
    };
  }, [tokenStatus.valid, packParam, urlParams, handleAlertTrigger, handleAlertPreempt, queue]);

  // Security gate: Render subtle badge and refuse alert execution if token is unauthorized
  if (!tokenStatus.valid) {
    return (
      <div className="mn-standalone-overlay-root">
        <div className="mn-obs-unauthorized-banner">
          <div className="mn-obs-unauthorized-badge">
            <span className="unauth-icon">🔒</span>
            <span className="unauth-title">MN ALERTS — OBS OVERLAY UNAUTHORIZED</span>
          </div>
          <p className="unauth-desc">
            {tokenStatus.reason === 'TOKEN_EXPIRED'
              ? 'رمز الوصول منتهي الصلاحية — يرجى تجديد رابط المشهد من لوحة التحكم (Token Expired)'
              : 'الرابط غير مصرح به أو الرمز غير صالح — يرجى نسخ الرابط المشفر من لوحة التحكم (Invalid Token)'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mn-standalone-overlay-root">
      <GlobalSvgFilters />
      <AlertOverlay
        activeAlert={liveAlert}
        isObsWidget={true}
        onComplete={() => {
          setLiveAlert(null);
          queue.completeActive();
        }}
      />
    </div>
  );
}
