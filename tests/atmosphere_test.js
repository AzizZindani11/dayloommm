/**
 * DAYLOOM — Verifikasi Sistem Atmosfer Latar Belakang Global
 * Menguji struktur, 3 komposisi waktu (Pagi, Senja, Malam), cakupan 6 halaman,
 * lapisan kedalaman paralaks, dan integritas CSS/JS.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GlobalAtmosphereController } from '../js/atmosphere.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== MEMULAI PENGUJIAN SISTEM ATMOSFER LATAR BELAKANG GLOBAL ===\n');

const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const atmoCss = fs.readFileSync(path.join(rootDir, 'css/atmosphere.css'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'js/app.js'), 'utf8');

// 1. Verifikasi integrasi di index.html
assert.ok(html.includes('href="css/atmosphere.css"'), 'index.html wajib memuat css/atmosphere.css');
assert.ok(html.includes('id="global-atmosphere-system"'), 'index.html wajib memiliki wadah #global-atmosphere-system');
assert.ok(html.includes('data-active-view="world"'), 'body harus memiliki atribut data-active-view awal');
console.log('  [LULUS] 1. Integrasi global di index.html terverifikasi.');

// 2. Verifikasi markup 3 mode waktu & lapisan kedalaman di GlobalAtmosphereController
// Mock window untuk konstruktor di lingkungan Node
globalThis.window = globalThis.window || {
  innerWidth: 1440,
  innerHeight: 900,
  matchMedia: () => ({ matches: false })
};

const controller = new GlobalAtmosphereController();
const markup = controller.buildAtmosphereMarkup();

assert.ok(markup.includes('atmo-only-pagi'), 'Komposisi lingkungan khusus Pagi harus tersedia');
assert.ok(markup.includes('atmo-only-senja'), 'Komposisi lingkungan khusus Senja harus tersedia');
assert.ok(markup.includes('atmo-only-malam'), 'Komposisi lingkungan khusus Malam harus tersedia');
assert.ok(markup.includes('data-bg-depth="0.04"'), 'Lapisan langit (0.04) harus tersedia');
assert.ok(markup.includes('data-bg-depth="0.10"'), 'Lapisan pegunungan jauh (0.10) harus tersedia');
assert.ok(markup.includes('data-bg-depth="0.18"'), 'Lapisan siluet desa/pagoda/torii (0.18) harus tersedia');
assert.ok(markup.includes('data-bg-depth="0.28"'), 'Lapisan dahan sakura & lentera depan (0.28) harus tersedia');
assert.ok(markup.includes('atmo-readability-veil'), 'Selubung keterbacaan tengah (readability veil) harus tersedia');
assert.ok(markup.includes('id="global-atmosphere-canvas"'), 'Kanvas partikel global harus tersedia');
console.log('  [LULUS] 2. Markup berlapis dan 3 komposisi berbeda (Pagi, Senja, Malam) terverifikasi.');

// 3. Verifikasi aturan CSS untuk ketiga waktu dan penyesuaian halaman
assert.ok(atmoCss.includes('body[data-time-of-day="senja"]'), 'CSS harus mengatur identitas Senja');
assert.ok(atmoCss.includes('body[data-time-of-day="malam"]'), 'CSS harus mengatur identitas Malam');
assert.ok(atmoCss.includes('body[data-active-view="stats"]'), 'CSS harus memiliki penyesuaian ketenangan untuk halaman Statistik');
assert.ok(atmoCss.includes('body[data-active-view="quests"]'), 'CSS harus memiliki penyesuaian keterbacaan untuk halaman Papan Misi');
assert.ok(atmoCss.includes('body[data-active-view="arena"]'), 'CSS harus memiliki penyesuaian atmosfer untuk halaman Arena Dojo');
assert.ok(atmoCss.includes('prefers-reduced-motion: reduce'), 'CSS harus menghormati prefers-reduced-motion');
console.log('  [LULUS] 3. Aturan CSS 3 suasana waktu, cakupan halaman, dan aksesibilitas terverifikasi.');

// 4. Verifikasi integrasi di js/app.js
assert.ok(appJs.includes('GlobalAtmosphereController'), 'app.js harus mengimpor dan menginisialisasi GlobalAtmosphereController');
assert.ok(appJs.includes('this.atmosphere.setActiveView(viewName)'), 'switchView harus memperbarui tampilan aktif pada atmosfer global');
assert.ok(appJs.includes('this.atmosphere.setTimeMode(mode)'), 'applyTimeOfDayTheme harus memperbarui mode waktu pada atmosfer global');
console.log('  [LULUS] 4. Sinkronisasi navigasi 6 halaman dan pemilih waktu di js/app.js terverifikasi.');

console.log('\n=== PENGUJIAN SISTEM ATMOSFER GLOBAL LULUS SEMPURNA ===');

