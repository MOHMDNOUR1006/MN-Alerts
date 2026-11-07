import React from 'react';

/**
 * Unified GPU-Composited Circular Conic Ring Avatar Component
 * Matches the Google circular ring reference (`pr_32px_asknjuyerc.png`) across all MN Websites:
 * - Free: Dark Slate-Gray ring
 * - Plus: Luminous Light Sky-Blue ring
 * - Pro: Turquoise Top-Right Highlight Arc (0deg..85deg) -> Light Navy Body
 * - Ultra: Lavender-Violet Top-Right Highlight Arc (0deg..85deg) -> Deep Royal Purple Body
 * - Developer / Founder: Quantum Founder Supernova Prismatic Ring + 👑 DEV badge
 */
export const initialsAvatar = (name) => {
  const clean = String(name || '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const text = (parts.length > 1 ? parts[0][0] + parts[1][0] : (clean.slice(0, 1) || '?')).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#292524"/><text x="32" y="32" dy=".35em" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#e2e8f0">${text.replace(/[<>&]/g, '')}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

export default function AvatarRing({
  photoURL = '',
  displayName = '',
  name = 'User',
  plan = '',
  tier = 'free',
  size = 38,
  showBadge = true,
}) {
  const effectiveName = displayName || name || 'User';
  const normalizedPlan = String(plan || tier || 'free').toLowerCase();
  const pad = size >= 52 ? 4 : 3;

  const getRingStyle = (p) => {
    switch (p) {
      case 'plus':
        return {
          background:
            'conic-gradient(from 0deg, #7dd3fc 0deg, #38bdf8 90deg, #0284c7 200deg, #38bdf8 300deg, #7dd3fc 360deg)',
          boxShadow: '0 0 14px rgba(56, 189, 248, 0.45)',
        };
      case 'pro':
        return {
          background:
            'conic-gradient(from 0deg, #2dd4bf 0deg, #5eead4 35deg, #06b6d4 85deg, #2563eb 150deg, #1e40af 235deg, #1e3a8a 305deg, #0284c7 340deg, #2dd4bf 360deg)',
          boxShadow: '0 0 18px rgba(45, 212, 191, 0.45), 0 0 28px rgba(37, 99, 235, 0.35)',
        };
      case 'ultra':
        return {
          background:
            'conic-gradient(from 0deg, #d8b4fe 0deg, #f3e8ff 32deg, #a9a8ff 78deg, #c084fc 125deg, #9333ea 185deg, #6b21a8 255deg, #581c87 310deg, #7e22ce 342deg, #d8b4fe 360deg)',
          boxShadow: '0 0 22px rgba(169, 168, 255, 0.52), 0 0 34px rgba(147, 51, 234, 0.42)',
        };
      case 'developer':
      case 'founder':
        return {
          background:
            'conic-gradient(from 0deg, #fde047 0deg, #f59e0b 55deg, #ec4899 115deg, #8b5cf6 180deg, #06b6d4 245deg, #10b981 305deg, #fde047 360deg)',
          boxShadow: '0 0 24px rgba(251, 191, 36, 0.72), 0 0 40px rgba(139, 92, 246, 0.5)',
        };
      default:
        return {
          background: 'conic-gradient(from 0deg, #475569, #334155, #64748b, #475569)',
          boxShadow: '0 0 8px rgba(71, 85, 105, 0.3)',
        };
    }
  };

  const fallbackSrc = initialsAvatar(effectiveName);
  const src = photoURL || fallbackSrc;

  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        padding: `${pad}px`,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...getRingStyle(normalizedPlan),
      }}
      title={`MN Tier: ${normalizedPlan.toUpperCase()}`}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: '#141110',
          padding: '1.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={src}
          alt={displayName}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackSrc;
          }}
        />
      </div>

      {showBadge && normalizedPlan !== 'free' && (
        <span
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0 5px',
            borderRadius: '999px',
            fontSize: '8px',
            fontWeight: 900,
            letterSpacing: '0.4px',
            whiteSpace: 'nowrap',
            border: '1px solid #141110',
            background:
              normalizedPlan === 'developer' || normalizedPlan === 'founder'
                ? 'linear-gradient(135deg, #fde047, #f59e0b)'
                : normalizedPlan === 'ultra'
                ? 'linear-gradient(135deg, #a9a8ff, #7c3aed)'
                : normalizedPlan === 'pro'
                ? 'linear-gradient(135deg, #2dd4bf, #2563eb)'
                : 'linear-gradient(135deg, #38bdf8, #0284c7)',
            color:
              normalizedPlan === 'developer' || normalizedPlan === 'founder'
                ? '#141110'
                : '#ffffff',
          }}
        >
          {normalizedPlan === 'developer' || normalizedPlan === 'founder'
            ? '👑 DEV'
            : normalizedPlan.toUpperCase()}
        </span>
      )}
    </div>
  );
}
