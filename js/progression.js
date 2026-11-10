/**
 * DAYLOOM — Sistem Progresi RPG, Peringkat (Rank), RP, Validasi Checklist & Skor Produktivitas
 */

import { RANKS, RP_PER_QUEST, ACHIEVEMENTS_CONFIG } from './config.js';
import { getRelativeDateStr } from './storage.js';

/**
 * Menentukan peringkat saat ini berdasarkan total RP
 */
export function getCurrentRank(rp = 0) {
  const safeRP = Math.max(0, Number(rp) || 0);
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (safeRP >= RANKS[i].minRP) {
      return { ...RANKS[i], index: i };
    }
  }
  return { ...RANKS[0], index: 0 };
}

/**
 * Menghitung progres menuju peringkat berikutnya
 */
export function getRankProgress(rp = 0) {
  const current = getCurrentRank(rp);
  const nextRank = RANKS[current.index + 1] || null;

  if (!nextRank) {
    return {
      currentRank: current,
      nextRank: null,
      rpInTier: rp - current.minRP,
      rpNeededForNext: 0,
      percent: 100,
      isMaxRank: true
    };
  }

  const tierSpan = nextRank.minRP - current.minRP;
  const rpInTier = Math.max(0, rp - current.minRP);
  const rpRemaining = Math.max(0, nextRank.minRP - rp);
  const percent = Math.min(100, Math.round((rpInTier / tierSpan) * 100));

  return {
    currentRank: current,
    nextRank,
    rpInTier,
    rpRemaining,
    tierSpan,
    percent,
    isMaxRank: false
  };
}

/**
 * Validasi wajib sebelum misi dapat ditandai selesai:
 * Sebuah misi TIDAK DAPAT diselesaikan selama masih ada butir daftar periksa (checklist) yang belum dicentang.
 */
export function validateTaskCompletion(task) {
  if (!task) {
    return {
      valid: false,
      incompleteCount: 0,
      message: 'Data misi tidak ditemukan.'
    };
  }

  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  if (checklist.length === 0) {
    return {
      valid: true,
      incompleteCount: 0,
      message: 'Misi siap diselesaikan.'
    };
  }

  const incompleteItems = checklist.filter(item => !item.completed);
  if (incompleteItems.length > 0) {
    return {
      valid: false,
      incompleteCount: incompleteItems.length,
      incompleteItems,
      message: `Misi "${task.title}" belum dapat diselesaikan! Masih ada ${incompleteItems.length} syarat daftar periksa wajib yang belum dituntaskan.`
    };
  }

  return {
    valid: true,
    incompleteCount: 0,
    message: 'Seluruh daftar periksa telah tuntas!'
  };
}

/**
 * Memberikan +10 RP untuk misi yang selesai penuh.
 * - Hanya diberikan satu kali per ID misi (buku besar anti-duplikat).
 * - Mencatat riwayat RP dan mendeteksi kenaikan peringkat (Rank Up).
 */
export function awardRPForTask(state, task) {
  if (!state || !task || task.status !== 'selesai') {
    return { awarded: false, rpGained: 0, rankedUp: false, newRank: null };
  }

  // Cek buku besar anti-duplikat
  if (state.rewardedTaskIds.includes(task.id)) {
    return {
      awarded: false,
      rpGained: 0,
      rankedUp: false,
      newRank: null,
      reason: 'RP untuk misi ini sudah pernah diklaim sebelumnya.'
    };
  }

  const prevRank = getCurrentRank(state.rp);
  state.rewardedTaskIds.push(task.id);
  state.rp += RP_PER_QUEST;

  const today = getRelativeDateStr(0);
  state.rpHistory.push({
    date: today,
    rp: state.rp,
    delta: RP_PER_QUEST,
    taskId: task.id,
    reason: `Menuntaskan misi: ${task.title}`
  });

  const newRank = getCurrentRank(state.rp);
  const rankedUp = newRank.index > prevRank.index;

  if (rankedUp) {
    state.rankHistory.push({
      rankId: newRank.id,
      rankName: newRank.name,
      reachedAt: new Date().toISOString(),
      rpAtTime: state.rp
    });
    state.profile.title = newRank.title;
  }

  return {
    awarded: true,
    rpGained: RP_PER_QUEST,
    rankedUp,
    prevRank,
    newRank
  };
}

/**
 * Peringkat tertinggi yang PERNAH dicapai pemain.
 * Diturunkan dari data nyata: peringkat saat ini (dari RP) dan riwayat peringkat (rankHistory).
 * Tidak memerlukan kunci penyimpanan baru, sehingga kompatibel dengan data lama.
 */
export function getHighestRank(state) {
  const current = getCurrentRank(state?.rp || 0);
  let bestIndex = current.index;
  const history = Array.isArray(state?.rankHistory) ? state.rankHistory : [];
  history.forEach(entry => {
    const idx = RANKS.findIndex(r => r.id === entry?.rankId);
    if (idx > bestIndex) bestIndex = idx;
  });
  return { ...RANKS[bestIndex], index: bestIndex };
}

