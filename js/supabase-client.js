/**
 * DAYLOOM — Supabase Client Adapter (Stage 1 & 2 Revision)
 * Modul adapter terisolasi untuk autentikasi dan operasi data awan Supabase.
 * 
 * Aturan Keamanan & Integritas:
 * - Menggunakan Supabase Publishable / Anon Key (BUKAN Secret Role Key).
 * - Seluruh mutasi RP WAJIB melalui RPC database 'claim_task_rp'.
 * - Tidak ada fungsi mutasi total_rp langsung, tidak ada streak bonus, dan tidak ada sinkronisasi PvP online.
 * - LocalStorage 'dayloom_save_v1' TIDAK disentuh, TIDAK dihapus, dan TIDAK dimigrasikan otomatis.
 * - Pembuatan tugas dengan checklist bersifat atomik: jika penyimpanan checklist gagal, tugas dibatalkan (rollback).
 * - Memelihara pemetaan ID ganda: 'id' (local_id frontend) dan 'dbId' (UUID PostgreSQL).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './config.js';
import { isValidEmail } from './storage.js';

export { isValidEmail };

let supabaseClient = null;

/**
 * Memeriksa apakah konfigurasi Supabase telah terisi dengan URL dan Anon Key valid
 */
export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_CONFIG &&
    typeof SUPABASE_CONFIG.url === 'string' &&
    SUPABASE_CONFIG.url.startsWith('https://') &&
    typeof SUPABASE_CONFIG.anonKey === 'string' &&
    SUPABASE_CONFIG.anonKey.trim().length > 0 &&
    !SUPABASE_CONFIG.anonKey.includes('MASUKKAN_')
  );
}

/**
 * Menginisialisasi dan mengembalikan instance client Supabase
 */
export function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (!isSupabaseConfigured()) {
    console.warn('Dayloom: Supabase belum dikonfigurasi dengan Anon Key yang valid.');
    return null;
  }

  try {
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'dayloom_auth_token'
      }
    });
    return supabaseClient;
  } catch (err) {
    console.error('Dayloom: Gagal menginisialisasi Supabase Client:', err);
    return null;
  }
}

/* ============================================================================
 * 1. AUTENTIKASI PENGGUNA (SUPABASE AUTH)
 * ============================================================================ */

/**
 * Mendaftarkan akun baru ke Supabase Auth
 * Metadata 'name' dan 'username' diselaraskan persis dengan trigger handle_new_user() di database.
 */
export async function signUp(email, password, adventurerName) {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum siap. Periksa konfigurasi Anon Key.');

  const trimmedEmail = (email || '').trim().toLowerCase();
  if (!isValidEmail(trimmedEmail)) {
    throw new Error('Format alamat email tidak valid.');
  }

  const trimmedName = (adventurerName || '').trim();
  const safeName = trimmedName.length > 30 ? trimmedName.slice(0, 30) : (trimmedName || 'Pengembara Hanamori');

  const { data, error } = await client.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        name: safeName,
        username: safeName
      }
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Masuk menggunakan email dan password
 */
export async function signIn(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum siap. Periksa konfigurasi Anon Key.');

  const trimmedEmail = (email || '').trim().toLowerCase();
  const { data, error } = await client.auth.signInWithPassword({
    email: trimmedEmail,
    password
  });

  if (error) throw error;
  return data;
}

/**
 * Keluar dari sesi akun awan
 */
export async function signOut() {
  const client = getSupabase();
  if (!client) return { error: null };
  const { error } = await client.auth.signOut();
  if (error) console.warn('Dayloom: Peringatan saat keluar dari sesi:', error);
  return { error };
}

/**
 * Mendapatkan sesi aktif saat ini
 */
export async function getSession() {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.warn('Dayloom: Gagal mengambil sesi:', error);
    return null;
  }
  return data?.session || null;
}

/**
 * Mendapatkan data pengguna aktif
 */
export async function getUser() {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data?.user || null;
}

/**
 * Mendengarkan perubahan status autentikasi (login, logout, token refresh)
 */
export function onAuthStateChange(callback) {
  const client = getSupabase();
  if (!client || typeof callback !== 'function') return { unsubscribe: () => {} };
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return subscription;
}

/* ============================================================================
 * 2. PROFIL PENGGUNA (TABEL PROFILES)
 * ============================================================================ */

