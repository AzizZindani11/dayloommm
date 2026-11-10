/**
 * DAYLOOM — Konfigurasi Inti & Lore Dunia
 * Menyatukan "DAY" (Keseharian) dan "LOOM" (Alat Tenun Takdir)
 */

import { SUPABASE_LOCAL_ANON_KEY } from './supabase-keys.local.js';

/**
 * Konfigurasi Supabase Backend
 * Catatan Keamanan: Hanya Publishable/Anon Key yang digunakan di frontend.
 */
export const SUPABASE_CONFIG = {
  url: 'https://jkchappfplbxiwzfgimq.supabase.co',
  anonKey: SUPABASE_LOCAL_ANON_KEY || (typeof window !== 'undefined' && window.__DAYLOOM_SUPABASE_ANON_KEY__) || ''
};

export const STORAGE_KEY = 'dayloom_save_v1';

export const RP_PER_QUEST = 10;

/**
 * Enam Peringkat Resmi Dayloom
 * Tidak boleh diganti dengan Bronze/Silver/Gold/Diamond.
 */
export const RANKS = [
  {
    id: 'epic',
    name: 'Epic',
    title: 'Penenun Fajar',
    minRP: 0,
    maxRP: 49,
    color: '#5C9EAD',
    accent: '#A8E0EB',
    lore: 'Langkah pertama di Desa Hanamori. Setiap benang niat yang kau pintal mulai membentuk pola kedisiplinan baru.',
    perk: 'Membuka Kustomisasi Jubah Pengembara Dasar'
  },
  {
    id: 'legend',
    name: 'Legend',
    title: 'Penjaga Lentera',
    minRP: 50,
    maxRP: 119,
    color: '#D49A3D',
    accent: '#FFE08A',
    lore: 'Namamu mulai dikenal di sepanjang Sungai Kawa. Konsistensimu menyalakan lentera harapan di desa.',
    perk: 'Membuka Efek Kunang-Kunang Emas & Gelar Penjaga Lentera'
  },
  {
    id: 'mythic',
    name: 'Mythic',
    title: 'Pendekar Sakura',
    minRP: 120,
    maxRP: 219,
    color: '#C85A7C',
    accent: '#FFB5C8',
    lore: 'Kelopak sakura menari mengikuti langkahmu. Kau telah menaklukkan keraguan dan menenun rutinitas menjadi kekuatan.',
    perk: 'Membuka Aura Kelopak Sakura & Aksesori Topeng Kitsune'
  },
  {
    id: 'mythic_honor',
    name: 'Mythic Honor',
    title: 'Kesatria Kehormatan',
    minRP: 220,
    maxRP: 349,
    color: '#6C5CE7',
    accent: '#C4B5FD',
    lore: 'Janji pada diri sendiri adalah kehormatan tertinggi. Tak ada tenggat waktu yang luput dari pengawasanmu.',
    perk: 'Membuka Jubah Indigo Kuno & Lentera Roh Biru'
  },
  {
    id: 'mythic_glory',
    name: 'Mythic Glory',
    title: 'Mahaguru Tenun Surya',
    minRP: 350,
    maxRP: 499,
    color: '#E17055',
    accent: '#FFD166',
    lore: 'Cahaya kemuliaan menyinari Kuil Agung. Karya dan tanggung jawabmu menjadi inspirasi seluruh penjuru negeri.',
    perk: 'Membuka Mahkota Surya & Efek Partikel Cahaya Ilahi'
  },
  {
    id: 'mythic_immortal',
    name: 'Mythic Immortal',
    title: 'Sang Abadi Hanamori',
    minRP: 500,
    maxRP: Infinity,
    color: '#C9A24A',
    accent: '#FFF4D6',
    lore: 'Legenda hidup yang melampaui batas waktu. Setiap detik hidupmu adalah mahakarya yang terpintal sempurna di Tenunan Agung.',
    perk: 'Membuka Wujud Astral Abadi & Monumen Kehormatan Desa'
  }
];

export const CATEGORIES = [
  { id: 'akademik', label: 'Akademik', color: '#5B8FB9', icon: 'book', desc: 'Belajar, riset, kuliah, dan membaca' },
  { id: 'pekerjaan', label: 'Pekerjaan', color: '#9B7866', icon: 'briefcase', desc: 'Karir, proyek profesional, dan kolaborasi' },
  { id: 'pribadi', label: 'Pribadi', color: '#E8A5B5', icon: 'home', desc: 'Rutinitas harian, keluarga, dan kerapian' },
  { id: 'kesehatan', label: 'Kesehatan', color: '#68A67D', icon: 'heart', desc: 'Olahraga, istirahat, nutrisi, dan meditasi' },
  { id: 'kreativitas', label: 'Kreativitas', color: '#D49A3D', icon: 'brush', desc: 'Seni, menulis, musik, dan eksperimen ide' },
  { id: 'lainnya', label: 'Lainnya', color: '#7A8B99', icon: 'star', desc: 'Tanggung jawab dan petualangan umum' }
];

