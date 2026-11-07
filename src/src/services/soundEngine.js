/**
 * MN Alerts — Cinema-Grade Hybrid Audio Engine (Real MP3 SFX + Multi-Stage Web Audio Explosion Synth)
 * Supports:
 * 1. Real pre-mastered stereo MP3 SFX files in `/media/sfx/*.mp3`
 *    (Explosions, Dark Blackout + Twin Eyes Awakening, Anime Katana Thunder,
 *     Golden Lion Roar, Dimension Glass Shatter, Jackpot Coin Drop, Plasma Core Surge, Void Vortex)
 * 2. Synchronized Multi-Stage Choreography Audio (Blackout Drone -> Twin-Eyes Ping -> Massive Explosion Boom)
 * 3. Custom MP3/WAV/OGG URLs uploaded or pasted by the streamer
 */

export const SOUND_PRESETS_LIST = [
  {
    id: 'shadow-eyes',
    labelAr: '👁️👁️ خفوت الظلام + توهج نورين + انفجار شامل (Shadow Eyes Awakening)',
    fileUrl: '/media/sfx/shadow-eyes-explosion.mp3',
  },
  {
    id: 'explosion',
    labelAr: '💥 انفجار نووي وموجة صدمة حقيقية (Heavy Nuclear Explosion)',
    fileUrl: '/media/sfx/nuclear-explosion.mp3',
  },
  {
    id: 'blood',
    labelAr: '⚔️ نصل كاتانا قرمزي + صاعقة رعد ودماء (Anime Katana Slash & Thunder)',
    fileUrl: '/media/sfx/anime-katana-thunder.mp3',
  },
  {
    id: 'lion-roar',
    labelAr: '🦁 زئير الأسد الملكي + انفجار ذهبي (Golden Lion Roar & Blast)',
    fileUrl: '/media/sfx/lion-roar-impact.mp3',
  },
  {
    id: 'shatter',
    labelAr: '💎 تحطم أبعاد الزجاج الكريستالي (Dimension Glass Shatter)',
    fileUrl: '/media/sfx/shatter-dimension-blast.mp3',
  },
  {
    id: 'void-boom',
    labelAr: '🌌 انفجار الفراغ البنفسجي الأرجواني (Hollow Void Singularity Boom)',
    fileUrl: '/media/sfx/void-vortex-boom.mp3',
  },
  {
    id: 'cyber',
    labelAr: '⚡ تفجير طاقة البلازما السيبرانية (Cyber Plasma Core Surge)',
    fileUrl: '/media/sfx/cyber-plasma-surge.mp3',
  },
  {
    id: 'coins',
    labelAr: '🪙 انفجار خزنة الذهب والعملات (Vault Boom & Jackpot Coins)',
    fileUrl: '/media/sfx/coins-jackpot-drop.mp3',
  },
  {
    id: 'thunder',
    labelAr: '🌩️ عاصفة صواعق البرق البركانية (Thunderstorm & Magma Blast)',
    fileUrl: '/media/sfx/nuclear-explosion.mp3',
  },
  {
    id: 'royal',
    labelAr: '👑 بوق السلاطين والزئير الملكي (Royal Sultan Fanfare & Boom)',
    fileUrl: '/media/sfx/lion-roar-impact.mp3',
  },
  {
    id: 'water',
    labelAr: '🌊 تسونامي المحيط العميق (Abyssal Tsunami Wave)',
    fileUrl: '/media/sfx/cyber-plasma-surge.mp3',
  },
  {
    id: 'chime',
    labelAr: '✨ رنين كريستالي ناعم مع نبضة باص (Crystal Bass Chime)',
    fileUrl: '/media/sfx/shatter-dimension-blast.mp3',
  },
];

