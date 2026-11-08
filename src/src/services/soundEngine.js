/**
 * MN Alerts — Cinema-Grade Hybrid Sound Engine (EBU R128 Mastered + Procedural Web Audio Synth)
 * Master DynamicsCompressorNode Limiter: Prevents 0 dBFS clipping across OBS CEF and browsers.
 * Features:
 * 1. Broadcast DynamicsCompressorNode brickwall limiter (-6 dB threshold, 12:1 ratio, 3ms attack)
 * 2. 15ms linear attack envelope on GainNode for zero-crackle explosion detonations
 * 3. 15ms ramp-down in stopAll() on active synth nodes for pop-free alert preemption
 * 4. Zero-dependency headless Web Audio mock context for headless Node.js test execution
 * 5. Automatic preset normalization supporting both hyphens and underscores
 * 6. Procedural synthesis fallback for all alert categories and tiers
 */

// ---------------------------------------------------------------------------
// Zero-Dependency Headless Web Audio Mock for Node.js Test Environment
// ---------------------------------------------------------------------------
class HeadlessAudioParam {
  constructor(defaultValue = 0) {
    this.value = defaultValue;
    this.defaultValue = defaultValue;
  }
  setValueAtTime(val) { this.value = val; return this; }
  linearRampToValueAtTime(val) { this.value = val; return this; }
  exponentialRampToValueAtTime(val) { this.value = val; return this; }
  setTargetAtTime(val) { this.value = val; return this; }
  setValueCurveAtTime() { return this; }
  cancelScheduledValues() { return this; }
}

class HeadlessAudioNode {
  constructor() { this.connectedTo = []; }
  connect(dest) { this.connectedTo.push(dest); return dest; }
  disconnect(dest) {
    if (dest) this.connectedTo = this.connectedTo.filter((d) => d !== dest);
    else this.connectedTo = [];
  }
}

class HeadlessGainNode extends HeadlessAudioNode {
  constructor(defaultGain = 1.0) {
    super();
    this.gain = new HeadlessAudioParam(defaultGain);
  }
}

class HeadlessDynamicsCompressorNode extends HeadlessAudioNode {
  constructor() {
    super();
    this.threshold = new HeadlessAudioParam(-24);
    this.knee = new HeadlessAudioParam(30);
    this.ratio = new HeadlessAudioParam(12);
    this.attack = new HeadlessAudioParam(0.003);
    this.release = new HeadlessAudioParam(0.25);
    this.reduction = 0;
  }
}

class HeadlessOscillatorNode extends HeadlessAudioNode {
  constructor() {
    super();
    this.type = 'sine';
    this.frequency = new HeadlessAudioParam(440);
    this.detune = new HeadlessAudioParam(0);
    this.isPlaying = false;
  }
  start() { this.isPlaying = true; }
  stop() { this.isPlaying = false; }
}

class HeadlessBiquadFilterNode extends HeadlessAudioNode {
  constructor() {
    super();
    this.type = 'lowpass';
    this.frequency = new HeadlessAudioParam(350);
    this.Q = new HeadlessAudioParam(1);
    this.gain = new HeadlessAudioParam(0);
  }
}

class HeadlessAudioBufferSourceNode extends HeadlessAudioNode {
  constructor() {
    super();
    this.buffer = null;
    this.playbackRate = new HeadlessAudioParam(1);
    this.loop = false;
    this.isPlaying = false;
  }
  start() { this.isPlaying = true; }
  stop() { this.isPlaying = false; }
}

class HeadlessAudioBuffer {
  constructor(numberOfChannels, length, sampleRate) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  getChannelData(channelIndex) {
    return this._channels[channelIndex] || new Float32Array(this.length);
  }
}

class HeadlessAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = new HeadlessAudioNode();
    this.listener = {};
  }
  get currentTime() {
    if (typeof performance !== 'undefined' && performance.now) return performance.now() / 1000;
    return Date.now() / 1000;
  }
  createGain() { return new HeadlessGainNode(); }
  createDynamicsCompressor() { return new HeadlessDynamicsCompressorNode(); }
  createOscillator() { return new HeadlessOscillatorNode(); }
  createBiquadFilter() { return new HeadlessBiquadFilterNode(); }
  createBuffer(channels, length, sampleRate) { return new HeadlessAudioBuffer(channels, length, sampleRate); }
  createBufferSource() { return new HeadlessAudioBufferSourceNode(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

// ---------------------------------------------------------------------------
// Sound Presets List with Dedicated SFX Files
// ---------------------------------------------------------------------------
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
    id: 'missile',
    labelAr: '🚀 قصف صواريخ وغارة جوية تكتيكية (Tactical Missile Barrage)',
    fileUrl: '/media/sfx/missile-barrage-boom.mp3',
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
    fileUrl: '/media/sfx/anime-katana-thunder.mp3',
  },
  {
    id: 'royal',
    labelAr: '👑 بوق السلاطين والزئير الملكي (Royal Sultan Fanfare & Boom)',
    fileUrl: '/media/sfx/lion-roar-impact.mp3',
  },
  {
    id: 'water',
    labelAr: '🌊 تسونامي المحيط العميق (Abyssal Tsunami Wave)',
    fileUrl: '/media/sfx/void-vortex-boom.mp3',
  },
  {
    id: 'chime',
    labelAr: '✨ رنين كريستالي ناعم مع نبضة باص (Crystal Bass Chime)',
    fileUrl: '/media/sfx/coins-jackpot-drop.mp3',
  },
];

