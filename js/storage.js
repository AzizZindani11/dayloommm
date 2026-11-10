/**
 * DAYLOOM — Sistem Penyimpanan Lokal, Validasi Data & Cadangan (Backup)
 */

import { STORAGE_KEY, RANKS } from './config.js';

/**
 * Menentukan peringkat resmi berdasarkan nilai RP
 */
function getRankByRP(rp) {
  const safeRP = Math.max(0, Number(rp) || 0);
  if (Array.isArray(RANKS)) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (safeRP >= RANKS[i].minRP) {
        return RANKS[i];
      }
    }
    return RANKS[0] || { id: 'epic', name: 'Epic', title: 'Penenun Fajar' };
  }
  return { id: 'epic', name: 'Epic', title: 'Penenun Fajar' };
}

/**
 * Membuat tanggal relatif terhadap hari ini dalam format YYYY-MM-DD
 */
export function getRelativeDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * State awal yang bersih, jujur (0 RP, 0 tugas selesai palsu),
 * namun menyediakan 3 misi pemandu aktif agar pengguna langsung memahami sistem checklist & tenggat.
 */
export function createDefaultState() {
  const today = getRelativeDateStr(0);
  const tomorrow = getRelativeDateStr(1);
  const nextThreeDays = getRelativeDateStr(3);

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    profile: {
      name: 'Pengembara Hanamori',
      title: 'Penenun Fajar',
      bio: 'Menenun langkah kecil setiap hari menjadi petualangan bermakna.',
      outfit: 'wanderer',
      hat: 'straw_hat',
      timeOfDay: 'pagi',
      // Foto profil lokal (data URL hasil kompresi di perangkat). null = pakai avatar bawaan.
      avatar: null,
      // Statistik sosial lokal. Belum ada server/jaringan: nilai tetap 0 sampai backend tersedia.
      social: { likes: 0, following: 0, followers: 0 },
      // Hingga 3 ID pencapaian yang dipamerkan (hanya pencapaian yang benar-benar terbuka yang ditampilkan).
      featuredAchievements: [],
      // Karakter playable yang dipilih untuk Arena Dojo ('traveler' | 'meliodas')
      selectedCharacter: 'traveler'
    },
    rp: 0,
    rewardedTaskIds: [], // Buku besar anti-duplikat (+10 RP hanya sekali per misi)
    rewardedPvPMatchIds: [], // Buku besar anti-duplikat (+20 RP hanya sekali per kemenangan PvP)
    rankHistory: [
      {
        rankId: 'epic',
        rankName: 'Epic',
        reachedAt: new Date().toISOString(),
        rpAtTime: 0
      }
    ],
    rpHistory: [
      {
        date: today,
        rp: 0,
        reason: 'Memulai Perjalanan di Desa Hanamori'
      }
    ],
    unlockedAchievements: [],
    visitedLocations: ['quest_board'],
    arenaStats: {
      wins: 0,
      totalSessions: 0,
      bestCombo: 0,
      totalFocusMinutes: 0
    },
    tasks: [
      {
        id: 'quest_starter_1',
        title: 'Menyusun Rencana Prioritas Harian di Desa Hanamori',
        description: 'Tentukan fokus utamamu hari ini. Misi ini memiliki daftar periksa wajib yang harus dicentang seluruhnya sebelum misi dapat diselesaikan.',
        category: 'pribadi',
        priority: 'tinggi',
        deadline: today,
        status: 'berjalan',
        createdAt: new Date().toISOString(),
        completedAt: null,
        completedOnTime: null,
        checklist: [
          { id: 'chk_101', text: 'Meninjau target utama hari ini', completed: true },
          { id: 'chk_102', text: 'Menyiapkan ruang kerja yang rapi dan tenang', completed: false },
          { id: 'chk_103', text: 'Menentukan 1 prioritas terpenting', completed: false }
        ]
      },
      {
        id: 'quest_starter_2',
        title: 'Sesi Belajar & Pendalaman Materi Akademik / Karir',
        description: 'Fokus mendalami materi penting selama minimal 25 menit tanpa gangguan untuk memperkuat keahlianmu.',
        category: 'akademik',
        priority: 'sedang',
        deadline: tomorrow,
        status: 'tersedia',
        createdAt: new Date().toISOString(),
        completedAt: null,
        completedOnTime: null,
        checklist: [
          { id: 'chk_201', text: 'Membaca ringkasan materi atau dokumentasi', completed: false },
          { id: 'chk_202', text: 'Mencatat 3 poin penting hasil belajar', completed: false }
        ]
      },
      {
        id: 'quest_starter_3',
        title: 'Peregangan Tubuh & Hidrasi Sehat',
        description: 'Jaga kebugaran fisik seorang petualang agar pikiran tetap jernih sepanjang hari.',
        category: 'kesehatan',
        priority: 'rendah',
        deadline: nextThreeDays,
        status: 'tersedia',
        createdAt: new Date().toISOString(),
        completedAt: null,
        completedOnTime: null,
        checklist: [
          { id: 'chk_301', text: 'Minum segelas air putih segar', completed: false },
          { id: 'chk_302', text: 'Peregangan bahu dan punggung selama 5 menit', completed: false }
        ]
      }
    ]
  };
}

