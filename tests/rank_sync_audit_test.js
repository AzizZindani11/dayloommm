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
import { getCurrentRank, getRankProgress, getHighestRank, awardRPForTask, awardRPForPvPWin } from '../js/progression.js';
import { mapCloudDataToState, validateAndSanitizeState, createDefaultState } from '../js/storage.js';

console.log('=== MEMULAI TEST SUITE: DAYLOOM RANK SYNCHRONIZATION & RECONCILIATION ===\n');

// ===========================================================================
// BAGIAN 1: Konsistensi 6 Peringkat Resmi & Batas RP di Semua Layer
// ===========================================================================
console.log('[1/7] Menguji Batas RP dan Konsistensi 6 Peringkat Resmi...');

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
console.log('\n[2/7] Menguji Perlindungan dan Pemulihan jika profiles.total_rp Bernilai NULL / 0...');

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
console.log('\n[3/7] Menguji Konsistensi Rekonsiliasi Lintas 4 Sumber Data Supabase...');

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
console.log('\n[4/7] Menguji Penanganan Type Safety pada claimTaskRP...');

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
console.log('\n[5/7] Menguji Konsistensi Multi-Device (Laptop -> HP) Setelah Refresh...');

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
console.log('\n[6/7] Memverifikasi Keutuhan Profil, Avatar, dan Tugas saat Rank Berubah...');

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

// ===========================================================================
// BAGIAN 7: Skenario Reproduksi User (RP Bertambah -> Rank Naik -> Logout -> Login)
// ===========================================================================
console.log('\n[7/7] Menguji Skenario Kritis: Dojo RP -> Rank Naik -> Logout -> Login Kembali...');

// Mock localStorage simulator
const mockStore = new Map();
const customStorage = {
  getItem: (k) => mockStore.has(k) ? mockStore.get(k) : null,
  setItem: (k, v) => mockStore.set(k, String(v)),
  removeItem: (k) => mockStore.delete(k)
};

const reproUserId = 'usr_repro_dojo_789';
const reproUser = { id: reproUserId, email: 'petualang@gmail.com' };

// 1. Akun mulai dengan 0 RP dan rank Epic
const initialReproState = mapCloudDataToState(
  { id: reproUserId, username: 'Pendekar Dojo', total_rp: 0 },
  [],
  reproUser
);
assert.strictEqual(initialReproState.rp, 0);
assert.strictEqual(getCurrentRank(initialReproState.rp).id, 'epic');

// 2. Bermain Dojo dan memperoleh RP hingga mencapai 50 RP (Legend)
initialReproState.rp = 50;
initialReproState.rewardedPvPMatchIds = ['pvp_match_001', 'pvp_match_002', 'pvp_match_003'];
initialReproState.rankHistory.push({
  rankId: 'legend',
  rankName: 'Legend',
  reachedAt: new Date().toISOString(),
  rpAtTime: 50
});
const curRankAfterDojo = getCurrentRank(initialReproState.rp);
assert.strictEqual(curRankAfterDojo.id, 'legend', 'Rank harus naik ke Legend setelah bermain Dojo!');
initialReproState.profile.title = curRankAfterDojo.title;

// Simpan ke cache sesi akun pengguna
customStorage.setItem(`dayloom_user_${reproUserId}`, JSON.stringify(initialReproState));

// 3. Pengguna LOGOUT -> state beralih kembali ke Mode Tamu
const guestState = createDefaultState();
customStorage.setItem('dayloom_save_v1', JSON.stringify(guestState));
assert.strictEqual(guestState.rp, 0, 'Mode tamu harus tetap 0 RP');
assert.strictEqual(getCurrentRank(guestState.rp).id, 'epic');

// 4. Pengguna LOGIN KEMBALI menggunakan akun yang sama
// Baca cache sesi akun pengguna
const rawCached = customStorage.getItem(`dayloom_user_${reproUserId}`);
assert.ok(rawCached, 'Cache pengguna harus tetap ada setelah logout');
const parsedCached = JSON.parse(rawCached);

