/**
 * DAYLOOM — Mesin Audio RPG Prosedural (Web Audio API)
 * Menghasilkan efek suara bernuansa Jepang / RPG retro lembut tanpa file eksternal.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.35;
    this.bgmVolume = 0.40;
    this.bgmAudio = null;
    this.bgmUrl = 'assets/audio/pvp-battle.mp3';
    this.loadPreference();
  }

  loadPreference() {
    try {
      const saved = localStorage.getItem('dayloom_audio_pref');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        this.enabled = Boolean(parsed.enabled);
        if (typeof parsed.volume === 'number') {
          this.volume = Math.max(0, Math.min(1, parsed.volume));
        }
        if (typeof parsed.bgmVolume === 'number') {
          this.bgmVolume = Math.max(0, Math.min(1, parsed.bgmVolume));
        }
      }
    } catch {
      this.enabled = true;
    }
  }

  savePreference() {
    try {
      localStorage.setItem('dayloom_audio_pref', JSON.stringify({
        enabled: this.enabled,
        volume: this.volume,
        bgmVolume: this.bgmVolume
      }));
    } catch {
      // Ignore storage error
    }
  }

  playBGM(url = this.bgmUrl) {
    if (!this.enabled || typeof window === 'undefined') return;

    // Jangan restart jika BGM yang sama sudah aktif memutar
    if (this.bgmAudio && !this.bgmAudio.paused) {
      return;
    }

    try {
      if (this.bgmAudio) {
        this.bgmAudio.pause();
        this.bgmAudio = null;
      }
      this.bgmAudio = new Audio(url);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = Math.max(0, Math.min(1, this.bgmVolume));

      const promise = this.bgmAudio.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Menangani kebijakan autoplay browser sebelum interaksi pengguna
          // atau jika file audio belum diletakkan di workspace
        });
      }
    } catch {
      // Error penanganan aman jika file audio belum ada
    }
  }

  stopBGM() {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch {}
      this.bgmAudio = null;
    }
  }

  setBGMVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, Number(vol) || 0));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
    this.savePreference();
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    this.savePreference();
    if (this.enabled) {
      this.playClick();
    } else {
      this.stopBGM();
    }
    return this.enabled;
  }

  playTone(freq, duration = 0.12, type = 'triangle', delay = 0, gainScale = 1) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    const peak = Math.max(0.001, this.volume * gainScale);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /** Klik antarmuka kayu / koto lembut */
  playClick() {
    this.playTone(523.25, 0.07, 'triangle', 0, 0.5); // C5
    this.playTone(659.25, 0.06, 'sine', 0.03, 0.35); // E5
  }

  /** Centang item daftar periksa */
  playCheck() {
    this.playTone(587.33, 0.09, 'triangle', 0, 0.55); // D5
    this.playTone(880.0, 0.12, 'sine', 0.05, 0.5);   // A5
  }

  /** Peringatan / Validasi belum lengkap */
  playWarning() {
    this.playTone(220.0, 0.14, 'sawtooth', 0, 0.4);
    this.playTone(196.0, 0.18, 'sawtooth', 0.1, 0.4);
  }

  /** Misi Selesai (+10 RP) — Tangga nada pentatonik Jepang (Hirajoshi/Yo) */
  playQuestComplete() {
    const notes = [523.25, 587.33, 659.25, 783.99, 1046.5]; // C5, D5, E5, G5, C6
    notes.forEach((n, i) => {
      this.playTone(n, 0.22, 'triangle', i * 0.07, 0.7);
    });
  }

  /** Membuka Pencapaian (Achievement Unlock) */
  playAchievement() {
    const notes = [659.25, 783.99, 987.77, 1318.5]; // E5, G5, B5, E6
    notes.forEach((n, i) => {
      this.playTone(n, 0.26, 'sine', i * 0.08, 0.75);
    });
  }

  /** Kenaikan Peringkat (Rank Up Fanfare) */
  playRankUp() {
    const chord = [
      { f: 440.0, d: 0.18, t: 0 },
      { f: 554.37, d: 0.18, t: 0.09 },
      { f: 659.25, d: 0.18, t: 0.18 },
      { f: 880.0, d: 0.35, t: 0.27 },
      { f: 1108.73, d: 0.45, t: 0.38 },
      { f: 1318.51, d: 0.65, t: 0.5 }
    ];
    chord.forEach(n => this.playTone(n.f, n.d, 'triangle', n.t, 0.85));
  }

  /** Serangan Fokus di Arena */
  playHit() {
    this.playTone(329.63, 0.08, 'square', 0, 0.4);
    this.playTone(659.25, 0.1, 'triangle', 0.03, 0.5);
  }

  /** Tebasan Pedang Suci Lostvayne (Meliodas Basic Attack) */
  playSwordSlash() {
    this.playTone(440.0, 0.06, 'sawtooth', 0, 0.45);
    this.playTone(293.66, 0.09, 'triangle', 0.025, 0.55);
    this.playTone(783.99, 0.05, 'sine', 0.01, 0.35);
  }

  /** Semburan Api Gelap Hellblaze (Meliodas Q Skill) */
  playHellblaze() {
    this.playTone(146.83, 0.16, 'sawtooth', 0, 0.55);
    this.playTone(220.0, 0.2, 'triangle', 0.05, 0.6);
    this.playTone(311.13, 0.22, 'sawtooth', 0.11, 0.5);
  }

  /** Transformasi Assault Mode (Meliodas R Ultimate) */
  playAssaultTransform() {
    const notes = [130.81, 164.81, 196.0, 261.63, 392.0];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.24, 'sawtooth', idx * 0.055, 0.65);
    });
  }
}

export const sound = new SoundEngine();

