/**
 * DAYLOOM — Local PvP Arena: Living 2D Action Platformer & Combat Environment
 *
 * Hierarki Referensi Visual:
 * 1. Dunia Desa (Dayloom): Kualitas ilustrasi, karakter Traveler resmi, harmoni warna, dan identitas.
 * 2. Nine Sols: Komposisi lingkungan berlapis, arsitektur terintegrasi ke platform, pencahayaan, dan HUD tempur.
 * 3. Hollow Knight: Atmosfer kedalaman dan penceritaan visual.
 *
 * Karakter Playable:
 * - Traveler: Serangan Tongkat Lentera | Q: Phoenix Blast | R: Inferno Domain (Api Perimeter Tubuh)
 * - Meliodas: Tebasan Jarak Dekat Lostvayne | Q: Hellblaze (Api Tanah + Erupsi) | R: Assault Mode (Transformasi 10d, 150% Stat)
 *
 * Kontrol Ketat:
 * A: Gerak Kiri | D: Gerak Kanan | Space: Lompat | Shift: Dash
 * Klik Kiri: Basic Attack | Q: Skill | R: Ultimate | Klik Kanan: Kosong
 */

import { getCharacterSVG, getMeliodasSVG, getBossSVG } from './art.js';
import { sound } from './audio.js';
import { InputManager } from './input.js';


function createInitialPlayerState(characterId = 'traveler', spawnOptions = {}) {
  const isMel = characterId === 'meliodas';
  const posX = spawnOptions.x !== undefined ? spawnOptions.x : 340;
  const posY = spawnOptions.y !== undefined ? spawnOptions.y : 500;
  const facingDir = spawnOptions.facing || 'right';

  return {
    x: posX,
    y: posY,
    vx: 0,
    vy: 0,
    width: 44,
    height: 64,
    grounded: false,
    facing: facingDir, // 'left' | 'right'
    state: 'idle', // 'idle' | 'walking' | 'jumping' | 'attacking' | 'dashing' | 'casting_q' | 'casting_r'
    animTimer: 0,
    walkCycle: 0,

    // Dash State
    dashTimer: 0,
    dashCooldown: 0,

    // Basic Attack State & Combo (Traveler Staff / Meliodas Lostvayne)
    attackTimer: 0,
    attackDuration: 0.21,
    attackCooldown: 0,
    comboStep: 0,
    comboResetTimer: 0,

    // Skill Q State (Phoenix Blast / Hellblaze)
    qCastTimer: 0,
    qCooldown: 0,

    // Ultimate R State
    rCastTimer: 0,

    // Traveler Ultimate R: Inferno Domain (Perimeter Fire Around Traveler)
    infernoDomain: {
      active: false,
      duration: 5.5,
      timeLeft: 0,
      radius: 165,
      tickTimer: 0,
      tickInterval: 0.45,
      damagePerTick: 8
    },

    // Meliodas Ultimate R: Assault Mode (Temporary 10-Second Transformation, 150% Stats)
    assaultMode: {
      active: false,
      duration: 10.0,
      timeLeft: 0,
      transformAnimTimer: 0,
      multiplier: 1.5
    },

    // Base Stats (100%) & Effective Stats (100% Normal / 150% Assault Mode)
    baseStats: {
      moveSpeed: 577.5,
      basicAttackDamage: isMel ? 18 : 14,
      skillDamage: isMel ? 44 : 42,
      jumpHeight: 212.25,
      dashSpeed: 760
    },
    stats: {
      moveSpeed: 577.5,
      basicAttackDamage: isMel ? 18 : 14,
      skillDamage: isMel ? 44 : 42,
      jumpHeight: 212.25,
      dashSpeed: 760
    },

    // Combat Energy Systems
    hp: 120,
    maxHp: 120,
    energyPips: 3,
    energyCharge: 0.0,
    ultimateCharge: 100,
    maxUltimate: 100,

    // Hit & Damage State
    hurtTimer: 0,
    burnVisualTimer: 0,
    invulnerableTimer: 0
  };
}

export class LocalPvPArenaGame {
  constructor({ container, profile, rank, characterId, characterIdP2 = 'meliodas', gameMode = 'pvp', onClose, onMatchEnd, onBackToSelect }) {
    this.onMatchEnd = onMatchEnd || null;
    this.onBackToSelect = onBackToSelect || null;
    this.matchOver = false;
    this.matchResult = null;
    this.rewardAwarded = false;
    this.currentMatchId = 'pvp_match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    this.container = container;
    this.profile = profile || {};
    this.rank = rank || {};
    this.onClose = onClose;

    const initialChar = characterId || this.profile?.selectedCharacter || 'traveler';
    this.characterId = initialChar === 'meliodas' ? 'meliodas' : 'traveler';
    this.characterIdP1 = this.characterId;
    this.characterIdP2 = characterIdP2 === 'meliodas' ? 'meliodas' : 'traveler';
    this.gameMode = gameMode; // 'pvp' (1v1) | 'pve' (sparring with Oni)

    this.canvas = null;
    this.ctx = null;
    this.rafId = null;
    this.running = false;
    this.reducedMotion = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    // Unified Input Manager for P1 & P2 (Keyboard + Multi-Controller Support)
    this.inputManager = new InputManager();

    // Dimensi Logis Game (16:9 HD Canvas di dalam Floating Arena Viewport)
    this.width = 1280;
    this.height = 720;
    this.gravity = 1380;

    // Kamera Paralaks Halus mengikuti posisi pemain
    this.camX = 0;
    this.camY = 0;
    this.envTime = 0;

    // Status Karakter Pemain 1 (Traveler / Meliodas, spawn kiri)
    this.player1 = createInitialPlayerState(this.characterIdP1, { x: 340, y: 500, facing: 'right' });
    this.player = this.player1; // 100% Backward Compatibility Alias

    // Status Karakter Pemain 2 (Traveler / Meliodas, spawn kanan)
    this.player2 = createInitialPlayerState(this.characterIdP2, { x: 920, y: 500, facing: 'left' });

    this.syncCharacterStats(1);
    this.syncCharacterStats(2);

    // Lawan Uji Tanding Arena (Oni Penundaan)
    this.enemies = [
      {
        id: 'arena_sparring_oni',
        name: 'Oni Penundaan',
        x: 840,
        y: 516,
        vx: -75,
        vy: 0,
        width: 56,
        height: 64,
        hp: 240,
        maxHp: 240,
        patrolMinX: 670,
        patrolMaxX: 1060,
        hurtTimer: 0,
        burnVisualTimer: 0
      }
    ];

    // Sprite Karakter Resmi Dayloom (Traveler Restored + Meliodas Normal & Assault Mode)
    this.travelerSpriteRight = new Image();
    this.travelerSpriteLeft = new Image();
    this.meliodasNormalRight = new Image();
    this.meliodasNormalLeft = new Image();
    this.meliodasAssaultRight = new Image();
    this.meliodasAssaultLeft = new Image();
    this.charSpriteRight = this.travelerSpriteRight;
    this.charSpriteLeft = this.travelerSpriteLeft;
    this.enemySprite = new Image();
    this.spritesReady = false;
    this.initArenaSprites();

    // Input state
    this.keys = {
      a: false,
      d: false
    };

    // Efek Tempur & Proyektil
    this.projectiles = [];
    this.phoenixProjectiles = [];
    this.hellblazeWaves = [];
    this.hellblazeEruptions = [];
    this.slashEffects = [];
    this.lostvayneSlashes = [];
    this.particles = [];
    this.damageNumbers = [];

    // Partikel Lingkungan Hidup (Kelopak Sakura & Roh Cahaya)
    this.ambientPetals = [];
    this.ambientFireflies = [];
    this.distantClouds = [];
    this.initEnvironmentalActors();

    // Platform Terintegrasi Arsitektur Dunia (One-Way & Solid Ground)
    this.platforms = [
      {
        id: 'main_ground',
        x: 40,
        y: 580,
        w: 1200,
        h: 140,
        oneWay: false,
        type: 'main_bridge_ground'
      },
      {
        id: 'shrine_terrace_left',
        x: 110,
        y: 480,
        w: 250,
        h: 22,
        oneWay: true,
        type: 'stone_terrace_left'
      },
      {
        id: 'dojo_terrace_right',
        x: 920,
        y: 480,
        w: 250,
        h: 22,
        oneWay: true,
        type: 'stone_terrace_right'
      },
      {
        id: 'center_torii_beam',
        x: 450,
        y: 385,
        w: 380,
        h: 20,
        oneWay: true,
        type: 'torii_crossbeam'
      },
      {
        id: 'high_eave_left',
        x: 150,
        y: 290,
        w: 210,
        h: 18,
        oneWay: true,
        type: 'temple_roof_eave'
      },
      {
        id: 'high_eave_right',
        x: 920,
        y: 290,
        w: 210,
        h: 18,
        oneWay: true,
        type: 'temple_roof_eave'
      }
    ];

    // Bind listeners
    this.boundKeyDown = (e) => this.handleKeyDown(e);
    this.boundKeyUp = (e) => this.handleKeyUp(e);
    this.boundMouseDown = (e) => this.handleMouseDown(e);
    this.boundContextMenu = (e) => e.preventDefault();
  }

  /**
   * Mengatur karakter aktif ('traveler' | 'meliodas') dan menyinkronkan baseStats, sprite, serta mereset efek aktif.
   */
  setCharacter(characterId, playerNum = 1) {
    const nextChar = characterId === 'meliodas' ? 'meliodas' : 'traveler';
    if (playerNum === 1) {
      this.characterId = nextChar;
      this.characterIdP1 = nextChar;
    } else {
      this.characterIdP2 = nextChar;
    }

    const p = playerNum === 1 ? this.player1 : this.player2;
    p.infernoDomain.active = false;
    p.infernoDomain.timeLeft = 0;
    p.assaultMode.active = false;
    p.assaultMode.timeLeft = 0;
    p.assaultMode.transformAnimTimer = 0;
    p.state = 'idle';
    p.attackTimer = 0;
    p.qCastTimer = 0;
    p.rCastTimer = 0;
    p.comboStep = 0;

    p.baseStats = {
      moveSpeed: 577.5,
      basicAttackDamage: nextChar === 'meliodas' ? 18 : 14,
      skillDamage: nextChar === 'meliodas' ? 44 : 42,
      jumpHeight: 212.25,
      dashSpeed: 760
    };

    this.syncCharacterStats(playerNum);
    this.updateActiveSpriteRefs();
  }

  /**
   * Menyinkronkan `player.stats` berdasarkan `player.baseStats` dan status `assaultMode.active`.
   * Menjamin peningkatan tepat 150% (1.5x) selama Assault Mode dan pemulihan 100% tanpa stacking saat berakhir.
   */
  syncCharacterStats(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p) return;
    const charId = playerNum === 1 ? this.characterIdP1 : this.characterIdP2;
    const mult = (charId === 'meliodas' && p.assaultMode.active) ? p.assaultMode.multiplier : 1.0;