export const PRIORITIES = [
  { id: 'rendah', label: 'Rendah', color: '#7A9A8B', badgeBg: '#E3EFEA' },
  { id: 'sedang', label: 'Sedang', color: '#5B82A6', badgeBg: '#E1ECF7' },
  { id: 'tinggi', label: 'Tinggi', color: '#D9822B', badgeBg: '#FDF0E1' },
  { id: 'mendesak', label: 'Mendesak', color: '#C94A4A', badgeBg: '#FCE6E6' }
];

export const VILLAGE_LOCATIONS = [
  {
    id: 'loom_shrine',
    name: 'Kuil Tenun Waktu',
    subtitle: 'Pusat Meditasi & Fokus',
    xPercent: 18,
    description: 'Tempat suci di mana benang-benang waktu dipintal. Nyalakan dupa fokus untuk menenangkan pikiran sebelum menyelesaikan misi berat.',
    actionLabel: 'Mulai Meditasi Fokus (Pomodoro)',
    actionType: 'focus_timer'
  },
  {
    id: 'quest_board',
    name: 'Papan Misi Hanamori',
    subtitle: 'Daftar Tanggung Jawab Harian',
    xPercent: 42,
    description: 'Papan kayu tua di tengah alun-alun desa. Seluruh gulungan tugas, tenggat waktu, dan daftar periksa terpampang rapi di sini.',
    actionLabel: 'Buka Papan Misi',
    actionType: 'navigate_quests'
  },
  {
    id: 'tea_house',
    name: 'Kedai Teh Sakura',
    subtitle: 'Galeri Pencapaian & Relik',
    xPercent: 66,
    description: 'Kedai hangat di tepi sungai tempat para pengembara memamerkan lencana pencapaian dan berbagi kisah keberhasilan.',
    actionLabel: 'Lihat Lencana & Koleksi',
    actionType: 'navigate_achievements'
  },
  {
    id: 'arena_dojo',
    name: 'Dojo Benteng Awan',
    subtitle: 'Arena Tantangan & Uji Fokus',
    xPercent: 86,
    description: 'Gerbang pelatihan para pendekar. Uji ketangkasan fokusmu melawan Monster Penundaan atau siapkan ruang tanding bersama rekan.',
    actionLabel: 'Masuki Arena Dojo',
    actionType: 'navigate_arena'
  }
];

export const CHARACTER_OUTFITS = [
  { id: 'wanderer', name: 'Jubah Pengembara', primary: '#26364A', secondary: '#E8A5B5', minRankIndex: 0 },
  { id: 'lantern_keeper', name: 'Zirah Penjaga Lentera', primary: '#6E473B', secondary: '#FFE08A', minRankIndex: 1 },
  { id: 'sakura_ronin', name: 'Kimono Pendekar Sakura', primary: '#8F3956', secondary: '#FFD1DC', minRankIndex: 2 },
  { id: 'honor_knight', name: 'Jubah Kesatria Indigo', primary: '#3B336A', secondary: '#C4B5FD', minRankIndex: 3 },
  { id: 'sun_weaver', name: 'Busana Mahaguru Surya', primary: '#9A3B26', secondary: '#FFD166', minRankIndex: 4 },
  { id: 'immortal_sage', name: 'Wujud Astral Abadi', primary: '#135E4B', secondary: '#81ECEC', minRankIndex: 5 }
];

export const CHARACTER_HATS = [
  { id: 'none', name: 'Tanpa Penutup Kepala', minRankIndex: 0 },
  { id: 'straw_hat', name: 'Caping Bambu Ronin', minRankIndex: 0 },
  { id: 'sakura_pin', name: 'Jepit Bunga Sakura', minRankIndex: 1 },
  { id: 'kitsune_mask', name: 'Topeng Kitsune Perak', minRankIndex: 2 },
  { id: 'sun_crown', name: 'Mahkota Tenun Surya', minRankIndex: 4 }
];

