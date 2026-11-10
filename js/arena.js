/**
 * DAYLOOM — Modul Arena Dojo Benteng Awan
 * Menyediakan Lobi Arena, Persiapan Tempur, Antarmuka Kode Ruang (Simulasi Lokal Transparan),
 * serta Pertarungan Fokus Interaktif Berbasis Papan Ketik melawan Monster Penundaan.
 */

import { ARENA_BOSSES, PLAYABLE_CHARACTERS } from './config.js';
import { getCurrentRank, awardRPForPvPWin } from './progression.js';
import { getCharacterSVG, getMeliodasSVG, getBossSVG, getRankEmblemSVG } from './art.js';
import { sound } from './audio.js';
import { LocalPvPArenaGame } from './pvp-game.js';
import { ControlsModal } from './controls-modal.js';
import { InputManager } from './input.js';

const FOCUS_MANTRAS = [
  'MULAI SEKARANG',
  'SATU LANGKAH PASTI',
  'TENUN HARI INI',
  'FOKUS TANPA RAGU',
  'DISIPLIN ADALAH KUNCI',
  'TUNTASKAN MISI',
  'PIKIRAN JERNIH',
  'HADAPI TENGGAT',
  'TEKAD BAJA HANAMORI',
  'KONSISTEN SETIAP HARI'
];

export class ArenaController {
  constructor({ getState, onSaveState, onNotify }) {
    this.getState = getState;
    this.onSaveState = onSaveState;
    this.onNotify = onNotify;

    this.selectedBossId = ARENA_BOSSES[0].id;
    this.selectedTaskId = '';
    this.roomCode = 'HNM-' + Math.floor(1000 + Math.random() * 9000);
    this.joinedCompanion = null;

    // State Pertarungan Aktif
    this.battle = {
      active: false,
      boss: null,
      bossHp: 100,
      bossMaxHp: 100,
      playerEnergy: 100,
      combo: 0,
      maxCombo: 0,
      timeLeft: 60,
      currentMantra: '',
      typedProgress: '',
      timerId: null,
      combatLog: []
    };

    this.boundKeyHandler = (e) => this.handleBattleKeydown(e);
  }

  init() {
    window.addEventListener('keydown', this.boundKeyHandler);
  }

