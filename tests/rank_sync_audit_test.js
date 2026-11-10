/**
 * DAYLOOM — RANK SYNCHRONIZATION & RECONCILIATION TEST SUITE
 * Menguji secara komprehensif integritas perhitungan rank, batas RP, rekonsiliasi data Supabase
 * (profiles, tasks, rp_ledger, rank_history), perlindungan terhadap nilai NULL / 0 desinkronisasi,
 * dan persistensi multi-perangkat setelah refresh.
 */

import assert from 'assert';
import fs from 'node:fs';
import path from 'node:path';
import { RANKS } from '../js/config.js';
import { getCurrentRank, getRankProgress, getHighestRank } from '../js/progression.js';
import { mapCloudDataToState, validateAndSanitizeState, createDefaultState } from '../js/storage.js';

console.log('=== MEMULAI TEST SUITE: DAYLOOM RANK SYNCHRONIZATION & RECONCILIATION ===\n');

// ===========================================================================
// BAGIAN 1: Konsistensi 6 Peringkat Resmi & Batas RP di Semua Layer
// ===========================================================================
console.log('[1/6] Menguji Batas RP dan Konsistensi 6 Peringkat Resmi...');

const testCases = [
  { rp: 0, expectedId: 'epic', expectedName: 'Epic', expectedTitle: 'Penenun Fajar' },
  { rp: 49, expectedId: 'epic', expectedName: 'Epic', expectedTitle: 'Penenun Fajar' },
  { rp: 50, expectedId: 'legend', expectedName: 'Legend', expectedTitle: 'Penjaga Lentera' },
  { rp: 119, expectedId: 'legend', expectedName: 'Legend', expectedTitle: 'Penjaga Lentera' },
  { rp: 120, expectedId: 'mythic', expectedName: 'Mythic', expectedTitle: 'Pendekar Sakura' },
  { rp: 219, expectedId: 'mythic', expectedName: 'Mythic', expectedTitle: 'Pendekar Sakura' },
  { rp: 220, expectedId: 'mythic_honor', expectedName: 'Mythic Honor', expectedTitle: 'Kesatria Kehormatan' },
  { rp: 349, expectedId: 'mythic_honor', expectedName: 'Mythic Honor', expectedTitle: 'Kesatria Kehormatan' },
  { rp: 350, expectedId: 'mythic_glory', expectedName: 'Mythic Glory', expectedTitle: 'Mahaguru Tenun Surya' },
  { rp: 499, expectedId: 'mythic_glory', expectedName: 'Mythic Glory', expectedTitle: 'Mahaguru Tenun Surya' },
  { rp: 500, expectedId: 'mythic_immortal', expectedName: 'Mythic Immortal', expectedTitle: 'Sang Abadi Hanamori' },
  { rp: 9999, expectedId: 'mythic_immortal', expectedName: 'Mythic Immortal', expectedTitle: 'Sang Abadi Hanamori' }
];

testCases.forEach(({ rp, expectedId, expectedName, expectedTitle }) => {
  const current = getCurrentRank(rp);
  assert.strictEqual(current.id, expectedId, `RP ${rp} harus menghasilkan rank ID ${expectedId}`);
  assert.strictEqual(current.name, expectedName, `RP ${rp} harus bernama ${expectedName}`);
  assert.strictEqual(current.title, expectedTitle, `RP ${rp} harus bergelar ${expectedTitle}`);

  const progress = getRankProgress(rp);
  assert.strictEqual(progress.currentRank.id, expectedId, `Progress RP ${rp} harus mengembalikan rank ${expectedId}`);
});

console.log('  [LULUS] Seluruh batas RP dan 6 peringkat resmi terbukti akurat dan konsisten.');

// ===========================================================================
// BAGIAN 2: Ketahanan Terhadap profiles.total_rp Bernilai NULL / 0 (Self-Healing)
// ===========================================================================
console.log('\n[2/6] Menguji Perlindungan dan Pemulihan jika profiles.total_rp Bernilai NULL / 0...');

