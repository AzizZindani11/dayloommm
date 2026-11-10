/**
 * DAYLOOM — Modul Statistik & Visualisasi Kinerja Petualang
 * Seluruh metrik diturunkan langsung dari data asli pengguna yang tersimpan.
 */

import { CATEGORIES } from './config.js';
import { calculateProductivityScore, getCurrentRank, isTaskOverdue } from './progression.js';
import { getRelativeDateStr } from './storage.js';
import { getRankEmblemSVG } from './art.js';

export function renderStatisticsView(state) {
  const container = document.getElementById('stats-view-content');
  if (!container || !state) return;

  const today = getRelativeDateStr(0);
  const tasks = state.tasks || [];
  const scoreData = calculateProductivityScore(tasks, today);
  const currentRank = getCurrentRank(state.rp);

  const completedTasks = tasks.filter(t => t.status === 'selesai');
  const activeTasks = tasks.filter(t => t.status !== 'selesai');
  const overdueTasks = tasks.filter(t => isTaskOverdue(t, today));

  // Distribusi Kategori
  const categoryStats = CATEGORIES.map(cat => {
    const catTasks = tasks.filter(t => t.category === cat.id);
    const catDone = catTasks.filter(t => t.status === 'selesai').length;
    return {
      ...cat,
      total: catTasks.length,
      completed: catDone,
      percent: catTasks.length > 0 ? Math.round((catDone / catTasks.length) * 100) : 0
    };
  });

  container.innerHTML = `
    <div class="stats-grid-top">
      <!-- Kartu Utama Skor Produktivitas (Terpisah dari RP) -->
      <div class="rpg-panel stats-score-panel">
        <div class="panel-header-row">
          <div>
            <span class="rpg-tag">Evaluasi Tenunan Kerja</span>
            <h3 class="panel-title">Skor Produktivitas (0–100)</h3>
          </div>
          <span class="score-grade-badge">${scoreData.gradeLabel}</span>
        </div>

        <div class="score-hero-layout">
          <div class="score-gauge-wrap">
            <canvas id="productivity-gauge-canvas" width="180" height="180"></canvas>
            <div class="score-gauge-center">
              <span class="score-big-num">${scoreData.totalScore}</span>
              <span class="score-max-label">dari 100</span>
            </div>
          </div>

          <div class="score-pillars">
            <div class="pillar-item">
              <div class="pillar-head">
                <span>Ketepatan Waktu (Bobot 40%)</span>
                <strong>${scoreData.onTimeComponent} / 40</strong>
              </div>
              <div class="pillar-bar-track">
                <div class="pillar-bar-fill fill-sakura" style="width: ${(scoreData.onTimeComponent / 40) * 100}%"></div>
              </div>
              <small>${scoreData.onTimeCount} dari ${scoreData.completedCount} misi selesai tepat waktu (${scoreData.onTimeRate}%)</small>
            </div>

            <div class="pillar-item">
              <div class="pillar-head">
                <span>Penyelesaian Keseluruhan (Bobot 40%)</span>
                <strong>${scoreData.overallComponent} / 40</strong>
              </div>
              <div class="pillar-bar-track">
                <div class="pillar-bar-fill fill-blue" style="width: ${(scoreData.overallComponent / 40) * 100}%"></div>
              </div>
              <small>${scoreData.completedCount} dari ${scoreData.totalTasks} total misi telah tuntas (${scoreData.completionRate}%)</small>
            </div>

            <div class="pillar-item">
              <div class="pillar-head">
                <span>Disiplin Tenggat / Bebas Terlambat (Bobot 20%)</span>
                <strong>${scoreData.overdueComponent} / 20</strong>
              </div>
              <div class="pillar-bar-track">
                <div class="pillar-bar-fill fill-gold" style="width: ${(scoreData.overdueComponent / 20) * 100}%"></div>
              </div>
              <small>${scoreData.overdueActiveCount} misi aktif yang melewati tenggat waktu</small>
            </div>
          </div>
        </div>

        <p class="score-explanation-box">
          <strong>Catatan Sistem:</strong> ${scoreData.explanation}
          <em>(Skor Produktivitas mengukur kualitas manajemen waktu dan dihitung terpisah dari Rank Points / RP).</em>
        </p>
      </div>

      <!-- Ringkasan Angka Kunci & Status Peringkat -->
      <div class="stats-kpi-column">
        <div class="stats-kpi-grid">
          <div class="rpg-panel kpi-card">
            <span class="kpi-label">Misi Selesai</span>
            <strong class="kpi-value text-success">${completedTasks.length}</strong>
            <small class="kpi-sub">Total dituntaskan</small>
          </div>
          <div class="rpg-panel kpi-card">
            <span class="kpi-label">Misi Aktif</span>
            <strong class="kpi-value text-navy">${activeTasks.length}</strong>
            <small class="kpi-sub">Sedang berjalan / tersedia</small>
          </div>
          <div class="rpg-panel kpi-card">
            <span class="kpi-label">Misi Terlambat</span>
            <strong class="kpi-value ${overdueTasks.length > 0 ? 'text-danger' : 'text-success'}">${overdueTasks.length}</strong>
            <small class="kpi-sub">Melewati tenggat aktif</small>
          </div>
          <div class="rpg-panel kpi-card">
            <span class="kpi-label">Total Rank Points</span>
            <strong class="kpi-value text-gold">${state.rp} RP</strong>
            <small class="kpi-sub">${state.rewardedTaskIds.length} misi memberi RP</small>
          </div>
        </div>

        <div class="rpg-panel rank-mini-summary">
          <div class="rank-mini-emblem">${getRankEmblemSVG(currentRank.id, 64)}</div>
          <div class="rank-mini-info">
            <span class="rpg-tag">Peringkat Saat Ini</span>
            <h4>${currentRank.name} — ${currentRank.title}</h4>
            <p>${currentRank.lore}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Baris Kedua: Distribusi Kategori & Tren RP -->
    <div class="stats-grid-bottom">
      <div class="rpg-panel">
        <span class="rpg-tag">Keseimbangan Hidup</span>
        <h3 class="panel-title">Distribusi Kategori Misi</h3>
        <div class="category-bars-list">
          ${categoryStats.map(cat => `
            <div class="cat-stat-row">
              <div class="cat-stat-meta">
                <span class="cat-dot" style="background:${cat.color}"></span>
                <span class="cat-name">${cat.label}</span>
                <span class="cat-count">${cat.completed}/${cat.total} selesai (${cat.percent}%)</span>
              </div>
              <div class="pillar-bar-track">
                <div class="pillar-bar-fill" style="width:${cat.total > 0 ? Math.max(6, (cat.total / Math.max(1, tasks.length)) * 100) : 0}%; background:${cat.color}"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="rpg-panel">
        <span class="rpg-tag">Jejak Perjalanan</span>
        <h3 class="panel-title">Grafik Progresi RP & Riwayat Peringkat</h3>
        <div class="rp-chart-wrapper">
          <canvas id="rp-trend-canvas" width="460" height="170"></canvas>
        </div>
        <div class="rank-history-list">
          <h4>Catatan Sejarah Peringkat & RP Terbaru</h4>
          <ul>
            ${(state.rpHistory || []).slice(-5).reverse().map(entry => `
              <li>
                <span class="hist-date">${entry.date}</span>
                <span class="hist-reason">${escapeHTML(entry.reason)}</span>
                <strong class="hist-rp">${entry.rp} RP</strong>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;

  drawProductivityGauge('productivity-gauge-canvas', scoreData.totalScore);
  drawRPTrendCanvas('rp-trend-canvas', state.rpHistory || []);
}

function drawProductivityGauge(canvasId, score) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 72;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Lingkaran dasar
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0.75 * Math.PI, 2.25 * Math.PI, false);
  ctx.strokeStyle = '#E5D9C5';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Busur nilai skor
  const endAngle = 0.75 * Math.PI + (Math.max(0, Math.min(100, score)) / 100) * (1.5 * Math.PI);
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#E8A5B5');
  grad.addColorStop(0.5, '#D49A3D');
  grad.addColorStop(1, '#5C9EAD');

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0.75 * Math.PI, endAngle, false);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawRPTrendCanvas(canvasId, rpHistory) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const points = rpHistory.slice(-10);
  if (points.length === 0) return;

  const padL = 38;
  const padR = 20;
  const padT = 20;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxRP = Math.max(50, ...points.map(p => p.rp));

  // Garis bantu horizontal
  ctx.strokeStyle = '#E5D9C5';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 2; i++) {
    const y = padT + (i / 2) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();

    const val = Math.round(maxRP * (1 - i / 2));
    ctx.fillStyle = '#7A6855';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${val}`, 6, y + 4);
  }

  // Plot titik & garis
  const coords = points.map((pt, idx) => {
    const x = points.length === 1
      ? padL + plotW / 2
      : padL + (idx / (points.length - 1)) * plotW;
    const y = padT + plotH - (pt.rp / maxRP) * plotH;
    return { x, y, rp: pt.rp, date: pt.date };
  });

  if (coords.length > 1) {
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.strokeStyle = '#C85A7C';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  coords.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#26364A';
    ctx.fill();
    ctx.strokeStyle = '#FFE08A';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

