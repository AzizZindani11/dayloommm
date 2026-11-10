/**
 * DAYLOOM — REGISTRATION EMAIL VALIDATION & RATE-LIMIT SEPARATION TEST
 * Memverifikasi:
 * 1. Penerimaan seluruh alamat email standar (Gmail, Outlook, Yahoo, Proton, iCloud, Edu, dll.)
 * 2. Tidak adanya kewajiban domain khusus (@dayloom.id tidak diwajibkan)
 * 3. Penolakan alamat email yang benar-benar tidak valid (tanpa domain, tanpa @, dsb.)
 * 4. Pemisahan tegas pesan error Rate-Limit Supabase dari validasi format email
 * 5. Sanitasi email (trim & lowercase) sebelum dikirimkan ke Supabase Auth
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { isValidEmail, formatAuthErrorMessage } from '../js/storage.js';

console.log('=== MEMULAI PENGUJIAN REGISTRASI & VALIDASI EMAIL DAYLOOM ===\n');

// ---------------------------------------------------------------------------
// TEST 1: Penerimaan Alamat Email Standar (Gmail, Outlook, Yahoo, dsb.)
// ---------------------------------------------------------------------------
console.log('[1/5] Menguji penerimaan email dari penyedia umum...');

const standardEmails = [
  'user@gmail.com',
  'petualang.baru@gmail.com',
  'adventurer+quest1@gmail.com',
  'satria_hanamori@outlook.com',
  'penenun2026@yahoo.com',
  'ninja@icloud.com',
  'pendekar@proton.me',
  'mahasiswa@ui.ac.id',
  'user@perusahaan.co.id',
  'petualang@dayloom.id' // Diterima, tapi tidak diwajibkan
];

for (const email of standardEmails) {
  assert.strictEqual(
    isValidEmail(email),
    true,
    `Email "${email}" harus diterima sebagai alamat email standar yang valid!`
  );
  // Pastikan variasi whitespace juga tertangani
  assert.strictEqual(
    isValidEmail(`  ${email}  `),
    true,
    `Email dengan whitespace "  ${email}  " harus tetap valid!`
  );
}
console.log('  [LULUS] Seluruh 10 variasi alamat email standar diterima dengan sukses.');

// ---------------------------------------------------------------------------
// TEST 2: Memastikan Tidak Ada Kewajiban Domain @dayloom.id
// ---------------------------------------------------------------------------
console.log('\n[2/5] Memverifikasi tidak adanya kewajiban domain @dayloom.id...');

const nonDayloomEmails = [
  'alex@gmail.com',
  'budi@yahoo.co.id',
  'citra@outlook.com'
];

for (const email of nonDayloomEmails) {
  assert.ok(isValidEmail(email), `Email non-dayloom "${email}" harus diterima tanpa batasan domain.`);
}

// Periksa index.html tidak lagi mengesankan domain wajib @dayloom.id pada placeholder
const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
assert.ok(
  !indexHtml.includes('placeholder="petualang@dayloom.id"'),
  'Placeholder index.html tidak boleh membatasi persepsi domain ke @dayloom.id'
);
assert.ok(
  indexHtml.includes('placeholder="nama@gmail.com"'),
  'Placeholder index.html harus menampilkan contoh standar nama@gmail.com'
);
console.log('  [LULUS] Pendaftaran bebas dari kewajiban domain @dayloom.id.');

// ---------------------------------------------------------------------------
// TEST 3: Penolakan Format Email yang Tidak Valid
// ---------------------------------------------------------------------------
console.log('\n[3/5] Menguji penolakan format email yang cacat / tidak valid...');

const invalidEmails = [
  '',
  '   ',
  'user',
  'user@',
  '@gmail.com',
  'user@gmail',
  'user@.com',
  'user@com',
  'user space@gmail.com',
  null,
  undefined,
  12345
];

for (const invalid of invalidEmails) {
  assert.strictEqual(
    isValidEmail(invalid),
    false,
    `Email cacat "${invalid}" harus ditolak oleh validator!`
  );
}
console.log('  [LULUS] Seluruh format email cacat berhasil ditolak secara akurat.');

// ---------------------------------------------------------------------------
// TEST 4: Pemisahan Tegas Error Rate-Limit Supabase vs Format Email
// ---------------------------------------------------------------------------
console.log('\n[4/5] Memverifikasi pemisahan error Rate-Limit Supabase...');

const rateLimitErrors = [
  { message: 'over_email_send_rate_limit', status: 429 },
  { message: 'Email rate limit exceeded', status: 429 },
  { message: 'over_email_send_rate_limit' },
  { code: 'over_email_send_rate_limit', message: 'error' },
  { message: 'For security purposes, you can only request this once every 60 seconds' },
  { message: 'too many requests', status: 429 },
  { status: 429 }
];

for (const err of rateLimitErrors) {
  const formatted = formatAuthErrorMessage(err);
  assert.ok(
    formatted.includes('rate limit') || formatted.includes('Batas pengiriman email'),
    `Error ${JSON.stringify(err)} harus diklasifikasikan sebagai RATE LIMIT, bukan invalid format! Hasil: "${formatted}"`
  );
  assert.ok(
    !formatted.includes('Format alamat email tidak valid'),
    `Error rate limit TIDAK BOLEH keliru dianggap sebagai "Format alamat email tidak valid"! Hasil: "${formatted}"`
  );
}

// Bandingkan dengan pesan format email murni dari server
const formatErrors = [
  { message: 'invalid email' },
  { message: 'Unable to validate email address: invalid format' },
  { message: 'email address is invalid' }
];

for (const err of formatErrors) {
  const formatted = formatAuthErrorMessage(err);
  assert.ok(
    formatted.includes('Format alamat email tidak valid'),
    `Error ${JSON.stringify(err)} harus diklasifikasikan sebagai format email tidak valid. Hasil: "${formatted}"`
  );
}

console.log('  [LULUS] Error Rate Limit dan Format Email terbukti terpisah 100% tanpa salah tafsir.');

// ---------------------------------------------------------------------------
// TEST 5: Kontrak Normalisasi signUp & signIn di supabase-client.js
// ---------------------------------------------------------------------------
console.log('\n[5/5] Memverifikasi sanitasi dan normalisasi di supabase-client.js...');

const clientCode = fs.readFileSync(path.resolve('js/supabase-client.js'), 'utf8');

assert.ok(
  clientCode.includes('export { isValidEmail }') || clientCode.includes('export function isValidEmail('),
  'isValidEmail harus diekspor dari js/supabase-client.js'
);
assert.ok(
  clientCode.includes('trimmedEmail = (email || \'\').trim().toLowerCase()'),
  'Email harus dibersihkan dengan trim dan toLowerCase() sebelum ke Supabase'
);
assert.ok(
  clientCode.includes('if (!isValidEmail(trimmedEmail))'),
  'signUp harus memvalidasi format email sebelum mengirim permintaan'
);

console.log('  [LULUS] Normalisasi email dan validasi pra-kirim terverifikasi utuh.');

console.log('\n=== SELURUH PENGUJIAN REGISTRASI & VALIDASI EMAIL LULUS 100% ===');