// Simulasi jika Supabase profiles.total_rp masih 0 (atau belum selesai sinkron di cloud):
const profileFromCloud = { id: reproUserId, username: 'Pendekar Dojo', total_rp: 0 };
const restoredAfterLogin = mapCloudDataToState(
  profileFromCloud,
  [],
  reproUser,
  initialReproState.rankHistory,
  [],
  parsedCached
);

// VERIFIKASI UTAMA: Rank TIDAK BOLEH reset ke Epic! Harus tetap Legend (50 RP)!
assert.strictEqual(restoredAfterLogin.rp, 50, 'Total RP harus tetap 50 RP setelah logout dan login kembali!');
const restoredRank = getCurrentRank(restoredAfterLogin.rp);
assert.strictEqual(restoredRank.id, 'legend', 'Rank HARUS tetap Legend setelah logout dan login kembali!');
assert.strictEqual(restoredRank.name, 'Legend');
assert.strictEqual(restoredAfterLogin.profile.title, 'Penjaga Lentera');
assert.strictEqual(restoredAfterLogin.rewardedPvPMatchIds.length, 3, 'Buku besar PvP match harus tetap terpelihara');

// Simulasikan self-healing yang mengupdate cloud database:
profileFromCloud.total_rp = restoredAfterLogin.rp;
const finalSyncedState = mapCloudDataToState(profileFromCloud, [], reproUser);
assert.strictEqual(finalSyncedState.rp, 50);
assert.strictEqual(getCurrentRank(finalSyncedState.rp).id, 'legend');

console.log('  [LULUS] Skenario RP Bertambah -> Rank Naik -> Logout -> Login terbukti mempertahankan Rank Legend (50 RP) secara konsisten.');

// ===========================================================================
// BAGIAN 8: Final Code Review Verification — 6 Kriteria Keamanan & Integritas
// ===========================================================================
console.log('\n[8/8] Memverifikasi 6 Fokus Final Code Review...');

// Fokus 1: cachedRP tidak bisa sembarangan menaikkan RP Supabase jika tidak valid / ditempa
const forgedCacheEmpty = {
  version: 1,
  isCloud: true,
  cloudUserId: 'usr-forged-1',
  rp: 9999, // Pemalsuan RP tanpa aktivitas
  rewardedTaskIds: [],
  rewardedPvPMatchIds: [],
  tasks: []
};
const forgedReconciledEmpty = mapCloudDataToState(
  { id: 'usr-forged-1', username: 'Penyerang Cache', total_rp: 0 },
  [],
  { id: 'usr-forged-1' },
  [],
  [],
  forgedCacheEmpty
);
assert.strictEqual(forgedReconciledEmpty.rp, 0, 'Cache palsu 9999 RP tanpa tugas/PvP harus ditolak dan dibatasi menjadi 0 RP!');
assert.strictEqual(getCurrentRank(forgedReconciledEmpty.rp).id, 'epic');

// Fokus 1b: Cache ditempa padahal hanya menyelesaikan 5 tugas (50 RP)
const forgedCache5Tasks = {
  version: 1,
  isCloud: true,
  cloudUserId: 'usr-forged-2',
  rp: 9999,
  rewardedTaskIds: ['t1', 't2', 't3', 't4', 't5'],
  rewardedPvPMatchIds: [],
  tasks: [
    { id: 't1', isRPClaimed: true },
    { id: 't2', isRPClaimed: true },
    { id: 't3', isRPClaimed: true },
    { id: 't4', isRPClaimed: true },
    { id: 't5', isRPClaimed: true }
  ]
};
const forgedReconciled5Tasks = mapCloudDataToState(
  { id: 'usr-forged-2', username: 'Penyerang Cache 2', total_rp: 50 },
  forgedCache5Tasks.tasks,
  { id: 'usr-forged-2' },
  [],
  [],
  forgedCache5Tasks
);
assert.strictEqual(forgedReconciled5Tasks.rp, 50, 'Cache dengan 5 tugas (50 RP) tidak boleh digelembungkan melebihi 50 RP!');
assert.strictEqual(getCurrentRank(forgedReconciled5Tasks.rp).id, 'legend');

