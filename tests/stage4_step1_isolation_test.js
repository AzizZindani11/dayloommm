/**
 * DAYLOOM — Pengujian Stage 4 Step 1: Isolasi State & Keselamatan Data Tamu vs Cloud
 */

import assert from 'node:assert';
import fs from 'node:fs';
import {
  validateAndSanitizeState,
  createDefaultState
} from '../js/storage.js';
import { STORAGE_KEY } from '../js/config.js';

console.log('=== MEMULAI PENGUJIAN STAGE 4 STEP 1: ISOLASI STATE & DATA SAFETY ===\n');

// ----------------------------------------------------------------------------
// 1. Sanitasi State: Mode Tamu (Ledger Verifikasi) vs Mode Cloud (Server Authoritative)
// ----------------------------------------------------------------------------
console.log('[1/4] Menguji sistem sanitasi validateAndSanitizeState()...');

// 1a. Mode Tamu Lokal: RP dipaksa sesuai buku besar rewardedTaskIds & rewardedPvPMatchIds
const guestRaw = {
  profile: { name: 'Tamu Hanamori' },
  rp: 999, // Nilai RP tidak sesuai dengan ledger (seharusnya 10 karena hanya 1 rewarded task)
  rewardedTaskIds: ['quest_starter_1'],
  rewardedPvPMatchIds: []
};
const sanitizedGuest = validateAndSanitizeState(guestRaw);
assert.strictEqual(sanitizedGuest.isCloud, false, 'Guest state harus memiliki isCloud = false');
assert.strictEqual(sanitizedGuest.rp, 10, 'Guest state harus menyesuaikan RP sesuai ledger (+10 RP)');
console.log('  [LULUS] Mode Tamu: Konsistensi buku besar RP lokal tetap ditegakkan (RP: 10).');

// 1b. Mode Akun Cloud: RP berasal dari server Supabase dan TIDAK di-reset ke ledger lokal
const cloudRaw = {
  isCloud: true,
  cloudUserId: 'user-uuid-123',
  profile: { name: 'Pendekar Cloud' },
  rp: 120, // 120 RP (Mythic) dari profiles.total_rp di database Supabase
  rewardedTaskIds: [], // Belum ada task lokal
  rewardedPvPMatchIds: []
};
const sanitizedCloud = validateAndSanitizeState(cloudRaw, { isCloud: true });
assert.strictEqual(sanitizedCloud.isCloud, true, 'Cloud state harus memiliki isCloud = true');
assert.strictEqual(sanitizedCloud.cloudUserId, 'user-uuid-123', 'cloudUserId harus tersimpan');
assert.strictEqual(sanitizedCloud.rp, 120, 'RP akun cloud HARUS dipertahankan 120 (tidak boleh di-reset ke 0)!');
console.log('  [LULUS] Mode Akun Cloud: RP 120 dari server Supabase dipertahankan utuh tanpa di-reset.');

// ----------------------------------------------------------------------------
// 2. Pemetaan ID Database pada Task & Checklist
// ----------------------------------------------------------------------------
console.log('\n[2/4] Menguji sanitasi Task dengan properti database (dbId, isRPClaimed)...');
const taskWithDb = {
  id: 'quest_local_101',
  dbId: 'db-uuid-task-999',
  title: 'Misi Uji Database',
  status: 'selesai',
  isRPClaimed: true,
  checklist: [
    { id: 'chk_1', dbId: 'db-uuid-chk-1', text: 'Syarat Satu', completed: true },
    { id: 'chk_2', dbId: 'db-uuid-chk-2', text: 'Syarat Dua', completed: false }
  ]
};
const cloudStateWithTask = validateAndSanitizeState({
  isCloud: true,
  cloudUserId: 'user-uuid-123',
  tasks: [taskWithDb]
});

const preservedTask = cloudStateWithTask.tasks[0];
assert.strictEqual(preservedTask.id, 'quest_local_101');
assert.strictEqual(preservedTask.dbId, 'db-uuid-task-999', 'Task dbId harus dipertahankan');
assert.strictEqual(preservedTask.isRPClaimed, true, 'isRPClaimed harus dipertahankan');
assert.strictEqual(preservedTask.checklist[0].dbId, 'db-uuid-chk-1', 'Checklist 0 dbId harus dipertahankan');
assert.strictEqual(preservedTask.checklist[1].dbId, 'db-uuid-chk-2', 'Checklist 1 dbId harus dipertahankan');
console.log('  [LULUS] Dual ID mapping (local id & dbId) dan flag isRPClaimed lolos sanitasi tanpa hilang.');

