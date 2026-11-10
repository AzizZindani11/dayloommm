/**
 * DAYLOOM — Simulasi Alur End-to-End (E2E Flow Verification)
 * Menguji siklus hidup penuh dari inisialisasi state, pembuatan misi,
 * pencegahan selesai sebelum checklist tuntas, klaim RP, kenaikan peringkat,
 * perhitungan statistik nyata, hingga kemenangan Arena Dojo.
 */

import assert from 'node:assert/strict';
import { createDefaultState, exportBackupJSON, importBackupJSON } from '../js/storage.js';
import {
  validateTaskCompletion,
  awardRPForTask,
  calculateProductivityScore,
  evaluateAchievements,
  getCurrentRank
} from '../js/progression.js';

console.log('=== MEMULAI VERIFIKASI ALUR PENGGUNA END-TO-END (E2E) ===\n');

// 1. Inisialisasi Pengguna Baru di Desa Hanamori
const state = createDefaultState();
assert.equal(state.rp, 0);
assert.equal(getCurrentRank(state.rp).name, 'Epic');
console.log('  [LULUS] 1. Inisialisasi pengguna baru berada di Rank Epic (0 RP) dengan 3 misi awal aktif.');

// 2. Mencoba menyelesaikan Misi 1 ketika masih ada 2 checklist yang belum dicentang
const quest1 = state.tasks[0];
const checkAttempt1 = validateTaskCompletion(quest1);
assert.equal(checkAttempt1.valid, false);
assert.equal(checkAttempt1.incompleteCount, 2);
console.log(`  [LULUS] 2. Sistem menolak penyelesaian misi yang belum lengkap: "${checkAttempt1.message}"`);

// 3. Mencentang seluruh checklist pada Misi 1 lalu menyelesaikannya
quest1.checklist.forEach(item => { item.completed = true; });
const checkAttempt2 = validateTaskCompletion(quest1);
assert.equal(checkAttempt2.valid, true);

quest1.status = 'selesai';
quest1.completedOnTime = true;
const reward1 = awardRPForTask(state, quest1);
assert.equal(reward1.awarded, true);
assert.equal(state.rp, 10);

const newAchs1 = evaluateAchievements(state);
assert.ok(newAchs1.some(a => a.id === 'first_thread'));
assert.ok(newAchs1.some(a => a.id === 'checklist_master'));
console.log('  [LULUS] 3. Misi 1 selesai -> +10 RP diberikan, pencapaian "Benang Pertama" & "Penguasa Checklist" terbuka.');

// 4. Membuat 4 misi baru di kategori berbeda dan menyelesaikannya tepat waktu untuk naik ke Rank Legend (50 RP)
const extraCategories = ['akademik', 'pekerjaan', 'kesehatan', 'kreativitas'];
extraCategories.forEach((cat, idx) => {
  const newQuest = {
    id: `custom_quest_${idx}`,
    title: `Misi Kustom ${idx + 1}`,
    description: 'Misi pengujian alur penuh',
    category: cat,
    priority: 'tinggi',
    deadline: quest1.deadline,
    status: 'selesai',
    completedOnTime: true,
    checklist: [{ id: `ck_${idx}`, text: 'Langkah tunggal', completed: true }]
  };
  state.tasks.push(newQuest);
  const rw = awardRPForTask(state, newQuest);
  assert.equal(rw.awarded, true);
});

assert.equal(state.rp, 50);
assert.equal(getCurrentRank(state.rp).name, 'Legend');
const newAchs2 = evaluateAchievements(state);
assert.ok(newAchs2.some(a => a.id === 'deadline_guardian'));
assert.ok(newAchs2.some(a => a.id === 'balanced_weaver'));
assert.ok(newAchs2.some(a => a.id === 'rank_riser'));
console.log('  [LULUS] 4. Mencapai 50 RP -> Naik ke Rank Legend! Pencapaian "Penjaga Tenggat", "Penenun Seimbang", dan "Kebangkitan Legenda" terbuka.');

// 5. Simulasi Kemenangan Pertarungan Fokus di Arena Dojo & Eksplorasi 4 Lokasi Desa
state.arenaStats.wins = 1;
state.visitedLocations = ['loom_shrine', 'quest_board', 'tea_house', 'arena_dojo'];
const newAchs3 = evaluateAchievements(state);
assert.ok(newAchs3.some(a => a.id === 'arena_victor'));
assert.ok(newAchs3.some(a => a.id === 'world_explorer'));
console.log('  [LULUS] 5. Kemenangan Arena Dojo & kunjungan 4 bangunan desa membuka "Pendekar Dojo Fokus" & "Penjelajah Hanamori".');

// 6. Verifikasi Skor Produktivitas & Cadangan JSON
const score = calculateProductivityScore(state.tasks);
assert.ok(score.totalScore > 0 && score.totalScore <= 100);
const backupStr = exportBackupJSON(state);
const restored = importBackupJSON(backupStr);
assert.equal(restored.rp, 50);
assert.equal(restored.unlockedAchievements.length, state.unlockedAchievements.length);
console.log(`  [LULUS] 6. Skor Produktivitas terhitung (${score.totalScore}/100) & Cadangan JSON berhasil diekspor/diimpor tanpa kehilangan data.`);

console.log('\n=== SELURUH ALUR END-TO-END (E2E) LULUS VERIFIKASI ===');