/**
 * Mengambil profil petualang dari database Supabase
 */
export async function fetchProfile(userId) {
  const client = getSupabase();
  if (!client || !userId) return null;

  const { data, error } = await client
    .from('profiles')
    .select('id, username, bio, avatar_url, outfit, hat, time_of_day, selected_character, total_rp, featured_achievements, visited_locations, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Dayloom: Gagal memuat profil awan:', error);
    return null;
  }
  return data;
}

/**
 * Memperbarui data kosmetik dan preferensi visual petualang.
 * Kolom sensitif (total_rp, arena_wins, dll) dilindungi oleh Column-Level Security.
 */
export async function updateProfile(userId, profileUpdates) {
  const client = getSupabase();
  if (!client || !userId) throw new Error('Pengguna tidak terotentikasi.');

  const payload = {};
  if (profileUpdates.username !== undefined) payload.username = profileUpdates.username.trim();
  if (profileUpdates.bio !== undefined) payload.bio = profileUpdates.bio;
  if (profileUpdates.avatar_url !== undefined) payload.avatar_url = profileUpdates.avatar_url;
  if (profileUpdates.outfit !== undefined) payload.outfit = profileUpdates.outfit;
  if (profileUpdates.hat !== undefined) payload.hat = profileUpdates.hat;
  if (profileUpdates.time_of_day !== undefined) payload.time_of_day = profileUpdates.time_of_day;
  if (profileUpdates.selected_character !== undefined) payload.selected_character = profileUpdates.selected_character;
  if (profileUpdates.featured_achievements !== undefined) payload.featured_achievements = profileUpdates.featured_achievements;
  if (profileUpdates.visited_locations !== undefined) payload.visited_locations = profileUpdates.visited_locations;

  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ============================================================================
 * 3. TUGAS & CHECKLIST (CRUD CLOUD LENGKAP & ATOMIK)
 * ============================================================================ */

/**
 * Mengambil seluruh tugas milik pengguna beserta checklist terkait
 * Memetakan ID ganda: 'id' (local_id frontend) dan 'dbId' (UUID PostgreSQL)
 */
export async function fetchTasksWithChecklists(userId) {
  const client = getSupabase();
  if (!client || !userId) return [];

  const { data: tasks, error: tasksError } = await client
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (tasksError) {
    console.error('Dayloom: Gagal mengambil daftar tugas awan:', tasksError);
    return [];
  }

  if (!tasks || tasks.length === 0) return [];

  const taskDbIds = tasks.map(t => t.id);
  const { data: checklists, error: chkError } = await client
    .from('task_checklists')
    .select('*')
    .in('task_id', taskDbIds)
    .order('order_index', { ascending: true });

  if (chkError) {
    console.warn('Dayloom: Gagal mengambil checklist tugas:', chkError);
  }

  const checklistMap = new Map();
  (checklists || []).forEach(chk => {
    if (!checklistMap.has(chk.task_id)) checklistMap.set(chk.task_id, []);
    checklistMap.get(chk.task_id).push({
      id: chk.local_id || chk.id,
      dbId: chk.id,
      taskDbId: chk.task_id,
      text: chk.text,
      completed: Boolean(chk.is_completed),
      orderIndex: chk.order_index
    });
  });

  return tasks.map(t => ({
    id: t.local_id || t.id,
    dbId: t.id,
    title: t.title,
    description: t.description || '',
    category: t.category,
    priority: t.priority,
    deadline: t.deadline,
    status: t.status,
    isRPClaimed: Boolean(t.is_rp_claimed),
    completedOnTime: t.completed_on_time,
    createdAt: t.created_at,
    completedAt: t.completed_at,
    checklist: checklistMap.get(t.id) || []
  }));
}

/**
 * Menyimpan tugas baru beserta checklist-nya secara ATOMIK.
 * Jika penyimpanan butir checklist gagal, tugas yang baru dibuat akan dihapus kembali (rollback),
 * mencegah terciptanya kondisi misi tanpa checklist yang seharusnya.
 */
export async function createTask(userId, taskData) {
  const client = getSupabase();
  if (!client || !userId) throw new Error('Pengguna tidak terotentikasi.');

  const localTaskId = taskData.id || ('quest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
  const taskPayload = {
    user_id: userId,
    local_id: localTaskId,
    title: taskData.title.trim(),
    description: (taskData.description || '').trim(),
    category: taskData.category || 'pribadi',
    priority: taskData.priority || 'sedang',
    status: taskData.status || 'tersedia',
    deadline: taskData.deadline || null
  };

  const { data: createdTask, error: taskError } = await client
    .from('tasks')
    .insert(taskPayload)
    .select()
    .single();

  if (taskError) throw taskError;

  const rawChecklist = Array.isArray(taskData.checklist) ? taskData.checklist : [];
  let formattedChecklist = [];

  if (rawChecklist.length > 0) {
    const checklistPayloads = rawChecklist.map((item, idx) => ({
      task_id: createdTask.id,
      user_id: userId,
      local_id: item.id || ('chk_' + Date.now() + '_' + idx),
      text: (item.text || '').trim() || 'Item Daftar Periksa',
      is_completed: Boolean(item.completed),
      order_index: idx
    }));

    const { data: insertedChecklists, error: chkError } = await client
      .from('task_checklists')
      .insert(checklistPayloads)
      .select();

    if (chkError) {
      // ROLLBACK AMAN: Hapus tugas yang baru dibuat agar tidak menjadi tugas yatim tanpa checklist
      await client.from('tasks').delete().eq('id', createdTask.id);
      console.error('Dayloom: Gagal menyimpan checklist tugas. Tugas dibatalkan (rollback):', chkError);
      throw new Error(`Gagal menyimpan butir checklist misi: ${chkError.message}`);
    }

    formattedChecklist = (insertedChecklists || []).map(chk => ({
      id: chk.local_id || chk.id,
      dbId: chk.id,
      taskDbId: chk.task_id,
      text: chk.text,
      completed: Boolean(chk.is_completed),
      orderIndex: chk.order_index
    }));
  }

  return {
    ...createdTask,
    id: localTaskId,
    dbId: createdTask.id,
    local_id: localTaskId,
    checklist: formattedChecklist
  };
}

/**
 * Memperbarui metadata tugas (Judul, Deskripsi, Kategori, Prioritas, Status, Tenggat)
 * Melindungi kolom sensitif (is_rp_claimed, completed_on_time, user_id)
 */
export async function updateTask(taskDbId, taskUpdates) {
  const client = getSupabase();
  if (!client || !taskDbId) throw new Error('Task ID database diperlukan.');

  const payload = {};
  if (taskUpdates.title !== undefined) payload.title = taskUpdates.title.trim();
  if (taskUpdates.description !== undefined) payload.description = taskUpdates.description.trim();
  if (taskUpdates.category !== undefined) payload.category = taskUpdates.category;
  if (taskUpdates.priority !== undefined) payload.priority = taskUpdates.priority;
  if (taskUpdates.status !== undefined) payload.status = taskUpdates.status;
  if (taskUpdates.deadline !== undefined) payload.deadline = taskUpdates.deadline;

  const { data, error } = await client
    .from('tasks')
    .update(payload)
    .eq('id', taskDbId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Menyinkronkan daftar periksa (checklist) saat tugas diedit di modal:
 * Memperbarui item yang ada, menambahkan item baru, dan menghapus item yang dibuang.
 */
export async function syncTaskChecklists(userId, taskDbId, checklistItems) {
  const client = getSupabase();
  if (!client || !userId || !taskDbId) throw new Error('Parameter sinkronisasi checklist tidak valid.');

  const items = Array.isArray(checklistItems) ? checklistItems : [];

  // 1. Ambil checklist yang ada di database saat ini
  const { data: existingChecklists, error: fetchErr } = await client
    .from('task_checklists')
    .select('id, local_id')
    .eq('task_id', taskDbId);

  if (fetchErr) throw fetchErr;

  const existingMap = new Map((existingChecklists || []).map(c => [c.id, c]));
  const incomingDbIds = new Set(items.filter(i => i.dbId).map(i => i.dbId));

  // 2. Hapus checklist yang dibuang oleh pengguna
  const idsToDelete = (existingChecklists || [])
    .filter(c => !incomingDbIds.has(c.id))
    .map(c => c.id);

  if (idsToDelete.length > 0) {
    const { error: delErr } = await client
      .from('task_checklists')
      .delete()
      .in('id', idsToDelete);
    if (delErr) throw delErr;
  }

  // 3. Masukkan item baru yang belum memiliki dbId
  const newItems = items
    .filter(i => !i.dbId)
    .map((item, idx) => ({
      task_id: taskDbId,
      user_id: userId,
      local_id: item.id || ('chk_' + Date.now() + '_' + idx),
      text: (item.text || '').trim() || 'Item Daftar Periksa',
      is_completed: Boolean(item.completed),
      order_index: idx
    }));

  if (newItems.length > 0) {
    const { error: insErr } = await client
      .from('task_checklists')
      .insert(newItems);
    if (insErr) throw insErr;
  }

  // 4. Perbarui item yang sudah ada
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (item.dbId && existingMap.has(item.dbId)) {
      const { error: updErr } = await client
        .from('task_checklists')
        .update({
          text: (item.text || '').trim(),
          is_completed: Boolean(item.completed),
          order_index: idx
        })
        .eq('id', item.dbId);
      if (updErr) console.warn('Dayloom: Gagal memperbarui item checklist:', updErr);
    }
  }

  return true;
}

/**
 * Memperbarui status centang checklist secara atomik
 */
export async function toggleChecklist(checklistDbId, isCompleted) {
  const client = getSupabase();
  if (!client || !checklistDbId) throw new Error('Koneksi Supabase belum siap atau Checklist ID kosong.');

  const { data, error } = await client
    .from('task_checklists')
    .update({ is_completed: Boolean(isCompleted) })
    .eq('id', checklistDbId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Menghapus satu butir checklist
 */
export async function deleteChecklistItem(checklistDbId) {
  const client = getSupabase();
  if (!client || !checklistDbId) throw new Error('Checklist ID diperlukan.');

  const { error } = await client
    .from('task_checklists')
    .delete()
    .eq('id', checklistDbId);

  if (error) throw error;
  return true;
}

/**
 * Menghapus tugas dari cloud (menghapus checklist secara CASCADE)
 */
export async function deleteTask(taskDbId) {
  const client = getSupabase();
  if (!client || !taskDbId) throw new Error('Task ID diperlukan.');

  const { error } = await client
    .from('tasks')
    .delete()
    .eq('id', taskDbId);

  if (error) throw error;
  return true;
}

/* ============================================================================
 * 4. KLAIM RP TUGAS SECARA SERVER-AUTHORITATIVE (RPC CLAIM_TASK_RP)
 * ============================================================================ */

/**
 * Mengklaim +10 RP untuk misi yang telah selesai 100% checklist-nya.
 * Sesuai aturan: Ini adalah SATU-SATUNYA metode mutasi RP ke database.
 * Mendukung pencarian via UUID database (taskId) maupun string lokal (localId).
 */
export async function claimTaskRP({ taskId, localId }) {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum siap.');

  const { data, error } = await client.rpc('claim_task_rp', {
    p_task_id: taskId || null,
    p_local_id: localId || null
  });

  if (error) throw error;
  return data;
}

/* ============================================================================
 * 5. RIWAYAT PERINGKAT (TABEL RANK_HISTORY)
 * ============================================================================ */

/**
 * Mengambil riwayat kenaikan peringkat petualang dari database Supabase
 */
export async function fetchRankHistory(userId) {
  const client = getSupabase();
  if (!client || !userId) return [];

  try {
    const { data, error } = await client
      .from('rank_history')
      .select('*')
      .eq('user_id', userId)
      .order('reached_at', { ascending: true });

    if (error) {
      console.warn('Dayloom: Catatan rank_history tidak dapat diakses atau belum tersedia:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Dayloom: Gagal mengambil rank_history awan:', err);
    return [];
  }
}

/**
 * Menyimpan catatan kenaikan peringkat baru ke tabel rank_history
 */
export async function recordRankHistory(userId, rankData, rpAtTime) {
  const client = getSupabase();
  if (!client || !userId || !rankData) return null;

  try {
    const payload = {
      user_id: userId,
      rank_id: rankData.id,
      rank_name: rankData.name,
      rp_at_time: Math.max(0, Math.floor(rpAtTime || 0)),
      reached_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('rank_history')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('Dayloom: Gagal mencatat rank_history ke awan:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Dayloom: Pengecualian saat mencatat rank_history:', err);
    return null;
  }
}
