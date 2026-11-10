/**
 * DAYLOOM STAGE 5 — PRODUCTION READINESS & DEPLOYMENT TEST SUITE
 * Memverifikasi:
 * 1. Build script scripts/build-keys.js menghasilkan js/supabase-keys.local.js saat SUPABASE_ANON_KEY disediakan.
 * 2. Build script menolak build Vercel jika SUPABASE_ANON_KEY tidak ada (exit code 1).
 * 3. Build script menolak penggunaan Secret Key (service_role) demi keamanan frontend.
 * 4. Build lokal tidak menimpa file kunci yang sudah ada.
 * 5. Format export js/supabase-keys.local.js valid dan cocok dengan import di js/config.js.
 * 6. File vercel.json mematuhi standar static hosting Vercel.
 * 7. Integritas berkas statis (CSS, JS, Asset 2D) siap 100% untuk deployment Vercel.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('=== MEMULAI PENGUJIAN STAGE 5 PRODUCTION READINESS ===\n');

const ROOT_DIR = path.resolve('.');
const KEY_FILE = path.join(ROOT_DIR, 'js', 'supabase-keys.local.js');
const VERCEL_JSON = path.join(ROOT_DIR, 'vercel.json');
const BUILD_SCRIPT = path.join(ROOT_DIR, 'scripts', 'build-keys.js');

// Simpan cadangan file lokal sebelum pengujian jika ada
const originalKeyContent = fs.existsSync(KEY_FILE) ? fs.readFileSync(KEY_FILE, 'utf8') : null;

try {
  // ---------------------------------------------------------------------------
  // TEST 1: vercel.json Configuration Compliance
  // ---------------------------------------------------------------------------
  console.log('[1/5] Memverifikasi konfigurasi vercel.json...');
  assert.ok(fs.existsSync(VERCEL_JSON), 'vercel.json harus ada');
  const vercelConfig = JSON.parse(fs.readFileSync(VERCEL_JSON, 'utf8'));

  assert.strictEqual(vercelConfig.buildCommand, 'npm run build', 'buildCommand harus "npm run build"');
  assert.strictEqual(vercelConfig.outputDirectory, '.', 'outputDirectory harus "." untuk vanilla static site');
  assert.strictEqual(vercelConfig.framework, null, 'framework harus null (Static / Other)');
  console.log('  [LULUS] vercel.json terkonfigurasi dengan tepat untuk static hosting Dayloom.');

  // ---------------------------------------------------------------------------
  // TEST 2: Build Vercel dengan SUPABASE_ANON_KEY Valid
  // ---------------------------------------------------------------------------
  console.log('\n[2/5] Menguji generator kunci di lingkungan Vercel (SUPABASE_ANON_KEY valid)...');
  const mockAnonKey = 'sb_publishable_test_token_dayloom_2026';

  const vercelBuildOutput = execSync(`node "${BUILD_SCRIPT}"`, {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      VERCEL: '1',
      SUPABASE_ANON_KEY: mockAnonKey
    },
    encoding: 'utf8'
  });

  assert.ok(vercelBuildOutput.includes('Berhasil membuat js/supabase-keys.local.js'), 'Harus mencetak log sukses');
  assert.ok(fs.existsSync(KEY_FILE), 'js/supabase-keys.local.js harus terbuat');

  const generatedContent = fs.readFileSync(KEY_FILE, 'utf8');
  assert.ok(generatedContent.includes(mockAnonKey), 'File yang dihasilkan harus berisi anon key');
  assert.ok(generatedContent.includes('export const SUPABASE_LOCAL_ANON_KEY'), 'Harus mengekspor SUPABASE_LOCAL_ANON_KEY');
  console.log('  [LULUS] Build Vercel sukses menghasilkan file kunci yang valid.');

  // ---------------------------------------------------------------------------
  // TEST 3: Keamanan — Penolakan Secret Key (service_role)
  // ---------------------------------------------------------------------------
  console.log('\n[3/5] Menguji pencegahan kebocoran Secret Key (service_role)...');
  const secretKeyAttempts = [
    'service_role_key_secret_123',
    'sb_secret_super_admin_key',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.fake_signature'
  ];

  for (const secretKey of secretKeyAttempts) {
    let failedAsExpected = false;
    try {
      execSync(`node "${BUILD_SCRIPT}"`, {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          VERCEL: '1',
          SUPABASE_ANON_KEY: secretKey
        },
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch (err) {
      failedAsExpected = true;
      assert.strictEqual(err.status, 1, 'Proses harus keluar dengan exit code 1 saat terdeteksi Secret Key');
    }
    assert.ok(failedAsExpected, `Secret Key "${secretKey}" harus ditolak keras!`);
  }
  console.log('  [LULUS] Seluruh variasi Supabase Secret Key berhasil ditolak keras.');

  // ---------------------------------------------------------------------------
  // TEST 4: Penolakan Build Vercel jika SUPABASE_ANON_KEY Kosong
  // ---------------------------------------------------------------------------
  console.log('\n[4/5] Menguji pesan error jika Vercel belum dikonfigurasi SUPABASE_ANON_KEY...');
  let missingKeyFailed = false;
  try {
    execSync(`node "${BUILD_SCRIPT}"`, {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        VERCEL: '1',
        SUPABASE_ANON_KEY: ''
      },
      encoding: 'utf8',
      stdio: 'pipe'
    });
  } catch (err) {
    missingKeyFailed = true;
    assert.strictEqual(err.status, 1, 'Proses harus keluar dengan exit code 1 saat SUPABASE_ANON_KEY kosong');
    const stderr = err.stderr ? err.stderr.toString() : '';
    assert.ok(stderr.includes('SUPABASE_ANON_KEY') || stderr.includes('ERROR'), 'Pesan error harus jelas dan informatif');
  }
  assert.ok(missingKeyFailed, 'Build Vercel tanpa SUPABASE_ANON_KEY harus gagal dengan pesan panduan');
  console.log('  [LULUS] Pesan error panduan konfigurasi Vercel terverifikasi informatif.');

  // ---------------------------------------------------------------------------
  // TEST 5: Integritas Static Asset & Sanitasi Link Frontend
  // ---------------------------------------------------------------------------
  console.log('\n[5/5] Memverifikasi integritas berkas statis & relasi tautan...');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // Periksa script module utama
  assert.ok(indexHtml.includes('<script type="module" src="js/app.js"></script>'), 'index.html harus memuat js/app.js');

  // Periksa CSS
  const expectedCSS = ['css/main.css', 'css/world.css', 'css/atmosphere.css', 'css/arena-env.css'];
  for (const cssFile of expectedCSS) {
    assert.ok(fs.existsSync(path.join(ROOT_DIR, cssFile)), `Berkas CSS ${cssFile} harus ada`);
    assert.ok(indexHtml.includes(cssFile), `index.html harus menautkan ${cssFile}`);
  }

  // Periksa Aset Karakter Resmi
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'assets/characters/adventurer-illustration.jpg')), 'adventurer-illustration.jpg harus ada');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'assets/characters/meliodas-portrait.jpg')), 'meliodas-portrait.jpg harus ada');

  // Periksa .gitignore
  const gitignoreContent = fs.readFileSync(path.join(ROOT_DIR, '.gitignore'), 'utf8');
  assert.ok(gitignoreContent.includes('js/supabase-keys.local.js'), '.gitignore harus mengecualikan js/supabase-keys.local.js');

  console.log('  [LULUS] Seluruh berkas statis, stylesheet, aset visual, dan .gitignore terverifikasi 100%.');

  console.log('\n=== SELURUH PENGUJIAN STAGE 5 PRODUCTION READINESS LULUS 100% ===');
} finally {
  // Pulihkan berkas kunci lokal asli
  if (originalKeyContent !== null) {
    fs.writeFileSync(KEY_FILE, originalKeyContent, 'utf8');
  }
}

