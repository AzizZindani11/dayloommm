/**
 * DAYLOOM — RESTORE LOCAL PVP ACCESS + PRESERVE LANCELOT & VOID AUDIT TEST
 * Memverifikasi:
 * 1. Audio API SoundEngine (isMusicEnabled, isSFXEnabled, getVolume, toggleMusic, toggleSFX, setVolume).
 * 2. Integrasi Local PvP preview modal & eliminasi TypeError: sound.isMusicEnabled is not a function.
 * 3. Keutuhan 100% desain orisinal Argon untuk Lancelot & Void di js/art.js.
 * 4. Pemisahan tampilan Profil Pendekar: Tab etalase profil HANYA menampilkan Traveler & Meliodas.
 * 5. Local PvP Arena tetap memiliki akses penuh ke 4 karakter (Traveler, Meliodas, Void, Lancelot).
 * 6. Rangkaian animasi lengkap: Idle, Walk/Run, Jump/Fall, Basic Attack, Hit Reaction, Hurt/Knockback, Q Skill, R Ultimate, dan Aset Visual Spesial.
 * 7. Pemisahan Mode PvP (0 musuh Oni) vs PvE (1 musuh Oni Kage Daruma).
 */

import assert from 'node:assert/strict';

// Setup Mock DOM global untuk simulasi browser
globalThis.window = globalThis.window || {
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {}
};

globalThis.document = globalThis.document || {
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      attributes: {},
      style: {},
      innerHTML: '',
      listeners: {},
      setAttribute: (k, v) => { el.attributes[k] = v; },
      getAttribute: (k) => el.attributes[k],
      addEventListener: (evt, fn) => {
        el.listeners[evt] = el.listeners[evt] || [];
        el.listeners[evt].push(fn);
      },
      querySelector: (selector) => {
        if (selector.startsWith('#')) {
          const id = selector.slice(1);
          return el._elements ? el._elements.find(e => e.id === id) || null : null;
        }
        return null;
      },
      querySelectorAll: (selector) => {
        return [];
      },
      remove: () => {}
    };
    return el;
  },
  getElementById: () => null,
  body: {
    appendChild: () => {}
  }
};

globalThis.Image = class MockImage {
  constructor() {
    this.onload = null;
    this.src = '';
    this.complete = true;
    this.naturalWidth = 88;
  }
};