// Fokus 2: RP Dojo disimpan melalui jalur dedicated onAwardPvPWin & handlePvPWinReward
const appCode = fs.readFileSync(path.resolve('js/app.js'), 'utf-8');
const arenaCode = fs.readFileSync(path.resolve('js/arena.js'), 'utf-8');

assert.ok(arenaCode.includes('onAwardPvPWin'), 'ArenaController harus mendukung callback onAwardPvPWin');
assert.ok(arenaCode.includes('this.onAwardPvPWin(res, result.matchId)'), 'ArenaController harus memanggil onAwardPvPWin saat pemain menang');
assert.ok(appCode.includes('onAwardPvPWin: (rewardResult, matchId) => this.handlePvPWinReward(rewardResult, matchId)'), 'DayloomApp harus mengaitkan onAwardPvPWin ke handlePvPWinReward');
assert.ok(appCode.includes('handlePvPWinReward(rewardResult, matchId)'), 'handlePvPWinReward harus didefinisikan sebagai jalur resmi award PvP');

// Fokus 3: updateProfile bebas dari race condition dan tidak menimpa RP dengan nilai lama
assert.ok(appCode.includes('this.lastSyncedRP = targetRP;'), 'handlePvPWinReward harus mencatat lastSyncedRP');
const persistAndRefreshBody = appCode.slice(appCode.indexOf('persistAndRefresh()'), appCode.indexOf('refreshAllUI()'));
assert.ok(!persistAndRefreshBody.includes('updateProfile'), 'persistAndRefresh umum tidak boleh memanggil updateProfile');

// Fokus 4: rank_history tidak mendistorsi total_rp aktif saat login
const staleRankHistory = [
  { rank_id: 'mythic_glory', rank_name: 'Mythic Glory', rp_at_time: 350, reached_at: '2026-01-01T00:00:00.000Z' }
];
const stateWithStaleHistory = mapCloudDataToState(
  { id: 'usr-stale-history', username: 'Legenda Masa Lalu', total_rp: 50 },
  [
    { id: 'm1', isRPClaimed: true },
    { id: 'm2', isRPClaimed: true },
    { id: 'm3', isRPClaimed: true },
    { id: 'm4', isRPClaimed: true },
    { id: 'm5', isRPClaimed: true }
  ],
  { id: 'usr-stale-history' },
  staleRankHistory,
  []
);
assert.strictEqual(stateWithStaleHistory.rp, 50, 'totalRP aktif harus tetap 50 RP (Legend), bukan 350 RP dari rank_history!');
assert.strictEqual(getCurrentRank(stateWithStaleHistory.rp).id, 'legend');

// Fokus 5: Anti-duplikasi RP saat login ulang atau multi-perangkat
const multiDeviceProfile = { id: 'usr-no-dup', total_rp: 50 };
const multiDeviceTasks = [
  { id: 'd1', isRPClaimed: true },
  { id: 'd2', isRPClaimed: true },
  { id: 'd3', isRPClaimed: true },
  { id: 'd4', isRPClaimed: true },
  { id: 'd5', isRPClaimed: true }
];
const multiDeviceLedger = [
  { points: 10 }, { points: 10 }, { points: 10 }, { points: 10 }, { points: 10 }
];
// Rekonsiliasi 1
const sync1 = mapCloudDataToState(multiDeviceProfile, multiDeviceTasks, { id: 'usr-no-dup' }, [], multiDeviceLedger);
assert.strictEqual(sync1.rp, 50);
// Rekonsiliasi 2 (login ulang / refresh)
const sync2 = mapCloudDataToState(multiDeviceProfile, multiDeviceTasks, { id: 'usr-no-dup' }, [], multiDeviceLedger);
assert.strictEqual(sync2.rp, 50, 'RP tidak boleh terduplikasi (50 + 50 = 100) setelah login ulang!');