/**
 * Validasi dan sanitasi struktur state agar tahan terhadap kerusakan data
 */
export function validateAndSanitizeState(raw, options = {}) {
  const fallback = createDefaultState();
  if (!raw || typeof raw !== 'object') return fallback;

  const isCloud = Boolean((options && options.isCloud) || (raw && raw.isCloud));

  const state = {
    version: 1,
    isCloud: isCloud,
    cloudUserId: (raw && raw.cloudUserId) || (options && options.cloudUserId) || null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : fallback.createdAt,
    profile: {
      name: typeof raw.profile?.name === 'string' && raw.profile.name.trim() ? raw.profile.name.trim() : fallback.profile.name,
      title: typeof raw.profile?.title === 'string' ? raw.profile.title : fallback.profile.title,
      bio: typeof raw.profile?.bio === 'string' ? raw.profile.bio : fallback.profile.bio,
      outfit: typeof raw.profile?.outfit === 'string' ? raw.profile.outfit : fallback.profile.outfit,
      hat: typeof raw.profile?.hat === 'string' ? raw.profile.hat : fallback.profile.hat,
      timeOfDay: ['pagi', 'senja', 'malam'].includes(raw.profile?.timeOfDay) ? raw.profile.timeOfDay : 'pagi',
      avatar: sanitizeAvatar(raw.profile?.avatar),
      social: {
        likes: sanitizeCount(raw.profile?.social?.likes),
        following: sanitizeCount(raw.profile?.social?.following),
        followers: sanitizeCount(raw.profile?.social?.followers)
      },
      featuredAchievements: Array.isArray(raw.profile?.featuredAchievements)
        ? [...new Set(raw.profile.featuredAchievements.filter(id => typeof id === 'string'))].slice(0, 3)
        : [],
      selectedCharacter: ['traveler', 'meliodas'].includes(raw.profile?.selectedCharacter)
        ? raw.profile.selectedCharacter
        : 'traveler'
    },
    rp: typeof raw.rp === 'number' && !isNaN(raw.rp) && raw.rp >= 0 ? Math.floor(raw.rp) : 0,
    rewardedTaskIds: Array.isArray(raw.rewardedTaskIds) ? raw.rewardedTaskIds.filter(id => typeof id === 'string') : [],
    rewardedPvPMatchIds: Array.isArray(raw.rewardedPvPMatchIds) ? raw.rewardedPvPMatchIds.filter(id => typeof id === 'string') : [],
    rankHistory: Array.isArray(raw.rankHistory) && raw.rankHistory.length > 0 ? raw.rankHistory : fallback.rankHistory,
    rpHistory: Array.isArray(raw.rpHistory) ? raw.rpHistory : fallback.rpHistory,
    unlockedAchievements: Array.isArray(raw.unlockedAchievements) ? raw.unlockedAchievements.filter(id => typeof id === 'string') : [],
    visitedLocations: Array.isArray(raw.visitedLocations) ? raw.visitedLocations.filter(id => typeof id === 'string') : ['quest_board'],
    arenaStats: {
      wins: Number(raw.arenaStats?.wins) || 0,
      totalSessions: Number(raw.arenaStats?.totalSessions) || 0,
      bestCombo: Number(raw.arenaStats?.bestCombo) || 0,
      totalFocusMinutes: Number(raw.arenaStats?.totalFocusMinutes) || 0
    },
    tasks: Array.isArray(raw.tasks) ? raw.tasks.map(sanitizeTask).filter(Boolean) : fallback.tasks
  };

  // Pastikan konsistensi RP:
  // Untuk Akun Cloud (isCloud === true), nilai RP berasal dari server Supabase (server-authoritative).
  // JANGAN hitung ulang atau reset RP cloud berdasarkan buku besar lokal.
  // Untuk Mode Tamu (isCloud === false), validasi konsistensi dengan buku besar lokal tetap berjalan seperti sebelumnya.
  if (!isCloud) {
    const expectedRP = (state.rewardedTaskIds.length * 10) + (state.rewardedPvPMatchIds.length * 20);
    if (state.rp !== expectedRP) {
      state.rp = expectedRP;
    }
  }

  return state;
}

