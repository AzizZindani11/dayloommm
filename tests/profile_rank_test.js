/**
 * DAYLOOM — Pengujian Khusus Pemisahan Profil & Peringkat (Profile & Rank Experience)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RANKS } from '../js/config.js';
import {
  createDefaultState,
  validateAndSanitizeState,
  exportBackupJSON,
  importBackupJSON,
  MAX_AVATAR_DATAURL_LENGTH
} from '../js/storage.js';
import {
  getCurrentRank,
  getHighestRank,
  hasMythicEmblem,
  getFeaturedAchievementIds,
  awardRPForTask,
  evaluateAchievements
} from '../js/progression.js';
import { getRankEmblemSVG } from '../js/art.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== MEMULAI PENGUJIAN PROFILE & RANK REFINEMENT ===\n');

// 1. Verifikasi Pemisahan Halaman di index.html
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
assert.ok(html.includes('data-nav-view="profile"'), 'Tab navigasi Profil harus ada');
assert.ok(html.includes('data-nav-view="rank"'), 'Tab navigasi Peringkat harus ada');
assert.ok(html.includes('id="view-profile"'), 'Section view-profile harus ada');
assert.ok(html.includes('id="view-rank"'), 'Section view-rank harus ada');
assert.ok(html.includes('id="profile-view-content"'), 'Kontainer profile-view-content harus ada');
assert.ok(html.includes('id="rank-view-content"'), 'Kontainer rank-view-content harus ada');
console.log('  [LULUS] 1. Pemisahan tab dan kontainer DOM Profil & Peringkat terverifikasi.');

// 2. Verifikasi 6 Peringkat Resmi Tetap Terjaga
assert.deepEqual(RANKS.map(r => r.name), [
  'Epic',
  'Legend',
  'Mythic',
  'Mythic Honor',
  'Mythic Glory',
  'Mythic Immortal'
], '6 Peringkat resmi tidak boleh berubah urutan maupun namanya');
console.log('  [LULUS] 2. Enam peringkat resmi tetap utuh dan berurutan.');

// 3. Verifikasi Lambang Baru Mythic Immortal (Divine Celestial Gold)
const immortalSVG = getRankEmblemSVG('mythic_immortal', 80);
assert.ok(immortalSVG.includes('immortalGold'), 'Mythic Immortal harus menggunakan palet emas');
assert.ok(immortalSVG.includes('immortalIvory'), 'Mythic Immortal harus menggunakan aksen gading (ivory)');
assert.ok(immortalSVG.includes('immortalHalo'), 'Mythic Immortal harus memiliki halo celestial');
assert.ok(!immortalSVG.includes('00B894'), 'Mythic Immortal tidak boleh lagi menggunakan warna hijau giok dominan');
console.log('  [LULUS] 3. Lambang Mythic Immortal terbukti menggunakan desain Divine Celestial Gold & Ivory.');

// 4. Verifikasi Aturan Lambang Mythic (Mythic Emblem status)
const state = createDefaultState();
assert.equal(getCurrentRank(state.rp).name, 'Epic');
assert.equal(getHighestRank(state).name, 'Epic');
assert.equal(hasMythicEmblem(state), false, 'Pemain Epic tidak boleh memiliki Lambang Mythic');

// Simulasikan naik rank ke Mythic
state.rp = 150;
state.rankHistory.push({
  rankId: 'mythic',
  rankName: 'Mythic',
  reachedAt: new Date().toISOString(),
  rpAtTime: 120
});
assert.equal(getCurrentRank(state.rp).name, 'Mythic');
assert.equal(getHighestRank(state).name, 'Mythic');
assert.equal(hasMythicEmblem(state), true, 'Pemain Mythic harus memiliki Lambang Mythic');

// Jika RP turun (misal skenario reset sementara), highestRank tetap menyimpan Mythic
state.rp = 30;
assert.equal(getCurrentRank(state.rp).name, 'Epic');
assert.equal(getHighestRank(state).name, 'Mythic');
assert.equal(hasMythicEmblem(state), true, 'Pemain yang PERNAH mencapai Mythic tetap berhak atas Lambang Mythic');
console.log('  [LULUS] 4. Logika Peringkat Tertinggi & Pembukaan Lambang Mythic akurat.');

// 5. Verifikasi Sanitasi & Persistensi Avatar Lokal
const validAvatar = 'data:image/jpeg;base64,' + 'A'.repeat(500);
state.profile.avatar = validAvatar;
state.profile.name = 'Ksatria Hanamori';
state.profile.social = { likes: 12, following: 4, followers: 8 };

const saved = exportBackupJSON(state);
const restored = importBackupJSON(saved);

assert.equal(restored.profile.avatar, validAvatar, 'Avatar valid harus tersimpan');
assert.equal(restored.profile.name, 'Ksatria Hanamori');
assert.equal(restored.profile.social.likes, 12);
assert.equal(restored.profile.social.following, 4);
assert.equal(restored.profile.social.followers, 8);

// Avatar invalid atau terlalu besar ditolak secara aman
const invalidState = {
  profile: {
    avatar: 'http://malicious.com/pic.jpg', // bukan base64
    social: { likes: -5 }
  }
};
const sanitized = validateAndSanitizeState(invalidState);
assert.equal(sanitized.profile.avatar, null, 'URL eksternal non-dataURL harus disanitasi menjadi null');
assert.equal(sanitized.profile.social.likes, 0, 'Angka negatif harus disanitasi menjadi 0');
console.log('  [LULUS] 5. Persistensi avatar lokal dan data sosial terverifikasi aman.');

// 6. Verifikasi Lencana Pilihan (Featured Achievements)
const task = state.tasks[0];
task.checklist.forEach(c => { c.completed = true; });
task.status = 'selesai';
task.completedOnTime = true;
awardRPForTask(state, task);
evaluateAchievements(state);

state.profile.featuredAchievements = ['first_thread', 'non_existent_badge'];
const featured = getFeaturedAchievementIds(state);
assert.ok(featured.includes('first_thread'), 'Pencapaian yang terbuka boleh dipamerkan');
assert.ok(!featured.includes('non_existent_badge'), 'Pencapaian fiktif/terkunci tidak boleh dipamerkan');
assert.ok(featured.length <= 3, 'Maksimal 3 pencapaian pilihan');
console.log('  [LULUS] 6. Validasi Lencana Pilihan hanya menampilkan data pencapaian nyata.');

// 7. Verifikasi File Ilustrasi Karakter Resmi 2D Ada di Tempat
assert.ok(fs.existsSync(path.join(rootDir, 'assets/characters/adventurer-illustration.jpg')), 'Berkas ilustrasi karakter resmi harus ada di assets/characters/');
console.log('  [LULUS] 7. Aset ilustrasi karakter resmi 2D tersedia di dalam workspace.');

console.log('\n=== SELURUH PENGUJIAN PROFILE & RANK LULUS SEMPURNA ===');

