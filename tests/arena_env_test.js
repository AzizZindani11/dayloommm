/**
 * DAYLOOM — Pengujian Komprehensif:
 * 1. Phase 1: Restorasi Traveler In-Game & Penyempurnaan Ultimate R (Inferno Domain Perimeter Fire)
 * 2. Phase 2: Karakter Baru Meliodas (Normal & Assault Mode) + Pedang Suci Lostvayne (5 Lubang Bilah)
 * 3. Phase 3: Gameplay Meliodas (Basic Attack Lostvayne, Q Hellblaze Tanah + Erupsi, R Assault Mode 10d 150%)
 * 4. Phase 4: Integrasi Karusel Karakter di Arena Dojo & Potret Normal Meliodas di Profil
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== MEMULAI PENGUJIAN RESTORASI TRAVELER, MELIODAS PLAYABLE, & LOCAL PVP ARENA ===\n');

// 1. Verifikasi Normalisasi Latar Belakang di index.html
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
assert.ok(!html.includes('id="arena-environment-stage"'), 'Wadah terisolasi arena-environment-stage berhasil dihapus untuk normalisasi');
assert.ok(html.includes('id="view-arena"'), 'Section view-arena tetap ada');
assert.ok(html.includes('css/arena-env.css'), 'Stylesheet arena-env.css harus terhubung di head');
console.log('  [LULUS] 1. Latar belakang Arena dinormalisasi mengikuti atmosfer Dayloom global.');

// 2. Verifikasi File CSS Visual Local PvP Arena, Karusel Karakter, & Floating Viewport
const css = fs.readFileSync(path.join(rootDir, 'css/arena-env.css'), 'utf8');
assert.ok(css.includes('.local-pvp-section'), 'CSS harus memiliki rule .local-pvp-section');
assert.ok(css.includes('.pvp-banner-svg'), 'CSS harus mendukung ilustrasi .pvp-banner-svg 2D bergaya Dayloom');
assert.ok(css.includes('.arena-character-carousel'), 'CSS harus mendukung karusel pemilihan karakter di Profil Pendekar');
assert.ok(css.includes('.pvp-floating-frame'), 'CSS harus memiliki floating frame ~80%');
assert.ok(css.includes('#pvp-arena-canvas'), 'CSS harus menata kanvas interaktif');
console.log('  [LULUS] 2. Stylesheet Banner 2D SVG, Karusel Karakter, Floating Frame & Canvas Viewport terverifikasi.');

// 3. Verifikasi Phase 1 & Phase 4 pada Kode Sumber (Restorasi Traveler, Karusel Arena, & Etalase Profil)
const arenaJs = fs.readFileSync(path.join(rootDir, 'js/arena.js'), 'utf8');
const gameJs = fs.readFileSync(path.join(rootDir, 'js/pvp-game.js'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'js/app.js'), 'utf8');

assert.ok(gameJs.includes('getCharacterSVG'), 'pvp-game.js menggunakan getCharacterSVG resmi Dayloom untuk Traveler yang direstorasi');
assert.ok(!gameJs.includes('getEnhancedTravelerSVG'), 'getEnhancedTravelerSVG telah dihapus untuk mengembalikan tampilan Traveler Argon sebelumnya');
assert.ok(gameJs.includes('renderInfernoDomainForegroundFlames'), 'Inferno Domain menggunakan api perimeter di sekitar kaki dan sisi tubuh Traveler');
assert.ok(arenaJs.includes('arena-character-carousel'), 'Profil Pendekar di Arena memiliki karusel pemilihan karakter (Traveler & Meliodas)');
assert.ok(appJs.includes('assets/characters/adventurer-illustration.jpg'), 'Potret resmi Traveler di halaman Profil tetap terjaga utuh');
assert.ok(appJs.includes('getMeliodasPortraitSVG'), 'Halaman Profil mengintegrasikan potret Normal Meliodas berdampingan dengan Traveler');
console.log('  [LULUS] 3. Restorasi Traveler, karusel karakter Arena Dojo, dan integrasi Profil terverifikasi.');

// 4. Verifikasi Phase 2: Art SVG Meliodas (Normal & Assault Mode) & Pedang Lostvayne
const { getMeliodasSVG, getMeliodasPortraitSVG, getLostvayneSVG } = await import('../js/art.js');
const { PLAYABLE_CHARACTERS } = await import('../js/config.js');

assert.equal(PLAYABLE_CHARACTERS.length, 4, 'Terdapat 4 karakter playable resmi: Traveler, Meliodas, Void, dan Lancelot');
assert.deepEqual(PLAYABLE_CHARACTERS.map(c => c.id), ['traveler', 'meliodas', 'void', 'lancelot']);

const lostvayneSvg = getLostvayneSVG();
assert.ok(lostvayneSvg.includes('#143D30'), 'Lostvayne memiliki punggung bilah hijau tua khas');
assert.ok(lostvayneSvg.includes('#E5B84B'), 'Lostvayne memiliki pelindung tangan (guard) emas berukir');
const holeMatches = lostvayneSvg.match(/fill="#1E293B"/g) || [];
assert.equal(holeMatches.length, 5, 'Bilah Lostvayne wajib memiliki tepat 5 lubang sirkular khas di sepanjang batas bilah');

const melNormalSvg = getMeliodasSVG({ mode: 'normal', size: 88, facing: 'right' });
const melAssaultSvg = getMeliodasSVG({ mode: 'assault', size: 88, facing: 'right' });
const melPortraitSvg = getMeliodasPortraitSVG();

assert.ok(melNormalSvg.includes('#143D30'), 'Meliodas Normal memegang pedang suci Lostvayne dan mengenakan seragam Boar Hat');
assert.ok(melAssaultSvg.includes('#12091E'), 'Meliodas Assault Mode memiliki selubung energi iblis gelap & tanda klan iblis');
assert.ok(melPortraitSvg.includes('MELIODAS'), 'Potret Profil Meliodas menampilkan wujud Normal memegang Lostvayne');
assert.ok(!melPortraitSvg.includes('ASSAULT MODE'), 'Potret Profil permanen Meliodas TIDAK menggunakan wujud Assault Mode');
console.log('  [LULUS] 4. Ilustrasi SVG Meliodas (Normal, Assault Mode, Potret Profil) & 5 lubang bilah Lostvayne terverifikasi.');

// 5. Pengujian Unit Fungsional Engine Tempur (Traveler & Meliodas)
globalThis.window = globalThis.window || {
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.Image = class MockImage {
  constructor() {
    this.onload = null;
    this.src = '';
    this.complete = true;
    this.naturalWidth = 88;
  }
};

const { LocalPvPArenaGame } = await import('../js/pvp-game.js');

// --- 5A. Uji Traveler: Q Phoenix Blast & R Inferno Domain ---
const travelerGame = new LocalPvPArenaGame({
  container: null,
  profile: { selectedCharacter: 'traveler' },
  rank: { id: 'epic' },
  characterId: 'traveler',
  gameMode: 'pve'
});

assert.equal(travelerGame.characterId, 'traveler', 'Karakter awal adalah Traveler');
assert.equal(travelerGame.player.energyPips, 3, 'Traveler memulai dengan 3 orb energi skill penuh');

const tq1 = travelerGame.trySkillQ();
assert.equal(tq1, true, 'Penggunaan Q pertama Traveler berhasil');
assert.equal(travelerGame.player.energyPips, 2, 'Orb berkurang menjadi 2');
assert.equal(travelerGame.phoenixProjectiles.length, 1, 'Proyektil Phoenix Blast diluncurkan');

travelerGame.player.ultimateCharge = 90;
assert.equal(travelerGame.tryUltimateR(), false, 'Inferno Domain gagal diaktifkan sebelum 100%');
travelerGame.player.ultimateCharge = 100;
assert.equal(travelerGame.tryUltimateR(), true, 'Inferno Domain aktif saat ultimateCharge === 100%');
assert.equal(travelerGame.player.ultimateCharge, 0, 'Gauge langsung di-reset ke 0%');
assert.equal(travelerGame.player.infernoDomain.active, true, 'Status infernoDomain.active bernilai true');

const tEnemy = travelerGame.enemies[0];
tEnemy.x = travelerGame.player.x + 50;
tEnemy.y = travelerGame.player.y;
const hpBeforeBurn = tEnemy.hp;
travelerGame.update(0.5);
assert.ok(tEnemy.hp < hpBeforeBurn, 'Inferno Domain memberikan periodic AoE burn damage pada musuh di dekat Traveler');
console.log('  [LULUS] 5a. Traveler: Phoenix Blast (Q) dan Inferno Domain (R) berfungsi sempurna.');

// --- 5B. Uji Meliodas: Basic Attack Lostvayne & Q Hellblaze (Merambat di Tanah + Erupsi Vertikal) ---
const melGame = new LocalPvPArenaGame({
  container: null,
  profile: { selectedCharacter: 'meliodas' },
  rank: { id: 'mythic' },
  characterId: 'meliodas',
  gameMode: 'pve'
});

assert.equal(melGame.characterId, 'meliodas', 'Meliodas berhasil dimuat sebagai karakter playable');
assert.equal(melGame.player.baseStats.basicAttackDamage, 18, 'Damage dasar Lostvayne Meliodas adalah 18');
assert.equal(melGame.player.baseStats.skillDamage, 44, 'Damage dasar Hellblaze Meliodas adalah 44');

// Tempatkan musuh dalam jarak tebasan dekat Lostvayne (di dalam area patroli 670..1060)
const mEnemy = melGame.enemies[0];
melGame.player.x = 700;
melGame.player.y = 516;
melGame.player.facing = 'right';
mEnemy.x = 755;
mEnemy.y = 516;

const hpBeforeSlash = mEnemy.hp;
melGame.tryAttack();
assert.equal(melGame.lostvayneSlashes.length, 1, 'Ayunan pedang Lostvayne menghasilkan efek tebasan');
assert.equal(mEnemy.hp, hpBeforeSlash - 18, 'Tebasan jarak dekat Lostvayne memberikan tepat 18 damage pada mode Normal');

// Uji Skill Q Meliodas: Hellblaze merambat di sepanjang permukaan tanah lalu meledak ke atas saat mencapai musuh
mEnemy.x = 840;
mEnemy.hp = 240;
melGame.player.qCooldown = 0;
melGame.player.energyPips = 3;

const hq = melGame.trySkillQ();
assert.equal(hq, true, 'Skill Q Hellblaze berhasil diaktifkan');
assert.equal(melGame.player.energyPips, 2, 'Hellblaze mengonsumsi tepat 1 orb energi Q');
assert.equal(melGame.hellblazeWaves.length, 1, 'Gelombang api Hellblaze tercipta di permukaan tanah');
assert.equal(melGame.hellblazeWaves[0].y, 580, 'Hellblaze merambat menempel di permukaan lantai utama (y=580)');

// Simulasikan pergerakan gelombang Hellblaze di tanah hingga mencapai musuh dan memicu erupsi vertikal
for (let step = 0; step < 10; step++) {
  melGame.update(0.03);
}
assert.ok(melGame.hellblazeEruptions.length >= 1, 'Saat mencapai musuh, Hellblaze memicu pilar erupsi api gelap ke atas');
assert.equal(mEnemy.hp, 240 - 44, 'Erupsi Hellblaze memberikan tepat 44 AoE impact damage pada mode Normal');
console.log('  [LULUS] 5b. Meliodas: Basic Attack Lostvayne & Skill Q Hellblaze (rambatan tanah + erupsi vertikal) terverifikasi.');

// --- 5C. Uji Meliodas Ultimate R: Assault Mode (Syarat 100%, Durasi Tepat 10.0 Detik, Boost 150% di 5 Stat, & Reset Bersih Tanpa Stacking) ---
melGame.player.ultimateCharge = 80;
assert.equal(melGame.tryUltimateR(), false, 'Assault Mode ditolak saat ultimateCharge < 100%');
assert.equal(melGame.player.assaultMode.active, false);

melGame.player.ultimateCharge = 100;
const baseMove = melGame.player.baseStats.moveSpeed;
const baseAtk = melGame.player.baseStats.basicAttackDamage;
const baseSkill = melGame.player.baseStats.skillDamage;
const baseJump = melGame.player.baseStats.jumpHeight;
const baseDash = melGame.player.baseStats.dashSpeed;

const rAct = melGame.tryUltimateR();
assert.equal(rAct, true, 'Assault Mode berhasil diaktifkan saat ultimateCharge === 100%');
assert.equal(melGame.player.assaultMode.active, true, 'Status assaultMode.active bernilai true');
assert.equal(melGame.player.assaultMode.duration, 10.0, 'Durasi Assault Mode adalah tepat 10.0 detik');
assert.equal(melGame.player.assaultMode.timeLeft, 10.0, 'Timer awal Assault Mode adalah tepat 10.0 detik');

// Verifikasi kelima atribut meningkat tepat 150% (1.5x)
assert.equal(melGame.player.stats.moveSpeed, baseMove * 1.5, 'Movement speed meningkat menjadi tepat 150%');
assert.equal(melGame.player.stats.basicAttackDamage, baseAtk * 1.5, 'Basic attack damage meningkat menjadi tepat 150% (18 -> 27)');
assert.equal(melGame.player.stats.skillDamage, baseSkill * 1.5, 'Skill Q Hellblaze damage meningkat menjadi tepat 150% (44 -> 66)');
assert.equal(melGame.player.stats.jumpHeight, baseJump * 1.5, 'Jump height meningkat menjadi tepat 150%');
assert.equal(melGame.player.stats.dashSpeed, baseDash * 1.5, 'Dash speed meningkat menjadi tepat 150%');

// Pastikan tidak bisa diaktifkan ulang (overlapping) saat sedang aktif
assert.equal(melGame.tryUltimateR(), false, 'Assault Mode tidak dapat ditumpuk/diaktifkan ulang saat masih aktif');

// Uji Hellblaze selama Assault Mode menghasilkan 150% damage (66)
mEnemy.hp = 240;
mEnemy.x = melGame.player.x + 120;
melGame.player.qCooldown = 0;
melGame.player.energyPips = 3;
melGame.trySkillQ();
assert.equal(melGame.hellblazeWaves[0].damage, 66, 'Hellblaze selama Assault Mode memiliki damage 150% (66)');
assert.equal(melGame.hellblazeWaves[0].assault, true, 'Hellblaze selama Assault Mode memiliki flag visual assault=true');

// Majukan waktu 5.0 detik -> masih dalam Assault Mode (sisa 5.0 detik)
melGame.update(5.0);
assert.equal(melGame.player.assaultMode.active, true, 'Setelah 5 detik, Assault Mode masih aktif');
assert.ok(Math.abs(melGame.player.assaultMode.timeLeft - 5.0) < 1e-6, 'Sisa waktu Assault Mode tepat 5.0 detik');

// Majukan waktu 5.0 detik lagi (total 10.0 detik) -> Assault Mode wajib berakhir otomatis & memulihkan ke-5 stat ke 100%
melGame.update(5.0);
assert.equal(melGame.player.assaultMode.active, false, 'Setelah tepat 10.0 detik, Meliodas otomatis kembali ke wujud Normal');
assert.equal(melGame.player.assaultMode.timeLeft, 0, 'Timer Assault Mode kembali ke 0');
assert.equal(melGame.player.ultimateCharge, 0, 'Setelah transformasi berakhir, ultimate gauge di-reset ke 0 untuk mulai mengisi ulang');

assert.equal(melGame.player.stats.moveSpeed, baseMove, 'Movement speed kembali ke 100% normal');
assert.equal(melGame.player.stats.basicAttackDamage, baseAtk, 'Basic attack damage kembali ke 100% normal (18)');
assert.equal(melGame.player.stats.skillDamage, baseSkill, 'Skill damage kembali ke 100% normal (44)');
assert.equal(melGame.player.stats.jumpHeight, baseJump, 'Jump height kembali ke 100% normal');
assert.equal(melGame.player.stats.dashSpeed, baseDash, 'Dash speed kembali ke 100% normal');

// Uji aktivasi kedua untuk memastikan TIDAK ADA penumpukan stat permanen (no stat stacking)
melGame.player.ultimateCharge = 100;
melGame.tryUltimateR();
assert.equal(melGame.player.stats.basicAttackDamage, baseAtk * 1.5, 'Aktivasi kedua tetap tepat 150%, tidak menumpuk menjadi 225%');
melGame.update(10.0);
assert.equal(melGame.player.assaultMode.active, false);
assert.equal(melGame.player.stats.basicAttackDamage, baseAtk, 'Setelah aktivasi kedua berakhir, stat kembali bersih ke 100%');
console.log('  [LULUS] 5c. Meliodas Assault Mode (R): Syarat 100%, durasi presisi 10.0d, boost 150% di 5 atribut, dan restorasi 100% tanpa stacking terverifikasi.');

console.log('\n=== SELURUH PENGUJIAN RESTORASI TRAVELER & IMPLEMENTASI MELIODAS LULUS 100% ===');