/**
 * Memetakan data profil, tasks, dan riwayat peringkat dari database Supabase ke struktur state frontend Dayloom.
 * Menjamin total_rp dan rank berasal dari server (server-authoritative) dan tidak dihitung ulang oleh buku besar lokal.
 */
export function mapCloudDataToState(profileData, tasksData, user = null, rankHistoryData = [], rpLedgerData = [], cachedState = null) {
  const initialName = (profileData && profileData.username) ||
    (user && user.user_metadata && (user.user_metadata.name || user.user_metadata.username)) ||
    (user && user.email ? user.email.split('@')[0] : 'Pengembara Hanamori');

  const userId = (profileData && profileData.id) || (user && user.id) || null;

  // 1. RP dari tabel profiles (profiles.total_rp)
  const profileRP = typeof profileData?.total_rp === 'number' && !isNaN(profileData.total_rp) && profileData.total_rp >= 0
    ? Math.floor(profileData.total_rp)
    : 0;

  // 2. RP dari daftar tugas yang sudah diklaim (tasks.is_rp_claimed === true)
  const tasksList = Array.isArray(tasksData) ? tasksData : [];
  const claimedTasks = tasksList.filter(t => t && (t.isRPClaimed || t.is_rp_claimed));
  const claimedTasksRP = claimedTasks.length * 10;

  // 3. RP dari buku besar rp_ledger (jika tersedia)
  const ledgerList = Array.isArray(rpLedgerData) ? rpLedgerData : [];
  const ledgerRP = ledgerList.reduce((sum, item) => sum + (Number(item?.points) || 0), 0);

  // 4. Validasi ketat terhadap cachedRP:
  // Cache lokal TIDAK BOLEH menaikkan RP secara sembarangan jika nilainya tidak didukung
  // oleh bukti aktivitas nyata di buku besar lokal (tasks claimed + rewardedPvPMatchIds).
  let validCachedRP = 0;
  if (cachedState && typeof cachedState.rp === 'number' && !isNaN(cachedState.rp) && cachedState.rp >= 0) {
    const rawCachedRP = Math.floor(cachedState.rp);
    const cachedClaimedTasks = Array.isArray(cachedState.tasks)
      ? cachedState.tasks.filter(t => t && (t.isRPClaimed || t.is_rp_claimed)).length
      : (Array.isArray(cachedState.rewardedTaskIds) ? cachedState.rewardedTaskIds.length : 0);
    const cachedPvPMatches = Array.isArray(cachedState.rewardedPvPMatchIds)
      ? cachedState.rewardedPvPMatchIds.length
      : 0;

    // Batas atas maksimum yang dapat dipertanggungjawabkan secara matematis:
    // Aktivitas di dalam cache sendiri (tasks + pvp), atau profileRP server ditambah pvp lokal baru
    const cacheActivityRP = (cachedClaimedTasks * 10) + (cachedPvPMatches * 20);
    const maxVerifiableCacheRP = Math.max(cacheActivityRP, profileRP + (cachedPvPMatches * 20));
    validCachedRP = Math.min(rawCachedRP, maxVerifiableCacheRP);
  }

  // Rekonsiliasi otoritatif: Ambil nilai RP maksimum yang sah dari sumber server dan aktivitas terverifikasi
  // Mencegah penurunan atau reset rank akibat profiles.total_rp tertinggal / bernilai NULL di database
  // Catatan: rank_history digunakan untuk riwayat & getHighestRank, bukan mendikte total_rp aktif saat login
  const totalRP = Math.max(profileRP, claimedTasksRP, ledgerRP, validCachedRP);

  const curRank = getRankByRP(totalRP);

  let mappedRankHistory = Array.isArray(rankHistoryData) && rankHistoryData.length > 0
    ? rankHistoryData.map(r => ({
        rankId: r.rank_id || r.rankId || curRank.id,
        rankName: r.rank_name || r.rankName || curRank.name,
        reachedAt: r.reached_at || r.reachedAt || profileData?.updated_at || new Date().toISOString(),
        rpAtTime: typeof (r.rp_at_time ?? r.rpAtTime) === 'number' ? (r.rp_at_time ?? r.rpAtTime) : totalRP
      }))
    : [
        {
          rankId: curRank.id,
          rankName: curRank.name,
          reachedAt: profileData?.updated_at || new Date().toISOString(),
          rpAtTime: totalRP
        }
      ];

  // Pastikan curRank ada dalam riwayat peringkat pemain
  if (!mappedRankHistory.some(r => r.rankId === curRank.id)) {
    mappedRankHistory.push({
      rankId: curRank.id,
      rankName: curRank.name,
      reachedAt: profileData?.updated_at || new Date().toISOString(),
      rpAtTime: totalRP
    });
  }

  // Pertahankan ID pertandingan PvP yang telah diberi hadiah dari cache agar tidak terjadi duplikasi klaim
  const rewardedPvPMatchIds = Array.isArray(cachedState?.rewardedPvPMatchIds)
    ? [...new Set(cachedState.rewardedPvPMatchIds.filter(id => typeof id === 'string'))]
    : [];

  const arenaStats = {
    wins: Math.max(Number(cachedState?.arenaStats?.wins) || 0, 0),
    totalSessions: Number(cachedState?.arenaStats?.totalSessions) || 0,
    bestCombo: Number(cachedState?.arenaStats?.bestCombo) || 0,
    totalFocusMinutes: Number(cachedState?.arenaStats?.totalFocusMinutes) || 0
  };

  const rawState = {
    version: 1,
    isCloud: true,
    cloudUserId: userId,
    createdAt: profileData?.created_at || new Date().toISOString(),
    profile: {
      name: String(initialName).trim().slice(0, 36),
      title: curRank.title || 'Penenun Fajar',
      bio: typeof profileData?.bio === 'string' ? profileData.bio : 'Menenun langkah kecil setiap hari menjadi petualangan bermakna.',
      outfit: profileData?.outfit || 'wanderer',
      hat: profileData?.hat || 'straw_hat',
      timeOfDay: ['pagi', 'senja', 'malam'].includes(profileData?.time_of_day) ? profileData.time_of_day : 'pagi',
      avatar: profileData?.avatar_url || null,
      social: { likes: 0, following: 0, followers: 0 },
      featuredAchievements: Array.isArray(profileData?.featured_achievements)
        ? [...new Set(profileData.featured_achievements.filter(id => typeof id === 'string'))].slice(0, 3)
        : [],
      selectedCharacter: ['traveler', 'meliodas'].includes(profileData?.selected_character)
        ? profileData.selected_character
        : 'traveler'
    },
    rp: totalRP,
    rewardedTaskIds: Array.isArray(tasksData)
      ? tasksData.filter(t => t.isRPClaimed || t.is_rp_claimed).map(t => String(t.id))
      : [],
    rewardedPvPMatchIds: rewardedPvPMatchIds,
    rankHistory: mappedRankHistory,
    rpHistory: [
      {
        date: getRelativeDateStr(0),
        rp: totalRP,
        reason: 'Sinkronisasi Awan Dayloom'
      }
    ],
    unlockedAchievements: [],
    visitedLocations: Array.isArray(profileData?.visited_locations) && profileData.visited_locations.length > 0
      ? profileData.visited_locations.filter(id => typeof id === 'string')
      : ['quest_board'],
    arenaStats: arenaStats,
    tasks: Array.isArray(tasksData) ? tasksData : []
  };

  return validateAndSanitizeState(rawState, { isCloud: true, cloudUserId: userId });
}