// Simulasi kondisi riil: Di database profiles.total_rp bernilai null (atau 0),
// namun pengguna telah menyelesaikan dan mengklaim 5 tugas (50 RP = Rank Legend).
const profileWithNullRP = {
  id: 'usr-reconcile-1',
  username: 'Kesatria Teladan',
  total_rp: null, // Null akibat trigger lama atau belum terisi
  updated_at: '2026-11-10T12:00:00.000Z'
};

const tasksWithClaimedRP = [
  { id: 'q1', isRPClaimed: true, status: 'selesai', title: 'Misi 1' },
  { id: 'q2', isRPClaimed: true, status: 'selesai', title: 'Misi 2' },
  { id: 'q3', isRPClaimed: true, status: 'selesai', title: 'Misi 3' },
  { id: 'q4', isRPClaimed: true, status: 'selesai', title: 'Misi 4' },
  { id: 'q5', isRPClaimed: true, status: 'selesai', title: 'Misi 5' }
];

const reconciledState = mapCloudDataToState(profileWithNullRP, tasksWithClaimedRP, { id: 'usr-reconcile-1' });

// Verifikasi: RP tidak boleh reset ke 0! Harus merefleksikan 50 RP dan Peringkat Legend!
assert.strictEqual(reconciledState.rp, 50, 'Total RP harus direkonsiliasi menjadi 50 RP dari 5 tugas yang sudah diklaim!');
const derivedRank = getCurrentRank(reconciledState.rp);
assert.strictEqual(derivedRank.id, 'legend', 'Rank harus naik ke Legend (50 RP) meskipun profiles.total_rp bernilai NULL!');
assert.strictEqual(reconciledState.profile.title, 'Penjaga Lentera');

console.log('  [LULUS] Sistem berhasil merekonsiliasi total RP dari daftar tugas yang sah ketika total_rp di profiles bernilai NULL.');

// ===========================================================================
// BAGIAN 3: Rekonsiliasi Multi-Sumber (profiles, rp_ledger, tasks, rank_history)
// ===========================================================================
console.log('\n[3/6] Menguji Konsistensi Rekonsiliasi Lintas 4 Sumber Data Supabase...');

const profileLagging = {
  id: 'usr-multi-source',
  username: 'Petualang Sejati',
  total_rp: 20 // profiles tertinggal di 20 RP
};

const tasksLagging = [
  { id: 'task_1', isRPClaimed: true, status: 'selesai' },
  { id: 'task_2', isRPClaimed: true, status: 'selesai' },
  { id: 'task_3', isRPClaimed: true, status: 'selesai' } // 30 RP dari tasks
];

const rpLedgerRecords = [
  { id: 'led_1', points: 10, reason: 'Misi 1' },
  { id: 'led_2', points: 10, reason: 'Misi 2' },
  { id: 'led_3', points: 10, reason: 'Misi 3' },
  { id: 'led_4', points: 10, reason: 'Misi 4' },
  { id: 'led_5', points: 10, reason: 'Misi 5' },
  { id: 'led_6', points: 10, reason: 'Misi 6' },
  { id: 'led_7', points: 10, reason: 'Misi 7' },
  { id: 'led_8', points: 10, reason: 'Misi 8' },
  { id: 'led_9', points: 10, reason: 'Misi 9' },
  { id: 'led_10', points: 10, reason: 'Misi 10' },
  { id: 'led_11', points: 10, reason: 'Misi 11' },
  { id: 'led_12', points: 10, reason: 'Misi 12' } // 120 RP dari buku besar!
];

const rankHistoryRecords = [
  { rank_id: 'epic', rank_name: 'Epic', rp_at_time: 0 },
  { rank_id: 'legend', rank_name: 'Legend', rp_at_time: 50 },
  { rank_id: 'mythic', rank_name: 'Mythic', rp_at_time: 120 }
];

const multiReconciled = mapCloudDataToState(
  profileLagging,
  tasksLagging,
  { id: 'usr-multi-source' },
  rankHistoryRecords,
  rpLedgerRecords
);

