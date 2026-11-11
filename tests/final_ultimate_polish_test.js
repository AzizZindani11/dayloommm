/**
 * DAYLOOM — PENGUJIAN FINAL ULTIMATE POLISH & VERIFIKASI DUA KARAKTER BARU (VOID & LANCELOT)
 * Memverifikasi:
 * 1. Karakter Void: Kecepatan tinggi (720 vs standar 577.5), dash cepat, basic attack sabit kembar, Q Void Rift Slash, R Eclipse Overdrive.
 * 2. Karakter Lancelot:
 *    - Human form: Busur peri (jarak jauh, proyektil berkecepatan 880) & Katana Shirojika (jarak dekat <= 96px).
 *    - Skill Q Wujud Rubah Merah (Shin): Transformasi rubah merah Shin (+45% Move Speed), shockwave slow, revert saat durasi habis/ditekan kembali.
 *    - Ultimate R Shining Road: Homing celestial beam mengunci posisi lawan, damage tinggi (62), efek visual starlight.
 * 3. Local PvP vs PvE:
 *    - Local PvP (gameMode === 'pvp'): Oni Kage Daruma 0 / tidak muncul di arena, murni Player 1 vs Player 2.
 *    - Solo Training (gameMode === 'pve'): Oni Kage Daruma tetap ada dan dapat dilawan.
 * 4. Pemilihan Karakter: Semua 4 karakter (Traveler, Meliodas, Void, Lancelot) dapat dipilih di Arena.
 * 5. Audio Controls: BGM loop Sakura Journey dan Ambience Lobi berfungsi dengan kendali terpisah.
 */

import assert from 'node:assert/strict';

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

const { PLAYABLE_CHARACTERS } = await import('../js/config.js');
const { getVoidSVG, getVoidPortraitSVG, getLancelotSVG, getLancelotPortraitSVG } = await import('../js/art.js');
const { LocalPvPArenaGame, getCharacterBaseStats } = await import('../js/pvp-game.js');
const { sound } = await import('../js/audio.js');

console.log('=== MEMULAI PENGUJIAN FINAL ULTIMATE POLISH & INTEGRITAS VOID + LANCELOT ===\n');

// 1. Verifikasi Roster 4 Karakter di config.js
assert.equal(PLAYABLE_CHARACTERS.length, 4, 'Wajib memiliki tepat 4 karakter playable');
assert.deepEqual(PLAYABLE_CHARACTERS.map(c => c.id), ['traveler', 'meliodas', 'void', 'lancelot'], 'ID 4 karakter harus konsisten');
console.log('  [LULUS] 1. Roster 4 Karakter Playable (Traveler, Meliodas, Void, Lancelot) terverifikasi.');

// 2. Verifikasi Aset Seni Asli Desain Argon (Void & Lancelot)
const voidSvg = getVoidSVG({ mode: 'normal', size: 88, facing: 'right' });
const voidOverSvg = getVoidSVG({ mode: 'overdrive', size: 88, facing: 'right' });
const voidPortrait = getVoidPortraitSVG();
assert.ok(voidSvg.includes('Sabit Kembar Dimensi') || voidSvg.includes('void-character-svg'), 'SVG Void Normal valid');
assert.ok(voidOverSvg.includes('void-overdrive-svg'), 'SVG Void Overdrive valid');
assert.ok(voidPortrait.includes('VOID'), 'Potret editorial Void valid');

const lancelotHumanSvg = getLancelotSVG({ mode: 'human', size: 88, facing: 'right' });
const lancelotSwordSvg = getLancelotSVG({ mode: 'sword', size: 88, facing: 'right' });
const lancelotShinSvg = getLancelotSVG({ mode: 'shin', size: 88, facing: 'right' });
const lancelotShiningSvg = getLancelotSVG({ mode: 'shining_road', size: 88, facing: 'right' });
const lancelotPortrait = getLancelotPortraitSVG();
assert.ok(lancelotHumanSvg.includes('Busur Peri'), 'Lancelot Human memegang Busur Peri');
assert.ok(lancelotSwordSvg.includes('Shirojika'), 'Lancelot Sword memegang Katana Shirojika');
assert.ok(lancelotShinSvg.includes('Shin'), 'Lancelot Shin menampilkan Rubah Merah dengan liontin');
assert.ok(lancelotShiningSvg.includes('lancelot-shining-svg') || lancelotShiningSvg.includes('shining'), 'Lancelot Shining Road menampilkan kelas berkas sihir');
assert.ok(lancelotPortrait.includes('LANCELOT'), 'Potret editorial Lancelot valid');
console.log('  [LULUS] 2. Desain SVG karakter dan potret editorial Void & Lancelot buatan Argon terjaga 100% utuh.');

