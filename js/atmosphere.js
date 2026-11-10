/**
 * DAYLOOM — Sistem Atmosfer Latar Belakang Global (Global Background Atmosphere System)
 * Menyediakan lingkungan berlapis bernuansa desa fantasi Jepang di belakang seluruh halaman:
 * - Dunia Desa, Papan Misi, Profil & Peringkat, Lencana & Hadiah, Statistik, dan Arena Dojo.
 * - Memiliki 3 komposisi lingkungan berbeda untuk Pagi, Senja, dan Malam.
 */

export class GlobalAtmosphereController {
  constructor() {
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.layers = [];

    this.timeMode = 'pagi';
    this.activeView = 'world';

    // Pelacakan paralaks halus (restrained & comfortable)
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.currentMouseX = 0;
    this.currentMouseY = 0;
    this.scrollY = 0;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile = window.innerWidth <= 960;

    this.petals = [];
    this.ambientMotes = [];
    this.rafId = null;
  }

  init(initialTimeMode = 'pagi', initialView = 'world') {
    this.timeMode = initialTimeMode || 'pagi';
    this.activeView = initialView || 'world';

    document.body.setAttribute('data-time-of-day', this.timeMode);
    document.body.setAttribute('data-active-view', this.activeView);

    this.mountGlobalDOM();
    this.initParticles();
    this.bindEvents();
    this.startLoop();
  }

  mountGlobalDOM() {
    let existing = document.getElementById('global-atmosphere-system');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'global-atmosphere-system';
      existing.className = 'global-atmosphere-system';
      existing.setAttribute('aria-hidden', 'true');
      document.body.prepend(existing);
    }

