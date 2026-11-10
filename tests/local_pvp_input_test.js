/**
 * DAYLOOM — PENGUJIAN INTEGRASI LOCAL 1V1 MULTIPLAYER & CONTROLLER INPUT SYSTEM
 * Menguji integrasi InputManager (Keyboard & Gamepad), visual tester controller,
 * dual player engine (P1 vs P2), dan mekanika tempur independen di LocalPvPArenaGame.
 */

// Mock window & Image for Node environment
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

import {
  InputManager,
  CONTROLLER_TYPES,
  COMBAT_ACTIONS,
  detectControllerType,
  getButtonDisplayName,
  getKeyDisplayName
} from '../js/input.js';

import { LocalPvPArenaGame } from '../js/pvp-game.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`\n[GAGAL] ${message}`);
    process.exit(1);
  }
  console.log(`  [LULUS] ${message}`);
}

console.log('=== MEMULAI PENGUJIAN LOCAL 1V1 MULTIPLAYER & CONTROLLER INPUT ===\n');

// -------------------------------------------------------------
// 1. PENGUJIAN INPUT MANAGER & CONTROLLER DETECTION
// -------------------------------------------------------------
console.log('[1/4] Menguji InputManager & Deteksi Perangkat Gamepad...');

const inputMgr = new InputManager();

// Test Controller Type Detection
assert(
  detectControllerType('Xbox 360 Controller (XInput STANDARD GAMEPAD)') === CONTROLLER_TYPES.XBOX,
  'Deteksi perangkat Xbox 360 akurat mengembalikan CONTROLLER_TYPES.XBOX'
);
assert(
  detectControllerType('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)') === CONTROLLER_TYPES.PLAYSTATION,
  'Deteksi perangkat DualSense / PS (Sony 054c) akurat mengembalikan CONTROLLER_TYPES.PLAYSTATION'
);
assert(
  detectControllerType('USB Gamepad Device Generic') === CONTROLLER_TYPES.GENERIC,
  'Deteksi perangkat generik akurat mengembalikan CONTROLLER_TYPES.GENERIC'
);

// Test Button Display Names
assert(
  getButtonDisplayName(0, CONTROLLER_TYPES.XBOX) === 'A' &&
  getButtonDisplayName(0, CONTROLLER_TYPES.PLAYSTATION) === 'Cross (✕)',
  'Mapping nama tombol Button 0: "A" pada Xbox dan "Cross (✕)" pada PlayStation'
);
assert(
  getButtonDisplayName(2, CONTROLLER_TYPES.XBOX) === 'X' &&
  getButtonDisplayName(2, CONTROLLER_TYPES.PLAYSTATION) === 'Square (▢)',
  'Mapping nama tombol Button 2: "X" pada Xbox dan "Square (▢)" pada PlayStation'
);
assert(
  getButtonDisplayName(3, CONTROLLER_TYPES.XBOX) === 'Y' &&
  getButtonDisplayName(3, CONTROLLER_TYPES.PLAYSTATION) === 'Triangle (△)',
  'Mapping nama tombol Button 3: "Y" pada Xbox dan "Triangle (△)" pada PlayStation'
);

// Test Deadzone logic
const deadStick = inputMgr.applyDeadzone(0.12, 0.20);
assert(deadStick === 0, 'Sumbu analog di bawah deadzone 0.20 diabaikan (menghindari analog drift)');
const liveStick = inputMgr.applyDeadzone(0.60, 0.20);
assert(liveStick > 0, 'Sumbu analog di atas deadzone 0.20 dinormalisasi secara presisi');

// -------------------------------------------------------------
// 2. PENGUJIAN KEYBOARD MAPPING INDEPENDEN P1 & P2
// -------------------------------------------------------------
console.log('\n[2/4] Menguji Keyboard Input Independen P1 & P2 (Tanpa Bentrok)...');

// Simulasi tombol P1 ditekan: KeyD (kanan), KeyF (serang)
inputMgr.setMockKey('KeyD', true);
inputMgr.setMockKey('KeyF', true);

let p1Sample = inputMgr.samplePlayerInput(1);
let p2Sample = inputMgr.samplePlayerInput(2);

assert(
  p1Sample.moveX === 1 && p1Sample.attack === true,
  'Input Pemain 1 membaca MoveX = 1 (KeyD) dan Attack = true (KeyF)'
);
assert(
  p2Sample.moveX === 0 && p2Sample.attack === false,
  'Input Pemain 2 tetap MoveX = 0 dan Attack = false (tidak ada kontaminasi/crossover)'
);

// Reset & Simulasi tombol P2 ditekan: ArrowLeft (kiri), KeyK (serang), KeyO (skill Q)
inputMgr.setMockKey('KeyD', false);
inputMgr.setMockKey('KeyF', false);
inputMgr.setMockKey('ArrowLeft', true);
inputMgr.setMockKey('KeyK', true);
inputMgr.setMockKey('KeyO', true);

p1Sample = inputMgr.samplePlayerInput(1);
p2Sample = inputMgr.samplePlayerInput(2);