  render() {
    const container = document.getElementById('arena-view-content');
    if (!container) return;

    const state = this.getState();
    const rank = getCurrentRank(state.rp);
    const activeTasks = state.tasks.filter(t => t.status !== 'selesai');
    const selectedBoss = ARENA_BOSSES.find(b => b.id === this.selectedBossId) || ARENA_BOSSES[0];
    const selectedCharId = state.profile?.selectedCharacter === 'meliodas' ? 'meliodas' : 'traveler';
    const selectedCharConfig = PLAYABLE_CHARACTERS.find(c => c.id === selectedCharId) || PLAYABLE_CHARACTERS[0];

    if (!this.selectedTaskId && activeTasks.length > 0) {
      this.selectedTaskId = activeTasks[0].id;
    }

    if (this.battle.active) {
      this.renderActiveBattle(container, state, rank);
      return;
    }

    const fighterAvatarMarkup = selectedCharId === 'meliodas'
      ? getMeliodasSVG({ mode: 'normal', size: 130, facing: 'right' })
      : getCharacterSVG({
          outfitId: state.profile.outfit,
          hatId: state.profile.hat,
          rankId: rank.id,
          size: 130,
          facing: 'right'
        });

    container.innerHTML = `
      <!-- Banner Transparansi Prototipe Ruang Daring -->
      <div class="arena-prototype-notice">
        <strong>Mode Dojo Lokal & Prototipe Lobi:</strong>
        Pertarungan Uji Fokus menggunakan papan ketik berfungsi penuh secara lokal dan terhubung langsung ke pencapaianmu.
        Fitur Kode Ruang & Undangan Rekan di bawah ini adalah <em>simulasi antarmuka lokal</em> (tanpa server multipemain daring eksternal).
      </div>

      <div class="arena-lobby-grid">
        <!-- Kolom Kiri: Profil Petarung, Karusel Pemilihan Karakter, & Ruang Lobi -->
        <div class="rpg-panel arena-fighter-panel">
          <div class="panel-header-row">
            <span class="rpg-tag">Profil Pendekar</span>
            <span class="arena-win-badge">Kemenangan Dojo: ${state.arenaStats?.wins || 0}</span>
          </div>

          <div class="arena-fighter-showcase">
            <div class="fighter-avatar-stage" id="arena-fighter-avatar-stage">
              ${fighterAvatarMarkup}
            </div>
            <div class="fighter-details">
              <div class="fighter-rank-row">
                ${getRankEmblemSVG(rank.id, 42)}
                <div>
                  <h3>${escapeHTML(selectedCharConfig.name)} <small class="fighter-player-sub">(${escapeHTML(state.profile.name)})</small></h3>
                  <span class="fighter-title">${escapeHTML(selectedCharConfig.role)} • ${escapeHTML(selectedCharConfig.weapon)}</span>
                </div>
              </div>
              <div class="fighter-stat-pills">
                <span>Peringkat: <strong>${rank.name} (${state.rp} RP)</strong></span>
                <span>Kombo Terbaik: <strong>${state.arenaStats?.bestCombo || 0}x</strong></span>
              </div>
            </div>
          </div>

          <!-- Karusel Horizontal Pemilihan Karakter Playable (Traveler & Meliodas) -->
          <div class="arena-character-carousel" id="arena-character-carousel" aria-label="Pemilihan Karakter Arena">
            <div class="char-carousel-header">
              <span class="char-carousel-title">Pilih Petarung Arena (Playable Character)</span>
              <div class="char-carousel-nav">
                <button type="button" class="btn-char-slide" id="btn-char-prev" data-char-nav="prev" aria-label="Karakter Sebelumnya">&#9664;</button>
                <span class="char-carousel-indicator">${selectedCharId === 'meliodas' ? '2 / 2' : '1 / 2'}</span>
                <button type="button" class="btn-char-slide" id="btn-char-next" data-char-nav="next" aria-label="Karakter Berikutnya">&#9654;</button>
              </div>
            </div>

            <div class="char-carousel-track">
              ${PLAYABLE_CHARACTERS.map(ch => {
                const isSelected = ch.id === selectedCharId;
                const miniSprite = ch.id === 'meliodas'
                  ? getMeliodasSVG({ mode: 'normal', size: 58, facing: 'right' })
                  : getCharacterSVG({
                      outfitId: state.profile.outfit,
                      hatId: state.profile.hat,
                      rankId: rank.id,
                      size: 58,
                      facing: 'right'
                    });
                return `
                  <button type="button" class="char-carousel-card ${isSelected ? 'active' : ''}" data-select-character="${ch.id}" aria-pressed="${isSelected}">
                    <div class="char-card-sprite">${miniSprite}</div>
                    <div class="char-card-meta">
                      <div class="char-card-name-row">
                        <strong>${escapeHTML(ch.name)}</strong>
                        ${isSelected ? '<span class="char-selected-pill">Aktif</span>' : ''}
                      </div>
                      <small class="char-card-weapon">${escapeHTML(ch.weapon)}</small>
                      <span class="char-card-kit">Q: ${escapeHTML(ch.qSkillName)} • R: ${escapeHTML(ch.rUltimateName)}</span>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>

            <div class="char-combat-identity-bar">
              <div><strong>Serangan Dasar:</strong> ${escapeHTML(selectedCharConfig.basicName)}</div>
              <div><strong>Skill [Q] ${escapeHTML(selectedCharConfig.qSkillName)}:</strong> ${escapeHTML(selectedCharConfig.qSkillDesc)}</div>
              <div><strong>Ultimate [R] ${escapeHTML(selectedCharConfig.rUltimateName)}:</strong> ${escapeHTML(selectedCharConfig.rUltimateDesc)}</div>
            </div>
          </div>

          <!-- Antarmuka Kode Ruang & Undangan Teman (Simulasi Teridentifikasi) -->
          <div class="arena-room-box">
            <h4>Ruang Latihan Bersama (Simulasi Lobi)</h4>
            <div class="room-code-display-row">
              <div class="room-code-badge">
                <small>Kode Ruangmu</small>
                <strong id="arena-room-code-text">${this.roomCode}</strong>
              </div>
              <button type="button" class="btn-pixel btn-secondary" id="btn-copy-room">Salin Kode</button>
              <button type="button" class="btn-pixel btn-secondary" id="btn-regen-room">Acak Ulang</button>
            </div>

            <div class="room-join-row">
              <input type="text" id="input-join-code" class="rpg-input" placeholder="Masukkan kode rekan (mis. HNM-2026)" maxlength="12" />
              <button type="button" class="btn-pixel btn-primary" id="btn-simulate-partner">Undang Rekan Simulasi</button>
            </div>

            ${this.joinedCompanion ? `
              <div class="companion-joined-banner">
                <strong>Rekan Latihan Terhubung (Simulasi Lokal):</strong> ${escapeHTML(this.joinedCompanion.name)} (${this.joinedCompanion.rank}) siap mendampingi sesi fokusmu (+15% Semangat Serangan!).
              </div>
            ` : `
              <small class="room-hint">Undang rekan latihan simulasi untuk mendapatkan bantuan serangan otomatis saat bertarung.</small>
            `}
          </div>
        </div>

        <!-- Kolom Kanan: Persiapan Pertarungan & Pemilihan Monster Penundaan -->
        <div class="rpg-panel arena-prep-panel">
          <span class="rpg-tag">Persiapan Pertarungan</span>
          <h3 class="panel-title">Pilih Lawan & Salurkan Fokus Misi</h3>

          <div class="form-group">
            <label for="arena-task-select">1. Pilih Misi Aktif yang Ingin Dikerjakan / Difokuskan:</label>
            <select id="arena-task-select" class="rpg-input">
              ${activeTasks.length === 0
                ? `<option value="">-- Semua misi telah tuntas! Latihan Bebas --</option>`
                : activeTasks.map(t => `<option value="${t.id}" ${t.id === this.selectedTaskId ? 'selected' : ''}>${escapeHTML(t.title)} (Tenggat: ${t.deadline})</option>`).join('')
              }
            </select>
          </div>

          <label class="boss-picker-label">2. Pilih Lawan Ujian Fokus:</label>
          <div class="boss-cards-grid">
            ${ARENA_BOSSES.map(boss => `
              <div class="boss-select-card ${boss.id === this.selectedBossId ? 'selected' : ''}" data-boss-id="${boss.id}">
                <div class="boss-card-art">${getBossSVG(boss.id, 78)}</div>
                <div class="boss-card-info">
                  <span class="boss-level-tag">${boss.level}</span>
                  <h4>${boss.name}</h4>
                  <p>${boss.desc}</p>
                  <div class="boss-meta">HP: ${boss.hp} | Durasi: ${boss.durationSec} dtk</div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="arena-controls-guide">
            <strong>Cara Bertarung (Interaksi Papan Ketik Desktop):</strong>
            <span>Ketik huruf pada <em>Mantra Fokus</em> yang muncul di layar atau tekan tombol jurus cepat <code>[1]</code> <code>[2]</code> <code>[3]</code> untuk melancarkan serangan fokus sebelum waktu habis!</span>
          </div>

          <button type="button" class="btn-pixel btn-primary btn-large-arena" id="btn-start-arena-battle">
            Mulai Pertarungan Fokus Melawan ${selectedBoss.name}
          </button>
        </div>
      </div>

      <!-- =====================================================================
           SEKSI BARU: LOCAL PvP ARENA ENTRY SECTION (VISUAL EXPANSION)
           ===================================================================== -->
      <section class="local-pvp-section" id="local-pvp-arena-section" aria-label="Local PvP Arena">
        <!-- Banner Ilustrasi Orisinal 2D Arena Pertarungan Lokal (Selaras dengan Dunia Desa & Arena) -->
        <div class="pvp-banner-stage">
          <svg class="pvp-banner-svg" viewBox="0 0 1280 540" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustrasi 2D Gerbang Torii Merah dan Arena Tanding Puncak Pegunungan Hanamori">
            <defs>
              <linearGradient id="pvpBannerSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#1B2A3D"/>
                <stop offset="42%" stop-color="#2E4C63"/>
                <stop offset="76%" stop-color="#6A8D92"/>
                <stop offset="100%" stop-color="#D8C8B8"/>
              </linearGradient>
              <radialGradient id="pvpBannerMoonGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#FFF3D6" stop-opacity="0.75"/>
                <stop offset="50%" stop-color="#E8A5B5" stop-opacity="0.32"/>
                <stop offset="100%" stop-color="#E8A5B5" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="pvpLanternGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#FFE08A" stop-opacity="0.85"/>
                <stop offset="55%" stop-color="#E17055" stop-opacity="0.35"/>
                <stop offset="100%" stop-color="#FFE08A" stop-opacity="0"/>
              </radialGradient>
            </defs>

            <!-- 1. Langit & Cakram Bulan/Surya Agung -->
            <rect width="1280" height="540" fill="url(#pvpBannerSky)"/>
            <circle cx="640" cy="185" r="210" fill="url(#pvpBannerMoonGlow)"/>
            <circle cx="640" cy="185" r="88" fill="#FFFBF2" opacity="0.9"/>

            <!-- Awan Ilustratif Halus -->
            <g fill="#F5EBDD" opacity="0.35">
              <rect x="160" y="78" width="180" height="22" rx="11"/>
              <rect x="195" y="64" width="110" height="18" rx="9"/>
              <rect x="890" y="92" width="210" height="24" rx="12"/>
              <rect x="935" y="76" width="120" height="18" rx="9"/>
            </g>

            <!-- 2. Pegunungan Suci Hanamori & Siluet Pagoda -->
            <path d="M-40 440 C110 260, 220 170, 350 185 C460 195, 520 270, 640 120 C760 270, 820 195, 930 185 C1060 170, 1170 260, 1320 440 Z" fill="#385266" stroke="#26364A" stroke-width="2.5"/>
            <path d="M582 178 Q640 108 698 178 L672 192 L640 168 L608 192 Z" fill="#F5EBDD" opacity="0.55"/>

            <!-- Kabut Lembah -->
            <rect x="0" y="310" width="1280" height="110" fill="#F5EBDD" opacity="0.28"/>

            <!-- 3. Roda Tenun Kuil Agung di Tengah -->
            <g transform="translate(640, 275)" opacity="0.32" stroke="#FFE08A" fill="none">
              <circle cx="0" cy="0" r="115" stroke-width="3"/>
              <circle cx="0" cy="0" r="88" stroke-width="2" stroke-dasharray="8 6"/>
            </g>

            <!-- 4. Pohon Sakura Ilustratif Kiri & Kanan (Gaya Nine Sols + Dunia Desa) -->
            <!-- Pohon Kiri -->
            <g>
              <path d="M70 460 Q85 330 135 235 Q165 180 230 155 L242 172 Q180 202 156 255 Q120 340 116 460 Z" fill="#523A2B" stroke="#26364A" stroke-width="2.5"/>
              <ellipse cx="165" cy="195" rx="78" ry="44" fill="#C86D85" stroke="#26364A" stroke-width="2.5"/>
              <ellipse cx="235" cy="155" rx="88" ry="48" fill="#E8A5B5" stroke="#26364A" stroke-width="2.5"/>
              <ellipse cx="135" cy="150" rx="68" ry="38" fill="#F3C1CE" stroke="#26364A" stroke-width="2.5"/>
              <ellipse cx="205" cy="122" rx="72" ry="36" fill="#FCE4EC" stroke="#26364A" stroke-width="2.5"/>
            </g>
            <!-- Pohon Kanan -->
            <g>
              <path d="M1210 460 Q1195 330 1145 235 Q1115 180 1050 155 L1038 172 Q1100 202 1124 255 Q1160 340 1164 460 Z" fill="#523A2B" stroke="#26364A" stroke-width="2.5"/>
              <ellipse cx="1115" cy="195" rx="78" ry="44" fill="#C86D85" stroke="#26364A" stroke-width="2.5"/>
              <ellipse cx="1045" cy="155" rx="88" ry="48" fill="#E8A5B5" stroke="#26364A" stroke-width="2.5"/>
              <ellipse cx="1145" cy="150" rx="68" ry="38" fill="#F3C1CE" stroke="#26364A" stroke-width="2.5"/>
              <ellipse cx="1075" cy="122" rx="72" ry="36" fill="#FCE4EC" stroke="#26364A" stroke-width="2.5"/>
            </g>

            <!-- 5. Altar & Paviliun Dojo Bela Diri Kiri & Kanan (Tanpa Kesan Warung Pasar) -->
            <!-- Altar Kiri -->
            <g>
              <rect x="145" y="345" width="210" height="95" fill="#3B4D5E" stroke="#26364A" stroke-width="2.5"/>
              <rect x="175" y="210" width="12" height="135" fill="#6E4F3E" stroke="#26364A" stroke-width="2"/>
              <rect x="313" y="210" width="12" height="135" fill="#6E4F3E" stroke="#26364A" stroke-width="2"/>
              <!-- Atap Lengkung Dojo Kiri -->
              <path d="M135 208 Q250 176 365 208 L352 222 Q250 196 148 222 Z" fill="#26364A" stroke="#FFE08A" stroke-width="2"/>
              <!-- Pijakan Teras Batu Kiri -->
              <rect x="125" y="335" width="250" height="18" rx="4" fill="#4A6274" stroke="#26364A" stroke-width="2.5"/>
              <rect x="128" y="336" width="244" height="5" fill="#8DA2B5"/>
            </g>
            <!-- Altar Kanan -->
            <g>
              <rect x="925" y="345" width="210" height="95" fill="#3B4D5E" stroke="#26364A" stroke-width="2.5"/>
              <rect x="955" y="210" width="12" height="135" fill="#6E4F3E" stroke="#26364A" stroke-width="2"/>
              <rect x="1093" y="210" width="12" height="135" fill="#6E4F3E" stroke="#26364A" stroke-width="2"/>
              <!-- Atap Lengkung Dojo Kanan -->
              <path d="M915 208 Q1030 176 1145 208 L1132 222 Q1030 196 928 222 Z" fill="#26364A" stroke="#FFE08A" stroke-width="2"/>
              <!-- Pijakan Teras Batu Kanan -->
              <rect x="905" y="335" width="250" height="18" rx="4" fill="#4A6274" stroke="#26364A" stroke-width="2.5"/>
              <rect x="908" y="336" width="244" height="5" fill="#8DA2B5"/>
            </g>

            <!-- 6. Gerbang Torii Merah Agung di Tengah -->
            <g>
              <rect x="505" y="245" width="18" height="195" fill="#B83A4B" stroke="#26364A" stroke-width="2.5"/>
              <rect x="757" y="245" width="18" height="195" fill="#B83A4B" stroke="#26364A" stroke-width="2.5"/>
              <rect x="501" y="412" width="26" height="28" fill="#26364A"/>
              <rect x="753" y="412" width="26" height="28" fill="#26364A"/>
              <rect x="478" y="268" width="324" height="12" fill="#942636" stroke="#26364A" stroke-width="2.5"/>
              <!-- Kasagi Atas -->
              <path d="M448 232 Q640 208 832 232 L824 250 Q640 230 456 250 Z" fill="#B83A4B" stroke="#26364A" stroke-width="2.5"/>
              <rect x="622" y="238" width="36" height="26" fill="#26364A" stroke="#FFE08A" stroke-width="2"/>
              <!-- Lentera Torii -->
              <circle cx="640" cy="295" r="38" fill="url(#pvpLanternGlow)"/>
              <rect x="632" y="284" width="16" height="20" fill="#FFE08A" stroke="#26364A" stroke-width="2"/>
            </g>

            <!-- 7. Jembatan Tempur Utama & Lentera Batu -->
            <rect x="0" y="440" width="1280" height="100" fill="#26364A"/>
            <rect x="40" y="432" width="1200" height="18" rx="4" fill="#5A3D28" stroke="#26364A" stroke-width="2.5"/>
            <rect x="44" y="434" width="1192" height="5" fill="#C4B097"/>

            <!-- Lentera Batu Kiri & Kanan -->
            <circle cx="425" cy="402" r="36" fill="url(#pvpLanternGlow)"/>
            <rect x="417" y="394" width="16" height="14" fill="#FFE08A" stroke="#26364A" stroke-width="2"/>
            <polygon points="410,394 425,382 440,394" fill="#524E48" stroke="#26364A" stroke-width="2"/>

            <circle cx="855" cy="402" r="36" fill="url(#pvpLanternGlow)"/>
            <rect x="847" y="394" width="16" height="14" fill="#FFE08A" stroke="#26364A" stroke-width="2"/>
            <polygon points="840,394 855,382 870,394" fill="#524E48" stroke="#26364A" stroke-width="2"/>

            <!-- Kelopak Sakura Melayang -->
            <g fill="#F3C1CE" opacity="0.85">
              <ellipse cx="320" cy="140" rx="6" ry="3.5" transform="rotate(-25 320 140)"/>
              <ellipse cx="480" cy="190" rx="5" ry="3" transform="rotate(15 480 190)"/>
              <ellipse cx="790" cy="160" rx="6.5" ry="3.5" transform="rotate(-35 790 160)"/>
              <ellipse cx="940" cy="240" rx="5.5" ry="3" transform="rotate(20 940 240)"/>
            </g>
          </svg>
          <div class="pvp-banner-overlay">
            <div class="pvp-banner-badges">
              <span class="pvp-badge-mode">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="18 2 22 6 7 21 3 21 3 17 18 2"/><line x1="14" y1="6" x2="18" y2="10"/></svg>
                Mode Tempur 1 vs 1 Lokal
              </span>
              <span class="pvp-badge-status">Pratinjau Eksklusif</span>
            </div>
            <div class="pvp-banner-caption-bar">
              <div class="pvp-arena-callout">Benteng Puncak Awan Hanamori</div>
              <h3>LOCAL PvP ARENA</h3>
            </div>
          </div>
        </div>

        <!-- Konten Penjelasan & Tombol Akses Masuk Arena -->
        <div class="pvp-content-body">
          <div class="pvp-header-row">
            <div class="pvp-title-group">
              <h4>LOCAL PvP ARENA</h4>
              <p>Gerbang arena tanding fisik antar dua pendekar di satu layar perangkat. Uji ketajaman fokus dan kecepatan tenunan harian dalam duel duel waktu nyata melawan rekan sebelahmu.</p>
            </div>
          </div>

          <div class="pvp-preview-features-grid">
            <div class="pvp-feature-item">
              <div class="pvp-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="pvp-feature-text">
                <strong>Pertarungan Satu Layar (2 Pemain)</strong>
                <small>Duel lokal seimbang: Pemain 1 (WASD) vs Pemain 2 (Tombol Panah).</small>
              </div>
            </div>

            <div class="pvp-feature-item">
              <div class="pvp-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
              </div>
              <div class="pvp-feature-text">
                <strong>Adu Kecepatan Menenun Mantra</strong>
                <small>Ketik mantra fokus harian lebih cepat untuk melancarkan serangan kombinasi.</small>
              </div>
            </div>

            <div class="pvp-feature-item">
              <div class="pvp-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div class="pvp-feature-text">
                <strong>Tanpa Server Luar (Privat & Cepat)</strong>
                <small>Bermain langsung tanpa latensi jaringan internet dan tanpa akun pihak ketiga.</small>
              </div>
            </div>
          </div>

          <div class="pvp-action-bar">
            <div class="pvp-status-notice">
              <span class="pvp-status-dot"></span>
              <span>Tahap Pembangunan Arena — Pratinjau Desain &amp; Lingkungan Tempur Siap</span>
            </div>
            <button type="button" class="btn-enter-pvp" id="btn-open-pvp-preview">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Masuki Local PvP Arena (Pratinjau)
            </button>
          </div>
        </div>
      </section>
    `;

    this.bindLobbyEvents();
  }

  bindLobbyEvents() {
    const copyBtn = document.getElementById('btn-copy-room');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        sound.playClick();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(this.roomCode).catch(() => {});
        }
        this.onNotify(`Kode ruang ${this.roomCode} disalin ke papan klip!`);
      });
    }

    const regenBtn = document.getElementById('btn-regen-room');
    if (regenBtn) {
      regenBtn.addEventListener('click', () => {
        sound.playClick();
        this.roomCode = 'HNM-' + Math.floor(1000 + Math.random() * 9000);
        this.render();
      });
    }

    const partnerBtn = document.getElementById('btn-simulate-partner');
    if (partnerBtn) {
      partnerBtn.addEventListener('click', () => {
        sound.playCheck();
        const inputCode = document.getElementById('input-join-code')?.value?.trim();
        const names = ['Aoi si Penenun Senja', 'Kenji Pendekar Sakura', 'Hana Penjaga Lentera'];
        const chosen = names[Math.floor(Math.random() * names.length)];
        this.joinedCompanion = {
          name: inputCode ? `Rekan [${inputCode.toUpperCase()}] - ${chosen}` : chosen,
          rank: 'Mythic'
        };
        this.onNotify(`${this.joinedCompanion.name} bergabung ke lobi latihan simulasi!`);
        this.render();
      });
    }

    const taskSelect = document.getElementById('arena-task-select');
    if (taskSelect) {
      taskSelect.addEventListener('change', (e) => {
        this.selectedTaskId = e.target.value;
      });
    }

    // Event Pemilihan Karakter di Karusel Profil Pendekar
    document.querySelectorAll('[data-select-character]').forEach(btn => {
      btn.addEventListener('click', () => {
        const charId = btn.getAttribute('data-select-character');
        this.selectCharacter(charId);
      });
    });

    document.querySelectorAll('[data-char-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const state = this.getState();
        const cur = state.profile?.selectedCharacter === 'meliodas' ? 'meliodas' : 'traveler';
        const next = cur === 'traveler' ? 'meliodas' : 'traveler';
        this.selectCharacter(next);
      });
    });

    document.querySelectorAll('[data-boss-id]').forEach(card => {
      card.addEventListener('click', () => {
        sound.playClick();
        this.selectedBossId = card.getAttribute('data-boss-id');
        this.render();
      });
    });

    const startBtn = document.getElementById('btn-start-arena-battle');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        sound.playClick();
        this.startBattle();
      });
    }

    const pvpPreviewBtn = document.getElementById('btn-open-pvp-preview');
    if (pvpPreviewBtn) {
      pvpPreviewBtn.addEventListener('click', () => {
        sound.playClick();
        this.showPvpPreviewModal();
      });
    }
  }

  selectCharacter(charId) {
    const validId = charId === 'meliodas' ? 'meliodas' : 'traveler';
    const state = this.getState();
    state.profile = state.profile || {};
    if (state.profile.selectedCharacter === validId) return;
    state.profile.selectedCharacter = validId;
    sound.playCheck();
    this.onSaveState();
    const charMeta = PLAYABLE_CHARACTERS.find(c => c.id === validId) || PLAYABLE_CHARACTERS[0];
    this.onNotify(`Petarung terpilih: ${charMeta.name} (${charMeta.weapon})`);
    this.render();
  }

  showPvpPreviewModal() {
    // Hapus modal lama jika ada
    const oldModal = document.getElementById('pvp-destination-modal');
    if (oldModal) {
      if (this.pvpGame) this.pvpGame.stop();
      oldModal.remove();
    }

    const state = this.getState();
    const rank = getCurrentRank(state.rp);
    let p1Char = state.profile?.selectedCharacter === 'meliodas' ? 'meliodas' : 'traveler';
    let p2Char = p1Char === 'meliodas' ? 'traveler' : 'meliodas';
    let p1Ready = false;
    let p2Ready = false;

    const modal = document.createElement('div');
    modal.id = 'pvp-destination-modal';
    modal.className = 'pvp-destination-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Floating Arena Viewport — Local PvP Arena');

    const renderKitInfo = (charId, facing = 'right') => {
      const isMeliodas = charId === 'meliodas';
      const spriteSvg = isMeliodas
        ? getMeliodasSVG({ mode: 'normal', size: 76, facing })
        : getCharacterSVG({ outfitId: state.profile?.outfit, hatId: state.profile?.hat, rankId: rank.id, size: 76, facing });
      const kitHtml = isMeliodas
        ? `<div><strong>Meliodas (Dragon Sin)</strong></div>
           <div>🗡️ Basic: Lostvayne 5-Kombo</div>
           <div>🔥 [Q] Hellblaze Erupsi Tanah</div>
           <div>👑 [R] Assault Mode (+50% Atribut)</div>`
        : `<div><strong>Traveler (Penenun Hanamori)</strong></div>
           <div>⚔️ Basic: Pedang Angin 3-Kombo</div>
           <div>🌪️ [Q] Phoenix Blast Jarak Jauh</div>
           <div>🔥 [R] Inferno Domain (Area Burn)</div>`;
      return `
        <div class="preview-sprite-stage">${spriteSvg}</div>
        <div class="preview-kit-info">${kitHtml}</div>
      `;
    };

    modal.innerHTML = `
      <!-- Floating Arena Viewport (~80% content area, preserving background) -->
      <div class="pvp-floating-frame">
        <!-- Frame Topbar -->
        <div class="pvp-frame-header">
          <div class="pvp-arena-brand">
            <span class="pvp-brand-tag">Duel 1v1 Satu Layar</span>
            <h2>LOCAL PvP ARENA</h2>
          </div>
          <div class="pvp-header-actions">
            <button type="button" class="btn-open-controls" id="btn-arena-controls" title="Pengaturan Kontrol dan Gamepad">
              🎮 Kontrol
            </button>
            <button type="button" class="btn-pvp-char-pill" id="btn-reopen-char-select" style="display:none;" title="Ganti Petarung">
              👥 Pilih Petarung
            </button>
            <button type="button" class="btn-exit-pvp" id="btn-close-pvp-destination">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              Tutup Arena
            </button>
          </div>
        </div>

        <!-- 2D Canvas Playable Arena Viewport -->
        <div class="pvp-canvas-stage" id="pvp-canvas-stage">
          <canvas id="pvp-arena-canvas" width="1280" height="720"></canvas>

          <!-- Character Select 1v1 Overlay -->
          <div class="pvp-character-select-overlay" id="pvp-character-select-overlay">
            <div class="pvp-select-header">
              <span class="rpg-tag" style="margin-bottom:0.4rem; display:inline-block;">DUEL LOKAL DUA PEMAIN</span>
              <h3>PILIH PETARUNG ARENA</h3>
              <p>Player 1 (Keyboard WASD / Gamepad 1) vs Player 2 (Keyboard Panah / Gamepad 2) • Satu Layar Laptop</p>
            </div>

            <div class="pvp-select-grid">
              <!-- Player 1 Panel -->
              <div class="player-select-panel p1-side" id="p1-select-panel">
                <div class="panel-player-badge">
                  <span class="player-tag p1-tag">Pemain 1</span>
                  <span class="player-device-tag">🎮 WASD / Pad 1</span>
                </div>
                <div class="select-card-picker">
                  <button type="button" class="char-pick-btn ${p1Char === 'traveler' ? 'selected' : ''}" data-p1-char="traveler">
                    <div class="pick-thumb">${getCharacterSVG({ outfitId: state.profile?.outfit, hatId: state.profile?.hat, rankId: rank.id, size: 48, facing: 'right' })}</div>
                    <span class="pick-name">Traveler</span>
                  </button>
                  <button type="button" class="char-pick-btn ${p1Char === 'meliodas' ? 'selected' : ''}" data-p1-char="meliodas">
                    <div class="pick-thumb">${getMeliodasSVG({ mode: 'normal', size: 48, facing: 'right' })}</div>
                    <span class="pick-name">Meliodas</span>
                  </button>
                </div>
                <div class="player-preview-display" id="p1-preview-stage">
                  ${renderKitInfo(p1Char, 'right')}
                </div>
                <button type="button" class="btn-ready-toggle" id="btn-p1-ready">SIAP (READY)</button>
              </div>

              <!-- VS Divider -->
              <div class="pvp-vs-divider">
                <div class="vs-circle">VS</div>
                <span style="font-size:0.72rem; color:#FFE08A; font-weight:800; letter-spacing:0.06em;">DUEL LOKAL</span>
              </div>

              <!-- Player 2 Panel -->
              <div class="player-select-panel p2-side" id="p2-select-panel">
                <div class="panel-player-badge">
                  <span class="player-tag p2-tag">Pemain 2</span>
                  <span class="player-device-tag">🎮 Panah / Pad 2</span>
                </div>
                <div class="select-card-picker">
                  <button type="button" class="char-pick-btn ${p2Char === 'traveler' ? 'selected' : ''}" data-p2-char="traveler">
                    <div class="pick-thumb">${getCharacterSVG({ outfitId: 'adventurer', hatId: 'none', rankId: rank.id, size: 48, facing: 'left' })}</div>
                    <span class="pick-name">Traveler</span>
                  </button>
                  <button type="button" class="char-pick-btn ${p2Char === 'meliodas' ? 'selected' : ''}" data-p2-char="meliodas">
                    <div class="pick-thumb">${getMeliodasSVG({ mode: 'normal', size: 48, facing: 'left' })}</div>
                    <span class="pick-name">Meliodas</span>
                  </button>
                </div>
                <div class="player-preview-display" id="p2-preview-stage">
                  ${renderKitInfo(p2Char, 'left')}
                </div>
                <button type="button" class="btn-ready-toggle" id="btn-p2-ready">SIAP (READY)</button>
              </div>
            </div>

            <!-- Footer -->
            <div class="pvp-select-footer">
              <button type="button" class="btn-switch-pve-mode" id="btn-start-pve-sparring">
                🥊 Mode Latihan Solo (vs Oni)
              </button>
              <button type="button" class="btn-start-1v1-match" id="btn-start-1v1-match" disabled>
                ⚔️ MULAI PERTANDINGAN (1v1)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const charSelectOverlay = modal.querySelector('#pvp-character-select-overlay');
    const p1PreviewStage = modal.querySelector('#p1-preview-stage');
    const p2PreviewStage = modal.querySelector('#p2-preview-stage');
    const btnP1Ready = modal.querySelector('#btn-p1-ready');
    const btnP2Ready = modal.querySelector('#btn-p2-ready');
    const btnStart1v1 = modal.querySelector('#btn-start-1v1-match');
    const btnStartPve = modal.querySelector('#btn-start-pve-sparring');
    const btnReopenChar = modal.querySelector('#btn-reopen-char-select');
    const btnArenaControls = modal.querySelector('#btn-arena-controls');

    const updateReadyState = () => {
      btnP1Ready.classList.toggle('is-ready', p1Ready);
      btnP1Ready.textContent = p1Ready ? '✓ SIAP (BATALKAN)' : 'SIAP (READY)';

      btnP2Ready.classList.toggle('is-ready', p2Ready);
      btnP2Ready.textContent = p2Ready ? '✓ SIAP (BATALKAN)' : 'SIAP (READY)';

      btnStart1v1.disabled = !(p1Ready && p2Ready);
    };

    // P1 Character Selection
    modal.querySelectorAll('[data-p1-char]').forEach(btn => {
      btn.addEventListener('click', () => {
        const char = btn.getAttribute('data-p1-char');
        if (p1Char !== char) {
          sound.playClick();
          p1Char = char;
          state.profile.selectedCharacter = p1Char;
          this.onSaveState();
          p1Ready = false;
          modal.querySelectorAll('[data-p1-char]').forEach(b => {
            b.classList.toggle('selected', b.getAttribute('data-p1-char') === p1Char);
          });
          p1PreviewStage.innerHTML = renderKitInfo(p1Char, 'right');
          updateReadyState();
          this.render();
        }
      });
    });

    // P2 Character Selection
    modal.querySelectorAll('[data-p2-char]').forEach(btn => {
      btn.addEventListener('click', () => {
        const char = btn.getAttribute('data-p2-char');
        if (p2Char !== char) {
          sound.playClick();
          p2Char = char;
          p2Ready = false;
          modal.querySelectorAll('[data-p2-char]').forEach(b => {
            b.classList.toggle('selected', b.getAttribute('data-p2-char') === p2Char);
          });
          p2PreviewStage.innerHTML = renderKitInfo(p2Char, 'left');
          updateReadyState();
        }
      });
    });

    // Ready Toggles
    btnP1Ready.addEventListener('click', () => {
      sound.playCheck();
      p1Ready = !p1Ready;
      updateReadyState();
    });

    btnP2Ready.addEventListener('click', () => {
      sound.playCheck();
      p2Ready = !p2Ready;
      updateReadyState();
    });

    const handleClose = () => {
      sound.playClick();
      if (this.pvpGame) this.pvpGame.stop();
      modal.remove();
    };

    // Start 1v1 Match
    btnStart1v1.addEventListener('click', () => {
      if (!p1Ready || !p2Ready) return;
      sound.playClick();
      charSelectOverlay.style.display = 'none';
      btnReopenChar.style.display = 'inline-flex';

      if (this.pvpGame) this.pvpGame.stop();
      this.pvpGame = new LocalPvPArenaGame({
        container: modal,
        profile: state.profile,
        rank,
        characterId: p1Char,
        characterIdP2: p2Char,
        gameMode: 'pvp',
        onClose: handleClose,
        onBackToSelect: () => {
          btnReopenChar.click();
        },
        onMatchEnd: (result) => {
          if (result.winnerNum === 1) {
            const res = awardRPForPvPWin(state, result.matchId, {
              reason: `Kemenangan Local 1v1 PvP Arena (${result.winnerChar} vs ${result.loserChar})`
            });
            if (res.awarded) {
              this.onSaveState();
              if (res.rankedUp) {
                this.onNotify(`🎉 Kemenangan 1v1 PvP (+20 RP)! NAIK PERINGKAT ke ${res.newRank.name}!`);
              } else {
                this.onNotify(`🏆 Kemenangan 1v1 PvP (+20 RP)! Total RP: ${state.rp}`);
              }
              this.render();
            }
          } else {
            this.onNotify('Pertarungan 1v1 selesai. Tetap semangat dan coba lagi! (+0 RP)');
          }
        }
      });
      this.pvpGame.start();
    });

    // Start PvE Mode
    btnStartPve.addEventListener('click', () => {
      sound.playClick();
      charSelectOverlay.style.display = 'none';
      btnReopenChar.style.display = 'inline-flex';

      if (this.pvpGame) this.pvpGame.stop();
      this.pvpGame = new LocalPvPArenaGame({
        container: modal,
        profile: state.profile,
        rank,
        characterId: p1Char,
        gameMode: 'pve',
        onClose: handleClose,
        onBackToSelect: () => {
          btnReopenChar.click();
        },
        onMatchEnd: (result) => {
          if (result.winnerNum === 1) {
            this.finishBattle(true);
          } else {
            this.finishBattle(false);
          }
        }
      });
      this.pvpGame.start();
    });

    // Reopen Character Select
    btnReopenChar.addEventListener('click', () => {
      sound.playClick();
      if (this.pvpGame) this.pvpGame.stop();
      charSelectOverlay.style.display = 'flex';
      btnReopenChar.style.display = 'none';
      p1Ready = false;
      p2Ready = false;
      updateReadyState();
    });

    // Open Controls & Gamepad Modal
    btnArenaControls.addEventListener('click', () => {
      sound.playClick();
      const inputMgr = this.pvpGame ? this.pvpGame.inputManager : new InputManager();
      const controlsModal = new ControlsModal({ inputManager: inputMgr });
      controlsModal.show();
    });

    const closeBtn = document.getElementById('btn-close-pvp-destination');
    if (closeBtn) closeBtn.addEventListener('click', handleClose);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        handleClose();
      }
    });
  }
  startBattle() {
    const boss = ARENA_BOSSES.find(b => b.id === this.selectedBossId) || ARENA_BOSSES[0];
    this.battle = {
      active: true,
      boss,
      bossHp: boss.hp,
      bossMaxHp: boss.hp,
      playerEnergy: 100,
      combo: 0,
      maxCombo: 0,
      timeLeft: boss.durationSec,
      currentMantra: this.pickNextMantra(),
      typedProgress: '',
      timerId: null,
      combatLog: [`Pertarungan dimulai! Hadapi ${boss.name} dengan konsentrasi penuh!`]
    };

    this.battle.timerId = setInterval(() => {
      if (!this.battle.active) return;
      this.battle.timeLeft -= 1;

      // Bantuan serangan rekan simulasi setiap 5 detik
      if (this.joinedCompanion && this.battle.timeLeft % 5 === 0 && this.battle.bossHp > 0) {
        this.battle.bossHp = Math.max(0, this.battle.bossHp - 6);
        this.battle.combatLog.unshift(`${this.joinedCompanion.name} melancarkan Serangan Bantuan (-6 HP)!`);
        if (this.battle.bossHp <= 0) {
          this.finishBattle(true);
          return;
        }
      }

      if (this.battle.timeLeft <= 0) {
        this.finishBattle(this.battle.bossHp <= 0);
        return;
      }
      this.updateBattleHUD();
    }, 1000);

    this.render();
  }

  pickNextMantra() {
    return FOCUS_MANTRAS[Math.floor(Math.random() * FOCUS_MANTRAS.length)];
  }

  renderActiveBattle(container, state, rank) {
    const b = this.battle;
    const hpPercent = Math.max(0, Math.round((b.bossHp / b.bossMaxHp) * 100));
    const remainingText = b.currentMantra.slice(b.typedProgress.length);

    container.innerHTML = `
      <div class="rpg-panel arena-battle-stage">
        <div class="battle-top-bar">
          <div class="battle-timer-box">
            <span>Sisa Waktu Fokus</span>
            <strong id="battle-timer-val">${b.timeLeft} dtk</strong>
          </div>
          <div class="battle-combo-box">
            <span>Rantai Kombo Fokus</span>
            <strong id="battle-combo-val">${b.combo}x</strong>
          </div>
          <button type="button" class="btn-pixel btn-danger" id="btn-flee-battle">Mundur ke Lobi</button>
        </div>

        <div class="battle-combatants-arena">
          <!-- Pemain -->
          <div class="combatant-side player-side" id="battle-player-actor">
            <div class="combatant-sprite">
              ${getCharacterSVG({
                outfitId: state.profile.outfit,
                hatId: state.profile.hat,
                rankId: rank.id,
                size: 135,
                facing: 'right'
              })}
            </div>
            <h4>${escapeHTML(state.profile.name)}</h4>
            <span class="rpg-tag">${rank.name}</span>
          </div>

          <!-- Tengah: Mantra Ketik Papan Ketik -->
          <div class="battle-center-prompt">
            <span class="prompt-instruction">Ketik Mantra Fokus di Papan Ketik (atau klik tombol jurus):</span>
            <div class="mantra-word-box" id="battle-mantra-box">
              <span class="mantra-typed">${escapeHTML(b.typedProgress)}</span><span class="mantra-untyped">${escapeHTML(remainingText)}</span>
            </div>
            <div class="quick-strike-buttons">
              <button type="button" class="btn-pixel btn-secondary" data-strike-dmg="12">Jurus [1]: Tebasan Niat (-12 HP)</button>
              <button type="button" class="btn-pixel btn-primary" data-strike-dmg="18">Jurus [2]: Panah Disiplin (-18 HP)</button>
            </div>
          </div>

          <!-- Boss Monster -->
          <div class="combatant-side boss-side" id="battle-boss-actor">
            <div class="boss-hp-header">
              <h4>${b.boss.name}</h4>
              <strong id="battle-boss-hp-text">${b.bossHp} / ${b.bossMaxHp} HP (${hpPercent}%)</strong>
            </div>
            <div class="boss-hp-bar-track">
              <div class="boss-hp-bar-fill" id="battle-boss-hp-bar" style="width: ${hpPercent}%"></div>
            </div>
            <div class="combatant-sprite boss-sprite-holder" id="boss-sprite-anim">
              ${getBossSVG(b.boss.id, 140)}
            </div>
          </div>
        </div>

        <div class="battle-log-box" id="battle-log-list">
          ${b.combatLog.slice(0, 4).map(line => `<div class="log-entry">${escapeHTML(line)}</div>`).join('')}
        </div>
      </div>
    `;

    const fleeBtn = document.getElementById('btn-flee-battle');
    if (fleeBtn) {
      fleeBtn.addEventListener('click', () => {
        this.stopBattleTimer();
        this.battle.active = false;
        this.render();
      });
    }

    document.querySelectorAll('[data-strike-dmg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dmg = Number(btn.getAttribute('data-strike-dmg')) || 12;
        this.dealDamage(dmg, 'Serangan Jurus Fokus');
      });
    });
  }

  handleBattleKeydown(e) {
    if (!this.battle.active) return;
    const arenaSection = document.getElementById('view-arena');
    if (!arenaSection || arenaSection.classList.contains('hidden')) return;

    if (e.key === '1') {
      this.dealDamage(12, 'Jurus Cepat [1] Tebasan Niat');
      return;
    }
    if (e.key === '2') {
      this.dealDamage(18, 'Jurus Cepat [2] Panah Disiplin');
      return;
    }

    const expectedChar = this.battle.currentMantra[this.battle.typedProgress.length];
    if (!expectedChar) return;

    const pressed = e.key.toUpperCase();
    if (pressed === expectedChar) {
      e.preventDefault();
      this.battle.typedProgress += expectedChar;
      this.battle.combo += 1;
      if (this.battle.combo > this.battle.maxCombo) {
        this.battle.maxCombo = this.battle.combo;
      }

      if (this.battle.typedProgress === this.battle.currentMantra) {
        // Mantra selesai diketik -> Serangan Kritikal!
        const bonusDmg = 28 + Math.min(20, Math.floor(this.battle.combo * 1.5));
        this.battle.currentMantra = this.pickNextMantra();
        this.battle.typedProgress = '';
        this.dealDamage(bonusDmg, `Mantra Tuntas! Serangan Kritikal Tenunan`);
      } else {
        sound.playClick();
        this.updateBattleHUD();
      }
    }
  }

  dealDamage(amount, label) {
    if (!this.battle.active) return;
    sound.playHit();
    this.battle.bossHp = Math.max(0, this.battle.bossHp - amount);
    this.battle.combatLog.unshift(`${label}: -${amount} HP pada ${this.battle.boss.name}!`);

    const bossSprite = document.getElementById('boss-sprite-anim');
    if (bossSprite) {
      bossSprite.classList.remove('hit-shake');
      void bossSprite.offsetWidth;
      bossSprite.classList.add('hit-shake');
    }

    if (this.battle.bossHp <= 0) {
      this.finishBattle(true);
    } else {
      this.updateBattleHUD();
    }
  }

  updateBattleHUD() {
    if (!this.battle.active) return;
    const b = this.battle;
    const timerEl = document.getElementById('battle-timer-val');
    const comboEl = document.getElementById('battle-combo-val');
    const hpTextEl = document.getElementById('battle-boss-hp-text');
    const hpBarEl = document.getElementById('battle-boss-hp-bar');
    const mantraBox = document.getElementById('battle-mantra-box');
    const logList = document.getElementById('battle-log-list');

    if (timerEl) timerEl.textContent = `${b.timeLeft} dtk`;
    if (comboEl) comboEl.textContent = `${b.combo}x`;

    const hpPercent = Math.max(0, Math.round((b.bossHp / b.bossMaxHp) * 100));
    if (hpTextEl) hpTextEl.textContent = `${b.bossHp} / ${b.bossMaxHp} HP (${hpPercent}%)`;
    if (hpBarEl) hpBarEl.style.width = `${hpPercent}%`;

    if (mantraBox) {
      const remainingText = b.currentMantra.slice(b.typedProgress.length);
      mantraBox.innerHTML = `<span class="mantra-typed">${escapeHTML(b.typedProgress)}</span><span class="mantra-untyped">${escapeHTML(remainingText)}</span>`;
    }

    if (logList) {
      logList.innerHTML = b.combatLog.slice(0, 4).map(line => `<div class="log-entry">${escapeHTML(line)}</div>`).join('');
    }
  }

  finishBattle(won) {
    this.stopBattleTimer();
    const bossName = this.battle.boss.name;
    const maxCombo = this.battle.maxCombo;
    this.battle.active = false;

    const state = this.getState();
    state.arenaStats = state.arenaStats || { wins: 0, totalSessions: 0, bestCombo: 0, totalFocusMinutes: 0 };
    state.arenaStats.totalSessions += 1;
    if (maxCombo > (state.arenaStats.bestCombo || 0)) {
      state.arenaStats.bestCombo = maxCombo;
    }

    if (won) {
      state.arenaStats.wins += 1;
      state.arenaStats.totalFocusMinutes += 5;
      sound.playQuestComplete();
      this.onSaveState();
      this.onNotify(`Kemenangan Gemilang! Kau berhasil menaklukkan ${bossName} di Arena Dojo!`);
    } else {
      sound.playWarning();
      this.onSaveState();
      this.onNotify(`Waktu habis! ${bossName} masih bertahan. Tarik napas dan coba lagi!`);
    }

    this.render();
  }

  stopBattleTimer() {
    if (this.battle.timerId) {
      clearInterval(this.battle.timerId);
      this.battle.timerId = null;
    }
  }
}

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