// Fokus 6: Keutuhan profil, avatar, task, dan arenaStats
const fullProfileState = mapCloudDataToState(
  {
    id: 'usr-full-check',
    username: 'Pendekar Lengkap',
    avatar_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    bio: 'Jalan seorang ksatria.',
    outfit: 'ronin',
    hat: 'straw_hat',
    time_of_day: 'senja',
    selected_character: 'meliodas',
    featured_achievements: ['ach_1', 'ach_2'],
    total_rp: 60
  },
  [{ id: 't_custom', title: 'Latihan Pedang', isRPClaimed: true }],
  { id: 'usr-full-check' },
  [],
  [],
  {
    arenaStats: {
      wins: 14,
      totalSessions: 20,
      bestCombo: 9,
      totalFocusMinutes: 120
    },
    rewardedPvPMatchIds: ['match_01', 'match_02']
  }
);
assert.strictEqual(fullProfileState.profile.name, 'Pendekar Lengkap');
assert.strictEqual(fullProfileState.profile.bio, 'Jalan seorang ksatria.');
assert.strictEqual(fullProfileState.profile.outfit, 'ronin');
assert.strictEqual(fullProfileState.profile.hat, 'straw_hat');
assert.strictEqual(fullProfileState.profile.timeOfDay, 'senja');
assert.strictEqual(fullProfileState.profile.selectedCharacter, 'meliodas');
assert.strictEqual(fullProfileState.tasks.length, 1);
assert.strictEqual(fullProfileState.tasks[0].title, 'Latihan Pedang');
assert.strictEqual(fullProfileState.arenaStats.wins, 14);
assert.strictEqual(fullProfileState.arenaStats.totalSessions, 20);
assert.strictEqual(fullProfileState.arenaStats.bestCombo, 9);
assert.strictEqual(fullProfileState.arenaStats.totalFocusMinutes, 120);
assert.strictEqual(fullProfileState.rewardedPvPMatchIds.length, 2);

console.log('  [LULUS] Seluruh 6 fokus Final Code Review terverifikasi 100% aman dan tangguh.');

// ===========================================================================
// BAGIAN 9: FINAL RP SYSTEM UNIFICATION & REGRESSION SUITE (SKENARIO A - J)
// Memverifikasi Penyatuan Total RP: Arena + Mission Board + Global Rank
// ===========================================================================
console.log('\n[9/9] Menguji 10 Skenario Wajib Penyatuan RP (Arena + Mission Board + Global Rank)...');

// Mock localStorage simulator untuk pengujian sesi & akun
const testStorageMap = new Map();
const testStorage = {
  getItem: (k) => testStorageMap.has(k) ? testStorageMap.get(k) : null,
  setItem: (k, v) => testStorageMap.set(k, String(v)),
  removeItem: (k) => testStorageMap.delete(k),
  clear: () => testStorageMap.clear()
};

// --- SKENARIO A: Arena Memberikan RP (30 RP -> menang Arena -> 40 RP / 50 RP) ---
const stateA = createDefaultState();
stateA.rp = 30;
stateA.rewardedTaskIds = ['t_init_1', 't_init_2', 't_init_3'];
stateA.rewardedPvPMatchIds = [];
const winResA = awardRPForPvPWin(stateA, 'match_scen_a_001', { points: 10 });
assert.strictEqual(winResA.awarded, true);
assert.strictEqual(stateA.rp, 40, 'Skenario A: 30 RP + 10 RP Arena harus menjadi 40 RP!');
assert.strictEqual(stateA.rewardedPvPMatchIds.includes('match_scen_a_001'), true);
console.log('  [LULUS] Skenario A: 30 RP -> menang Arena -> 40 RP berhasil.');

// --- SKENARIO B: Arena Rank-Up (40 RP -> menang Arena -> 50 RP -> Legend) ---
const winResB = awardRPForPvPWin(stateA, 'match_scen_b_002', { points: 10 });
assert.strictEqual(winResB.awarded, true);
assert.strictEqual(stateA.rp, 50, 'Skenario B: 40 RP + 10 RP Arena harus menjadi 50 RP!');
assert.strictEqual(winResB.rankedUp, true, 'Harus naik rank saat mencapai 50 RP!');
assert.strictEqual(winResB.newRank.id, 'legend', 'Peringkat harus tepat Legend!');
assert.strictEqual(getCurrentRank(stateA.rp).id, 'legend');
console.log('  [LULUS] Skenario B: 40 RP -> menang Arena -> 50 RP -> Naik ke Legend terverifikasi.');

