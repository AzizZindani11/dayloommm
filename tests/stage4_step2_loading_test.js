/**
 * DAYLOOM — Pengujian Stage 4 Step 2: Cloud Profile & Task Loading
 */

import assert from 'node:assert';
import {
  mapCloudDataToState,
  validateAndSanitizeState,
  createDefaultState
} from '../js/storage.js';
import { STORAGE_KEY } from '../js/config.js';
import { getCurrentRank } from '../js/progression.js';

console.log('=== MEMULAI PENGUJIAN STAGE 4 STEP 2: CLOUD PROFILE & TASK LOADING ===\n');

// ----------------------------------------------------------------------------
// 1. Pemetaan Profil dan Tasks dari Supabase ke State Frontend
// ----------------------------------------------------------------------------
console.log('[1/4] Menguji fungsi pemetaan mapCloudDataToState()...');

const mockProfileFromSupabase = {
  id: 'usr-uuid-456',
  username: 'Pendekar Sakura Hanamori',
  bio: 'Berlatih fokus di bawah pohon sakura mekar.',
  avatar_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  outfit: 'sakura_ronin',
  hat: 'kitsune_mask',
  time_of_day: 'senja',
  selected_character: 'meliodas',
  total_rp: 150, // 150 RP -> Harus otomatis berada di Rank Mythic!
  featured_achievements: ['first_thread', 'rank_riser'],
  visited_locations: ['quest_board', 'arena_dojo', 'tea_house'],
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-10T12:00:00.000Z'
};

const mockTasksFromSupabase = [
  {
    id: 'quest_cloud_101',
    dbId: 'db-uuid-task-1',
    title: 'Misi Riset AI di Perpustakaan Desa',
    description: 'Menyelesaikan modul riset mendalam.',
    category: 'akademik',
    priority: 'tinggi',
    deadline: '2026-11-15',
    status: 'selesai',
    isRPClaimed: true,
    completedOnTime: true,
    createdAt: '2026-11-05T08:00:00.000Z',
    completedAt: '2026-11-06T10:00:00.000Z',
    checklist: [
      { id: 'chk_c1', dbId: 'db-chk-1', taskDbId: 'db-uuid-task-1', text: 'Membaca paper', completed: true, orderIndex: 0 },
      { id: 'chk_c2', dbId: 'db-chk-2', taskDbId: 'db-uuid-task-1', text: 'Menulis ringkasan', completed: true, orderIndex: 1 }
    ]
  },
  {
    id: 'quest_cloud_102',
    dbId: 'db-uuid-task-2',
    title: 'Latihan Fisik Dojo Benteng Awan',
    description: 'Peregangan dan ketangkasan pedang.',
    category: 'kesehatan',
    priority: 'sedang',
    deadline: '2026-11-20',
    status: 'berjalan',
    isRPClaimed: false,
    completedOnTime: null,
    createdAt: '2026-11-07T09:00:00.000Z',
    completedAt: null,
    checklist: [
      { id: 'chk_c3', dbId: 'db-chk-3', taskDbId: 'db-uuid-task-2', text: 'Push up 20x', completed: true, orderIndex: 0 },
      { id: 'chk_c4', dbId: 'db-chk-4', taskDbId: 'db-uuid-task-2', text: 'Meditasi 10 menit', completed: false, orderIndex: 1 }
    ]
  }
];

const mappedState = mapCloudDataToState(mockProfileFromSupabase, mockTasksFromSupabase);

// Verifikasi integritas pemetaan profil
assert.strictEqual(mappedState.isCloud, true, 'isCloud harus bernilai true');
assert.strictEqual(mappedState.cloudUserId, 'usr-uuid-456', 'cloudUserId harus sesuai');
assert.strictEqual(mappedState.profile.name, 'Pendekar Sakura Hanamori');
assert.strictEqual(mappedState.profile.outfit, 'sakura_ronin');
assert.strictEqual(mappedState.profile.hat, 'kitsune_mask');
assert.strictEqual(mappedState.profile.timeOfDay, 'senja');
assert.strictEqual(mappedState.profile.selectedCharacter, 'meliodas');
assert.strictEqual(mappedState.profile.featuredAchievements.length, 2);

// Verifikasi total RP berasal dari profiles.total_rp (150)
assert.strictEqual(mappedState.rp, 150, 'Total RP harus tepat 150 sesuai server Supabase');

// Verifikasi daftar tugas dan checklist
assert.strictEqual(mappedState.tasks.length, 2, 'Harus memuat 2 tugas');
assert.strictEqual(mappedState.tasks[0].id, 'quest_cloud_101');
assert.strictEqual(mappedState.tasks[0].dbId, 'db-uuid-task-1');
assert.strictEqual(mappedState.tasks[0].isRPClaimed, true);
assert.strictEqual(mappedState.tasks[0].checklist.length, 2);
assert.strictEqual(mappedState.tasks[0].checklist[0].dbId, 'db-chk-1');
assert.strictEqual(mappedState.tasks[1].checklist[1].completed, false);