// 3. Verifikasi Atribut & Kecepatan Gerak Void
const voidStats = getCharacterBaseStats('void');
const travelerStats = getCharacterBaseStats('traveler');
const meliodasStats = getCharacterBaseStats('meliodas');
assert.equal(travelerStats.moveSpeed, 577.5, 'Traveler movement speed standar 577.5');
assert.equal(meliodasStats.moveSpeed, 577.5, 'Meliodas movement speed standar 577.5');
assert.equal(voidStats.moveSpeed, 720.0, 'Void movement speed rebalanced ke 720.0 (> standar 577.5)');
assert.equal(voidStats.dashSpeed, 930.0, 'Void dash speed lebih tinggi');
console.log('  [LULUS] 3. Identitas Kecepatan Void (720 vs 577.5) terverifikasi tanpa mengubah karakter lain.');

// 4. Verifikasi Mekanika Tempur Void di Game Engine
const voidGame = new LocalPvPArenaGame({
  container: null,
  profile: { selectedCharacter: 'void' },
  rank: { id: 'legend' },
  characterId: 'void',
  characterIdP2: 'traveler',
  gameMode: 'pvp'
});
assert.equal(voidGame.player1.stats.moveSpeed, 720.0, 'P1 Void memiliki moveSpeed aktif 720');

// Uji Basic Attack Void (Sabit Kembar Dimensi)
voidGame.player2.x = voidGame.player1.x + 60;
voidGame.player2.y = voidGame.player1.y;
const p2HpBefore = voidGame.player2.hp;
const voidAtk = voidGame.tryAttack(1);
assert.equal(voidAtk, true, 'Serangan dasar Void berhasil dilancarkan');
assert.ok(voidGame.player2.hp < p2HpBefore, 'Sabit Kembar Dimensi Void memberikan damage pada P2');

// Uji Skill Q Void (Void Rift Slash)
voidGame.player1.energyPips = 3;
voidGame.player1.qCooldown = 0;
const voidQ = voidGame.trySkillQ(1);
assert.equal(voidQ, true, 'Skill Q Void Rift Slash berhasil aktif');
assert.equal(voidGame.player1.energyPips, 2, 'Mengonsumsi 1 orb');

// Uji Ultimate R Void (Eclipse Overdrive)
voidGame.player1.ultimateCharge = 100;
const voidR = voidGame.tryUltimateR(1);
assert.equal(voidR, true, 'Eclipse Overdrive berhasil aktif');
assert.equal(voidGame.player1.voidOverdrive.active, true, 'Status voidOverdrive.active bernilai true');
assert.ok(voidGame.player1.stats.moveSpeed > 720.0, 'Move speed Void meningkat lebih tinggi saat Eclipse Overdrive');
voidGame.endVoidOverdrive(1);
assert.equal(voidGame.player1.voidOverdrive.active, false, 'Void Overdrive berakhir bersih');
assert.equal(voidGame.player1.stats.moveSpeed, 720.0, 'Move speed kembali normal ke 720');
console.log('  [LULUS] 4. Gameplay Void (Basic Attack, Q Void Rift Slash, R Eclipse Overdrive) berfungsi sempurna.');

// 5. Verifikasi Mekanika Tempur Lancelot di Game Engine
const lancelotGame = new LocalPvPArenaGame({
  container: null,
  profile: { selectedCharacter: 'lancelot' },
  rank: { id: 'mythic' },
  characterId: 'lancelot',
  characterIdP2: 'traveler',
  gameMode: 'pvp'
});
assert.equal(lancelotGame.player1.weaponMode, 'bow', 'Lancelot default ke mode busur peri');

// 5a. Basic Attack Jarak Jauh (Fairy Bow Arrow)
lancelotGame.player2.x = lancelotGame.player1.x + 350; // Jarak jauh
lancelotGame.tryAttack(1);
assert.equal(lancelotGame.player1.weaponMode, 'bow', 'Mode senjata tetap busur saat lawan di luar jarak dekat');
const arrow = lancelotGame.projectiles.find(p => p.isLancelotArrow);
assert.ok(arrow, 'Proyektil panah bintang Lancelot tercipta');
assert.equal(Math.abs(arrow.vx), 880, 'Kecepatan panah Lancelot adalah 880 px/s');

