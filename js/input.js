/**
 * DAYLOOM — Unified Input & Gamepad System for Local 1v1 PvP
 *
 * Mendukung:
 * - Keyboard + Keyboard (P1: WASD / Space / Shift / F / G, P2: Arrows / Numpad0 / Enter / K / L)
 * - Gamepad (Standard, Xbox, PlayStation DualShock/DualSense)
 * - Remapping kustom, Deadzone analitik, deteksi tipe controller & visual tester
 */

export const CONTROLLER_TYPES = {
  XBOX: 'xbox',
  PLAYSTATION: 'playstation',
  GENERIC: 'generic'
};

// Default mapping actions
export const COMBAT_ACTIONS = [
  { id: 'left', name: 'Gerak Kiri' },
  { id: 'right', name: 'Gerak Kanan' },
  { id: 'jump', name: 'Lompat' },
  { id: 'dash', name: 'Dash / Hindar' },
  { id: 'attack', name: 'Basic Attack' },
  { id: 'skillQ', name: 'Skill Q' },
  { id: 'ultimateR', name: 'Ultimate R' },
  { id: 'pause', name: 'Jeda / Menu' }
];

// Standard Gamepad button indices (W3C Standard Gamepad layout)
// 0: A (Xbox) / Cross (PS)
// 1: B (Xbox) / Circle (PS)
// 2: X (Xbox) / Square (PS)
// 3: Y (Xbox) / Triangle (PS)
// 4: LB / L1
// 5: RB / R1
// 6: LT / L2
// 7: RT / R2
// 8: Back / Share / Select
// 9: Start / Menu / Options
// 10: Left Stick Press (L3)
// 11: Right Stick Press (R3)
// 12: D-Pad Up
// 13: D-Pad Down
// 14: D-Pad Left
// 15: D-Pad Right
export const DEFAULT_GAMEPAD_BINDINGS = {
  attack: 2,     // X / Square
  skillQ: 3,     // Y / Triangle
  ultimateR: 1,  // B / Circle
  jump: 0,       // A / Cross (Jump)
  dash: 5,       // RB / R1 or LT / RT as secondary, default A or RB
  pause: 9       // Start / Options
};

export const DEFAULT_KEYBOARD_P1 = {
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  dash: 'ShiftLeft',
  attack: 'KeyF',
  skillQ: 'KeyQ',
  ultimateR: 'KeyR',
  pause: 'Escape'
};

export const DEFAULT_KEYBOARD_P2 = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  jump: 'ArrowUp',
  dash: 'Enter',
  attack: 'KeyK',
  skillQ: 'KeyO',
  ultimateR: 'KeyP',
  pause: 'Backquote'
};

/**
 * Mendeteksi tipe controller dari string id
 */
export function detectControllerType(idString = '') {
  const s = idString.toLowerCase();
  if (s.includes('playstation') || s.includes('dualshock') || s.includes('dualsense') || s.includes('sony') || s.includes('054c')) {
    return CONTROLLER_TYPES.PLAYSTATION;
  }
  if (s.includes('xbox') || s.includes('x-box') || s.includes('microsoft') || s.includes('045e') || s.includes('xinput')) {
    return CONTROLLER_TYPES.XBOX;
  }
  return CONTROLLER_TYPES.GENERIC;
}

/**
 * Format nama tombol berdasarkan tipe controller
 */
export function getButtonDisplayName(btnIndex, type = CONTROLLER_TYPES.XBOX) {
  if (type === CONTROLLER_TYPES.PLAYSTATION) {
    switch (btnIndex) {
      case 0: return 'Cross (✕)';
      case 1: return 'Circle (◯)';
      case 2: return 'Square (▢)';
      case 3: return 'Triangle (△)';
      case 4: return 'L1';
      case 5: return 'R1';
      case 6: return 'L2';
      case 7: return 'R2';
      case 8: return 'Share';
      case 9: return 'Options';
      case 10: return 'L3';
      case 11: return 'R3';
      case 12: return 'D-Pad Atas';
      case 13: return 'D-Pad Bawah';
      case 14: return 'D-Pad Kiri';
      case 15: return 'D-Pad Kanan';
      default: return `Tombol ${btnIndex}`;
    }
  }

  // Xbox / Generic
  switch (btnIndex) {
    case 0: return 'A';
    case 1: return 'B';
    case 2: return 'X';
    case 3: return 'Y';
    case 4: return 'LB';
    case 5: return 'RB';
    case 6: return 'LT';
    case 7: return 'RT';
    case 8: return 'View / Back';
    case 9: return 'Menu / Start';
    case 10: return 'LS (Tekan)';
    case 11: return 'RS (Tekan)';
    case 12: return 'D-Pad Atas';
    case 13: return 'D-Pad Bawah';
    case 14: return 'D-Pad Kiri';
    case 15: return 'D-Pad Kanan';
    default: return `Button ${btnIndex}`;
  }
}