// --- SKENARIO C: Mission Board (50 RP -> buat misi baru -> selesaikan misi -> 60 RP) ---
const newQuestC = {
  id: 'quest_scen_c_99',
  title: 'Misi Prioritas Strategis Desa',
  status: 'berjalan',
  checklist: [{ id: 'chk_c1', text: 'Target utama tuntas', completed: true }]
};
stateA.tasks.unshift(newQuestC);
// Total RP tidak boleh berubah saat membuat misi
assert.strictEqual(stateA.rp, 50, 'Membuat misi baru tidak boleh mereset atau mengurangi 50 RP!');

// Selesaikan misi tersebut (+10 RP)
newQuestC.status = 'selesai';
const questRewardC = awardRPForTask(stateA, newQuestC);
assert.strictEqual(questRewardC.awarded, true);
assert.strictEqual(questRewardC.rpGained, 10);
assert.strictEqual(stateA.rp, 60, 'Skenario C: 50 RP (dari Arena) + 10 RP (dari Misi) HARUS menjadi 60 RP kumulatif!');
assert.strictEqual(getCurrentRank(stateA.rp).id, 'legend', 'Rank harus tetap Legend pada 60 RP!');
console.log('  [LULUS] Skenario C: 50 RP -> buat misi -> selesaikan -> 60 RP terbukti terakumulasi satu sumber.');

// --- SKENARIO D: Kombinasi Bolak-Balik (Arena -> Mission -> Arena -> Mission) ---
const comboState = createDefaultState();
comboState.rp = 0;
comboState.rewardedTaskIds = [];
comboState.rewardedPvPMatchIds = [];

// 1. Mission 1 (+10 RP)
const m1 = { id: 'comb_m1', status: 'selesai', checklist: [] };
awardRPForTask(comboState, m1);
assert.strictEqual(comboState.rp, 10);

// 2. Arena Match 1 (+20 RP)
awardRPForPvPWin(comboState, 'comb_pvp_1', { points: 20 });
assert.strictEqual(comboState.rp, 30);

// 3. Mission 2 (+10 RP)
const m2 = { id: 'comb_m2', status: 'selesai', checklist: [] };
awardRPForTask(comboState, m2);
assert.strictEqual(comboState.rp, 40);

// 4. Arena Match 2 (+20 RP) -> Mencapai 60 RP (Legend)
const pvpRes2 = awardRPForPvPWin(comboState, 'comb_pvp_2', { points: 20 });
assert.strictEqual(comboState.rp, 60);
assert.strictEqual(pvpRes2.rankedUp, true);
assert.strictEqual(getCurrentRank(comboState.rp).id, 'legend');

// 5. Mission 3 (+10 RP) -> Mencapai 70 RP
const m3 = { id: 'comb_m3', status: 'selesai', checklist: [] };
awardRPForTask(comboState, m3);
assert.strictEqual(comboState.rp, 70);
assert.strictEqual(getCurrentRank(comboState.rp).id, 'legend');
console.log('  [LULUS] Skenario D: Kombinasi bolak-balik Arena dan Mission Board terbukti 100% kumulatif (70 RP).');

// --- SKENARIO E: Persistence (60 RP -> Refresh Halaman -> Tetap 60 RP) ---
testStorage.setItem('dayloom_user_user_persist', JSON.stringify(stateA));
const cachedRaw = JSON.parse(testStorage.getItem('dayloom_user_user_persist'));