// Batas ukuran avatar tersimpan (~600 KB teks data URL) agar LocalStorage tidak penuh.
export const MAX_AVATAR_DATAURL_LENGTH = 600000;

function sanitizeAvatar(value) {
  if (typeof value !== 'string') return null;
  if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(value)) return null;
  if (value.length > MAX_AVATAR_DATAURL_LENGTH) return null;
  return value;
}

function sanitizeCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function sanitizeTask(t) {
  if (!t || typeof t !== 'object' || !t.id || !t.title) return null;
  const task = {
    id: String(t.id),
    title: String(t.title).trim(),
    description: typeof t.description === 'string' ? t.description.trim() : '',
    category: typeof t.category === 'string' ? t.category : 'lainnya',
    priority: ['rendah', 'sedang', 'tinggi', 'mendesak'].includes(t.priority) ? t.priority : 'sedang',
    deadline: typeof t.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.deadline) ? t.deadline : getRelativeDateStr(0),
    status: ['tersedia', 'berjalan', 'selesai'].includes(t.status) ? t.status : 'tersedia',
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
    completedAt: typeof t.completedAt === 'string' ? t.completedAt : null,
    completedOnTime: typeof t.completedOnTime === 'boolean' ? t.completedOnTime : null,
    checklist: Array.isArray(t.checklist)
      ? t.checklist
          .filter(c => c && typeof c.text === 'string' && c.text.trim())
          .map(c => {
            const item = {
              id: String(c.id || 'chk_' + Math.random().toString(36).slice(2, 9)),
              text: c.text.trim(),
              completed: Boolean(c.completed)
            };
            if (c.dbId) item.dbId = String(c.dbId);
            return item;
          })
      : []
  };

  if (t.dbId) task.dbId = String(t.dbId);
  if (t.isRPClaimed !== undefined) task.isRPClaimed = Boolean(t.isRPClaimed);
  if (t.is_rp_claimed !== undefined) task.isRPClaimed = Boolean(t.is_rp_claimed);

  return task;
}

