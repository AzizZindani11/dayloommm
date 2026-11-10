/**
 * DAYLOOM — Pengendali Aplikasi Utama (Main Application Controller)
 * Mengintegrasikan Dunia Paralaks, Papan Misi (CRUD + Validasi Checklist),
 * Profil Petualang (6 Peringkat Resmi), Pencapaian, Statistik, Arena, dan Cadangan Data.
 */

import {
  RANKS,
  CATEGORIES,
  PRIORITIES,
  CHARACTER_OUTFITS,
  CHARACTER_HATS,
  ACHIEVEMENTS_CONFIG
} from './config.js';
import {
  loadState,
  saveState,
  validateAndSanitizeState,
  mapCloudDataToState,
  exportBackupJSON,
  importBackupJSON,
  createDefaultState,
  getRelativeDateStr,
  isValidEmail,
  formatAuthErrorMessage
} from './storage.js';
import {
  getCurrentRank,
  getRankProgress,
  validateTaskCompletion,
  awardRPForTask,
  isTaskOverdue,
  calculateProductivityScore,
  evaluateAchievements,
  getHighestRank,
  hasMythicEmblem,
  getFeaturedAchievementIds,
  MYTHIC_RANK_INDEX
} from './progression.js';
import {
  getRankEmblemSVG,
  getCharacterSVG,
  getMeliodasSVG,
  getMeliodasPortraitSVG,
  getAchievementSVG,
  getIconSVG
} from './art.js';
import { ParallaxWorld } from './world.js';
import { GlobalAtmosphereController } from './atmosphere.js';
import { renderStatisticsView } from './stats.js';
import { ArenaController } from './arena.js';
import { sound } from './audio.js';
import {
  isSupabaseConfigured,
  signUp,
  signIn,
  signOut,
  getSession,
  onAuthStateChange,
  fetchProfile,
  fetchTasksWithChecklists,
  fetchRankHistory,
  recordRankHistory,
  createTask,
  updateTask,
  syncTaskChecklists,
  toggleChecklist,
  deleteTask as deleteCloudTask,
  claimTaskRP,
  updateProfile
} from './supabase-client.js';

class DayloomApp {
  constructor() {
    this.state = loadState();
    this.activeView = 'world';
    this.questFilterTime = 'all'; // all | today | upcoming | overdue | completed
    this.questFilterCategory = 'all';
    this.questFilterPriority = 'all';
    this.questSearchQuery = '';
    this.editingTaskId = null;
    this.draftChecklist = [];

    // Autentikasi Supabase Cloud (Stage 3 & 4)
    this.currentUser = null;
    this.currentSession = null;
    this.authMode = 'login'; // 'login' | 'register'
    this.authSubscription = null;
    this.isLoadingCloudData = false;
    this.loadedCloudUserId = null;
    this.loadingCloudUserId = null;
    this.cloudLoadRequestId = 0;

    // Timer Meditasi Kuil Tenun Waktu
    this.meditation = {
      active: false,
      secondsLeft: 300,
      intervalId: null
    };

    this.atmosphere = null;
    this.world = null;
    this.arena = null;
  }

  init() {
    const initialMode = this.state.profile.timeOfDay || 'pagi';
    this.atmosphere = new GlobalAtmosphereController();
    this.atmosphere.init(initialMode, this.activeView);

    this.applyTimeOfDayTheme(initialMode);
    this.bindNavigation();
    this.bindTopBarControls();
    this.bindQuestModalEvents();
    this.bindShrineModalEvents();
    this.bindAuthModalEvents();
    this.bindBackupControls();
    this.initAuthSession();

    this.world = new ParallaxWorld({
      getState: () => this.state,
      onInteractLocation: (loc) => this.handleVillageInteraction(loc),
      onCollectPetal: (count) => this.handleCollectSpiritPetal(count)
    });
    this.world.init();

    this.arena = new ArenaController({
      getState: () => this.state,
      onSaveState: () => this.persistAndRefresh(),
      onNotify: (msg, type = 'info') => this.showToast(msg, type)
    });
    this.arena.init();

    this.refreshAllUI();
  }

  /**
   * Menyimpan state aktif berdasarkan mode:
   * - Mode Tamu: Disimpan ke LocalStorage dengan key 'dayloom_save_v1'.
   * - Mode Akun Cloud: JANGAN PERNAH menyimpan ke 'dayloom_save_v1'.
   *   Data tamu di LocalStorage tetap utuh dan tidak ditimpa.
   */
  saveActiveState() {
    if (this.currentUser) {
      if (typeof localStorage !== 'undefined' && this.currentUser.id) {
        try {
          const cloudKey = `dayloom_user_${this.currentUser.id}`;
          const cleanCloud = validateAndSanitizeState(this.state, { isCloud: true, cloudUserId: this.currentUser.id });
          localStorage.setItem(cloudKey, JSON.stringify(cleanCloud));
        } catch (e) {
          console.warn('Dayloom: Gagal menyimpan cache sesi awan:', e);
        }
      }
      return true;
    }

    return saveState(this.state);
  }