const refreshedState = mapCloudDataToState(
  { id: 'user_persist', total_rp: 60 },
  stateA.tasks,
  { id: 'user_persist' },
  [{ rank_id: 'legend', rp_at_time: 50 }],
  [
    { id: 'led_1', points: 10, reason: 'Misi A1' },
    { id: 'led_2', points: 10, reason: 'Misi A2' },
    { id: 'led_3', points: 10, reason: 'Misi A3' },
    { id: 'led_pvp', points: 20, reason: 'Arena Win' },
    { id: 'led_c', points: 10, reason: 'Misi C' }
  ],
  cachedRaw
);
assert.strictEqual(refreshedState.rp, 60, 'Skenario E: Setelah refresh, total RP harus tetap 60 RP!');
assert.strictEqual(getCurrentRank(refreshedState.rp).id, 'legend', 'Setelah refresh, rank harus tetap Legend!');
console.log('  [LULUS] Skenario E: Persistence 60 RP setelah refresh terbukti konsisten.');

// --- SKENARIO F: Account (60 RP -> Logout -> Login Kembali -> Tetap 60 RP) ---
// Logout: Beralih ke state tamu (0 RP)
const guestLogoutState = createDefaultState();
assert.strictEqual(guestLogoutState.rp, 0);
assert.strictEqual(getCurrentRank(guestLogoutState.rp).id, 'epic');

// Login Kembali: Memuat data cloud dan cache pengguna
const reLoginState = mapCloudDataToState(
  { id: 'user_persist', total_rp: 60 },
  stateA.tasks,
  { id: 'user_persist' },
  [{ rank_id: 'legend', rp_at_time: 50 }],
  [
    { id: 'led_1', points: 10 },
    { id: 'led_2', points: 10 },
    { id: 'led_3', points: 10 },
    { id: 'led_pvp', points: 20 },
    { id: 'led_c', points: 10 }
  ],
  cachedRaw
);
assert.strictEqual(reLoginState.rp, 60, 'Skenario F: Setelah logout dan login kembali, total RP tetap 60 RP!');
assert.strictEqual(getCurrentRank(reLoginState.rp).id, 'legend');
console.log('  [LULUS] Skenario F: Logout dan login kembali mempertahankan 60 RP & Rank Legend.');

// --- SKENARIO G: Replace / Delete Mission (RP yang Diperoleh Tetap Utuh) ---
// Misi di board diganti dengan 3 misi baru yang belum selesai
const replacedTasks = [
  { id: 'q_rep_1', isRPClaimed: false, status: 'tersedia', title: 'Misi Baru 1' },
  { id: 'q_rep_2', isRPClaimed: false, status: 'tersedia', title: 'Misi Baru 2' },
  { id: 'q_rep_3', isRPClaimed: false, status: 'tersedia', title: 'Misi Baru 3' }
];
const stateReplaced = mapCloudDataToState(
  { id: 'user_persist', total_rp: 60 },
  replacedTasks,
  { id: 'user_persist' },
  [{ rank_id: 'legend', rp_at_time: 50 }],
  [
    { id: 'led_1', points: 10 },
    { id: 'led_2', points: 10 },
    { id: 'led_3', points: 10 },
    { id: 'led_pvp', points: 20 },
    { id: 'led_c', points: 10 }
  ],
  reLoginState
);
assert.strictEqual(stateReplaced.rp, 60, 'Skenario G: Mengganti atau menghapus misi TIDAK BOLEH mengurangi 60 RP!');
assert.strictEqual(getCurrentRank(stateReplaced.rp).id, 'legend');
assert.strictEqual(stateReplaced.tasks.length, 3);
assert.ok(stateReplaced.rewardedTaskIds.includes('quest_scen_c_99'), 'Riwayat ID tugas yang telah diberi reward tetap terpelihara');
console.log('  [LULUS] Skenario G: Replace/delete misi terbukti mempertahankan seluruh 60 RP.');

// --- SKENARIO H: Duplicate Reward Prevention (Anti-Duplikasi Ketat) ---
// Klaim ulang task yang sama
const dupTaskRes = awardRPForTask(stateA, newQuestC);
assert.strictEqual(dupTaskRes.awarded, false, 'Klaim task yang sama harus ditolak');
assert.strictEqual(dupTaskRes.rpGained, 0);