assert(
  p2Sample.moveX === -1 && p2Sample.attack === true && p2Sample.skillQ === true,
  'Input Pemain 2 membaca MoveX = -1 (ArrowLeft), Attack = true (KeyK), dan Skill Q = true (KeyO)'
);
assert(
  p1Sample.moveX === 0 && p1Sample.attack === false && p1Sample.skillQ === false,
  'Input Pemain 1 tetap netral dan tidak terpengaruh tombol Pemain 2'
);

// Clear mock keys
inputMgr.clearMockKeys();

// -------------------------------------------------------------
// 3. PENGUJIAN DUAL PLAYER COMBAT ENGINE (P1 VS P2 1v1)
// -------------------------------------------------------------
console.log('\n[3/4] Menguji Inisialisasi & Mekanika Pertarungan Dual Player (P1 vs P2)...');

const mockProfile = { name: 'Player One', outfit: 'adventurer', hat: 'none' };
const mockRank = { id: 'epic', name: 'Epic', tier: 1 };

const pvpGame = new LocalPvPArenaGame({
  container: null,
  profile: mockProfile,
  rank: mockRank,
  characterId: 'traveler',
  characterIdP2: 'meliodas',
  gameMode: 'pvp'
});

assert(
  pvpGame.gameMode === 'pvp',
  'Mode game berhasil diatur ke "pvp" (1v1 Lokal)'
);
assert(
  pvpGame.player1 && pvpGame.player2,
  'Kedua petarung player1 dan player2 terinisialisasi secara independen'
);
assert(
  pvpGame.player === pvpGame.player1,
  'Kompatibilitas mundur: this.player adalah alias dari this.player1'
);
assert(
  pvpGame.characterId === 'traveler' && pvpGame.characterIdP2 === 'meliodas',
  'Karakter P1 adalah Traveler dan Karakter P2 adalah Meliodas'
);
assert(
  pvpGame.player1.x < pvpGame.player2.x,
  'Posisi spawn terpisah secara seimbang (P1 di sisi kiri, P2 di sisi kanan)'
);
assert(
  pvpGame.player1.hp === pvpGame.player1.maxHp && pvpGame.player2.hp === pvpGame.player2.maxHp,
  'HP awal kedua petarung terisi penuh (100%)'
);

// Uji Serangan P1 mengurangi HP P2
const p2InitialHp = pvpGame.player2.hp;
pvpGame.applyDamageToPlayer(pvpGame.player2, 25, '#FFFFFF', false);
assert(
  pvpGame.player2.hp === p2InitialHp - 25,
  `Pemain 1 melukai Pemain 2: HP P2 berkurang dari ${p2InitialHp} menjadi ${pvpGame.player2.hp}`
);
assert(
  pvpGame.player2.hurtTimer > 0,
  'Efek getaran & hurt frame Pemain 2 aktif saat menerima serangan'
);

// Uji Serangan P2 mengurangi HP P1
const p1InitialHp = pvpGame.player1.hp;
pvpGame.applyDamageToPlayer(pvpGame.player1, 30, '#FF4500', true);
assert(
  pvpGame.player1.hp === p1InitialHp - 30,
  `Pemain 2 melukai Pemain 1: HP P1 berkurang dari ${p1InitialHp} menjadi ${pvpGame.player1.hp}`
);

// -------------------------------------------------------------
// 4. PENGUJIAN SKILL INDEPENDEN DI KEDUA KARAKTER
// -------------------------------------------------------------
console.log('\n[4/4] Menguji Skill Q & Ultimate R Independen Antar Pemain...');

// P2 (Meliodas) mengisi energi dan mengaktifkan Assault Mode (R)
pvpGame.player2.ultimateCharge = 100;
assert(pvpGame.tryAssaultMode(2) === true, 'Pemain 2 (Meliodas) berhasil mengaktifkan Assault Mode');
assert(pvpGame.player2.assaultMode.active === true, 'P2 memasuki status Assault Mode (Aura Kegelapan)');
assert(pvpGame.player1.assaultMode.active === false, 'P1 (Traveler) tidak terpengaruh status Assault Mode P2');

// P1 (Traveler) mengaktifkan Inferno Domain (R)
pvpGame.player1.ultimateCharge = 100;
assert(pvpGame.tryInfernoDomain(1) === true, 'Pemain 1 (Traveler) berhasil mengaktifkan Inferno Domain');
assert(pvpGame.player1.infernoDomain.active === true, 'P1 mengaktifkan domain api pembakar');
assert(pvpGame.player2.infernoDomain.active === false, 'P2 tidak memiliki domain api traveler');

// P2 Hellblaze ground wave creation
const initialWaves = pvpGame.hellblazeWaves.length;
pvpGame.player2.energyPips = 3;
pvpGame.player2.qCooldown = 0;
pvpGame.tryHellblaze(2);
assert(
  pvpGame.hellblazeWaves.length > initialWaves,
  'Pemain 2 meluncurkan gelombang Hellblaze ke arah lawan'
);
assert(
  pvpGame.hellblazeWaves[pvpGame.hellblazeWaves.length - 1].ownerPlayer === 2,
  'Gelombang Hellblaze ditandai dengan kepemilikan ownerPlayer: 2'
);

console.log('\n=== SELURUH PENGUJIAN LOCAL 1V1 MULTIPLAYER & CONTROLLER INPUT LULUS 100% ===');
