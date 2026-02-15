// Procedural sound effects using Web Audio API
// No external audio files needed — everything generated in real-time

type SoundEffectName =
  | 'jump' | 'doubleJump' | 'land' | 'wallJump'
  | 'glide' | 'dash' | 'groundPound' | 'bounce'
  | 'collectEgg' | 'allEggs' | 'levelComplete'
  | 'waterSlide' | 'buttonClick' | 'buttonHover'
  | 'hatchCrack' | 'hatchReveal' | 'newAnimal'
  | 'roll' | 'pause';

interface SoundConfig {
  type: OscillatorType;
  frequency: number | number[];
  duration: number;
  volume: number;
  envelope?: { attack: number; decay: number; sustain: number; release: number };
  noise?: boolean;
}

class SoundSystemClass {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _isMuted = false;
  private volume = 0.5;

  init(): void {
    if (this.audioContext) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volume;
      const saved = localStorage.getItem('deedee_muted');
      if (saved) this._isMuted = JSON.parse(saved);
      this.updateMuteState();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  private playSoundConfig(config: SoundConfig): void {
    if (!this.audioContext || !this.masterGain || this._isMuted) return;
    const ctx = this.audioContext;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const dur = config.duration / 1000;
    const env = config.envelope || { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.1 };
    const gainNode = ctx.createGain();
    gainNode.connect(this.masterGain);
    const sustainLevel = config.volume * env.sustain;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(config.volume, now + env.attack);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + env.attack + env.decay);
    const releaseStart = Math.max(now + env.attack + env.decay, now + dur - env.release);
    gainNode.gain.setValueAtTime(sustainLevel, releaseStart);
    gainNode.gain.linearRampToValueAtTime(0, now + dur);

    if (config.noise) {
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      source.start(now);
    } else {
      const osc = ctx.createOscillator();
      osc.type = config.type;
      if (Array.isArray(config.frequency)) {
        osc.frequency.setValueAtTime(config.frequency[0], now);
        for (let i = 1; i < config.frequency.length; i++) {
          const t = now + (i / (config.frequency.length - 1)) * dur;
          osc.frequency.linearRampToValueAtTime(config.frequency[i], t);
        }
      } else {
        osc.frequency.value = config.frequency;
      }
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }
  }

  play(name: SoundEffectName): void {
    if (!this.audioContext) this.init();
    if (this.audioContext?.state === 'suspended') this.audioContext.resume();
    switch (name) {
      case 'jump': return this.playSoundConfig({ type: 'square', frequency: [262, 392], duration: 150, volume: 0.25, envelope: { attack: 0.005, decay: 0.04, sustain: 0.5, release: 0.1 } });
      case 'doubleJump': return this.playSoundConfig({ type: 'triangle', frequency: [440, 660, 880], duration: 180, volume: 0.28, envelope: { attack: 0.005, decay: 0.05, sustain: 0.6, release: 0.12 } });
      case 'land': return this.playSoundConfig({ type: 'sine', frequency: [200, 80], duration: 120, volume: 0.2, envelope: { attack: 0.001, decay: 0.08, sustain: 0.2, release: 0.04 } });
      case 'wallJump': return this.playSoundConfig({ type: 'square', frequency: [330, 494], duration: 140, volume: 0.25, envelope: { attack: 0.003, decay: 0.05, sustain: 0.4, release: 0.09 } });
      case 'glide': return this.playSoundConfig({ type: 'triangle', frequency: 220, duration: 200, volume: 0.1, envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.05 } });
      case 'dash': return this.playSoundConfig({ type: 'sawtooth', frequency: [600, 200], duration: 250, volume: 0.25, noise: false, envelope: { attack: 0.005, decay: 0.08, sustain: 0.6, release: 0.16 } });
      case 'groundPound': return this.playSoundConfig({ type: 'sine', frequency: [100, 40], duration: 300, volume: 0.35, envelope: { attack: 0.001, decay: 0.15, sustain: 0.3, release: 0.15 } });
      case 'bounce': return this.playSoundConfig({ type: 'square', frequency: [294, 440, 330], duration: 200, volume: 0.22, envelope: { attack: 0.01, decay: 0.06, sustain: 0.5, release: 0.14 } });
      case 'roll': return this.playSoundConfig({ type: 'sawtooth', frequency: [150, 200, 150], duration: 200, volume: 0.15, envelope: { attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.14 } });
      case 'waterSlide': return this.playSoundConfig({ type: 'sine', frequency: [400, 300], duration: 150, volume: 0.12, noise: false, envelope: { attack: 0.02, decay: 0.05, sustain: 0.7, release: 0.08 } });
      case 'pause': return this.playSoundConfig({ type: 'triangle', frequency: [440, 330], duration: 150, volume: 0.2, envelope: { attack: 0.005, decay: 0.05, sustain: 0.5, release: 0.1 } });
      case 'buttonClick': return this.playSoundConfig({ type: 'square', frequency: [880, 660], duration: 80, volume: 0.2, envelope: { attack: 0.002, decay: 0.03, sustain: 0.4, release: 0.05 } });
      case 'buttonHover': return this.playSoundConfig({ type: 'sine', frequency: 660, duration: 60, volume: 0.1, envelope: { attack: 0.005, decay: 0.02, sustain: 0.5, release: 0.035 } });
      case 'hatchCrack': return this.playSoundConfig({ type: 'square', frequency: [180, 140, 100], duration: 150, volume: 0.22, envelope: { attack: 0.002, decay: 0.05, sustain: 0.3, release: 0.1 } });
      case 'collectEgg':
        [523, 659, 784].forEach((freq, i) => {
          setTimeout(() => this.playSoundConfig({ type: 'square', frequency: freq, duration: 100, volume: 0.25, envelope: { attack: 0.005, decay: 0.03, sustain: 0.7, release: 0.06 } }), i * 60);
        });
        return;
      case 'allEggs':
        [523, 659, 784, 1047].forEach((freq, i) => {
          setTimeout(() => this.playSoundConfig({ type: 'triangle', frequency: freq, duration: 400, volume: 0.28, envelope: { attack: 0.01, decay: 0.08, sustain: 0.8, release: 0.3 } }), i * 100);
        });
        return;
      case 'levelComplete':
        [523, 587, 659, 784, 880, 1047].forEach((freq, i) => {
          setTimeout(() => this.playSoundConfig({ type: 'square', frequency: freq, duration: 200, volume: 0.25, envelope: { attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.15 } }), i * 150);
        });
        return;
      case 'hatchReveal':
        [659, 784, 988, 1318].forEach((freq, i) => {
          setTimeout(() => this.playSoundConfig({ type: 'triangle', frequency: freq, duration: 250, volume: 0.25, envelope: { attack: 0.02, decay: 0.06, sustain: 0.7, release: 0.18 } }), i * 80);
        });
        return;
      case 'newAnimal':
        [523, 659, 784, 1047, 1319].forEach((freq, i) => {
          setTimeout(() => this.playSoundConfig({ type: 'sine', frequency: freq, duration: 500, volume: 0.25, envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.4 } }), i * 60);
        });
        return;
    }
  }

  toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    localStorage.setItem('deedee_muted', JSON.stringify(this._isMuted));
    this.updateMuteState();
    return this._isMuted;
  }

  get isMuted(): boolean { return this._isMuted; }

  private updateMuteState(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this._isMuted ? 0 : this.volume;
    }
  }
}

export const SoundSystem = new SoundSystemClass();
