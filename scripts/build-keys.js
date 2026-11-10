#!/usr/bin/env node
/**
 * DAYLOOM — Supabase Key Generator & Build Script
 * 
 * Fungsi:
 * 1. Di lingkungan Vercel / CI:
 *    - Menghasilkan berkas 'js/supabase-keys.local.js' menggunakan nilai dari
 *      environment variable "SUPABASE_ANON_KEY".
 *    - Menolak proses build jika "SUPABASE_ANON_KEY" belum dikonfigurasi.
 *    - Menolak penggunaan Secret Key (service_role) demi keamanan frontend.
 * 
 * 2. Di lingkungan Komputer Lokal:
 *    - Memeriksa apakah 'js/supabase-keys.local.js' sudah ada secara andal.
 *    - Jika berkas sudah ada, berkas TIDAK AKAN PERNAH ditimpa secara otomatis oleh build lokal.
 *    - Jika belum ada, menyalin dari 'js/supabase-keys.example.js' atau mengisinya dari SUPABASE_ANON_KEY.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_FILE = path.join(ROOT_DIR, 'js', 'supabase-keys.local.js');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'js', 'supabase-keys.example.js');

const isVercel = Boolean(
  process.env.VERCEL === '1' ||
  process.env.VERCEL === 'true' ||
  process.env.NOW_BUILDER === '1' ||
  process.env.VERCEL_ENV
);

const envKey = (process.env.SUPABASE_ANON_KEY || '').trim();
const isForce = process.argv.includes('--force');

/**
 * Memeriksa apakah sebuah string merupakan Secret Key (service_role)
 */
function isSecretKey(key) {
  if (!key) return false;
  const lower = key.toLowerCase();
  if (
    lower.startsWith('sb_secret_') ||
    lower.startsWith('service_role_') ||
    lower.includes('service_role') ||
    lower.includes('secret_key')
  ) {
    return true;
  }

  // Periksa payload JWT jika kunci berupa token JWT Supabase
  if (key.startsWith('ey') && key.includes('.')) {
    try {
      const parts = key.split('.');
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf8');
        const parsed = JSON.parse(payloadStr);
        if (parsed && (parsed.role === 'service_role' || parsed.iss === 'supabase-admin')) {
          return true;
        }
      }
    } catch {
      // Abaikan jika bukan format JSON valid
    }
  }

  return false;
}

/**
 * Mengekstrak kunci yang tersimpan di dalam berkas js/supabase-keys.local.js secara andal.
 * Mendukung berbagai variasi deklarasi variabel, tanda petik, whitespace, dan token JWT / publishable.
 */
