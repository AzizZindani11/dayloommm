/**
 * DAYLOOM — Suite Pengujian Otomatis (Unit & Integration Tests)
 * Menguji seluruh aturan inti bisnis, progresi RPG, validasi checklist, skor produktivitas, dan penyimpanan.
 */

import assert from 'node:assert/strict';
import { RANKS, RP_PER_QUEST } from '../js/config.js';
import {
  createDefaultState,
  validateAndSanitizeState,
  exportBackupJSON,
  importBackupJSON,
  getRelativeDateStr
} from '../js/storage.js';
import {
  getCurrentRank,
  getRankProgress,
  validateTaskCompletion,
  awardRPForTask,
  calculateProductivityScore,
  evaluateAchievements
} from '../js/progression.js';
import {
  getRankEmblemSVG,
  getCharacterSVG,
  getAchievementSVG,
  getBossSVG
} from '../js/art.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  [LULUS] ${name}`);
  } catch (err) {
    console.error(`  [GAGAL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('=== MEMULAI PENGUJIAN OTOMATIS DAYLOOM ===\n');

// 1. Pengujian Enam Peringkat Resmi
test('1. Enam peringkat resmi sesuai spesifikasi (Epic s/d Mythic Immortal)', () => {
  const rankNames = RANKS.map(r => r.name);
  assert.deepEqual(rankNames, [
    'Epic',
    'Legend',
    'Mythic',
    'Mythic Honor',
    'Mythic Glory',
    'Mythic Immortal'
  ]);
  assert.equal(RP_PER_QUEST, 10);
});

// 2. Pengujian Generator Aset SVG Orisinal
test('2. Seluruh 6 emblem peringkat, karakter, pencapaian, dan boss menghasilkan SVG valid', () => {
  RANKS.forEach(r => {
    const svg = getRankEmblemSVG(r.id);
    assert.ok(svg.includes('<svg'), `Emblem ${r.id} harus berupa SVG`);
    assert.ok(svg.includes('</svg>'));
  });

  const charSvg = getCharacterSVG({ outfitId: 'sakura_ronin', hatId: 'kitsune_mask', rankId: 'mythic' });
  assert.ok(charSvg.includes('<svg'));

  const achSvg = getAchievementSVG('spool', true);
  assert.ok(achSvg.includes('<svg'));

  const bossSvg = getBossSVG('sloth_oni');
  assert.ok(bossSvg.includes('<svg'));
});

// 3. Pengujian Validasi Checklist Wajib
test('3. Misi dengan daftar periksa (checklist) yang belum selesai ditolak dengan pesan Bahasa Indonesia', () => {
  const incompleteTask = {
    id: 't1',
    title: 'Menulis Bab 1',
    checklist: [
      { id: 'c1', text: 'Riset referensi', completed: true },
      { id: 'c2', text: 'Menyusun kerangka', completed: false }
    ]
  };

  const res1 = validateTaskCompletion(incompleteTask);
  assert.equal(res1.valid, false);
  assert.equal(res1.incompleteCount, 1);
  assert.ok(res1.message.includes('belum dapat diselesaikan'));

  // Setelah semua checklist dicentang, validasi harus mengizinkan penyelesaian
  incompleteTask.checklist[1].completed = true;
  const res2 = validateTaskCompletion(incompleteTask);
  assert.equal(res2.valid, true);
  assert.equal(res2.incompleteCount, 0);
});

// 4. Pengujian +10 RP & Buku Besar Anti-Duplikat
test('4. Menyelesaikan misi memberi +10 RP hanya satu kali per misi (Anti-Duplikat)', () => {
  const state = createDefaultState();
  assert.equal(state.rp, 0);

  const task = state.tasks[0];
  task.checklist.forEach(c => { c.completed = true; });
  task.status = 'selesai';

  // Klaim pertama: +10 RP
  const claim1 = awardRPForTask(state, task);
  assert.equal(claim1.awarded, true);
  assert.equal(claim1.rpGained, 10);
  assert.equal(state.rp, 10);

  // Jika misi dibuka kembali lalu diselesaikan lagi, TIDAK boleh memberi RP ganda
  const claim2 = awardRPForTask(state, task);
  assert.equal(claim2.awarded, false);
  assert.equal(claim2.rpGained, 0);
  assert.equal(state.rp, 10);
});

// 5. Pengujian Kenaikan Peringkat (Rank Up)
test('5. Progresi RP menaikkan peringkat dari Epic (0) ke Legend (50) hingga Mythic Immortal (500+)', () => {
  assert.equal(getCurrentRank(0).name, 'Epic');
  assert.equal(getCurrentRank(40).name, 'Epic');
  assert.equal(getCurrentRank(50).name, 'Legend');
  assert.equal(getCurrentRank(120).name, 'Mythic');
  assert.equal(getCurrentRank(220).name, 'Mythic Honor');
  assert.equal(getCurrentRank(350).name, 'Mythic Glory');
  assert.equal(getCurrentRank(500).name, 'Mythic Immortal');

  const prog = getRankProgress(30);
  assert.equal(prog.currentRank.name, 'Epic');
  assert.equal(prog.nextRank.name, 'Legend');
  assert.equal(prog.rpRemaining, 20);
  assert.equal(prog.percent, 60);
});

// 6. Pengujian Rumus Skor Produktivitas (40% Tepat Waktu, 40% Selesai, 20% Bebas Terlambat)
test('6. Skor Produktivitas (0-100) dihitung akurat sesuai bobot 40/40/20 dan terpisah dari RP', () => {
  const today = '2026-11-09';

  // Kasus 1: Semua tugas selesai tepat waktu dan tidak ada yang terlambat -> 100/100
  const perfectTasks = [
    { id: '1', status: 'selesai', deadline: today, completedOnTime: true },
    { id: '2', status: 'selesai', deadline: today, completedOnTime: true }
  ];
  const scorePerfect = calculateProductivityScore(perfectTasks, today);
  assert.equal(scorePerfect.totalScore, 100);
  assert.equal(scorePerfect.onTimeComponent, 40);
  assert.equal(scorePerfect.overallComponent, 40);
  assert.equal(scorePerfect.overdueComponent, 20);

  // Kasus 2: 2 tugas total -> 1 selesai tepat waktu, 1 masih berjalan tapi belum lewat tenggat
  // On-Time: 1/1 selesai tepat waktu = 40
  // Overall: 1/2 selesai = 20
  // Non-Overdue: 2/2 tidak terlambat = 20
  // Total = 80
  const mixedTasks = [
    { id: '1', status: 'selesai', deadline: today, completedOnTime: true },
    { id: '2', status: 'berjalan', deadline: '2026-11-12', completedOnTime: null }
  ];
  const scoreMixed = calculateProductivityScore(mixedTasks, today);
  assert.equal(scoreMixed.totalScore, 80);
});

// 7. Pengujian Pembukaan Pencapaian (Achievements)
test('7. Pencapaian terbuka secara otomatis saat syarat terpenuhi', () => {
  const state = createDefaultState();
  const task = state.tasks[0];
  task.checklist.forEach(c => { c.completed = true; });
  task.status = 'selesai';
  task.completedOnTime = true;
  awardRPForTask(state, task);

  const unlocked = evaluateAchievements(state);
  const unlockedIds = unlocked.map(a => a.id);
  // Misi pertama memiliki 3 checklist, maka harus membuka 'first_thread' dan 'checklist_master'
  assert.ok(unlockedIds.includes('first_thread'));
  assert.ok(unlockedIds.includes('checklist_master'));
});

// 8. Pengujian Ekspor / Impor Cadangan & Pemulihan Data
test('8. Ekspor dan Impor JSON memvalidasi serta menjaga keutuhan buku besar RP', () => {
  const state = createDefaultState();
  state.profile.name = 'Raka Sang Penenun';
  state.rewardedTaskIds = ['q1', 'q2'];
  state.rp = 20;

  const json = exportBackupJSON(state);
  const mockStore = {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = v; }
  };

  const imported = importBackupJSON(json, mockStore);
  assert.equal(imported.profile.name, 'Raka Sang Penenun');
  assert.equal(imported.rp, 20);
  assert.equal(imported.rewardedTaskIds.length, 2);

  // Jika RP dimanipulasi tidak sesuai buku besar, sanitasi mengembalikannya ke jumlah sah
  const tampered = JSON.parse(json);
  tampered.rp = 9990;
  const sanitized = validateAndSanitizeState(tampered);
  assert.equal(sanitized.rp, 20);
});

console.log(`\n=== HASIL: ${passed}/8 PENGUJIAN LULUS SEMPURNA ===`);