const PRESET_TO_FILE = SOUND_PRESETS_LIST.reduce((acc, item) => {
  acc[item.id] = item.fileUrl;
  return acc;
}, {});

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.88;
    this.muted = false;
    this.customSounds = {};
    this.activeAudios = [];
  }

  _ensureCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0));
    this.activeAudios.forEach((a) => {
      try {
        a.volume = this.volume;
      } catch (_) {}
    });
  }

  setMuted(flag) {
    this.muted = Boolean(flag);
    if (this.muted) this.stopAll();
  }

  stopAll() {
    this.activeAudios.forEach((a) => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (_) {}
    });
    this.activeAudios = [];
  }

  setCustomSound(effectId, url) {
    if (url) this.customSounds[effectId] = url;
    else delete this.customSounds[effectId];
  }

  playPreset(preset = 'shadow-eyes', customUrl = '') {
    return this.play(preset, customUrl);
  }

  play(preset = 'shadow-eyes', customUrl = '') {
    if (this.muted || this.volume <= 0) return;

    this.stopAll();

    // Always layer the physical Web Audio sub-bass & cinematic transient enhancer
    // AND play the real stereo MP3 SFX file simultaneously for chest-thumping impact!
    this._playCinematicSynthLayer(preset);

    const urlToPlay = customUrl || this.customSounds[preset] || PRESET_TO_FILE[preset] || PRESET_TO_FILE['shadow-eyes'];
    if (urlToPlay && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(urlToPlay);
        audio.volume = this.volume;
        this.activeAudios.push(audio);
        audio.onended = () => {
          this.activeAudios = this.activeAudios.filter((x) => x !== audio);
        };
        audio.play().catch(() => {});
      } catch (_) {}
    }
  }

  _playCinematicSynthLayer(preset) {
    const ctx = this._ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(this.volume * 0.55, now);
    master.connect(ctx.destination);

    switch (preset) {
      case 'shadow-eyes': {
        // Stage 1 (0.0s): Darkness descends — deep ominous sub-bass rumble + heartbeat
        this._tone(ctx, master, 54, 28, now, 1.4, 'sine', 0.85);
        this._tone(ctx, master, 65, 32, now + 0.25, 0.35, 'triangle', 0.7);
        this._tone(ctx, master, 55, 28, now + 0.52, 0.4, 'triangle', 0.65);
        // Stage 2 (1.02s & 1.20s): Twin Glowing Eyes Ignite in the dark!
        this._tone(ctx, master, 1480, 2960, now + 1.02, 0.35, 'sine', 0.45);
        this._tone(ctx, master, 1760, 3520, now + 1.20, 0.42, 'sine', 0.5);
        // Stage 3 (1.68s): Massive Explosion Detonation + Shockwave Roar!
        this._explosionDetonation(ctx, master, now + 1.68, 2.6, 1.0);
        break;
      }
      case 'explosion':
      case 'thunder': {
        this._explosionDetonation(ctx, master, now, 2.8, 1.0);
        // Secondary shockwave at +0.55s
        this._explosionDetonation(ctx, master, now + 0.55, 2.0, 0.65);
        break;
      }
      case 'blood': {
        // Katana metallic draw + lightning slash + explosion
        this._tone(ctx, master, 1600, 3800, now, 0.45, 'sawtooth', 0.28);
        this._explosionDetonation(ctx, master, now + 0.48, 2.2, 0.9);
        break;
      }
      case 'lion-roar':
      case 'royal': {
        // Deep beast growl + seismic slam + brass chord
        this._explosionDetonation(ctx, master, now + 0.1, 2.2, 0.85);
        [73.42, 110.0, 146.83, 220.0].forEach((freq) => {
          this._tone(ctx, master, freq, freq * 0.96, now + 0.2, 1.8, 'sawtooth', 0.25);
        });
        break;
      }
      case 'shatter': {
        this._explosionDetonation(ctx, master, now, 1.6, 0.75);
        [1975, 2489, 2960, 3520, 4186].forEach((freq, idx) => {
          this._tone(ctx, master, freq, freq * 0.94, now + idx * 0.055, 0.5, 'sine', 0.32);
        });
        break;
      }
      case 'void-boom':
      case 'cyber': {
        // Gravity implosion -> massive bass drop
        this._tone(ctx, master, 420, 38, now, 0.65, 'sawtooth', 0.55);
        this._explosionDetonation(ctx, master, now + 0.62, 2.4, 0.95);
        break;
      }
      case 'coins': {
        this._explosionDetonation(ctx, master, now, 1.2, 0.65);
        [1046.5, 1318.5, 1567.98, 2093.0, 2637.0, 3135.96].forEach((freq, idx) => {
          this._tone(ctx, master, freq, freq * 1.01, now + 0.15 + idx * 0.06, 0.4, 'sine', 0.35);
        });
        break;
      }
      default: {
        this._explosionDetonation(ctx, master, now, 1.5, 0.6);
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          this._tone(ctx, master, freq, freq, now + idx * 0.065, 0.55, 'sine', 0.35);
        });
      }
    }
  }

  _explosionDetonation(ctx, dest, startTime, duration = 2.4, intensity = 1.0) {
    // 1. Sub-bass seismic drop (110Hz -> 22Hz)
    this._tone(ctx, dest, 110, 22, startTime, duration * 0.85, 'sine', 0.95 * intensity);
    this._tone(ctx, dest, 80, 26, startTime, duration * 0.6, 'sawtooth', 0.55 * intensity);

    // 2. Broadband explosion roar (low-pass sweeping noise burst)
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.exp(-i / (bufferSize * 0.28));
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, startTime);
    filter.frequency.exponentialRampToValueAtTime(140, startTime + duration * 0.9);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.85 * intensity, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(startTime);
  }

  _tone(ctx, dest, startFreq, endFreq, startTime, duration, type = 'sine', peakGain = 0.3) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    }
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }
}

export const soundEngine = new SoundEngine();