/** Indeks peringkat Mythic dalam urutan resmi (Epic=0, Legend=1, Mythic=2, ...). */
export const MYTHIC_RANK_INDEX = RANKS.findIndex(r => r.id === 'mythic');

/**
 * Lambang Mythic hanya diberikan bila pemain benar-benar pernah mencapai Mythic atau lebih tinggi.
 */
export function hasMythicEmblem(state) {
  return getHighestRank(state).index >= MYTHIC_RANK_INDEX;
}

/**
 * Memvalidasi daftar pencapaian pilihan: hanya pencapaian yang terbuka, unik, maksimal 3.
 */
export function getFeaturedAchievementIds(state) {
  const unlocked = Array.isArray(state?.unlockedAchievements) ? state.unlockedAchievements : [];
  const chosen = Array.isArray(state?.profile?.featuredAchievements) ? state.profile.featuredAchievements : [];
  return [...new Set(chosen)].filter(id => unlocked.includes(id)).slice(0, 3);
}

/**
 * Memeriksa apakah sebuah misi terlambat (overdue)
 */
export function isTaskOverdue(task, referenceDateStr = null) {
  if (!task || task.status === 'selesai') return false;
  const today = referenceDateStr || getRelativeDateStr(0);
  return Boolean(task.deadline && task.deadline < today);
}

/**
 * Menghitung Skor Produktivitas (0 - 100) yang TERPISAH dari RP.
 * Komposisi Bobot Resmi:
 * - 40% Penyelesaian tugas tepat waktu (On-Time Task Completion)
 * - 40% Penyelesaian tugas keseluruhan (Overall Task Completion)
 * - 20% Kinerja tugas tidak terlambat / manajemen tenggat (Overdue-Task Performance)
 */
export function calculateProductivityScore(tasks = [], referenceDateStr = null) {
  const today = referenceDateStr || getRelativeDateStr(0);
  const totalTasks = Array.isArray(tasks) ? tasks.length : 0;

  if (totalTasks === 0) {
    return {
      totalScore: 0,
      onTimeComponent: 0,
      overallComponent: 0,
      overdueComponent: 0,
      onTimeRate: 0,
      completionRate: 0,
      overdueRate: 0,
      totalTasks: 0,
      completedCount: 0,
      onTimeCount: 0,
      overdueActiveCount: 0,
      gradeLabel: 'Belum Ada Catatan',
      explanation: 'Tambahkan dan selesaikan misi pertamamu untuk mulai menenun Skor Produktivitas.'
    };
  }

  const completedTasks = tasks.filter(t => t.status === 'selesai');
  const completedCount = completedTasks.length;

  // Tugas selesai tepat waktu: completedOnTime === true (atau jika completedAt <= deadline)
  const onTimeTasks = completedTasks.filter(t => {
    if (typeof t.completedOnTime === 'boolean') return t.completedOnTime;
    if (t.completedAt && t.deadline) {
      return t.completedAt.slice(0, 10) <= t.deadline;
    }
    return true;
  });
  const onTimeCount = onTimeTasks.length;

  // Tugas aktif yang melewati batas tenggat (Overdue)
  const overdueActiveCount = tasks.filter(t => isTaskOverdue(t, today)).length;
  // Tugas yang selesai terlambat juga mengurangi ketepatan tenggat
  const lateCompletedCount = completedCount - onTimeCount;

  // 1. Komponen Penyelesaian Keseluruhan (40%)
  const completionRatio = completedCount / totalTasks;
  const overallComponent = completionRatio * 40;

  // 2. Komponen Ketepatan Waktu (40%)
  // Jika sudah ada tugas yang selesai, ukur rasio tepat waktu dari tugas selesai;
  // jika belum ada tugas selesai sama sekali, komponen on-time adalah 0.
  const onTimeRatio = completedCount > 0 ? (onTimeCount / completedCount) : 0;
  const onTimeComponent = onTimeRatio * 40;

  // 3. Komponen Pengendalian Keterlambatan (20%)
  // Proporsi tugas yang bebas dari keterlambatan aktif
  const nonOverdueRatio = Math.max(0, (totalTasks - overdueActiveCount) / totalTasks);
  const overdueComponent = nonOverdueRatio * 20;

  const rawTotal = overallComponent + onTimeComponent + overdueComponent;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  let gradeLabel = 'Perlu Perhatian';
  if (totalScore >= 85) gradeLabel = 'Sangat Harmonis (Sempurna)';
  else if (totalScore >= 70) gradeLabel = 'Tangguh & Konsisten';
  else if (totalScore >= 50) gradeLabel = 'Sedang Berkembang';
  else if (totalScore > 0) gradeLabel = 'Awal Penenunan';

  const explanation = `Skor ${totalScore}/100 dihitung murni dari kinerja tugas (terpisah dari RP): ` +
    `${Math.round(onTimeComponent)}/40 poin dari ketepatan waktu (${onTimeCount}/${completedCount || 0} misi tuntas tepat waktu), ` +
    `${Math.round(overallComponent)}/40 poin dari penyelesaian total (${completedCount}/${totalTasks} misi selesai), dan ` +
    `${Math.round(overdueComponent)}/20 poin dari pengendalian keterlambatan (${overdueActiveCount} misi aktif terlambat, ${lateCompletedCount} selesai terlambat).`;

  return {
    totalScore,
    onTimeComponent: Math.round(onTimeComponent * 10) / 10,
    overallComponent: Math.round(overallComponent * 10) / 10,
    overdueComponent: Math.round(overdueComponent * 10) / 10,
    onTimeRate: Math.round(onTimeRatio * 100),
    completionRate: Math.round(completionRatio * 100),
    overdueRate: Math.round((overdueActiveCount / totalTasks) * 100),
    totalTasks,
    completedCount,
    onTimeCount,
    overdueActiveCount,
    gradeLabel,
    explanation
  };
}