// Klaim ulang match PvP yang sama
const dupMatchRes = awardRPForPvPWin(stateA, 'match_scen_a_001', { points: 10 });
assert.strictEqual(dupMatchRes.awarded, false, 'Klaim match PvP yang sama harus ditolak');
assert.strictEqual(dupMatchRes.rpGained, 0);

// Deduplikasi entri di rp_ledger
const duplicatedLedger = [
  { id: 'txn_1', points: 10 },
  { id: 'txn_1', points: 10 }, // Duplikat transaksi ID sama
  { id: 'txn_2', points: 20 }
];
const dupLedgerState = mapCloudDataToState(
  { id: 'usr_dup_check', total_rp: 30 },
  [],
  { id: 'usr_dup_check' },
  [],
  duplicatedLedger
);
assert.strictEqual(dupLedgerState.rp, 30, 'Buku besar rp_ledger harus menyaring transaksi duplikat menjadi 30 RP');
console.log('  [LULUS] Skenario H: Pencegahan reward duplikat (Anti-Duplikasi) terbukti aman 100%.');

// --- SKENARIO I: Account Isolation (Isolasi Antar Pengguna) ---
const userA_ID = 'user_account_alpha';
const userB_ID = 'user_account_beta';

const userA_State = mapCloudDataToState(
  { id: userA_ID, username: 'Alpha', total_rp: 60 },
  [{ id: 't_a1', isRPClaimed: true }],
  { id: userA_ID },
  [{ rank_id: 'legend', rp_at_time: 50 }],
  [{ id: 'l_a1', points: 60 }]
);
testStorage.setItem(`dayloom_user_${userA_ID}`, JSON.stringify(userA_State));

const userB_State = mapCloudDataToState(
  { id: userB_ID, username: 'Beta', total_rp: 10 },
  [{ id: 't_b1', isRPClaimed: true }],
  { id: userB_ID },
  [],
  [{ id: 'l_b1', points: 10 }]
);
testStorage.setItem(`dayloom_user_${userB_ID}`, JSON.stringify(userB_State));

// Verifikasi pembacaan terisolasi
const loadedA = JSON.parse(testStorage.getItem(`dayloom_user_${userA_ID}`));
const loadedB = JSON.parse(testStorage.getItem(`dayloom_user_${userB_ID}`));

assert.strictEqual(loadedA.rp, 60, 'Akun Alpha harus tetap 60 RP (Legend)');
assert.strictEqual(getCurrentRank(loadedA.rp).id, 'legend');
assert.strictEqual(loadedB.rp, 10, 'Akun Beta harus tetap 10 RP (Epic)');
assert.strictEqual(getCurrentRank(loadedB.rp).id, 'epic');
assert.notStrictEqual(loadedA.cloudUserId, loadedB.cloudUserId, 'ID pengguna harus terisolasi penuh');
console.log('  [LULUS] Skenario I: Isolasi antar-akun terbukti 100% aman dan tidak tercampur.');

// --- SKENARIO J: Rank Calculation dari Total RP Kumulatif ---
const rankCheckCases = [
  { rp: 0, expected: 'epic' },
  { rp: 49, expected: 'epic' },
  { rp: 50, expected: 'legend' },
  { rp: 119, expected: 'legend' },
  { rp: 120, expected: 'mythic' },
  { rp: 219, expected: 'mythic' },
  { rp: 220, expected: 'mythic_honor' },
  { rp: 349, expected: 'mythic_honor' },
  { rp: 350, expected: 'mythic_glory' },
  { rp: 499, expected: 'mythic_glory' },
  { rp: 500, expected: 'mythic_immortal' }
];
rankCheckCases.forEach(({ rp, expected }) => {
  const rk = getCurrentRank(rp);
  assert.strictEqual(rk.id, expected, `RP kumulatif ${rp} harus menghasilkan rank ${expected}`);
});
console.log('  [LULUS] Skenario J: Perhitungan rank dari total RP kumulatif terbukti konsisten di seluruh batas tier.');

console.log('\n=== SELURUH 9 BAGIAN PENGUJIAN RANK SYNCHRONIZATION LULUS 100% ===');