assert.strictEqual(multiReconciled.rp, 120, 'Total RP harus mengambil nilai maksimum otoritatif 120 RP dari rp_ledger!');
const multiRank = getCurrentRank(multiReconciled.rp);
assert.strictEqual(multiRank.id, 'mythic', 'Peringkat harus tepat Mythic (120 RP)');
assert.strictEqual(multiRank.title, 'Pendekar Sakura');
assert.strictEqual(getHighestRank(multiReconciled).id, 'mythic');

console.log('  [LULUS] Rekonsiliasi multi-sumber menjamin RP dan Rank selalu mencerminkan pencapaian tertinggi pemain.');

// ===========================================================================
// BAGIAN 4: Pengujian Keamanan Tipe Parameter UUID pada claimTaskRP & Kode Supabase
// ===========================================================================
console.log('\n[4/6] Menguji Penanganan Type Safety pada claimTaskRP...');

const clientCode = fs.readFileSync(path.resolve('js/supabase-client.js'), 'utf-8');

// 1. Verifikasi fungsi claimTaskRP memiliki regex validasi UUID
assert.ok(clientCode.includes('claimTaskRP'), 'claimTaskRP harus tersedia di js/supabase-client.js');
assert.ok(/\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}/i.test(clientCode), 'claimTaskRP harus memvalidasi format UUID 36-karakter');
assert.ok(clientCode.includes('p_task_id: cleanTaskId'), 'claimTaskRP harus mengirim cleanTaskId ke p_task_id');
assert.ok(clientCode.includes('p_local_id: cleanLocalId'), 'claimTaskRP harus mengirim cleanLocalId ke p_local_id');

// 2. Verifikasi fungsi fetchRPLedger diekspor dan membaca tabel rp_ledger
assert.ok(clientCode.includes('export async function fetchRPLedger('), 'fetchRPLedger harus diekspor');
assert.ok(clientCode.includes(".from('rp_ledger')"), 'fetchRPLedger harus membaca tabel rp_ledger');

// 3. Verifikasi updateProfile mendukung update total_rp untuk self-healing
assert.ok(clientCode.includes('profileUpdates.total_rp'), 'updateProfile harus mendukung sinkronisasi total_rp');

// 4. Uji algoritma sanitasi UUID secara langsung
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sanitizeTaskParams = ({ taskId, localId }) => {
  const isUUID = typeof taskId === 'string' && uuidRegex.test(taskId);
  return {
    p_task_id: isUUID ? taskId : null,
    p_local_id: localId || (!isUUID && taskId ? taskId : null)
  };
};

const sanitizedLocal = sanitizeTaskParams({ taskId: 'quest_local_12345', localId: 'quest_local_12345' });
assert.strictEqual(sanitizedLocal.p_task_id, null, 'taskId lokal tidak boleh dikirim ke p_task_id UUID');
assert.strictEqual(sanitizedLocal.p_local_id, 'quest_local_12345');

const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const sanitizedUUID = sanitizeTaskParams({ taskId: validUUID, localId: 'quest_local_12345' });
assert.strictEqual(sanitizedUUID.p_task_id, validUUID);
assert.strictEqual(sanitizedUUID.p_local_id, 'quest_local_12345');

console.log('  [LULUS] Sanitasi parameter UUID dan kontrak RPC Supabase terverifikasi aman.');

// ===========================================================================
// BAGIAN 5: Konsistensi Antar-Perangkat (Laptop -> HP -> Laptop) Tanpa Penurunan Rank
// ===========================================================================
console.log('\n[5/6] Menguji Konsistensi Multi-Device (Laptop -> HP) Setelah Refresh...');

// Sesi Laptop: Pengguna menyelesaikan misi hingga mencapai 50 RP (Legend)
const laptopProfile = {
  id: 'usr-device-cross',
  username: 'Aziz Petualang',
  avatar_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  total_rp: 50,
  updated_at: new Date().toISOString()
};