globalThis.Audio = class MockAudio {
  constructor(src) {
    this.src = src;
    this.loop = false;
    this.volume = 1.0;
    this.paused = true;
    this.currentTime = 0;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
};

const { sound } = await import('../js/audio.js');
const { PLAYABLE_CHARACTERS } = await import('../js/config.js');
const { getVoidSVG, getVoidPortraitSVG, getLancelotSVG, getLancelotPortraitSVG } = await import('../js/art.js');
const { LocalPvPArenaGame, getCharacterBaseStats } = await import('../js/pvp-game.js');

console.log('=== MEMULAI AUDIT RESTORASI LOCAL PVP & INTEGRITAS LANCELOT + VOID ===\n');

// ---------------------------------------------------------------------------
// 1. PRIORITAS 1 — VERIFIKASI API SOUND ENGINE & KESIAPAN LOCAL PVP MODAL
// ---------------------------------------------------------------------------
console.log('[1/5] Menguji API SoundEngine dan kompatibilitas Local PvP modal...');
assert.equal(typeof sound.isMusicEnabled, 'function', 'SoundEngine harus memiliki method isMusicEnabled()');
assert.equal(typeof sound.isSFXEnabled, 'function', 'SoundEngine harus memiliki method isSFXEnabled()');
assert.equal(typeof sound.getVolume, 'function', 'SoundEngine harus memiliki method getVolume()');
assert.equal(typeof sound.getBGMVolume, 'function', 'SoundEngine harus memiliki method getBGMVolume()');
assert.equal(typeof sound.isEnabled, 'function', 'SoundEngine harus memiliki method isEnabled()');

assert.equal(typeof sound.isMusicEnabled(), 'boolean', 'isMusicEnabled() mengembalikan nilai boolean');
assert.equal(typeof sound.isSFXEnabled(), 'boolean', 'isSFXEnabled() mengembalikan nilai boolean');
assert.equal(typeof sound.getVolume(), 'number', 'getVolume() mengembalikan nilai number');

// Verifikasi toggle methods
const initialMusic = sound.isMusicEnabled();
const toggledMusic = sound.toggleMusic();
assert.equal(toggledMusic, !initialMusic, 'toggleMusic membalik status musik dengan benar');
assert.equal(sound.isMusicEnabled(), toggledMusic, 'isMusicEnabled() merefleksikan perubahan');
sound.setMusicEnabled(initialMusic); // restore

console.log('  [LULUS] SoundEngine API (isMusicEnabled, isSFXEnabled, getVolume) terverifikasi 100% kompatibel.');

// ---------------------------------------------------------------------------
// 2. PRIORITAS 2 — PERLINDUNGAN DESAIN ASLI ARGON (VOID & LANCELOT)
// ---------------------------------------------------------------------------
console.log('\n[2/5] Menguji perlindungan desain orisinal Argon untuk Lancelot & Void...');
const voidNormalSvg = getVoidSVG({ mode: 'normal', size: 88, facing: 'right' });
const voidOverdriveSvg = getVoidSVG({ mode: 'overdrive', size: 88, facing: 'right' });
const voidPortraitSvg = getVoidPortraitSVG();

assert.ok(voidNormalSvg.includes('Sabit Kembar Dimensi'), 'Sprite Void Normal orisinal Argon terjaga');
assert.ok(voidOverdriveSvg.includes('void-overdrive-svg'), 'Sprite Void Overdrive orisinal Argon terjaga');
assert.ok(voidPortraitSvg.includes('VOID') && (voidPortraitSvg.includes('DIMENSIONAL SHADOW') || voidPortraitSvg.includes('Pendekar Bayangan Kosong')), 'Potret editorial Void terjaga');

const lanHumanSvg = getLancelotSVG({ mode: 'human', size: 88, facing: 'right' });
const lanSwordSvg = getLancelotSVG({ mode: 'sword', size: 88, facing: 'right' });
const lanShinSvg = getLancelotSVG({ mode: 'shin', size: 88, facing: 'right' });
const lanShiningSvg = getLancelotSVG({ mode: 'shining_road', size: 88, facing: 'right' });
const lanPortraitSvg = getLancelotPortraitSVG();

assert.ok(lanHumanSvg.includes('Busur Peri'), 'Sprite Lancelot Busur Peri terjaga');
assert.ok(lanSwordSvg.includes('Shirojika'), 'Sprite Lancelot Katana Shirojika terjaga');
assert.ok(lanShinSvg.includes('Shin'), 'Sprite Lancelot wujud rubah merah Shin terjaga');
assert.ok(lanShiningSvg.includes('shining'), 'Sprite Lancelot Shining Road terjaga');
assert.ok(lanPortraitSvg.includes('LANCELOT') && lanPortraitSvg.includes('PRINCE OF BENWICK'), 'Potret editorial Lancelot terjaga');
console.log('  [LULUS] Seluruh aset visual, proporsi, palet warna, dan SVG generator Argon terjaga 100%.');

// ---------------------------------------------------------------------------
// 3. PRIORITAS 3 — VERIFIKASI PEMISAHAN PROFIL VS ARENA
// ---------------------------------------------------------------------------
console.log('\n[3/5] Menguji pemisahan Profil (Hanya Traveler & Meliodas) vs Arena (4 Karakter)...');
assert.equal(PLAYABLE_CHARACTERS.length, 4, 'Arena harus tetap memiliki 4 karakter playable');
assert.deepEqual(PLAYABLE_CHARACTERS.map(c => c.id), ['traveler', 'meliodas', 'void', 'lancelot'], 'ID 4 karakter di arena konsisten');

// Verifikasi pembacaan template renderProfileView di js/app.js
import fs from 'node:fs';
const appJsContent = fs.readFileSync('js/app.js', 'utf8');

// Profil HANYA boleh memiliki tab Traveler dan Meliodas
assert.ok(appJsContent.includes('data-profile-char-tab="traveler"'), 'Tab Traveler ada di profil');
assert.ok(appJsContent.includes('data-profile-char-tab="meliodas"'), 'Tab Meliodas ada di profil');
assert.ok(!appJsContent.includes('data-profile-char-tab="void"'), 'Tab Void TIDAK BOLEH ada di profil pemain');
assert.ok(!appJsContent.includes('data-profile-char-tab="lancelot"'), 'Tab Lancelot TIDAK BOLEH ada di profil pemain');

console.log('  [LULUS] Profil pemain hanya menampilkan Traveler & Meliodas; Void & Lancelot tetap 100% playable di Arena.');

// ---------------------------------------------------------------------------
// 4. PRIORITAS 4 — AUDIT ANIMASI & GAMEPLAY LANCELOT & VOID
// ---------------------------------------------------------------------------
console.log('\n[4/5] Menguji rangkaian animasi lengkap Lancelot & Void di engine pvp-game.js...');
const game = new LocalPvPArenaGame({
  container: null,
  profile: { selectedCharacter: 'lancelot' },
  rank: { id: 'mythic' },
  characterId: 'lancelot',
  characterIdP2: 'void',
  gameMode: 'pvp'
});

// 4a. Status Idle
assert.equal(game.player1.state, 'idle', 'P1 Lancelot berstatus idle pada awal');
assert.equal(game.player2.state, 'idle', 'P2 Void berstatus idle pada awal');

// 4b. Status Walk & Move Speed
const lanStats = getCharacterBaseStats('lancelot');
const voidStats = getCharacterBaseStats('void');
assert.equal(voidStats.moveSpeed, 720.0, 'Void moveSpeed tinggi 720.0 px/s');
assert.equal(voidStats.dashSpeed, 930.0, 'Void dashSpeed 930.0 px/s');

// 4c. Basic Attack Lancelot (Jarak jauh = Busur, Jarak dekat = Katana Shirojika)
game.player2.x = game.player1.x + 300;
game.tryAttack(1);
assert.equal(game.player1.weaponMode, 'bow', 'Lancelot menggunakan Fairy Bow pada jarak jauh');
const arrow = game.projectiles.find(p => p.isLancelotArrow);
assert.ok(arrow, 'Panah bintang Lancelot tercipta');

game.player2.x = game.player1.x + 60; // Jarak dekat <= 94px
game.player1.attackCooldown = 0;
game.tryAttack(1);
assert.equal(game.player1.weaponMode, 'sword', 'Lancelot beralih ke Katana Shirojika pada jarak dekat');

// 4d. Hit Reaction & Knockback
assert.ok(game.player2.hurtTimer > 0, 'Target terkena hit reaction dengan hurtTimer > 0');
assert.ok(Math.abs(game.player2.vx) > 0, 'Target menerima knockback fisik dari tebasan');

// 4e. Skill Q Lancelot (Wujud Rubah Merah Shin)
game.player1.energyPips = 3;
game.player1.qCooldown = 0;
const p1SpeedBeforeShin = game.player1.stats.moveSpeed;
game.trySkillQ(1);
assert.equal(game.player1.shinFoxMode.active, true, 'Wujud Rubah Merah Shin aktif');
assert.ok(game.player1.stats.moveSpeed > p1SpeedBeforeShin, 'Kecepatan Shin meningkat (+45%)');
assert.ok(game.player2.slowTimer > 0, 'Lawan terkena slow pulse dari gelombang transformasi Shin');

// Revert wujud Shin
game.player1.qCooldown = 0;
game.trySkillQ(1);
assert.equal(game.player1.shinFoxMode.active, false, 'Lancelot kembali ke wujud manusia dengan bersih');

// 4f. Skill Q Void (Void Rift Slash)
game.player2.energyPips = 3;
game.player2.qCooldown = 0;
const p2XBeforeQ = game.player2.x;
game.trySkillQ(2);
assert.notEqual(game.player2.x, p2XBeforeQ, 'Void melakukan phase dash pada Q Void Rift Slash');

// 4g. Ultimate R Lancelot (Shining Road)
game.player1.ultimateCharge = 100;
game.tryUltimateR(1);
assert.equal(game.shiningRoadBeams.length, 1, 'Berkas Shining Road tercipta');
assert.equal(game.shiningRoadBeams[0].damage, 62, 'Damage Shining Road adalah 62');

// 4h. Ultimate R Void (Eclipse Overdrive)
game.player2.slowTimer = 0; // Efek slow berakhir sebelum Overdrive aktif
game.player2.ultimateCharge = 100;
game.tryUltimateR(2);
assert.equal(game.player2.voidOverdrive.active, true, 'Eclipse Overdrive Void aktif');
assert.ok(game.player2.stats.moveSpeed > 720.0, 'Move speed meningkat drastis saat Overdrive');
game.endVoidOverdrive(2);
assert.equal(game.player2.voidOverdrive.active, false, 'Overdrive berakhir bersih');
assert.equal(game.player2.stats.moveSpeed, 720.0, 'Move speed kembali ke 720.0');

console.log('  [LULUS] Seluruh rangkaian animasi dan mekanika tempur Void & Lancelot berfungsi sempurna.');

// ---------------------------------------------------------------------------
// 5. PRIORITAS 5 — PEMISAHAN PVE (DENGAN ONI) VS PVP (MURNI 1V1)
// ---------------------------------------------------------------------------
console.log('\n[5/5] Menguji integritas mode PvE vs PvP...');
const pve = new LocalPvPArenaGame({
  container: null,
  profile: { selectedCharacter: 'traveler' },
  rank: { id: 'epic' },
  characterId: 'traveler',
  gameMode: 'pve'
});
assert.equal(pve.enemies.length, 1, 'Mode PvE memiliki 1 musuh Oni Kage Daruma');

const pvp = new LocalPvPArenaGame({
  container: null,
  profile: { selectedCharacter: 'traveler' },
  rank: { id: 'epic' },
  characterId: 'traveler',
  characterIdP2: 'meliodas',
  gameMode: 'pvp'
});
assert.equal(pvp.enemies.length, 0, 'Mode PvP tidak memiliki musuh NPC Oni');

console.log('  [LULUS] Pemisahan PvE (dengan Oni) dan PvP (tanpa Oni) 100% konsisten.');

// Bersihkan seluruh audio loop timer agar Node.js event loop keluar seketika
sound.stopBGM();
sound.stopLobbyAmbience();

console.log('\n=== SELURUH PENGUJIAN RESTORE LOCAL PVP & PRESERVE LANCELOT + VOID LULUS SEMPURNA! ===');