    p.stats.moveSpeed = p.baseStats.moveSpeed * mult;
    p.stats.basicAttackDamage = p.baseStats.basicAttackDamage * mult;
    p.stats.skillDamage = p.baseStats.skillDamage * mult;
    p.stats.jumpHeight = p.baseStats.jumpHeight * mult;
    p.stats.dashSpeed = p.baseStats.dashSpeed * mult;
  }

  updateActiveSpriteRefs() {
    if (this.characterIdP1 === 'meliodas') {
      if (this.player1.assaultMode.active) {
        this.charSpriteRight = this.meliodasAssaultRight;
        this.charSpriteLeft = this.meliodasAssaultLeft;
      } else {
        this.charSpriteRight = this.meliodasNormalRight;
        this.charSpriteLeft = this.meliodasNormalLeft;
      }
    } else {
      this.charSpriteRight = this.travelerSpriteRight;
      this.charSpriteLeft = this.travelerSpriteLeft;
    }
  }

  /**
   * PHASE 1 & PHASE 2 — Inisialisasi Sprite In-Game:
   * - Mengembalikan Traveler in-game ke `getCharacterSVG` resmi Dayloom (versi Argon sebelumnya yang disukai).
   * - Memuat sprite Meliodas Normal dan Assault Mode (`getMeliodasSVG`) dengan skala & kualitas sepadan.
   */
  initArenaSprites() {
    const outfitId = this.profile?.outfit || 'wanderer';
    const hatId = this.profile?.hat || 'straw_hat';
    const rankId = this.rank?.id || 'epic';

    // Phase 1: Restored Traveler SVG from art.js (exact earlier Argon version)
    const travRight = getCharacterSVG({ outfitId, hatId, rankId, size: 88, facing: 'right' }).trim();
    const travLeft = getCharacterSVG({ outfitId, hatId, rankId, size: 88, facing: 'left' }).trim();

    // Phase 2: Meliodas Normal & Assault Mode SVGs
    const melNormalRight = getMeliodasSVG({ mode: 'normal', size: 88, facing: 'right' }).trim();
    const melNormalLeft = getMeliodasSVG({ mode: 'normal', size: 88, facing: 'left' }).trim();
    const melAssaultRight = getMeliodasSVG({ mode: 'assault', size: 88, facing: 'right' }).trim();
    const melAssaultLeft = getMeliodasSVG({ mode: 'assault', size: 88, facing: 'left' }).trim();

    const bossSvg = getBossSVG('sloth_oni', 84).trim();

    let loadedCount = 0;
    const onDone = () => {
      loadedCount += 1;
      if (loadedCount >= 2) this.spritesReady = true;
    };

    this.travelerSpriteRight.onload = onDone;
    this.travelerSpriteLeft.onload = onDone;
    this.meliodasNormalRight.onload = onDone;
    this.meliodasNormalLeft.onload = onDone;
    this.meliodasAssaultRight.onload = onDone;
    this.meliodasAssaultLeft.onload = onDone;

    this.travelerSpriteRight.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(travRight);
    this.travelerSpriteLeft.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(travLeft);
    this.meliodasNormalRight.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(melNormalRight);
    this.meliodasNormalLeft.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(melNormalLeft);
    this.meliodasAssaultRight.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(melAssaultRight);
    this.meliodasAssaultLeft.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(melAssaultLeft);
    this.enemySprite.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(bossSvg);

    this.updateActiveSpriteRefs();
  }

  initEnvironmentalActors() {
    this.distantClouds = [
      { x: 120, y: 95, w: 220, h: 34, speed: 6 },
      { x: 520, y: 68, w: 280, h: 42, speed: 4.5 },
      { x: 960, y: 112, w: 240, h: 36, speed: 7.5 }
    ];

    if (this.reducedMotion) return;

    this.ambientPetals = Array.from({ length: 32 }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: 4 + Math.random() * 5.5,
      vx: -18 - Math.random() * 24,
      vy: 22 + Math.random() * 28,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2.2,
      swayPhase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? '#F3C1CE' : '#E8A5B5',
      alpha: 0.55 + Math.random() * 0.35
    }));

    this.ambientFireflies = Array.from({ length: 22 }, () => ({
      x: Math.random() * this.width,
      y: 180 + Math.random() * 440,
      r: 2 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.5) * 14,
      phase: Math.random() * Math.PI * 2
    }));
  }

  start() {
    this.running = true;
    sound.playBGM();
    this.canvas = this.container.querySelector('#pvp-arena-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.inputManager.attachListeners();
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);

    let lastTime = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      this.update(dt);
      this.render();

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    sound.stopBGM();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.inputManager.detachListeners();
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.boundMouseDown);
      this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
    }
  }

  handleKeyDown(e) {
    if (!this.running) return;
    const key = e.key.toLowerCase();

    if (key === 'a') {
      this.keys.a = true;
    } else if (key === 'd') {
      this.keys.d = true;
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.tryJump();
    } else if (key === 'shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      e.preventDefault();
      this.tryDash();
    } else if (key === 'q') {
      e.preventDefault();
      this.trySkillQ();
    } else if (key === 'r') {
      e.preventDefault();
      this.tryUltimateR();
    }
  }

  handleKeyUp(e) {
    if (!this.running) return;
    const key = e.key.toLowerCase();
    if (key === 'a') this.keys.a = false;
    if (key === 'd') this.keys.d = false;
  }

  handleMouseDown(e) {
    if (!this.running) return;
    // Left Mouse Button = Basic Attack
    if (e.button === 0) {
      e.preventDefault();
      this.tryAttack();
    }
    // Right Mouse Button = NO ACTION (Explicitly ignored)
    if (e.button === 2) {
      e.preventDefault();
    }
  }

  tryJump(playerNum = 1) {
    if (this.matchOver) return false;
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p) return;
    const charId = playerNum === 1 ? this.characterIdP1 : this.characterIdP2;

    if (p.grounded) {
      this.syncCharacterStats(playerNum);
      // v_y = -sqrt(2 * g * jumpHeight) sehingga tinggi puncak lompatan presisi mengikuti stats.jumpHeight (100% vs 150%)
      p.vy = -Math.sqrt(2 * this.gravity * p.stats.jumpHeight);
      p.grounded = false;
      p.state = 'jumping';
      sound.playClick();
      const dustColor = (charId === 'meliodas' && p.assaultMode.active) ? '#9333EA' : '#FFE08A';
      this.spawnDust(p.x + p.width / 2, p.y + p.height, dustColor, 6);
    }
  }

  tryDash(playerNum = 1) {
    if (this.matchOver) return false;
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p) return;
    const charId = playerNum === 1 ? this.characterIdP1 : this.characterIdP2;

    if (p.dashCooldown <= 0 && p.dashTimer <= 0) {
      this.syncCharacterStats(playerNum);
      p.dashTimer = 0.17;
      p.dashCooldown = 0.52;
      sound.playClick();

      const dir = p.facing === 'right' ? 1 : -1;
      p.vx = dir * p.stats.dashSpeed;
      p.vy = 0;

      const isAssault = charId === 'meliodas' && p.assaultMode.active;
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: p.x + p.width / 2 - dir * i * 16,
          y: p.y + p.height / 2,
          vx: -dir * 20,
          vy: (Math.random() - 0.5) * 15,
          alpha: 0.68 - i * 0.12,
          color: isAssault
            ? (i % 2 === 0 ? '#6B21A8' : '#10B981')
            : (i % 2 === 0 ? '#E8A5B5' : '#FFE08A'),
          size: 24 - i * 3,
          life: 0.22
        });
      }
    }
  }

  /**
   * Basic Attack:
   * - Traveler: Tebasan Tongkat Lentera + Proyektil Sabit Cahaya
   * - Meliodas: Tebasan Pedang Jarak Dekat Lostvayne (3-Hit Combo Cepat, Bobot Fisik, & Suara Tebasan Pedang)
   */
  tryAttack(playerNum = 1) {
    if (this.matchOver) return false;
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p) return false;
    const charId = playerNum === 1 ? this.characterIdP1 : this.characterIdP2;

    if (p.attackCooldown > 0) return false;
    this.syncCharacterStats(playerNum);

    if (charId === 'meliodas') {
      return this.tryMeliodasLostvayneAttack(playerNum);
    }

    p.attackTimer = p.attackDuration;
    p.attackCooldown = 0.24;
    p.state = 'attacking';
    sound.playCheck();

    const dir = p.facing === 'right' ? 1 : -1;
    const spawnX = p.facing === 'right' ? p.x + p.width + 10 : p.x - 10;
    const spawnY = p.y + p.height * 0.45;

    // 1. Efek Busur Tebasan Tongkat Lentera
    this.slashEffects.push({
      x: spawnX,
      y: spawnY,
      dir,
      radius: 50,
      progress: 0,
      duration: 0.18
    });

    // 2. Proyektil Gelombang Sabit Fajar Cepat (Diberi tag owner agar tidak mengenai diri sendiri)
    this.projectiles.push({
      ownerPlayer: playerNum,
      x: spawnX + dir * 14,
      y: spawnY,
      vx: dir * 680,
      radius: 17,
      damage: p.stats.basicAttackDamage,
      life: 0.78,
      maxLife: 0.78,
      color: '#FFE08A',
      trailColor: '#E8A5B5'
    });

    return true;
  }

  /**
   * PHASE 3 — Meliodas Basic Attack: Tebasan Pedang Jarak Dekat Lostvayne
   */
  tryMeliodasLostvayneAttack(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p) return false;
    const opponent = playerNum === 1 ? this.player2 : this.player1;
    const isAssault = p.assaultMode.active;

    p.attackDuration = 0.19;
    p.attackTimer = p.attackDuration;
    p.attackCooldown = isAssault ? 0.17 : 0.21;
    p.state = 'attacking';

    // Siklus kombo 3 tebasan beruntun (Horizontal Cleave -> Rising Fang -> Twin Emerald Arc)
    if (p.comboResetTimer > 0) {
      p.comboStep = (p.comboStep + 1) % 3;
    } else {
      p.comboStep = 0;
    }
    p.comboResetTimer = 0.65;

    sound.playSwordSlash();

    const dir = p.facing === 'right' ? 1 : -1;
    // Dorongan langkah tebasan pendek yang terkendali agar kuda-kuda tetap stabil
    if (p.grounded) {
      p.vx += dir * (isAssault ? 135 : 100);
    }

    const slashX = dir > 0 ? p.x + p.width + 18 : p.x - 18;
    const slashY = p.y + p.height * 0.46;
    const reach = isAssault ? 96 : 82;

    // Tambahkan visual busur tebasan Lostvayne
    this.lostvayneSlashes.push({
      x: slashX,
      y: slashY,
      dir,
      comboStep: p.comboStep,
      radius: isAssault ? 64 : 54,
      progress: 0,
      duration: 0.18,
      assault: isAssault
    });

    // Deteksi benturan jarak dekat (Close-Range Melee Hitbox)
    const hitMinX = dir > 0 ? p.x + p.width * 0.3 : p.x - reach;
    const hitMaxX = dir > 0 ? p.x + p.width + reach : p.x + p.width * 0.7;
    const hitMinY = p.y - 18;
    const hitMaxY = p.y + p.height + 14;

    let connected = false;
    const dmg = Math.round(p.stats.basicAttackDamage);
    const dmgColor = isAssault ? '#C084FC' : '#34D399';

    // 1. Cek benturan terhadap lawan (Player vs Player) jika dalam mode pvp
    if (this.gameMode === 'pvp' && opponent) {
      const ox1 = opponent.x;
      const ox2 = opponent.x + opponent.width;
      const oy1 = opponent.y;
      const oy2 = opponent.y + opponent.height;
      if (ox2 >= hitMinX && ox1 <= hitMaxX && oy2 >= hitMinY && oy1 <= hitMaxY) {
        this.applyDamageToPlayer(opponent, dmg, dmgColor, false);
        this.grantOnHitEnergy(0.42, 10, playerNum);
        this.spawnLostvayneHitSparks(opponent.x + opponent.width / 2, opponent.y + opponent.height * 0.45, isAssault);
        connected = true;
      }
    }

    // 2. Cek benturan terhadap musuh PvE
    for (const enemy of this.enemies) {
      const ex1 = enemy.x;
      const ex2 = enemy.x + enemy.width;
      const ey1 = enemy.y;
      const ey2 = enemy.y + enemy.height;

      if (ex2 >= hitMinX && ex1 <= hitMaxX && ey2 >= hitMinY && ey1 <= hitMaxY) {
        this.applyDamageToEnemy(enemy, dmg, dmgColor, false);
        this.grantOnHitEnergy(0.42, 10, playerNum);
        this.spawnLostvayneHitSparks(enemy.x + enemy.width / 2, enemy.y + enemy.height * 0.45, isAssault);
        connected = true;
      }
    }

    return connected || true;
  }

  spawnLostvayneHitSparks(x, y, isAssault = false) {
    const colors = isAssault
      ? ['#0F0718', '#9333EA', '#C084FC', '#34D399', '#FFFFFF']
      : ['#143D30', '#10B981', '#34D399', '#E5B84B', '#FFFFFF'];
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.35;
      const spd = 95 + Math.random() * 155;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 20,
        alpha: 0.98,
        color: colors[i % colors.length],
        size: 3.5 + Math.random() * 4.5,
        life: 0.28 + Math.random() * 0.14
      });
    }
  }

  /**
   * Dispatcher Skill Q:
   * - Traveler: Phoenix Blast
   * - Meliodas: Hellblaze (Gelombang Api Tanah + Erupsi Vertikal)
   */
  trySkillQ(playerNum = 1) {
    if (this.matchOver) return false;
    const charId = playerNum === 1 ? this.characterIdP1 : this.characterIdP2;
    if (charId === 'meliodas') {
      return this.tryHellblaze(playerNum);
    }
    return this.tryPhoenixBlast(playerNum);
  }

  /**
   * Traveler Skill Q: PHOENIX BLAST
   */
  tryPhoenixBlast(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p || p.energyPips < 1 || p.qCooldown > 0) {
      return false;
    }

    this.syncCharacterStats(playerNum);
    p.energyPips -= 1;
    p.qCastTimer = 0.26;
    p.qCooldown = 0.22;
    p.state = 'casting_q';
    sound.playAchievement();

    const dir = p.facing === 'right' ? 1 : -1;
    const spawnX = dir > 0 ? p.x + p.width + 24 : p.x - 24;
    const spawnY = p.y + p.height * 0.42;

    this.spawnFireBurst(spawnX, spawnY, 16, 180);

    this.phoenixProjectiles.push({
      ownerPlayer: playerNum,
      x: spawnX,
      y: spawnY,
      vx: dir * 790,
      dir,
      width: 92,
      height: 58,
      radius: 38,
      damage: Math.round(p.stats.skillDamage),
      wingPhase: 0,
      life: 1.25
    });

    return true;
  }

  /**
   * PHASE 3 — Meliodas Skill Q: HELLBLAZE
   */
  tryHellblaze(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p || p.energyPips < 1 || p.qCooldown > 0) {
      return false;
    }

    this.syncCharacterStats(playerNum);
    const isAssault = p.assaultMode.active;

    p.energyPips -= 1;
    p.qCastTimer = 0.28;
    p.qCooldown = 0.24;
    p.state = 'casting_q';
    sound.playHellblaze();

    const dir = p.facing === 'right' ? 1 : -1;
    const startX = dir > 0 ? p.x + p.width + 12 : p.x - 12;
    const groundY = this.findSurfaceYBelow(startX, p.y + p.height);

    this.spawnDarkFlameBurst(startX, groundY - 8, isAssault ? 20 : 14, isAssault ? 195 : 150);

    this.hellblazeWaves.push({
      ownerPlayer: playerNum,
      x: startX,
      y: groundY,
      vx: dir * (isAssault ? 760 : 650),
      dir,
      width: isAssault ? 86 : 68,
      height: isAssault ? 46 : 36,
      damage: Math.round(p.stats.skillDamage), // 44 normal, 66 in Assault Mode (150%)
      assault: isAssault,
      phase: 0,
      life: 1.45,
      erupted: false
    });

    return true;
  }

  findSurfaceYBelow(x, refFeetY) {
    let bestY = 580;
    let bestDiff = Infinity;
    for (const plat of this.platforms) {
      if (x >= plat.x && x <= plat.x + plat.w) {
        const diff = Math.abs(plat.y - refFeetY);
        if (diff < bestDiff && plat.y >= refFeetY - 40) {
          bestDiff = diff;
          bestY = plat.y;
        }
      }
    }
    return bestY;
  }

  triggerHellblazeEruption(wave, targetX, groundY) {
    if (wave.erupted) return;
    wave.erupted = true;

    const isAssault = wave.assault;
    const pillarRadius = isAssault ? 74 : 58;
    const pillarHeight = isAssault ? 210 : 165;

    this.hellblazeEruptions.push({
      x: targetX,
      y: groundY,
      radius: pillarRadius,
      height: pillarHeight,
      assault: isAssault,
      progress: 0,
      duration: isAssault ? 0.55 : 0.46
    });

    this.spawnDarkFlameBurst(targetX, groundY - 40, isAssault ? 28 : 20, isAssault ? 240 : 190);

    // AoE Impact Damage pada musuh dan pemain lawan
    const waveOwner = wave.ownerPlayer || 1;
    const targetPlayer = waveOwner === 1 ? this.player2 : this.player1;
    if (this.gameMode === 'pvp' && targetPlayer) {
      const px = targetPlayer.x + targetPlayer.width / 2;
      const py = targetPlayer.y + targetPlayer.height;
      const horizDist = Math.abs(px - targetX);
      const vertDist = Math.abs(py - groundY);
      if (horizDist <= pillarRadius + targetPlayer.width * 0.45 && vertDist <= pillarHeight) {
        this.applyDamageToPlayer(targetPlayer, wave.damage, isAssault ? '#C084FC' : '#34D399', true);
      }
    }

    for (const enemy of this.enemies) {
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height;
      const horizDist = Math.abs(ex - targetX);
      const vertDist = Math.abs(ey - groundY);
      if (horizDist <= pillarRadius + enemy.width * 0.45 && vertDist <= pillarHeight) {
        this.applyDamageToEnemy(enemy, wave.damage, isAssault ? '#C084FC' : '#34D399', true);
      }
    }
  }

  spawnDarkFlameBurst(x, y, count = 16, speed = 170) {
    const colors = ['#0F0718', '#6B21A8', '#9333EA', '#10B981', '#34D399'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const spd = (0.4 + Math.random() * 0.65) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd * 0.75,
        vy: -Math.abs(Math.sin(angle) * spd) - 35,
        alpha: 0.95,
        color: colors[i % colors.length],
        size: Math.random() * 7 + 4,
        life: 0.38 + Math.random() * 0.22
      });
    }
  }

  /**
   * Dispatcher Ultimate R:
   * - Traveler: Inferno Domain
   * - Meliodas: Assault Mode (10-Second Transformation)
   */
  tryUltimateR(playerNum = 1) {
    if (this.matchOver) return false;
    const charId = playerNum === 1 ? this.characterIdP1 : this.characterIdP2;
    if (charId === 'meliodas') {
      return this.tryAssaultMode(playerNum);
    }
    return this.tryInfernoDomain(playerNum);
  }

  /**
   * PHASE 1 — Traveler Ultimate R: INFERNO DOMAIN
   */
  tryInfernoDomain(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p || p.ultimateCharge < p.maxUltimate) {
      return false;
    }

    p.ultimateCharge = 0;
    p.rCastTimer = 0.35;
    p.state = 'casting_r';
    p.infernoDomain.active = true;
    p.infernoDomain.timeLeft = p.infernoDomain.duration;
    p.infernoDomain.tickTimer = 0.1;

    sound.playAchievement();
    this.spawnFireBurst(p.x + p.width / 2, p.y + p.height / 2, 26, 240);
    return true;
  }

  /**
   * PHASE 3 — Meliodas Ultimate R: ASSAULT MODE
   */
  tryAssaultMode(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p || p.assaultMode.active || p.ultimateCharge < p.maxUltimate) {
      return false;
    }

    p.assaultMode.active = true;
    p.assaultMode.duration = 10.0;
    p.assaultMode.timeLeft = 10.0;
    p.assaultMode.transformAnimTimer = 0.48;
    p.rCastTimer = 0.42;
    p.state = 'casting_r';

    this.syncCharacterStats(playerNum);
    this.updateActiveSpriteRefs();

    sound.playAssaultTransform();
    this.spawnDarkFlameBurst(p.x + p.width / 2, p.y + p.height / 2, 30, 260);
    return true;
  }

  /**
   * Mengakhiri Assault Mode secara bersih dan mengembalikan seluruh atribut ke 100% nilai dasar.
   */
  endAssaultMode(playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p) return;
    p.assaultMode.active = false;
    p.assaultMode.timeLeft = 0;
    p.assaultMode.transformAnimTimer = 0;
    p.ultimateCharge = 0; // Reset ultimate gauge to 0 after transformation ends so it begins recharging
    this.syncCharacterStats(playerNum);
    this.updateActiveSpriteRefs();
    this.spawnDarkFlameBurst(p.x + p.width / 2, p.y + p.height / 2, 16, 150);
  }

  /**
   * Saat Basic Attack mengenai lawan, percepat pengisian Skill Energy Orb & Ultimate Gauge.
   * Tidak memulihkan HP (sesuai Combat Energy Rules).
   */
  grantOnHitEnergy(skillBoost = 0.38, ultBoost = 9, playerNum = 1) {
    const p = playerNum === 1 ? this.player1 : this.player2;
    if (!p) return;
    if (p.energyPips < 3) {
      p.energyCharge += skillBoost;
      while (p.energyCharge >= 1.0 && p.energyPips < 3) {
        p.energyPips += 1;
        p.energyCharge -= 1.0;
      }
      if (p.energyPips >= 3) p.energyCharge = 0;
    } else {
      p.energyCharge = 0;
    }

    // Selama Assault Mode aktif, ultimate gauge terkunci hingga durasi 10 detik selesai
    if (!p.assaultMode.active) {
      p.ultimateCharge = Math.min(p.maxUltimate, p.ultimateCharge + ultBoost);
    }
  }

  applyDamageToPlayer(targetPlayer, amount, labelColor = '#FFE08A', isBurn = false) {
    if (!targetPlayer) return;
    targetPlayer.hp = Math.max(0, targetPlayer.hp - amount);
    targetPlayer.hurtTimer = 0.16;
    if (isBurn) targetPlayer.burnVisualTimer = 0.45;

    this.damageNumbers.push({
      x: targetPlayer.x + targetPlayer.width / 2 + (Math.random() - 0.5) * 24,
      y: targetPlayer.y - 8,
      text: isBurn ? `🔥 -${amount}` : `-${amount}`,
      color: labelColor,
      vy: -55,
      alpha: 1.0,
      life: 0.65
    });

    if (targetPlayer.hp <= 0) {
      targetPlayer.hp = 0;
      targetPlayer.state = 'hurt';
      targetPlayer.vx = 0;
      this.spawnFireBurst(targetPlayer.x + targetPlayer.width / 2, targetPlayer.y + targetPlayer.height / 2, 28, 220);

      if (!this.matchOver) {
        if (this.gameMode === 'pvp') {
          const loserNum = targetPlayer === this.player1 ? 1 : 2;
          const winnerNum = loserNum === 1 ? 2 : 1;
          this.handleMatchEnd(winnerNum, loserNum);
        } else {
          this.handleMatchEnd(0, 1);
        }
      }
    }
  }

  applyDamageToEnemy(enemy, amount, labelColor = '#FFE08A', isBurn = false) {
    enemy.hp -= amount;
    enemy.hurtTimer = 0.16;
    if (isBurn) enemy.burnVisualTimer = 0.45;

    this.damageNumbers.push({
      x: enemy.x + enemy.width / 2 + (Math.random() - 0.5) * 24,
      y: enemy.y - 8,
      text: isBurn ? `🔥 -${amount}` : `-${amount}`,
      color: labelColor,
      vy: -55,
      alpha: 1.0,
      life: 0.65
    });

    if (enemy.hp <= 0) {
      enemy.hp = 0;
      this.spawnFireBurst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 28, 220);
      if (!this.matchOver) {
        this.handleMatchEnd(1, 0);
      }
    }
  }

  handleMatchEnd(winnerNum, loserNum) {
    if (this.matchOver) return;
    this.matchOver = true;
    const winnerChar = winnerNum === 1 ? this.characterIdP1 : (winnerNum === 2 ? this.characterIdP2 : 'oni');
    const loserChar = loserNum === 1 ? this.characterIdP1 : (loserNum === 2 ? this.characterIdP2 : 'oni');

    this.matchResult = {
      winnerNum,
      loserNum,
      winnerChar,
      loserChar,
      matchId: this.currentMatchId
    };

    sound.stopBGM();

    if (winnerNum === 1) {
      sound.playQuestComplete();
    } else {
      sound.playWarning();
    }

    this.player1.vx = 0;
    this.player1.infernoDomain.active = false;
    this.player1.assaultMode.active = false;
    if (this.player2) {
      this.player2.vx = 0;
      this.player2.infernoDomain.active = false;
      this.player2.assaultMode.active = false;
    }

    if (this.onMatchEnd && !this.rewardAwarded) {
      this.rewardAwarded = true;
      this.onMatchEnd(this.matchResult);
    }

    this.showMatchResultUI();
  }

  showMatchResultUI() {
    if (!this.container) return;
    const stage = this.container.querySelector('#pvp-canvas-stage');
    if (!stage) return;

    this.hideMatchResultUI();

    const winnerNum = this.matchResult ? this.matchResult.winnerNum : 1;
    const isP1Winner = winnerNum === 1;
    const isPvP = this.gameMode === 'pvp';
    const charP1 = this.characterIdP1;
    const charP2 = this.characterIdP2;

    const getFighterPreview = (charId, facing) => {
      if (charId === 'meliodas') {
        return getMeliodasSVG({ mode: 'normal', size: 68, facing });
      }
      return getCharacterSVG({ outfitId: this.profile?.outfit, hatId: this.profile?.hat, rankId: this.rank?.id, size: 68, facing });
    };

    const overlay = document.createElement('div');
    overlay.className = 'pvp-match-result-overlay';
    overlay.id = 'pvp-match-result-overlay';

    overlay.innerHTML = `
      <div class="match-result-modal">
        <div class="result-header">
          <span class="rpg-tag">${isP1Winner ? 'HASIL: MENANG' : 'HASIL: KALAH'}</span>
          <h2 class="result-title ${isP1Winner ? 'victory' : 'defeat'}">
            ${isP1Winner ? 'VICTORY' : 'DEFEAT'}
          </h2>
          <p class="result-sub">
            ${isP1Winner ? 'Kemenangan Gemilang di Arena Hanamori!' : 'Pertarungan Sengit! Tetap Semangat dan Asah Fokusmu!'}
          </p>
        </div>

        <div class="match-fighters-summary">
          <!-- Player 1 Card -->
          <div class="fighter-result-card ${winnerNum === 1 ? 'card-winner' : 'card-loser'}">
            <div class="card-player-label">Pemain 1 (${this.profile?.name || 'Player 1'})</div>
            <div class="card-sprite-wrap">
              ${getFighterPreview(charP1, 'right')}
            </div>
            <div class="card-char-name">${charP1 === 'meliodas' ? 'Meliodas' : 'Traveler'}</div>
            <div class="badge-outcome ${winnerNum === 1 ? 'win' : 'loss'}">
              ${winnerNum === 1 ? 'VICTORY' : 'DEFEAT'}
            </div>
            <div class="card-rp-tag">${winnerNum === 1 ? '+20 RP' : '+0 RP'}</div>
          </div>

          <div class="vs-divider-box">
            <div class="vs-circle">VS</div>
          </div>

          <!-- Player 2 Card -->
          <div class="fighter-result-card ${winnerNum === 2 ? 'card-winner' : 'card-loser'}">
            <div class="card-player-label">${isPvP ? 'Pemain 2 (Lokal)' : 'Oni Penundaan'}</div>
            <div class="card-sprite-wrap">
              ${isPvP ? getFighterPreview(charP2, 'left') : getBossSVG('oni_procrastination', 68)}
            </div>
            <div class="card-char-name">${isPvP ? (charP2 === 'meliodas' ? 'Meliodas' : 'Traveler') : 'Oni Penundaan'}</div>
            <div class="badge-outcome ${winnerNum === 2 ? 'win' : 'loss'}">
              ${winnerNum === 2 ? 'VICTORY' : 'DEFEAT'}
            </div>
            <div class="card-rp-tag">${winnerNum === 2 ? '+20 RP' : '+0 RP'}</div>
          </div>
        </div>

        <!-- RP Reward Banner -->
        <div class="rp-reward-banner ${isP1Winner ? 'win' : 'loss'}">
          ${isP1Winner
            ? '🏆 <strong>Hadiah Kemenangan:</strong> +20 Rank Points (RP) berhasil ditambahkan ke profilmu!'
            : '⚔️ <strong>Hadiah:</strong> +0 RP • Coba lagi pada pertandingan berikutnya!'}
        </div>

        <!-- Actions -->
        <div class="match-result-actions">
          <button type="button" class="btn-match-rematch" id="btn-pvp-rematch">
            ⚔️ REMATCH (TANDING ULANG)
          </button>
          <button type="button" class="btn-match-char-select" id="btn-pvp-back-select">
            👥 KEMBALI KE PILIH KARAKTER
          </button>
        </div>
      </div>
    `;

    stage.appendChild(overlay);

    const btnRematch = overlay.querySelector('#btn-pvp-rematch');
    if (btnRematch) {
      btnRematch.addEventListener('click', () => {
        sound.playClick();
        this.rematch();
      });
    }

    const btnBackSelect = overlay.querySelector('#btn-pvp-back-select');
    if (btnBackSelect) {
      btnBackSelect.addEventListener('click', () => {
        sound.playClick();
        this.hideMatchResultUI();
        if (this.onBackToSelect) {
          this.onBackToSelect();
        }
      });
    }
  }

  hideMatchResultUI() {
    if (!this.container) return;
    const overlay = this.container.querySelector('#pvp-match-result-overlay');
    if (overlay) overlay.remove();
  }

  rematch() {
    this.matchOver = false;
    this.matchResult = null;
    this.rewardAwarded = false;
    this.currentMatchId = 'pvp_match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    // Reset Player 1
    this.player1.hp = this.player1.maxHp;
    this.player1.x = 340;
    this.player1.y = 500;
    this.player1.vx = 0;
    this.player1.vy = 0;
    this.player1.facing = 'right';
    this.player1.state = 'idle';
    this.player1.dashCooldown = 0;
    this.player1.qCooldown = 0;
    this.player1.attackCooldown = 0;
    this.player1.comboStep = 0;
    this.player1.energyPips = 3;
    this.player1.ultimateCharge = 0;
    this.player1.hurtTimer = 0;
    this.player1.burnVisualTimer = 0;
    this.player1.invulnerableTimer = 0.5;
    this.player1.assaultMode.active = false;
    this.player1.infernoDomain.active = false;

    // Reset Player 2 (if PvP)
    if (this.gameMode === 'pvp' && this.player2) {
      this.player2.hp = this.player2.maxHp;
      this.player2.x = 920;
      this.player2.y = 500;
      this.player2.vx = 0;
      this.player2.vy = 0;
      this.player2.facing = 'left';
      this.player2.state = 'idle';
      this.player2.dashCooldown = 0;
      this.player2.qCooldown = 0;
      this.player2.attackCooldown = 0;
      this.player2.comboStep = 0;
      this.player2.energyPips = 3;
      this.player2.ultimateCharge = 0;
      this.player2.hurtTimer = 0;
      this.player2.burnVisualTimer = 0;
      this.player2.invulnerableTimer = 0.5;
      this.player2.assaultMode.active = false;
      this.player2.infernoDomain.active = false;
    }

    // Reset PvE Enemy
    if (this.gameMode === 'pve') {
      for (const enemy of this.enemies) {
        enemy.hp = enemy.maxHp;
        enemy.x = 760;
        enemy.vx = -Math.abs(enemy.vx);
        enemy.hurtTimer = 0;
        enemy.burnVisualTimer = 0;
      }
    }

    this.projectiles = [];
    this.hellblazeWaves = [];
    this.hellblazeEruptions = [];
    this.phoenixProjectiles = [];
    this.particles = [];
    this.damageNumbers = [];

    this.syncCharacterStats(1);
    if (this.player2) this.syncCharacterStats(2);

    this.hideMatchResultUI();
    sound.playBGM();
  }

  spawnFireBurst(x, y, count = 14, speed = 150) {
    const colors = ['#FFFDF8', '#FFE08A', '#FF9F43', '#E17055', '#D96B84'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = (0.4 + Math.random() * 0.6) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 20,
        alpha: 0.95,
        color: colors[i % colors.length],
        size: Math.random() * 7 + 4,
        life: 0.35 + Math.random() * 0.2
      });
    }
  }

  updatePlayerMovementAndPhysics(p, inputState, playerNum, dt) {
    this.syncCharacterStats(playerNum);
    const charId = playerNum === 1 ? this.characterIdP1 : this.characterIdP2;
    const prevFeetY = p.y + p.height;

    // Trigger actions from input
    if (inputState && !this.matchOver) {
      if (inputState.jumpJustPressed) this.tryJump(playerNum);
      if (inputState.dashJustPressed) this.tryDash(playerNum);
      if (inputState.attackJustPressed) this.tryAttack(playerNum);
      if (inputState.skillQJustPressed) this.trySkillQ(playerNum);
      if (inputState.ultimateRJustPressed) this.tryUltimateR(playerNum);
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.state = 'dashing';
    } else {
      const moveSpeed = p.stats.moveSpeed;
      let targetVx = 0;

      // Check input manager or fallback legacy keys for P1
      if (this.matchOver) {
        p.vx = 0;
        p.vy += this.gravity * dt;
        return;
      }
      const goLeft = (inputState && inputState.left) || (playerNum === 1 && this.keys.a);
      const goRight = (inputState && inputState.right) || (playerNum === 1 && this.keys.d);

      if (goLeft && !goRight) {
        targetVx -= moveSpeed;
        p.facing = 'left';
      } else if (goRight && !goLeft) {
        targetVx += moveSpeed;
        p.facing = 'right';
      } else if (inputState && inputState.analogX !== 0) {
        targetVx = inputState.analogX * moveSpeed;
        if (inputState.analogX < -0.1) p.facing = 'left';
        else if (inputState.analogX > 0.1) p.facing = 'right';
      }

      const accelRate = p.grounded ? 0.52 : 0.38;
      p.vx += (targetVx - p.vx) * accelRate;
      if (Math.abs(p.vx) < 8 && targetVx === 0) p.vx = 0;

      p.vy += this.gravity * dt;
      if (p.vy > 900) p.vy = 900;

      if (p.grounded && Math.abs(p.vx) > 15) {
        p.walkCycle += dt * (Math.abs(p.vx) / p.baseStats.moveSpeed) * 16.5;
        if (Math.random() < 0.22) {
          this.particles.push({
            x: p.x + p.width / 2,
            y: p.y + p.height - 2,
            vx: -p.vx * 0.14,
            vy: -15 - Math.random() * 20,
            alpha: 0.45,
            color: (charId === 'meliodas' && p.assaultMode.active) ? '#9333EA' : '#F5EBDD',
            size: 4,
            life: 0.22
          });
        }
      } else {
        p.walkCycle = 0;
      }

      if (p.rCastTimer > 0) {
        p.state = 'casting_r';
      } else if (p.qCastTimer > 0) {
        p.state = 'casting_q';
      } else if (p.attackTimer > 0) {
        p.attackTimer -= dt;
        p.state = 'attacking';
      } else if (!p.grounded) {
        p.state = 'jumping';
      } else if (Math.abs(p.vx) > 15) {
        p.state = 'walking';
      } else {
        p.state = 'idle';
      }
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Platform Collisions (One-Way & Solid Ground)
    const wasGrounded = p.grounded;
    p.grounded = false;
    const currentFeetY = p.y + p.height;
    const footCenterX = p.x + p.width / 2;

    for (const plat of this.platforms) {
      const withinX = (footCenterX >= plat.x + 6) && (footCenterX <= plat.x + plat.w - 6);
      if (!withinX) continue;

      if (plat.oneWay) {
        if (p.vy >= 0 && prevFeetY <= plat.y + 12 && currentFeetY >= plat.y) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.grounded = true;
          if (!wasGrounded) {
            this.spawnDust(footCenterX, plat.y, '#F5EBDD', 4);
          }
          break;
        }
      } else {
        if (p.vy >= 0 && currentFeetY >= plat.y) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.grounded = true;
          if (!wasGrounded) {
            this.spawnDust(footCenterX, plat.y, '#F5EBDD', 5);
          }
          break;
        }
      }
    }

    // Arena Boundaries
    if (p.x < 52) {
      p.x = 52;
      p.vx = 0;
    }
    if (p.x + p.width > this.width - 52) {
      p.x = this.width - 52 - p.width;
      p.vx = 0;
    }
  }

  updatePlayerSkillsAndAuras(p, playerNum, dt) {
    p.animTimer += dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.comboResetTimer > 0) p.comboResetTimer -= dt;
    if (p.qCooldown > 0) p.qCooldown -= dt;
    if (p.qCastTimer > 0) p.qCastTimer -= dt;
    if (p.rCastTimer > 0) p.rCastTimer -= dt;
    if (p.hurtTimer > 0) p.hurtTimer -= dt;
    if (p.burnVisualTimer > 0) p.burnVisualTimer -= dt;
    if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;
    if (p.assaultMode.transformAnimTimer > 0) p.assaultMode.transformAnimTimer -= dt;

    // 1. Passive Skill Energy Orb Regeneration (3 Orbs)
    if (p.energyPips < 3) {
      p.energyCharge += dt * 0.22;
      if (p.energyCharge >= 1.0) {
        p.energyPips += 1;
        p.energyCharge = p.energyPips < 3 ? p.energyCharge - 1.0 : 0;
      }
    } else {
      p.energyCharge = 0;
    }

    // 2. Passive Ultimate Gauge Regeneration
    if (!p.infernoDomain.active && !p.assaultMode.active && p.ultimateCharge < p.maxUltimate) {
      p.ultimateCharge = Math.min(p.maxUltimate, p.ultimateCharge + dt * 2.5);
    }

    // 3A. Active Traveler Inferno Domain (R Ultimate)
    if (p.infernoDomain.active) {
      p.infernoDomain.timeLeft -= dt;
      p.infernoDomain.tickTimer -= dt;

      const footX = p.x + p.width / 2;
      const footY = p.y + p.height;
      const domainCenterY = p.y + p.height / 2;

      if (!this.reducedMotion && Math.random() < 0.78) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const offsetX = side * (16 + Math.random() * 28);
        this.particles.push({
          x: footX + offsetX,
          y: footY - 4 - Math.random() * 26,
          vx: side * (6 + Math.random() * 14),
          vy: -55 - Math.random() * 65,
          alpha: 0.88,
          color: Math.random() > 0.45 ? '#FFE08A' : '#FF7647',
          size: 4 + Math.random() * 4.5,
          life: 0.38
        });
      }

      if (p.infernoDomain.tickTimer <= 0) {
        p.infernoDomain.tickTimer = p.infernoDomain.tickInterval;

        // Damage lawan di mode PvP
        const opponent = playerNum === 1 ? this.player2 : this.player1;
        if (this.gameMode === 'pvp' && opponent) {
          const ox = opponent.x + opponent.width / 2;
          const oy = opponent.y + opponent.height / 2;
          const dist = Math.hypot(ox - footX, oy - domainCenterY);
          if (dist <= p.infernoDomain.radius + opponent.width * 0.4) {
            this.applyDamageToPlayer(opponent, p.infernoDomain.damagePerTick, '#FF9F43', true);
          }
        }

        // Damage musuh di mode PvE
        for (const enemy of this.enemies) {
          const ex = enemy.x + enemy.width / 2;
          const ey = enemy.y + enemy.height / 2;
          const dist = Math.hypot(ex - footX, ey - domainCenterY);
          if (dist <= p.infernoDomain.radius + enemy.width * 0.4) {
            this.applyDamageToEnemy(enemy, p.infernoDomain.damagePerTick, '#FF9F43', true);
          }
        }
      }

      if (p.infernoDomain.timeLeft <= 0) {
        p.infernoDomain.active = false;
        p.infernoDomain.timeLeft = 0;
      }
    }

    // 3B. Active Meliodas Assault Mode (R Ultimate)
    if (p.assaultMode.active) {
      p.assaultMode.timeLeft -= dt;

      if (!this.reducedMotion && Math.random() < 0.75) {
        const footX = p.x + p.width / 2;
        const footY = p.y + p.height;
        const side = Math.random() > 0.5 ? 1 : -1;
        this.particles.push({
          x: footX + side * (14 + Math.random() * 22),
          y: footY - 6 - Math.random() * 38,
          vx: (Math.random() - 0.5) * 18,
          vy: -48 - Math.random() * 58,
          alpha: 0.86,
          color: Math.random() > 0.35 ? '#6B21A8' : '#10B981',
          size: 4 + Math.random() * 4.5,
          life: 0.36
        });
      }

      if (p.assaultMode.timeLeft <= 0) {
        this.endAssaultMode(playerNum);
      }
    }
  }

  update(dt) {
    this.envTime += dt;

    // Sample inputs for Player 1 and Player 2
    let inP1 = null;
    let inP2 = null;
    if (this.inputManager) {
      inP1 = this.inputManager.samplePlayerInput(1);
      if (this.gameMode === 'pvp') {
        inP2 = this.inputManager.samplePlayerInput(2);
      }
    }

    // Update Player 1
    this.updatePlayerSkillsAndAuras(this.player1, 1, dt);
    this.updatePlayerMovementAndPhysics(this.player1, inP1, 1, dt);

    // Update Player 2 (if in PvP mode)
    if (this.gameMode === 'pvp' && this.player2) {
      this.updatePlayerSkillsAndAuras(this.player2, 2, dt);
      this.updatePlayerMovementAndPhysics(this.player2, inP2, 2, dt);
    }

    // 6. Update Sparring Enemy (in PvE mode)
    if (this.gameMode === 'pve') {
      for (const enemy of this.enemies) {
        if (enemy.hurtTimer > 0) enemy.hurtTimer -= dt;
        if (enemy.burnVisualTimer > 0) enemy.burnVisualTimer -= dt;

        enemy.x += enemy.vx * dt;
        if (enemy.x < enemy.patrolMinX) {
          enemy.x = enemy.patrolMinX;
          enemy.vx = Math.abs(enemy.vx);
        } else if (enemy.x > enemy.patrolMaxX) {
          enemy.x = enemy.patrolMaxX;
          enemy.vx = -Math.abs(enemy.vx);
        }
      }
    }

    // 7. Update Traveler Basic Attack Projectiles & Hit Detection
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt;
      proj.life -= dt;

      if (Math.random() < 0.65) {
        this.particles.push({
          x: proj.x,
          y: proj.y + (Math.random() - 0.5) * 10,
          vx: -proj.vx * 0.14,
          vy: (Math.random() - 0.5) * 28,
          alpha: 0.75,
          color: proj.trailColor,
          size: 6,
          life: 0.28
        });
      }

      let hitTarget = false;
      const owner = proj.ownerPlayer || 1;
      const targetP = owner === 1 ? this.player2 : this.player1;

      // Hit against other player in PvP mode
      if (this.gameMode === 'pvp' && targetP) {
        if (
          proj.x + proj.radius > targetP.x &&
          proj.x - proj.radius < targetP.x + targetP.width &&
          proj.y + proj.radius > targetP.y &&
          proj.y - proj.radius < targetP.y + targetP.height
        ) {
          this.applyDamageToPlayer(targetP, proj.damage || 14, '#FFE08A', false);
          this.grantOnHitEnergy(0.38, 9, owner);
          this.spawnDust(proj.x, proj.y, '#FFE08A', 8);
          hitTarget = true;
        }
      }

      // Hit against PvE enemy
      if (!hitTarget) {
        for (const enemy of this.enemies) {
          if (
            proj.x + proj.radius > enemy.x &&
            proj.x - proj.radius < enemy.x + enemy.width &&
            proj.y + proj.radius > enemy.y &&
            proj.y - proj.radius < enemy.y + enemy.height
          ) {
            this.applyDamageToEnemy(enemy, proj.damage || 14, '#FFE08A', false);
            this.grantOnHitEnergy(0.38, 9, owner);
            this.spawnDust(proj.x, proj.y, '#FFE08A', 8);
            hitTarget = true;
            break;
          }
        }
      }

      if (hitTarget || proj.life <= 0 || proj.x < 30 || proj.x > this.width - 30) {
        if (!hitTarget) this.spawnDust(proj.x, proj.y, '#FFE08A', 6);
        this.projectiles.splice(i, 1);
      }
    }

    // 8A. Update Traveler Phoenix Blast Projectiles (Q Skill) & Hit Detection
    for (let i = this.phoenixProjectiles.length - 1; i >= 0; i--) {
      const phx = this.phoenixProjectiles[i];
      phx.x += phx.vx * dt;
      phx.wingPhase += dt * 18;
      phx.life -= dt;

      if (!this.reducedMotion) {
        for (let t = 0; t < 2; t++) {
          this.particles.push({
            x: phx.x - phx.dir * 22 + (Math.random() - 0.5) * 14,
            y: phx.y + (Math.random() - 0.5) * 26,
            vx: -phx.vx * 0.18,
            vy: (Math.random() - 0.5) * 45,
            alpha: 0.88,
            color: Math.random() > 0.4 ? '#FF9F43' : '#FFE08A',
            size: 6 + Math.random() * 5,
            life: 0.34
          });
        }
      }

      let hitTarget = false;
      const owner = phx.ownerPlayer || 1;
      const targetP = owner === 1 ? this.player2 : this.player1;

      // Hit against other player in PvP mode
      if (this.gameMode === 'pvp' && targetP) {
        if (
          phx.x + phx.radius > targetP.x &&
          phx.x - phx.radius < targetP.x + targetP.width &&
          phx.y + phx.radius > targetP.y &&
          phx.y - phx.radius < targetP.y + targetP.height
        ) {
          this.applyDamageToPlayer(targetP, phx.damage, '#FF7647', false);
          this.spawnFireBurst(phx.x, phx.y, 20, 210);
          hitTarget = true;
        }
      }

      // Hit against PvE enemy
      if (!hitTarget) {
        for (const enemy of this.enemies) {
          if (
            phx.x + phx.radius > enemy.x &&
            phx.x - phx.radius < enemy.x + enemy.width &&
            phx.y + phx.radius > enemy.y &&
            phx.y - phx.radius < enemy.y + enemy.height
          ) {
            this.applyDamageToEnemy(enemy, phx.damage, '#FF7647', false);
            this.spawnFireBurst(phx.x, phx.y, 20, 210);
            hitTarget = true;
            break;
          }
        }
      }

      if (hitTarget || phx.life <= 0 || phx.x < 20 || phx.x > this.width - 20) {
        if (!hitTarget) this.spawnFireBurst(phx.x, phx.y, 14, 160);
        this.phoenixProjectiles.splice(i, 1);
      }
    }

    // 8B. Update Meliodas Ground-Traveling Hellblaze Waves (Q Skill) & Upward Eruption Trigger
    for (let i = this.hellblazeWaves.length - 1; i >= 0; i--) {
      const wave = this.hellblazeWaves[i];
      wave.x += wave.vx * dt;
      wave.y = this.findSurfaceYBelow(wave.x, wave.y);
      wave.phase += dt * 20;
      wave.life -= dt;

      if (!this.reducedMotion) {
        this.particles.push({
          x: wave.x + (Math.random() - 0.5) * 24,
          y: wave.y - 6 - Math.random() * 14,
          vx: -wave.vx * 0.12,
          vy: -35 - Math.random() * 45,
          alpha: 0.9,
          color: Math.random() > 0.35 ? '#6B21A8' : '#10B981',
          size: 5 + Math.random() * 5,
          life: 0.3
        });
      }

      let reachedTarget = false;
      const owner = wave.ownerPlayer || 1;
      const targetP = owner === 1 ? this.player2 : this.player1;

      // Check collision with opponent player in PvP mode
      if (this.gameMode === 'pvp' && targetP) {
        const pCenterX = targetP.x + targetP.width / 2;
        const pFeetY = targetP.y + targetP.height;
        if (
          Math.abs(wave.x - pCenterX) <= targetP.width * 0.55 + 22 &&
          Math.abs(wave.y - pFeetY) <= 68
        ) {
          this.triggerHellblazeEruption(wave, pCenterX, wave.y);
          reachedTarget = true;
        }
      }

      // Check collision with PvE enemy
      if (!reachedTarget) {
        for (const enemy of this.enemies) {
          const enemyCenterX = enemy.x + enemy.width / 2;
          const enemyFeetY = enemy.y + enemy.height;
          if (
            Math.abs(wave.x - enemyCenterX) <= enemy.width * 0.55 + 22 &&
            Math.abs(wave.y - enemyFeetY) <= 68
          ) {
            this.triggerHellblazeEruption(wave, enemyCenterX, wave.y);
            reachedTarget = true;
            break;
          }
        }
      }

      if (reachedTarget || wave.life <= 0 || wave.x < 45 || wave.x > this.width - 45) {
        if (!reachedTarget) {
          this.triggerHellblazeEruption(wave, wave.x, wave.y);
        }
        this.hellblazeWaves.splice(i, 1);
      }
    }

    // 8C. Update Active Hellblaze Upward Eruptions
    for (let i = this.hellblazeEruptions.length - 1; i >= 0; i--) {
      const er = this.hellblazeEruptions[i];
      er.progress += dt / er.duration;
      if (er.progress >= 1) {
        this.hellblazeEruptions.splice(i, 1);
      }
    }

    // 9. Camera Parallax & Ambient Updates (Focuses on center point between P1 and P2 in PvP)
    let camTargetX = this.player1.x + this.player1.width / 2;
    let camTargetY = this.player1.y + this.player1.height / 2;
    if (this.gameMode === 'pvp' && this.player2) {
      camTargetX = (this.player1.x + this.player2.x + this.player1.width) / 2;
      camTargetY = (this.player1.y + this.player2.y + this.player1.height) / 2;
    }
    const normX = (camTargetX - this.width / 2) / (this.width / 2);
    const normY = (camTargetY - this.height / 2) / (this.height / 2);
    this.camX += (normX - this.camX) * 0.1;
    this.camY += (normY - this.camY) * 0.1;

    for (const cloud of this.distantClouds) {
      if (!this.reducedMotion) {
        cloud.x += cloud.speed * dt;
        if (cloud.x > this.width + 150) cloud.x = -cloud.w - 100;
      }
    }

    if (!this.reducedMotion) {
      for (const petal of this.ambientPetals) {
        petal.swayPhase += dt * 2.2;
        petal.x += (petal.vx + Math.sin(petal.swayPhase) * 14) * dt;
        petal.y += petal.vy * dt;
        petal.angle += petal.spin * dt;

        if (petal.y > this.height + 20) {
          petal.y = -20;
          petal.x = Math.random() * (this.width + 200);
        }
        if (petal.x < -40) {
          petal.x = this.width + 30;
        }
      }

      for (const ff of this.ambientFireflies) {
        ff.phase += dt * 2.6;
        ff.x += ff.vx * dt;
        ff.y += ff.vy * dt;
        if (ff.x < 60 || ff.x > this.width - 60) ff.vx *= -1;
        if (ff.y < 140 || ff.y > 570) ff.vy *= -1;
      }
    }

    // Slash Effects
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      const slash = this.slashEffects[i];
      slash.progress += dt / slash.duration;
      if (slash.progress >= 1) {
        this.slashEffects.splice(i, 1);
      }
    }

    for (let i = this.lostvayneSlashes.length - 1; i >= 0; i--) {
      const lv = this.lostvayneSlashes[i];
      lv.progress += dt / lv.duration;
      if (lv.progress >= 1) {
        this.lostvayneSlashes.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.life -= dt;
      part.alpha *= 0.92;
      if (part.life <= 0 || part.alpha <= 0.05) {
        this.particles.splice(i, 1);
      }
    }

    // Damage Numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.y += dn.vy * dt;
      dn.life -= dt;
      dn.alpha = Math.max(0, dn.life / 0.65);
      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  spawnDust(x, y, color = '#F5EBDD', count = 5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 100,
        vy: -Math.random() * 75 - 15,
        alpha: 0.8,
        color,
        size: Math.random() * 5 + 3,
        life: 0.36
      });
    }
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Lapisan Langit & Atmosfer Waktu Dayloom + Nine Sols Mood
    this.renderSkyAndCelestial();

    // 2. Lapisan Pegunungan Suci Hanamori & Pagoda Jauh
    this.renderDistantMountains();

    // 3. Lapisan Pohon Sakura Tua Ilustratif & Roda Tenun Kuil Midground
    this.renderMidgroundScenery();

    // 4. Lapisan Arsitektur Arena Bela Diri & Platform Terintegrasi
    this.renderIntegratedArenaStructures();

    // 5. Lawan Uji Tanding Arena (Oni Penundaan)
    this.renderEnemies();

    // 6. Partikel Lingkungan Hidup (Kunang-kunang & Kelopak Sakura)
    this.renderAmbientLife();

    // 7. Efek Partikel Aksi, Proyektil, Phoenix Blast, & Hellblaze
    this.renderCombatEffects();

    // 8. Karakter Playable (P1 dan P2 jika mode PvP) + Efek Perimeter Ultimate
    this.renderInfernoDomain(this.player1);
    this.renderAssaultModeAura(this.player1, this.characterIdP1);
    this.renderCharacter(this.player1, this.characterIdP1);
    this.renderInfernoDomainForegroundFlames(this.player1);

    if (this.gameMode === 'pvp' && this.player2) {
      this.renderInfernoDomain(this.player2);
      this.renderAssaultModeAura(this.player2, this.characterIdP2);
      this.renderCharacter(this.player2, this.characterIdP2);
      this.renderInfernoDomainForegroundFlames(this.player2);
    }

    // 9. Foreground Siluet Dahan Sakura Berayun
    this.renderForegroundCanopy();

    // 10. Combat HUD (Nine Sols Style + Indikator Q & Emblem Ultimate R Sesuai Karakter)
    this.renderCombatHUD();
  }

  renderSkyAndCelestial() {
    const ctx = this.ctx;
    const shiftX = -this.camX * 10;
    const shiftY = -this.camY * 6;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#1B2A3D');
    skyGrad.addColorStop(0.38, '#2E4C63');
    skyGrad.addColorStop(0.72, '#6A8D92');
    skyGrad.addColorStop(1, '#D8C8B8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.width * 0.5 + shiftX * 0.6, 215 + shiftY * 0.6);

    const haloGrad = ctx.createRadialGradient(0, 0, 60, 0, 0, 240);
    haloGrad.addColorStop(0, 'rgba(255, 243, 214, 0.55)');
    haloGrad.addColorStop(0.5, 'rgba(232, 165, 181, 0.25)');
    haloGrad.addColorStop(1, 'rgba(232, 165, 181, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 240, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 250, 240, 0.88)';
    ctx.beginPath();
    ctx.arc(0, 0, 105, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(245, 235, 221, 0.38)';
    for (const c of this.distantClouds) {
      const cx = c.x + shiftX;
      const cy = c.y + shiftY;
      ctx.beginPath();
      ctx.roundRect(cx, cy, c.w, c.h * 0.55, 12);
      ctx.roundRect(cx + c.w * 0.18, cy - c.h * 0.35, c.w * 0.6, c.h * 0.5, 10);
      ctx.fill();
    }
    ctx.restore();
  }

  renderDistantMountains() {
    const ctx = this.ctx;
    const shiftX = -this.camX * 22;
    const shiftY = -this.camY * 12;

    ctx.save();
    ctx.translate(shiftX, shiftY);

    ctx.fillStyle = '#385266';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-80, 560);
    ctx.bezierCurveTo(60, 360, 180, 230, 310, 225);
    ctx.bezierCurveTo(420, 220, 490, 340, 640, 175);
    ctx.bezierCurveTo(780, 20, 910, 290, 1040, 210);
    ctx.bezierCurveTo(1160, 145, 1260, 280, 1360, 490);
    ctx.lineTo(1360, 620);
    ctx.lineTo(-80, 620);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(245, 235, 221, 0.45)';
    ctx.beginPath();
    ctx.moveTo(575, 225);
    ctx.quadraticCurveTo(640, 145, 705, 220);
    ctx.lineTo(675, 240);
    ctx.lineTo(640, 215);
    ctx.lineTo(605, 242);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#243545';
    const px = 640;
    const py = 195;
    ctx.fillRect(px - 2, py - 24, 4, 24);
    for (let tier = 0; tier < 3; tier++) {
      const ty = py + tier * 16;
      const tw = 22 + tier * 8;
      ctx.beginPath();
      ctx.moveTo(px - tw, ty);
      ctx.quadraticCurveTo(px, ty - 10, px + tw, ty);
      ctx.lineTo(px + tw - 5, ty + 5);
      ctx.lineTo(px - tw + 5, ty + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(px - tw * 0.55, ty + 5, tw * 1.1, 11);
    }

    const mistGrad = ctx.createLinearGradient(0, 390, 0, 540);
    mistGrad.addColorStop(0, 'rgba(245, 235, 221, 0)');
    mistGrad.addColorStop(0.5, 'rgba(245, 235, 221, 0.35)');
    mistGrad.addColorStop(1, 'rgba(38, 54, 74, 0.25)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(-80, 390, 1440, 150);

    ctx.restore();
  }

  renderMidgroundScenery() {
    const ctx = this.ctx;
    const shiftX = -this.camX * 38;
    const shiftY = -this.camY * 18;
    const breeze = this.reducedMotion ? 0 : Math.sin(this.envTime * 1.6) * 5;

    ctx.save();
    ctx.translate(shiftX, shiftY);

    ctx.fillStyle = '#2B3E4E';
    ctx.beginPath();
    ctx.moveTo(-60, 600);
    ctx.quadraticCurveTo(220, 430, 520, 495);
    ctx.quadraticCurveTo(840, 540, 1080, 435);
    ctx.quadraticCurveTo(1220, 405, 1340, 480);
    ctx.lineTo(1340, 620);
    ctx.lineTo(-60, 620);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(640, 385);
    ctx.rotate(this.reducedMotion ? 0 : this.envTime * 0.06);
    ctx.strokeStyle = 'rgba(255, 224, 138, 0.24)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 135, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(232, 165, 181, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 108, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 45, Math.sin(a) * 45);
      ctx.lineTo(Math.cos(a) * 135, Math.sin(a) * 135);
      ctx.stroke();
    }
    ctx.restore();

    this.drawStylizedSakuraTree(ctx, 88, 580, 1.0, breeze);
    this.drawStylizedSakuraTree(ctx, 1192, 580, -1.0, -breeze * 0.9);

    ctx.restore();
  }

  drawStylizedSakuraTree(ctx, baseX, baseY, flipX, sway) {
    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(flipX, 1);

    ctx.fillStyle = '#4A3327';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-32, 0);
    ctx.quadraticCurveTo(-22, -95, 12 + sway * 0.25, -195);
    ctx.quadraticCurveTo(42 + sway * 0.5, -265, 96 + sway, -315);
    ctx.lineTo(112 + sway, -300);
    ctx.quadraticCurveTo(58 + sway * 0.5, -245, 34 + sway * 0.3, -172);
    ctx.quadraticCurveTo(14, -85, 26, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(2, -165);
    ctx.quadraticCurveTo(-25 + sway * 0.4, -225, -45 + sway * 0.6, -260);
    ctx.lineTo(-32 + sway * 0.6, -268);
    ctx.quadraticCurveTo(-8 + sway * 0.4, -225, 16, -180);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#332219';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-10, -25);
    ctx.quadraticCurveTo(4, -110, 22 + sway * 0.2, -185);
    ctx.stroke();

    const clusters = [
      { cx: -28 + sway * 0.5, cy: -268, rx: 58, ry: 32, color: '#B85D76' },
      { cx: 42 + sway * 0.65, cy: -272, rx: 76, ry: 42, color: '#C86D85' },
      { cx: 108 + sway * 0.9, cy: -312, rx: 86, ry: 46, color: '#E8A5B5' },
      { cx: 12 + sway * 0.55, cy: -308, rx: 68, ry: 38, color: '#F3C1CE' },
      { cx: 82 + sway * 0.85, cy: -344, rx: 70, ry: 36, color: '#FCE4EC' }
    ];

    for (const c of clusters) {
      ctx.fillStyle = c.color;
      ctx.strokeStyle = '#26364A';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(c.cx, c.cy, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFDF8';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(c.cx - c.rx * 0.25, c.cy - c.ry * 0.25, c.rx * 0.45, c.ry * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  renderIntegratedArenaStructures() {
    const ctx = this.ctx;
    const pulse = this.reducedMotion ? 0.85 : 0.78 + Math.sin(this.envTime * 3.2) * 0.18;
    const flagWave = this.reducedMotion ? 0 : Math.sin(this.envTime * 2.8) * 6;

    this.drawMartialSanctuaryWing(ctx, 110, 480, 250, 150, 290, 210, pulse, flagWave, 'left');
    this.drawMartialSanctuaryWing(ctx, 920, 480, 250, 920, 290, 210, pulse, -flagWave, 'right');
    this.drawCentralToriiStructure(ctx, 450, 385, 380, pulse, flagWave);
    this.drawMainGroundAndBridge(ctx, pulse);
  }

  drawMartialSanctuaryWing(ctx, terX, terY, terW, roofX, roofY, roofW, pulse, flagWave, side) {
    ctx.save();

    ctx.fillStyle = '#334454';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2.5;
    ctx.fillRect(terX + 16, terY + 18, terW - 32, 580 - (terY + 18));
    ctx.strokeRect(terX + 16, terY + 18, terW - 32, 580 - (terY + 18));

    ctx.fillStyle = '#26364A';
    ctx.fillRect(terX + 34, terY + 28, terW - 68, 62);
    ctx.strokeStyle = '#5E798D';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(terX + 34, terY + 28, terW - 68, 62);

    const crestX = terX + terW / 2;
    const crestY = terY + 59;
    ctx.strokeStyle = `rgba(255, 224, 138, ${0.65 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(crestX, crestY, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crestX - 10, crestY + 10);
    ctx.lineTo(crestX + 10, crestY - 10);
    ctx.moveTo(crestX + 10, crestY + 10);
    ctx.lineTo(crestX - 10, crestY - 10);
    ctx.stroke();

    const p1X = roofX + 20;
    const p2X = roofX + roofW - 34;
    ctx.fillStyle = '#6E4F3E';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2.2;
    ctx.fillRect(p1X, roofY + 14, 14, terY - (roofY + 14));
    ctx.strokeRect(p1X, roofY + 14, 14, terY - (roofY + 14));
    ctx.fillRect(p2X, roofY + 14, 14, terY - (roofY + 14));
    ctx.strokeRect(p2X, roofY + 14, 14, terY - (roofY + 14));

    ctx.fillStyle = '#26364A';
    ctx.fillRect(p1X - 2, terY - 18, 18, 18);
    ctx.fillRect(p2X - 2, terY - 18, 18, 18);

    ctx.fillStyle = '#523A2B';
    ctx.fillRect(p1X - 6, roofY + 34, roofW - 28, 9);
    ctx.strokeRect(p1X - 6, roofY + 34, roofW - 28, 9);

    const bannerX = side === 'left' ? p1X + 24 : p2X - 52;
    const bannerY = roofY + 43;
    ctx.fillStyle = side === 'left' ? '#8F3956' : '#26364A';
    ctx.beginPath();
    ctx.moveTo(bannerX, bannerY);
    ctx.lineTo(bannerX + 28, bannerY);
    ctx.quadraticCurveTo(bannerX + 28 + flagWave, bannerY + 40, bannerX + 24 + flagWave * 0.7, bannerY + 75);
    ctx.lineTo(bannerX + 14 + flagWave * 0.5, bannerY + 64);
    ctx.lineTo(bannerX + flagWave * 0.7, bannerY + 75);
    ctx.quadraticCurveTo(bannerX + flagWave, bannerY + 40, bannerX, bannerY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFE08A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    this.drawGlowingLantern(ctx, roofX + roofW / 2, roofY + 24, pulse);
    this.drawWalkableDeck(ctx, terX, terY, terW, 22, '#4A6274', '#8DA2B5', '#FFE08A');

    ctx.fillStyle = '#26364A';
    ctx.strokeStyle = '#FFE08A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(roofX - 20, roofY + 12);
    ctx.quadraticCurveTo(roofX + roofW / 2, roofY - 14, roofX + roofW + 20, roofY + 12);
    ctx.lineTo(roofX + roofW + 8, roofY + 18);
    ctx.lineTo(roofX - 8, roofY + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    this.drawWalkableDeck(ctx, roofX, roofY, roofW, 16, '#26364A', '#5C9EAD', '#FFE08A');

    ctx.restore();
  }

  drawCentralToriiStructure(ctx, x, y, w, pulse, flagWave) {
    ctx.save();

    const leftPillarX = x + 42;
    const rightPillarX = x + w - 60;
    const pillarW = 18;

    ctx.fillStyle = '#B83A4B';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2.5;

    ctx.fillRect(leftPillarX, y + 16, pillarW, 580 - (y + 16));
    ctx.strokeRect(leftPillarX, y + 16, pillarW, 580 - (y + 16));
    ctx.fillRect(rightPillarX, y + 16, pillarW, 580 - (y + 16));
    ctx.strokeRect(rightPillarX, y + 16, pillarW, 580 - (y + 16));

    ctx.fillStyle = '#26364A';
    ctx.fillRect(leftPillarX - 4, 552, pillarW + 8, 28);
    ctx.fillRect(rightPillarX - 4, 552, pillarW + 8, 28);

    ctx.fillStyle = '#942636';
    ctx.fillRect(x + 20, y + 36, w - 40, 12);
    ctx.strokeRect(x + 20, y + 36, w - 40, 12);

    ctx.strokeStyle = '#D4A359';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftPillarX + pillarW, y + 48);
    ctx.quadraticCurveTo(x + w / 2, y + 72 + flagWave * 0.4, rightPillarX, y + 48);
    ctx.stroke();

    this.drawGlowingLantern(ctx, x + w / 2, y + 54, pulse);
    this.drawWalkableDeck(ctx, x, y, w, 20, '#942636', '#D96B84', '#FFE08A');

    ctx.fillStyle = '#26364A';
    ctx.strokeStyle = '#FFE08A';
    ctx.lineWidth = 2;
    ctx.fillRect(x + w / 2 - 18, y + 14, 36, 26);
    ctx.strokeRect(x + w / 2 - 18, y + 14, 36, 26);
    ctx.fillStyle = '#FFE08A';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 27, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawMainGroundAndBridge(ctx, pulse) {
    ctx.save();
    const groundY = 580;

    const waterGrad = ctx.createLinearGradient(0, groundY, 0, this.height);
    waterGrad.addColorStop(0, '#365870');
    waterGrad.addColorStop(1, '#1B2D3E');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, groundY + 12, this.width, this.height - groundY);

    ctx.strokeStyle = 'rgba(255, 224, 138, 0.28)';
    ctx.lineWidth = 2;
    const rippleOffset = this.reducedMotion ? 0 : Math.sin(this.envTime * 2) * 12;
    for (let i = 0; i < 7; i++) {
      const rx = 140 + i * 165 + rippleOffset;
      const ry = groundY + 45 + (i % 2) * 24;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 55, ry);
      ctx.stroke();
    }

    ctx.fillStyle = '#4A3F39';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2.5;
    ctx.fillRect(0, groundY, 430, this.height - groundY);
    ctx.strokeRect(0, groundY, 430, this.height - groundY);
    ctx.fillRect(850, groundY, 430, this.height - groundY);
    ctx.strokeRect(850, groundY, 430, this.height - groundY);

    ctx.fillStyle = '#68A67D';
    ctx.fillRect(0, groundY, 430, 10);
    ctx.fillRect(850, groundY, 430, 10);

    ctx.strokeStyle = '#8C2D19';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(420, groundY + 28);
    ctx.quadraticCurveTo(640, groundY + 4, 860, groundY + 28);
    ctx.stroke();

    ctx.fillStyle = '#B84A39';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2;
    ctx.fillRect(425, groundY - 24, 430, 7);
    ctx.strokeRect(425, groundY - 24, 430, 7);

    for (let postX = 435; postX <= 845; postX += 68) {
      ctx.fillStyle = '#8C2D19';
      ctx.fillRect(postX, groundY - 32, 10, 32);
      ctx.strokeRect(postX, groundY - 32, 10, 32);
      ctx.fillStyle = '#FFE08A';
      ctx.fillRect(postX - 1, groundY - 37, 12, 5);
    }

    this.drawWalkableDeck(ctx, 40, groundY, 1200, 18, '#5A3D28', '#C4B097', '#FFE08A');

    this.drawStoneLantern(ctx, 395, groundY, pulse);
    this.drawStoneLantern(ctx, 885, groundY, pulse);

    ctx.restore();
  }

  drawWalkableDeck(ctx, x, y, w, h, baseColor, topHighlightColor, trimColor) {
    ctx.save();
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = topHighlightColor;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 1, w - 4, 6, [4, 4, 0, 0]);
    ctx.fill();

    ctx.strokeStyle = trimColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + h - 5);
    ctx.lineTo(x + w - 14, y + h - 5);
    ctx.stroke();
    ctx.restore();
  }

  drawGlowingLantern(ctx, x, y, pulse) {
    ctx.save();
    const glow = ctx.createRadialGradient(x, y + 10, 2, x, y + 10, 42 * pulse);
    glow.addColorStop(0, `rgba(255, 224, 138, ${0.65 * pulse})`);
    glow.addColorStop(0.5, `rgba(225, 112, 85, ${0.25 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 224, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y + 10, 42 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = '#FFE08A';
    ctx.fillRect(x - 8, y, 16, 20);
    ctx.strokeRect(x - 8, y, 16, 20);

    ctx.fillStyle = '#E17055';
    ctx.fillRect(x - 4, y + 5, 8, 10);
    ctx.restore();
  }

  drawStoneLantern(ctx, x, groundY, pulse) {
    ctx.save();
    ctx.translate(x, groundY);

    const glow = ctx.createRadialGradient(0, -32, 3, 0, -32, 46 * pulse);
    glow.addColorStop(0, `rgba(255, 224, 138, ${0.6 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 224, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -32, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7A756C';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2;
    ctx.fillRect(-6, -24, 12, 24);
    ctx.strokeRect(-6, -24, 12, 24);

    ctx.fillStyle = '#FFE08A';
    ctx.fillRect(-9, -38, 18, 14);
    ctx.strokeRect(-9, -38, 18, 14);

    ctx.fillStyle = '#524E48';
    ctx.beginPath();
    ctx.moveTo(-15, -38);
    ctx.lineTo(0, -49);
    ctx.lineTo(15, -38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * PHASE 1 — Visualisasi Ultimate R Traveler yang Diperhalus: INFERNO DOMAIN
   * - Menghapus cincin kubah besar di atas kepala (`arc(cx, cy, r)`).
   * - Menghadirkan pusaran api yang terkonsentrasi di sekitar kaki dan sisi kiri-kanan tubuh Traveler
   *   sehingga tubuh dan wajah Traveler tetap 100% jelas terlihat.
   */
  renderInfernoDomain() {
    const p = this.player;
    if (!p.infernoDomain.active) return;

    const ctx = this.ctx;
    const footX = p.x + p.width / 2;
    const footY = p.y + p.height - 2;
    const pulse = 0.88 + Math.sin(this.envTime * 9) * 0.12;

    ctx.save();

    // 1. Pendaran Hangat di Permukaan Lantai Tempat Traveler Berpijak
    const groundGlow = ctx.createRadialGradient(footX, footY, 6, footX, footY, 92);
    groundGlow.addColorStop(0, 'rgba(255, 224, 138, 0.42)');
    groundGlow.addColorStop(0.55, 'rgba(255, 118, 71, 0.28)');
    groundGlow.addColorStop(1, 'rgba(225, 95, 65, 0)');
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(footX, footY, 92, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Pusaran Cincin Bara Api di Sekeliling Kaki Traveler (Immediate Foot Perimeter)
    ctx.strokeStyle = `rgba(255, 159, 67, ${0.82 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(footX, footY, 48, 12, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Lidah-lidah Api Belakang yang Menjulang Alami di Sisi Kiri & Kanan Tubuh Traveler
    const sideOffsets = [-38, -28, -20, 20, 28, 38];
    for (let i = 0; i < sideOffsets.length; i++) {
      const ox = sideOffsets[i];
      const sway = Math.sin(this.envTime * 11 + i * 1.4) * 5;
      const fx = footX + ox + sway * 0.35;
      const fy = footY + (Math.abs(ox) < 25 ? 2 : -2);
      const flameH = (Math.abs(ox) > 30 ? 34 : 46) + Math.sin(this.envTime * 13 + i) * 8;
      const flameW = Math.abs(ox) > 30 ? 9 : 11;

      ctx.fillStyle = i % 2 === 0 ? '#FF7647' : '#E15F41';
      ctx.beginPath();
      ctx.moveTo(fx - flameW, fy);
      ctx.quadraticCurveTo(fx - flameW * 0.4, fy - flameH * 0.6, fx + sway, fy - flameH);
      ctx.quadraticCurveTo(fx + flameW * 0.5, fy - flameH * 0.55, fx + flameW, fy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFE08A';
      ctx.beginPath();
      ctx.moveTo(fx - flameW * 0.5, fy);
      ctx.quadraticCurveTo(fx, fy - flameH * 0.72, fx + flameW * 0.5, fy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Lidah Api Depan Rendah di Sekitar Kaki Traveler (Menjaga Tubuh Traveler Tetap Terbaca Jelas)
   */
  renderInfernoDomainForegroundFlames() {
    const p = this.player;
    if (!p.infernoDomain.active) return;

    const ctx = this.ctx;
    const footX = p.x + p.width / 2;
    const footY = p.y + p.height;

    ctx.save();
    const frontOffsets = [-32, -16, 16, 32];
    for (let i = 0; i < frontOffsets.length; i++) {
      const ox = frontOffsets[i];
      const wave = Math.cos(this.envTime * 12 + i * 1.7) * 4;
      const fx = footX + ox + wave * 0.4;
      const fy = footY + 3;
      const fh = 16 + Math.sin(this.envTime * 10 + i) * 5;

      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 224, 138, 0.9)' : 'rgba(255, 118, 71, 0.88)';
      ctx.beginPath();
      ctx.moveTo(fx - 6, fy);
      ctx.quadraticCurveTo(fx + wave * 0.5, fy - fh, fx + 6, fy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * PHASE 3 & Refinement — Visualisasi Aura Gelap Assault Mode Meliodas
   * Menghadirkan transformasi iblis penuh kuasa sesuai kanon (The Seven Deadly Sins: IDLE Adventure):
   * - Proyeksi sayap kegelapan lebar (broad ethereal dark matter dragonic wings)
   * - Orb materi hitam melayang di sisi tangan dengan satelit partikel
   * - Tentakel bayangan hidup (writhing living shadow tendrils) melonjak dari tanah
   * - Pendaran dan retakan klan iblis pada pijakan tanah
   */
  renderAssaultModeAura() {
    const p = this.player;
    if (this.characterId !== 'meliodas' || !p.assaultMode.active) return;

    const ctx = this.ctx;
    const footX = p.x + p.width / 2;
    const footY = p.y + p.height - 2;
    const chestY = footY - 48;
    const pulse = 0.88 + Math.sin(this.envTime * 8) * 0.12;
    const wingFlap = Math.sin(this.envTime * 5.5) * 6;
    const dir = p.facing === 'left' ? -1 : 1;

    ctx.save();

    // 1. Pendaran Lantai Ungu-Hitam & Void Klan Iblis
    const darkGlow = ctx.createRadialGradient(footX, footY, 8, footX, footY, 96);
    darkGlow.addColorStop(0, 'rgba(12, 6, 20, 0.88)');
    darkGlow.addColorStop(0.45, 'rgba(107, 33, 168, 0.52)');
    darkGlow.addColorStop(0.78, 'rgba(16, 185, 129, 0.25)');
    darkGlow.addColorStop(1, 'rgba(12, 6, 20, 0)');
    ctx.fillStyle = darkGlow;
    ctx.beginPath();
    ctx.ellipse(footX, footY, 96, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Retakan Tanah Energi Kegelapan (Cursed Ground Fissures)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(footX - 54, footY - 1);
    ctx.lineTo(footX - 28, footY + 2);
    ctx.lineTo(footX - 10, footY - 2);
    ctx.lineTo(footX + 16, footY + 1);
    ctx.lineTo(footX + 48, footY - 1);
    ctx.stroke();

    // 3. Proyeksi Sayap Kegelapan Ethereal di Belakang Meliodas (Broad Ethereal Wings of Darkness)
    // Melengkapi sayap pixel-art utama dengan pendaran energi dinamis tanpa mengaburkan siluet karakter
    ctx.save();
    ctx.translate(footX, chestY + 6);
    // Sayap Kiri
    ctx.fillStyle = 'rgba(12, 6, 20, 0.36)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.52)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-22, 10);
    ctx.quadraticCurveTo(-50, -16 - wingFlap, -80, -38 + wingFlap * 0.5);
    ctx.quadraticCurveTo(-64, -10, -70, 8);
    ctx.quadraticCurveTo(-48, 4, -40, 20);
    ctx.quadraticCurveTo(-28, 15, -18, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sayap Kanan
    ctx.beginPath();
    ctx.moveTo(22, 10);
    ctx.quadraticCurveTo(50, -16 - wingFlap, 80, -38 + wingFlap * 0.5);
    ctx.quadraticCurveTo(64, -10, 70, 8);
    ctx.quadraticCurveTo(48, 4, 40, 20);
    ctx.quadraticCurveTo(28, 15, 18, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Orb Materi Kegelapan Melayang (Iconic Floating Darkness Sphere dari Referensi Utama)
    const orbX = footX + dir * 42;
    const orbY = chestY - 12 + Math.sin(this.envTime * 4.2) * 5;
    const orbGrad = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, 13);
    orbGrad.addColorStop(0, '#0C0614');
    orbGrad.addColorStop(0.65, '#581C87');
    orbGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 13, 0, Math.PI * 2);
    ctx.fill();

    // Satelit Partikel Kegelapan Berputar Mengelilingi Orb
    const satAngle = this.envTime * 7.5;
    for (let s = 0; s < 3; s++) {
      const a = satAngle + (s * Math.PI * 2) / 3;
      const sx = orbX + Math.cos(a) * 10;
      const sy = orbY + Math.sin(a) * 6;
      ctx.fillStyle = s === 0 ? '#C084FC' : '#10B981';
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Lidah Bayangan Hidup di Sisi Kiri & Kanan Kaki (Menjaga Torso & Wajah Tetap 100% Terbaca)
    const offsets = [-44, -30, 30, 44];
    for (let i = 0; i < offsets.length; i++) {
      const ox = offsets[i];
      const sway = Math.sin(this.envTime * 11 + i * 1.6) * 5;
      const fx = footX + ox + sway * 0.35;
      const fh = (Math.abs(ox) > 35 ? 36 : 48) * pulse;

      ctx.fillStyle = '#0C0614';
      ctx.strokeStyle = i % 2 === 0 ? '#9333EA' : '#10B981';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(fx - 5, footY);
      ctx.quadraticCurveTo(fx + sway, footY - fh * 0.5, fx + sway * 1.1, footY - fh);
      ctx.quadraticCurveTo(fx + sway * 0.4, footY - fh * 0.45, fx + 5, footY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 6. Gelombang Kejut Ledakan Transformasi Saat Awal Aktif
    if (p.assaultMode.transformAnimTimer > 0) {
      const t = 1 - (p.assaultMode.transformAnimTimer / 0.48);
      const ringR = 24 + t * 125;
      ctx.strokeStyle = `rgba(168, 85, 247, ${1 - t})`;
      ctx.lineWidth = 5 * (1 - t);
      ctx.beginPath();
      ctx.arc(footX, footY - 32, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Sambaran Kilat Energi Kegelapan Radial
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - t) * 0.8})`;
      ctx.lineWidth = 1.8;
      for (let k = 0; k < 6; k++) {
        const ka = (k * Math.PI) / 3 + t * 0.8;
        ctx.beginPath();
        ctx.moveTo(footX + Math.cos(ka) * (ringR * 0.4), footY - 32 + Math.sin(ka) * (ringR * 0.4));
        ctx.lineTo(footX + Math.cos(ka) * ringR, footY - 32 + Math.sin(ka) * ringR);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  renderEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      ctx.save();
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height;

      ctx.fillStyle = 'rgba(20, 24, 38, 0.45)';
      ctx.beginPath();
      ctx.ellipse(ex, ey - 2, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.burnVisualTimer > 0) {
        const bGlow = ctx.createRadialGradient(ex, ey - 32, 4, ex, ey - 32, 40);
        bGlow.addColorStop(0, 'rgba(255, 159, 67, 0.65)');
        bGlow.addColorStop(1, 'rgba(255, 118, 71, 0)');
        ctx.fillStyle = bGlow;
        ctx.beginPath();
        ctx.arc(ex, ey - 32, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      if (this.enemySprite.complete && this.enemySprite.naturalWidth > 0) {
        if (enemy.hurtTimer > 0) {
          ctx.filter = 'brightness(1.6)';
        }
        ctx.drawImage(this.enemySprite, ex - 38, ey - 72, 76, 76);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = '#9E2A47';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }

      const bw = 64;
      const bh = 7;
      const bx = ex - bw / 2;
      const by = enemy.y - 16;
      ctx.fillStyle = 'rgba(20, 24, 38, 0.85)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#26364A';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, bh);

      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(bx + 1, by + 1, (bw - 2) * hpPct, bh - 2);

      ctx.restore();
    }
  }

  renderAmbientLife() {
    const ctx = this.ctx;

    for (const ff of this.ambientFireflies) {
      const alpha = 0.35 + Math.sin(ff.phase) * 0.3;
      ctx.save();
      ctx.globalAlpha = Math.max(0.1, alpha);
      ctx.fillStyle = '#FFE08A';
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, ff.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFDF8';
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, ff.r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const p of this.ambientPetals) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderCombatEffects() {
    const ctx = this.ctx;

    // 1. Particles
    for (const part of this.particles) {
      ctx.save();
      ctx.globalAlpha = part.alpha;
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Traveler Basic Attack Projectiles
    for (const proj of this.projectiles) {
      ctx.save();
      const pGrad = ctx.createRadialGradient(proj.x, proj.y, 2, proj.x, proj.y, proj.radius * 1.3);
      pGrad.addColorStop(0, '#FFFFFF');
      pGrad.addColorStop(0.45, '#FFE08A');
      pGrad.addColorStop(1, 'rgba(232, 165, 181, 0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFDF8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      const dir = proj.vx > 0 ? 1 : -1;
      ctx.arc(proj.x - dir * 4, proj.y, proj.radius * 0.85, -Math.PI / 2.3, Math.PI / 2.3, dir < 0);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Traveler Skill Q: Phoenix Blast Projectiles
    for (const phx of this.phoenixProjectiles) {
      this.drawPhoenixProjectile(ctx, phx);
    }

    // 4. Meliodas Skill Q: Ground-Traveling Hellblaze Waves & Upward Eruptions
    for (const wave of this.hellblazeWaves) {
      this.drawHellblazeGroundWave(ctx, wave);
    }
    for (const er of this.hellblazeEruptions) {
      this.drawHellblazeEruptionPillar(ctx, er);
    }

    // 5. Traveler Slash Arc Effects
    for (const slash of this.slashEffects) {
      ctx.save();
      ctx.translate(slash.x, slash.y);
      ctx.scale(slash.dir, 1);

      const alpha = Math.max(0, 1 - slash.progress);
      ctx.strokeStyle = `rgba(255, 224, 138, ${alpha})`;
      ctx.lineWidth = 5 * (1 - slash.progress * 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, slash.radius * (0.75 + slash.progress * 0.45), -Math.PI / 2.6, Math.PI / 2.6);
      ctx.stroke();

      ctx.strokeStyle = `rgba(232, 165, 181, ${alpha * 0.85})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, slash.radius * (0.62 + slash.progress * 0.35), -Math.PI / 2.8, Math.PI / 2.8);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Meliodas Lostvayne Sword Slash Arcs
    for (const lv of this.lostvayneSlashes) {
      this.drawLostvayneSlashArc(ctx, lv);
    }

    // 7. Floating Damage Numbers
    for (const dn of this.damageNumbers) {
      ctx.save();
      ctx.globalAlpha = dn.alpha;
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = dn.color;
      ctx.strokeStyle = '#26364A';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(dn.text, dn.x, dn.y);
      ctx.fillText(dn.text, dn.x, dn.y);
      ctx.restore();
    }
  }

  /**
   * Menggambar Busur Tebasan Pedang Lostvayne (Dynamic Anime Slash Arc Ribbon)
   * Dilengkapi bilah luar putih-perak tajam, gelombang energi hijau zamrud (atau ungu-iblis dalam Assault Mode),
   * 5 pendaran lubang bilah Lostvayne, dan garis kecepatan kinetik.
   */
  drawLostvayneSlashArc(ctx, lv) {
    ctx.save();
    ctx.translate(lv.x, lv.y);
    ctx.scale(lv.dir, 1);

    const alpha = Math.max(0, 1 - lv.progress);
    const rotOffset = lv.comboStep === 1 ? -0.32 : (lv.comboStep === 2 ? 0.28 : 0);
    ctx.rotate(rotOffset);

    const r = lv.radius * (0.82 + lv.progress * 0.38);
    const outerR = r * 1.08;
    const innerR = r * 0.70;
    const startAngle = -Math.PI * 0.46;
    const endAngle = Math.PI * 0.44;

    // 1. Pita Busur Tebasan Gradien Penuh (Tapered Crescent Slash Ribbon)
    const slashGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
    if (lv.assault) {
      slashGrad.addColorStop(0, 'rgba(12, 6, 20, 0)');
      slashGrad.addColorStop(0.35, `rgba(126, 34, 206, ${alpha * 0.65})`);
      slashGrad.addColorStop(0.75, `rgba(192, 132, 252, ${alpha * 0.95})`);
      slashGrad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);
    } else {
      slashGrad.addColorStop(0, 'rgba(20, 61, 48, 0)');
      slashGrad.addColorStop(0.35, `rgba(16, 185, 129, ${alpha * 0.65})`);
      slashGrad.addColorStop(0.75, `rgba(52, 211, 153, ${alpha * 0.95})`);
      slashGrad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);
    }

    ctx.fillStyle = slashGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, startAngle, endAngle, false);
    ctx.arc(0, 0, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();

    // 2. Mata Bilah Perak-Putih Tajam Berkilau di Sisi Luar
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
    ctx.lineWidth = 2.4 * (1 - lv.progress * 0.35);
    ctx.beginPath();
    ctx.arc(0, 0, outerR, startAngle + 0.08, endAngle - 0.05, false);
    ctx.stroke();

    // 3. Garis Kecepatan Kinetik (Motion Speed Lines)
    ctx.strokeStyle = lv.assault ? `rgba(216, 180, 254, ${alpha * 0.6})` : `rgba(167, 243, 208, ${alpha * 0.6})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, outerR + 6, startAngle + 0.15, endAngle - 0.15, false);
    ctx.stroke();

    // 4. TEPAT 5 PENDARAN LUBANG SIRKULAR KHAS BILAH LOSTVAYNE DENGAN BINTANG KILAU
    const midR = (outerR + innerR) * 0.5;
    for (let h = -2; h <= 2; h++) {
      const a = h * 0.22;
      const hx = Math.cos(a) * midR;
      const hy = Math.sin(a) * midR;
      const glintAlpha = alpha * (1 - Math.abs(h) * 0.1);

      // Cincin Emas Pelindung Lubang
      ctx.fillStyle = `rgba(229, 184, 75, ${glintAlpha})`;
      ctx.beginPath();
      ctx.arc(hx, hy, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Inti Lubang Tembus Bilah
      ctx.fillStyle = lv.assault ? '#0C0614' : '#143D30';
      ctx.beginPath();
      ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Kilau Bintang Salib 4-Titik (Specular Starburst Glint)
      ctx.strokeStyle = `rgba(255, 255, 255, ${glintAlpha * 0.9})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx - 3.5, hy); ctx.lineTo(hx + 3.5, hy);
      ctx.moveTo(hx, hy - 3.5); ctx.lineTo(hx, hy + 3.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * PHASE 4 — Menggambar Gelombang Api Hellblaze yang Merambat Menyusuri Permukaan Tanah
   * Menggunakan visual supernatural dark-fire asli (multi-tongued roaring hellfire),
   * sepenuhnya bebas dari bentuk sirip / segitiga kaku (menghapus kesan hiu/ikan).
   */
  drawHellblazeGroundWave(ctx, wave) {
    ctx.save();
    ctx.translate(wave.x, wave.y);
    ctx.scale(wave.dir, 1);

    const w = wave.width;
    const h = wave.height;
    const ph = wave.phase;

    // 1. Pendaran Lantai Tanah Ungu-Hitam & Hijau Hellblaze
    const gGrad = ctx.createRadialGradient(0, -4, 4, 0, -4, w * 0.95);
    gGrad.addColorStop(0, 'rgba(147, 51, 234, 0.88)');
    gGrad.addColorStop(0.55, 'rgba(16, 185, 129, 0.48)');
    gGrad.addColorStop(1, 'rgba(12, 6, 20, 0)');
    ctx.fillStyle = gGrad;
    ctx.beginPath();
    ctx.ellipse(0, -2, w * 0.95, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Garis Retakan Bara Api Tanah yang Terbakar (Scorched Earth Fissures)
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.72, -1);
    ctx.lineTo(-w * 0.35, -3.5);
    ctx.lineTo(0, -1);
    ctx.lineTo(w * 0.38, -3.5);
    ctx.lineTo(w * 0.68, -1);
    ctx.stroke();

    // 3. LIDAH-LIDAH API GELAP MULTI-LAYER (Multi-Tongued Hellfire Cluster)
    // 5 lidah api organik bergelombang independen menggantikan bentuk sirip tunggal
    const tongues = [
      { x: -w * 0.52, h: h * (0.45 + Math.sin(ph * 4.2) * 0.15) },
      { x: -w * 0.28, h: h * (0.88 + Math.cos(ph * 3.8) * 0.18) },
      { x: -w * 0.04, h: h * (1.20 + Math.sin(ph * 3.4) * 0.22) },
      { x: w * 0.22, h: h * (0.95 + Math.cos(ph * 4.0) * 0.18) },
      { x: w * 0.48, h: h * (0.55 + Math.sin(ph * 3.6) * 0.15) }
    ];

    // Lapisan 1: Selubung Api Luar Ungu Kerajaan & Magenta Hellblaze
    ctx.fillStyle = wave.assault ? '#4C1D95' : '#6B21A8';
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.68, 0);
    for (let i = 0; i < tongues.length; i++) {
      const cur = tongues[i];
      const prevX = i === 0 ? -w * 0.68 : (tongues[i - 1].x + cur.x) * 0.5;
      const sway = Math.sin(ph * 3 + i * 1.4) * 4;
      // Naik ke puncak lidah api
      ctx.quadraticCurveTo(prevX + sway * 0.5, -cur.h * 0.5, cur.x + sway, -cur.h);
      // Turun ke lembah api
      const nextX = i === tongues.length - 1 ? w * 0.68 : (cur.x + tongues[i + 1].x) * 0.5;
      ctx.quadraticCurveTo(cur.x + 8, -cur.h * 0.4, nextX, -2);
    }
    ctx.lineTo(w * 0.68, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lapisan 2: Inti Hitam Pekat Iblis (Abyssal Demon Core)
    ctx.fillStyle = '#08020F';
    ctx.beginPath();
    ctx.moveTo(-w * 0.50, 0);
    for (let i = 0; i < tongues.length; i++) {
      const cur = tongues[i];
      const prevX = i === 0 ? -w * 0.50 : (tongues[i - 1].x + cur.x) * 0.5;
      const sway = Math.sin(ph * 3 + i * 1.4) * 3;
      const coreH = cur.h * 0.68;
      ctx.quadraticCurveTo(prevX, -coreH * 0.5, cur.x + sway, -coreH);
      const nextX = i === tongues.length - 1 ? w * 0.52 : (cur.x + tongues[i + 1].x) * 0.5;
      ctx.quadraticCurveTo(cur.x + 6, -coreH * 0.4, nextX, -1);
    }
    ctx.lineTo(w * 0.52, 0);
    ctx.closePath();
    ctx.fill();

    // Lapisan 3: Garis Pijar Zamrud Supernatural di Dalam Inti Api
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, -4);
    ctx.quadraticCurveTo(-w * 0.05, -h * 0.65, w * 0.25, -5);
    ctx.stroke();

    // Lapisan 4: Percikan Bara Api & Motes Melayang
    ctx.fillStyle = '#34D399';
    for (let s = -2; s <= 2; s++) {
      const sx = s * (w * 0.18) + Math.sin(ph * 2 + s) * 4;
      const sy = -Math.abs(s) * (h * 0.28) - 10 - Math.abs(Math.sin(ph * 3 + s) * 8);
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Menggambar Pilar Semburan Api Gelap Hellblaze yang Meledak ke Atas Saat Mengenai Lawan
   * Visual pilar pusaran api iblis berputar (swirling dark inferno vortex) yang membubung tinggi.
   */
  drawHellblazeEruptionPillar(ctx, er) {
    ctx.save();
    ctx.translate(er.x, er.y);

    const alpha = Math.max(0, 1 - er.progress * 0.85);
    const scaleW = er.progress < 0.22 ? (er.progress / 0.22) : (1 - (er.progress - 0.22) * 0.52);
    const pw = Math.max(16, er.radius * scaleW);
    const ph = er.height * Math.min(1, er.progress * 2.8);

    ctx.globalAlpha = alpha;

    // 1. Cincin Kawah Hentakan Dasar Tanah
    ctx.strokeStyle = '#9333EA';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.ellipse(0, -2, pw * 1.35, 16, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, -2, pw * 0.85, 9, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Pusaran Api Gelap Luar (Twisting Purple Flame Envelope)
    ctx.fillStyle = '#6B21A8';
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-pw, 0);
    ctx.quadraticCurveTo(-pw * 0.9, -ph * 0.35, -pw * 0.55, -ph * 0.65);
    ctx.quadraticCurveTo(-pw * 0.25, -ph * 0.95, 0, -ph);
    ctx.quadraticCurveTo(pw * 0.25, -ph * 0.95, pw * 0.55, -ph * 0.65);
    ctx.quadraticCurveTo(pw * 0.9, -ph * 0.35, pw, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Lidah Api Sekunder Berpilin Melingkar
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.6, -ph * 0.2);
    ctx.quadraticCurveTo(0, -ph * 0.45, pw * 0.6, -ph * 0.7);
    ctx.stroke();

    // 4. Inti Pilar Api Hitam Pekat Iblis (Abyssal Pillar Core)
    ctx.fillStyle = '#08020F';
    ctx.beginPath();
    ctx.moveTo(-pw * 0.55, 0);
    ctx.quadraticCurveTo(-pw * 0.32, -ph * 0.5, 0, -ph * 0.92);
    ctx.quadraticCurveTo(pw * 0.32, -ph * 0.5, pw * 0.55, 0);
    ctx.closePath();
    ctx.fill();

    // 5. Sambaran Kilat Energi Hijau Zamrud di Inti Semburan
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4, -ph * 0.3);
    ctx.lineTo(4, -ph * 0.6);
    ctx.lineTo(0, -ph * 0.88);
    ctx.stroke();

    ctx.restore();
  }

  drawPhoenixProjectile(ctx, phx) {
    ctx.save();
    ctx.translate(phx.x, phx.y);
    ctx.scale(phx.dir, 1);

    const wingFlap = Math.sin(phx.wingPhase) * 8;

    const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, 52);
    aura.addColorStop(0, 'rgba(255, 253, 248, 0.95)');
    aura.addColorStop(0.45, 'rgba(255, 180, 75, 0.7)');
    aura.addColorStop(0.8, 'rgba(225, 95, 65, 0.35)');
    aura.addColorStop(1, 'rgba(225, 95, 65, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E15F41';
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.quadraticCurveTo(-34, -14 - wingFlap * 0.4, -56, -8);
    ctx.quadraticCurveTo(-38, 0, -58, 10);
    ctx.quadraticCurveTo(-34, 14 + wingFlap * 0.4, -12, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FF9F43';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(4, -4);
    ctx.quadraticCurveTo(-8, -32 - wingFlap, -30, -26 - wingFlap * 0.6);
    ctx.quadraticCurveTo(-18, -10, -14, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.quadraticCurveTo(-8, 28 + wingFlap, -28, 22 + wingFlap * 0.6);
    ctx.quadraticCurveTo(-16, 10, -14, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFE08A';
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(14, -9);
    ctx.lineTo(-4, -14);
    ctx.lineTo(2, -5);
    ctx.lineTo(-22, 0);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(14, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * PHASE 1 & PHASE 2 — Merender Karakter Playable:
   * - Untuk Traveler: Menggunakan kembali sprite `getCharacterSVG` versi Argon awal (`drawSize = 84`, `y = -78`).
   * - Untuk Meliodas: Menggunakan sprite Normal atau Assault Mode dengan skala, siluet, & animasi tempur yang tajam.
   */
  renderCharacter(p = this.player, charId = this.characterId) {
    if (!p) return;
    const ctx = this.ctx;

    // Tentukan sprite aktif untuk karakter yang dirender
    let sRight = this.travelerSpriteRight;
    let sLeft = this.travelerSpriteLeft;
    if (charId === 'meliodas') {
      if (p.assaultMode.active) {
        sRight = this.meliodasAssaultRight;
        sLeft = this.meliodasAssaultLeft;
      } else {
        sRight = this.meliodasNormalRight;
        sLeft = this.meliodasNormalLeft;
      }
    }

    const footX = p.x + p.width / 2;
    const footY = p.y + p.height;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 24, 38, 0.44)';
    ctx.beginPath();
    ctx.ellipse(footX, footY - 2, 19, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(footX, footY);

    let shiftX = 0;
    let bobY = 0;
    let tiltAngle = 0;
    let scaleX = 1.0;
    let scaleY = 1.0;
    const dir = p.facing === 'right' ? 1 : -1;

    if (p.state === 'idle') {
      bobY = Math.sin(p.animTimer * 3.5) * 2.2;
      scaleY = 1.0 + Math.sin(p.animTimer * 3.5) * 0.015;
    } else if (p.state === 'walking') {
      const stride = Math.sin(p.walkCycle);
      const stepLift = Math.abs(stride);
      bobY = -stepLift * 5.5;
      tiltAngle = dir * 0.06 + Math.cos(p.walkCycle) * 0.035;
      scaleX = 1.0 + stepLift * 0.03;
      scaleY = 1.0 - stepLift * 0.025;
    } else if (p.state === 'jumping') {
      const airTilt = Math.max(-0.1, Math.min(0.1, (p.vy / 600) * 0.08)) * dir;
      tiltAngle = airTilt;
      scaleX = 0.96;
      scaleY = 1.05;
    } else if (p.state === 'dashing') {
      tiltAngle = dir * 0.22;
      scaleX = 1.08;
      scaleY = 0.94;
    } else if (p.state === 'attacking' || p.state === 'casting_q') {
      const dur = p.state === 'casting_q' ? 0.26 : p.attackDuration;
      const timer = p.state === 'casting_q' ? p.qCastTimer : p.attackTimer;
      const prog = 1 - Math.max(0, timer / dur);

      if (charId === 'meliodas' && p.state === 'attacking') {
        if (prog < 0.20) {
          const t = prog / 0.20;
          tiltAngle = -dir * 0.10 * t;
          bobY = t * 1.2;
          scaleX = 0.98;
          scaleY = 1.01;
        } else if (prog < 0.58) {
          const t = (prog - 0.20) / 0.38;
          const swingEase = Math.sin(t * Math.PI * 0.5);
          tiltAngle = dir * (0.18 * swingEase);
          shiftX = dir * (3.5 * Math.sin(t * Math.PI));
          bobY = -1.2 * Math.sin(t * Math.PI);
          scaleX = 1.04;
          scaleY = 0.99;
        } else if (prog < 0.85) {
          const t = (prog - 0.58) / 0.27;
          tiltAngle = dir * (0.18 - 0.13 * t);
          shiftX = dir * (1.2 * (1 - t));
          bobY = 0.3 * (1 - t);
          scaleX = 1.02;
          scaleY = 0.99;
        } else {
          const t = (prog - 0.85) / 0.15;
          tiltAngle = dir * (0.05 * (1 - t));
          bobY = 0;
          scaleX = 1.0;
          scaleY = 1.0;
        }
      } else {
        if (prog < 0.22) {
          const t = prog / 0.22;
          tiltAngle = -dir * 0.14 * t;
          scaleX = 0.95;
        } else if (prog < 0.68) {
          const t = (prog - 0.22) / 0.46;
          tiltAngle = dir * (0.26 * Math.sin(t * Math.PI));
          scaleX = 1.08;
        } else {
          const t = (prog - 0.68) / 0.32;
          tiltAngle = dir * 0.06 * (1 - t);
        }
      }
    } else if (p.state === 'casting_r') {
      bobY = -6;
      scaleX = 1.06;
      scaleY = 1.06;
    }

    ctx.translate(shiftX, bobY);
    ctx.rotate(tiltAngle);
    ctx.scale(scaleX, scaleY);

    const drawSize = 84;
    const sprite = p.facing === 'left' ? sLeft : sRight;

    if (this.spritesReady && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -drawSize / 2, -78, drawSize, drawSize);

      if (p.state === 'walking') {
        const stride = Math.sin(p.walkCycle);
        ctx.fillStyle = (charId === 'meliodas' && p.assaultMode.active) ? '#0B0612' : '#26364A';
        ctx.fillRect(stride * 7.5 - 7, -10 - Math.max(0, stride * 4.5), 6, 6);
        ctx.fillRect(-stride * 7.5 + 1, -10 - Math.max(0, -stride * 4.5), 6, 6);
      }

      if (p.state === 'attacking' || p.state === 'casting_q' || p.state === 'casting_r') {
        const weaponX = dir * 24;
        const weaponY = -44;
        const atkGlow = ctx.createRadialGradient(weaponX, weaponY, 2, weaponX, weaponY, 36);
        if (charId === 'meliodas') {
          atkGlow.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
          atkGlow.addColorStop(0.5, p.assaultMode.active ? 'rgba(147, 51, 234, 0.72)' : 'rgba(52, 211, 153, 0.7)');
          atkGlow.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else {
          atkGlow.addColorStop(0, 'rgba(255, 253, 248, 0.95)');
          atkGlow.addColorStop(0.5, 'rgba(255, 224, 138, 0.7)');
          atkGlow.addColorStop(1, 'rgba(232, 165, 181, 0)');
        }
        ctx.fillStyle = atkGlow;
        ctx.beginPath();
        ctx.arc(weaponX, weaponY, 36, 0, Math.PI * 2);
        ctx.fill();

        // Proyeksi bilah Lostvayne
        if (charId === 'meliodas' && p.state === 'attacking') {
          const swingProg = 1 - Math.max(0, p.attackTimer / p.attackDuration);
          const swingAngle = (-1.15 + swingProg * 2.1) * dir;
          ctx.save();
          ctx.translate(dir * 16, -42);
          ctx.rotate(swingAngle);
          ctx.scale(dir, 1);
          ctx.fillStyle = '#143D30';
          ctx.fillRect(4, -5, 24, 4);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(6, -1, 24, 4);
          ctx.fillStyle = '#E5B84B';
          ctx.fillRect(1, -6, 4, 10);
          ctx.restore();
        }
      }
    } else {
      ctx.fillStyle = '#26364A';
      ctx.fillRect(-16, -56, 32, 56);
    }

    ctx.restore();
  }

  renderTraveler() {
    this.renderCharacter(this.player1, this.characterIdP1);
  }

  renderForegroundCanopy() {
    const ctx = this.ctx;
    const shiftX = -this.camX * 52;
    const sway = this.reducedMotion ? 0 : Math.sin(this.envTime * 1.9) * 6;

    ctx.save();
    ctx.translate(shiftX, 0);

    ctx.fillStyle = '#38251C';
    ctx.beginPath();
    ctx.moveTo(this.width + 60, -10);
    ctx.quadraticCurveTo(this.width - 90, 45 + sway * 0.4, this.width - 210, 28 + sway);
    ctx.quadraticCurveTo(this.width - 110, 18 + sway * 0.4, this.width + 60, -35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(232, 165, 181, 0.88)';
    ctx.beginPath();
    ctx.arc(this.width - 175, 18 + sway, 46, 0, Math.PI * 2);
    ctx.arc(this.width - 115, 8 + sway * 0.7, 54, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Combat HUD (Nine Sols Style + Indikator Q Skill Orbs & Emblem Ultimate R)
   */
  drawSinglePlayerHUD(p, charId, side = 'left', playerLabel = 'P1') {
    if (!p) return;
    const ctx = this.ctx;
    const isMeliodas = charId === 'meliodas';
    const isUltActive = isMeliodas ? p.assaultMode.active : p.infernoDomain.active;
    const isLeft = side === 'left';

    ctx.save();
    const ringRadius = 32;
    const barWidth = 280;
    const barHeight = 16;
    const hudY = 32;

    const centerRingX = isLeft ? 42 + ringRadius : this.width - 42 - ringRadius;
    const centerRingY = hudY + ringRadius;
    const ultFraction = Math.min(1.0, p.ultimateCharge / p.maxUltimate);
    const isUltReady = !isUltActive && ultFraction >= 1.0;

    // Glowing aura for ready ultimate
    if (isUltReady || isUltActive) {
      const readyGlow = ctx.createRadialGradient(centerRingX, centerRingY, 10, centerRingX, centerRingY, ringRadius + 12);
      if (isMeliodas && isUltActive) {
        readyGlow.addColorStop(0, 'rgba(147, 51, 234, 0.65)');
        readyGlow.addColorStop(1, 'rgba(16, 185, 129, 0)');
      } else {
        readyGlow.addColorStop(0, 'rgba(255, 224, 138, 0.55)');
        readyGlow.addColorStop(1, 'rgba(255, 118, 71, 0)');
      }
      ctx.fillStyle = readyGlow;
      ctx.beginPath();
      ctx.arc(centerRingX, centerRingY, ringRadius + 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(20, 24, 38, 0.92)';
    ctx.strokeStyle = isUltReady ? '#FFE08A' : '#5E6B7C';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerRingX, centerRingY, ringRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = isUltActive ? (isMeliodas ? '#C084FC' : '#FF7647') : '#FFE08A';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    const arcFrac = isUltActive
      ? (isMeliodas
        ? (p.assaultMode.timeLeft / p.assaultMode.duration)
        : (p.infernoDomain.timeLeft / p.infernoDomain.duration))
      : ultFraction;
    ctx.arc(centerRingX, centerRingY, ringRadius - 4.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * arcFrac);
    ctx.stroke();

    // Emblem in ring
    ctx.save();
    ctx.translate(centerRingX, centerRingY);
    ctx.strokeStyle = isUltReady || isUltActive ? '#FFE08A' : 'rgba(232, 165, 181, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    if (isMeliodas) {
      ctx.fillStyle = isUltReady || isUltActive ? '#9333EA' : '#64748B';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.quadraticCurveTo(12, -4, 6, 9);
      ctx.quadraticCurveTo(0, 14, -6, 9);
      ctx.quadraticCurveTo(-12, -4, 0, -13);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isUltReady || isUltActive ? '#34D399' : '#CBD5E1';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = isUltReady || isUltActive ? '#FF7647' : '#8C6A7B';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.quadraticCurveTo(11, -3, 7, 8);
      ctx.quadraticCurveTo(0, 14, -7, 8);
      ctx.quadraticCurveTo(-11, -3, 0, -14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isUltReady || isUltActive ? '#FFE08A' : '#C4B097';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.quadraticCurveTo(5, 0, 4, 6);
      ctx.quadraticCurveTo(0, 10, -4, 6);
      ctx.quadraticCurveTo(-5, 0, 0, -7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Label Badge [R]
    ctx.fillStyle = '#26364A';
    ctx.strokeStyle = '#FFE08A';
    ctx.lineWidth = 1.5;
    ctx.fillRect(centerRingX - 22, centerRingY + ringRadius - 8, 44, 15);
    ctx.strokeRect(centerRingX - 22, centerRingY + ringRadius - 8, 44, 15);

    ctx.fillStyle = '#FFE08A';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let rBadgeText = isUltReady ? 'R • SIAP' : `R • ${Math.floor(ultFraction * 100)}%`;
    if (isMeliodas && p.assaultMode.active) {
      rBadgeText = `${p.assaultMode.timeLeft.toFixed(1)}s`;
    }
    ctx.fillText(rBadgeText, centerRingX, centerRingY + ringRadius - 1);

    // HP Bar positioning
    const barStartX = isLeft ? centerRingX + ringRadius + 14 : centerRingX - ringRadius - 14 - barWidth;
    const barStartY = hudY + 12;

    ctx.fillStyle = 'rgba(26, 32, 44, 0.9)';
    ctx.strokeStyle = '#26364A';
    ctx.lineWidth = 2;
    ctx.fillRect(barStartX, barStartY, barWidth, barHeight);
    ctx.strokeRect(barStartX, barStartY, barWidth, barHeight);

    const hpFraction = Math.max(0, p.hp / p.maxHp);
    const hpFillWidth = (barWidth - 4) * hpFraction;

    const hpGrad = ctx.createLinearGradient(barStartX, barStartY, barStartX + barWidth, barStartY);
    if (isLeft) {
      hpGrad.addColorStop(0, '#5EEAD4');
      hpGrad.addColorStop(1, '#2DD4BF');
      ctx.fillStyle = hpGrad;
      ctx.fillRect(barStartX + 2, barStartY + 2, hpFillWidth, barHeight - 4);
    } else {
      hpGrad.addColorStop(0, '#F43F5E');
      hpGrad.addColorStop(1, '#FB7185');
      ctx.fillStyle = hpGrad;
      const rightX = barStartX + barWidth - 2 - hpFillWidth;
      ctx.fillRect(rightX, barStartY + 2, hpFillWidth, barHeight - 4);
    }

    // Grid ticks on HP bar
    ctx.strokeStyle = 'rgba(38, 54, 74, 0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
      const tx = barStartX + (barWidth / 4) * i;
      ctx.beginPath();
      ctx.moveTo(tx, barStartY + 2);
      ctx.lineTo(tx, barStartY + barHeight - 2);
      ctx.stroke();
    }

    // Q Skill Orbs
    const pipsY = barStartY + barHeight + 16;
    const maxPips = 3;
    const pipRadius = 9;

    for (let i = 0; i < maxPips; i++) {
      const pipX = isLeft
        ? barStartX + 10 + i * 26
        : barStartX + barWidth - 10 - i * 26;

      ctx.fillStyle = 'rgba(26, 32, 44, 0.92)';
      ctx.strokeStyle = i < p.energyPips ? (isMeliodas ? '#34D399' : '#FFE08A') : '#4A5568';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pipX, pipsY, pipRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (i < p.energyPips) {
        const orbGrad = ctx.createRadialGradient(pipX, pipsY, 1, pipX, pipsY, pipRadius - 2);
        if (isMeliodas) {
          orbGrad.addColorStop(0, '#ECFDF5');
          orbGrad.addColorStop(0.5, '#34D399');
          orbGrad.addColorStop(1, '#6B21A8');
        } else {
          orbGrad.addColorStop(0, '#FFFDF8');
          orbGrad.addColorStop(0.55, '#FFE08A');
          orbGrad.addColorStop(1, '#FF9F43');
        }
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(pipX, pipsY, pipRadius - 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (i === p.energyPips) {
        ctx.strokeStyle = isMeliodas ? '#34D399' : '#FFE08A';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(pipX, pipsY, pipRadius - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.energyCharge);
        ctx.stroke();
      }
    }

    // Label Text
    ctx.fillStyle = '#F5EBDD';
    ctx.font = 'bold 10.5px "Cinzel", "Georgia", serif';
    ctx.textAlign = isLeft ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    const hudLabel = isMeliodas
      ? `[${playerLabel}] MELIODAS ${p.assaultMode.active ? '(ASSAULT 150%)' : ''}`
      : `[${playerLabel}] TRAVELER`;
    const labelX = isLeft ? barStartX + 90 : barStartX + barWidth - 90;
    ctx.fillText(hudLabel, labelX, pipsY);

    ctx.restore();
  }

  renderCombatHUD() {
    // Render P1 HUD (Top-Left)
    this.drawSinglePlayerHUD(this.player1, this.characterIdP1, 'left', 'P1');

    // Render P2 HUD (Top-Right, Mirrored) if in PvP mode
    if (this.gameMode === 'pvp' && this.player2) {
      this.drawSinglePlayerHUD(this.player2, this.characterIdP2, 'right', 'P2');
    }
  }
}
