/**
 * DAYLOOM — Mesin Audio RPG Prosedural & Atmosfer "Sakura Journey" (Web Audio API)
 * Menghasilkan musik latar (BGM) "Sakura Journey" (piano lembut, koto pentatonik Jepang,
 * dan pad hangat), ambiens angin lobi, serta efek suara tempur secara orisinal, legal,
 * dan bebas masalah hak cipta maupun file eksternal yang hilang.
 */

export const BGM_TRACKS = [
  {
    id: 'bgm1',
    name: 'BGM 1 — Original Dayloom',
    label: 'BGM 1 — Original Dayloom',
    title: 'Sakura Journey',
    url: 'assets/audio/pvp-battle.mp3',
    description: 'Atmosfer lembut Sakura Journey & Koto Pentatonik'
  },
  {
    id: 'bgm2',
    name: 'BGM 2 — My Original Music',
    label: 'BGM 2 — My Original Music',
    title: 'WhatsApp Audio 2026-11-11 at 06.40.29',
    url: 'assets/audio/bgm-original-2.mp3',
    fallbackUrl: 'assets/audio/WhatsApp Audio 2026-11-11 at 06.40.29.mp3',
    description: 'Musik tema petualangan original kedua karya kreator'
  },
  {
    id: 'bgm3',
    name: 'BGM 3 — Original Music ketiga',
    label: 'BGM 3 — Original Music ketiga',
    title: 'WhatsApp Audio 2026-11-11 at 07.13.44',
    url: 'assets/audio/bgm-original-3.mp3',
    fallbackUrl: 'assets/audio/WhatsApp Audio 2026-11-11 at 07.13.44.mp3',
    description: 'Musik tema petualangan original ketiga karya kreator'
  }
];

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.volume = 0.35;
    this.bgmVolume = 0.40;
    this.bgmAudio = null;
    this.bgmUrl = 'assets/audio/pvp-battle.mp3';
    this.selectedBgmTrack = 'bgm1';
    this.currentPlayingTrack = null;
    this.onTrackChangeCallbacks = [];

    // Penjadwal Loop Prosedural "Sakura Journey" & Ambiens Lobi (Anti-Overlap Guard)
    this.bgmLoopTimer = null;
    this.bgmStepIndex = 0;
    this.isBgmLoopActive = false;
    this.lobbyAmbienceTimer = null;
    this.isLobbyAmbienceActive = false;
    this.autoResumeBound = false;

    this.loadPreference();
    this.bindAutoplayUnlock();
  }

  loadPreference() {
    try {
      const saved = localStorage.getItem('dayloom_audio_pref');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.enabled === 'boolean') {
          this.enabled = parsed.enabled;
        }
        this.musicEnabled = typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : this.enabled;
        this.sfxEnabled = typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : this.enabled;
        if (typeof parsed.volume === 'number' && !Number.isNaN(parsed.volume)) {
          this.volume = Math.max(0, Math.min(1, parsed.volume));
        }
        if (typeof parsed.bgmVolume === 'number' && !Number.isNaN(parsed.bgmVolume)) {
          this.bgmVolume = Math.max(0, Math.min(1, parsed.bgmVolume));
        }
        if (['bgm1', 'bgm2', 'bgm3'].includes(parsed.selectedBgmTrack)) {
          this.selectedBgmTrack = parsed.selectedBgmTrack;
        }
      }
    } catch {
      this.enabled = true;
      this.musicEnabled = true;
      this.sfxEnabled = true;
      this.selectedBgmTrack = 'bgm1';
    }
  }

  savePreference() {
    try {
      localStorage.setItem('dayloom_audio_pref', JSON.stringify({
        enabled: this.enabled,
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
        volume: this.volume,
        bgmVolume: this.bgmVolume,
        selectedBgmTrack: this.selectedBgmTrack
      }));
    } catch {
      // Ignore storage error
    }
  }

  /**
   * Mematuhi aturan autoplay browser modern: membuka kunci AudioContext pada interaksi pertama
   * dan memulai ulang loop Sakura Journey jika pengguna sudah mengaktifkan musik.
   */
  bindAutoplayUnlock() {
    if (this.autoResumeBound || typeof window === 'undefined' || typeof document === 'undefined') return;
    this.autoResumeBound = true;

    const unlockHandler = () => {
      if (this.enabled && (this.musicEnabled || this.sfxEnabled)) {
        this.initContext();
        if (this.musicEnabled) {
          const track = this.selectedBgmTrack || 'bgm1';
          if (track === 'bgm2' || track === 'bgm3') {
            if (!this.bgmAudio || this.bgmAudio.paused) {
              this.playBGM(track);
            }
          } else {
            if (!this.isBgmLoopActive || (this.bgmAudio && this.bgmAudio.paused)) {
              this.playBGM('bgm1');
            }
          }
        }
      }
    };

    ['pointerdown', 'keydown', 'click', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, unlockHandler, { once: true, passive: true });
    });
  }

  /**
   * Memutar BGM "Sakura Journey" (BGM 1) atau "My Original Music" (BGM 2 & BGM 3)
   * dengan loop mulus tanpa tumpang-tindih (single instance anti-overlap guard).
   * Menjamin hanya satu BGM utama yang aktif pada satu waktu di seluruh halaman.
   */
  playBGM(urlOrTrack = null) {
    if (!this.enabled || !this.musicEnabled || typeof window === 'undefined') return;

    let targetTrack = this.selectedBgmTrack || 'bgm1';
    if (['bgm1', 'bgm2', 'bgm3'].includes(urlOrTrack)) {
      targetTrack = urlOrTrack;
    }

    // Jangan restart atau menumpuk loop jika track yang sama sudah aktif memutar
    if (this.currentPlayingTrack === targetTrack) {
      if (targetTrack === 'bgm1' && (this.isBgmLoopActive || (this.bgmAudio && !this.bgmAudio.paused))) {
        return;
      }
      if ((targetTrack === 'bgm2' || targetTrack === 'bgm3') && this.bgmAudio && !this.bgmAudio.paused) {
        return;
      }
    }

    // Hentikan BGM sebelumnya sebelum memutar BGM baru (Anti-Overlap)
    this.stopBGM();
    this.currentPlayingTrack = targetTrack;

    if (targetTrack === 'bgm2' || targetTrack === 'bgm3') {
      // Putar MP3 Original (BGM 2 atau BGM 3)
      const isBgm3 = targetTrack === 'bgm3';
      const trackUrl = isBgm3 ? 'assets/audio/bgm-original-3.mp3' : 'assets/audio/bgm-original-2.mp3';
      const fallbackUrl = isBgm3
        ? 'assets/audio/WhatsApp Audio 2026-11-11 at 07.13.44.mp3'
        : 'assets/audio/WhatsApp Audio 2026-11-11 at 06.40.29.mp3';
      try {
        if (typeof Audio !== 'undefined') {
          this.bgmAudio = new Audio(trackUrl);
          this.bgmAudio.preload = 'auto';
          this.bgmAudio.loop = true;
          this.bgmAudio.volume = Math.max(0, Math.min(1, this.bgmVolume));

          // Fail-safe looping event listener: putar ulang otomatis saat selesai
          if (typeof this.bgmAudio.addEventListener === 'function') {
            this.bgmAudio.addEventListener('ended', () => {
              if (this.enabled && this.musicEnabled && this.currentPlayingTrack === targetTrack && this.bgmAudio) {
                try {
                  this.bgmAudio.currentTime = 0;
                  const p = this.bgmAudio.play();
                  if (p && typeof p.catch === 'function') p.catch(() => {});
                } catch {}
              }
            });

            // Error fallback: coba path alternatif file WhatsApp Audio jika gagal
            this.bgmAudio.addEventListener('error', () => {
              console.warn(`Dayloom: ${trackUrl} gagal dimuat, mencoba fallback ${fallbackUrl}`);
              if (this.bgmAudio && this.currentPlayingTrack === targetTrack) {
                try {
                  this.bgmAudio.src = fallbackUrl;
                  this.bgmAudio.load();
                  const p = this.bgmAudio.play();
                  if (p && typeof p.catch === 'function') p.catch(() => {});
                } catch {}
              }
            });
          }

          const promise = this.bgmAudio.play();
          if (promise !== undefined && typeof promise.catch === 'function') {
            promise.catch((err) => {
              // Menangani kebijakan autoplay browser sebelum interaksi pengguna
              console.warn(`Dayloom: Autoplay ${targetTrack} menunggu interaksi pengguna:`, err);
            });
          }
        } else {
          this.bgmAudio = { url: trackUrl, loop: true, volume: this.bgmVolume, paused: false, pause() { this.paused = true; } };
        }
      } catch (err) {
        console.error(`Dayloom: Gagal memutar ${targetTrack}:`, err);
        this.bgmAudio = { url: trackUrl, loop: true, volume: this.bgmVolume, paused: false, pause() { this.paused = true; } };
      }
    } else {
      // Putar BGM 1 (Original Dayloom / Sakura Journey)
      const trackUrl = typeof urlOrTrack === 'string' && urlOrTrack !== 'bgm1' ? urlOrTrack : this.bgmUrl;
      try {
        if (typeof Audio !== 'undefined') {
          this.bgmAudio = new Audio(trackUrl);
          this.bgmAudio.loop = true;
          this.bgmAudio.volume = Math.max(0, Math.min(1, this.bgmVolume));

          const promise = this.bgmAudio.play();
          if (promise !== undefined && typeof promise.catch === 'function') {
            promise.catch(() => {});
          }
        } else {
          this.bgmAudio = { url: trackUrl, loop: true, volume: this.bgmVolume, paused: false, pause() { this.paused = true; } };
        }
      } catch {
        this.bgmAudio = { url: trackUrl, loop: true, volume: this.bgmVolume, paused: false, pause() { this.paused = true; } };
      }

      this.startSakuraJourneyLoop();
    }
  }

  /**
   * Mesin Sintesis Musik Latar "Sakura Journey" (Web Audio API):
   * Memadukan harmoni pentatonik Jepang (Yo / Hirajoshi lembut) dengan timbre Koto,
   * Piano hangat, dan Ambient String Pad yang menenangkan.
   */
  startSakuraJourneyLoop() {
    if (!this.enabled || !this.musicEnabled || typeof window === 'undefined') return;
    if (this.isBgmLoopActive && this.bgmLoopTimer !== null) return; // Cegah duplikasi loop

    this.isBgmLoopActive = true;
    const sequence = [
      // Bar 1: Fmaj7 / Dmin9 Sakura Dawn
      { note: 293.66, pad: 146.83, chime: 587.33, dur: 1.3 }, // D4
      { note: 329.63, pad: null,   chime: null,   dur: 0.9 }, // E4
      { note: 392.00, pad: 196.00, chime: 783.99, dur: 1.4 }, // G4
      { note: 440.00, pad: null,   chime: null,   dur: 1.1 }, // A4
      // Bar 2: Gentle River Breeze
      { note: 523.25, pad: 174.61, chime: 1046.5, dur: 1.5 }, // C5
      { note: 440.00, pad: null,   chime: null,   dur: 0.9 }, // A4
      { note: 392.00, pad: 130.81, chime: 587.33, dur: 1.3 }, // G4
      { note: 329.63, pad: null,   chime: null,   dur: 1.2 }, // E4
      // Bar 3: Nostalgic Shrine Lanterns
      { note: 261.63, pad: 130.81, chime: 523.25, dur: 1.4 }, // C4
      { note: 293.66, pad: null,   chime: null,   dur: 1.0 }, // D4
      { note: 329.63, pad: 164.81, chime: 659.25, dur: 1.4 }, // E4
      { note: 392.00, pad: null,   chime: null,   dur: 1.1 }, // G4
      // Bar 4: Warm Horizon Resolution
      { note: 440.00, pad: 146.83, chime: 880.00, dur: 1.6 }, // A4
      { note: 392.00, pad: null,   chime: null,   dur: 1.0 }, // G4
      { note: 329.63, pad: 110.00, chime: 659.25, dur: 1.5 }, // E4
      { note: 293.66, pad: null,   chime: null,   dur: 1.4 }  // D4
    ];

    const playStep = () => {
      if (!this.enabled || !this.musicEnabled || !this.isBgmLoopActive) return;
      const step = sequence[this.bgmStepIndex % sequence.length];
      this.bgmStepIndex = (this.bgmStepIndex + 1) % sequence.length;

      if (this.ctx && this.ctx.state === 'running' && this.bgmVolume > 0.005) {
        // Petikan Koto / Piano Hangat
        this.playMusicNote(step.note, step.dur, 'triangle', 0, 0.22);
        // Ambient String Pad Lembut
        if (step.pad) {
          this.playMusicNote(step.pad, step.dur * 2.1, 'sine', 0.02, 0.14);
        }
        // Lonceng Angin Furin / Celesta Halus
        if (step.chime) {
          this.playMusicNote(step.chime, step.dur * 0.85, 'sine', 0.18, 0.07);
        }
      }
    };

    playStep();
    this.bgmLoopTimer = setInterval(playStep, 1150);
  }

  stopSakuraJourneyLoop() {
    this.isBgmLoopActive = false;
    if (this.bgmLoopTimer !== null) {
      clearInterval(this.bgmLoopTimer);
      this.bgmLoopTimer = null;
    }
  }

  stopBGM() {
    this.stopSakuraJourneyLoop();
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch {}
      this.bgmAudio = null;
    }
    this.currentPlayingTrack = null;
  }

  getBgmTracks() {
    return BGM_TRACKS;
  }

  getBgmTrack() {
    return this.selectedBgmTrack || 'bgm1';
  }

  setBgmTrack(trackId) {
    const valid = ['bgm1', 'bgm2', 'bgm3'].includes(trackId) ? trackId : 'bgm1';
    const changed = this.selectedBgmTrack !== valid;
    this.selectedBgmTrack = valid;
    // Mengaktifkan musik secara otomatis jika pengguna secara eksplisit memilih track di antarmuka
    this.enabled = true;
    this.musicEnabled = true;
    if (this.bgmVolume <= 0.05) {
      this.bgmVolume = 0.40;
    }
    this.savePreference();

    if (changed || !this.bgmAudio || this.bgmAudio.paused) {
      this.playBGM(valid);
    }

    if (Array.isArray(this.onTrackChangeCallbacks)) {
      this.onTrackChangeCallbacks.forEach(fn => {
        try { fn(this.selectedBgmTrack); } catch {}
      });
    }

    return this.selectedBgmTrack;
  }

  onTrackChange(cb) {
    if (typeof cb === 'function') {
      this.onTrackChangeCallbacks = this.onTrackChangeCallbacks || [];
      this.onTrackChangeCallbacks.push(cb);
    }
  }

  setBGMVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, Number(vol) || 0));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
    this.savePreference();

    if (Array.isArray(this.onVolumeChangeCallbacks)) {
      this.onVolumeChangeCallbacks.forEach(fn => {
        try { fn(this.bgmVolume); } catch {}
      });
    }

    return this.bgmVolume;
  }

  onBgmVolumeChange(cb) {
    if (typeof cb === 'function') {
      this.onVolumeChangeCallbacks = this.onVolumeChangeCallbacks || [];
      this.onVolumeChangeCallbacks.push(cb);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, Number(vol) || 0));
    this.savePreference();
  }

  getVolume() {
    return typeof this.volume === 'number' ? this.volume : 0.35;
  }

  getBGMVolume() {
    return typeof this.bgmVolume === 'number' ? this.bgmVolume : 0.40;
  }

  isMusicEnabled() {
    return Boolean(this.musicEnabled);
  }

  isSFXEnabled() {
    return Boolean(this.sfxEnabled);
  }

  isEnabled() {
    return Boolean(this.enabled);
  }

  setMusicEnabled(flag) {
    this.musicEnabled = Boolean(flag);
    if (this.musicEnabled) {
      this.enabled = true;
      this.playBGM();
    } else {
      this.stopBGM();
      if (!this.sfxEnabled) this.enabled = false;
    }
    this.savePreference();
    return this.musicEnabled;
  }

  toggleMusic() {
    return this.setMusicEnabled(!this.musicEnabled);
  }

  setSFXEnabled(flag) {
    this.sfxEnabled = Boolean(flag);
    if (this.sfxEnabled) {
      this.enabled = true;
      this.playClick();
    } else {
      this.stopLobbyAmbience();
      if (!this.musicEnabled) this.enabled = false;
    }
    this.savePreference();
    return this.sfxEnabled;
  }

  toggleSFX() {
    return this.setSFXEnabled(!this.sfxEnabled);
  }

  initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          this.ctx = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    this.musicEnabled = this.enabled;
    this.sfxEnabled = this.enabled;
    this.savePreference();
    if (this.enabled) {
      this.playClick();
      this.playBGM();
    } else {
      this.stopBGM();
      this.stopLobbyAmbience();
    }
    return this.enabled;
  }

  playMusicNote(freq, duration = 1.0, type = 'sine', delay = 0, gainScale = 0.2) {
    if (!this.enabled || !this.musicEnabled) return;
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      const peak = Math.max(0.0005, this.bgmVolume * gainScale);
      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.04);
    } catch {
      // Safe fallback
    }
  }

  playTone(freq, duration = 0.12, type = 'triangle', delay = 0, gainScale = 1) {
    if (!this.enabled || !this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
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
    } catch {
      // Safe fallback
    }
  }

  /**
   * Suara Transisi Halus Memasuki Lobi Arena / Dojo Benteng Awan
   * Lonceng angin furin & hembusan sakura lembut.
   */
  playLobbyEnter() {
    this.playTone(587.33, 0.28, 'sine', 0, 0.35);    // D5
    this.playTone(880.00, 0.34, 'triangle', 0.08, 0.3); // A5
    this.playTone(1174.66, 0.45, 'sine', 0.16, 0.25); // D6 Furin Chime
  }

  /**
   * Ambiens Lobi Desa & Dojo: Hembusan angin lembut & lonceng bambu tenang.
   * Dijaga agar tidak pernah menumpuk meskipun masuk/keluar lobi berkali-kali.
   */
  playLobbyAmbience() {
    if (!this.enabled || !this.sfxEnabled || typeof window === 'undefined') return;
    if (this.isLobbyAmbienceActive && this.lobbyAmbienceTimer !== null) return;

    this.isLobbyAmbienceActive = true;
    const chimeNotes = [1046.5, 1174.66, 1318.51, 1567.98];
    let idx = 0;

    this.lobbyAmbienceTimer = setInterval(() => {
      if (!this.enabled || !this.sfxEnabled || !this.isLobbyAmbienceActive) return;
      if (this.ctx && this.ctx.state === 'running') {
        const f = chimeNotes[idx % chimeNotes.length];
        idx++;
        this.playTone(f, 0.55, 'sine', 0, 0.12);
        this.playTone(f * 0.5, 0.7, 'triangle', 0.12, 0.08);
      }
    }, 4200);
  }

  stopLobbyAmbience() {
    this.isLobbyAmbienceActive = false;
    if (this.lobbyAmbienceTimer !== null) {
      clearInterval(this.lobbyAmbienceTimer);
      this.lobbyAmbienceTimer = null;
    }
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

  /** Tebasan Dimensi Cepat (Void Basic / Q Rift Slash) */
  playVoidSlash() {
    this.playTone(659.25, 0.05, 'sine', 0, 0.45);
    this.playTone(329.63, 0.08, 'sawtooth', 0.02, 0.5);
    this.playTone(987.77, 0.06, 'triangle', 0.04, 0.4);
  }

  /** Eclipse Overdrive (Void R Ultimate) */
  playVoidOverdrive() {
    const notes = [246.94, 329.63, 493.88, 659.25, 987.77];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.2, 'triangle', idx * 0.045, 0.6);
    });
  }

  /** Tembakan Busur Peri Cahaya (Lancelot Basic Bow Attack) */
  playBowArrow() {
    this.playTone(783.99, 0.06, 'triangle', 0, 0.45);
    this.playTone(1174.66, 0.09, 'sine', 0.02, 0.5);
  }

  /** Tebasan Katana Shirojika (Lancelot Close-Range Sword Slash) */
  playShirojikaSlash() {
    this.playTone(587.33, 0.05, 'sawtooth', 0, 0.45);
    this.playTone(1046.5, 0.08, 'triangle', 0.02, 0.55);
  }

  /** Transformasi Wujud Rubah Merah "Shin" (Lancelot Q Skill) */
  playShinFoxTransform() {
    const notes = [523.25, 659.25, 880.0, 1046.5];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.14, 'triangle', idx * 0.04, 0.55);
    });
  }

  /** Shining Road — Sihir Hazy Moon (Lancelot R Ultimate) */
  playShiningRoad() {
    const chord = [587.33, 739.99, 880.0, 1174.66, 1479.98, 1760.0];
    chord.forEach((f, idx) => {
      this.playTone(f, 0.3, 'sine', idx * 0.05, 0.65);
    });
  }
}

export const sound = new SoundEngine();


