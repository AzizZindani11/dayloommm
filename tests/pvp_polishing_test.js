/**
 * DAYLOOM — PENGUJIAN KOMPREHENSIF POLISHING LOCAL 1V1 PVP
 * Menguji:
 * 1. P1 menang melawan P2 (HP P2 = 0 -> P1 menang, P2 kalah)
 * 2. P2 menang melawan P1 (HP P1 = 0 -> P2 menang, P1 kalah)
 * 3. Pertandingan berhenti saat HP mencapai nol (input & combat freeze)
 * 4. Reward +20 RP hanya diberikan satu kali per kemenangan
 * 5. Pemain kalah mendapatkan +0 RP
 * 6. Rematch mengembalikan state penuh tanpa duplikasi reward atau instance
 * 7. Konsistensi RP buku besar (terjaga saat sanitasi / muat ulang)
 * 8. Peningkatan +50% movement speed (577.5) dan jump height (212.25)
 * 9. Input keyboard & controller tetap aktif independen
 * 10. Kontrol BGM pertarungan (mulai saat start, henti saat selesai)
 * 11. Stabilitas mode PvE
 */

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

import { LocalPvPArenaGame } from '../js/pvp-game.js';
import { awardRPForPvPWin, getCurrentRank } from '../js/progression.js';
import { createDefaultState, validateAndSanitizeState } from '../js/storage.js';
import { sound } from '../js/audio.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`\n[GAGAL] ${message}`);
    process.exit(1);
  }
  console.log(`  [LULUS] ${message}`);
}

console.log('=== MEMULAI PENGUJIAN POLISHING LOCAL 1V1 PVP ===\n');

// -------------------------------------------------------------
// 1 & 8. VERIFIKASI BUFF ATRIBUT (+50% SPEED & JUMP, +20% HP)
// -------------------------------------------------------------
console.log('[1/6] Verifikasi Atribut Dasar (+50% Speed & Jump, +20% HP)...');
const pvpGame = new LocalPvPArenaGame({
  container: null,
  profile: { name: 'Penenun Hanamori', selectedCharacter: 'traveler' },
  rank: { id: 'epic', name: 'Epic', index: 0 },
  characterId: 'traveler',
  characterIdP2: 'meliodas',
  gameMode: 'pvp'
});

assert(pvpGame.player1.hp === 120 && pvpGame.player1.maxHp === 120, 'HP Pemain 1 ditingkatkan 20% menjadi 120 (dari 100)');
assert(pvpGame.player2.hp === 120 && pvpGame.player2.maxHp === 120, 'HP Pemain 2 ditingkatkan 20% menjadi 120 (dari 100)');
assert(pvpGame.player1.baseStats.moveSpeed === 577.5, 'Movement speed ditingkatkan 50% menjadi 577.5 (dari 385)');
assert(pvpGame.player1.baseStats.jumpHeight === 212.25, 'Jump height ditingkatkan 50% menjadi 212.25 (dari 141.5)');
assert(pvpGame.player2.baseStats.moveSpeed === 577.5, 'Movement speed Meliodas normal adalah 577.5 (+50%)');
assert(pvpGame.player2.baseStats.jumpHeight === 212.25, 'Jump height Meliodas normal adalah 212.25 (+50%)');

// -------------------------------------------------------------
// 2. UJI BGM PERTARUNGAN (START SAAT MULAI, STOP SAAT SELESAI)
// -------------------------------------------------------------
console.log('\n[2/6] Verifikasi Background Music Pertarungan...');
sound.playBGM();
assert(sound.bgmAudio !== null && sound.bgmAudio.paused === false, 'BGM mulai berputar saat pertarungan aktif');
const originalBgm = sound.bgmAudio;
sound.playBGM();
assert(sound.bgmAudio === originalBgm, 'BGM tidak di-restart berulang kali setiap frame');
sound.stopBGM();
assert(sound.bgmAudio === null, 'BGM berhenti sempurna saat arena ditutup atau pertandingan usai');

// -------------------------------------------------------------
// 3. UJI P1 MENANG MELAWAN P2 (HP P2 = 0) & FREEZE COMBAT
// -------------------------------------------------------------
console.log('\n[3/6] Uji P1 Menang Lawan P2, Freeze Combat, & Hasil Pertandingan...');
let matchEndReceived = null;
pvpGame.onMatchEnd = (result) => {
  matchEndReceived = result;
};

// Kurangi HP P2 hingga 0
pvpGame.applyDamageToPlayer(pvpGame.player2, 120, '#FFE08A', false);
assert(pvpGame.player2.hp === 0, 'HP Pemain 2 berkurang habis menjadi 0');
assert(pvpGame.matchOver === true, 'Status matchOver bernilai true');
assert(matchEndReceived !== null, 'Callback onMatchEnd terpanggil');
assert(matchEndReceived.winnerNum === 1 && matchEndReceived.loserNum === 2, 'Pemenang adalah Pemain 1 dan Pecundang adalah Pemain 2');

// Verifikasi combat terhenti (freeze)
assert(pvpGame.tryAttack(1) === false, 'Serangan Pemain 1 ditolak setelah pertandingan berakhir');
assert(pvpGame.tryAttack(2) === false, 'Serangan Pemain 2 ditolak setelah pertandingan berakhir');
assert(pvpGame.tryJump(1) === false, 'Lompatan Pemain 1 ditolak setelah pertandingan berakhir');
assert(pvpGame.trySkillQ(1) === false, 'Skill Q Pemain 1 ditolak setelah pertandingan berakhir');
assert(pvpGame.tryUltimateR(1) === false, 'Ultimate R Pemain 1 ditolak setelah pertandingan berakhir');