export const ACHIEVEMENTS_CONFIG = [
  {
    id: 'first_thread',
    title: 'Benang Pertama',
    desc: 'Menyelesaikan misi pertamamu di dunia Dayloom.',
    rewardText: 'Membuka Lencana Benang Perak & +Semangat Desa',
    iconType: 'spool',
    conditionDesc: 'Selesaikan 1 misi hingga tuntas.'
  },
  {
    id: 'checklist_master',
    title: 'Penguasa Checklist',
    desc: 'Menyelesaikan misi yang memiliki minimal 3 butir daftar periksa wajib.',
    rewardText: 'Membuka Dekorasi Lentera Sungai Tambahan',
    iconType: 'scroll',
    conditionDesc: 'Tuntaskan misi dengan >= 3 checklist.'
  },
  {
    id: 'deadline_guardian',
    title: 'Penjaga Tenggat',
    desc: 'Menyelesaikan 3 misi tepat waktu sebelum tenggat berakhir.',
    rewardText: 'Membuka Gelar Kehormatan "Tepat Waktu"',
    iconType: 'hourglass',
    conditionDesc: 'Selesaikan 3 misi tepat waktu (On-Time).'
  },
  {
    id: 'balanced_weaver',
    title: 'Penenun Seimbang',
    desc: 'Menyelesaikan misi dari minimal 3 kategori kehidupan yang berbeda.',
    rewardText: 'Membuka Efek Angin Sakura Lembut',
    iconType: 'fan',
    conditionDesc: 'Selesaikan misi di >= 3 kategori berbeda.'
  },
  {
    id: 'rank_riser',
    title: 'Kebangkitan Legenda',
    desc: 'Mencapai peringkat Legend (50 RP) atau lebih tinggi.',
    rewardText: 'Membuka Zirah Penjaga Lentera di Profil',
    iconType: 'sword',
    conditionDesc: 'Kumpulkan minimal 50 Rank Points (RP).'
  },
  {
    id: 'arena_victor',
    title: 'Pendekar Dojo Fokus',
    desc: 'Menenangkan minimal 1 pertarungan fokus di Arena Dojo Benteng Awan.',
    rewardText: 'Membuka Lambang Pejuang Fokus di Arena',
    iconType: 'shield',
    conditionDesc: 'Menangkan 1 sesi Tantangan Fokus di Arena.'
  },
  {
    id: 'world_explorer',
    title: 'Penjelajah Hanamori',
    desc: 'Mengunjungi dan berinteraksi dengan seluruh bangunan utama di Desa Hanamori.',
    rewardText: 'Membuka Musik Lonceng Angin Desa',
    iconType: 'torii',
    conditionDesc: 'Kunjungi 4 lokasi interaktif di Dunia Desa.'
  },
  {
    id: 'quest_champion',
    title: 'Juara Tenunan Agung',
    desc: 'Menyelesaikan total 10 misi dan menjaga Skor Produktivitas di atas 75.',
    rewardText: 'Membuka Monumen Cahaya di Tengah Desa',
    iconType: 'crown',
    conditionDesc: 'Selesaikan 10 misi & Skor Produktivitas >= 75.'
  }
];

export const ARENA_BOSSES = [
  {
    id: 'sloth_oni',
    name: 'Oni Penundaan (Kage-Daruma)',
    level: 'Tantangan Ringan',
    hp: 100,
    durationSec: 60,
    desc: 'Roh bayangan yang membisikkan kata "nanti saja". Kalahkan dengan rentetan serangan fokus dan ketepatan mantra produktivitas!',
    color: '#C85A7C'
  },
  {
    id: 'distraction_tengu',
    name: 'Tengu Pengalih Perhatian',
    level: 'Tantangan Menengah',
    hp: 160,
    durationSec: 90,
    desc: 'Makhluk bersayap yang membawa badai notifikasi palsu. Pertahankan kombo konsentrasimu untuk menembus pertahanannya!',
    color: '#D49A3D'
  },
  {
    id: 'chaos_dragon',
    name: 'Naga Kekacauan Tenggat (Ryu-Jikan)',
    level: 'Tantangan Mahaguru',
    hp: 240,
    durationSec: 120,
    desc: 'Penguasa kepanikan di menit terakhir. Hanya pendekar dengan ketenangan tingkat tinggi yang mampu menenun kembali waktu yang koyak.',
    color: '#6C5CE7'
  }
];

/**
 * Daftar Karakter Playable Resmi di Arena Dojo & Etalase Karakter Profil
 * Dirancang modular agar karakter baru dapat ditambahkan tanpa mengubah arsitektur tempur inti.
 */
export const PLAYABLE_CHARACTERS = [
  {
    id: 'traveler',
    name: 'Traveler',
    role: 'Sang Penenun Fajar',
    weapon: 'Tongkat Tenun Lentera',
    combatIdentity: 'Seimbang • Serangan Jarak Menengah & Bara Api Suci',
    basicName: 'Tebasan Lentera Fajar',
    qSkillName: 'Phoenix Blast',
    qSkillDesc: 'Meluncurkan proyektil burung api Phoenix cepat (1 Orb Energi).',
    rUltimateName: 'Inferno Domain',
    rUltimateDesc: 'Pusaran api suci di sekeliling kaki & sisi tubuh yang membakar lawan di dekatnya.'
  },
  {
    id: 'meliodas',
    name: 'Meliodas',
    role: 'Kapten Boar Hat',
    weapon: 'Harta Suci Lostvayne',
    combatIdentity: 'Agresif Jarak Dekat • Tebasan Cepat & Api Iblis Hellblaze',
    basicName: 'Kombo Tebasan Lostvayne',
    qSkillName: 'Hellblaze',
    qSkillDesc: 'Gelombang api hitam-ungu merambat di tanah dan meledak vertikal saat mengenai lawan.',
    rUltimateName: 'Assault Mode',
    rUltimateDesc: 'Transformasi tempur 10 detik: wujud Assault Mode & +50% seluruh atribut tempur.'
  }
];
