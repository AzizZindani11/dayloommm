/**
 * DAYLOOM — Verifikasi HTTP Server, Aset, & Konsistensi ID DOM
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== MEMULAI VERIFIKASI INTEGRITAS DOM & MODUL ===\n');

const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

const requiredDomIds = [
  'parallax-stage',
  'world-particle-canvas',
  'world-character-actor',
  'world-spirit-orb',
  'world-location-hud',
  'hud-interact-btn',
  'village-walk-area',
  'world-active-quests-preview',
  'hud-rank-emblem',
  'hud-adventurer-name',
  'hud-rank-title',
  'hud-rp-bar-fill',
  'hud-rp-text',
  'hud-prod-score',
  'btn-toggle-sound',
  'view-world',
  'view-quests',
  'view-profile',
  'view-rank',
  'view-achievements',
  'view-stats',
  'view-arena',
  'quest-filter-counters',
  'quest-search-input',
  'filter-category-select',
  'filter-priority-select',
  'quest-cards-container',
  'profile-view-content',
  'rank-view-content',
  'achievements-view-content',
  'stats-view-content',
  'arena-view-content',
  'quest-modal-overlay',
  'quest-modal-title',
  'quest-form',
  'quest-input-title',
  'quest-input-desc',
  'quest-input-category',
  'quest-input-priority',
  'quest-input-deadline',
  'quest-input-status',
  'input-new-checklist',
  'btn-add-checklist-item',
  'modal-checklist-preview',
  'shrine-modal-overlay',
  'shrine-timer-display',
  'btn-shrine-toggle',
  'btn-shrine-reset',
  'btn-close-shrine-modal',
  'rankup-modal-overlay',
  'rankup-modal-body',
  'btn-export-backup',
  'input-import-backup',
  'btn-reset-data',
  'toast-container'
];

for (const id of requiredDomIds) {
  assert.ok(
    html.includes(`id="${id}"`),
    `Elemen dengan id="${id}" wajib ada di dalam index.html`
  );
}
console.log(`  [LULUS] Seluruh ${requiredDomIds.length} ID DOM utama terverifikasi ada di index.html.`);

// Verifikasi seluruh lapisan paralaks memiliki atribut data-parallax-depth
const depthMatches = html.match(/data-parallax-depth="[0-9.]+"/g) || [];
assert.ok(depthMatches.length >= 5, 'Minimal 5 lapisan paralaks harus memiliki data-parallax-depth');
console.log(`  [LULUS] ${depthMatches.length} lapisan kedalaman paralaks terverifikasi.`);

// Verifikasi keempat bangunan interaktif desa ada di HTML
const buildings = ['loom_shrine', 'quest_board', 'tea_house', 'arena_dojo'];
for (const b of buildings) {
  assert.ok(html.includes(`data-building-id="${b}"`), `Bangunan ${b} harus ada di dunia desa`);
}
console.log(`  [LULUS] Keempat bangunan interaktif Desa Hanamori terverifikasi.`);

console.log('\n=== VERIFIKASI INTEGRITAS SELESAI DENGAN SUKSES ===');

