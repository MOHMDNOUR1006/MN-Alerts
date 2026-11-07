/**
 * Authoritative Interface Contracts and Validation Schemas
 * Source: /media/mohmad-nour/3AA05211A051D44B1/WebSites/.agents/teamwork/orchestrator_1/PROJECT.md
 */

export const STREAM_EVENT_TYPES = ['follow', 'subscribe', 'donation', 'raid', 'cheer', 'chat'];
export const STREAM_PLATFORMS = ['twitch', 'youtube', 'kick', 'test'];
export const STREAM_TIERS = ['free', 'plus', 'pro', 'ultra'];
export const PRIORITY_LEVELS = [0, 1, 2, 3, 4]; // 0=Critical, 1=Raid, 2=Donation, 3=Sub, 4=Follow

export const ALL_16_WIDGETS = [
  'chat-box',
  'event-list',
  'goals-progress',
  'tip-jar',
  'top-supporters',
  'end-credits',
  'media-share',
  'polls',
  'spin-wheel',
  'stream-boss',
  'emote-wall',
  'sponsor-banner',
  'countdown-timer',
  'stream-labels',
  'viewer-counter',
  'custom-html',
];

export const VALID_AVATAR_FRAMES = [
  'frame-royal-crown',
  'frame-dragon-fire',
  'frame-crimson-demon',
  'frame-pharaoh-void',
  'royal-crown',
  'dragon-fire',
  'crimson-demon',
  'pharaoh-void',
];

/**
 * Validates a StreamEvent against the formal PROJECT.md interface contract.
 */
export function validateStreamEventContract(event) {
  const errors = [];
  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }
  if (!event.id || typeof event.id !== 'string') {
    errors.push('event.id must be a non-empty string UUID');
  }
  if (!STREAM_EVENT_TYPES.includes(event.type)) {
    errors.push(`event.type must be one of: ${STREAM_EVENT_TYPES.join(', ')} (got: ${event.type})`);
  }
  if (!STREAM_PLATFORMS.includes(event.platform)) {
    errors.push(`event.platform must be one of: ${STREAM_PLATFORMS.join(', ')} (got: ${event.platform})`);
  }
  if (typeof event.priority !== 'number' || !PRIORITY_LEVELS.includes(event.priority)) {
    errors.push(`event.priority must be an integer between 0 and 4 (got: ${event.priority})`);
  }
  if (!STREAM_TIERS.includes(event.tier)) {
    errors.push(`event.tier must be one of: ${STREAM_TIERS.join(', ')} (got: ${event.tier})`);
  }
  if (!event.sender || typeof event.sender !== 'object') {
    errors.push('event.sender must be an object');
  } else {
    if (typeof event.sender.name !== 'string') {
      errors.push('event.sender.name must be a string');
    }
    if (event.sender.frameId && !VALID_AVATAR_FRAMES.includes(event.sender.frameId)) {
      errors.push(`event.sender.frameId invalid (got: ${event.sender.frameId})`);
    }
  }
  if (!event.payload || typeof event.payload !== 'object') {
    errors.push('event.payload must be an object');
  }
  if (typeof event.timestamp !== 'number' || isNaN(event.timestamp)) {
    errors.push('event.timestamp must be a valid numeric millisecond timestamp');
  }
  if (typeof event.expiresAt !== 'number' || isNaN(event.expiresAt)) {
    errors.push('event.expiresAt must be a valid numeric millisecond timestamp');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an AlertQueue instance against the formal PROJECT.md interface contract.
 */
export function validateAlertQueueContract(queue) {
  const requiredMethods = ['enqueue', 'dequeue', 'peek', 'skip', 'clear', 'pause', 'resume', 'size', 'on'];
  const missing = requiredMethods.filter((m) => typeof queue[m] !== 'function');
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validates a SoundEngine instance against the formal PROJECT.md interface contract.
 */
export function validateSoundEngineContract(engine) {
  const requiredMethods = ['initMasterCompressor', 'playPreset', 'stopAll', 'setVolume', 'setMuted'];
  const missing = requiredMethods.filter((m) => typeof engine[m] !== 'function');
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validates a SubscriptionProfile against the formal PROJECT.md interface contract.
 */
export function validateSubscriptionProfileContract(profile) {
  const errors = [];
  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile must be an object'] };
  }
  if (!profile.uid || typeof profile.uid !== 'string') errors.push('profile.uid must be a non-empty string');
  if (!profile.plan || !STREAM_TIERS.includes(profile.plan)) errors.push('profile.plan must be one of free, plus, pro, ultra');
  if (!['active', 'cancelled', 'expired'].includes(profile.status)) errors.push('profile.status must be active, cancelled, or expired');
  if (!profile.features || typeof profile.features !== 'object') {
    errors.push('profile.features must be an object');
  } else {
    const f = profile.features;
    if (typeof f.maxScenes !== 'number') errors.push('features.maxScenes must be a number');
    if (typeof f.maxWidgets !== 'number') errors.push('features.maxWidgets must be a number');
    if (typeof f.watermark !== 'boolean') errors.push('features.watermark must be a boolean');
    if (typeof f.cinematicVfx !== 'boolean') errors.push('features.cinematicVfx must be a boolean');
    if (typeof f.customAudio !== 'boolean') errors.push('features.customAudio must be a boolean');
    if (typeof f.priorityQueue !== 'boolean') errors.push('features.priorityQueue must be a boolean');
    if (typeof f.leaderboards !== 'boolean') errors.push('features.leaderboards must be a boolean');
    if (!Array.isArray(f.allowedPacks)) errors.push('features.allowedPacks must be an array of pack IDs');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