    existing.innerHTML = this.buildAtmosphereMarkup();
    this.container = existing;
    this.layers = Array.from(existing.querySelectorAll('[data-bg-depth]'));
    this.canvas = document.getElementById('global-atmosphere-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
    }
  }

  buildAtmosphereMarkup() {
    return `
      <!-- 1. Tekstur Halus Kertas Washi & Berkas Cahaya -->
      <div class="atmo-washi-texture"></div>
      <div class="atmo-light-beams"></div>

      <!-- 2. Lapisan Langit & Komposisi Benda Langit (Pagi / Senja / Malam) [Depth 0.04] -->
      <div class="atmo-layer atmo-layer-sky" data-bg-depth="0.04">
        <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- Gradasi Matahari Pagi -->
            <radialGradient id="atmoMorningSun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FFFDF7" stop-opacity="0.95"/>
              <stop offset="45%" stop-color="#FFE8A3" stop-opacity="0.55"/>
              <stop offset="100%" stop-color="#FFE8A3" stop-opacity="0"/>
            </radialGradient>

            <!-- Gradasi Matahari Terbenam (Senja) -->
            <radialGradient id="atmoSunsetSun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FFF0C2" stop-opacity="0.92"/>
              <stop offset="40%" stop-color="#F28C64" stop-opacity="0.62"/>
              <stop offset="75%" stop-color="#C85A7C" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="#C85A7C" stop-opacity="0"/>
            </radialGradient>

            <!-- Gradasi Cahaya Bulan (Malam) -->
            <radialGradient id="atmoMoonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#F8FCFF" stop-opacity="0.9"/>
              <stop offset="42%" stop-color="#B8D8EE" stop-opacity="0.38"/>
              <stop offset="100%" stop-color="#A8B9C8" stop-opacity="0"/>
            </radialGradient>

            <!-- Gradasi Kabut Horison -->
            <linearGradient id="atmoHorizonMist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
              <stop offset="65%" stop-color="#F5EBDD" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#F5EBDD" stop-opacity="0.7"/>
            </linearGradient>
          </defs>

          <!-- === KOMPOSISI KHUSUS PAGI (MORNING ATMOSPHERE) === -->
          <g class="atmo-mode-group atmo-only-pagi">
            <!-- Matahari Pagi Hangat di Kanan Atas -->
            <circle cx="1580" cy="145" r="185" fill="url(#atmoMorningSun)" />
            <circle cx="1580" cy="145" r="46" fill="#FFFDF6" opacity="0.85" />
            <!-- Berkas Sinar Fajar Lembut -->
            <polygon points="1580,145 1120,1080 1290,1080" fill="#FFF8DC" opacity="0.16" />
            <polygon points="1580,145 1380,1080 1560,1080" fill="#FFF8DC" opacity="0.12" />
            <!-- Awan Pagi Cerah (Asa-gumo) -->
            <g class="atmo-cloud-drift" fill="#FFFDF9" opacity="0.52">
              <path d="M120 190 Q170 160 230 180 Q285 155 340 185 Q380 185 390 205 L100 205 Z" />
              <path d="M1240 230 Q1290 200 1350 218 Q1400 198 1455 225 L1220 228 Z" />
            </g>
            <g class="atmo-cloud-drift-slow" fill="#FFFDF9" opacity="0.38">
              <path d="M460 120 Q510 95 570 112 Q620 98 665 122 L445 124 Z" />
            </g>
          </g>

          <!-- === KOMPOSISI KHUSUS SENJA (SUNSET ATMOSPHERE) === -->
          <g class="atmo-mode-group atmo-only-senja">
            <!-- Matahari Senja Keemasan Merendah di Ufuk Barat (Kiri) -->
            <circle cx="290" cy="360" r="260" fill="url(#atmoSunsetSun)" />
            <circle cx="290" cy="360" r="62" fill="#FFE6B0" opacity="0.78" />
            <!-- Berkas Cahaya Senja Diagonal Panjang -->
            <polygon points="290,360 760,1080 1050,1080" fill="#FFD19A" opacity="0.15" />
            <polygon points="290,360 420,1080 640,1080" fill="#F4A28C" opacity="0.14" />
            <!-- Awan Senja Berlapis Emas & Terakota (Akane-gumo) -->
            <g class="atmo-cloud-drift">
              <path d="M60 250 Q140 215 230 238 Q310 210 390 242 L45 248 Z" fill="#E07A68" opacity="0.42" />
              <path d="M75 246 Q145 224 225 240 L65 246 Z" fill="#FFE09E" opacity="0.45" />
              <path d="M1340 195 Q1430 160 1530 182 Q1610 158 1690 192 L1320 196 Z" fill="#C86D7C" opacity="0.38" />
              <path d="M1355 191 Q1435 168 1525 184 L1340 192 Z" fill="#FFD28E" opacity="0.4" />
            </g>
            <!-- Siluet Burung Bangau Pulang ke Sarang Saat Senja -->
            <g stroke="#5E3538" stroke-width="2" fill="none" opacity="0.55">
              <path d="M430 220 Q438 212 446 220 Q454 212 462 220" />
              <path d="M475 205 Q481 199 487 205 Q493 199 499 205" />
              <path d="M455 234 Q461 228 467 234 Q473 228 479 234" />
            </g>
          </g>

          <!-- === KOMPOSISI KHUSUS MALAM (NIGHT ATMOSPHERE) === -->
          <g class="atmo-mode-group atmo-only-malam">
            <!-- Bulan Perak Lembut & Halo Malam di Kiri Atas -->
            <circle cx="265" cy="155" r="170" fill="url(#atmoMoonGlow)" />
            <circle cx="265" cy="155" r="38" fill="#F4FAFF" opacity="0.88" />
            <circle cx="279" cy="144" r="30" fill="#2F4259" opacity="0.42" />
            <!-- Berkas Cahaya Bulan Sejuk -->
            <polygon points="265,155 580,1080 820,1080" fill="#C8E2F5" opacity="0.09" />
            <!-- Gugusan Bintang Halus di Tepian Langit Atas -->
            <g class="atmo-star-twinkle" fill="#FFFDF6">
              <circle cx="140" cy="88" r="1.8" opacity="0.75" />
              <circle cx="420" cy="72" r="1.5" opacity="0.6" />
              <circle cx="560" cy="118" r="2.1" opacity="0.8" />
              <circle cx="1320" cy="84" r="1.8" opacity="0.7" />
              <circle cx="1490" cy="64" r="2.2" opacity="0.85" />
              <circle cx="1680" cy="110" r="1.6" opacity="0.65" />
              <circle cx="1790" cy="78" r="1.9" opacity="0.75" />
              <!-- Bintang Empat Sudut Kecil -->
              <polygon points="1490,56 1492,62 1498,64 1492,66 1490,72 1488,66 1482,64 1488,62" fill="#FFE8A3" opacity="0.8"/>
              <polygon points="560,110 562,116 568,118 562,120 560,126 558,120 552,118 558,116" fill="#E0F2FE" opacity="0.8"/>
            </g>
            <!-- Kabut Awan Malam Lembut -->
            <g class="atmo-cloud-drift-slow" fill="#7C93AC" opacity="0.22">
              <path d="M120 185 Q210 155 310 176 Q390 158 460 184 L105 186 Z" />
              <path d="M1380 165 Q1470 135 1570 158 Q1650 140 1730 166 L1365 168 Z" />
            </g>
          </g>
        </svg>
      </div>

      <!-- 3. Lapisan Pegunungan Jauh & Lembah Berkabut [Depth 0.10] -->
      <div class="atmo-layer atmo-layer-mountains" data-bg-depth="0.10">
        <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <!-- Pegunungan Jauh di Sisi Kiri dan Kanan Horison -->
          <path class="atmo-svg-mountain-far" opacity="0.32"
            d="M-60,1080 L-60,690 L140,510 L360,660 L590,580 L840,740 L1120,730 L1380,550 L1640,470 L1980,680 L1980,1080 Z" />

          <!-- Punggung Bukit Pinus & Lembah Samping -->
          <path class="atmo-svg-mountain-near" opacity="0.28"
            d="M-60,1080 L-60,760 Q180,630 430,770 Q680,870 960,860 Q1260,850 1510,730 Q1740,620 1980,740 L1980,1080 Z" />

          <!-- Lapisan Kabut Lembah Halus -->
          <rect x="0" y="680" width="1920" height="400" fill="url(#atmoHorizonMist)" opacity="0.55" />
        </svg>
      </div>

      <!-- 4. Lapisan Siluet Arsitektur Desa Jepang Pinggiran (Atap, Pagoda, Torii, Lentera) [Depth 0.18] -->
      <div class="atmo-layer atmo-layer-midground" data-bg-depth="0.18">
        <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <!-- === SISI PINGGIR KIRI: Siluet Atap Desa, Gerbang Torii & Pohon Cemara === -->
          <g opacity="0.36">
            <!-- Bukit & Pepohonan Kiri -->
            <path class="atmo-svg-village" d="M-40,1080 L-40,790 Q130,775 290,855 Q390,910 470,1080 Z" />

            <!-- Siluet Rumah Tradisional Kiri -->
            <g transform="translate(28, 725)">
              <!-- Atap Lengkung Kawara -->
              <path class="atmo-svg-village" d="M-15,52 Q85,12 185,52 L170,60 Q85,26 0,60 Z" />
              <path class="atmo-svg-roof-trim" d="M-12,51 Q85,14 182,51" fill="none" stroke-width="2" opacity="0.7" />
              <rect class="atmo-svg-village" x="12" y="56" width="146" height="82" />
              <!-- Jendela Shoji yang Menyala Hangat Saat Senja & Malam -->
              <g class="atmo-lantern-pulse">
                <circle class="atmo-svg-lantern-halo" cx="62" cy="86" r="28" />
                <rect class="atmo-svg-lantern-core" x="44" y="74" width="36" height="24" rx="2" opacity="0.85" />
                <line x1="62" y1="74" x2="62" y2="98" stroke="#4D322C" stroke-width="1.5" />
                <rect class="atmo-svg-lantern-core" x="96" y="74" width="28" height="24" rx="2" opacity="0.75" />
              </g>
            </g>

            <!-- Gerbang Torii Kecil di Lereng Kiri -->
            <g transform="translate(225, 765)">
              <path class="atmo-svg-village" d="M0,12 Q38,2 76,12 L73,19 Q38,11 3,19 Z" />
              <rect class="atmo-svg-village" x="8" y="25" width="60" height="5" />
              <rect class="atmo-svg-village" x="15" y="16" width="7" height="68" />
              <rect class="atmo-svg-village" x="54" y="16" width="7" height="68" />
            </g>

            <!-- Lentera Batu (Toro) Kiri -->
            <g transform="translate(318, 815)" class="atmo-lantern-pulse">
              <circle class="atmo-svg-lantern-halo" cx="14" cy="18" r="24" />
              <polygon class="atmo-svg-village" points="0,12 14,2 28,12" />
              <rect class="atmo-svg-lantern-core" x="7" y="12" width="14" height="12" />
              <rect class="atmo-svg-village" x="9" y="24" width="10" height="28" />
            </g>
          </g>

          <!-- === SISI PINGGIR KANAN: Siluet Pagoda Lima Tingkat & Kedai Desa === -->
          <g opacity="0.36">
            <path class="atmo-svg-village" d="M1960,1080 L1960,780 Q1780,765 1620,850 Q1510,915 1440,1080 Z" />

            <!-- Pagoda Kuno di Lereng Kanan -->
            <g transform="translate(1735, 620)">
              <rect class="atmo-svg-village" x="56" y="0" width="4" height="26" />
              <!-- Tingkat 1 -->
              <path class="atmo-svg-village" d="M22,34 Q58,18 94,34 L88,40 Q58,28 28,40 Z" />
              <rect class="atmo-svg-village" x="34" y="38" width="48" height="18" />
              <!-- Tingkat 2 -->
              <path class="atmo-svg-village" d="M14,62 Q58,44 102,62 L96,68 Q58,54 20,68 Z" />
              <rect class="atmo-svg-village" x="30" y="66" width="56" height="20" />
              <!-- Tingkat 3 -->
              <path class="atmo-svg-village" d="M6,94 Q58,74 110,94 L104,101 Q58,85 12,101 Z" />
              <rect class="atmo-svg-village" x="24" y="99" width="68" height="24" />
              <!-- Tingkat 4 -->
              <path class="atmo-svg-village" d="M-4,130 Q58,108 120,130 L112,138 Q58,120 4,138 Z" />
              <rect class="atmo-svg-village" x="18" y="136" width="80" height="65" />
              <!-- Lentera Pagoda Menyala -->
              <g class="atmo-lantern-pulse">
                <circle class="atmo-svg-lantern-halo" cx="58" cy="158" r="26" />
                <rect class="atmo-svg-lantern-core" x="46" y="148" width="24" height="18" rx="2" opacity="0.85" />
              </g>
            </g>

            <!-- Atap Rumah Desa Kanan -->
            <g transform="translate(1575, 760)">
              <path class="atmo-svg-village" d="M0,42 Q75,10 150,42 L140,50 Q75,22 10,50 Z" />
              <path class="atmo-svg-roof-trim" d="M4,41 Q75,12 146,41" fill="none" stroke-width="2" opacity="0.7" />
              <rect class="atmo-svg-village" x="18" y="48" width="114" height="70" />
              <g class="atmo-lantern-pulse">
                <circle class="atmo-svg-lantern-halo" cx="75" cy="76" r="24" />
                <rect class="atmo-svg-lantern-core" x="58" y="66" width="34" height="20" rx="2" opacity="0.82" />
              </g>
            </g>
          </g>
        </svg>
      </div>

      <!-- 5. Lapisan Bingkai Depan: Dahan Sakura Berbunga & Lentera Gantung Sudut [Depth 0.28] -->
      <div class="atmo-layer atmo-layer-foreground" data-bg-depth="0.28">
        <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <!-- === SUDUT KIRI ATAS: Dahan Sakura Menjulur & Lentera Kayu === -->
          <g class="atmo-sway-left" opacity="0.52">
            <!-- Dahan Kayu Utama Kiri -->
            <path class="atmo-svg-branch"
              d="M-20,-10 Q90,45 220,75 Q310,95 395,145 Q300,115 210,102 Q135,135 175,195 Q115,142 75,98 Q25,85 -20,75 Z" />
            <!-- Gugusan Kelopak Bunga Sakura Kiri -->
            <g class="atmo-svg-blossom">
              <circle cx="65" cy="58" r="38" opacity="0.85" />
              <circle cx="145" cy="72" r="44" opacity="0.8" />
              <circle cx="235" cy="86" r="36" opacity="0.82" />
              <circle cx="320" cy="118" r="28" opacity="0.78" />
              <circle cx="165" cy="168" r="26" opacity="0.75" />
              <circle cx="375" cy="140" r="20" opacity="0.7" />
            </g>
            <g class="atmo-svg-blossom-alt">
              <circle cx="88" cy="48" r="24" opacity="0.85" />
              <circle cx="170" cy="64" r="28" opacity="0.82" />
              <circle cx="255" cy="82" r="22" opacity="0.8" />
              <circle cx="335" cy="114" r="16" opacity="0.8" />
            </g>

            <!-- Lentera Gantung Tradisional (Chochin) di Dahan Kiri -->
            <g transform="translate(112, 92)" class="atmo-lantern-pulse">
              <line x1="14" y1="0" x2="14" y2="28" stroke="#4A3228" stroke-width="2" />
              <circle class="atmo-svg-lantern-halo" cx="14" cy="44" r="34" />
              <rect x="6" y="26" width="16" height="4" rx="1" fill="#3B2820" />
              <ellipse class="atmo-svg-lantern-core" cx="14" cy="44" rx="13" ry="16" stroke="#8C3B2B" stroke-width="1.5" />
              <line x1="3" y1="39" x2="25" y2="39" stroke="#C85A7C" stroke-width="1" opacity="0.6" />
              <line x1="3" y1="49" x2="25" y2="49" stroke="#C85A7C" stroke-width="1" opacity="0.6" />
              <rect x="6" y="58" width="16" height="4" rx="1" fill="#3B2820" />
            </g>
          </g>

          <!-- === SUDUT KANAN ATAS: Dahan Sakura & Lentera Gantung === -->
          <g class="atmo-sway-right" opacity="0.52">
            <path class="atmo-svg-branch"
              d="M1940,-10 Q1820,50 1690,82 Q1595,105 1515,155 Q1610,122 1705,108 Q1775,142 1740,202 Q1795,148 1840,102 Q1890,88 1940,78 Z" />
            <g class="atmo-svg-blossom">
              <circle cx="1850" cy="62" r="40" opacity="0.85" />
              <circle cx="1765" cy="76" r="46" opacity="0.8" />
              <circle cx="1675" cy="92" r="36" opacity="0.82" />
              <circle cx="1590" cy="124" r="28" opacity="0.76" />
              <circle cx="1745" cy="176" r="25" opacity="0.74" />
              <circle cx="1535" cy="148" r="19" opacity="0.7" />
            </g>
            <g class="atmo-svg-blossom-alt">
              <circle cx="1825" cy="52" r="25" opacity="0.85" />
              <circle cx="1740" cy="68" r="28" opacity="0.82" />
              <circle cx="1655" cy="86" r="22" opacity="0.8" />
            </g>

            <!-- Lentera Gantung Kanan -->
            <g transform="translate(1788, 96)" class="atmo-lantern-pulse">
              <line x1="14" y1="0" x2="14" y2="26" stroke="#4A3228" stroke-width="2" />
              <circle class="atmo-svg-lantern-halo" cx="14" cy="42" r="34" />
              <rect x="6" y="24" width="16" height="4" rx="1" fill="#3B2820" />
              <ellipse class="atmo-svg-lantern-core" cx="14" cy="42" rx="13" ry="16" stroke="#8C3B2B" stroke-width="1.5" />
              <rect x="6" y="56" width="16" height="4" rx="1" fill="#3B2820" />
            </g>
          </g>
        </svg>
      </div>

      <!-- 6. Selubung Keterbacaan Tengah (Menjaga Area Konten Utama Tetap Bersih & Jelas) -->
      <div class="atmo-readability-veil"></div>

      <!-- 7. Kanvas Partikel Atmosfer Global (Kelopak Sakura / Cahaya Senja / Kunang-Kunang Malam) -->
      <canvas id="global-atmosphere-canvas" class="global-atmosphere-canvas"></canvas>
    `;
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = Math.max(320, window.innerWidth || 1280);
    this.canvas.height = Math.max(320, window.innerHeight || 720);
    this.isMobile = window.innerWidth <= 960;
  }

  initParticles() {
    const w = this.canvas ? this.canvas.width : 1280;
    const h = this.canvas ? this.canvas.height : 720;
    const count = this.isMobile ? 14 : 24;

    // Kelopak sakura yang melayang halus di pinggiran layar
    this.petals = Array.from({ length: count }, () => this.createPetal(w, h, true));

    // Partikel cahaya atmosfer (Sinar Pagi / Debu Emas Senja / Kunang-kunang Malam)
    const moteCount = this.isMobile ? 12 : 22;
    this.ambientMotes = Array.from({ length: moteCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: 1.5 + Math.random() * 2.4,
      vx: (Math.random() - 0.5) * 0.28,
      vy: -0.15 - Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.015 + Math.random() * 0.025
    }));
  }

  createPetal(w, h, randomY = false) {
    // Prioritaskan posisi awal di area pinggir kiri (0-28%) atau kanan (72-100%)
    // agar bagian tengah layar tidak ramai oleh partikel
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left'
      ? Math.random() * (w * 0.32)
      : (w * 0.68) + Math.random() * (w * 0.32);

    return {
      x,
      y: randomY ? Math.random() * h : -16 - Math.random() * 40,
      size: 3.5 + Math.random() * 4.5,
      speedY: 0.28 + Math.random() * 0.52,
      speedX: (side === 'left' ? 0.18 : -0.18) + (Math.random() - 0.5) * 0.25,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.018,
      swayAmp: 0.25 + Math.random() * 0.55,
      swayFreq: 0.008 + Math.random() * 0.012,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.32 + Math.random() * 0.34
    };
  }

  bindEvents() {
    this.onMouseMove = (e) => {
      if (this.reducedMotion || this.isMobile) return;
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      this.targetMouseX = ((e.clientX / vw) - 0.5) * 2;
      this.targetMouseY = ((e.clientY / vh) - 0.5) * 2;
    };

    this.onScroll = () => {
      this.scrollY = window.scrollY || window.pageYOffset || 0;
    };

    this.onResize = () => {
      this.resizeCanvas();
    };

    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  setTimeMode(mode) {
    if (!['pagi', 'senja', 'malam'].includes(mode)) return;
    this.timeMode = mode;
    document.body.setAttribute('data-time-of-day', mode);
  }

  setActiveView(viewName) {
    this.activeView = viewName || 'world';
    document.body.setAttribute('data-active-view', this.activeView);
  }

  startLoop() {
    const step = (timestamp) => {
      this.updateParallax();
      this.renderCanvas(timestamp);
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  updateParallax() {
    if (this.reducedMotion) return;

    // Interpolasi sangat halus agar nyaman di mata (restrained parallax)
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * 0.045;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * 0.045;

    const clampedScroll = Math.min(800, this.scrollY);
    const parallaxScale = this.isMobile ? 0.3 : 1;

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const depth = parseFloat(layer.getAttribute('data-bg-depth')) || 0.1;
      const moveX = -this.currentMouseX * depth * 28 * parallaxScale;
      const moveY = -this.currentMouseY * depth * 14 * parallaxScale - (clampedScroll * depth * 0.08);
      layer.style.transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
    }
  }

  renderCanvas(timestamp = 0) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Kurangi kepadatan partikel pada halaman Statistik agar grafik tetap bersih
    const viewDensityScale = this.activeView === 'stats' ? 0.45 : this.activeView === 'quests' ? 0.75 : 1;
    const activePetalCount = Math.floor(this.petals.length * viewDensityScale);
    const activeMoteCount = Math.floor(this.ambientMotes.length * viewDensityScale);

    // 1. Gambar Kelopak Sakura Berdasarkan Mode Waktu (Pagi, Senja, Malam)
    ctx.save();
    for (let i = 0; i < activePetalCount; i++) {
      const p = this.petals[i];
      if (!this.reducedMotion) {
        // Saat malam, gerakan kelopak lebih pelan dan tenang
        const speedMod = this.timeMode === 'malam' ? 0.65 : this.timeMode === 'senja' ? 0.85 : 1;
        p.y += p.speedY * speedMod;
        p.x += p.speedX * speedMod + Math.sin(timestamp * p.swayFreq + p.phase) * p.swayAmp;
        p.angle += p.spin * speedMod;

        if (p.y > h + 20) {
          Object.assign(p, this.createPetal(w, h, false));
        }
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      if (this.timeMode === 'senja') {
        // Kelopak tersinari cahaya senja keemasan-koral
        ctx.fillStyle = `rgba(242, 162, 148, ${p.opacity * 0.9})`;
      } else if (this.timeMode === 'malam') {
        // Kelopak tersinari cahaya bulan perak-ungu lembut
        ctx.fillStyle = `rgba(216, 190, 212, ${p.opacity * 0.65})`;
      } else {
        // Kelopak pagi merah muda sakura segar
        ctx.fillStyle = `rgba(232, 165, 181, ${p.opacity * 0.85})`;
      }

      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 2. Gambar Partikel Cahaya Spesifik Waktu
    ctx.save();
    for (let i = 0; i < activeMoteCount; i++) {
      const m = this.ambientMotes[i];
      if (!this.reducedMotion) {
        m.x += m.vx;
        m.y += m.vy;
        m.phase += m.phaseSpeed;

        if (m.y < -10) m.y = h + 10;
        if (m.x < -10) m.x = w + 10;
        if (m.x > w + 10) m.x = -10;
      }

      const pulse = 0.2 + ((Math.sin(m.phase) + 1) * 0.32);

      if (this.timeMode === 'malam') {
        // Kunang-kunang malam (Hotaru) dengan pendar hangat kontras
        const grad = ctx.createRadialGradient(m.x, m.y, 0.4, m.x, m.y, m.radius * 4.2);
        grad.addColorStop(0, `rgba(255, 230, 140, ${pulse * 0.85})`);
        grad.addColorStop(1, 'rgba(255, 230, 140, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * 4.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.timeMode === 'senja') {
        // Partikel kilau emas senja (Golden-hour embers)
        const grad = ctx.createRadialGradient(m.x, m.y, 0.3, m.x, m.y, m.radius * 3.2);
        grad.addColorStop(0, `rgba(255, 200, 120, ${pulse * 0.65})`);
        grad.addColorStop(1, 'rgba(255, 160, 100, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Debu cahaya matahari pagi yang lembut
        const grad = ctx.createRadialGradient(m.x, m.y, 0.3, m.x, m.y, m.radius * 2.8);
        grad.addColorStop(0, `rgba(255, 250, 224, ${pulse * 0.55})`);
        grad.addColorStop(1, 'rgba(255, 250, 224, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
  }
}