function extractExistingKey(content) {
  if (!content || typeof content !== 'string') return '';

  // 1. Deklarasi konstanta atau variabel SUPABASE_LOCAL_ANON_KEY
  const varMatch = content.match(
    /(?:export\s+)?(?:const|let|var)\s+SUPABASE_LOCAL_ANON_KEY\s*=\s*[`'"]([\s\S]*?)[`'"]/
  );
  if (varMatch && varMatch[1].trim()) {
    return varMatch[1].trim();
  }

  // 2. Deklarasi pada window.__DAYLOOM_SUPABASE_ANON_KEY__
  const winMatch = content.match(
    /__DAYLOOM_SUPABASE_ANON_KEY__\s*=\s*[`'"]([\s\S]*?)[`'"]/
  );
  if (winMatch && winMatch[1].trim()) {
    return winMatch[1].trim();
  }

  // 3. Pola token Supabase Publishable Key (sb_publishable_...) atau token Anon JWT (eyJ...)
  const tokenMatch = content.match(/[`'"](sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)[`'"]/);
  if (tokenMatch && tokenMatch[1].trim()) {
    return tokenMatch[1].trim();
  }

  return '';
}

function generateContent(key) {
  return `/**
 * DAYLOOM — Konfigurasi Kunci Supabase (Publishable/Anon Key)
 * Berkas ini dibuat otomatis oleh script build Dayloom.
 * 
 * Keamanan:
 * - HANYA menggunakan Publishable / Anon Key.
 * - JANGAN PERNAH menggunakan Secret Key (service_role).
 */

export const SUPABASE_LOCAL_ANON_KEY = ${JSON.stringify(key)};

if (typeof window !== 'undefined') {
  window.__DAYLOOM_SUPABASE_ANON_KEY__ = SUPABASE_LOCAL_ANON_KEY;
}
`;
}

function run() {
  console.log('=== [DAYLOOM] Memeriksa Konfigurasi Kunci Supabase ===');

  if (isVercel) {
    console.log('[DAYLOOM BUILD] Terdeteksi lingkungan Vercel Deployment.');

    if (!envKey) {
      console.error('\n' + '='.repeat(70));
      console.error('[DAYLOOM VERCEL BUILD ERROR] Variabel lingkungan "SUPABASE_ANON_KEY" tidak ditemukan!');
      console.error('Dayloom membutuhkan Publishable / Anon Key Supabase untuk beroperasi di Vercel.\n');
      console.error('Langkah Penyelesaian di Vercel Dashboard:');
      console.error('1. Buka dashboard proyek Dayloom Anda di https://vercel.com');
      console.error('2. Pilih tab "Settings" -> menu "Environment Variables"');
      console.error('3. Tambahkan variabel baru:');
      console.error('     Key   : SUPABASE_ANON_KEY');
      console.error('     Value : [Publishable / Anon Key Supabase Anda]');
      console.error('4. Simpan (Save) dan lakukan Deploy ulang (Redeploy).\n');
      console.error('PERINGATAN KEAMANAN:');
      console.error('- Gunakan HANYA Supabase Publishable / Anon Key.');
      console.error('- JANGAN PERNAH memasukkan Supabase Secret Key (service_role)!');
      console.error('='.repeat(70) + '\n');
      process.exit(1);
    }

    if (isSecretKey(envKey)) {
      console.error('\n' + '='.repeat(70));
      console.error('[DAYLOOM SECURITY ERROR] Terdeteksi potensi Supabase Secret Key (service_role)!');
      console.error('DITOLAK: Secret Key tidak boleh diikutsertakan ke dalam bundle frontend.');
      console.error('Ganti nilai SUPABASE_ANON_KEY di Vercel dengan Supabase Publishable Key.');
      console.error('='.repeat(70) + '\n');
      process.exit(1);
    }

    fs.writeFileSync(TARGET_FILE, generateContent(envKey), 'utf8');
    console.log('[DAYLOOM BUILD] Berhasil membuat js/supabase-keys.local.js dari environment variable SUPABASE_ANON_KEY.');
    console.log('[DAYLOOM BUILD] Build Vercel siap dipublikasikan sebagai static hosting.');
    return;
  }

  // Lingkungan Lokal (Developer Machine)
  console.log('[DAYLOOM BUILD] Terdeteksi lingkungan komputer lokal.');

  const fileExists = fs.existsSync(TARGET_FILE);

  if (fileExists) {
    try {
      const existingContent = fs.readFileSync(TARGET_FILE, 'utf8');
      const existingKey = extractExistingKey(existingContent);

      if (existingKey) {
        console.log('[DAYLOOM BUILD] Berkas js/supabase-keys.local.js sudah ada dan memiliki kunci aktif.');
        console.log('[DAYLOOM BUILD] Kunci lokal yang tersimpan dipertahankan (TIDAK AKAN ditimpa).');
        return;
      }

      // Berkas ada namun key belum diisi atau berupa placeholder
      if (!isForce) {
        console.log('[DAYLOOM BUILD] Berkas js/supabase-keys.local.js ditemukan di lingkungan lokal.');
        console.log('[DAYLOOM BUILD] Konfigurasi lokal dipertahankan (tidak ditimpa otomatis).');
        return;
      }
    } catch (e) {
      console.warn('[DAYLOOM BUILD] Peringatan saat membaca konfigurasi lokal:', e.message);
      if (!isForce) {
        console.log('[DAYLOOM BUILD] Berkas lokal dipertahankan demi keamanan.');
        return;
      }
    }
  }

  // Jika file belum ada di komputer lokal
  if (envKey) {
    if (isSecretKey(envKey)) {
      console.error('[DAYLOOM SECURITY ERROR] Nilai SUPABASE_ANON_KEY mengandung Secret Key!');
      process.exit(1);
    }
    fs.writeFileSync(TARGET_FILE, generateContent(envKey), 'utf8');
    console.log('[DAYLOOM BUILD] js/supabase-keys.local.js dibuat menggunakan SUPABASE_ANON_KEY.');
    return;
  }

  if (!fileExists) {
    if (fs.existsSync(TEMPLATE_FILE)) {
      fs.copyFileSync(TEMPLATE_FILE, TARGET_FILE);
      console.log('[DAYLOOM BUILD] js/supabase-keys.local.js disalin dari js/supabase-keys.example.js.');
    } else {
      fs.writeFileSync(TARGET_FILE, generateContent(''), 'utf8');
      console.log('[DAYLOOM BUILD] js/supabase-keys.local.js dibuat dengan templat default.');
    }
    console.log('[DAYLOOM BUILD] Silakan masukkan Publishable Key Supabase Anda di js/supabase-keys.local.js jika ingin menggunakan fitur cloud.');
  } else {
    console.log('[DAYLOOM BUILD] js/supabase-keys.local.js sudah ada di lingkungan lokal.');
  }
}

run();
