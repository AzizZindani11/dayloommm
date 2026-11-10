/**
 * DAYLOOM — Mesin Dunia Paralaks Multi-Lapis & Eksplorasi Desa Hanamori
 * Menggabungkan pelacakan pointer mulus (lerp), paralaks gulir (scroll),
 * partikel kanvas (kelopak sakura, kunang-kunang, pantulan sungai),
 * siklus waktu (Pagi, Senja, Malam), dan karakter yang dapat berjalan menjelajahi desa.
 */

import { VILLAGE_LOCATIONS } from './config.js';
import { getCharacterSVG } from './art.js';
import { sound } from './audio.js';
import { getCurrentRank } from './progression.js';

export class ParallaxWorld {
  constructor({ onInteractLocation, onCollectPetal, getState }) {
    this.onInteractLocation = onInteractLocation;
    this.onCollectPetal = onCollectPetal;
    this.getState = getState;

    // Target & posisi interpolasi pointer (-1 s/d 1)
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.currentMouseX = 0;
    this.currentMouseY = 0;
    this.scrollY = 0;

    // Posisi karakter di jalur desa (persentase 8% s/d 92%)
    this.charX = 42;
    this.targetCharX = 42;
    this.charFacing = 'right';
    this.isWalking = false;
    this.activeLocationId = 'quest_board';

    // Kelopak cahaya yang bisa ditangkap karakter di desa
    this.spiritOrb = {
      x: 26,
      active: true,
      collectedCount: 0
    };

    // Preferensi pengurangan gerak aksesibilitas
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.layers = [];
    this.canvas = null;
    this.ctx = null;
    this.petals = [];
    this.fireflies = [];
    this.ripples = [];
    this.rafId = null;
    this.keysPressed = new Set();

    // Timer Meditasi Kuil (Mini-fitur di Kuil Tenun Waktu)
    this.shrineTimer = {
      running: false,
      remainingSec: 300, // 5 menit ketenangan singkat
      intervalId: null
    };
  }

  init() {
    this.cacheDOM();
    this.initParticles();
    this.bindEvents();
    this.renderCharacterAvatar();
    this.updateLocationHighlight();
    this.startLoop();
  }

  cacheDOM() {
    this.stageEl = document.getElementById('parallax-stage');
    this.canvas = document.getElementById('world-particle-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
    }
    this.layers = Array.from(document.querySelectorAll('[data-parallax-depth]'));
    this.charContainer = document.getElementById('world-character-actor');
    this.spiritOrbEl = document.getElementById('world-spirit-orb');
  }

  resizeCanvas() {
    if (!this.canvas || !this.stageEl) return;
    const rect = this.stageEl.getBoundingClientRect();
    this.canvas.width = Math.max(320, rect.width);
    this.canvas.height = Math.max(300, rect.height);
  }

  initParticles() {
    const width = this.canvas ? this.canvas.width : 1200;
    const height = this.canvas ? this.canvas.height : 560;

    // 42 Kelopak Sakura jatuh dengan kedalaman & kecepatan bervariasi
    this.petals = Array.from({ length: 42 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 4 + Math.random() * 6,
      speedY: 0.45 + Math.random() * 0.95,
      speedX: -0.35 + Math.random() * 0.85,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.03,
      swayAmp: 0.4 + Math.random() * 1.1,
      swayFreq: 0.01 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.55 + Math.random() * 0.4
    }));