export function loadState(customStorage = null) {
  const store = customStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return createDefaultState();

  try {
    const rawStr = store.getItem(STORAGE_KEY);
    if (!rawStr) {
      const initial = createDefaultState();
      saveState(initial, store);
      return initial;
    }
    const parsed = JSON.parse(rawStr);
    return validateAndSanitizeState(parsed);
  } catch (err) {
    console.warn('Dayloom: Memulihkan data dari format yang rusak.', err);
    const recovered = createDefaultState();
    return recovered;
  }
}

export function saveState(state, customStorage = null) {
  const store = customStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return false;
  try {
    const clean = validateAndSanitizeState(state);
    store.setItem(STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch (err) {
    console.error('Dayloom: Gagal menyimpan data ke penyimpanan lokal.', err);
    return false;
  }
}

export function exportBackupJSON(state) {
  const clean = validateAndSanitizeState(state);
  return JSON.stringify(clean, null, 2);
}

export function importBackupJSON(jsonString, customStorage = null) {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) {
    throw new Error('Format berkas cadangan Dayloom tidak valid.');
  }
  const validated = validateAndSanitizeState(parsed);
  saveState(validated, customStorage);
  return validated;
}

/**
 * Validasi format alamat email standar (RFC 5322 compatible)
 * Menerima penyedia umum seperti Gmail, Outlook, Yahoo, iCloud, Proton, domain kustom, dll.
 * Tidak mewajibkan domain tertentu (@dayloom.id tidak diwajibkan).
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  // Format standar: local-part@domain.tld dengan TLD minimal 2 karakter
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Menerjemahkan pesan error Supabase Auth ke Bahasa Indonesia yang ramah petualang.
 * Memisahkan penanganan error rate-limit Supabase secara eksplisit dari validasi format email.
 */
export function formatAuthErrorMessage(err) {
  if (!err) return 'Terjadi kesalahan sistem yang tidak diketahui.';
  const msg = err.message || String(err);
  const code = err.code || err.error_code || '';
  const status = Number(err.status || (err.error && err.error.status) || 0);

  // 1. Penanganan khusus batas frekuensi (Rate Limit) Supabase Auth
  if (
    status === 429 ||
    /rate[_ -]?limit/i.test(msg) ||
    /rate[_ -]?limit/i.test(code) ||
    /over_email_send_rate_limit/i.test(msg) ||
    /over_email_send_rate_limit/i.test(code) ||
    /too many requests/i.test(msg) ||
    /email.*rate.*limit/i.test(msg) ||
    /security purposes.*once every/i.test(msg)
  ) {
    return 'Batas pengiriman email Supabase tercapai (rate limit). Harap tunggu beberapa saat sebelum mencoba mendaftar kembali.';
  }

  // 2. Kredensial masuk tidak cocok
  if (/invalid login credentials/i.test(msg) || /invalid_grant/i.test(msg)) {
    return 'Alamat email atau kata sandi tidak cocok. Silakan periksa kembali.';
  }

  // 3. Email sudah terdaftar
  if (/user already registered/i.test(msg) || /already exists/i.test(msg)) {
    return 'Alamat email ini sudah terdaftar. Silakan gunakan tab Masuk.';
  }

  // 4. Kata sandi terlalu pendek
  if (/password should be at least 6 characters/i.test(msg) || /weak_password/i.test(msg)) {
    return 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.';
  }

  // 5. Format email ditolak oleh server
  if (/invalid email/i.test(msg) || /email address.*invalid/i.test(msg) || /invalid format/i.test(msg)) {
    return 'Format alamat email tidak valid. Pastikan penulisan email sudah benar (contoh: nama@gmail.com).';
  }

  // 6. Email belum dikonfirmasi
  if (/email not confirmed/i.test(msg)) {
    return 'Alamat email belum dikonfirmasi. Silakan periksa kotak masuk atau spam email Anda.';
  }

  // 7. Pendaftaran baru dinonaktifkan di instance Supabase
  if (/signup.*disabled/i.test(msg) || /signups not allowed/i.test(msg)) {
    return 'Pendaftaran petualang baru saat ini sedang dinonaktifkan di server.';
  }

  // 8. Masalah koneksi jaringan
  if (/network/i.test(msg) || /failed to fetch/i.test(msg) || /fetch failed/i.test(msg)) {
    return 'Gagal terhubung ke server awan. Periksa koneksi internet Anda.';
  }

  return msg;
}

