/**
 * StreamBoss.jsx - Gamified Stream Boss Battle Widget
 * Feature F25: Gamified boss HP bar damaged by cheers; final blow inherits boss role
 */

import React, { useState, useEffect } from 'react';
import WidgetContainer from './WidgetContainer.jsx';
import { escapeHtml } from '../../core/utils/sanitizer.js';

export function StreamBoss({
  id = 'stream-boss',
  type = 'stream-boss',
  config = {},
  isOverlayMode = false,
  eventBus,
}) {
  const {
    bossName: defaultName = 'الزعيم الأسطوري',
    maxHp = 500,
    damagePerUnit = 10, // 1 USD = 10 HP damage
    theme = 'dark-souls-hp',
    bossAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=boss',
  } = config;

  const [currentBoss, setCurrentBoss] = useState({
    name: defaultName,
    avatar: bossAvatar,
  });
  const [hp, setHp] = useState(maxHp);
  const [delayedHp, setDelayedHp] = useState(maxHp);
  const [isHit, setIsHit] = useState(false);

  useEffect(() => {
    // Delayed HP bar follows after a short duration (fighting game style)
    const timer = setTimeout(() => {
      setDelayedHp(hp);
    }, 400);
    return () => clearTimeout(timer);
  }, [hp]);

  useEffect(() => {
    if (!eventBus || typeof eventBus.on !== 'function') return;

    const applyDamage = (amount, attackerName = 'Challenger', attackerAvatar) => {
      const damage = Math.max(1, amount * damagePerUnit);
      setIsHit(true);
      setTimeout(() => setIsHit(false), 300);

      setHp((prev) => {
        const nextHp = prev - damage;
        if (nextHp <= 0) {
          // Boss Defeated! The final blow claims boss throne
          const newBoss = {
            name: attackerName,
            avatar: attackerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(attackerName)}`,
          };
          setCurrentBoss(newBoss);
          eventBus.emit('boss_defeated', { oldBoss: currentBoss.name, newBoss: attackerName });
          return maxHp; // Reset HP for new boss
        }
        return nextHp;
      });
    };

    const handleStreamEvent = (evt) => {
      if (!evt) return;
      let units = 0;
      if (evt.type === 'donation') units = Number(evt.payload?.amount) || 1;
      else if (evt.type === 'cheer') units = (Number(evt.payload?.amount) || 100) / 100;
      else if (evt.type === 'subscribe') units = 5;
      else if (evt.type === 'raid') units = (Number(evt.payload?.viewers) || 10) / 2;

      if (units > 0) {
        applyDamage(units, evt.sender?.name, evt.sender?.avatarUrl);
      }
    };

    const handleBossDamage = (data) => {
      applyDamage(data?.amount || 5, data?.sender, data?.avatar);
    };

    const handleBossReset = () => {
      setHp(maxHp);
      setDelayedHp(maxHp);
    };

    const unsubEvt = eventBus.on('stream_event', handleStreamEvent);
    const unsubDmg = eventBus.on('boss_damage', handleBossDamage);
    const unsubRes = eventBus.on('boss_reset', handleBossReset);

    return () => {
      unsubEvt();
      unsubDmg();
      unsubRes();
    };
  }, [eventBus, damagePerUnit, maxHp, currentBoss.name]);

  const hpPercent = Math.min(100, Math.max(0, (hp / maxHp) * 100));
  const delayedHpPercent = Math.min(100, Math.max(0, (delayedHp / maxHp) * 100));

  return (
    <WidgetContainer
      id={id}
      type={type}
      config={config}
      isOverlayMode={isOverlayMode}
      eventBus={eventBus}
    >
      <div
        className={`mn-streamboss theme-${theme}`}
        style={{
          transform: isHit ? 'scale(0.97) rotate(0.5deg)' : 'none',
          transition: 'transform 0.1s ease',
        }}
      >
        <img
          className="mn-streamboss-avatar"
          src={currentBoss.avatar}
          alt=""
        />

        <div className="mn-streamboss-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
            <span style={{ color: '#ef4444' }}>👑 {escapeHtml(currentBoss.name)}</span>
            <span style={{ color: '#9ca3af' }}>{hp} / {maxHp} HP</span>
          </div>

          <div className="mn-streamboss-bars">
            <div
              className="mn-streamboss-delayed-bar"
              style={{ width: `${delayedHpPercent}%` }}
            />
            <div
              className="mn-streamboss-hp-bar"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </WidgetContainer>
  );
}

export default StreamBoss;