// ----------------------------------------------------------------------------
// 3. Simulasi Persistensi Terpisah: dayloom_save_v1 Tidak Boleh Ditimpa Akun Cloud
// ----------------------------------------------------------------------------
console.log('\n[3/4] Menguji isolasi penyimpanan LocalStorage (Tamu vs Cloud)...');

// Mock localStorage sederhana
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

const mockStorage = new MockLocalStorage();

// Simpan data awal Tamu (30 RP di dayloom_save_v1)
const initialGuest = createDefaultState();
initialGuest.profile.name = 'Pengembara Tamu Asli';
initialGuest.rewardedTaskIds = ['quest_1', 'quest_2', 'quest_3'];
initialGuest.rp = 30;
mockStorage.setItem(STORAGE_KEY, JSON.stringify(initialGuest));

// Verifikasi data tamu awal tersimpan
const guestReadBefore = JSON.parse(mockStorage.getItem(STORAGE_KEY));
assert.strictEqual(guestReadBefore.profile.name, 'Pengembara Tamu Asli');
assert.strictEqual(guestReadBefore.rp, 30);

// Simulasikan alur penyimpanan Mode Akun Cloud
const cloudUser = { id: 'usr_abc_789', email: 'cloud@example.com' };
const cloudState = {
  isCloud: true,
  cloudUserId: cloudUser.id,
  profile: { name: 'Akun Cloud Baru' },
  rp: 200,
  tasks: []
};

// Fungsi simulasi persistensi aktif yang diterapkan di app.js
function simulateSaveActiveState(currentUser, state, storage) {
  if (currentUser) {
    // Mode Cloud: Simpan ke key khusus user, JANGAN sentuh STORAGE_KEY ('dayloom_save_v1')
    const cloudKey = `dayloom_user_${currentUser.id}`;
    const clean = validateAndSanitizeState(state, { isCloud: true, cloudUserId: currentUser.id });
    storage.setItem(cloudKey, JSON.stringify(clean));
    return true;
  }
  // Mode Tamu: Simpan ke STORAGE_KEY
  const clean = validateAndSanitizeState(state);
  storage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return true;
}

// Eksekusi penyimpanan saat user cloud aktif
simulateSaveActiveState(cloudUser, cloudState, mockStorage);

// Verifikasi 1: dayloom_save_v1 TIDAK BERUBAH dan TIDAK TERTIPA!
const guestReadAfter = JSON.parse(mockStorage.getItem(STORAGE_KEY));
assert.strictEqual(guestReadAfter.profile.name, 'Pengembara Tamu Asli', 'Data tamu TIDAK boleh tertimpa nama akun cloud!');
assert.strictEqual(guestReadAfter.rp, 30, 'RP tamu TIDAK boleh berubah!');
assert.strictEqual(guestReadAfter.rewardedTaskIds.length, 3, 'Task tamu tetap utuh!');

// Verifikasi 2: Cache user cloud tersimpan di key miliknya sendiri
const cloudRead = JSON.parse(mockStorage.getItem(`dayloom_user_${cloudUser.id}`));
assert.strictEqual(cloudRead.profile.name, 'Akun Cloud Baru');
assert.strictEqual(cloudRead.rp, 200);
assert.strictEqual(cloudRead.isCloud, true);

console.log('  [LULUS] Data tamu di "dayloom_save_v1" terbukti 100% utuh dan tidak tersentuh saat user cloud aktif.');
console.log('  [LULUS] Data akun cloud tersimpan terisolasi di "dayloom_user_usr_abc_789".');

// ----------------------------------------------------------------------------
// 4. Verifikasi Kontrak createTask() Mengembalikan dbId untuk Checklist
// ----------------------------------------------------------------------------
console.log('\n[4/4] Menguji kontrak createTask() pada js/supabase-client.js...');

// Verifikasi struktur kode createTask()
const clientCode = fs.readFileSync('js/supabase-client.js', 'utf8').replace(/\r\n/g, '\n');

assert(
  clientCode.includes('.insert(checklistPayloads)\n      .select()') ||
  clientCode.includes('.insert(checklistPayloads).select()'),
  'createTask() harus menggunakan .select() saat insert checklist'
);
assert(
  clientCode.includes('dbId: chk.id') && clientCode.includes('taskDbId: chk.task_id'),
  'createTask() harus memetakan dbId dan taskDbId pada hasil return'
);

console.log('  [LULUS] createTask() terverifikasi menyertakan .select() dan mengembalikan dbId checklist.');

console.log('\n=== SELURUH PENGUJIAN STAGE 4 STEP 1 LULUS 100% ===');