export function getKeyDisplayName(code = '') {
  if (!code) return 'Tidak Ada';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'Spasi';
  if (code === 'ShiftLeft') return 'Shift Kiri';
  if (code === 'ShiftRight') return 'Shift Kanan';
  if (code === 'ArrowLeft') return 'Panah Kiri (←)';
  if (code === 'ArrowRight') return 'Panah Kanan (→)';
  if (code === 'ArrowUp') return 'Panah Atas (↑)';
  if (code === 'ArrowDown') return 'Panah Bawah (↓)';
  if (code === 'Enter') return 'Enter';
  if (code === 'Escape') return 'Esc';
  if (code === 'Numpad0') return 'Num 0';
  return code;
}

/**
 * Kelas Pengelola Input Terpadu (InputManager)
 * Mengisolasi input fisik dari logika loop pertempuran
 */
export class InputManager {
  constructor() {
    this.keyState = new Set();
    this.mouseButtons = new Set();

    // Device Assignment:
    // 'keyboard_p1' | 'keyboard_p2' | 'gamepad_0' | 'gamepad_1' | 'gamepad_2' | 'gamepad_3' | 'none'
    this.player1Device = 'keyboard_p1';
    this.player2Device = 'keyboard_p2';

    // Konfigurasi Bindings
    this.p1KeyboardBindings = { ...DEFAULT_KEYBOARD_P1 };
    this.p2KeyboardBindings = { ...DEFAULT_KEYBOARD_P2 };
    this.gamepadBindings = { ...DEFAULT_GAMEPAD_BINDINGS };

    // Deadzone untuk analog stick
    this.stickDeadzone = 0.24;

    // Riwayat aksi tombol sebelumnya untuk mendeteksi 'justPressed'
    this.prevActions = {
      p1: {},
      p2: {}
    };

    // Callback event listener
    this.onGamepadConnected = null;
    this.onGamepadDisconnected = null;

    this.boundKeyDown = (e) => this.handleKeyDown(e);
    this.boundKeyUp = (e) => this.handleKeyUp(e);
    this.boundMouseDown = (e) => this.handleMouseDown(e);
    this.boundMouseUp = (e) => this.handleMouseUp(e);
    this.boundGamepadConnected = (e) => this.handleGamepadConnected(e);
    this.boundGamepadDisconnected = (e) => this.handleGamepadDisconnected(e);

    this.isListening = false;
  }