/**
 * Evaluasi seluruh kondisi pembukaan pencapaian (Achievements)
 * Mengembalikan daftar pencapaian yang BARU saja terbuka pada evaluasi ini.
 */
export function evaluateAchievements(state) {
  if (!state) return [];
  const newlyUnlocked = [];
  const completedTasks = state.tasks.filter(t => t.status === 'selesai');
  const onTimeTasks = completedTasks.filter(t => t.completedOnTime !== false);
  const uniqueCategories = new Set(completedTasks.map(t => t.category));
  const has3ChecklistCompleted = completedTasks.some(t => Array.isArray(t.checklist) && t.checklist.length >= 3);
  const prodScore = calculateProductivityScore(state.tasks).totalScore;

  const checks = {
    first_thread: completedTasks.length >= 1,
    checklist_master: has3ChecklistCompleted,
    deadline_guardian: onTimeTasks.length >= 3,
    balanced_weaver: uniqueCategories.size >= 3,
    rank_riser: state.rp >= 50,
    arena_victor: (state.arenaStats?.wins || 0) >= 1,
    world_explorer: Array.isArray(state.visitedLocations) && state.visitedLocations.length >= 4,
    quest_champion: completedTasks.length >= 10 && prodScore >= 75
  };

  ACHIEVEMENTS_CONFIG.forEach(ach => {
    if (checks[ach.id] && !state.unlockedAchievements.includes(ach.id)) {
      state.unlockedAchievements.push(ach.id);
      newlyUnlocked.push(ach);
    }
  });

  return newlyUnlocked;
}

/**
 * Memberikan +20 RP untuk kemenangan Local 1v1 PvP Arena.
 * - Hanya diberikan satu kali per Match ID unik (buku besar anti-duplikat).
 * - Pemain kalah mendapatkan 0 RP.
 * - Tidak mencampuradukkan RP dengan Productivity Score.
 * - Memperbarui riwayat peringkat jika terjadi kenaikan Rank.
 */
export function awardRPForPvPWin(state, matchId, details = {}) {
  if (!state || !matchId) {
    return { awarded: false, rpGained: 0, rankedUp: false, newRank: null };
  }

  state.rewardedPvPMatchIds = Array.isArray(state.rewardedPvPMatchIds) ? state.rewardedPvPMatchIds : [];
  if (state.rewardedPvPMatchIds.includes(matchId)) {
    return {
      awarded: false,
      rpGained: 0,
      rankedUp: false,
      newRank: null,
      reason: 'RP untuk pertandingan PvP ini sudah pernah diklaim sebelumnya.'
    };
  }

  const RP_PVP_WIN = 20;
  const prevRank = getCurrentRank(state.rp);
  state.rewardedPvPMatchIds.push(matchId);
  state.rp = (Number(state.rp) || 0) + RP_PVP_WIN;

  state.arenaStats = state.arenaStats || { wins: 0, totalSessions: 0, bestCombo: 0, totalFocusMinutes: 0 };
  state.arenaStats.wins = (state.arenaStats.wins || 0) + 1;
  state.arenaStats.totalSessions = (state.arenaStats.totalSessions || 0) + 1;

  const today = getRelativeDateStr(0);
  state.rpHistory = Array.isArray(state.rpHistory) ? state.rpHistory : [];
  state.rpHistory.push({
    date: today,
    rp: state.rp,
    delta: RP_PVP_WIN,
    matchId: matchId,
    reason: details.reason || 'Kemenangan Local 1v1 PvP Arena'
  });

  const newRank = getCurrentRank(state.rp);
  const rankedUp = newRank.index > prevRank.index;

  if (rankedUp) {
    state.rankHistory = Array.isArray(state.rankHistory) ? state.rankHistory : [];
    state.rankHistory.push({
      rankId: newRank.id,
      rankName: newRank.name,
      reachedAt: new Date().toISOString(),
      rpAtTime: state.rp
    });
    if (state.profile) {
      state.profile.title = newRank.title;
    }
  }

  return {
    awarded: true,
    rpGained: RP_PVP_WIN,
    rankedUp,
    prevRank,
    newRank
  };
}

