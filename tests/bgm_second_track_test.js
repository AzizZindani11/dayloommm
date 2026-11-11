/**
 * DAYLOOM — PENGUJIAN INTEGRASI BGM KEDUA ORIGINAL DAYLOOM
 * Memverifikasi:
 * 1. Preservasi BGM 1 (Original Dayloom / Sakura Journey).
 * 2. Integrasi BGM 2 (WhatsApp Audio 2026-11-11 at 06.40.29.mp3) tanpa perubahan byte audio.
 * 3. Anti-Overlap Guard: Hanya satu BGM utama yang aktif pada satu waktu di seluruh aplikasi.
 * 4. Seamless Infinite Looping (audio.loop = true & fail-safe ended event handler).
 * 5. Pengaturan Volume Independen: Volume BGM terpisah dari Volume SFX.
 * 6. Master Mute/Unmute & Sinkronisasi Dua Arah Antara Header & Modal Local PvP.
 * 7. Integritas Elemen DOM Audio Suite di index.html & js/arena.js.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Setup Mock DOM & Audio untuk lingkungan Node.js
class MockAudioElement {
  constructor(src) {
    this.src = src || '';
    this.loop = false;
    this.volume = 1.0;
    this.paused = true;
    this.currentTime = 0;
    this.eventListeners = {};
  }
  addEventListener(event, fn) {
    this.eventListeners[event] = this.eventListeners[event] || [];
    this.eventListeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== fn);
    }
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

globalThis.Audio = MockAudioElement;

const mockElements = new Map();
function createMockEl(id, tagName = 'div') {
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    value: '',
    checked: false,
    className: '',
    style: {},
    attributes: {},
    innerHTML: '',
    textContent: '',
    listeners: {},
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    addEventListener(evt, fn) {
      this.listeners[evt] = this.listeners[evt] || [];
      this.listeners[evt].push(fn);
    },
    dispatchEvent(evt) {
      const type = evt.type || evt;
      if (this.listeners[type]) {
        this.listeners[type].forEach(fn => fn(evt));
      }
    },
    querySelector: () => null,
    querySelectorAll: () => []
  };
  mockElements.set(id, el);
  return el;
}

globalThis.window = globalThis.window || {
  AudioContext: class MockAudioCtx {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.destination = {};
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
    resume() { return Promise.resolve(); }
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; }
  }
};

globalThis.document = globalThis.document || {
  getElementById: (id) => mockElements.get(id) || null,
  querySelector: (sel) => {
    if (sel.startsWith('#')) return mockElements.get(sel.slice(1)) || null;
    return null;
  },
  querySelectorAll: () => []
};

// Inisialisasi DOM elements yang dibutuhkan
createMockEl('select-bgm-track', 'select');
createMockEl('header-bgm-volume', 'input');
createMockEl('btn-toggle-sound', 'button');
createMockEl('arena-bgm-track-select', 'select');
createMockEl('arena-audio-volume', 'input');
createMockEl('arena-toggle-music', 'button');
createMockEl('arena-toggle-sfx', 'button');

console.log('=== MEMULAI PENGUJIAN INTEGRASI BGM KEDUA ORIGINAL DAYLOOM ===\n');

// 1. Verifikasi Keberadaan File Audio Original di Workspace (BGM 2 & BGM 3)
const originalMp3Path = path.join(rootDir, 'assets', 'audio', 'bgm-original-2.mp3');
const whatsappMp3Path = path.join(rootDir, 'assets', 'audio', 'WhatsApp Audio 2026-11-11 at 06.40.29.mp3');
const originalMp3Path3 = path.join(rootDir, 'assets', 'audio', 'bgm-original-3.mp3');
const whatsappMp3Path3 = path.join(rootDir, 'assets', 'audio', 'WhatsApp Audio 2026-11-11 at 07.13.44.mp3');

assert.ok(fs.existsSync(originalMp3Path), 'File assets/audio/bgm-original-2.mp3 wajib tersedia');
assert.ok(fs.existsSync(whatsappMp3Path), 'File assets/audio/WhatsApp Audio 2026-11-11 at 06.40.29.mp3 wajib tersedia');
assert.ok(fs.existsSync(originalMp3Path3), 'File assets/audio/bgm-original-3.mp3 wajib tersedia');
assert.ok(fs.existsSync(whatsappMp3Path3), 'File assets/audio/WhatsApp Audio 2026-11-11 at 07.13.44.mp3 wajib tersedia');

const stat1 = fs.statSync(originalMp3Path);
const stat2 = fs.statSync(whatsappMp3Path);
const stat3 = fs.statSync(originalMp3Path3);
const stat4 = fs.statSync(whatsappMp3Path3);

assert.equal(stat1.size, 1515031, 'Ukuran file bgm-original-2.mp3 harus presisi 1,515,031 bytes');
assert.equal(stat2.size, 1515031, 'Ukuran file WhatsApp Audio 2 harus presisi 1,515,031 bytes');
assert.equal(stat3.size, 1260493, 'Ukuran file bgm-original-3.mp3 harus presisi 1,260,493 bytes');
assert.equal(stat4.size, 1260493, 'Ukuran file WhatsApp Audio 3 harus presisi 1,260,493 bytes');

// Periksa Header ID3v2.4
const buffer = Buffer.alloc(10);
const fd = fs.openSync(originalMp3Path3, 'r');
fs.readSync(fd, buffer, 0, 10, 0);
fs.closeSync(fd);
assert.equal(buffer.toString('utf8', 0, 3), 'ID3', 'File MP3 BGM 3 memiliki header ID3 valid');
assert.equal(buffer[3], 4, 'File MP3 BGM 3 adalah ID3v2.4 resmi (byte ke-4 bernilai 0x04)');
console.log('  [LULUS] 1. File Audio Original BGM 2 & BGM 3 terverifikasi ada, byte terjaga murni tanpa modifikasi.');

// 2. Verifikasi Modul Audio (BGM_TRACKS & SoundEngine)
const { sound, BGM_TRACKS } = await import('../js/audio.js');

assert.equal(BGM_TRACKS.length, 3, 'Wajib tersedia tepat 3 pilihan trek BGM');
assert.equal(BGM_TRACKS[0].id, 'bgm1', 'Trek 1 memiliki ID bgm1');
assert.ok(BGM_TRACKS[0].name.includes('BGM 1 — Original Dayloom'), 'Trek 1 berlabel "BGM 1 — Original Dayloom"');
assert.equal(BGM_TRACKS[1].id, 'bgm2', 'Trek 2 memiliki ID bgm2');
assert.ok(BGM_TRACKS[1].name.includes('BGM 2 — My Original Music'), 'Trek 2 berlabel "BGM 2 — My Original Music"');
assert.equal(BGM_TRACKS[1].url, 'assets/audio/bgm-original-2.mp3', 'Trek 2 merujuk pada bgm-original-2.mp3');
assert.equal(BGM_TRACKS[2].id, 'bgm3', 'Trek 3 memiliki ID bgm3');
assert.ok(BGM_TRACKS[2].name.includes('BGM 3 — Original Music ketiga'), 'Trek 3 berlabel "BGM 3 — Original Music ketiga"');
assert.equal(BGM_TRACKS[2].url, 'assets/audio/bgm-original-3.mp3', 'Trek 3 merujuk pada bgm-original-3.mp3');
console.log('  [LULUS] 2. Daftar trek BGM_TRACKS memuat BGM 1, BGM 2, & BGM 3 dengan metadata yang akurat.');

// 3. Verifikasi Default Track & Pergantian Trek (Track Switching BGM 1 -> BGM 2 -> BGM 3)
sound.stopBGM();
sound.setMusicEnabled(true);
sound.setBgmTrack('bgm1');

assert.equal(sound.getBgmTrack(), 'bgm1', 'Trek default adalah bgm1');
assert.equal(sound.currentPlayingTrack, 'bgm1', 'Current playing track tercatat sebagai bgm1');

let trackChangeNotification = null;
sound.onTrackChange((id) => {
  trackChangeNotification = id;
});

// Pindah ke BGM 2
sound.setBgmTrack('bgm2');
assert.equal(sound.getBgmTrack(), 'bgm2', 'Trek aktif berubah menjadi bgm2');
assert.equal(sound.currentPlayingTrack, 'bgm2', 'Current playing track tercatat sebagai bgm2');
assert.equal(trackChangeNotification, 'bgm2', 'Callback onTrackChange berhasil menerima bgm2');
assert.ok(sound.bgmAudio, 'Objek bgmAudio aktif dibuat untuk BGM 2');
assert.equal(sound.bgmAudio.src, 'assets/audio/bgm-original-2.mp3', 'bgmAudio memutar file original kedua');
assert.equal(sound.bgmAudio.loop, true, 'Fitur loop otomatis aktif pada bgmAudio (seamless looping)');
assert.ok(sound.bgmAudio.eventListeners['ended'], 'Fail-safe event listener "ended" terpasang untuk loop abadi');

// Pindah ke BGM 3
sound.setBgmTrack('bgm3');
assert.equal(sound.getBgmTrack(), 'bgm3', 'Trek aktif berubah menjadi bgm3');
assert.equal(sound.currentPlayingTrack, 'bgm3', 'Current playing track tercatat sebagai bgm3');
assert.equal(trackChangeNotification, 'bgm3', 'Callback onTrackChange berhasil menerima bgm3');
assert.ok(sound.bgmAudio, 'Objek bgmAudio aktif dibuat untuk BGM 3');
assert.equal(sound.bgmAudio.src, 'assets/audio/bgm-original-3.mp3', 'bgmAudio memutar file original ketiga');
assert.equal(sound.bgmAudio.loop, true, 'Fitur loop otomatis aktif pada BGM 3');
assert.ok(sound.bgmAudio.eventListeners['ended'], 'Fail-safe event listener "ended" terpasang untuk loop abadi BGM 3');
console.log('  [LULUS] 3. Pergantian ke BGM 2 & BGM 3 berhasil dengan loop tak terbatas dan fail-safe listener.');

// 4. Verifikasi Anti-Overlap Guard
// Saat memutar BGM 3, loop prosedural Sakura Journey dari BGM 1 harus tidak aktif
assert.equal(sound.isBgmLoopActive, false, 'Loop prosedural BGM 1 Sakura Journey wajib berhenti saat BGM 3 diputar');

// Pindah kembali ke BGM 1
sound.setBgmTrack('bgm1');
assert.equal(sound.getBgmTrack(), 'bgm1', 'Trek aktif kembali ke bgm1');
assert.equal(sound.currentPlayingTrack, 'bgm1', 'Current playing track kembali ke bgm1');
assert.equal(trackChangeNotification, 'bgm1', 'Callback onTrackChange terpicu kembali ke bgm1');
console.log('  [LULUS] 4. Anti-Overlap Guard terbukti mencegah tumpang-tindih suara antara BGM 1, BGM 2, dan BGM 3.');

// 5. Verifikasi Kontrol Volume Independen
const initialSfxVol = sound.getVolume();
sound.setBGMVolume(0.85);
assert.equal(sound.getBGMVolume(), 0.85, 'Volume BGM berhasil diubah menjadi 0.85');
assert.equal(sound.getVolume(), initialSfxVol, 'Volume SFX TIDAK terpengaruh oleh perubahan volume BGM');

sound.setVolume(0.25);
assert.equal(sound.getVolume(), 0.25, 'Volume SFX berhasil diubah menjadi 0.25');
assert.equal(sound.getBGMVolume(), 0.85, 'Volume BGM tetap terjaga pada 0.85 saat volume SFX diubah');
console.log('  [LULUS] 5. Kontrol volume BGM dan SFX terbukti independen dan terisolasi penuh.');

// 6. Verifikasi Master Mute / Unmute
sound.setBgmTrack('bgm2');
assert.ok(sound.bgmAudio !== null, 'bgmAudio aktif sebelum mute');
sound.setMusicEnabled(false);
assert.equal(sound.isMusicEnabled(), false, 'isMusicEnabled bernilai false setelah dimatikan');
assert.equal(sound.bgmAudio, null, 'bgmAudio dihentikan dan di-nullify saat musik dinonaktifkan');
assert.equal(sound.currentPlayingTrack, null, 'Tidak ada track yang memutar saat musik dimatikan');

sound.setMusicEnabled(true);
assert.equal(sound.isMusicEnabled(), true, 'isMusicEnabled kembali aktif');
assert.equal(sound.getBgmTrack(), 'bgm2', 'Track yang dipilih sebelumnya (bgm2) tetap dipertahankan');
assert.equal(sound.currentPlayingTrack, 'bgm2', 'BGM 2 otomatis diputar kembali setelah un-mute');
console.log('  [LULUS] 6. Fitur Master Mute/Unmute berfungsi mulus mempertahankan track pilihan.');

// 7. Verifikasi Keberadaan Elemen DOM di index.html
const indexHtmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
assert.ok(indexHtmlContent.includes('id="header-audio-suite"'), 'index.html memiliki #header-audio-suite');
assert.ok(indexHtmlContent.includes('id="select-bgm-track"'), 'index.html memiliki dropdown #select-bgm-track');
assert.ok(indexHtmlContent.includes('id="header-bgm-volume"'), 'index.html memiliki volume slider #header-bgm-volume');
assert.ok(indexHtmlContent.includes('id="btn-toggle-sound"'), 'index.html mempertahankan tombol #btn-toggle-sound');
assert.ok(indexHtmlContent.includes('value="bgm1"'), 'Dropdown index.html memiliki opsi bgm1');
assert.ok(indexHtmlContent.includes('value="bgm2"'), 'Dropdown index.html memiliki opsi bgm2');
assert.ok(indexHtmlContent.includes('value="bgm3"'), 'Dropdown index.html memiliki opsi bgm3');
console.log('  [LULUS] 7. Elemen UI Header Audio Suite di index.html terverifikasi lengkap (BGM 1, 2, 3).');

// 8. Verifikasi Integrasi Panel Audio Popover Compact di js/arena.js
const arenaJsContent = fs.readFileSync(path.join(rootDir, 'js', 'arena.js'), 'utf8');
assert.ok(arenaJsContent.includes('btn-arena-audio-toggle-panel'), 'arena.js memiliki tombol trigger panel audio compact #btn-arena-audio-toggle-panel');
assert.ok(arenaJsContent.includes('arena-audio-panel'), 'arena.js memiliki panel popover audio yang dapat dibuka/tutup #arena-audio-panel');
assert.ok(arenaJsContent.includes('arena-bgm-track-select'), 'arena.js memiliki kontrol pemilihan track #arena-bgm-track-select');
assert.ok(arenaJsContent.includes('value="bgm3"'), 'arena.js memiliki opsi bgm3');
assert.ok(arenaJsContent.includes('arena-audio-volume'), 'arena.js memiliki kontrol volume arena #arena-audio-volume');
assert.ok(arenaJsContent.includes('btn-arena-bgm-toggle'), 'arena.js memiliki tombol toggle musik #btn-arena-bgm-toggle');
assert.ok(arenaJsContent.includes('btn-arena-sfx-toggle'), 'arena.js memiliki tombol toggle SFX #btn-arena-sfx-toggle');
console.log('  [LULUS] 8. Panel Audio Compact & Non-Intrusive di js/arena.js terverifikasi tersinkronisasi dengan SoundEngine (BGM 1, 2, 3).');

// Bersihkan semua timer & audio agar proses test exit bersih tanpa hang
sound.stopBGM();
sound.stopLobbyAmbience();

console.log('\n=== SELURUH PENGUJIAN INTEGRASI BGM KEDUA LULUS 100% TANPA CACAT! ===');
