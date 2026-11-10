/**
 * DAYLOOM — Controls & Device Settings Modal
 * Menyediakan antarmuka visual pixel-art cozy untuk pengaturan device Player 1 & Player 2,
 * visual tester controller, deteksi Xbox/PlayStation, dan kustomisasi mapping.
 */

import {
  CONTROLLER_TYPES,
  COMBAT_ACTIONS,
  detectControllerType,
  getButtonDisplayName,
  getKeyDisplayName
} from './input.js';
import { sound } from './audio.js';

export class ControlsModal {
  constructor({ inputManager, onClose }) {
    this.inputManager = inputManager;
    this.onClose = onClose;
    this.element = null;
    this.animFrameId = null;
    this.remappingTarget = null; // { player: 1|2, action: 'attack', device: 'keyboard'|'gamepad' }
  }

  show() {
    this.element = document.createElement('div');
    this.element.className = 'controls-settings-overlay';
    this.element.innerHTML = `
      <div class="controls-settings-modal" role="dialog" aria-modal="true" aria-label="Pengaturan Kontrol & Perangkat">
        <div class="controls-header">
          <div class="controls-header-title">
            <span class="rpg-tag">Konfigurasi Perangkat</span>
            <h3>PENGATURAN KONTROL &amp; GAMEPAD</h3>
          </div>
          <button type="button" class="btn-close-controls" id="btn-close-controls-modal" aria-label="Tutup Pengaturan">✕</button>
        </div>

        <div class="controls-body">
          <!-- 1. Pemilihan Perangkat untuk Player 1 dan Player 2 -->
          <div class="controls-device-grid">
            <div class="device-card" id="device-card-p1">
              <div class="device-card-header">
                <span class="player-pill p1-pill">Pemain 1 (Kiri)</span>
                <select id="p1-device-select" class="device-dropdown"></select>
              </div>
              <div class="device-status" id="p1-device-status"></div>
            </div>

            <div class="device-card" id="device-card-p2">
              <div class="device-card-header">
                <span class="player-pill p2-pill">Pemain 2 (Kanan)</span>
                <select id="p2-device-select" class="device-dropdown"></select>
              </div>
              <div class="device-status" id="p2-device-status"></div>
            </div>
          </div>

          <!-- 2. Visual Controller Tester & Deteksi -->
          <div class="controller-visual-tester" id="controller-visual-tester">
            <div class="tester-header">
              <span class="tester-title">Status Deteksi Controller (Gamepad API)</span>
              <span class="tester-hint" id="tester-hint">Tekan tombol pada stick untuk melihat respon visual</span>
            </div>
            <div class="gamepads-list" id="gamepads-detected-list"></div>
          </div>

          <!-- 3. Tabel Pemetaan Kontrol (Default & Custom) -->
          <div class="mappings-tables-container">
            <div class="mapping-column">
              <h4>Kontrol Pemain 1</h4>
              <div class="mapping-table" id="p1-mapping-table"></div>
            </div>
            <div class="mapping-column">
              <h4>Kontrol Pemain 2</h4>
              <div class="mapping-table" id="p2-mapping-table"></div>
            </div>
          </div>
        </div>

        <div class="controls-footer">
          <button type="button" class="btn-pixel btn-secondary" id="btn-reset-default-controls">Kembalikan Default</button>
          <button type="button" class="btn-pixel btn-primary" id="btn-done-controls">Selesai &amp; Simpan</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.element);

    this.bindEvents();
    this.updateDeviceDropdowns();
    this.renderMappings();
    this.startTesterLoop();
  }

  hide() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    if (this.onClose) this.onClose();
  }

  bindEvents() {
    const closeBtn = this.element.querySelector('#btn-close-controls-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => { sound.playClick(); this.hide(); });

    const doneBtn = this.element.querySelector('#btn-done-controls');
    if (doneBtn) doneBtn.addEventListener('click', () => { sound.playClick(); this.hide(); });

    const resetBtn = this.element.querySelector('#btn-reset-default-controls');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      sound.playClick();
      this.inputManager.player1Device = 'keyboard_p1';
      this.inputManager.player2Device = 'keyboard_p2';
      this.inputManager.p1KeyboardBindings = { ...import('./input.js').then(m => m.DEFAULT_KEYBOARD_P1) };
      this.inputManager.p2KeyboardBindings = { ...import('./input.js').then(m => m.DEFAULT_KEYBOARD_P2) };
      this.inputManager.gamepadBindings = { ...import('./input.js').then(m => m.DEFAULT_GAMEPAD_BINDINGS) };
      this.updateDeviceDropdowns();
      this.renderMappings();
    });

    const p1Select = this.element.querySelector('#p1-device-select');
    if (p1Select) {
      p1Select.addEventListener('change', (e) => {
        sound.playCheck();
        this.inputManager.player1Device = e.target.value;
        this.renderMappings();
      });
    }

    const p2Select = this.element.querySelector('#p2-device-select');
    if (p2Select) {
      p2Select.addEventListener('change', (e) => {
        sound.playCheck();
        this.inputManager.player2Device = e.target.value;
        this.renderMappings();
      });
    }

    // Remap Keydown listener when remappingTarget is active
    this.boundRemapKeyDown = (e) => {
      if (!this.remappingTarget) return;
      e.preventDefault();
      e.stopPropagation();

      const { player, action } = this.remappingTarget;
      if (player === 1) {
        this.inputManager.p1KeyboardBindings[action] = e.code;
      } else {
        this.inputManager.p2KeyboardBindings[action] = e.code;
      }
      this.remappingTarget = null;
      sound.playCheck();
      this.renderMappings();
    };
    window.addEventListener('keydown', this.boundRemapKeyDown, true);
  }

  updateDeviceDropdowns() {
    if (!this.element) return;
    const p1Select = this.element.querySelector('#p1-device-select');
    const p2Select = this.element.querySelector('#p2-device-select');
    if (!p1Select || !p2Select) return;

    const gamepads = this.inputManager.getGamepads();

    const options = [
      { id: 'keyboard_p1', label: 'Papan Ketik (Layout 1: WASD / Space / Shift / F / G)' },
      { id: 'keyboard_p2', label: 'Papan Ketik (Layout 2: Panah / Enter / K / O / P)' }
    ];

    gamepads.forEach(gp => {
      const type = detectControllerType(gp.id);
      const typeLabel = type === CONTROLLER_TYPES.PLAYSTATION ? 'PlayStation' : (type === CONTROLLER_TYPES.XBOX ? 'Xbox' : 'Gamepad');
      options.push({
        id: `gamepad_${gp.index}`,
        label: `Controller #${gp.index + 1} (${typeLabel} - ${gp.id.slice(0, 24)}...)`
      });
    });

    const renderOptions = (currentVal) => {
      return options.map(opt => `
        <option value="${opt.id}" ${opt.id === currentVal ? 'selected' : ''}>${opt.label}</option>
      `).join('');
    };

    p1Select.innerHTML = renderOptions(this.inputManager.player1Device);
    p2Select.innerHTML = renderOptions(this.inputManager.player2Device);
  }

  renderMappings() {
    if (!this.element) return;
    const p1Table = this.element.querySelector('#p1-mapping-table');
    const p2Table = this.element.querySelector('#p2-mapping-table');
    if (!p1Table || !p2Table) return;

    const renderRows = (playerNum, deviceId) => {
      const isPad = deviceId.startsWith('gamepad_');
      let padType = CONTROLLER_TYPES.XBOX;
      if (isPad) {
        const padIdx = parseInt(deviceId.split('_')[1], 10);
        const pad = this.inputManager.getGamepads().find(p => p.index === padIdx);
        if (pad) padType = detectControllerType(pad.id);
      }

      return COMBAT_ACTIONS.map(action => {
        let display = '';
        if (isPad) {
          const btnIdx = this.inputManager.gamepadBindings[action.id];
          display = btnIdx !== undefined ? getButtonDisplayName(btnIdx, padType) : (action.id === 'left' ? 'Stick Kiri / D-Pad' : (action.id === 'right' ? 'Stick Kanan / D-Pad' : '-'));
        } else {
          const map = playerNum === 1 ? this.inputManager.p1KeyboardBindings : this.inputManager.p2KeyboardBindings;
          display = getKeyDisplayName(map[action.id]);
        }

        const isBeingRemapped = this.remappingTarget && this.remappingTarget.player === playerNum && this.remappingTarget.action === action.id;

        return `
          <div class="mapping-row">
            <span class="action-name">${action.name}</span>
            <button type="button" class="btn-bind-key ${isBeingRemapped ? 'remap-active' : ''}" data-remap-player="${playerNum}" data-remap-action="${action.id}" ${isPad ? 'disabled' : ''}>
              ${isBeingRemapped ? 'Tekan Tombol...' : display}
            </button>
          </div>
        `;
      }).join('');
    };

    p1Table.innerHTML = renderRows(1, this.inputManager.player1Device);
    p2Table.innerHTML = renderRows(2, this.inputManager.player2Device);

    this.element.querySelectorAll('[data-remap-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pNum = parseInt(btn.getAttribute('data-remap-player'), 10);
        const act = btn.getAttribute('data-remap-action');
        sound.playClick();
        this.remappingTarget = { player: pNum, action: act };
        this.renderMappings();
      });
    });
  }

  startTesterLoop() {
    const loop = () => {
      if (!this.element) return;
      this.updateVisualTester();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  updateVisualTester() {
    const container = this.element.querySelector('#gamepads-detected-list');
    if (!container) return;

    const gamepads = this.inputManager.getGamepads();
    if (gamepads.length === 0) {
      container.innerHTML = `
        <div class="no-gamepad-alert">
          <span class="alert-icon">🎮</span>
          <div>
            <strong>Belum ada controller terdeteksi.</strong>
            <p>Sambungkan controller Xbox, PlayStation, atau USB standar, lalu tekan salah satu tombolnya untuk mengaktifkan Gamepad API browser.</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = gamepads.map(pad => {
      const type = detectControllerType(pad.id);
      const isXbox = type === CONTROLLER_TYPES.XBOX;
      const isPS = type === CONTROLLER_TYPES.PLAYSTATION;

      // Ambil status tombol aktif
      const pressedButtons = [];
      for (let i = 0; i < pad.buttons.length; i++) {
        const btn = pad.buttons[i];
        const val = typeof btn === 'object' ? btn.value : btn;
        if (val > 0.15) {
          pressedButtons.push({
            idx: i,
            val,
            name: getButtonDisplayName(i, type)
          });
        }
      }

      // Analog stick values
      const lx = pad.axes[0] ? pad.axes[0].toFixed(2) : '0.00';
      const ly = pad.axes[1] ? pad.axes[1].toFixed(2) : '0.00';

      return `
        <div class="gamepad-tester-card">
          <div class="pad-card-title">
            <span class="pad-badge ${isPS ? 'ps-badge' : (isXbox ? 'xbox-badge' : 'generic-badge')}">
              ${isPS ? 'PlayStation' : (isXbox ? 'Xbox' : 'Generic')}
            </span>
            <strong>#${pad.index + 1}: ${pad.id.slice(0, 32)}</strong>
          </div>
          <div class="pad-stick-meter">
            <span>Left Stick: <code>X: ${lx} | Y: ${ly}</code></span>
          </div>
          <div class="pad-pressed-row">
            <span class="pressed-label">Tombol Aktif:</span>
            ${pressedButtons.length > 0
              ? pressedButtons.map(b => `<span class="btn-pressed-pill">${b.name} (${Math.round(b.val * 100)}%)</span>`).join('')
              : '<span class="none-pressed-text">Tidak ada tombol ditekan</span>'
            }
          </div>
        </div>
      `;
    }).join('');
  }
}