const laptopTasks = [
  { id: 'quest_1', dbId: '00000000-0000-0000-0000-000000000001', isRPClaimed: true, status: 'selesai' },
  { id: 'quest_2', dbId: '00000000-0000-0000-0000-000000000002', isRPClaimed: true, status: 'selesai' },
  { id: 'quest_3', dbId: '00000000-0000-0000-0000-000000000003', isRPClaimed: true, status: 'selesai' },
  { id: 'quest_4', dbId: '00000000-0000-0000-0000-000000000004', isRPClaimed: true, status: 'selesai' },
  { id: 'quest_5', dbId: '00000000-0000-0000-0000-000000000005', isRPClaimed: true, status: 'selesai' }
];

// HP membuka halaman untuk pertama kali (tanpa cache lokal HP):
const hpLoadedState = mapCloudDataToState(laptopProfile, laptopTasks, { id: 'usr-device-cross' });

assert.strictEqual(hpLoadedState.rp, 50, 'Di HP, total RP harus langsung terbaca 50 RP');
assert.strictEqual(getCurrentRank(hpLoadedState.rp).id, 'legend', 'Di HP, rank harus langsung Legend');
assert.strictEqual(hpLoadedState.profile.name, 'Aziz Petualang');
assert.strictEqual(Boolean(hpLoadedState.profile.avatar), true, 'Foto profil harus tetap tersimpan');

// Refresh di HP:
const hpRefreshedState = mapCloudDataToState(laptopProfile, laptopTasks, { id: 'usr-device-cross' });
assert.strictEqual(hpRefreshedState.rp, 50, 'Setelah refresh di HP, total RP tetap 50 RP');
assert.strictEqual(getCurrentRank(hpRefreshedState.rp).id, 'legend', 'Setelah refresh di HP, rank tetap Legend');

console.log('  [LULUS] Sesi HP memuat identitas, avatar, tugas, dan rank Legend secara konsisten.');

// ===========================================================================
// BAGIAN 6: Perlindungan Data Petualang (Data Tidak Terhapus / Berubah)
// ===========================================================================
console.log('\n[6/6] Memverifikasi Keutuhan Profil, Avatar, dan Tugas saat Rank Berubah...');

const originalAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const originalTasks = [
  { id: 'task_keep_1', title: 'Belajar Arsitektur Cloud', isRPClaimed: true, status: 'selesai' },
  { id: 'task_keep_2', title: 'Istirahat dan Meditasi', isRPClaimed: false, status: 'tersedia' }
];

const stateBeforeRankUp = mapCloudDataToState(
  { id: 'usr-safe', username: 'Penenun Bintang', avatar_url: originalAvatar, total_rp: 40 },
  originalTasks,
  { id: 'usr-safe' }
);
assert.strictEqual(getCurrentRank(stateBeforeRankUp.rp).id, 'epic');

// Naik ke Legend (50 RP)
const stateAfterRankUp = mapCloudDataToState(
  { id: 'usr-safe', username: 'Penenun Bintang', avatar_url: originalAvatar, total_rp: 50 },
  originalTasks,
  { id: 'usr-safe' }
);

assert.strictEqual(getCurrentRank(stateAfterRankUp.rp).id, 'legend');
assert.strictEqual(stateAfterRankUp.profile.name, 'Penenun Bintang', 'Nama tidak boleh berubah');
assert.strictEqual(stateAfterRankUp.profile.avatar, originalAvatar, 'Avatar tidak boleh terhapus');
assert.strictEqual(stateAfterRankUp.tasks.length, 2, 'Jumlah tugas harus tetap utuh');
assert.strictEqual(stateAfterRankUp.tasks[0].title, 'Belajar Arsitektur Cloud');



console.log('  [LULUS] Seluruh atribut profil, foto, dan daftar tugas terbukti terlindungi penuh.');

console.log('\n=== SELURUH 6 BAGIAN PENGUJIAN RANK SYNCHRONIZATION LULUS 100% ===');