  attachListeners() {
    if (this.isListening) return;
    this.isListening = true;
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.boundKeyDown);
      window.addEventListener('keyup', this.boundKeyUp);
      window.addEventListener('mousedown', this.boundMouseDown);
      window.addEventListener('mouseup', this.boundMouseUp);
      window.addEventListener('gamepadconnected', this.boundGamepadConnected);
      window.addEventListener('gamepaddisconnected', this.boundGamepadDisconnected);
    }
  }

  detachListeners() {
    if (!this.isListening) return;
    this.isListening = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyDown);
      window.removeEventListener('keyup', this.boundKeyUp);
      window.removeEventListener('mousedown', this.boundMouseDown);
      window.removeEventListener('mouseup', this.boundMouseUp);
      window.removeEventListener('gamepadconnected', this.boundGamepadConnected);
      window.removeEventListener('gamepaddisconnected', this.boundGamepadDisconnected);
    }
    this.keyState.clear();
    this.mouseButtons.clear();
  }

  handleKeyDown(e) {
    this.keyState.add(e.code);
  }

  handleKeyUp(e) {
    this.keyState.delete(e.code);
  }

  setMockKey(code, isPressed = true) {
    if (isPressed) {
      this.keyState.add(code);
    } else {
      this.keyState.delete(code);
    }
  }

  clearMockKeys() {
    this.keyState.clear();
  }

  applyDeadzone(value, deadzone = this.stickDeadzone) {
    if (Math.abs(value) < deadzone) return 0;
    const sign = Math.sign(value);
    return sign * ((Math.abs(value) - deadzone) / (1 - deadzone));
  }

  handleMouseDown(e) {
    this.mouseButtons.add(e.button);
  }

  handleMouseUp(e) {
    this.mouseButtons.delete(e.button);
  }

  handleGamepadConnected(e) {
    const pad = e.gamepad;
    // Auto-assign: Jika P1 belum gamepad dan ada gamepad baru, bisa ditawarkan atau auto-assign P2
    if (this.player1Device === 'keyboard_p1' && this.player2Device === 'keyboard_p2') {
      // Jika controller pertama tersambung, jadikan P2 controller secara default
      this.player2Device = `gamepad_${pad.index}`;
    }
    if (this.onGamepadConnected) {
      this.onGamepadConnected(pad);
    }
  }

  handleGamepadDisconnected(e) {
    const pad = e.gamepad;
    const devId = `gamepad_${pad.index}`;
    if (this.player1Device === devId) {
      this.player1Device = 'keyboard_p1';
    }
    if (this.player2Device === devId) {
      this.player2Device = 'keyboard_p2';
    }
    if (this.onGamepadDisconnected) {
      this.onGamepadDisconnected(pad);
    }
  }

  /**
   * Mengambil daftar gamepad aktif dari browser
   */
  getGamepads() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return [];
    }
    const raw = navigator.getGamepads();
    const pads = [];
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]) pads.push(raw[i]);
    }
    return pads;
  }

  /**
   * Menghasilkan status aksi saat ini untuk seorang player ('p1' atau 'p2')
   * Mengembalikan:
   * {
   *   left: boolean,
   *   right: boolean,
   *   jump: boolean,
   *   jumpJustPressed: boolean,
   *   dashJustPressed: boolean,
   *   attackJustPressed: boolean,
   *   skillQJustPressed: boolean,
   *   ultimateRJustPressed: boolean,
   *   pauseJustPressed: boolean,
   *   analogX: number (-1 s/d 1)
   * }
   */
  samplePlayerInput(playerNum = 1) {
    const deviceId = playerNum === 1 ? this.player1Device : this.player2Device;
    const prev = playerNum === 1 ? this.prevActions.p1 : this.prevActions.p2;

    const raw = {
      left: false,
      right: false,
      jump: false,
      dash: false,
      attack: false,
      skillQ: false,
      ultimateR: false,
      pause: false,
      analogX: 0
    };

    if (deviceId.startsWith('keyboard')) {
      const isP1 = deviceId === 'keyboard_p1';
      const map = isP1 ? this.p1KeyboardBindings : this.p2KeyboardBindings;

      raw.left = this.keyState.has(map.left);
      raw.right = this.keyState.has(map.right);
      raw.jump = this.keyState.has(map.jump);
      raw.dash = this.keyState.has(map.dash);
      raw.attack = this.keyState.has(map.attack);
      raw.skillQ = this.keyState.has(map.skillQ);
      raw.ultimateR = this.keyState.has(map.ultimateR);
      raw.pause = this.keyState.has(map.pause);

      // Support klik kiri mouse untuk P1 keyboard jika attack belum dipicu tombol keyboard
      if (isP1 && this.mouseButtons.has(0)) {
        raw.attack = true;
      }

      if (raw.left && !raw.right) raw.analogX = -1;
      else if (raw.right && !raw.left) raw.analogX = 1;
    } else if (deviceId.startsWith('gamepad_')) {
      const padIdx = parseInt(deviceId.split('_')[1], 10);
      const pads = this.getGamepads();
      const pad = pads.find(p => p && p.index === padIdx);

      if (pad) {
        const b = this.gamepadBindings;

        // Face Buttons & Action Buttons
        const isDown = (idx) => {
          if (idx === undefined || idx < 0 || idx >= pad.buttons.length) return false;
          const btn = pad.buttons[idx];
          return typeof btn === 'object' ? btn.pressed : btn > 0.5;
        };

        raw.attack = isDown(b.attack);
        raw.skillQ = isDown(b.skillQ);
        raw.ultimateR = isDown(b.ultimateR);
        raw.jump = isDown(b.jump);
        raw.dash = isDown(b.dash) || isDown(4); // Support RB or LB
        raw.pause = isDown(b.pause);

        // Analog Left Stick & D-Pad
        let stickX = pad.axes && pad.axes.length > 0 ? pad.axes[0] : 0;
        if (Math.abs(stickX) < this.stickDeadzone) {
          stickX = 0;
        }

        // D-Pad buttons (standard index: 14 = Left, 15 = Right, 12 = Up)
        const dpadLeft = isDown(14);
        const dpadRight = isDown(15);
        const dpadUp = isDown(12);

        if (dpadLeft) raw.left = true;
        if (dpadRight) raw.right = true;
        if (dpadUp) raw.jump = true;

        if (stickX < -this.stickDeadzone) raw.left = true;
        if (stickX > this.stickDeadzone) raw.right = true;

        raw.analogX = stickX !== 0 ? stickX : (raw.left ? -1 : (raw.right ? 1 : 0));
      }
    }

    // Deteksi Just Pressed (Trigger sekali saat ditekan)
    const moveX = (raw.left && raw.right) ? 0 : (raw.left ? -1 : (raw.right ? 1 : (raw.analogX || 0)));
    const result = {
      left: raw.left,
      right: raw.right,
      moveX,
      jump: raw.jump,
      dash: raw.dash,
      attack: raw.attack,
      skillQ: raw.skillQ,
      ultimateR: raw.ultimateR,
      pause: raw.pause,
      jumpJustPressed: raw.jump && !prev.jump,
      dashJustPressed: raw.dash && !prev.dash,
      attackJustPressed: raw.attack && !prev.attack,
      skillQJustPressed: raw.skillQ && !prev.skillQ,
      ultimateRJustPressed: raw.ultimateR && !prev.ultimateR,
      pauseJustPressed: raw.pause && !prev.pause,
      analogX: raw.analogX
    };

    // Simpan riwayat untuk frame berikutnya
    if (playerNum === 1) {
      this.prevActions.p1 = raw;
    } else {
      this.prevActions.p2 = raw;
    }

    return result;
  }
}

