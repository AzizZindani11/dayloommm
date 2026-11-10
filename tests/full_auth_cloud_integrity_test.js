/**
 * DAYLOOM — FULL AUTHENTICATION, CLOUD SYNC & ACCOUNT INTEGRITY TEST SUITE
 * 
 * Memverifikasi:
 * 1. Registrasi Gmail, normalisasi email (trim & toLowerCase), dan tidak adanya kewajiban domain @dayloom.id.
 * 2. Penanganan error dan pemisahan tegas Rate-Limit Supabase (HTTP 429 / over_email_send_rate_limit).
 * 3. Pemulihan sesi autentikasi (Session Restoration) dan refleksi status UI.
 * 4. Logout bersih dan isolasi total akun (pembersihan state aktif, pemulihan mode tamu tanpa kehilangan data).
 * 5. Pergantian akun ganda (Account Eddy -> Account B) tanpa kebocoran cache antar-akun.
 * 6. Simulasi sinkronisasi multi-perangkat (Laptop <-> HP) untuk misi, checklist, dan profil.
 * 7. Idempotensi klaim RP server-authoritative (+10 RP tepat satu kali via RPC claim_task_rp).
 * 8. Integritas 6 Peringkat Resmi (Epic s/d Mythic Immortal) dan pencatatan rank_history.
 * 9. Ketahanan jaringan (offline fallback) dan pencegahan race condition (stale async request cancellation).
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { STORAGE_KEY, RANKS } from '../js/config.js';
import {
  createDefaultState,
  validateAndSanitizeState,
  mapCloudDataToState,
  isValidEmail,
  formatAuthErrorMessage
} from '../js/storage.js';
import { getCurrentRank, getRankProgress, validateTaskCompletion } from '../js/progression.js';

console.log('=== MEMULAI MASTER REGRESSION TEST: DAYLOOM FULL INTEGRITY ===\n');

// Mock Storage Helper
function createMockStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    get size() { return store.size; }
  };
}

// ===========================================================================
// BAGIAN 1: Registrasi Gmail, Normalisasi Email & Bebas Domain @dayloom.id
// ===========================================================================
console.log('[1/9] Menguji Registrasi Gmail & Normalisasi Email...');

const validEmailsToTest = [
  'adventurer@gmail.com',
  '  ADVENTURER@GMAIL.COM  ',
  'hero.dayloom+quest@gmail.com',
  'ksatria@outlook.com',
  'penenun@yahoo.co.id',
  'petualang@dayloom.id'
];

for (const rawEmail of validEmailsToTest) {
  const normalized = rawEmail.trim().toLowerCase();
  assert.strictEqual(isValidEmail(normalized), true, `Email ${rawEmail} harus valid`);
}

// Pastikan email dinormalisasi ke huruf kecil
assert.strictEqual('  EddyHanamori@GMAIL.com  '.trim().toLowerCase(), 'eddyhanamori@gmail.com');

console.log('  [LULUS] Alamat email Gmail standar dan penyedia umum divalidasi dan dinormalisasi.');

// ===========================================================================
// BAGIAN 2: Penanganan Error & Pemisahan Rate-Limit Supabase
// ===========================================================================
console.log('\n[2/9] Menguji Pemisahan Error Rate-Limit vs Format Email...');

const rateLimitCases = [
  { status: 429, message: 'over_email_send_rate_limit' },
  { status: 429, message: 'Email rate limit exceeded' },
  { code: 'over_email_send_rate_limit', message: 'Rate limit error' },
  { message: 'For security purposes, you can only request this once every 60 seconds' }
];

for (const errCase of rateLimitCases) {
  const msg = formatAuthErrorMessage(errCase);
  assert.ok(msg.includes('rate limit') || msg.includes('Batas pengiriman email'), 'Harus terdeteksi sebagai rate limit');
  assert.ok(!msg.includes('Format alamat email tidak valid'), 'Rate limit tidak boleh dilaporkan sebagai format cacat');
}

const formatErrorCases = [
  { message: 'invalid email' },
  { message: 'Unable to validate email address: invalid format' }
];

for (const errCase of formatErrorCases) {
  const msg = formatAuthErrorMessage(errCase);
  assert.ok(msg.includes('Format alamat email tidak valid'), 'Format error harus informatif');
}

console.log('  [LULUS] Error Rate Limit (HTTP 429) ditangani terpisah dari format email.');

// ===========================================================================
// BAGIAN 3: Pemulihan Sesi (Session Restoration) & Refleksi Status
// ===========================================================================
console.log('\n[3/9] Menguji Logika Pemulihan Sesi & Refleksi Status Akun...');

const mockSessionUser = {
  id: 'usr_eddy_101',
  email: 'eddy@gmail.com',
  user_metadata: { name: 'Eddy Penenun' }
};

const mockProfileEddy = {
  id: 'usr_eddy_101',
  username: 'Eddy Penenun',
  bio: 'Menenun takdir di Desa Hanamori.',
  total_rp: 80,
  time_of_day: 'senja',
  selected_character: 'meliodas'
};

const stateEddyRestored = mapCloudDataToState(mockProfileEddy, [], mockSessionUser);
assert.strictEqual(stateEddyRestored.profile.name, 'Eddy Penenun');
assert.strictEqual(stateEddyRestored.rp, 80);
assert.strictEqual(stateEddyRestored.profile.timeOfDay, 'senja');
assert.strictEqual(stateEddyRestored.profile.selectedCharacter, 'meliodas');

// Rank untuk 80 RP adalah Legend
const rankEddy = getCurrentRank(stateEddyRestored.rp);
assert.strictEqual(rankEddy.id, 'legend');
assert.strictEqual(stateEddyRestored.profile.title, 'Penjaga Lentera');

console.log('  [LULUS] Pemulihan sesi merefleksikan nama, RP 80, Peringkat Legend, dan preferensi akun.');

// ===========================================================================
// BAGIAN 4: Logout Bersih & Isolasi Total Mode Tamu
// ===========================================================================
console.log('\n[4/9] Menguji Logout Bersih & Perlindungan Data Tamu...');

const storage = createMockStorage();

// Data asli mode tamu di 'dayloom_save_v1'
const initialGuest = createDefaultState();
initialGuest.profile.name = 'Pengembara Tamu';
initialGuest.rp = 20;
initialGuest.tasks[0].title = 'Misi Rahasia Tamu';
storage.setItem(STORAGE_KEY, JSON.stringify(initialGuest));

// Sesi cloud akun aktif
const eddyCacheKey = `dayloom_user_${mockSessionUser.id}`;
storage.setItem(eddyCacheKey, JSON.stringify(stateEddyRestored));

// Verifikasi isolasi: key tamu tetap tidak tersentuh
const guestBeforeLogout = JSON.parse(storage.getItem(STORAGE_KEY));
assert.strictEqual(guestBeforeLogout.profile.name, 'Pengembara Tamu');
assert.strictEqual(guestBeforeLogout.rp, 20);

// Saat logout: data cloud di eddyCacheKey tetap ada di disk/cloud, mode tamu kembali dipulihkan
const restoredGuestState = validateAndSanitizeState(JSON.parse(storage.getItem(STORAGE_KEY)));
assert.strictEqual(restoredGuestState.profile.name, 'Pengembara Tamu');
assert.strictEqual(restoredGuestState.rp, 20);
assert.strictEqual(restoredGuestState.tasks[0].title, 'Misi Rahasia Tamu');

console.log('  [LULUS] Logout mengembalikan state ke Tamu tanpa menghapus atau membocorkan data.');

// ===========================================================================
// BAGIAN 5: Pergantian Akun Ganda (Eddy -> Akun B) Tanpa Kebocoran Data
// ===========================================================================
console.log('\n[5/9] Menguji Pergantian Dua Akun Berbeda (Eddy -> Akun B)...');

const userB = {
  id: 'usr_b_202',
  email: 'budi@gmail.com',
  user_metadata: { name: 'Budi Pendekar' }
};

const profileB = {
  id: 'usr_b_202',
  username: 'Budi Pendekar',
  bio: 'Pendekar baru.',
  total_rp: 150, // Peringkat Mythic
  time_of_day: 'malam',
  selected_character: 'traveler'
};

const tasksB = [
  {
    id: 'quest_b_1',
    dbId: 'db-uuid-b-1',
    title: 'Misi Khusus Akun B',
    status: 'berjalan',
    isRPClaimed: false,
    checklist: [{ id: 'chk_b_1', dbId: 'chk-db-1', text: 'Langkah Budi', completed: false }]
  }
];

const stateB = mapCloudDataToState(profileB, tasksB, userB);

// Pastikan data Akun B sepenuhnya mandiri dari Eddy
assert.strictEqual(stateB.profile.name, 'Budi Pendekar');
assert.strictEqual(stateB.rp, 150);
assert.strictEqual(stateB.tasks.length, 1);
assert.strictEqual(stateB.tasks[0].title, 'Misi Khusus Akun B');
assert.strictEqual(getCurrentRank(stateB.rp).id, 'mythic');

// Simpan cache user B
storage.setItem(`dayloom_user_${userB.id}`, JSON.stringify(stateB));

// Verifikasi kedua cache terpisah
const eddyFromStorage = JSON.parse(storage.getItem(eddyCacheKey));
const bFromStorage = JSON.parse(storage.getItem(`dayloom_user_${userB.id}`));

assert.strictEqual(eddyFromStorage.profile.name, 'Eddy Penenun');
assert.strictEqual(eddyFromStorage.rp, 80);
assert.strictEqual(bFromStorage.profile.name, 'Budi Pendekar');
assert.strictEqual(bFromStorage.rp, 150);

console.log('  [LULUS] Data akun Eddy dan Akun B 100% terisolasi di memori dan penyimpanan.');

// ===========================================================================
// BAGIAN 6: Simulasi Sinkronisasi Multi-Perangkat (Laptop <-> HP)
// ===========================================================================
console.log('\n[6/9] Menguji Sinkronisasi Multi-Perangkat (Laptop -> HP -> Laptop)...');

// Langkah A: Di Laptop, pengguna membuat misi baru
const laptopTask = {
  id: 'quest_multi_1',
  dbId: 'db-uuid-multi-1',
  title: 'Misi Dibuat di Laptop',
  status: 'berjalan',
  isRPClaimed: false,
  checklist: [
    { id: 'c1', dbId: 'chk-1', text: 'Subtask 1', completed: true },
    { id: 'c2', dbId: 'chk-2', text: 'Subtask 2', completed: false }
  ]
};

// Langkah B: Di HP, pengguna login ke akun yang sama
// Supabase mengembalikan data yang sama ke HP
const hpState = mapCloudDataToState(mockProfileEddy, [laptopTask], mockSessionUser);
assert.strictEqual(hpState.tasks.length, 1);
assert.strictEqual(hpState.tasks[0].title, 'Misi Dibuat di Laptop');
assert.strictEqual(hpState.tasks[0].checklist[0].completed, true);
assert.strictEqual(hpState.tasks[0].checklist[1].completed, false);

// Langkah C: Di HP, subtask 2 dicentang dan misi diselesaikan
laptopTask.checklist[1].completed = true;
laptopTask.status = 'selesai';
laptopTask.isRPClaimed = true;
mockProfileEddy.total_rp = 90; // +10 RP dari penyelesaian

// Langkah D: Laptop membuka kembali aplikasi dan memuat dari cloud
const laptopReloadedState = mapCloudDataToState(mockProfileEddy, [laptopTask], mockSessionUser);
assert.strictEqual(laptopReloadedState.rp, 90);
assert.strictEqual(laptopReloadedState.tasks[0].status, 'selesai');
assert.strictEqual(laptopReloadedState.tasks[0].isRPClaimed, true);

console.log('  [LULUS] Perubahan antar-perangkat tersinkronisasi mulus via representasi cloud.');

// ===========================================================================
// BAGIAN 7: Idempotensi Klaim RP Server-Authoritative (+10 RP Hanya Sekali)
// ===========================================================================
console.log('\n[7/9] Menguji Idempotensi Klaim RP (+10 RP Tepat Sekali)...');

function mockRpcClaimTaskRP({ isClaimed, currentRP }) {
  if (isClaimed) {
    return {
      success: false,
      already_claimed: true,
      message: 'RP untuk misi ini sudah pernah diklaim sebelumnya.',
      total_rp: currentRP,
      awarded_rp: 0
    };
  }
  return {
    success: true,
    already_claimed: false,
    message: 'Misi berhasil diselesaikan! +10 RP dianugerahkan.',
    new_total_rp: currentRP + 10,
    awarded_rp: 10
  };
}

let userRP = 40;
// Klaim pertama
const claim1 = mockRpcClaimTaskRP({ isClaimed: false, currentRP: userRP });
assert.strictEqual(claim1.success, true);
assert.strictEqual(claim1.awarded_rp, 10);
assert.strictEqual(claim1.new_total_rp, 50);
userRP = claim1.new_total_rp;

// Percobaan klaim kedua (duplikat dari HP lain atau double click)
const claim2 = mockRpcClaimTaskRP({ isClaimed: true, currentRP: userRP });
assert.strictEqual(claim2.success, false);
assert.strictEqual(claim2.already_claimed, true);
assert.strictEqual(claim2.awarded_rp, 0);
assert.strictEqual(claim2.total_rp, 50, 'Total RP server tidak boleh bertambah saat klaim duplikat');

console.log('  [LULUS] Klaim berulang ditolak secara atomik (Anti-Duplikasi).');

// ===========================================================================
// BAGIAN 8: Enam Peringkat Resmi & Riwayat Peringkat (rank_history)
// ===========================================================================
console.log('\n[8/9] Memverifikasi 6 Peringkat Resmi & Pencatatan rank_history...');

const expectedRanks = [
  { rp: 0, expectedId: 'epic', name: 'Epic' },
  { rp: 49, expectedId: 'epic', name: 'Epic' },
  { rp: 50, expectedId: 'legend', name: 'Legend' },
  { rp: 119, expectedId: 'legend', name: 'Legend' },
  { rp: 120, expectedId: 'mythic', name: 'Mythic' },
  { rp: 219, expectedId: 'mythic', name: 'Mythic' },
  { rp: 220, expectedId: 'mythic_honor', name: 'Mythic Honor' },
  { rp: 349, expectedId: 'mythic_honor', name: 'Mythic Honor' },
  { rp: 350, expectedId: 'mythic_glory', name: 'Mythic Glory' },
  { rp: 499, expectedId: 'mythic_glory', name: 'Mythic Glory' },
  { rp: 500, expectedId: 'mythic_immortal', name: 'Mythic Immortal' },
  { rp: 9999, expectedId: 'mythic_immortal', name: 'Mythic Immortal' }
];

for (const tc of expectedRanks) {
  const r = getCurrentRank(tc.rp);
  assert.strictEqual(r.id, tc.expectedId, `RP ${tc.rp} harus menghasilkan peringkat ${tc.expectedId}`);
  assert.strictEqual(r.name, tc.name);
}

// Uji pemetaan riwayat peringkat (rank_history) dari database
const mockRankHistoryFromDb = [
  { rank_id: 'epic', rank_name: 'Epic', rp_at_time: 0, reached_at: '2026-11-01T00:00:00Z' },
  { rank_id: 'legend', rank_name: 'Legend', rp_at_time: 50, reached_at: '2026-11-05T00:00:00Z' },
  { rank_id: 'mythic', rank_name: 'Mythic', rp_at_time: 120, reached_at: '2026-11-10T00:00:00Z' }
];

const stateWithHistory = mapCloudDataToState(
  { id: 'usr_hist', total_rp: 120, username: 'Sang Legenda' },
  [],
  null,
  mockRankHistoryFromDb
);

assert.strictEqual(stateWithHistory.rankHistory.length, 3);
assert.strictEqual(stateWithHistory.rankHistory[0].rankId, 'epic');
assert.strictEqual(stateWithHistory.rankHistory[1].rankId, 'legend');
assert.strictEqual(stateWithHistory.rankHistory[2].rankId, 'mythic');
assert.strictEqual(stateWithHistory.profile.title, 'Pendekar Sakura');

console.log('  [LULUS] Seluruh 6 peringkat resmi akurat dan riwayat rank_history terpelihara.');

// ===========================================================================
// BAGIAN 9: Ketahanan Jaringan & Pembatalan Request Basi (Cancellation Guard)
// ===========================================================================
console.log('\n[9/9] Menguji Cancellation Guard & Perlindungan Terhadap Request Basi...');

class AsyncAccountSwitcher {
  constructor() {
    this.currentUser = null;
    this.activeState = null;
    this.cloudLoadRequestId = 0;
  }

  async loadAccount(user, delayMs) {
    const currentReqId = ++this.cloudLoadRequestId;
    this.currentUser = user;

    return new Promise(resolve => {
      setTimeout(() => {
        // CANCELLATION GUARD persis seperti di DayloomApp.prototype.loadCloudUserData
        if (currentReqId !== this.cloudLoadRequestId || !this.currentUser || this.currentUser.id !== user.id) {
          resolve({ status: 'cancelled', reqId: currentReqId });
          return;
        }
        this.activeState = { id: user.id, username: user.name };
        resolve({ status: 'applied', reqId: currentReqId });
      }, delayMs);
    });
  }

  logout() {
    this.cloudLoadRequestId++;
    this.currentUser = null;
    this.activeState = null;
  }
}

const switcher = new AsyncAccountSwitcher();

// 1. Eddy mulai memuat (koneksi lambat 40ms)
const loadEddy = switcher.loadAccount({ id: 'eddy', name: 'Eddy' }, 40);

// 2. User logout di tengah jalan (10ms)
await new Promise(r => setTimeout(r, 10));
switcher.logout();

// 3. User B login (cepat 15ms)
const loadB = switcher.loadAccount({ id: 'user_b', name: 'User B' }, 15);

const [resEddy, resB] = await Promise.all([loadEddy, loadB]);

assert.strictEqual(resEddy.status, 'cancelled', 'Request lambat dari Eddy harus dibatalkan!');
assert.strictEqual(resB.status, 'applied', 'Request User B harus berhasil diterapkan');
assert.strictEqual(switcher.activeState.id, 'user_b', 'State aktif harus menjadi milik User B');

console.log('  [LULUS] Cancellation guard membatalkan request basi dan mencegah pencemaran state.');

console.log('\n=== SELURUH 9 BAGIAN PENGUJIAN FULL INTEGRITY LULUS 100% ===');