  /**
   * Beralih ke State Akun Cloud saat pengguna masuk/terotentikasi.
   * Menjaga data tamu 'dayloom_save_v1' tetap utuh tanpa disentuh.
   */
  switchToCloudState(user) {
    if (!user) return;

    let userState = null;
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(`dayloom_user_${user.id}`);
        if (raw) {
          userState = validateAndSanitizeState(JSON.parse(raw), { isCloud: true, cloudUserId: user.id });
        }
      } catch (e) {
        console.warn('Dayloom: Gagal membaca cache akun awan:', e);
      }
    }

    if (!userState) {
      const displayName = user.user_metadata?.name || user.user_metadata?.username || (user.email ? user.email.split('@')[0] : 'Pengembara Hanamori');
      userState = createDefaultState();
      userState.isCloud = true;
      userState.cloudUserId = user.id;
      userState.profile.name = displayName;
      userState.rp = 0;
      userState.rewardedTaskIds = [];
      userState.rewardedPvPMatchIds = [];
      userState.tasks = []; // Akun baru mulai bersih (tidak menyalin misi milik tamu)
    }

    userState.isCloud = true;
    userState.cloudUserId = user.id;
    this.state = userState;
    this.refreshAllUI();
  }

  /**
   * Beralih kembali ke State Mode Tamu saat pengguna keluar (logout).
   * Memulihkan kembali data asli dari 'dayloom_save_v1' secara utuh.
   */
  switchToGuestState() {
    this.cloudLoadRequestId++;
    this.state = loadState();
    this.applyTimeOfDayTheme(this.state.profile?.timeOfDay || 'pagi');
    this.refreshAllUI();
  }

  /**
   * Mengambil data profil dan daftar misi milik akun pengguna dari Supabase,
   * lalu memetakannya ke struktur state frontend Dayloom.
   * Dilengkapi Cancellation Guard untuk mencegah race condition saat pergantian akun cepat.
   */
  async loadCloudUserData(userId) {
    if (!userId) return;
    const currentRequestId = ++this.cloudLoadRequestId;
    this.isLoadingCloudData = true;
    this.loadingCloudUserId = userId;

    // Bersihkan tampilan agar data akun sebelumnya tidak terlihat saat memuat
    const initialName = this.currentUser?.user_metadata?.name ||
      this.currentUser?.user_metadata?.username ||
      (this.currentUser?.email ? this.currentUser.email.split('@')[0] : 'Pengembara');

    const loadingState = createDefaultState();
    loadingState.isCloud = true;
    loadingState.cloudUserId = userId;
    loadingState.profile.name = initialName;
    loadingState.tasks = []; // Kosongkan daftar misi agar tidak bocor data lama/tamu
    this.state = loadingState;
    this.refreshAllUI();

    try {
      const [profileData, tasksData, rankHistoryData] = await Promise.all([
        fetchProfile(userId),
        fetchTasksWithChecklists(userId),
        fetchRankHistory(userId)
      ]);

      // CANCELLATION GUARD: Jika request ID telah usang atau user telah berganti, buang hasil ini!
      if (currentRequestId !== this.cloudLoadRequestId || !this.currentUser || this.currentUser.id !== userId) {
        console.warn(`Dayloom: Request pemuatan cloud #${currentRequestId} dibatalkan karena sesi telah berganti.`);
        return;
      }

      const mappedState = mapCloudDataToState(profileData, tasksData, this.currentUser, rankHistoryData);

      // Hitung pencapaian yang terbuka berdasarkan kondisi nyata misi & RP cloud
      mappedState.unlockedAchievements = evaluateAchievements(mappedState).map(a => a.id);

      // Verifikasi ulang guard sebelum menulis ke state aktif
      if (currentRequestId !== this.cloudLoadRequestId || !this.currentUser || this.currentUser.id !== userId) {
        return;
      }

      this.state = mappedState;
      this.loadedCloudUserId = userId;

      // Sinkronkan tema waktu jika ada di profil awan
      if (mappedState.profile.timeOfDay) {
        this.applyTimeOfDayTheme(mappedState.profile.timeOfDay);
      }

      // Simpan ke cache user lokal (TIDAK menyentuh dayloom_save_v1)
      this.saveActiveState();
      this.refreshAllUI();
      this.showToast(`Data pengembara "${mappedState.profile.name}" berhasil dimuat dari awan!`, 'success');
    } catch (err) {
      if (currentRequestId !== this.cloudLoadRequestId || !this.currentUser || this.currentUser.id !== userId) {
        return;
      }
      console.error('Dayloom: Gagal memuat data awan:', err);
      this.showToast('Gagal memuat data dari awan Supabase. Periksa koneksi internet Anda.', 'warning');

      // Coba pulihkan dari cache user lokal jika ada
      let restoredFromCache = false;
      if (typeof localStorage !== 'undefined') {
        try {
          const cached = localStorage.getItem(`dayloom_user_${userId}`);
          if (cached) {
            this.state = validateAndSanitizeState(JSON.parse(cached), { isCloud: true, cloudUserId: userId });
            restoredFromCache = true;
            this.refreshAllUI();
            this.showToast('Memuat data tersimpan dari sesi sebelumnya (mode luring).', 'info');
          }
        } catch (_) {}
      }

      if (!restoredFromCache) {
        // Fallback state awan bersih
        this.switchToCloudState(this.currentUser);
      }
    } finally {
      if (currentRequestId === this.cloudLoadRequestId) {
        this.isLoadingCloudData = false;
        this.loadingCloudUserId = null;
      }
    }
  }

  persistAndRefresh() {
    const newAchievements = evaluateAchievements(this.state);
    // Pencapaian yang baru terbuka otomatis mengisi slot "Lencana Pilihan" yang masih kosong (maks. 3).
    if (newAchievements.length > 0) {
      const featured = getFeaturedAchievementIds(this.state);
      newAchievements.forEach(ach => {
        if (featured.length < 3 && !featured.includes(ach.id)) featured.push(ach.id);
      });
      this.state.profile.featuredAchievements = featured;
    }
    this.saveActiveState();
    this.refreshAllUI();

    if (newAchievements.length > 0) {
      sound.playAchievement();
      newAchievements.forEach(ach => {
        this.showToast(`Pencapaian Terbuka: "${ach.title}" — ${ach.rewardText}`, 'achievement');
      });
    }
  }

  refreshAllUI() {
    this.renderTopStatusHUD();
    this.renderWorldQuickQuests();
    this.renderQuestBoard();
    this.renderProfileView();
    this.renderRankView();
    this.renderAchievementsView();
    renderStatisticsView(this.state);
    if (this.arena && !this.arena.battle.active) {
      this.arena.render();
    }
    if (this.world) {
      this.world.renderCharacterAvatar();
    }
  }

  /* =========================================================================
   * NAVIGASI & BAR ATAS
   * ========================================================================= */
  bindNavigation() {
    document.querySelectorAll('[data-nav-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav-view');
        sound.playClick();
        this.switchView(target);
      });
    });
  }

  switchView(viewName) {
    this.activeView = viewName;
    document.body.setAttribute('data-active-view', viewName);
    if (this.atmosphere) {
      this.atmosphere.setActiveView(viewName);
    }

    document.querySelectorAll('[data-nav-view]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-nav-view') === viewName);
    });

    document.querySelectorAll('.app-view-section').forEach(sec => {
      sec.classList.toggle('hidden', sec.id !== `view-${viewName}`);
    });

    if (viewName === 'stats') {
      renderStatisticsView(this.state);
    } else if (viewName === 'arena') {
      this.arena.render();
    } else if (viewName === 'world' && this.world) {
      this.world.resizeCanvas();
    }
  }

  bindTopBarControls() {
    // Tombol Suara
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (soundBtn) {
      this.updateSoundButtonUI(soundBtn);
      soundBtn.addEventListener('click', () => {
        sound.toggle();
        this.updateSoundButtonUI(soundBtn);
      });
    }

    // Pemilih Suasana Waktu (Pagi, Senja, Malam)
    document.querySelectorAll('[data-time-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-time-mode');
        sound.playClick();
        this.applyTimeOfDayTheme(mode);
        this.state.profile.timeOfDay = mode;
        this.saveActiveState();
        if (this.currentUser) {
          updateProfile(this.currentUser.id, { time_of_day: mode }).catch(err => {
            console.warn('Dayloom: Gagal menyinkronkan tema waktu ke awan:', err);
          });
        }
      });
    });

    // Tombol Cepat Buat Misi Baru dari mana saja
    document.querySelectorAll('.js-open-new-quest').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.openQuestModal();
      });
    });

    // Klik pada HUD status atas mengarahkan ke Profil atau Peringkat
    document.getElementById('hud-rank-emblem')?.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playClick();
      this.switchView('rank');
    });
    document.querySelector('.hud-progress-info')?.addEventListener('click', () => {
      sound.playClick();
      this.switchView('profile');
    });
  }

  updateSoundButtonUI(btn) {
    const isOn = sound.enabled;
    btn.innerHTML = `${getIconSVG(isOn ? 'volumeOn' : 'volumeOff', 18)} <span>${isOn ? 'Suara Aktif' : 'Suara Senyap'}</span>`;
    btn.classList.toggle('is-muted', !isOn);
  }

  applyTimeOfDayTheme(mode) {
    document.body.setAttribute('data-time-of-day', mode);
    if (this.atmosphere) {
      this.atmosphere.setTimeMode(mode);
    }
    document.querySelectorAll('[data-time-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-time-mode') === mode);
    });
  }

  renderTopStatusHUD() {
    const rankProg = getRankProgress(this.state.rp);
    const prodScore = calculateProductivityScore(this.state.tasks);

    const emblemEl = document.getElementById('hud-rank-emblem');
    const nameEl = document.getElementById('hud-adventurer-name');
    const rankTitleEl = document.getElementById('hud-rank-title');
    const rpTextEl = document.getElementById('hud-rp-text');
    const rpBarEl = document.getElementById('hud-rp-bar-fill');
    const scorePillEl = document.getElementById('hud-prod-score');

    if (emblemEl) emblemEl.innerHTML = getRankEmblemSVG(rankProg.currentRank.id, 42);
    if (nameEl) nameEl.textContent = this.state.profile.name;
    if (rankTitleEl) rankTitleEl.textContent = `${rankProg.currentRank.name} • ${rankProg.currentRank.title}`;
    if (rpTextEl) {
      rpTextEl.textContent = rankProg.isMaxRank
        ? `${this.state.rp} RP (Puncak Abadi)`
        : `${this.state.rp} RP (${rankProg.rpRemaining} RP menuju ${rankProg.nextRank.name})`;
    }
    if (rpBarEl) rpBarEl.style.width = `${rankProg.percent}%`;
    if (scorePillEl) scorePillEl.textContent = `${prodScore.totalScore}/100`;
  }

  /* =========================================================================
   * INTERAKSI DUNIA DESA HANAMORI
   * ========================================================================= */
  handleVillageInteraction(loc) {
    if (!this.state.visitedLocations.includes(loc.id)) {
      this.state.visitedLocations.push(loc.id);
      this.persistAndRefresh();
      if (this.currentUser) {
        updateProfile(this.currentUser.id, {
          visited_locations: this.state.visitedLocations
        }).catch(err => {
          console.warn('Dayloom: Gagal menyinkronkan lokasi kunjungan ke awan:', err);
        });
      }
    }

    if (loc.actionType === 'navigate_quests') {
      this.switchView('quests');
    } else if (loc.actionType === 'navigate_achievements') {
      this.switchView('achievements');
    } else if (loc.actionType === 'navigate_arena') {
      this.switchView('arena');
    } else if (loc.actionType === 'focus_timer') {
      this.openShrineMeditationModal();
    }
  }

  handleCollectSpiritPetal(count) {
    this.showToast(`Kelopak Takdir berhasil ditangkap di jalur desa! (Koleksi sesi ini: ${count})`, 'info');
  }

  renderWorldQuickQuests() {
    const listEl = document.getElementById('world-active-quests-preview');
    if (!listEl) return;

    const today = getRelativeDateStr(0);
    const active = this.state.tasks.filter(t => t.status !== 'selesai').slice(0, 3);

    if (active.length === 0) {
      listEl.innerHTML = `
        <div class="empty-mini-state">
          <p>Seluruh benang tanggung jawab hari ini telah ditenun dengan indah!</p>
          <button type="button" class="btn-pixel btn-primary js-inline-new-quest">+ Pintal Misi Baru</button>
        </div>
      `;
      listEl.querySelector('.js-inline-new-quest')?.addEventListener('click', () => this.openQuestModal());
      return;
    }

    listEl.innerHTML = active.map(task => {
      const overdue = isTaskOverdue(task, today);
      const totalChk = task.checklist.length;
      const doneChk = task.checklist.filter(c => c.completed).length;

      return `
        <div class="world-quest-mini-card ${overdue ? 'is-overdue' : ''}">
          <div class="mini-card-main">
            <span class="mini-cat-badge cat-${task.category}">${this.getCategoryLabel(task.category)}</span>
            <h4>${escapeHTML(task.title)}</h4>
            <small>Tenggat: ${task.deadline} ${overdue ? '• <strong>Terlambat!</strong>' : ''} ${totalChk > 0 ? `• Checklist: ${doneChk}/${totalChk}` : ''}</small>
          </div>
          <button type="button" class="btn-pixel btn-secondary btn-sm" data-goto-quest="${task.id}">Detail</button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-goto-quest]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.switchView('quests');
      });
    });
  }

  /* =========================================================================
   * PAPAN MISI INTI (CORE QUEST TRACKER + CHECKLIST VALIDATION)
   * ========================================================================= */
  renderQuestBoard() {
    const listContainer = document.getElementById('quest-cards-container');
    const summaryCounters = document.getElementById('quest-filter-counters');
    if (!listContainer) return;

    const today = getRelativeDateStr(0);
    const allTasks = this.state.tasks || [];

    const countToday = allTasks.filter(t => t.status !== 'selesai' && t.deadline === today).length;
    const countUpcoming = allTasks.filter(t => t.status !== 'selesai' && t.deadline > today).length;
    const countOverdue = allTasks.filter(t => isTaskOverdue(t, today)).length;
    const countCompleted = allTasks.filter(t => t.status === 'selesai').length;

    if (summaryCounters) {
      summaryCounters.innerHTML = `
        <button type="button" class="filter-tab-btn ${this.questFilterTime === 'all' ? 'active' : ''}" data-qfilter="all">
          Semua Misi <span>${allTasks.length}</span>
        </button>
        <button type="button" class="filter-tab-btn ${this.questFilterTime === 'today' ? 'active' : ''}" data-qfilter="today">
          Misi Hari Ini <span>${countToday}</span>
        </button>
        <button type="button" class="filter-tab-btn ${this.questFilterTime === 'upcoming' ? 'active' : ''}" data-qfilter="upcoming">
          Mendatang <span>${countUpcoming}</span>
        </button>
        <button type="button" class="filter-tab-btn ${this.questFilterTime === 'overdue' ? 'active' : ''} ${countOverdue > 0 ? 'has-warning' : ''}" data-qfilter="overdue">
          Terlambat <span>${countOverdue}</span>
        </button>
        <button type="button" class="filter-tab-btn ${this.questFilterTime === 'completed' ? 'active' : ''}" data-qfilter="completed">
          Selesai <span>${countCompleted}</span>
        </button>
      `;

      summaryCounters.querySelectorAll('[data-qfilter]').forEach(btn => {
        btn.addEventListener('click', () => {
          sound.playClick();
          this.questFilterTime = btn.getAttribute('data-qfilter');
          this.renderQuestBoard();
        });
      });
    }

    // Terapkan filter
    const filtered = allTasks.filter(task => {
      if (this.questFilterTime === 'today' && (task.status === 'selesai' || task.deadline !== today)) return false;
      if (this.questFilterTime === 'upcoming' && (task.status === 'selesai' || task.deadline <= today)) return false;
      if (this.questFilterTime === 'overdue' && !isTaskOverdue(task, today)) return false;
      if (this.questFilterTime === 'completed' && task.status !== 'selesai') return false;

      if (this.questFilterCategory !== 'all' && task.category !== this.questFilterCategory) return false;
      if (this.questFilterPriority !== 'all' && task.priority !== this.questFilterPriority) return false;

      if (this.questSearchQuery) {
        const q = this.questSearchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="rpg-panel quest-empty-state">
          <h3>Tidak Ada Gulungan Misi yang Cocok</h3>
          <p>Belum ada misi pada filter ini, atau seluruh tanggung jawabmu telah ditenun dengan tuntas.</p>
          <button type="button" class="btn-pixel btn-primary" id="btn-empty-create-quest">+ Buat Misi Baru</button>
        </div>
      `;
      document.getElementById('btn-empty-create-quest')?.addEventListener('click', () => this.openQuestModal());
      return;
    }

    listContainer.innerHTML = filtered.map(task => this.renderSingleQuestCardHTML(task, today)).join('');
    this.bindQuestCardActions(listContainer);
  }

  renderSingleQuestCardHTML(task, today) {
    const overdue = isTaskOverdue(task, today);
    const isCompleted = task.status === 'selesai';
    const isRewarded = this.state.rewardedTaskIds.includes(task.id);
    const prioObj = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1];
    const catObj = CATEGORIES.find(c => c.id === task.category) || CATEGORIES[5];

    const totalChecklist = task.checklist.length;
    const completedChecklist = task.checklist.filter(c => c.completed).length;
    const allChecklistDone = totalChecklist === 0 || completedChecklist === totalChecklist;

    return `
      <article class="rpg-panel quest-card ${isCompleted ? 'quest-is-completed' : ''} ${overdue ? 'quest-is-overdue' : ''}" data-task-id="${task.id}">
        <div class="quest-card-top">
          <div class="quest-badges-row">
            <span class="quest-cat-pill" style="background:${catObj.color}22; color:${catObj.color}; border-color:${catObj.color}">
              ${getIconSVG(catObj.icon, 14)} ${catObj.label}
            </span>
            <span class="quest-prio-pill" style="background:${prioObj.badgeBg}; color:${prioObj.color}">
              Prioritas: ${prioObj.label}
            </span>
            <span class="quest-status-pill status-${task.status}">
              ${task.status === 'selesai' ? 'Tuntas' : task.status === 'berjalan' ? 'Sedang Dikerjakan' : 'Tersedia'}
            </span>
            ${overdue ? `<span class="quest-overdue-pill">Melewati Tenggat!</span>` : ''}
            ${isRewarded ? `<span class="quest-rp-pill">+10 RP Diklaim</span>` : `<span class="quest-rp-pill pending">+10 RP Menanti</span>`}
          </div>

          <div class="quest-card-actions">
            <button type="button" class="btn-icon" title="Ubah Misi" data-edit-task="${task.id}">${getIconSVG('edit', 16)}</button>
            <button type="button" class="btn-icon btn-icon-danger" title="Hapus Misi" data-delete-task="${task.id}">${getIconSVG('trash', 16)}</button>
          </div>
        </div>

        <h3 class="quest-card-title">${escapeHTML(task.title)}</h3>
        ${task.description ? `<p class="quest-card-desc">${escapeHTML(task.description)}</p>` : ''}

        <!-- Daftar Periksa Wajib (Checklist) -->
        ${totalChecklist > 0 ? `
          <div class="quest-checklist-box">
            <div class="checklist-header">
              <span>Daftar Periksa Wajib (${completedChecklist}/${totalChecklist} selesai)</span>
              ${!allChecklistDone && !isCompleted ? `<small class="checklist-warning-hint">Wajib tuntas sebelum menyelesaikan misi</small>` : ''}
            </div>
            <div class="checklist-progress-bar">
              <div class="checklist-progress-fill" style="width:${Math.round((completedChecklist / totalChecklist) * 100)}%"></div>
            </div>
            <ul class="checklist-items">
              ${task.checklist.map(item => `
                <li>
                  <label class="checklist-label ${item.completed ? 'is-checked' : ''}">
                    <input type="checkbox" data-toggle-check="${item.id}" data-parent-task="${task.id}" ${item.completed ? 'checked' : ''} ${isCompleted ? 'disabled' : ''} />
                    <span class="custom-checkbox"></span>
                    <span class="chk-text">${escapeHTML(item.text)}</span>
                  </label>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="quest-card-footer">
          <div class="quest-deadline-meta">
            <span>Tenggat: <strong>${task.deadline}</strong></span>
            ${task.deadline === today && !isCompleted ? `<span class="today-tag">Hari Ini</span>` : ''}
          </div>

          <div class="quest-completion-controls">
            ${!isCompleted ? `
              <button type="button" class="btn-pixel ${allChecklistDone ? 'btn-primary' : 'btn-locked-complete'}" data-complete-task="${task.id}">
                ${getIconSVG('check', 16)} Selesaikan Misi (+10 RP)
              </button>
            ` : `
              <button type="button" class="btn-pixel btn-secondary" data-reopen-task="${task.id}">
                Buka Kembali Misi
              </button>
            `}
          </div>
        </div>
      </article>
    `;
  }

  bindQuestCardActions(container) {
    // Toggle butir checklist (Tidak memberi RP sesuai aturan!)
    container.querySelectorAll('[data-toggle-check]').forEach(chk => {
      chk.addEventListener('change', () => {
        const taskId = chk.getAttribute('data-parent-task');
        const checkId = chk.getAttribute('data-toggle-check');
        this.toggleChecklistItem(taskId, checkId, chk.checked);
      });
    });

    // Selesaikan Misi (Dengan Validasi Ketat Checklist)
    container.querySelectorAll('[data-complete-task]').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-complete-task');
        this.attemptCompleteTask(taskId);
      });
    });

    // Buka kembali misi
    container.querySelectorAll('[data-reopen-task]').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-reopen-task');
        this.reopenTask(taskId);
      });
    });

    // Edit misi
    container.querySelectorAll('[data-edit-task]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const taskId = btn.getAttribute('data-edit-task');
        this.openQuestModal(taskId);
      });
    });

    // Hapus misi
    container.querySelectorAll('[data-delete-task]').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-delete-task');
        this.deleteTask(taskId);
      });
    });
  }

  async toggleChecklistItem(taskId, checkId, checked) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const item = task.checklist.find(c => c.id === checkId);
    if (!item) return;

    const prevCompleted = item.completed;
    const prevStatus = task.status;

    item.completed = Boolean(checked);
    if (task.status === 'tersedia' && checked) {
      task.status = 'berjalan';
    }
    sound.playCheck();
    this.persistAndRefresh();

    // Jika mode akun cloud aktif dan checklist memiliki dbId
    if (this.currentUser && item.dbId) {
      try {
        await toggleChecklist(item.dbId, checked);
        if (task.status !== prevStatus && task.dbId) {
          await updateTask(task.dbId, { status: task.status });
        }
      } catch (chkErr) {
        console.warn('Dayloom: Gagal menyinkronkan status checklist ke awan:', chkErr);
        // Rollback state lokal jika request gagal
        item.completed = prevCompleted;
        task.status = prevStatus;
        this.persistAndRefresh();
        this.showToast('Gagal memperbarui checklist di awan. Periksa koneksi internet.', 'warning');
      }
    }
  }

  async attemptCompleteTask(taskId) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // 1. Validasi ketat checklist
    const validation = validateTaskCompletion(task);
    if (!validation.valid) {
      sound.playWarning();
      this.showToast(validation.message, 'warning');
      return;
    }

    // 2. Cegah klaim ganda di UI jika misi sudah selesai dan RP sudah diklaim
    if (task.status === 'selesai' && task.isRPClaimed) {
      sound.playCheck();
      this.showToast(`Misi "${task.title}" sudah tuntas dan RP telah diklaim.`, 'info');
      return;
    }

    const today = getRelativeDateStr(0);

    // MODE AKUN CLOUD: SERVER-AUTHORITATIVE VIA RPC claim_task_rp
    if (this.currentUser) {
      const completeBtn = document.querySelector(`[data-complete-task="${taskId}"]`);
      if (completeBtn) {
        completeBtn.disabled = true;
        completeBtn.dataset.originalText = completeBtn.innerHTML;
        completeBtn.textContent = 'Mengklaim RP...';
      }

      try {
        const claimResult = await claimTaskRP({
          taskId: task.dbId || null,
          localId: task.id
        });

        task.status = 'selesai';
        task.completedAt = new Date().toISOString();
        task.completedOnTime = !task.deadline || today <= task.deadline;
        task.isRPClaimed = true;

        if (!this.state.rewardedTaskIds.includes(task.id)) {
          this.state.rewardedTaskIds.push(task.id);
        }

        const prevRank = getCurrentRank(this.state.rp);

        // Ambil total RP terbaru dari respon RPC Supabase
        if (claimResult && typeof claimResult.new_total_rp === 'number') {
          this.state.rp = Math.floor(claimResult.new_total_rp);
        } else if (claimResult && typeof claimResult.total_rp === 'number') {
          this.state.rp = Math.floor(claimResult.total_rp);
        } else {
          try {
            const freshProfile = await fetchProfile(this.currentUser.id);
            if (freshProfile && typeof freshProfile.total_rp === 'number') {
              this.state.rp = Math.floor(freshProfile.total_rp);
            } else {
              this.state.rp += 10;
            }
          } catch (_) {
            this.state.rp += 10;
          }
        }

        const newRank = getCurrentRank(this.state.rp);
        const rankedUp = newRank.index > prevRank.index;

        if (rankedUp) {
          this.state.profile.title = newRank.title;
          this.state.rankHistory.push({
            rankId: newRank.id,
            rankName: newRank.name,
            reachedAt: new Date().toISOString(),
            rpAtTime: this.state.rp
          });
          // Catat ke tabel rank_history Supabase untuk sinkronisasi multi-perangkat
          recordRankHistory(this.currentUser.id, newRank, this.state.rp).catch(err => {
            console.warn('Dayloom: Gagal mencatat rank_history ke awan:', err);
          });
        }

        this.persistAndRefresh();

        if (rankedUp) {
          sound.playRankUp();
          this.openRankUpModal(newRank);
        } else {
          sound.playQuestComplete();
          this.showToast(`Misi "${task.title}" tuntas! Kau memperoleh +10 Rank Points (RP) dari Tenunan Agung!`, 'success');
        }
      } catch (claimErr) {
        sound.playWarning();
        console.error('Dayloom: Gagal mengklaim RP misi cloud:', claimErr);
        const errMsg = claimErr.message || String(claimErr);

        if (/already claimed|sudah pernah diklaim/i.test(errMsg)) {
          task.isRPClaimed = true;
          task.status = 'selesai';
          this.persistAndRefresh();
          this.showToast(`RP untuk misi "${task.title}" sudah pernah diklaim sebelumnya.`, 'info');
        } else if (/incomplete|belum selesai/i.test(errMsg)) {
          this.showToast('Seluruh daftar periksa wajib harus dicentang sebelum menyelesaikan misi!', 'warning');
        } else {
          this.showToast(`Gagal mengklaim RP misi di awan: ${errMsg}`, 'warning');
        }
      } finally {
        if (completeBtn) {
          completeBtn.disabled = false;
          completeBtn.innerHTML = completeBtn.dataset.originalText || `${getIconSVG('check', 16)} Selesaikan Misi (+10 RP)`;
        }
      }
      return;
    }

    // MODE TAMU LOKAL (BUKU BESAR LOKAL)
    task.status = 'selesai';
    task.completedAt = new Date().toISOString();
    task.completedOnTime = !task.deadline || today <= task.deadline;

    const rewardResult = awardRPForTask(this.state, task);
    this.persistAndRefresh();

    if (rewardResult.rankedUp && rewardResult.newRank) {
      sound.playRankUp();
      this.openRankUpModal(rewardResult.newRank);
    } else if (rewardResult.awarded) {
      sound.playQuestComplete();
      this.showToast(`Misi "${task.title}" tuntas! Kau memperoleh +${rewardResult.rpGained} Rank Points (RP)!`, 'success');
    } else {
      sound.playCheck();
      this.showToast(`Misi "${task.title}" ditandai selesai kembali. (RP sudah pernah diklaim sebelumnya).`, 'info');
    }
  }

  async reopenTask(taskId) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const prevStatus = task.status;
    const prevCompletedAt = task.completedAt;

    task.status = 'berjalan';
    task.completedAt = null;
    sound.playClick();
    this.persistAndRefresh();

    if (this.currentUser && task.dbId) {
      try {
        await updateTask(task.dbId, { status: 'berjalan' });
      } catch (err) {
        console.warn('Dayloom: Gagal memperbarui status buka kembali misi di awan:', err);
        task.status = prevStatus;
        task.completedAt = prevCompletedAt;
        this.persistAndRefresh();
        this.showToast('Gagal memperbarui status misi di awan.', 'warning');
        return;
      }
    }

    this.showToast(`Misi "${task.title}" dibuka kembali ke status Sedang Dikerjakan.`, 'info');
  }

  async deleteTask(taskId) {
    const idx = this.state.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const removed = this.state.tasks[idx];

    if (this.currentUser && removed.dbId) {
      try {
        await deleteCloudTask(removed.dbId);
      } catch (delErr) {
        sound.playWarning();
        console.error('Dayloom: Gagal menghapus misi di awan:', delErr);
        this.showToast(`Gagal menghapus misi dari awan: ${delErr.message || 'Koneksi gagal'}`, 'warning');
        return;
      }
    }

    this.state.tasks.splice(idx, 1);
    sound.playClick();
    this.persistAndRefresh();
    this.showToast(`Misi "${removed.title}" telah dihapus dari Papan Misi.`, 'info');
  }

  /* =========================================================================
   * MODAL FORMULIR MISI & FILTER PENCARIAN
   * ========================================================================= */
  bindQuestModalEvents() {
    // Filter Kategori, Prioritas, dan Pencarian di halaman Papan Misi
    const catSelect = document.getElementById('filter-category-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.questFilterCategory = e.target.value;
        this.renderQuestBoard();
      });
    }

    const prioSelect = document.getElementById('filter-priority-select');
    if (prioSelect) {
      prioSelect.addEventListener('change', (e) => {
        this.questFilterPriority = e.target.value;
        this.renderQuestBoard();
      });
    }

    const searchInput = document.getElementById('quest-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.questSearchQuery = e.target.value.trim();
        this.renderQuestBoard();
      });
    }

    // Modal Buat / Edit Misi
    const closeBtn = document.getElementById('btn-close-quest-modal');
    const cancelBtn = document.getElementById('btn-cancel-quest-modal');
    const modalOverlay = document.getElementById('quest-modal-overlay');

    [closeBtn, cancelBtn].forEach(el => {
      if (el) el.addEventListener('click', () => this.closeQuestModal());
    });

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeQuestModal();
      });
    }

    // Tambah item checklist di dalam modal
    const addChkBtn = document.getElementById('btn-add-checklist-item');
    const chkInput = document.getElementById('input-new-checklist');
    if (addChkBtn && chkInput) {
      const addFn = () => {
        const text = chkInput.value.trim();
        if (!text) return;
        this.draftChecklist.push({
          id: 'chk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          text,
          completed: false
        });
        chkInput.value = '';
        this.renderDraftChecklistInModal();
      };

      addChkBtn.addEventListener('click', addFn);
      chkInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addFn();
        }
      });
    }

    // Submit form misi
    const form = document.getElementById('quest-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveQuestFromModal();
      });
    }
  }

  openQuestModal(taskId = null) {
    const modal = document.getElementById('quest-modal-overlay');
    const modalTitle = document.getElementById('quest-modal-title');
    const titleInput = document.getElementById('quest-input-title');
    const descInput = document.getElementById('quest-input-desc');
    const catInput = document.getElementById('quest-input-category');
    const prioInput = document.getElementById('quest-input-priority');
    const deadlineInput = document.getElementById('quest-input-deadline');
    const statusInput = document.getElementById('quest-input-status');

    if (!modal) return;

    if (taskId) {
      const existing = this.state.tasks.find(t => t.id === taskId);
      if (!existing) return;
      this.editingTaskId = taskId;
      modalTitle.textContent = 'Ubah Gulungan Misi';
      titleInput.value = existing.title;
      descInput.value = existing.description || '';
      catInput.value = existing.category;
      prioInput.value = existing.priority;
      deadlineInput.value = existing.deadline;
      statusInput.value = existing.status === 'selesai' ? 'berjalan' : existing.status;
      this.draftChecklist = existing.checklist.map(c => ({ ...c }));
    } else {
      this.editingTaskId = null;
      modalTitle.textContent = 'Pintal Misi Baru';
      titleInput.value = '';
      descInput.value = '';
      catInput.value = 'pribadi';
      prioInput.value = 'sedang';
      deadlineInput.value = getRelativeDateStr(0);
      statusInput.value = 'tersedia';
      this.draftChecklist = [];
    }

    this.renderDraftChecklistInModal();
    modal.classList.remove('hidden');
    titleInput.focus();
  }

  closeQuestModal() {
    const modal = document.getElementById('quest-modal-overlay');
    if (modal) modal.classList.add('hidden');
  }

  renderDraftChecklistInModal() {
    const listEl = document.getElementById('modal-checklist-preview');
    if (!listEl) return;

    if (this.draftChecklist.length === 0) {
      listEl.innerHTML = `<li class="draft-chk-empty">Belum ada butir syarat wajib. Tambahkan di atas jika misi memiliki tahapan.</li>`;
      return;
    }

    listEl.innerHTML = this.draftChecklist.map((item, idx) => `
      <li class="draft-chk-item">
        <span>${idx + 1}. ${escapeHTML(item.text)}</span>
        <button type="button" class="btn-remove-chk" data-remove-draft-chk="${item.id}">Hapus</button>
      </li>
    `).join('');

    listEl.querySelectorAll('[data-remove-draft-chk]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-remove-draft-chk');
        this.draftChecklist = this.draftChecklist.filter(c => c.id !== id);
        this.renderDraftChecklistInModal();
      });
    });
  }

  async saveQuestFromModal() {
    const title = document.getElementById('quest-input-title')?.value?.trim();
    const description = document.getElementById('quest-input-desc')?.value?.trim();
    const category = document.getElementById('quest-input-category')?.value || 'pribadi';
    const priority = document.getElementById('quest-input-priority')?.value || 'sedang';
    const deadline = document.getElementById('quest-input-deadline')?.value || getRelativeDateStr(0);
    const status = document.getElementById('quest-input-status')?.value || 'tersedia';

    if (!title) {
      sound.playWarning();
      this.showToast('Judul misi tidak boleh kosong!', 'warning');
      return;
    }

    // Jika ada ketikan di input checklist yang belum ditekan "+ Tambah", masukkan otomatis
    const pendingChkInput = document.getElementById('input-new-checklist');
    if (pendingChkInput && pendingChkInput.value.trim()) {
      this.draftChecklist.push({
        id: 'chk_' + Date.now(),
        text: pendingChkInput.value.trim(),
        completed: false
      });
      pendingChkInput.value = '';
    }

    const saveSubmitBtn = document.querySelector('#quest-form button[type="submit"]');
    if (saveSubmitBtn) {
      saveSubmitBtn.disabled = true;
      saveSubmitBtn.dataset.originalText = saveSubmitBtn.textContent;
      saveSubmitBtn.textContent = 'Menyimpan...';
    }

    try {
      if (this.editingTaskId) {
        const task = this.state.tasks.find(t => t.id === this.editingTaskId);
        if (task) {
          const taskUpdates = {
            title,
            description,
            category,
            priority,
            deadline,
            status: task.status === 'selesai' ? 'berjalan' : status
          };

          // Sinkronisasi pembaruan ke cloud jika akun aktif
          if (this.currentUser && task.dbId) {
            await updateTask(task.dbId, taskUpdates);
            await syncTaskChecklists(this.currentUser.id, task.dbId, this.draftChecklist);
          }

          task.title = title;
          task.description = description;
          task.category = category;
          task.priority = priority;
          task.deadline = deadline;
          if (task.status !== 'selesai') {
            task.status = status;
          }
          task.checklist = this.draftChecklist;
        }
        this.showToast(`Misi "${title}" berhasil diperbarui!`, 'success');
      } else {
        const localId = 'quest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const newTaskData = {
          id: localId,
          title,
          description,
          category,
          priority,
          deadline,
          status,
          createdAt: new Date().toISOString(),
          completedAt: null,
          completedOnTime: null,
          checklist: this.draftChecklist
        };

        // Sinkronisasi pembuatan misi baru ke cloud jika akun aktif
        if (this.currentUser) {
          const created = await createTask(this.currentUser.id, newTaskData);
          newTaskData.dbId = created.dbId || created.id;
          newTaskData.checklist = Array.isArray(created.checklist) ? created.checklist : this.draftChecklist;
        }

        this.state.tasks.unshift(newTaskData);
        this.showToast(`Misi baru "${title}" telah dipasang di Papan Misi!`, 'success');
      }

      sound.playCheck();
      this.closeQuestModal();
      this.persistAndRefresh();
    } catch (saveErr) {
      sound.playWarning();
      console.error('Dayloom: Gagal menyimpan misi:', saveErr);
      this.showToast(`Gagal menyimpan misi: ${saveErr.message || 'Terjadi gangguan jaringan'}`, 'warning');
    } finally {
      if (saveSubmitBtn) {
        saveSubmitBtn.disabled = false;
        saveSubmitBtn.textContent = saveSubmitBtn.dataset.originalText || 'Gantung Misi';
      }
    }
  }

  /* =========================================================================
   * HALAMAN PROFIL PEMAIN (PLAYER PROFILE)
   * Identitas, foto profil lokal, ringkasan peringkat, Lambang Mythic,
   * statistik popularitas lokal, lencana pilihan, dan etalase karakter.
   * ========================================================================= */
  renderProfileView() {
    const container = document.getElementById('profile-view-content');
    if (!container) return;

    const profile = this.state.profile;
    const curRank = getCurrentRank(this.state.rp);
    const highestRank = getHighestRank(this.state);
    const mythicOwned = hasMythicEmblem(this.state);
    const mythicRank = RANKS[MYTHIC_RANK_INDEX];
    const social = profile.social || { likes: 0, following: 0, followers: 0 };
    const unlockedIds = this.state.unlockedAchievements || [];
    const featuredIds = getFeaturedAchievementIds(this.state);
    const unlockedAchievements = ACHIEVEMENTS_CONFIG.filter(a => unlockedIds.includes(a.id));

    const avatarHTML = profile.avatar
      ? `<img src="${profile.avatar}" alt="Foto profil ${escapeHTML(profile.name)}" class="identity-avatar-img" />`
      : `<div class="identity-avatar-fallback" aria-label="Avatar bawaan">${getCharacterSVG({
          outfitId: profile.outfit, hatId: profile.hat, rankId: curRank.id, size: 108, facing: 'right'
        })}</div>`;

    const formatCount = (n) => Number(n || 0).toLocaleString('id-ID');

    const featuredSlotsHTML = [0, 1, 2].map(slot => {
      const achId = featuredIds[slot];
      const ach = achId ? ACHIEVEMENTS_CONFIG.find(a => a.id === achId) : null;
      if (ach) {
        return `
          <div class="featured-ach-slot is-filled">
            <div class="featured-ach-art">${getAchievementSVG(ach.iconType, true, 56)}</div>
            <strong class="featured-ach-title">${ach.title}</strong>
            <small class="featured-ach-desc">${ach.desc}</small>
          </div>`;
      }
      return `
        <div class="featured-ach-slot is-empty">
          <div class="featured-ach-art empty-slot-art" aria-hidden="true">
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
              <polygon points="32,3 56,15 56,49 32,61 8,49 8,15" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 4"/>
            </svg>
          </div>
          <strong class="featured-ach-title">Slot Kosong</strong>
          <small class="featured-ach-desc">${unlockedAchievements.length > 0 ? 'Pilih lencana yang ingin dipamerkan.' : 'Buka lencana dengan menuntaskan misi.'}</small>
        </div>`;
    }).join('');

    const slotSelectorsHTML = unlockedAchievements.length === 0 ? '' : `
      <div class="featured-ach-selectors">
        ${[0, 1, 2].map(slot => `
          <label class="featured-ach-select-label">
            <span>Slot ${slot + 1}</span>
            <select class="rpg-input" data-featured-slot="${slot}">
              <option value="">— Kosong —</option>
              ${unlockedAchievements.map(a => `<option value="${a.id}" ${featuredIds[slot] === a.id ? 'selected' : ''}>${a.title}</option>`).join('')}
            </select>
          </label>
        `).join('')}
      </div>`;

    container.innerHTML = `
      <div class="profile-page-grid">
        <div class="profile-main-col">

          <!-- A. Kartu Identitas Pemain -->
          <div class="rpg-panel player-identity-card">
            <div class="identity-avatar-col">
              <div class="identity-avatar-frame">${avatarHTML}</div>
              <label class="btn-pixel btn-secondary btn-sm avatar-upload-btn">
                ${getIconSVG('camera', 15)} Ganti Foto
                <input type="file" id="profile-avatar-input" class="visually-hidden-input" accept="image/png,image/jpeg,image/webp,image/gif" />
              </label>
              ${profile.avatar ? `<button type="button" class="text-link-btn" id="btn-remove-avatar">Kembali ke avatar bawaan</button>` : ''}
            </div>

            <div class="identity-info-col">
              <span class="rpg-tag">Identitas Pengembara</span>
              <div class="identity-name-row" id="profile-name-display-row">
                <h3 class="identity-name">${escapeHTML(profile.name)}</h3>
                <button type="button" class="btn-icon" id="btn-edit-profile-name" title="Ubah nama pengguna" aria-label="Ubah nama pengguna">${getIconSVG('edit', 15)}</button>
              </div>
              <form class="identity-name-form hidden" id="profile-name-form">
                <label for="profile-name-input" class="visually-hidden-input">Nama pengguna</label>
                <input type="text" id="profile-name-input" class="rpg-input" value="${escapeHTML(profile.name)}" maxlength="36" required />
                <button type="submit" class="btn-pixel btn-primary btn-sm">Simpan</button>
                <button type="button" class="btn-pixel btn-secondary btn-sm" id="btn-cancel-profile-name">Batal</button>
              </form>
              <p class="identity-subtitle">${curRank.title} • ${escapeHTML(profile.bio || '')}</p>

              <!-- B. Ringkasan Peringkat -->
              <div class="identity-rank-summary">
                <div class="rank-summary-tile">
                  <div class="rank-summary-emblem">${getRankEmblemSVG(curRank.id, 46)}</div>
                  <div>
                    <small>Peringkat Saat Ini</small>
                    <strong>${curRank.name}</strong>
                  </div>
                </div>
                <div class="rank-summary-tile">
                  <div class="rank-summary-emblem">${getRankEmblemSVG(highestRank.id, 46)}</div>
                  <div>
                    <small>Peringkat Tertinggi</small>
                    <strong>${highestRank.name}</strong>
                  </div>
                </div>
                <div class="rank-summary-tile mythic-emblem-tile ${mythicOwned ? 'is-owned' : 'is-locked'}"
                  title="${mythicOwned ? 'Lambang Mythic telah diraih' : `Terkunci — capai peringkat Mythic (${mythicRank.minRP} RP) untuk meraihnya`}">
                  <div class="rank-summary-emblem">
                    ${getRankEmblemSVG('mythic', 46)}
                    ${mythicOwned ? '' : `<span class="emblem-lock-badge" aria-hidden="true">${getIconSVG('lock', 14)}</span>`}
                  </div>
                  <div>
                    <small>Lambang Mythic</small>
                    <strong>${mythicOwned ? 'Diraih' : 'Terkunci'}</strong>
                    ${mythicOwned ? '' : `<em class="mythic-lock-hint">Butuh ${mythicRank.minRP} RP</em>`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- C. Statistik Popularitas (lokal) -->
          <div class="rpg-panel popularity-strip" aria-label="Statistik popularitas">
            <div class="popularity-item">
              <span class="popularity-icon pop-likes">${getIconSVG('heart', 16)}</span>
              <strong>${formatCount(social.likes)}</strong>
              <small>Suka</small>
            </div>
            <div class="popularity-item">
              <span class="popularity-icon pop-following">${getIconSVG('userPlus', 16)}</span>
              <strong>${formatCount(social.following)}</strong>
              <small>Mengikuti</small>
            </div>
            <div class="popularity-item">
              <span class="popularity-icon pop-followers">${getIconSVG('users', 16)}</span>
              <strong>${formatCount(social.followers)}</strong>
              <small>Pengikut</small>
            </div>
            <p class="popularity-note">Fitur sosial daring belum tersedia — angka ini tersimpan lokal dan akan terisi saat Dayloom terhubung ke server.</p>
          </div>

          <!-- D. Lencana Pilihan -->
          <div class="rpg-panel featured-ach-card">
            <div class="panel-header-row">
              <div>
                <span class="rpg-tag">Kebanggaan Pengembara</span>
                <h3 class="panel-title">Lencana Pilihan</h3>
              </div>
              <span class="featured-ach-count">${featuredIds.length}/3 dipamerkan • ${unlockedAchievements.length} terbuka</span>
            </div>
            ${unlockedAchievements.length === 0 ? `
              <div class="featured-ach-empty">
                <p>Belum ada lencana yang terbuka. Tuntaskan misi pertamamu untuk meraih lencana <strong>Benang Pertama</strong>.</p>
                <button type="button" class="btn-pixel btn-secondary btn-sm" data-nav-view-inline="achievements">Lihat Semua Lencana</button>
              </div>
            ` : ''}
            <div class="featured-ach-slots">${featuredSlotsHTML}</div>
            ${slotSelectorsHTML}
          </div>

          <!-- Perlengkapan sprite petualang (fitur lama dipertahankan) -->
          <details class="rpg-panel sprite-gear-card">
            <summary>
              <span class="sprite-gear-preview">${getCharacterSVG({ outfitId: profile.outfit, hatId: profile.hat, rankId: curRank.id, size: 44, facing: 'right' })}</span>
              <span><strong>Perlengkapan Sprite Petualang</strong><small>Jubah, penutup kepala, dan semboyan untuk wujud pixel di dunia desa</small></span>
            </summary>
            <form id="profile-custom-form" class="profile-form">
              <div class="form-group">
                <label for="prof-bio-input">Semboyan / Kisah Tenunan Hidup</label>
                <input type="text" id="prof-bio-input" class="rpg-input" value="${escapeHTML(profile.bio)}" maxlength="90" />
              </div>
              <div class="form-row-2">
                <div class="form-group">
                  <label for="prof-outfit-select">Jubah &amp; Busana</label>
                  <select id="prof-outfit-select" class="rpg-input">
                    ${CHARACTER_OUTFITS.map(o => {
                      const unlocked = curRank.index >= o.minRankIndex;
                      const reqRank = RANKS[o.minRankIndex]?.name || 'Epic';
                      return `<option value="${o.id}" ${profile.outfit === o.id ? 'selected' : ''} ${!unlocked ? 'disabled' : ''}>${o.name} ${!unlocked ? `(Butuh Rank ${reqRank})` : ''}</option>`;
                    }).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label for="prof-hat-select">Penutup Kepala / Aksesori</label>
                  <select id="prof-hat-select" class="rpg-input">
                    ${CHARACTER_HATS.map(h => {
                      const unlocked = curRank.index >= h.minRankIndex;
                      const reqRank = RANKS[h.minRankIndex]?.name || 'Epic';
                      return `<option value="${h.id}" ${profile.hat === h.id ? 'selected' : ''} ${!unlocked ? 'disabled' : ''}>${h.name} ${!unlocked ? `(Butuh Rank ${reqRank})` : ''}</option>`;
                    }).join('')}
                  </select>
                </div>
              </div>
              <button type="submit" class="btn-pixel btn-primary">Simpan Perlengkapan</button>
            </form>
          </details>
        </div>

        <!-- Etalase Karakter: ilustrasi resmi 2D editorial modern (Traveler & Meliodas Wujud Normal) -->
        <figure class="rpg-panel character-showcase" id="profile-character-showcase">
          <div class="showcase-char-switcher" role="tablist" aria-label="Pilih Potret Karakter">
            <button type="button" class="showcase-char-tab ${(profile.selectedCharacter || 'traveler') !== 'meliodas' ? 'active' : ''}" data-profile-char-tab="traveler" role="tab" aria-selected="${(profile.selectedCharacter || 'traveler') !== 'meliodas'}">
              Traveler
            </button>
            <button type="button" class="showcase-char-tab ${profile.selectedCharacter === 'meliodas' ? 'active' : ''}" data-profile-char-tab="meliodas" role="tab" aria-selected="${profile.selectedCharacter === 'meliodas'}">
              Meliodas
            </button>
          </div>

          <div class="showcase-stage">
            <img src="assets/characters/adventurer-illustration.jpg" alt="Traveler — Potret resmi editorial modern Sang Pengembara Dayloom" class="showcase-illustration ${profile.selectedCharacter === 'meliodas' ? 'hidden' : ''}" id="profile-showcase-img" loading="lazy" decoding="async" />
            <img src="assets/characters/meliodas-portrait.jpg" alt="Meliodas — Potret resmi kapten Boar Hat memegang pedang suci Lostvayne" class="showcase-illustration ${profile.selectedCharacter === 'meliodas' ? '' : 'hidden'}" id="profile-showcase-meliodas-img" loading="lazy" decoding="async" />
            <div class="showcase-meliodas-portrait hidden" id="profile-meliodas-portrait" role="img" aria-label="Meliodas — Potret SVG wujud normal memegang pedang suci Lostvayne">
              ${getMeliodasPortraitSVG()}
            </div>
            <div class="showcase-fallback hidden" id="profile-showcase-fallback">
              ${getCharacterSVG({ outfitId: profile.outfit, hatId: profile.hat, rankId: curRank.id, size: 220, facing: 'right' })}
              <small>Ilustrasi resmi tidak dapat dimuat — menampilkan wujud pixel.</small>
            </div>
          </div>
          <figcaption class="showcase-caption">
            <h3 class="showcase-character-name" id="profile-showcase-char-name">${profile.selectedCharacter === 'meliodas' ? 'Meliodas' : 'Traveler'}</h3>
            <div class="showcase-sprite-inset" id="profile-showcase-sprite-inset">
              ${profile.selectedCharacter === 'meliodas'
                ? `${getMeliodasSVG({ mode: 'normal', size: 48, facing: 'right' })}<small>Wujud tempur normal • Lostvayne</small>`
                : `${getCharacterSVG({ outfitId: profile.outfit, hatId: profile.hat, rankId: curRank.id, size: 48, facing: 'right' })}<small>Wujud pixel di dunia desa</small>`
              }
            </div>
          </figcaption>
        </figure>
      </div>
    `;

    this.bindProfileViewEvents();
  }

  bindProfileViewEvents() {
    // Tab etalase karakter di Profil (Traveler vs Meliodas Normal)
    document.querySelectorAll('[data-profile-char-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        const charId = tab.getAttribute('data-profile-char-tab') === 'meliodas' ? 'meliodas' : 'traveler';
        if (this.state.profile.selectedCharacter === charId) return;
        this.state.profile.selectedCharacter = charId;
        sound.playClick();
        this.saveActiveState();
        this.renderProfileView();
        if (this.currentUser) {
          updateProfile(this.currentUser.id, { selected_character: charId }).catch(err => {
            console.warn('Dayloom: Gagal menyinkronkan karakter ke awan:', err);
          });
        }
      });
    });

    // Fallback bila ilustrasi gagal dimuat
    const showcaseImg = document.getElementById('profile-showcase-img');
    const showcaseMeliodasImg = document.getElementById('profile-showcase-meliodas-img');
    const showcaseMeliodasSvg = document.getElementById('profile-meliodas-portrait');
    const showcaseFallback = document.getElementById('profile-showcase-fallback');
    if (showcaseImg && showcaseFallback) {
      const showFallback = () => {
        if (this.state.profile.selectedCharacter === 'meliodas') return;
        showcaseImg.classList.add('hidden');
        showcaseFallback.classList.remove('hidden');
      };
      showcaseImg.addEventListener('error', showFallback, { once: true });
      if (this.state.profile.selectedCharacter !== 'meliodas' && showcaseImg.complete && showcaseImg.naturalWidth === 0 && showcaseImg.src) showFallback();
    }
    if (showcaseMeliodasImg && showcaseMeliodasSvg) {
      showcaseMeliodasImg.addEventListener('error', () => {
        showcaseMeliodasImg.classList.add('hidden');
        showcaseMeliodasSvg.classList.remove('hidden');
      }, { once: true });
    }

    // Unggah foto profil dari galeri perangkat (diproses & disimpan lokal)
    const avatarInput = document.getElementById('profile-avatar-input');
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        avatarInput.value = '';
        if (file) this.handleAvatarFile(file);
      });
    }

    document.getElementById('btn-remove-avatar')?.addEventListener('click', () => {
      this.state.profile.avatar = null;
      this.saveActiveState();
      sound.playClick();
      this.refreshAllUI();
      this.showToast('Foto profil dikembalikan ke avatar bawaan.', 'info');
      if (this.currentUser) {
        updateProfile(this.currentUser.id, { avatar_url: null }).catch(err => {
          console.warn('Dayloom: Gagal menyinkronkan reset avatar ke awan:', err);
        });
      }
    });

    // Ubah nama pengguna
    const displayRow = document.getElementById('profile-name-display-row');
    const nameForm = document.getElementById('profile-name-form');
    const nameInput = document.getElementById('profile-name-input');
    document.getElementById('btn-edit-profile-name')?.addEventListener('click', () => {
      sound.playClick();
      displayRow?.classList.add('hidden');
      nameForm?.classList.remove('hidden');
      nameInput?.focus();
      nameInput?.select();
    });
    document.getElementById('btn-cancel-profile-name')?.addEventListener('click', () => {
      nameForm?.classList.add('hidden');
      displayRow?.classList.remove('hidden');
    });
    nameForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = (nameInput?.value || '').trim();
      if (!newName) {
        sound.playWarning();
        this.showToast('Nama pengguna tidak boleh kosong.', 'warning');
        return;
      }
      this.state.profile.name = newName.slice(0, 36);
      sound.playCheck();
      this.persistAndRefresh();
      this.showToast(`Nama pengguna diperbarui menjadi "${this.state.profile.name}".`, 'success');

      if (this.currentUser) {
        try {
          await updateProfile(this.currentUser.id, { username: this.state.profile.name });
        } catch (err) {
          console.warn('Dayloom: Gagal menyinkronkan nama pengguna ke awan:', err);
        }
      }
    });

    // Pilih lencana yang dipamerkan
    document.querySelectorAll('[data-featured-slot]').forEach(select => {
      select.addEventListener('change', () => {
        const slot = Number(select.getAttribute('data-featured-slot'));
        const value = select.value;
        const slots = [0, 1, 2].map(i => getFeaturedAchievementIds(this.state)[i] || '');
        // Hindari lencana ganda di dua slot
        if (value) {
          const dup = slots.indexOf(value);
          if (dup !== -1 && dup !== slot) slots[dup] = '';
        }
        slots[slot] = value;
        this.state.profile.featuredAchievements = slots.filter(Boolean);
        sound.playClick();
        this.saveActiveState();
        this.renderProfileView();
        if (this.currentUser) {
          updateProfile(this.currentUser.id, {
            featured_achievements: this.state.profile.featuredAchievements
          }).catch(err => {
            console.warn('Dayloom: Gagal menyinkronkan lencana ke awan:', err);
          });
        }
      });
    });

    document.querySelectorAll('[data-nav-view-inline]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.switchView(btn.getAttribute('data-nav-view-inline'));
      });
    });

    // Perlengkapan sprite (fitur lama)
    const form = document.getElementById('profile-custom-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newBio = document.getElementById('prof-bio-input')?.value?.trim();
        const newOutfit = document.getElementById('prof-outfit-select')?.value;
        const newHat = document.getElementById('prof-hat-select')?.value;

        if (typeof newBio === 'string') this.state.profile.bio = newBio;
        if (newOutfit) this.state.profile.outfit = newOutfit;
        if (newHat) this.state.profile.hat = newHat;

        sound.playCheck();
        this.persistAndRefresh();
        this.showToast('Perlengkapan sprite petualang berhasil diperbarui!', 'success');

        if (this.currentUser) {
          try {
            await updateProfile(this.currentUser.id, {
              bio: this.state.profile.bio,
              outfit: this.state.profile.outfit,
              hat: this.state.profile.hat
            });
          } catch (err) {
            console.warn('Dayloom: Gagal menyinkronkan perlengkapan ke awan:', err);
          }
        }
      });
    }
  }

  /**
   * Memproses gambar dari galeri perangkat: validasi tipe & ukuran, potong tengah persegi,
   * kecilkan ke 256×256, lalu simpan sebagai data URL JPEG di penyimpanan lokal yang sudah ada.
   */
  handleAvatarFile(file) {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      sound.playWarning();
      this.showToast('Format tidak didukung. Gunakan gambar PNG, JPG, WEBP, atau GIF.', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      sound.playWarning();
      this.showToast('Ukuran gambar terlalu besar (maksimal 10 MB).', 'warning');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        ctx.fillStyle = '#F5EBDD';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);

        const previous = this.state.profile.avatar;
        this.state.profile.avatar = dataUrl;
        if (!this.saveActiveState()) {
          this.state.profile.avatar = previous;
          sound.playWarning();
          this.showToast('Penyimpanan lokal penuh — foto profil tidak dapat disimpan.', 'warning');
          return;
        }
        sound.playCheck();
        this.refreshAllUI();
        this.showToast('Foto profil berhasil diperbarui!', 'success');

        if (this.currentUser) {
          updateProfile(this.currentUser.id, { avatar_url: dataUrl }).catch(err => {
            console.warn('Dayloom: Gagal menyinkronkan foto profil ke awan:', err);
          });
        }
      } catch (err) {
        sound.playWarning();
        this.showToast('Gambar tidak dapat diproses. Coba gambar lain.', 'warning');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      sound.playWarning();
      this.showToast('Berkas gambar rusak atau tidak dapat dibaca.', 'warning');
    };
    img.src = objectUrl;
  }

  /* =========================================================================
   * HALAMAN PERINGKAT (6 PERINGKAT RESMI, RP & HADIAH)
   * ========================================================================= */
  renderRankView() {
    const container = document.getElementById('rank-view-content');
    if (!container) return;

    const rankProg = getRankProgress(this.state.rp);
    const curRank = rankProg.currentRank;
    const highestRank = getHighestRank(this.state);

    container.innerHTML = `
      <div class="rpg-panel rank-overview-card">
        <div class="rank-overview-emblem">${getRankEmblemSVG(curRank.id, 104)}</div>
        <div class="rank-overview-info">
          <span class="rpg-tag">Peringkat Saat Ini</span>
          <h3 class="rank-overview-name">${curRank.name} <span>— ${curRank.title}</span></h3>
          <div class="rank-overview-progress">
            <div class="hud-rp-bar-track"><div class="hud-rp-bar-fill" style="width:${rankProg.percent}%"></div></div>
            <small>${rankProg.isMaxRank
              ? `${this.state.rp} RP — kau telah mencapai puncak tertinggi.`
              : `${this.state.rp} RP • ${rankProg.rpRemaining} RP lagi menuju ${rankProg.nextRank.name} (${rankProg.percent}%)`}</small>
          </div>
        </div>
        <div class="rank-overview-side">
          <div class="rank-highest-chip">
            ${getRankEmblemSVG(highestRank.id, 36)}
            <div><small>Peringkat Tertinggi</small><strong>${highestRank.name}</strong></div>
          </div>
          <div class="rp-total-badge">${this.state.rp} RP</div>
        </div>
      </div>

      <div class="rpg-panel profile-ranks-ladder-card">
        <div class="panel-header-row">
          <div>
            <span class="rpg-tag">Sistem Progresi Resmi</span>
            <h3 class="panel-title">Enam Tangga Peringkat Kemuliaan</h3>
          </div>
        </div>

        <div class="rp-rules-callout">
          <strong>Aturan Baku Rank Points (RP):</strong>
          Setiap misi yang diselesaikan penuh memberikan <strong>+10 RP</strong> (hanya satu kali per misi, tercatat di buku besar anti-duplikat). Mencentang daftar periksa sebagian tidak memberikan RP.
        </div>

        <div class="ranks-ladder-list">
          ${RANKS.map((r, idx) => {
            const isCurrent = r.id === curRank.id;
            const isReached = this.state.rp >= r.minRP;
            const rangeLabel = r.maxRP === Infinity ? `${r.minRP}+ RP` : `${r.minRP} – ${r.maxRP} RP`;

            return `
              <div class="rank-tier-row ${isCurrent ? 'is-current-tier' : ''} ${isReached ? 'is-unlocked-tier' : 'is-locked-tier'} tier-${r.id}">
                <div class="tier-emblem-col">
                  ${getRankEmblemSVG(r.id, 58)}
                </div>
                <div class="tier-info-col">
                  <div class="tier-title-line">
                    <h4>${idx + 1}. ${r.name}</h4>
                    <span class="tier-subtitle">${r.title}</span>
                    <span class="tier-rp-range">${rangeLabel}</span>
                  </div>
                  <p class="tier-lore">${r.lore}</p>
                  <small class="tier-perk">Hadiah Peringkat: <strong>${r.perk}</strong></small>
                </div>
                <div class="tier-status-col">
                  ${isCurrent
                    ? `<span class="tier-badge current">Peringkatmu</span>`
                    : isReached
                      ? `<span class="tier-badge passed">Terlampaui</span>`
                      : `<span class="tier-badge locked">Terkunci</span>`
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /* =========================================================================
   * GALERI PENCAPAIAN & HADIAH (ACHIEVEMENTS & REWARDS)
   * ========================================================================= */
  renderAchievementsView() {
    const container = document.getElementById('achievements-view-content');
    if (!container) return;

    const unlockedList = this.state.unlockedAchievements || [];
    const totalCount = ACHIEVEMENTS_CONFIG.length;
    const unlockedCount = unlockedList.length;

    container.innerHTML = `
      <div class="rpg-panel achievements-header-banner">
        <div>
          <span class="rpg-tag">Kedai Teh Sakura — Galeri Relik</span>
          <h3 class="panel-title">Koleksi Lencana Pencapaian & Hadiah Dunia</h3>
          <p>Setiap lencana yang terbuka memberikan penghormatan abadi dan memperkaya suasana Desa Hanamori.</p>
        </div>
        <div class="ach-counter-box">
          <strong>${unlockedCount} / ${totalCount}</strong>
          <span>Lencana Terbuka</span>
        </div>
      </div>

      <div class="achievements-grid">
        ${ACHIEVEMENTS_CONFIG.map(ach => {
          const isUnlocked = unlockedList.includes(ach.id);
          return `
            <div class="rpg-panel achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
              <div class="ach-art-col">
                ${getAchievementSVG(ach.iconType, isUnlocked, 68)}
              </div>
              <div class="ach-text-col">
                <div class="ach-top-line">
                  <h4>${ach.title}</h4>
                  <span class="ach-state-pill ${isUnlocked ? 'pill-open' : 'pill-lock'}">
                    ${isUnlocked ? 'Terbuka' : 'Terkunci'}
                  </span>
                </div>
                <p class="ach-desc">${ach.desc}</p>
                <div class="ach-meta-box">
                  <small><strong>Syarat:</strong> ${ach.conditionDesc}</small>
                  <small><strong>Hadiah:</strong> ${ach.rewardText}</small>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /* =========================================================================
   * MODAL KENAIKAN PERINGKAT (RANK UP PRESENTATION) & KUIL MEDITASI
   * ========================================================================= */
  openRankUpModal(newRank) {
    const overlay = document.getElementById('rankup-modal-overlay');
    const body = document.getElementById('rankup-modal-body');
    if (!overlay || !body) return;

    body.innerHTML = `
      <div class="rankup-emblem-showcase">
        ${getRankEmblemSVG(newRank.id, 120)}
      </div>
      <span class="rpg-tag">Peringkat Baru Tercapai!</span>
      <h2 class="rankup-title">${newRank.name}</h2>
      <h4 class="rankup-subtitle">${newRank.title}</h4>
      <p class="rankup-lore">${newRank.lore}</p>
      <div class="rankup-perk-box">
        <strong>Hadiah Terbuka:</strong> ${newRank.perk}
      </div>
      <button type="button" class="btn-pixel btn-primary" id="btn-close-rankup">Lanjutkan Petualangan</button>
    `;

    overlay.classList.remove('hidden');
    document.getElementById('btn-close-rankup')?.addEventListener('click', () => {
      sound.playClick();
      overlay.classList.add('hidden');
    });
  }

  bindShrineModalEvents() {
    const closeBtn = document.getElementById('btn-close-shrine-modal');
    const startBtn = document.getElementById('btn-shrine-toggle');
    const resetBtn = document.getElementById('btn-shrine-reset');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.stopShrineMeditation();
        document.getElementById('shrine-modal-overlay')?.classList.add('hidden');
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        sound.playClick();
        if (this.meditation.active) {
          this.stopShrineMeditation();
        } else {
          this.startShrineMeditation();
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        sound.playClick();
        this.stopShrineMeditation();
        this.meditation.secondsLeft = 300;
        this.updateShrineTimerUI();
      });
    }
  }

  openShrineMeditationModal() {
    const overlay = document.getElementById('shrine-modal-overlay');
    if (!overlay) return;
    this.updateShrineTimerUI();
    overlay.classList.remove('hidden');
  }

  startShrineMeditation() {
    this.meditation.active = true;
    this.updateShrineTimerUI();
    this.meditation.intervalId = setInterval(() => {
      this.meditation.secondsLeft -= 1;
      if (this.meditation.secondsLeft <= 0) {
        this.stopShrineMeditation();
        this.meditation.secondsLeft = 300;
        sound.playAchievement();
        this.showToast('Meditasi Kuil Tenun Waktu selesai. Pikiranmu kini tenang dan siap menuntaskan misi!', 'success');
      }
      this.updateShrineTimerUI();
    }, 1000);
  }

  stopShrineMeditation() {
    this.meditation.active = false;
    if (this.meditation.intervalId) {
      clearInterval(this.meditation.intervalId);
      this.meditation.intervalId = null;
    }
    this.updateShrineTimerUI();
  }

  updateShrineTimerUI() {
    const disp = document.getElementById('shrine-timer-display');
    const btn = document.getElementById('btn-shrine-toggle');
    if (disp) {
      const m = String(Math.floor(this.meditation.secondsLeft / 60)).padStart(2, '0');
      const s = String(this.meditation.secondsLeft % 60).padStart(2, '0');
      disp.textContent = `${m}:${s}`;
    }
    if (btn) {
      btn.textContent = this.meditation.active ? 'Jeda Meditasi' : 'Nyalakan Dupa Fokus (Mulai)';
    }
  }

  /* =========================================================================
   * MODAL AUTENTIKASI AKUN PETUALANG (SUPABASE CLOUD) - TAHAP 3 INTEGRATION
   * ========================================================================= */
  bindAuthModalEvents() {
    const authStatusBtn = document.getElementById('btn-auth-status');
    const modalOverlay = document.getElementById('auth-modal-overlay');
    const closeBtn = document.getElementById('btn-close-auth-modal');
    const cancelBtn = document.getElementById('btn-cancel-auth-modal');
    const closeUserBtn = document.getElementById('btn-close-auth-user');
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const nameGroup = document.getElementById('auth-name-group');
    const submitBtn = document.getElementById('btn-submit-auth');
    const errorBanner = document.getElementById('auth-error-banner');
    const form = document.getElementById('auth-form');
    const logoutBtn = document.getElementById('btn-auth-logout');

    if (authStatusBtn) {
      authStatusBtn.addEventListener('click', () => {
        sound.playClick();
        this.openAuthModal();
      });
    }

    [closeBtn, cancelBtn, closeUserBtn].forEach(el => {
      if (el) {
        el.addEventListener('click', () => {
          sound.playClick();
          this.closeAuthModal();
        });
      }
    });

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeAuthModal();
      });
    }

    // Tab Switching: Masuk vs Daftar Baru
    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        sound.playClick();
        this.authMode = 'login';
        tabLogin.classList.add('active');
        tabLogin.setAttribute('aria-selected', 'true');
        tabRegister.classList.remove('active');
        tabRegister.setAttribute('aria-selected', 'false');
        if (nameGroup) nameGroup.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'Masuk ke Desa';
        if (errorBanner) {
          errorBanner.classList.add('hidden');
          errorBanner.textContent = '';
        }
      });

      tabRegister.addEventListener('click', () => {
        sound.playClick();
        this.authMode = 'register';
        tabRegister.classList.add('active');
        tabRegister.setAttribute('aria-selected', 'true');
        tabLogin.classList.remove('active');
        tabLogin.setAttribute('aria-selected', 'false');
        if (nameGroup) nameGroup.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'Daftarkan Petualang';
        if (errorBanner) {
          errorBanner.classList.add('hidden');
          errorBanner.textContent = '';
        }
      });
    }

    // Form Submit: Registrasi atau Login Akun
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Validasi keberadaan konfigurasi Publishable Key
        if (!isSupabaseConfigured()) {
          sound.playWarning();
          if (errorBanner) {
            errorBanner.style.background = '#FCE6E6';
            errorBanner.style.borderColor = '#C94A4A';
            errorBanner.style.color = '#922B2B';
            errorBanner.textContent = 'Konfigurasi Supabase Publishable Key belum terpasang. Harap masukkan SUPABASE_ANON_KEY pada js/config.js terlebih dahulu.';
            errorBanner.classList.remove('hidden');
          }
          return;
        }

        const emailInput = document.getElementById('auth-input-email');
        const passwordInput = document.getElementById('auth-input-password');
        const nameInput = document.getElementById('auth-input-name');

        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        const adventurerName = nameInput?.value?.trim() || '';

        if (!email || !password) {
          sound.playWarning();
          if (errorBanner) {
            errorBanner.style.background = '#FCE6E6';
            errorBanner.style.borderColor = '#C94A4A';
            errorBanner.style.color = '#922B2B';
            errorBanner.textContent = 'Alamat email dan kata sandi wajib diisi.';
            errorBanner.classList.remove('hidden');
          }
          return;
        }

        if (!isValidEmail(email)) {
          sound.playWarning();
          if (errorBanner) {
            errorBanner.style.background = '#FCE6E6';
            errorBanner.style.borderColor = '#C94A4A';
            errorBanner.style.color = '#922B2B';
            errorBanner.textContent = 'Format alamat email tidak valid. Gunakan email standar (contoh: nama@gmail.com).';
            errorBanner.classList.remove('hidden');
          }
          emailInput?.focus();
          return;
        }

        if (this.authMode === 'register' && !adventurerName) {
          sound.playWarning();
          if (errorBanner) {
            errorBanner.style.background = '#FCE6E6';
            errorBanner.style.borderColor = '#C94A4A';
            errorBanner.style.color = '#922B2B';
            errorBanner.textContent = 'Nama petualang wajib diisi untuk pendaftaran baru.';
            errorBanner.classList.remove('hidden');
          }
          nameInput?.focus();
          return;
        }

        if (errorBanner) {
          errorBanner.classList.add('hidden');
          errorBanner.textContent = '';
        }

        // Tampilkan status loading
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.dataset.originalText = submitBtn.textContent;
          submitBtn.textContent = 'Menghubungi Desa...';
        }

        try {
          if (this.authMode === 'register') {
            const data = await signUp(email, password, adventurerName);
            sound.playQuestComplete();

            if (data.session && data.session.user) {
              this.currentSession = data.session;
              this.currentUser = data.session.user;
              this.updateAuthUI(this.currentUser);
              this.closeAuthModal();
              this.showToast(`Selamat datang di Desa Hanamori, ${adventurerName || 'Pengembara'}!`, 'success');
              if (passwordInput) passwordInput.value = '';
              await this.loadCloudUserData(this.currentUser.id);
            } else if (data.user) {
              // Jika email confirmation aktif di Supabase
              if (errorBanner) {
                errorBanner.style.background = '#E8F5E9';
                errorBanner.style.borderColor = '#4CAF50';
                errorBanner.style.color = '#1B5E20';
                errorBanner.textContent = 'Pendaftaran berhasil! Tautan konfirmasi telah dikirimkan ke email Anda. Silakan verifikasi untuk mulai masuk.';
                errorBanner.classList.remove('hidden');
              }
              this.showToast('Pendaftaran akun berhasil! Periksa email Anda untuk verifikasi.', 'info');
              if (passwordInput) passwordInput.value = '';
            }
          } else {
            const data = await signIn(email, password);
            sound.playQuestComplete();
            this.currentSession = data.session || null;
            this.currentUser = data.user || data.session?.user || null;
            this.updateAuthUI(this.currentUser);
            this.closeAuthModal();
            const displayName = this.currentUser?.user_metadata?.name || this.currentUser?.user_metadata?.username || (this.currentUser?.email ? this.currentUser.email.split('@')[0] : 'Pengembara');
            this.showToast(`Selamat datang kembali di Desa Hanamori, ${displayName}!`, 'success');
            if (passwordInput) passwordInput.value = '';
            if (this.currentUser) {
              await this.loadCloudUserData(this.currentUser.id);
            }
          }
        } catch (err) {
          sound.playWarning();
          if (errorBanner) {
            errorBanner.style.background = '#FCE6E6';
            errorBanner.style.borderColor = '#C94A4A';
            errorBanner.style.color = '#922B2B';
            errorBanner.textContent = formatAuthErrorMessage(err);
            errorBanner.classList.remove('hidden');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || (this.authMode === 'register' ? 'Daftarkan Petualang' : 'Masuk ke Desa');
          }
        }
      });
    }

    // Tombol Keluar (Logout)
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        sound.playClick();
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Keluar...';

        try {
          const res = await signOut();
          if (res && res.error) {
            sound.playWarning();
            const errorMsg = formatAuthErrorMessage(res.error);
            this.showToast(`Gagal keluar dari akun awan: ${errorMsg}`, 'warning');
            return;
          }

          // Logout berhasil
          this.cloudLoadRequestId++;
          this.currentUser = null;
          this.currentSession = null;
          this.loadedCloudUserId = null;
          this.loadingCloudUserId = null;
          this.updateAuthUI(null);
          this.switchToGuestState();
          this.closeAuthModal();
          this.showToast('Anda telah keluar dari akun awan dan kembali ke Mode Tamu lokal.', 'info');
        } catch (logoutErr) {
          sound.playWarning();
          console.warn('Dayloom: Peringatan saat keluar dari sesi awan:', logoutErr);
          const errorMsg = formatAuthErrorMessage(logoutErr);
          this.showToast(`Gagal keluar dari akun awan: ${errorMsg}`, 'warning');
        } finally {
          logoutBtn.disabled = false;
          logoutBtn.textContent = 'Keluar (Mode Tamu)';
        }
      });
    }
  }

  openAuthModal() {
    const modal = document.getElementById('auth-modal-overlay');
    const errorBanner = document.getElementById('auth-error-banner');
    if (errorBanner) {
      errorBanner.classList.add('hidden');
      errorBanner.textContent = '';
    }
    this.updateAuthUI(this.currentUser);
    if (modal) modal.classList.remove('hidden');
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal-overlay');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * Memperbarui label tombol header dan tampilan modal sesuai status login/guest
   */
  updateAuthUI(user) {
    const statusBtn = document.getElementById('btn-auth-status');
    const statusLabel = document.getElementById('auth-status-label');
    const guestView = document.getElementById('auth-guest-view');
    const userView = document.getElementById('auth-user-view');
    const userDisplayName = document.getElementById('auth-user-display-name');
    const userDisplayEmail = document.getElementById('auth-user-display-email');
    const modalTag = document.getElementById('auth-modal-tag');

    if (user) {
      const displayName = user.user_metadata?.name || user.user_metadata?.username || (user.email ? user.email.split('@')[0] : 'Pengembara');
      if (statusLabel) statusLabel.textContent = `Pengembara: ${displayName}`;
      if (statusBtn) {
        statusBtn.classList.add('is-authenticated');
        statusBtn.title = `Akun Terhubung: ${user.email} (Klik untuk opsi akun)`;
      }

      if (guestView) guestView.classList.add('hidden');
      if (userView) userView.classList.remove('hidden');
      if (userDisplayName) userDisplayName.textContent = displayName;
      if (userDisplayEmail) userDisplayEmail.textContent = user.email || '';
      if (modalTag) modalTag.textContent = 'Akun Awan Aktif';
    } else {
      if (statusLabel) statusLabel.textContent = 'Mode Tamu';
      if (statusBtn) {
        statusBtn.classList.remove('is-authenticated');
        statusBtn.title = 'Status: Mode Tamu Lokal (Klik untuk Masuk / Daftar Awan)';
      }

      if (guestView) guestView.classList.remove('hidden');
      if (userView) userView.classList.add('hidden');
      if (modalTag) modalTag.textContent = 'Koneksi Awan Hanamori';
    }
  }

  /**
   * Memulihkan sesi pengguna saat halaman dimuat dan memasang listener perubahan status
   */
  async initAuthSession() {
    if (!isSupabaseConfigured()) {
      this.updateAuthUI(null);
      return;
    }

    try {
      const session = await getSession();
      if (session && session.user) {
        this.currentSession = session;
        this.currentUser = session.user;
        this.updateAuthUI(this.currentUser);
        await this.loadCloudUserData(this.currentUser.id);
      } else {
        this.currentSession = null;
        this.currentUser = null;
        this.loadedCloudUserId = null;
        this.updateAuthUI(null);
        this.switchToGuestState();
      }
    } catch (err) {
      console.warn('Dayloom: Tidak dapat memulihkan sesi, tetap di Mode Tamu:', err);
      this.currentSession = null;
      this.currentUser = null;
      this.loadedCloudUserId = null;
      this.updateAuthUI(null);
      this.switchToGuestState();
    }

    // Pasang listener status autentikasi hanya satu kali
    if (!this.authSubscription) {
      try {
        this.authSubscription = onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            if (session && session.user) {
              const isDifferentUser = !this.currentUser || this.currentUser.id !== session.user.id || this.loadedCloudUserId !== session.user.id;
              const alreadyLoadingThisUser = this.loadingCloudUserId === session.user.id;
              this.currentSession = session;
              this.currentUser = session.user;
              this.updateAuthUI(this.currentUser);
              if (isDifferentUser && !alreadyLoadingThisUser) {
                await this.loadCloudUserData(session.user.id);
              }
            }
          } else if (event === 'TOKEN_REFRESHED') {
            if (session && session.user) {
              this.currentSession = session;
              this.currentUser = session.user;
            }
          } else if (event === 'SIGNED_OUT') {
            this.cloudLoadRequestId++;
            this.currentSession = null;
            this.currentUser = null;
            this.loadedCloudUserId = null;
            this.loadingCloudUserId = null;
            this.updateAuthUI(null);
            this.switchToGuestState();
          }
        });
      } catch (subErr) {
        console.warn('Dayloom: Gagal memasang listener auth state change:', subErr);
      }
    }
  }

  /* =========================================================================
   * CADANGAN DATA (EXPORT / IMPORT BACKUP JSON & RESET)
   * ========================================================================= */
  bindBackupControls() {
    const exportBtn = document.getElementById('btn-export-backup');
    const importInput = document.getElementById('input-import-backup');
    const resetBtn = document.getElementById('btn-reset-data');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        sound.playClick();
        const jsonStr = exportBackupJSON(this.state);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dayloom_backup_${getRelativeDateStr(0)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.showToast('Berkas cadangan (JSON) berhasil diunduh!', 'success');
      });
    }

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const restored = importBackupJSON(String(ev.target.result));
            this.state = restored;
            this.applyTimeOfDayTheme(this.state.profile.timeOfDay || 'pagi');
            sound.playQuestComplete();
            this.refreshAllUI();
            this.showToast('Data cadangan berhasil dipulihkan dengan aman!', 'success');
          } catch (err) {
            sound.playWarning();
            this.showToast(err.message || 'Gagal memuat berkas cadangan.', 'warning');
          }
        };
        reader.readAsText(file);
        importInput.value = '';
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (window.confirm('Apakah kau yakin ingin mengatur ulang seluruh catatan perjalanan kembali ke awal? (Pastikan sudah mengunduh cadangan jika diperlukan).')) {
          this.state = createDefaultState();
          this.saveActiveState();
          this.refreshAllUI();
          this.showToast('Dunia Dayloom telah diatur ulang ke awal perjalanan.', 'info');
        }
      });
    }
  }

  /* =========================================================================
   * UTILITAS & NOTIFIKASI TOAST
   * ========================================================================= */
  getCategoryLabel(catId) {
    return CATEGORIES.find(c => c.id === catId)?.label || 'Lainnya';
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `rpg-toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">${escapeHTML(message)}</div>
      <button type="button" class="toast-close" aria-label="Tutup">&times;</button>
    `;

    container.appendChild(toast);
    toast.querySelector('.toast-close')?.addEventListener('click', () => toast.remove());

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    }, 4800);
  }
}

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  window.dayloomApp = new DayloomApp();
  window.dayloomApp.init();
});