    // 28 Kunang-kunang & Partikel Roh Cahaya
    this.fireflies = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: height * 0.35 + Math.random() * (height * 0.6),
      radius: 1.8 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.35,
      alphaPhase: Math.random() * Math.PI * 2,
      alphaSpeed: 0.02 + Math.random() * 0.03
    }));

    // Riak pantulan air sungai Kawa
    this.ripples = Array.from({ length: 18 }, (_, idx) => ({
      x: (idx / 18) * width + Math.random() * 40,
      y: height * 0.82 + (Math.random() * 26),
      length: 24 + Math.random() * 45,
      phase: Math.random() * Math.PI * 2
    }));
  }

  bindEvents() {
    this.onMouseMove = (e) => {
      if (this.reducedMotion) return;
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      // Normalisasi ke rentang -1 hingga 1
      this.targetMouseX = ((e.clientX / vw) - 0.5) * 2;
      this.targetMouseY = ((e.clientY / vh) - 0.5) * 2;
    };

    this.onScroll = () => {
      this.scrollY = window.scrollY || window.pageYOffset || 0;
    };

    this.onResize = () => {
      this.resizeCanvas();
    };

    this.onKeyDown = (e) => {
      // Abaikan jika pengguna sedang mengetik di input/textarea
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keysPressed.add('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keysPressed.add('right');
      } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        // Interaksi dengan bangunan terdekat saat di tab Dunia
        const worldSection = document.getElementById('view-world');
        if (worldSection && !worldSection.classList.contains('hidden')) {
          this.triggerCurrentLocationInteraction();
        }
      }
    };

    this.onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keysPressed.delete('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keysPressed.delete('right');
      }
    };

    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Klik pada jalan desa atau bangunan untuk menggerakkan karakter
    const groundHitbox = document.getElementById('village-walk-area');
    if (groundHitbox) {
      groundHitbox.addEventListener('click', (e) => {
        // Jika klik tombol aksi langsung, biarkan tombol menanganinya
        if (e.target.closest('[data-building-id]') || e.target.closest('button')) return;
        const rect = groundHitbox.getBoundingClientRect();
        const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
        this.walkCharacterTo(Math.max(8, Math.min(92, clickPct)));
      });
    }

    // Klik bangunan desa
    document.querySelectorAll('[data-building-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const locId = btn.getAttribute('data-building-id');
        const loc = VILLAGE_LOCATIONS.find(l => l.id === locId);
        if (loc) {
          sound.playClick();
          this.walkCharacterTo(loc.xPercent, () => {
            if (this.onInteractLocation) this.onInteractLocation(loc);
          });
        }
      });
    });
  }

  walkCharacterTo(xPercent, onArrive = null) {
    this.targetCharX = Math.max(8, Math.min(92, xPercent));
    this.onArriveCallback = onArrive;
  }

  triggerCurrentLocationInteraction() {
    const loc = VILLAGE_LOCATIONS.find(l => l.id === this.activeLocationId);
    if (loc && this.onInteractLocation) {
      sound.playClick();
      this.onInteractLocation(loc);
    }
  }

  renderCharacterAvatar() {
    if (!this.charContainer) return;
    const state = this.getState ? this.getState() : null;
    const outfitId = state?.profile?.outfit || 'wanderer';
    const hatId = state?.profile?.hat || 'straw_hat';
    const rp = state?.rp || 0;

    const curRank = getCurrentRank(rp);
    const rankId = curRank.id || 'epic';

    const svgHolder = this.charContainer.querySelector('.actor-sprite');
    if (svgHolder) {
      svgHolder.innerHTML = getCharacterSVG({
        outfitId,
        hatId,
        rankId,
        size: 86,
        facing: this.charFacing
      });
    }
  }

  updateCharacterMovement() {
    let movedByKey = false;
    if (this.keysPressed.has('left')) {
      this.targetCharX = Math.max(8, this.charX - 0.55);
      movedByKey = true;
    }
    if (this.keysPressed.has('right')) {
      this.targetCharX = Math.min(92, this.charX + 0.55);
      movedByKey = true;
    }

    const diff = this.targetCharX - this.charX;
    if (Math.abs(diff) > 0.15) {
      const prevFacing = this.charFacing;
      this.charFacing = diff > 0 ? 'right' : 'left';
      if (prevFacing !== this.charFacing) {
        this.renderCharacterAvatar();
      }
      const step = movedByKey ? diff : diff * 0.12;
      this.charX += step;
      this.isWalking = true;
    } else {
      this.charX = this.targetCharX;
      if (this.isWalking) {
        this.isWalking = false;
        if (this.onArriveCallback) {
          const cb = this.onArriveCallback;
          this.onArriveCallback = null;
          cb();
        }
      }
    }

    if (this.charContainer) {
      this.charContainer.style.left = `${this.charX}%`;
      this.charContainer.classList.toggle('is-walking', this.isWalking);
    }

    // Cek apakah karakter menangkap Kelopak Takdir Bercahaya (Spirit Orb)
    if (this.spiritOrb.active && Math.abs(this.charX - this.spiritOrb.x) < 4.5) {
      this.collectSpiritOrb();
    }

    this.updateLocationHighlight();
  }

  collectSpiritOrb() {
    this.spiritOrb.active = false;
    this.spiritOrb.collectedCount += 1;
    sound.playCheck();

    if (this.spiritOrbEl) {
      this.spiritOrbEl.classList.add('collected');
    }

    if (this.onCollectPetal) {
      this.onCollectPetal(this.spiritOrb.collectedCount);
    }

    // Munculkan kembali di lokasi acak desa setelah 8 detik
    setTimeout(() => {
      let nextX = 12 + Math.random() * 76;
      if (Math.abs(nextX - this.charX) < 15) {
        nextX = (nextX + 35) % 85 + 8;
      }
      this.spiritOrb.x = nextX;
      this.spiritOrb.active = true;
      if (this.spiritOrbEl) {
        this.spiritOrbEl.style.left = `${this.spiritOrb.x}%`;
        this.spiritOrbEl.classList.remove('collected');
      }
    }, 6500);
  }

  updateLocationHighlight() {
    let closest = VILLAGE_LOCATIONS[0];
    let minDist = Infinity;

    VILLAGE_LOCATIONS.forEach(loc => {
      const d = Math.abs(this.charX - loc.xPercent);
      if (d < minDist) {
        minDist = d;
        closest = loc;
      }
    });

    const nearLocation = minDist <= 11 ? closest : null;
    const newLocId = nearLocation ? nearLocation.id : null;

    if (newLocId !== this.activeLocationId) {
      this.activeLocationId = newLocId;
      document.querySelectorAll('[data-building-id]').forEach(el => {
        const isCurrent = el.getAttribute('data-building-id') === newLocId;
        el.classList.toggle('is-nearby', isCurrent);
      });

      const bannerEl = document.getElementById('world-location-hud');
      if (bannerEl && nearLocation) {
        bannerEl.innerHTML = `
          <div class="loc-hud-badge">${nearLocation.subtitle}</div>
          <h3 class="loc-hud-title">${nearLocation.name}</h3>
          <p class="loc-hud-desc">${nearLocation.description}</p>
          <button type="button" class="btn-pixel btn-primary loc-hud-btn" id="hud-interact-btn">
            ${nearLocation.actionLabel}
          </button>
        `;
        const btn = document.getElementById('hud-interact-btn');
        if (btn) {
          btn.addEventListener('click', () => {
            sound.playClick();
            if (this.onInteractLocation) this.onInteractLocation(nearLocation);
          });
        }
      }
    }
  }

  startLoop() {
    const animate = (timestamp) => {
      this.updateParallaxLayers();
      this.updateCharacterMovement();
      this.drawCanvasParticles(timestamp);
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  updateParallaxLayers() {
    if (this.reducedMotion) return;

    // Interpolasi halus (Smooth Lerp)
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * 0.065;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * 0.065;

    const clampedScroll = Math.min(600, this.scrollY);

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const depth = parseFloat(layer.getAttribute('data-parallax-depth')) || 0.1;
      const moveX = -this.currentMouseX * depth * 48;
      const moveY = -this.currentMouseY * depth * 22 - (clampedScroll * (1 - depth) * 0.18);
      layer.style.transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
    }
  }

  drawCanvasParticles(timestamp = 0) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    const state = this.getState ? this.getState() : null;
    const timeOfDay = state?.profile?.timeOfDay || 'pagi';
    const isGoldenFireflies = (state?.rp || 0) >= 50;

    // 1. Efek Pantulan Air Sungai (Bagian Bawah Kanvas)
    ctx.save();
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      const waveOffset = Math.sin(timestamp * 0.002 + r.phase) * 8;
      const alpha = 0.2 + (Math.sin(timestamp * 0.003 + r.phase) + 1) * 0.15;

      ctx.strokeStyle = timeOfDay === 'malam'
        ? `rgba(168, 224, 235, ${alpha})`
        : timeOfDay === 'senja'
          ? `rgba(255, 209, 102, ${alpha + 0.1})`
          : `rgba(255, 255, 255, ${alpha + 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r.x + waveOffset, r.y);
      ctx.lineTo(r.x + waveOffset + r.length, r.y);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Kelopak Bunga Sakura Berjatuhan
    ctx.save();
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      if (!this.reducedMotion) {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(timestamp * p.swayFreq + p.phase) * p.swayAmp + (this.currentMouseX * 0.45);
        p.angle += p.spin;

        if (p.y > height + 12) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x > width + 15) p.x = -10;
        if (p.x < -15) p.x = width + 10;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = timeOfDay === 'malam'
        ? `rgba(242, 181, 200, ${p.opacity * 0.85})`
        : `rgba(232, 165, 181, ${p.opacity})`;

      // Bentuk kelopak sakura berlekuk halus
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 3. Kunang-Kunang & Partikel Cahaya (Lebih terang saat Senja & Malam atau Rank Legend+)
    const fireflyCount = timeOfDay === 'malam' ? this.fireflies.length : timeOfDay === 'senja' ? 20 : 10;
    ctx.save();
    for (let i = 0; i < fireflyCount; i++) {
      const f = this.fireflies[i];
      if (!this.reducedMotion) {
        f.x += f.vx;
        f.y += f.vy;
        f.alphaPhase += f.alphaSpeed;

        if (f.x < 0) f.x = width;
        if (f.x > width) f.x = 0;
        if (f.y < height * 0.25) f.vy = Math.abs(f.vy);
        if (f.y > height * 0.92) f.vy = -Math.abs(f.vy);
      }

      const glowAlpha = 0.25 + ((Math.sin(f.alphaPhase) + 1) * 0.35);
      const colorRGB = isGoldenFireflies || timeOfDay !== 'malam' ? '255, 224, 138' : '129, 236, 236';

      const grad = ctx.createRadialGradient(f.x, f.y, 0.5, f.x, f.y, f.radius * 3.5);
      grad.addColorStop(0, `rgba(${colorRGB}, ${glowAlpha})`);
      grad.addColorStop(1, `rgba(${colorRGB}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius * 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 240, ${Math.min(1, glowAlpha + 0.3)})`;
      ctx.fillRect(f.x - 1, f.y - 1, 2, 2);
    }
    ctx.restore();
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}