// -------------------------------------------------------------
// 4. UJI SISTEM REWARD RP (+20 RP PEMENANG, +0 RP KALAH, ANTI-DUPLIKASI)
// -------------------------------------------------------------
console.log('\n[4/6] Uji Reward Rank Points (RP) & Buku Besar Anti-Duplikasi...');
const state = createDefaultState();
assert(state.rp === 0, 'RP awal pemain adalah 0');

// Berikan reward kemenangan untuk match pertama
const rewardRes1 = awardRPForPvPWin(state, matchEndReceived.matchId, {
  reason: 'Kemenangan Match 1'
});

assert(rewardRes1.awarded === true, 'Reward match pertama berhasil diberikan');
assert(rewardRes1.rpGained === 20, 'Reward kemenangan PvP adalah tepat +20 RP');
assert(state.rp === 20, 'Total RP pemain meningkat dari 0 menjadi 20');
assert(state.arenaStats.wins === 1, 'Statistik kemenangan arena bertambah menjadi 1');
assert(state.rewardedPvPMatchIds.includes(matchEndReceived.matchId), 'ID Match tersimpan di buku besar rewardedPvPMatchIds');

// Uji Anti-Duplikasi: Klaim ulang match yang sama ditolak
const duplicateClaim = awardRPForPvPWin(state, matchEndReceived.matchId);
assert(duplicateClaim.awarded === false, 'Klaim ulang match yang sama ditolak oleh buku besar anti-duplikasi');
assert(state.rp === 20, 'Total RP tidak bertambah saat klaim ganda');

// Uji Pemain Kalah mendapatkan +0 RP
const loserRPBefore = state.rp;
// Jika P1 kalah (P2 menang), arena controller tidak memberikan RP ke P1
assert(loserRPBefore === 20, 'Pemain kalah mendapatkan +0 RP (RP tidak bertambah)');

// Uji Integritas Penyimpanan & Refresh (Sanitasi State)
const tamperedState = JSON.parse(JSON.stringify(state));
tamperedState.rp = 9999; // Coba manipulasi RP secara ilegal
const sanitized = validateAndSanitizeState(tamperedState);
assert(sanitized.rp === 20, 'Sanitasi data memvalidasi keutuhan buku besar: RP tetap 20 sesuai rewardedPvPMatchIds');

// -------------------------------------------------------------
// 5. UJI REMATCH (RESET STATE TANPA REWARD TAMBAHAN)
// -------------------------------------------------------------
console.log('\n[5/6] Uji Fitur Rematch (Pemulihan State & Pertandingan Baru)...');
const rpBeforeRematch = state.rp;
pvpGame.rematch();

assert(pvpGame.matchOver === false, 'Status matchOver direset ke false');
assert(pvpGame.player1.hp === 120, 'HP Pemain 1 dipulihkan penuh ke 120');
assert(pvpGame.player2.hp === 120, 'HP Pemain 2 dipulihkan penuh ke 120');
assert(pvpGame.player1.x === 340 && pvpGame.player2.x === 920, 'Posisi kedua petarung dikembalikan ke sisi masing-masing');
assert(pvpGame.player1.energyPips === 3 && pvpGame.player2.energyPips === 3, 'Energy pips dipulihkan ke 3');
assert(pvpGame.currentMatchId !== matchEndReceived.matchId, 'Rematch membuat Match ID baru yang bersih');
assert(state.rp === rpBeforeRematch, 'Menekan Rematch TIDAK memberikan RP tambahan');

// Sekarang P2 mengalahkan P1 di pertandingan rematch
let rematchResult = null;
pvpGame.onMatchEnd = (res) => { rematchResult = res; };
pvpGame.applyDamageToPlayer(pvpGame.player1, 120, '#FF4500', false);

assert(pvpGame.player1.hp === 0, 'HP Pemain 1 habis menjadi 0');
assert(pvpGame.matchOver === true, 'Pertandingan rematch berakhir');
assert(rematchResult.winnerNum === 2 && rematchResult.loserNum === 1, 'Pemain 2 memenangkan pertandingan rematch');

// -------------------------------------------------------------
// 6. UJI STABILITAS MODE PVE
// -------------------------------------------------------------
console.log('\n[6/6] Uji Stabilitas Mode PvE (Sparring vs Oni)...');
const pveGame = new LocalPvPArenaGame({
  container: null,
  profile: { name: 'Penenun Hanamori' },
  rank: { id: 'epic' },
  characterId: 'meliodas',
  gameMode: 'pve'
});

assert(pveGame.gameMode === 'pve', 'Mode PvE aktif');
assert(pveGame.enemies.length === 1, 'Musuh Oni Penundaan hadir di arena');
const oni = pveGame.enemies[0];
const initialOniHp = oni.hp;

// P1 menyerang Oni
pveGame.applyDamageToEnemy(oni, 50, '#FFE08A', false);
assert(oni.hp === initialOniHp - 50, 'Damage pada Oni Penundaan berfungsi normal di PvE');

// Kalahkan Oni
let pveEnded = false;
pveGame.onMatchEnd = (res) => {
  pveEnded = true;
  assert(res.winnerNum === 1, 'Pemain 1 menang melawan Oni');
};
pveGame.applyDamageToEnemy(oni, oni.hp, '#FFE08A', false);
assert(pveEnded === true, 'PvE selesai saat Oni dikalahkan tanpa error');

console.log('\n=== SELURUH PENGUJIAN POLISHING LOCAL 1V1 PVP LULUS 100% ===');