const PRESET_TO_FILE = SOUND_PRESETS_LIST.reduce((acc, item) => {
  acc[item.id] = item.fileUrl;
  return acc;
}, {});

/**
 * Normalizes preset identifier to standard lowercase hyphen format.
 * Tolerates both hyphens and underscores (e.g. 'shadow_eyes' -> 'shadow-eyes').
 */
export function normalizePresetId(id) {
  if (!id || typeof id !== 'string') return 'shadow-eyes';
  return id.toLowerCase().replace(/_/g, '-').trim();
}

// ---------------------------------------------------------------------------
// SoundEngine Class
// ---------------------------------------------------------------------------
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.masterCompressor = null;
    this.volume = 0.88;
    this.muted = false;
    this.customSounds = {};
    this.activeAudios = [];
    this.activeSynthSources = [];
    this.activeLayerGain = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      let AudioCtx = null;
      if (typeof window !== 'undefined') {
        AudioCtx = window.AudioContext || window.webkitAudioContext;
      } else if (typeof globalThis !== 'undefined' && globalThis.AudioContext) {
        AudioCtx = globalThis.AudioContext;
      }
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          this.ctx = new HeadlessAudioContext();
        }
      } else {
        this.ctx = new HeadlessAudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Initializes master DynamicsCompressorNode brickwall limiter.
   * Signal Graph: masterGain -> DynamicsCompressorNode -> destination.
   * Specifications:
   *   threshold: -6 dB
   *   knee: 12 dB
   *   ratio: 12:1
   *   attack: 0.003s (3ms)
   *   release: 0.25s (250ms)
   */
  initMasterCompressor() {
    const ctx = this._ensureCtx();
    if (!ctx) return null;

    if (!this.masterCompressor) {
      const comp = ctx.createDynamicsCompressor();
      const now = ctx.currentTime;

      comp.threshold.setValueAtTime(-6, now);
      comp.threshold.value = -6;

      comp.knee.setValueAtTime(12, now);
      comp.knee.value = 12;

      comp.ratio.setValueAtTime(12, now);
      comp.ratio.value = 12;

      comp.attack.setValueAtTime(0.003, now);
      comp.attack.value = 0.003;

      comp.release.setValueAtTime(0.25, now);
      comp.release.value = 0.25;

      this.masterGain = ctx.createGain();
      const initialGain = this.muted ? 0 : this.volume * 0.55;
      this.masterGain.gain.setValueAtTime(initialGain, now);
      this.masterGain.gain.value = initialGain;

      // Web Audio Routing: masterGain -> DynamicsCompressorNode -> destination
      this.masterGain.connect(comp);
      comp.connect(ctx.destination);

      this.masterCompressor = comp;
    }
    return this.masterCompressor;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0));
    if (this.masterGain && this.ctx) {
      const effectiveGain = this.muted ? 0 : this.volume * 0.55;
      try {
        this.masterGain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
        this.masterGain.gain.value = effectiveGain;
      } catch {}
    }
    this.activeAudios.forEach((a) => {
      try {
        a.volume = this.volume;
      } catch {}
    });
  }

  setMuted(flag) {
    this.muted = Boolean(flag);
    if (this.masterGain && this.ctx) {
      const effectiveGain = this.muted ? 0 : this.volume * 0.55;
      try {
        this.masterGain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
        this.masterGain.gain.value = effectiveGain;
      } catch {}
    }
    if (this.muted) this.stopAll();
  }

  /**
   * Stops all active audio.
   * Applies a clean 15ms linear ramp-down on active Web Audio synth nodes
   * before disconnection to eliminate pop artifacts during alert preemption.
   */
  stopAll() {
    // 1. Web Audio Clean Ramp-Down (15ms linear fade-to-zero eliminates pop)
    if (this.ctx && this.activeLayerGain) {
      try {
        const now = this.ctx.currentTime;
        const currentGain = this.activeLayerGain.gain.value;
        this.activeLayerGain.gain.cancelScheduledValues(now);
        this.activeLayerGain.gain.setValueAtTime(currentGain, now);
        this.activeLayerGain.gain.linearRampToValueAtTime(0.0001, now + 0.015);

        const sources = [...this.activeSynthSources];
        setTimeout(() => {
          sources.forEach((src) => {
            try {
              if (typeof src.stop === 'function') src.stop();
              if (typeof src.disconnect === 'function') src.disconnect();
            } catch {}
          });
        }, 25);
      } catch {}
    }
    this.activeLayerGain = null;
    this.activeSynthSources = [];

    // 2. HTML5 Audio elements pause & rewind
    this.activeAudios.forEach((a) => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    });
    this.activeAudios = [];
  }

  setCustomSound(effectId, url) {
    const key = normalizePresetId(effectId);
    if (url) this.customSounds[key] = url;
    else delete this.customSounds[key];
  }

  playPreset(preset = 'shadow-eyes', customUrl = '') {
    return Promise.resolve(this.play(preset, customUrl));
  }

  play(preset = 'shadow-eyes', customUrl = '') {
    if (this.muted || this.volume <= 0) return;

    const rawId = String(preset || 'shadow-eyes');
    const normalizedId = normalizePresetId(rawId);

    this.stopAll();

    // Layer physical Web Audio sub-bass & cinematic transient synthesizer
    this._playCinematicSynthLayer(normalizedId);

    const urlToPlay =
      customUrl ||
      this.customSounds[rawId] ||
      this.customSounds[normalizedId] ||
      PRESET_TO_FILE[normalizedId] ||
      PRESET_TO_FILE[rawId] ||
      PRESET_TO_FILE['shadow-eyes'];

    if (urlToPlay && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(urlToPlay);
        audio.volume = this.volume;
        this.activeAudios.push(audio);
        audio.onended = () => {
          this.activeAudios = this.activeAudios.filter((x) => x !== audio);
        };
        audio.play().catch(() => {});
      } catch {}
    }
  }

  /**
   * Procedural Web Audio Synthesis Layer
   * Routed strictly into masterGain -> DynamicsCompressorNode limiter.
   */
  _playCinematicSynthLayer(preset) {
    const ctx = this._ensureCtx();
    if (!ctx) return;

    this.initMasterCompressor();

    const now = ctx.currentTime;
    const layerGain = ctx.createGain();
    layerGain.gain.setValueAtTime(1.0, now);
    layerGain.connect(this.masterGain);
    this.activeLayerGain = layerGain;
    this.activeSynthSources = [];

    switch (preset) {
      case 'shadow-eyes': {
        // Stage 1: Darkness Drone (sub-bass pulses)
        this._tone(ctx, layerGain, 54, 28, now, 1.4, 'sine', 0.85);
        this._tone(ctx, layerGain, 65, 32, now + 0.25, 0.35, 'triangle', 0.7);
        this._tone(ctx, layerGain, 55, 28, now + 0.52, 0.4, 'triangle', 0.65);
        // Stage 2: Twin Eyes Ignite (High harmonic pings)
        this._bellPing(ctx, layerGain, 1480, now + 1.02, 0.35, 0.45);
        this._bellPing(ctx, layerGain, 1760, now + 1.20, 0.42, 0.5);
        // Stage 3: Smooth Brown Noise Detonation at 1.68s
        this._explosionDetonation(ctx, layerGain, now + 1.68, 2.6, 1.0);
        break;
      }
      case 'explosion': {
        this._tone(ctx, layerGain, 110, 22, now, 1.8, 'sine', 0.85);
        this._explosionDetonation(ctx, layerGain, now, 2.8, 1.0);
        this._explosionDetonation(ctx, layerGain, now + 0.55, 2.0, 0.65);
        break;
      }
      case 'missile': {
        // Ascending whistle sweep + impact detonation
        this._tone(ctx, layerGain, 320, 1850, now, 0.65, 'sine', 0.35);
        this._explosionDetonation(ctx, layerGain, now + 0.58, 2.2, 0.85);
        break;
      }
      case 'blood': {
        // Katana draw + lightning slash + detonation
        this._katanaDraw(ctx, layerGain, now, 0.35);
        this._tone(ctx, layerGain, 1600, 380, now + 0.28, 0.45, 'sawtooth', 0.28);
        this._explosionDetonation(ctx, layerGain, now + 0.45, 2.2, 0.85);
        break;
      }
      case 'lion-roar':
      case 'royal': {
        this._explosionDetonation(ctx, layerGain, now + 0.1, 2.2, 0.85);
        [73.42, 110.0, 146.83, 220.0].forEach((freq) => {
          this._tone(ctx, layerGain, freq, freq * 0.96, now + 0.2, 1.8, 'sawtooth', 0.25);
        });
        break;
      }
      case 'shatter': {
        [1975, 2489, 2960, 3520, 4186].forEach((freq, idx) => {
          this._bellPing(ctx, layerGain, freq, now + idx * 0.055, 0.5, 0.32);
        });
        this._explosionDetonation(ctx, layerGain, now + 0.08, 1.6, 0.75);
        break;
      }
      case 'void-boom': {
        this._tone(ctx, layerGain, 480, 28, now, 0.75, 'sine', 0.65);
        this._explosionDetonation(ctx, layerGain, now + 0.62, 2.4, 0.95);
        break;
      }
      case 'cyber': {
        [220, 277.18, 329.63, 440, 554.37].forEach((freq, idx) => {
          this._tone(ctx, layerGain, freq, freq * 1.02, now + idx * 0.07, 0.22, 'sawtooth', 0.25);
        });
        this._tone(ctx, layerGain, 110, 32, now + 0.35, 1.2, 'sine', 0.65);
        break;
      }
      case 'coins': {
        [1046.5, 1318.5, 1567.98, 2093.0, 2637.0, 3135.96].forEach((freq, idx) => {
          this._bellPing(ctx, layerGain, freq, now + 0.12 + idx * 0.06, 0.4, 0.35);
        });
        this._explosionDetonation(ctx, layerGain, now, 1.2, 0.65);
        break;
      }
      case 'thunder': {
        this._tone(ctx, layerGain, 1800, 120, now, 0.15, 'sawtooth', 0.4);
        this._explosionDetonation(ctx, layerGain, now + 0.05, 3.0, 0.85);
        break;
      }
      case 'water': {
        this._tone(ctx, layerGain, 75, 32, now, 2.2, 'sine', 0.5);
        this._explosionDetonation(ctx, layerGain, now + 0.1, 2.4, 0.55);
        break;
      }
      case 'chime':
      default: {
        [523.25, 659.25, 783.99, 987.77, 1046.5].forEach((freq, idx) => {
          this._bellPing(ctx, layerGain, freq, now + idx * 0.07, 0.55, 0.35);
        });
        this._tone(ctx, layerGain, 130, 65, now, 0.35, 'sine', 0.4);
        break;
      }
    }
  }

  /**
   * Broadband Noise Detonation with 15ms Linear Attack Envelope
   * Eliminates the 0ms step discontinuity crackle/pop at attack onset.
   */
  _explosionDetonation(ctx, dest, startTime, duration = 2.4, intensity = 1.0) {
    this._tone(ctx, dest, 110, 22, startTime, duration * 0.85, 'sine', 0.95 * intensity);
    this._tone(ctx, dest, 80, 26, startTime, duration * 0.6, 'sawtooth', 0.55 * intensity);

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // 6dB/oct low-pass brown noise filter to eliminate harsh high-frequency static
        lastOut = (lastOut + 0.025 * white) / 1.025;
        const env = Math.exp(-i / (bufferSize * 0.30));
        data[i] = lastOut * 3.5 * env;
      }
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, startTime);
    filter.frequency.exponentialRampToValueAtTime(120, startTime + duration * 0.85);

    // 15ms linear attack envelope on GainNode: eliminates instantaneous DC jump
    const gain = ctx.createGain();
    const targetGain = 0.85 * intensity;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(targetGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(startTime);
    this.activeSynthSources.push(noise);
  }

  /**
   * Frequency Swept Tone Generator with 15ms Linear Attack Envelope
   */
  _tone(ctx, dest, startFreq, endFreq, startTime, duration, type = 'sine', peakGain = 0.3) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    }

    // 15ms linear attack envelope: eliminates click transients
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);

    this.activeSynthSources.push(osc);
  }

  /**
   * Modal Bell Ping Generator with smooth attack
   */
  _bellPing(ctx, dest, freq, startTime, duration = 0.5, peakGain = 0.3) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);

    this.activeSynthSources.push(osc);
  }

  /**
   * Katana blade unsheathe sound (swept bandpass filtered noise)
   */
  _katanaDraw(ctx, dest, startTime, duration = 0.35) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(6.0, startTime);
    filter.frequency.setValueAtTime(1200, startTime);
    filter.frequency.exponentialRampToValueAtTime(5500, startTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(startTime);

    this.activeSynthSources.push(noise);
  }
}

export const soundEngine = new SoundEngine();
