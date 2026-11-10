/**
 * DAYLOOM — Contoh Templat Kunci Lokal (Supabase Publishable/Anon Key)
 * 
 * Petunjuk Penggunaan:
 * 1. Salin berkas ini menjadi 'js/supabase-keys.local.js'
 * 2. Masukkan Publishable / Anon Key Supabase Anda pada konstanta SUPABASE_LOCAL_ANON_KEY.
 * 3. Berkas 'js/supabase-keys.local.js' terlindungi oleh .gitignore sehingga aman.
 * 4. JANGAN PERNAH menggunakan Secret Key (service_role).
 */

export const SUPABASE_LOCAL_ANON_KEY = '';

if (typeof window !== 'undefined') {
  window.__DAYLOOM_SUPABASE_ANON_KEY__ = SUPABASE_LOCAL_ANON_KEY;
}