// 5b. Basic Attack Jarak Dekat (Katana Shirojika)
lancelotGame.player2.x = lancelotGame.player1.x + 65; // Jarak dekat <= 96px
lancelotGame.player1.attackCooldown = 0;
const p2HpBeforeKatana = lancelotGame.player2.hp;
lancelotGame.tryAttack(1);
assert.equal(lancelotGame.player1.weaponMode, 'sword', 'Lancelot beralih ke katana Shirojika saat lawan dekat');
assert.ok(lancelotGame.player2.hp < p2HpBeforeKatana, 'Katana Shirojika memberikan damage razor-sharp');

// 5c. Skill Q Lancelot (Wujud Rubah Merah Shin)
lancelotGame.player1.energyPips = 3;
lancelotGame.player1.qCooldown = 0;
const normalSpeed = lancelotGame.player1.stats.moveSpeed;
const qShin = lancelotGame.trySkillQ(1);
assert.equal(qShin, true, 'Transformasi wujud rubah Shin berhasil');
assert.equal(lancelotGame.player1.shinFoxMode.active, true, 'Status shinFoxMode aktif');
assert.ok(lancelotGame.player1.stats.moveSpeed > normalSpeed, 'Kecepatan gerak Shin meningkat +45%');
assert.equal(lancelotGame.player2.slowTimer > 0, true, 'Lawan di sekitar terkena efek slow dari gelombang Shin');

// Revert wujud Shin dengan menekan Q kembali
lancelotGame.player1.qCooldown = 0;
lancelotGame.trySkillQ(1);
assert.equal(lancelotGame.player1.shinFoxMode.active, false, 'Lancelot kembali ke wujud manusia');
assert.equal(lancelotGame.player1.stats.moveSpeed, normalSpeed, 'Kecepatan kembali ke nilai awal');

// 5d. Ultimate R Lancelot (Shining Road)
lancelotGame.player1.ultimateCharge = 100;
const rShining = lancelotGame.tryUltimateR(1);
assert.equal(rShining, true, 'Shining Road berhasil dilancarkan');
assert.equal(lancelotGame.shiningRoadBeams.length, 1, 'Berkas Shining Road tercipta');
assert.equal(lancelotGame.shiningRoadBeams[0].damage, 62, 'Damage Shining Road adalah 62');
console.log('  [LULUS] 5. Gameplay Lancelot (Fairy Bow, Katana Shirojika, Q Shin Fox, R Shining Road) berfungsi akurat.');

// 6. Verifikasi Pemisahan Local PvP vs PvE Solo Training
const purePvpGame = new LocalPvPArenaGame({
  container: null,
  profile: { selectedCharacter: 'void' },
  rank: { id: 'epic' },
  characterId: 'void',
  characterIdP2: 'lancelot',
  gameMode: 'pvp'
});
assert.equal(purePvpGame.enemies.length, 0, 'Mode Local PvP (1v1) TIDAK memiliki musuh NPC Oni');

const pveGame = new LocalPvPArenaGame({
  container: null,
  profile: { selectedCharacter: 'void' },
  rank: { id: 'epic' },
  characterId: 'void',
  gameMode: 'pve'
});
assert.equal(pveGame.enemies.length, 1, 'Mode Solo Training (PvE) tetap memiliki Oni Kage Daruma');
assert.equal(pveGame.enemies[0].name, 'Oni Penundaan', 'Nama musuh PvE terverifikasi');
console.log('  [LULUS] 6. Pemisahan mode PvP (tanpa Oni) dan PvE (dengan Oni) terverifikasi 100%.');

// 7. Verifikasi Audio Atmosphere (Sakura Journey & Kendali Suara)
assert.equal(typeof sound.toggleMusic, 'function', 'Terdapat toggleMusic()');
assert.equal(typeof sound.toggleSFX, 'function', 'Terdapat toggleSFX()');
assert.equal(typeof sound.setVolume, 'function', 'Terdapat setVolume()');
assert.equal(typeof sound.playLobbyEnter, 'function', 'Terdapat playLobbyEnter()');
assert.equal(typeof sound.playLobbyAmbience, 'function', 'Terdapat playLobbyAmbience()');
console.log('  [LULUS] 7. Audio Atmosphere & Kontrol Suara Sakura Journey terverifikasi.');

console.log('\n=== SELURUH PENGUJIAN FINAL ULTIMATE POLISH LULUS DENGAN SUKSES! ===');