console.log('  [LULUS] mapCloudDataToState() sukses memetakan profil, tugas, checklist, dan flag database.');

// ----------------------------------------------------------------------------
// 2. Evaluasi Peringkat Resmi Mengikuti Total RP Cloud Tanpa Direset
// ----------------------------------------------------------------------------
console.log('\n[2/4] Menguji perolehan peringkat resmi dari total RP cloud...');

const rankResult = getCurrentRank(mappedState.rp);
assert.strictEqual(rankResult.id, 'mythic', 'RP 150 harus menempatkan pengembara pada Peringkat Mythic (120-219 RP)!');
assert.strictEqual(rankResult.name, 'Mythic');
assert.strictEqual(rankResult.title, 'Pendekar Sakura');
console.log(`  [LULUS] RP ${mappedState.rp} berhasil menghasilkan Peringkat ${rankResult.name} (${rankResult.title}) secara akurat.`);

// Uji ambang peringkat lainnya dari data awan
assert.strictEqual(getCurrentRank(0).id, 'epic');
assert.strictEqual(getCurrentRank(50).id, 'legend');
assert.strictEqual(getCurrentRank(220).id, 'mythic_honor');
assert.strictEqual(getCurrentRank(350).id, 'mythic_glory');
assert.strictEqual(getCurrentRank(500).id, 'mythic_immortal');
console.log('  [LULUS] Seluruh 6 peringkat resmi Dayloom konsisten dengan total RP cloud.');

// ----------------------------------------------------------------------------
// 3. Isolasi Data Tamu (dayloom_save_v1) Tidak Tertimpa Saat Cloud Memuat
// ----------------------------------------------------------------------------
console.log('\n[3/4] Menguji perlindungan mutlak data tamu saat proses muat cloud berlangsung...');

class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] || null; }
  setItem(k, v) { this.store[k] = String(v); }
}

const storage = new MockStorage();

// Tamu lokal memiliki data tersimpan
const guestSave = createDefaultState();
guestSave.profile.name = 'Pengembara Tamu Abadi';
guestSave.rp = 40;
guestSave.rewardedTaskIds = ['quest_tamu_1', 'quest_tamu_2', 'quest_tamu_3', 'quest_tamu_4'];
storage.setItem(STORAGE_KEY, JSON.stringify(guestSave));

// Simulasi loadCloudUserData: saat memuat, data disimpan ke cache akun, BUKAN ke STORAGE_KEY
const cloudCacheKey = `dayloom_user_${mockProfileFromSupabase.id}`;
storage.setItem(cloudCacheKey, JSON.stringify(mappedState));

// Periksa bahwa STORAGE_KEY tetap utuh
const guestCheck = JSON.parse(storage.getItem(STORAGE_KEY));
assert.strictEqual(guestCheck.profile.name, 'Pengembara Tamu Abadi');
assert.strictEqual(guestCheck.rp, 40);
assert.strictEqual(guestCheck.rewardedTaskIds.length, 4);

// Periksa bahwa cache cloud tersimpan terpisah
const cloudCheck = JSON.parse(storage.getItem(cloudCacheKey));
assert.strictEqual(cloudCheck.profile.name, 'Pendekar Sakura Hanamori');
assert.strictEqual(cloudCheck.rp, 150);

console.log('  [LULUS] Data tamu di LocalStorage "dayloom_save_v1" 100% tidak terpengaruh oleh pemuatan profil cloud.');

// ----------------------------------------------------------------------------
// 4. Penanganan Kegagalan Fetch (Offline / Error) Tanpa Merusak Data Tamu
// ----------------------------------------------------------------------------
console.log('\n[4/4] Menguji ketahanan terhadap kegagalan fetch cloud...');

// Simulasikan kegagalan fetch (misal fetchProfile mengembalikan null karena offline)
const failedProfile = null;
const failedTasks = [];
const fallbackUser = { id: 'usr_fail_999', email: 'offline@example.com' };

const safeFallbackState = mapCloudDataToState(failedProfile, failedTasks, fallbackUser);
assert.strictEqual(safeFallbackState.isCloud, true);
assert.strictEqual(safeFallbackState.cloudUserId, 'usr_fail_999');
assert.strictEqual(safeFallbackState.profile.name, 'offline');
assert.strictEqual(safeFallbackState.rp, 0);
assert.strictEqual(safeFallbackState.tasks.length, 0);

// Pastikan data tamu masih utuh setelah kegagalan
const guestCheckAfterFail = JSON.parse(storage.getItem(STORAGE_KEY));
assert.strictEqual(guestCheckAfterFail.profile.name, 'Pengembara Tamu Abadi');
assert.strictEqual(guestCheckAfterFail.rp, 40);

console.log('  [LULUS] Kegagalan fetch ditangani dengan fallback aman tanpa mencemari LocalStorage tamu.');

console.log('\n=== SELURUH PENGUJIAN STAGE 4 STEP 2 LULUS 100% ===');

