/**
 * DAYLOOM — Generator Seni Pixel & Vektor Orisinal (Art Engine)
 * Seluruh aset dibuat secara prosedural/vektor di dalam kode proyek.
 * Tanpa emoji untuk elemen utama (Rank, Karakter, Pencapaian, Boss).
 */

/**
 * Menghasilkan SVG Emblem Peringkat Orisinal (6 Rank Resmi)
 * Gaya: Kamon Jepang + RPG Pixel Crest Orisinal
 */
export function getRankEmblemSVG(rankId, size = 80) {
  switch (rankId) {
    case 'epic':
      return `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-emblem-svg">
        <defs>
          <linearGradient id="epicGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#A8E0EB"/>
            <stop offset="100%" stop-color="#3B7A8C"/>
          </linearGradient>
        </defs>
        <!-- Bingkai Perisai Kayu & Giok -->
        <polygon points="32,4 54,14 50,44 32,60 14,44 10,14" fill="#26364A" stroke="#A8E0EB" stroke-width="2"/>
        <polygon points="32,8 50,16 46,42 32,55 18,42 14,16" fill="url(#epicGrad)"/>
        <!-- Pola Kumparan Benang Fajar -->
        <polygon points="32,14 42,24 32,48 22,24" fill="#26364A"/>
        <polygon points="32,17 39,24 32,44 25,24" fill="#F5EBDD"/>
        <rect x="29" y="21" width="6" height="6" fill="#5C9EAD"/>
        <!-- Ornamen Pixel Sudut -->
        <rect x="30" y="6" width="4" height="4" fill="#F5EBDD"/>
        <rect x="12" y="15" width="4" height="4" fill="#A8E0EB"/>
        <rect x="48" y="15" width="4" height="4" fill="#A8E0EB"/>
      </svg>`;

    case 'legend':
      return `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-emblem-svg">
        <defs>
          <linearGradient id="legendGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFE08A"/>
            <stop offset="100%" stop-color="#B8771D"/>
          </linearGradient>
        </defs>
        <!-- Sayap Lentera Emas -->
        <polygon points="4,22 18,16 16,38 6,32" fill="#D49A3D" stroke="#FFE08A" stroke-width="1.5"/>
        <polygon points="60,22 46,16 48,38 58,32" fill="#D49A3D" stroke="#FFE08A" stroke-width="1.5"/>
        <!-- Perisai Inti -->
        <polygon points="32,4 52,14 48,44 32,60 16,44 12,14" fill="#26364A" stroke="#FFE08A" stroke-width="2.5"/>
        <polygon points="32,8 48,16 44,42 32,54 20,42 16,16" fill="url(#legendGrad)"/>
        <!-- Lentera Suci di Tengah -->
        <rect x="26" y="18" width="12" height="4" fill="#26364A"/>
        <rect x="24" y="22" width="16" height="16" fill="#FFF6D6" stroke="#26364A" stroke-width="2"/>
        <rect x="29" y="26" width="6" height="8" fill="#E17055"/>
        <rect x="26" y="38" width="12" height="4" fill="#26364A"/>
        <polygon points="32,10 36,16 28,16" fill="#FFF6D6"/>
      </svg>`;

    case 'mythic':
      return `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-emblem-svg">
        <defs>
          <linearGradient id="mythicGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFB5C8"/>
            <stop offset="50%" stop-color="#C85A7C"/>
            <stop offset="100%" stop-color="#6E223D"/>
          </linearGradient>
        </defs>
        <!-- Sayap Pedang & Kelopak Sakura -->
        <polygon points="2,18 20,12 18,40 4,34" fill="#E8A5B5" stroke="#26364A" stroke-width="1.5"/>
        <polygon points="62,18 44,12 46,40 60,34" fill="#E8A5B5" stroke="#26364A" stroke-width="1.5"/>
        <!-- Segi Delapan Kamon Sakura -->
        <polygon points="32,3 53,12 56,34 46,52 32,61 18,52 8,34 11,12" fill="#26364A" stroke="#FFB5C8" stroke-width="2.5"/>
        <polygon points="32,7 49,15 51,33 43,48 32,56 21,48 13,33 15,15" fill="url(#mythicGrad)"/>
        <!-- Lambang Katana & Bunga Sakura -->
        <polygon points="32,11 35,28 32,51 29,28" fill="#FFF5F7"/>
        <circle cx="32" cy="29" r="9" fill="#26364A" stroke="#FFE08A" stroke-width="2"/>
        <polygon points="32,22 35,27 40,29 35,31 32,36 29,31 24,29 29,27" fill="#FFB5C8"/>
        <rect x="30" y="27" width="4" height="4" fill="#FFE08A"/>
      </svg>`;

    case 'mythic_honor':
      return `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-emblem-svg">
        <defs>
          <linearGradient id="honorGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#DDD6FE"/>
            <stop offset="50%" stop-color="#6C5CE7"/>
            <stop offset="100%" stop-color="#31256E"/>
          </linearGradient>
        </defs>
        <!-- Sayap Kehormatan -->
        <polygon points="2,14 22,10 18,44 4,38 8,24" fill="#A29BFE" stroke="#26364A" stroke-width="1.5"/>
        <polygon points="62,14 42,10 46,44 60,38 56,24" fill="#A29BFE" stroke="#26364A" stroke-width="1.5"/>
        <!-- Mahkota Atas -->
        <polygon points="20,10 26,3 32,9 38,3 44,10" fill="#FFE08A" stroke="#26364A" stroke-width="1.5"/>
        <!-- Perisai Utama -->
        <polygon points="32,6 54,15 52,38 32,61 12,38 10,15" fill="#1E1B4B" stroke="#C4B5FD" stroke-width="2.5"/>
        <polygon points="32,10 50,18 48,36 32,56 16,36 14,18" fill="url(#honorGrad)"/>
        <!-- Bintang Kehormatan Berpilin -->
        <polygon points="32,14 37,26 49,28 39,36 42,48 32,41 22,48 25,36 15,28 27,26" fill="#F5EBDD" stroke="#26364A" stroke-width="1.5"/>
        <circle cx="32" cy="32" r="5" fill="#6C5CE7" stroke="#FFE08A" stroke-width="1.5"/>
      </svg>`;

    case 'mythic_glory':
      return `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-emblem-svg">
        <defs>
          <linearGradient id="gloryGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF3B0"/>
            <stop offset="50%" stop-color="#E17055"/>
            <stop offset="100%" stop-color="#8C2D19"/>
          </linearGradient>
        </defs>
        <!-- Halo Surya di Belakang -->
        <circle cx="32" cy="30" r="28" fill="none" stroke="#FFD166" stroke-width="2" stroke-dasharray="4 3"/>
        <!-- Sayap Api Surya -->
        <polygon points="1,12 22,8 20,46 3,42 9,26" fill="#FFD166" stroke="#8C2D19" stroke-width="1.5"/>
        <polygon points="63,12 42,8 44,46 61,42 55,26" fill="#FFD166" stroke="#8C2D19" stroke-width="1.5"/>
        <!-- Perisai Kemuliaan -->
        <polygon points="32,2 54,12 52,40 32,62 12,40 10,12" fill="#26364A" stroke="#FFD166" stroke-width="2.5"/>
        <polygon points="32,6 50,15 48,38 32,57 16,38 14,15" fill="url(#gloryGrad)"/>
        <!-- Matahari Amaterasu -->
        <circle cx="32" cy="30" r="11" fill="#FFF3B0" stroke="#26364A" stroke-width="2"/>
        <polygon points="32,13 35,21 43,21 37,26 39,34 32,29 25,34 27,26 21,21 29,21" fill="#E17055"/>
        <circle cx="32" cy="27" r="4" fill="#FFF3B0"/>
      </svg>`;

    case 'mythic_immortal':
    default:
      return getMythicImmortalEmblemSVG(size);
  }
}

/**
 * Lambang Mythic Immortal — "Emas Surgawi" (Divine Celestial Gold).
 * Siluet tersendiri: lingkar sinar surya, sayap bulu berlapis, perisai lengkung gading,
 * mahkota surgawi, dan bintang delapan penjuru. Dibuat lebih megah daripada Legend.
 */
function getMythicImmortalEmblemSVG(size = 80) {
  const bronze = '#6B4E1E';
  const cx = 32;
  const cy = 31;

  // Lingkar sinar surgawi (16 sinar, panjang berselang)
  let rays = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const len = i % 2 === 0 ? 31 : 25;
    const w = 0.09;
    const p1 = `${(cx + Math.cos(a - w) * 9).toFixed(2)},${(cy + Math.sin(a - w) * 9).toFixed(2)}`;
    const p2 = `${(cx + Math.cos(a) * len).toFixed(2)},${(cy + Math.sin(a) * len).toFixed(2)}`;
    const p3 = `${(cx + Math.cos(a + w) * 9).toFixed(2)},${(cy + Math.sin(a + w) * 9).toFixed(2)}`;
    rays += `<polygon points="${p1} ${p2} ${p3}" fill="#F3DDA0" opacity="${i % 2 === 0 ? 0.75 : 0.5}"/>`;
  }

  // Bintang delapan penjuru di pusat lambang
  let starPts = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 9.5 : 3.8;
    starPts += `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)} `;
  }

  // Sayap bulu berlapis (kiri), dicerminkan untuk kanan
  const wingOuter = '19,20 3,9 6,16 0,19 5,25 0,30 6,34 2,39 10,41 19,40';
  const wingInner = '19,25 8,19 10,25 5,29 11,33 8,37 19,36';
  const mirror = (pts) => pts.split(' ').map(p => {
    const [x, y] = p.split(',').map(Number);
    return `${64 - x},${y}`;
  }).join(' ');

  const sparkle = (x, y, r) =>
    `<polygon points="${x},${y - r} ${x + r * 0.28},${y - r * 0.28} ${x + r},${y} ${x + r * 0.28},${y + r * 0.28} ${x},${y + r} ${x - r * 0.28},${y + r * 0.28} ${x - r},${y} ${x - r * 0.28},${y - r * 0.28}" fill="#FFFDF4"/>`;

  return `
      <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-emblem-svg rank-emblem-immortal">
        <defs>
          <radialGradient id="immortalHalo" cx="50%" cy="48%" r="50%">
            <stop offset="0%" stop-color="#FFFDF4" stop-opacity="0.95"/>
            <stop offset="55%" stop-color="#F6E4B0" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#F6E4B0" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="immortalGold" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFF7DE"/>
            <stop offset="35%" stop-color="#F0D48C"/>
            <stop offset="70%" stop-color="#D2A64B"/>
            <stop offset="100%" stop-color="#9C7128"/>
          </linearGradient>
          <linearGradient id="immortalIvory" x1="0" y1="8" x2="0" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFFEF8"/>
            <stop offset="100%" stop-color="#F1E2BC"/>
          </linearGradient>
        </defs>
        <!-- Cahaya surgawi & lingkar sinar -->
        <circle cx="${cx}" cy="${cy}" r="31" fill="url(#immortalHalo)"/>
        ${rays}
        <circle cx="${cx}" cy="${cy}" r="27" fill="none" stroke="#E2C27A" stroke-width="0.8" stroke-dasharray="1.5 2.5" opacity="0.9"/>
        <!-- Sayap bulu berlapis emas & gading -->
        <polygon points="${wingOuter}" fill="url(#immortalGold)" stroke="${bronze}" stroke-width="1" stroke-linejoin="round"/>
        <polygon points="${wingInner}" fill="url(#immortalIvory)" stroke="${bronze}" stroke-width="0.6" stroke-linejoin="round"/>
        <polygon points="${mirror(wingOuter)}" fill="url(#immortalGold)" stroke="${bronze}" stroke-width="1" stroke-linejoin="round"/>
        <polygon points="${mirror(wingInner)}" fill="url(#immortalIvory)" stroke="${bronze}" stroke-width="0.6" stroke-linejoin="round"/>
        <!-- Perisai lengkung surgawi -->
        <path d="M32 4 L46 13 L46 39 Q46 51 32 60 Q18 51 18 39 L18 13 Z" fill="url(#immortalGold)" stroke="${bronze}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M32 8 L43 15 L43 38.5 Q43 48 32 55.5 Q21 48 21 38.5 L21 15 Z" fill="url(#immortalIvory)"/>
        <path d="M24 46 Q32 51 40 46" stroke="#D2A64B" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <!-- Bintang delapan penjuru & permata gading -->
        <polygon points="${starPts.trim()}" fill="url(#immortalGold)" stroke="${bronze}" stroke-width="0.9" stroke-linejoin="round"/>
        <circle cx="${cx}" cy="${cy}" r="3.2" fill="#FFFDF6" stroke="#C9973E" stroke-width="1"/>
        <circle cx="${cx - 1}" cy="${cy - 1}" r="0.9" fill="#FFFFFF"/>
        <!-- Mahkota surgawi -->
        <polygon points="23,10 26.5,3 29.5,7.5 32,0.8 34.5,7.5 37.5,3 41,10" fill="url(#immortalGold)" stroke="${bronze}" stroke-width="1" stroke-linejoin="round"/>
        <circle cx="32" cy="6.4" r="1.3" fill="#FFFDF6"/>
        <!-- Kilau bintang kecil -->
        ${sparkle(8, 7, 2.6)}
        ${sparkle(56, 7, 2.6)}
        ${sparkle(9, 52, 1.8)}
        ${sparkle(55, 52, 1.8)}
      </svg>`;
}

/**
 * Menghasilkan SVG Karakter Petualang Pixel-Art
 * Mendukung kustomisasi Jubah, Penutup Kepala, dan Aura Peringkat
 */
export function getCharacterSVG({ outfitId = 'wanderer', hatId = 'straw_hat', rankId = 'epic', size = 120, facing = 'right' } = {}) {
  const palettes = {
    wanderer: { robe: '#26364A', trim: '#E8A5B5', scarf: '#D96B84', sash: '#F5EBDD' },
    lantern_keeper: { robe: '#6E473B', trim: '#FFE08A', scarf: '#D49A3D', sash: '#FFF6D6' },
    sakura_ronin: { robe: '#8F3956', trim: '#FFD1DC', scarf: '#F5EBDD', sash: '#FFE08A' },
    honor_knight: { robe: '#3B336A', trim: '#C4B5FD', scarf: '#6C5CE7', sash: '#E0E7FF' },
    sun_weaver: { robe: '#9A3B26', trim: '#FFD166', scarf: '#E17055', sash: '#FFF3B0' },
    immortal_sage: { robe: '#135E4B', trim: '#81ECEC', scarf: '#00B894', sash: '#FFE08A' }
  };

  const pal = palettes[outfitId] || palettes.wanderer;
  const flipTransform = facing === 'left' ? 'scale(-1, 1) translate(-64, 0)' : '';

  // Aura berdasarkan rank
  let auraSVG = '';
  if (rankId === 'mythic' || rankId === 'mythic_honor') {
    auraSVG = `<circle cx="32" cy="36" r="26" fill="none" stroke="${pal.trim}" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.7"/>`;
  } else if (rankId === 'mythic_glory' || rankId === 'mythic_immortal') {
    auraSVG = `
      <circle cx="32" cy="36" r="28" fill="none" stroke="${pal.trim}" stroke-width="2" stroke-dasharray="4 2" opacity="0.85"/>
      <polygon points="32,2 35,8 29,8" fill="${pal.trim}"/>
      <polygon points="8,36 14,33 14,39" fill="${pal.trim}"/>
      <polygon points="56,36 50,33 50,39" fill="${pal.trim}"/>
    `;
  }

  // Penutup Kepala (Hat)
  let hatSVG = '';
  if (hatId === 'straw_hat') {
    hatSVG = `
      <!-- Caping Bambu Ronin -->
      <polygon points="10,18 32,7 54,18" fill="#D4A359" stroke="#26364A" stroke-width="2"/>
      <line x1="20" y1="13" x2="44" y2="13" stroke="#9B7866" stroke-width="1.5"/>
      <rect x="28" y="6" width="8" height="3" fill="#9B7866"/>
    `;
  } else if (hatId === 'sakura_pin') {
    hatSVG = `
      <!-- Jepit Bunga Sakura -->
      <circle cx="41" cy="14" r="4" fill="#FFB5C8" stroke="#26364A" stroke-width="1.2"/>
      <circle cx="41" cy="14" r="1.5" fill="#FFE08A"/>
    `;
  } else if (hatId === 'kitsune_mask') {
    hatSVG = `
      <!-- Topeng Kitsune di Sisi Kepala -->
      <polygon points="38,8 44,4 48,14 40,18 35,13" fill="#FFFDF9" stroke="#C94A4A" stroke-width="1.5"/>
      <line x1="40" y1="11" x2="45" y2="12" stroke="#C94A4A" stroke-width="1.5"/>
    `;
  } else if (hatId === 'sun_crown') {
    hatSVG = `
      <!-- Mahkota Tenun Surya -->
      <polygon points="20,14 23,5 28,11 32,3 36,11 41,5 44,14" fill="#FFD166" stroke="#26364A" stroke-width="1.5"/>
      <circle cx="32" cy="10" r="2" fill="#E17055"/>
    `;
  }

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="character-pixel-svg" shape-rendering="crispEdges">
    <g transform="${flipTransform}">
      ${auraSVG}
      <!-- Bayangan Pijakan -->
      <ellipse cx="32" cy="60" rx="14" ry="3" fill="#26364A" opacity="0.35"/>

      <!-- Tongkat Tenun Lentera (Senjata/Alat Pengembara) -->
      <rect x="48" y="16" width="3" height="42" fill="#704F38"/>
      <rect x="46" y="14" width="9" height="3" fill="#D49A3D"/>
      <!-- Lentera Kecil Menggantung di Tongkat -->
      <rect x="51" y="19" width="6" height="8" fill="#FFE08A" stroke="#26364A" stroke-width="1.5"/>
      <rect x="53" y="21" width="2" height="4" fill="#E17055"/>

      <!-- Jubah Belakang -->
      <rect x="18" y="30" width="24" height="22" fill="${pal.scarf}"/>

      <!-- Kaki & Sepatu Jerami -->
      <rect x="23" y="50" width="5" height="8" fill="#26364A"/>
      <rect x="34" y="50" width="5" height="8" fill="#26364A"/>
      <rect x="22" y="56" width="7" height="3" fill="#9B7866"/>
      <rect x="33" y="56" width="7" height="3" fill="#9B7866"/>

      <!-- Tubuh / Kimono RPG -->
      <rect x="20" y="29" width="22" height="22" fill="${pal.robe}" stroke="#26364A" stroke-width="1.5"/>
      <!-- Kerah & Trim Kimono -->
      <polygon points="25,29 31,38 37,29" fill="${pal.trim}"/>
      <!-- Sabuk Obi -->
      <rect x="20" y="40" width="22" height="5" fill="${pal.sash}"/>
      <rect x="28" y="39" width="6" height="7" fill="${pal.trim}"/>

      <!-- Lengan & Tangan -->
      <rect x="16" y="31" width="5" height="13" fill="${pal.robe}"/>
      <rect x="16" y="42" width="5" height="4" fill="#FAD7BD"/>
      <rect x="41" y="31" width="7" height="11" fill="${pal.robe}"/>
      <rect x="45" y="34" width="5" height="4" fill="#FAD7BD"/>

      <!-- Syal Leher -->
      <rect x="22" y="26" width="18" height="5" fill="${pal.scarf}"/>
      <rect x="17" y="28" width="5" height="9" fill="${pal.scarf}"/>

      <!-- Kepala & Rambut -->
      <rect x="21" y="11" width="20" height="16" fill="#26364A"/>
      <rect x="23" y="14" width="16" height="13" fill="#FAD7BD"/>
      <!-- Poni Rambut Jepang -->
      <rect x="21" y="11" width="20" height="5" fill="#26364A"/>
      <rect x="21" y="15" width="4" height="7" fill="#26364A"/>
      <rect x="37" y="15" width="4" height="5" fill="#26364A"/>

      <!-- Mata & Rona Pipi -->
      <rect x="27" y="19" width="2" height="4" fill="#26364A"/>
      <rect x="34" y="19" width="2" height="4" fill="#26364A"/>
      <rect x="25" y="23" width="3" height="2" fill="#E8A5B5"/>
      <rect x="35" y="23" width="3" height="2" fill="#E8A5B5"/>

      ${hatSVG}
    </g>
  </svg>`;
}

/**
 * Menghasilkan SVG Pedang Suci Lostvayne (Senjata Khas Meliodas)
 * Didesain presisi sesuai referensi kanonikal:
 * - Bilah melengkung berujung runcing (scimitar / broad curved cleaver)
 * - Punggung bilah bergerigi runcing (serrated spine notches) dengan ukiran rune naga kuno emas-oranye
 * - Garis pembatas bilah dengan mata pisau perak tajam (#F1F5F9 - #E2E8F0)
 * - 5 LUBANG SIRKULAR KHAS (Circular Holes) di sepanjang batas bilah dengan gradasi tembus/dalam
 * - Pelindung tangan (guard) emas-jingga segitiga (chevron) berukir lambang Ouroboros naga melingkar
 * - Gagang hijau lumut berbalut lilitan pita hijau-emas (Tsuka-ito) & pommel emas melingkar
 */
export function getLostvayneSVG({ size = 64 } = {}) {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="lostvayne-weapon-svg">
    <g transform="rotate(-26 32 32)">
      <!-- Pommel Emas Bulat Berbobot di Ujung Gagang -->
      <ellipse cx="32" cy="5.5" rx="4.8" ry="2.6" fill="#E5B84B" stroke="#26364A" stroke-width="1.3"/>
      <ellipse cx="32" cy="5.5" rx="2.4" ry="1.2" fill="#FEF08A"/>

      <!-- Gagang Lengkung dengan Lilitan Hijau Lumut & Tali Emas (Tsuka-ito) -->
      <path d="M29.5,7.5 Q30.5,13.5 31,18.5 L34,18 Q33.5,13 33,7.5 Z" fill="#2E6B34" stroke="#26364A" stroke-width="1.2"/>
      <line x1="29.8" y1="9.5" x2="33.5" y2="11" stroke="#E5B84B" stroke-width="1.2"/>
      <line x1="33" y1="11" x2="30.2" y2="13" stroke="#E5B84B" stroke-width="1.2"/>
      <line x1="30.2" y1="13" x2="33.8" y2="14.8" stroke="#E5B84B" stroke-width="1.2"/>
      <line x1="33.8" y1="14.8" x2="30.6" y2="16.6" stroke="#E5B84B" stroke-width="1.2"/>

      <!-- Pelindung Tangan Emas Segitiga Chevron Khas + Ouroboros Emblem -->
      <polygon points="21,18 40,17 36,24.5 32,28 26,25.5" fill="#E59834" stroke="#26364A" stroke-width="1.5"/>
      <polygon points="23,19 38,18 34.5,23.5 32,26 27,24" fill="#F59E0B"/>
      <!-- Lambang Ouroboros Naga Melingkar -->
      <circle cx="31.8" cy="22.5" r="2.2" stroke="#78350F" stroke-width="0.9" fill="none" stroke-dasharray="2 1"/>

      <!-- Bilah Lengkung Lostvayne: Punggung Emas-Rune + Lapisan Hijau (#143D30) + Gerigi Khas -->
      <path d="M25,25.5 L37,24 Q41,41 28,60 Q21,43 25,25.5 Z" fill="#F1F5F9" stroke="#26364A" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M25,25.5 L33,25 Q35.5,41 28,60 Q21.8,43 25,25.5 Z" fill="#D97706"/>
      <!-- Lapisan Hijau Khas Spine Lostvayne (#143D30) -->
      <path d="M25,25.5 L29.8,25.2 Q32,40 28,60 Q22.2,43 25,25.5 Z" fill="#143D30"/>

      <!-- Pola Takik / Gigi Runcing di Punggung Bilah -->
      <polygon points="24,29.5 22.2,31.5 24.5,32.8" fill="#26364A"/>
      <polygon points="23.2,35.5 21.4,37.5 23.8,38.8" fill="#26364A"/>
      <polygon points="22.8,41.5 21,43.8 23.4,45" fill="#26364A"/>
      <polygon points="23,47.5 21.2,49.8 23.6,51" fill="#26364A"/>

      <!-- Mata Bilah Perak Tajam Berkilau (#F8FAFC) -->
      <path d="M29.5,25.5 Q35,40.5 28,60 Q34,42 36.5,24.5 Z" fill="#F8FAFC"/>
      <path d="M31.8,27 Q36,40 28,60 Q32.5,42 34.5,27 Z" fill="#FFFFFF" opacity="0.75"/>

      <!-- TEPAT 5 LUBANG SIRKULAR KHAS LOSTVAYNE DI SEPANJANG BATAS BILAH -->
      <circle cx="29.8" cy="31.8" r="2.1" fill="#1E293B" stroke="#F1F5F9" stroke-width="0.8"/>
      <circle cx="29.6" cy="37.0" r="2.0" fill="#1E293B" stroke="#F1F5F9" stroke-width="0.8"/>
      <circle cx="29.2" cy="42.2" r="1.9" fill="#1E293B" stroke="#F1F5F9" stroke-width="0.8"/>
      <circle cx="28.6" cy="47.2" r="1.8" fill="#1E293B" stroke="#F1F5F9" stroke-width="0.8"/>
      <circle cx="28.0" cy="52.2" r="1.6" fill="#1E293B" stroke="#F1F5F9" stroke-width="0.8"/>
    </g>
  </svg>`;
}

/**
 * Menyusun matriks piksel ASCII 64x64 menjadi elemen <rect> horizontal yang renyah dan presisi.
 * Menjamin kualitas pixel-art sejati (sejajar penuh pada grid integer seperti Traveler)
 * tanpa artefak rasterisasi kurva atau garis miring.
 */
function compilePixelMapToRects(rows, palette) {
  const rects = [];
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ' || !palette[ch]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      rects.push(`      <rect x="${x}" y="${y}" width="${run}" height="1" fill="${palette[ch]}"/>`);
      x += run;
    }
  }
  return rects.join('\n');
}

const MELIODAS_NORMAL_PALETTE = {
  O: '#26364A', // Garis tepi gelap renyah (selaras dengan Traveler)
  H: '#FFF08A', // Highlight puncak rambut pirang
  Y: '#FACC15', // Warna utama rambut pirang keemasan Meliodas
  A: '#EAB308', // Mid-tone rambut emas hangat & emblem Boar Hat
  D: '#CA8A04', // Bayangan dalam rambut amber keemasan
  S: '#FAD7BD', // Kulit persik hangat (selaras dengan Traveler)
  N: '#E6B89C', // Bayangan kulit lembut
  P: '#E8A5B5', // Rona pipi chibi (selaras dengan Traveler)
  E: '#064E3B', // Bulu mata atas / hijau pinus pekat
  G: '#10B981', // Iris mata hijau zamrud (emerald green)
  M: '#6EE7B7', // Pantulan bawah mata hijau mint cerah
  W: '#FFFFFF', // Putih murni (kilau mata & mata pisau tajam Lostvayne)
  F: '#F8FAFC', // Kemeja putih tavern Boar Hat & aksen depan sepatu bot
  C: '#CBD5E1', // Lipatan kain kemeja & gradasi perak bilah
  R: '#DC2626', // Kaos dalam merah (red undershirt)
  V: '#1E293B', // Rompi dalam gelap, bodi sepatu bot, & 5 lubang Lostvayne
  K: '#0F172A', // Manset lipatan atas sepatu bot hitam
  L: '#22C55E', // Kerah tegak hijau Boar Hat & tali silang dada
  T: '#15803D', // Bayangan kerah hijau tua
  B: '#78350F', // Sabuk kulit selempang dada (brown leather baldric)
  U: '#E5B84B', // Gesper emas, pelindung tangan chevron, & pommel Lostvayne
  Q: '#F59E0B', // Emas amber cerah pada pelindung tangan Lostvayne
  Z: '#2D5A27', // Celana pendek hijau tua & lilitan gagang hijau lumut
  X: '#1E3F1B', // Bayangan celana hijau tua
  J: '#143D30', // Punggung bilah hijau tua khas Lostvayne (#143D30)
};

const MELIODAS_NORMAL_ROWS = [
  "................................................................",
  "................................................................",
  ".............................OOOOOO.............................",
  "............................OHHHHYYO............................",
  "...........................OHYYOOOO.............................",
  "..........................OYYO..................................",
  "...................OOOO..OYYO..OOOOOO...........................",
  "..................OHHHYOOYYYOOHHHHHYYO..........................",
  "..............OOOOOHHHHHHHHHHHHHHHHHYYOOOO......................",
  ".............OHHHYYYYHHHHHHHHHHHHHHHYYYYYYO.....................",
  "............OYYYYYYYYYYYYHHHHHHHHYYYYYYYYYYOO...................",
  "...........OOAAYYYYYYYYYYYYYYYYYYYYYYYYYYYYAAO..................",
  ".............OOYYYYYYYYYYYYYYYYYYYYYYYYYYYYO....................",
  "............OYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYO...........OO.....",
  "...........OYYAAYYYYYYYYYYAAYYYYAAYYYYYYYYAAYYO.........OWWO....",
  "..........OYYAAOYYYYYYYYASSAYYYYASSAYYYYYYYOAAYO.......OJWWWO...",
  ".........OODDO.OYYYYYYASSSSSAYYASSSSSAYYYYYO.ODDO.....OJJWWWWO..",
  "...............OYYYYYASSSSSSSAADSSSSSSAYYYYO.........OOJVVWWWWO.",
  "..............OYYAAYSSSSSEEEESSSEEEESSSSYAAYYO.......OJJJJWWWWO.",
  "..............ODDAAYSSSSSWGGGSSSWGGGSSSSYAAYDO.....OOJJJJCWWWOO.",
  "................OAAYSSSSSEGGGSSSEGGGSSSSYAAO.......OJJVVCCWWWOO.",
  "................ODDAYSSSSGMMMSSSGMMMSSSYDDO.......OOJJJCCCWWOO..",
  ".................O.OSSSPPSSSSSSSSSSSPPSSSO.O......OJJJVVCCWWWOO..",
  "...................OOSSSSSSSSSSSSSSSSSSOO........OOJJJCCCCWWOO...",
  "....................OOSSSSSSSSSSSSSSSSOO.......OJJJVVCCCWWOO....",
  "....................OLLTTOSSSSSSSSSTTLLO......OOJJJCCCCWWOO.....",
  "...................OLLLTTOSSSSSSSSSTTLLLO....OJJJVVCCCWWOO......",
  "..................OOLLTUORRRRRRRRRROULLTTOO..OJJJCCCCWWOO.......",
  ".................OFFOLLTTRRRRRRRRRRTTLLOFFOO.OOJJCCCWWOO........",
  "................OFFFBBLLOVVVVVVVVVVOLLFFAAFOOOUUQQCCOO..........",
  "...............OFFFFBBBVULVVVVVVVVLUFFFFFFAFOUUUUUQQOO..........",
  "...............OFFFFCBBBVVLLVVVVLLVVFFFFCFAFOUUUUQUUUOO.........",
  "..............OFFFFFCBBBBVULLLLULLUVFFFFCFFFOOZZUUUUUOO.........",
  "..............OFFFFFC.BBBUUUBVVLLVVFFFFFCFFFOZZUZZOOOO..........",
  ".............OFFFFFFO..BBUOBUUBVVVVFFFFOOFFFOSSSSZO.............",
  ".............OCCCCFFO...BUUUBBBVVVVFFFFOSSSSOSSSSUZO............",
  ".............OSSSSFFO....BBBBBBVVVVFFFFOSSSSSSSSZZOO............",
  ".............OSSSSFFO.....BBBBBCFFFFFFFOOOOOOUUUUOO.............",
  ".............OSSSSFFO......BBBBCFFFFFFFO.....OOOO...............",
  "..............OOOOFFCCCCCCCCCCCCFFFFFFFO........................",
  ".................OFFFFFFFFFCOOFFFFFFFFO.........................",
  ".................OFFFFFFFFOZZZOFFFFFFFO.........................",
  ".................OFFFFFFFOZZZZZOFFFFFFO.........................",
  ".................OOFFFFOOZZZZZZZOOFFFOO.........................",
  "..................OOOOOOZZZZXZZZZOOOOO..........................",
  "...................OZZZZZZZZXZZZZZZZZO..........................",
  "...................OZZZZZZZZXZZZZZZZZO..........................",
  "...................OZZZZZZOOXOOZZZZZZO..........................",
  "...................OXXXXXXO...OXXXXXXO..........................",
  "...................OOOOOOOO...OOOOOOOO..........................",
  "....................OSSSSO.....OSSSSO...........................",
  "....................OSSSSO.....OSSSSO...........................",
  "..................OOOKKKKOO...OOOKKKKOO.........................",
  ".................OKKKKKKKKO...OKKKKKKKKO........................",
  "..................OVVVVVVVO...OVVVVVVVO.........................",
  "..................OVVFFFVVO...OVVFFFVVO.........................",
  ".................OOVVFFFVVO...OVVFFFVVOO........................",
  ".................OVVVFFFVVO...OVVVFFFVVO........................",
  ".................OOOOOOOOOO...OOOOOOOOOO........................"
];

const MELIODAS_ASSAULT_PALETTE = {
  O: '#26364A', // Garis tepi gelap renyah
  D: '#0C0614', // Materi kegelapan iblis hitam pekat (sayap, jubah, cakar, Demon Mark)
  P: '#7E22CE', // Garis tepi ungu kerajaan (royal purple) pada sayap & lapisan jubah
  I: '#A855F7', // Pendaran energi ungu lavender cerah pada urat sayap
  M: '#581C87', // Ungu tua bagian dalam ekor jubah
  H: '#FFF08A', // Highlight puncak rambut pirang
  Y: '#FACC15', // Warna utama rambut pirang keemasan
  A: '#EAB308', // Mid-tone rambut emas
  B: '#CA8A04', // Bayangan dalam rambut amber
  S: '#FAD7BD', // Kulit persik hangat
  N: '#D99B78', // Definisi otot dada & perut six-pack atletis
  R: '#EF4444', // Mata iblis merah menyala & tato naga Wrath di lengan kiri
  W: '#FFFFFF', // Putih murni (kilau mata & mata pisau tajam Lostvayne)
  F: '#F8FAFC', // Bilah perak cerah
  C: '#CBD5E1', // Gradasi tengah bilah perak
  V: '#1E293B', // 5 lubang sirkular Lostvayne
  U: '#E5B84B', // Pelindung tangan chevron emas & pommel
  Q: '#F59E0B', // Emas amber cerah
  Z: '#2D5A27', // Lilitan gagang hijau lumut
  J: '#143D30', // Punggung bilah hijau tua khas Lostvayne (#143D30)
};

const MELIODAS_ASSAULT_ROWS = [
  "................................................................",
  "................................................................",
  ".............................OOOOOO.............................",
  "...PPPP.....................OHHHHYYO....................PPPP....",
  "..PDDDDP...................OHYYOOOO....................PDDDDP...",
  ".PDDDDDDP.................OYYO........................PDDDDDDP..",
  ".PDDIDDDDP.........OOOO..OYYO..OOOOOO................PDDDDIDDDP.",
  ".PDDIDDDDDP.......OHHHYOOYYYOOHHHHHYYO..............PDDDDDIDDDP.",
  ".PDDDIDDDDDP..OOOOOHHHHHHHHHHHHHHHHHYYOOOO.........PDDDDDIDDDDP.",
  "..PDDDIDDDDDPOHHHYYYYHHHHHHHHHHHHHHHYYYYYYO.......PDDDDDIDDDDP..",
  "..PDDDDIDDDDDYYYYYYYYYYYYHHHHHHHHYYYYYYYYYYOO....PDDDDDIDDDDP...",
  "..PDDDDDIDDDOOAAYYYYYYYYYYYYYYYYYYYYYYYYYYYYAAO.PDDDDDIDDDDP....",
  "...PDDDDDDDD..OOYYYYYYYYYYYYYYYYYYYYYYYYYYYYO..PDDDDDIDDDDP.....",
  "..PDDDDDDDDDD..OYYYYYYYYYYYYYYYYYYYYYYYYYYYYO.PDDDDDDIDDDP..OO..",
  "..PDDDDIDDDDDOYYAAYYYYYYYYYYAAYYYYAAYYYYYYYYAAYDDDDDIDDDP..OWWO.",
  ".PDDDDIDDDDDDOYYAAOYYYYYYADDDSYYYYASSAYYYYYYYOAAYDDDIDDDP.OJWWWO",
  ".PDDDIDDDDDDDODDO.OYYYYYASDSDDAYYASSSSSAYYYYYO.ODDDDDDDP.OJJWWWO",
  ".PDDIDDDDDDDDDD...OYYYYASDDDSDSAABSSSSSSAYYYYO..PDDDDDDPOOJVVWWO",
  ".PDDIDDDDDDDDDD..OYYAAYSSSDDDDDSSSDDDDSSSYAAYYO.PDDDDDDPOJJJJWWO",
  ".PDDDIDDDDDDDDD..OBBAAYSSSDWRRDSSSDWRRDSSSYAAYDOPDDDDDOOJJJJCWWO",
  "..PDDDIDDDDDDDD....OAAYSSSDDRRDSSSDDRRDSSSYAAO.PDDDDDDOJJVVCCWWO",
  "..PDDDDIDDDDDDD....OBBYSSSDDRRSSSSDDRRSSSYDDO..PDDDDDOOJJJCCCWOO",
  "...PDDDIDDDDDDDD....O.OSSSSSSSSSSSSSSSSSSSO.O.PDDDDDDOJJJVVCCWOO",
  "..PDDDDIDDDDDDDDD.....OOSSSSSSSSSSSSSSSSSOO...PDDDDDOOJJJCCCWWOO",
  "..PDDDIDDDDDDDDDDD.....OOSSSSSSSSSSSSSSSSOO..PDDDDDDOJJJVVCCWWOO",
  "..PDDIDDDDDDDDDDDDD...ODDDDOSSSSSSSSSSODDDDO.PDDDDDOOJJJCCCWWOO.",
  "..PDDPPPPDDDDDDDDDDD.ODDDDDDSSSSSSSSSSDDDDDDPDDDDDDOJJJVVCCWWOO.",
  "..PPP....PPDDDDDDDDDDDDDDDDSSSSSSSSSSSSDDDDDDDDDDDOJJJCCCCWWOO..",
  "...........PPDDDDDDDDDDDDDSSSSSNNNNSSSSSDDDDDDDDDOOOJJCCCWWOO...",
  ".............PPDDDDDOSSSSSDSSSSSNNSSSSSDSSSSSODDPP.OOUUQQCCOO...",
  "...............PPPPOSRRSSSSDNNNNNNNNNNSDSSSSSO.....OUUUUUQQOO...",
  "...................OSRSSSSSDSSSSSSSSSSSDSSSSSO.....OUUUUQUUUOO..",
  "...................OSSSSSSSDDSSNNNNNNSDDSSSSSO....OOZZUUUUUOO...",
  "..................ODDDDDDDDODSSSSSSSSSDOSSSSSO....OZZUZZOOOO....",
  ".................ODDDDDDDDDODSSNNNNNNSDODDDDDO...OSSSSZO........",
  ".................ODDDDDDDDPDDSSSSSSSSDDPDDDDDO..OSSSSUZO........",
  ".................ODDDDDDDDPDDDSSSSSSDDDPDDDDDDOOSSSSSZZOO.......",
  ".................ODDDDDDDDDDDDDDDDDDDDDDDDDDDDDDOOOUUUUOO.......",
  "..................OODDDDDDDDDDDDDDDDDDDDDDDDDDOO...OOOO.........",
  ".................PDDDDDDDDDDDDDDDDDDDDDDDDDDDDDP................",
  "................PMMDDDDDDDDDDDDDDDDDDDDDDDDDDDMMP...............",
  "...............PMMMMDDDDDDDDDDDDDDDDDDDDDDDDDMMMMP..............",
  "..............PMMMMMPDDDDDDDDDDDDDDDDDDDDDDDPMMMMMP.............",
  ".............PMMMMMP.ODDDDDDDDDDDDDDDDDDDDDO.PMMMMMP............",
  "............PMMMMMP..ODDDDDDDDDDDDDDDDDDDDDO..PMMMMMP...........",
  "...........PMMMMPP...ODDDDDDDDDOOOODDDDDDDDO...PPMMMMP..........",
  "..........PMMMPP.....ODDDDDDDDO....ODDDDDDDDO....PPMMMP.........",
  ".........PMMPP.......ODDDDDDDDO....ODDDDDDDDO......PPMMP........",
  "........PMPP.........ODDDDDDDDO....ODDDDDDDDO........PPMP.......",
  ".....................ODDDDDDDDO....ODDDDDDDDO...................",
  ".....................ODDDDDDDDO....ODDDDDDDDO...................",
  ".....................ODDDDDDDDO....ODDDDDDDDO...................",
  "....................ODDDDDDDDDO....ODDDDDDDDDO..................",
  "....................ODDDDDDDDDO....ODDDDDDDDDO..................",
  "...................ODDDDDDDDDDO....ODDDDDDDDDDO.................",
  "..................ODDDDDDDDDDDO....ODDDDDDDDDDDO................",
  ".................ODDPDDDDPDDDDO....ODDDDPDDDDPDDO...............",
  "................ODDPPDDDDPPDDDO....ODDDPPDDDDPPDDO..............",
  "................OO..OO..OO..OO......OO..OO..OO..OO.............."
];

const MELIODAS_NORMAL_RECTS_SVG = compilePixelMapToRects(MELIODAS_NORMAL_ROWS, MELIODAS_NORMAL_PALETTE);
const MELIODAS_ASSAULT_RECTS_SVG = compilePixelMapToRects(MELIODAS_ASSAULT_ROWS, MELIODAS_ASSAULT_PALETTE);

/**
 * Menghasilkan SVG Karakter Playable Kedua: MELIODAS (Normal Boar Hat & Assault Mode)
 * Dibangun di atas grid piksel integer 64x64 murni (sejajar dengan benchmark Traveler)
 * berdasarkan referensi kanon The Seven Deadly Sins: IDLE Adventure (Netmarble).
 */
export function getMeliodasSVG({ mode = 'normal', size = 120, facing = 'right' } = {}) {
  const flipTransform = facing === 'left' ? 'scale(-1, 1) translate(-64, 0)' : '';
  const isAssault = mode === 'assault';

  if (isAssault) {
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="character-pixel-svg meliodas-assault-svg" shape-rendering="crispEdges">
      <g transform="${flipTransform}">
        <!-- Bayangan Pijakan Ungu Kegelapan -->
        <ellipse cx="32" cy="60" rx="16" ry="3.2" fill="#12091E" opacity="0.6"/>
${MELIODAS_ASSAULT_RECTS_SVG}
      </g>
    </svg>`;
  }

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="character-pixel-svg meliodas-normal-svg" shape-rendering="crispEdges">
    <g transform="${flipTransform}">
      <!-- Bayangan Pijakan -->
      <ellipse cx="30" cy="60" rx="13" ry="3" fill="#26364A" opacity="0.35"/>
${MELIODAS_NORMAL_RECTS_SVG}
    </g>
  </svg>`;
}

/**
 * Menghasilkan Potret Ilustrasi 2D Editorial Resmi: NORMAL MELIODAS (Boar Hat + Lostvayne)
 * Digunakan pada Etalase Karakter di Halaman Profil dan Carousel Pemilihan Karakter Arena Dojo.
 * Catatan: Assault Mode tidak pernah dijadikan potret permanen di halaman Profil.
 */
export function getMeliodasPortraitSVG() {
  return `
  <svg viewBox="0 0 600 800" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Meliodas — Potret Resmi Busana Boar Hat dan Pedang Suci Lostvayne">
    <defs>
      <linearGradient id="melPortraitBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FAF6EE"/>
        <stop offset="52%" stop-color="#EEF5EC"/>
        <stop offset="100%" stop-color="#E4EFE2"/>
      </linearGradient>
      <linearGradient id="melHairGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFF08A"/>
        <stop offset="55%" stop-color="#FACC15"/>
        <stop offset="100%" stop-color="#CA8A04"/>
      </linearGradient>
      <linearGradient id="melEmeraldEye" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#065F46"/>
        <stop offset="55%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#6EE7B7"/>
      </linearGradient>
      <linearGradient id="lostvayneSilver" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="50%" stop-color="#E2E8F0"/>
        <stop offset="100%" stop-color="#94A3B8"/>
      </linearGradient>
      <linearGradient id="lostvayneGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FEF08A"/>
        <stop offset="50%" stop-color="#E5B84B"/>
        <stop offset="100%" stop-color="#A16207"/>
      </linearGradient>
    </defs>

    <!-- Latar Editorial Modern Dayloom (Warm Ivory & Soft Emerald Accent) -->
    <rect width="600" height="800" fill="url(#melPortraitBg)"/>

    <!-- Pita Geometris Editorial & Lingkaran Lambang Naga -->
    <rect x="340" y="0" width="260" height="800" fill="#5B8C3E" opacity="0.14"/>
    <line x1="340" y1="0" x2="340" y2="800" stroke="#5B8C3E" stroke-width="3" opacity="0.35"/>
    <circle cx="300" cy="360" r="235" fill="#FFFDF8" stroke="#D49A3D" stroke-width="2.5" opacity="0.85"/>
    <circle cx="300" cy="360" r="215" fill="none" stroke="#5B8C3E" stroke-width="1.5" stroke-dasharray="10 8" opacity="0.55"/>

    <!-- Tipografi Editorial Latar -->
    <text x="48" y="96" font-family="'Cinzel', 'Georgia', serif" font-size="42" font-weight="900" fill="#26364A" opacity="0.12" letter-spacing="6">MELIODAS</text>
    <text x="52" y="130" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" fill="#5B8C3E" opacity="0.55" letter-spacing="4">BOAR HAT • SACRED TREASURE LOSTVAYNE</text>

    <!-- Bingkai Kartu Editorial Tengah -->
    <rect x="64" y="148" width="472" height="570" rx="22" fill="#FFFDF9" stroke="#26364A" stroke-width="3.5"/>
    <rect x="82" y="166" width="436" height="476" rx="14" fill="#E8F0E6" stroke="#9B7866" stroke-width="2"/>

    <!-- Siluet Pegunungan & Lentera Lembut di Dalam Bingkai -->
    <path d="M82 540 Q190 420 310 470 Q420 390 518 490 L518 642 L82 642 Z" fill="#C9DEC4" opacity="0.65"/>
    <circle cx="175" cy="265" r="54" fill="#FFF6D6" opacity="0.85"/>

    <!-- ================= KARAKTER NORMAL MELIODAS (BOAR HAT OUTFIT) ================= -->
    <g transform="translate(0, 12)">
      <!-- Kemeja Putih Lengan Pendek Boar Hat (Tubuh & Bahu) -->
      <path d="M135 630 L165 455 Q230 430 300 430 Q370 430 435 455 L465 630 Z" fill="#FFFDF8" stroke="#26364A" stroke-width="3.5" stroke-linejoin="round"/>
      <!-- Shading Lipatan Kemeja Putih -->
      <path d="M142 630 L170 460 L225 445 L210 630 Z" fill="#E6E1D6"/>
      <path d="M390 465 L432 456 L458 630 L405 630 Z" fill="#E6E1D6"/>
      <!-- Kancing Emas di Lengan & Bahu -->
      <ellipse cx="162" cy="495" rx="7" ry="12" fill="#E5B84B" stroke="#26364A" stroke-width="2"/>
      <ellipse cx="438" cy="495" rx="7" ry="12" fill="#E5B84B" stroke="#26364A" stroke-width="2"/>

      <!-- Rompi Dalam Hitam & Tali Silang Hijau (Laced Chest V-Neck sesuai Referensi 2) -->
      <polygon points="235,442 365,442 342,630 258,630" fill="#1E242B" stroke="#26364A" stroke-width="3"/>
      <!-- Lubang Kancing Emas (Gold Eyelets) & Tali Silang Hijau -->
      <g stroke="#26364A" stroke-width="2" fill="#E5B84B">
        <circle cx="248" cy="472" r="6"/><circle cx="352" cy="472" r="6"/>
        <circle cx="254" cy="512" r="6"/><circle cx="346" cy="512" r="6"/>
        <circle cx="260" cy="552" r="6"/><circle cx="340" cy="552" r="6"/>
        <circle cx="266" cy="592" r="6"/><circle cx="334" cy="592" r="6"/>
      </g>
      <!-- Tali Hijau Boar Hat Menyilang -->
      <g stroke="#5B8C3E" stroke-width="7" stroke-linecap="round">
        <line x1="250" y1="472" x2="344" y2="512"/>
        <line x1="350" y1="472" x2="256" y2="512"/>
        <line x1="256" y1="512" x2="338" y2="552"/>
        <line x1="344" y1="512" x2="262" y2="552"/>
        <line x1="262" y1="552" x2="332" y2="592"/>
        <line x1="338" y1="552" x2="268" y2="592"/>
      </g>

      <!-- Kerah Tegak Hijau Daun Boar Hat + Tali Gantung (Sesuai Referensi 2) -->
      <polygon points="182,428 248,392 256,455 198,452" fill="#5B8C3E" stroke="#26364A" stroke-width="3.2" stroke-linejoin="round"/>
      <polygon points="418,428 352,392 344,455 402,452" fill="#5B8C3E" stroke="#26364A" stroke-width="3.2" stroke-linejoin="round"/>
      <!-- Detail Jahitan Daun pada Kerah Hijau -->
      <path d="M206,422 L216,428 M224,412 L232,420 M392,422 L382,428 M374,412 L366,420" stroke="#1E242B" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Tali Hijau Menggantung dari Kerah -->
      <path d="M235,418 Q228,510 225,575" stroke="#4D7C2B" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M365,418 Q372,510 375,575" stroke="#4D7C2B" stroke-width="8" stroke-linecap="round" fill="none"/>

      <!-- Leher & Shading -->
      <path d="M268 380 L268 442 L332 442 L332 380 Z" fill="#FAD7BD" stroke="#26364A" stroke-width="3"/>
      <path d="M268 385 Q300 412 332 385 L332 406 Q300 426 268 406 Z" fill="#E5B594"/>

      <!-- Wajah Muda Ekspresif Meliodas (Bentuk Dagu Ramping, Ceria & Muda) -->
      <path d="M218 265 Q218 376 300 395 Q382 376 382 265 Z" fill="#FAD7BD" stroke="#26364A" stroke-width="3.4"/>

      <!-- Mata Hijau Zamrud Besar, Berbinar, Ekspresif & Bersinar (Lively Emerald Eyes) -->
      <!-- Mata Kiri -->
      <g transform="translate(256, 316)">
        <ellipse cx="0" cy="0" rx="19" ry="24" fill="#FFFFFF" stroke="#26364A" stroke-width="3"/>
        <ellipse cx="2" cy="1" rx="13" ry="19" fill="url(#melEmeraldEye)" stroke="#064E3B" stroke-width="2"/>
        <ellipse cx="2" cy="2" rx="6" ry="10" fill="#064E3B"/>
        <circle cx="-3" cy="-7" r="5" fill="#FFFFFF"/>
        <circle cx="5" cy="8" r="2.8" fill="#A7F3D0"/>
        <!-- Kelopak Mata Atas Ramah & Ceria -->
        <path d="M-20 -15 Q-2 -24 20 -13" stroke="#26364A" stroke-width="4.2" fill="none" stroke-linecap="round"/>
      </g>
      <!-- Mata Kanan -->
      <g transform="translate(344, 316)">
        <ellipse cx="0" cy="0" rx="19" ry="24" fill="#FFFFFF" stroke="#26364A" stroke-width="3"/>
        <ellipse cx="-2" cy="1" rx="13" ry="19" fill="url(#melEmeraldEye)" stroke="#064E3B" stroke-width="2"/>
        <ellipse cx="-2" cy="2" rx="6" ry="10" fill="#064E3B"/>
        <circle cx="-5" cy="-7" r="5" fill="#FFFFFF"/>
        <circle cx="3" cy="8" r="2.8" fill="#A7F3D0"/>
        <!-- Kelopak Mata Atas Ramah & Ceria -->
        <path d="M-20 -13 Q2 -24 20 -15" stroke="#26364A" stroke-width="4.2" fill="none" stroke-linecap="round"/>
      </g>

      <!-- Alis Percaya Diri, Hidung Bersih & Rona Pipi Hangat Alami -->
      <path d="M236 282 Q258 273 280 282" stroke="#CA8A04" stroke-width="3.6" fill="none" stroke-linecap="round"/>
      <path d="M320 282 Q342 273 364 282" stroke="#CA8A04" stroke-width="3.6" fill="none" stroke-linecap="round"/>
      <circle cx="300" cy="342" r="2.2" fill="#C88D6D"/>
      <ellipse cx="236" cy="344" rx="12" ry="5.5" fill="#F472B6" opacity="0.45"/>
      <ellipse cx="364" cy="344" rx="12" ry="5.5" fill="#F472B6" opacity="0.45"/>

      <!-- SENYUM TENANG, PERCAYA DIRI ALAMI (Calm, Confident Smile - Restrained & Expressive) -->
      <path d="M282 366 Q300 375 318 366" stroke="#26364A" stroke-width="3.6" fill="none" stroke-linecap="round"/>

      <!-- Rambut Pirang Keemasan Berlapis Runcing Khas Meliodas + Ahoge Ikonik & Kuncir Belakang -->
      <!-- Ahoge Melengkung Tinggi Khas Meliodas -->
      <path d="M280 182 Q306 95 368 140 Q324 136 298 186 Z" fill="url(#melHairGold)" stroke="#26364A" stroke-width="3.2"/>
      <path d="M202 315 L152 288 L192 258 L146 226 L205 204 L245 174 L300 168 L355 174 L402 202 L448 228 L406 258 L446 290 L398 312 L386 355 L372 292 L352 325 L335 268 L308 320 L292 264 L268 322 L245 268 L228 326 L214 358 Z" fill="url(#melHairGold)" stroke="#26364A" stroke-width="3.4" stroke-linejoin="round"/>
      <!-- Kuncir Rambut Belakang Kecil (Tied-back hair tuft sesuai Referensi B) -->
      <path d="M168 325 Q135 365 140 415" stroke="url(#melHairGold)" stroke-width="12" stroke-linecap="round" fill="none"/>
      <path d="M168 325 Q135 365 140 415" stroke="#26364A" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <circle cx="160" cy="345" r="7" fill="#2E6B34" stroke="#26364A" stroke-width="2"/>
      <!-- Highlight Kilau Rambut Pirang -->
      <path d="M235 224 Q300 205 365 224" stroke="#FEF9C3" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.75"/>

      <!-- ================= PEDANG SUCI LOSTVAYNE (MEMBENTANG DI DEPAN) ================= -->
      <!-- Desain Lostvayne Proporsional: Scimitar Cleaver Lebar, Punggung Bertekstur Rune & Takik, 5 Lubang Sirkular -->
      <g transform="translate(385, 435) rotate(-20)">
        <!-- Bilah Lengkung Lostvayne Lebar: Punggung Emas & Hijau Tua (#143D30) & Mata Perak (#F1F5F9) -->
        <path d="M-28,0 L32,0 Q42,-145 -16,-265 Q-44,-135 -28,0 Z" fill="url(#lostvayneSilver)" stroke="#26364A" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M-28,0 L10,-4 Q16,-140 -16,-265 Q-42,-135 -28,0 Z" fill="#D97706" stroke="#26364A" stroke-width="2.6"/>
        <path d="M-28,0 L0,-4 Q4,-138 -16,-265 Q-38,-135 -28,0 Z" fill="#143D30"/>

        <!-- Takik Gerigi Runcing pada Punggung Bilah Lostvayne (Sesuai Referensi Gambar 4) -->
        <polygon points="-32,-45 -42,-58 -30,-64" fill="#26364A"/>
        <polygon points="-31,-95 -41,-108 -29,-114" fill="#26364A"/>
        <polygon points="-28,-145 -38,-158 -26,-164" fill="#26364A"/>
        <polygon points="-24,-192 -34,-204 -22,-210" fill="#26364A"/>

        <!-- 5 Lubang Sirkular Khas di Sepanjang Bilah Lostvayne (Tembus & Kontras Tinggi) -->
        <circle cx="5" cy="-38" r="11.5" fill="#E8F0E6" stroke="#26364A" stroke-width="3"/>
        <circle cx="4" cy="-80" r="11" fill="#E8F0E6" stroke="#26364A" stroke-width="3"/>
        <circle cx="1" cy="-122" r="10.5" fill="#E8F0E6" stroke="#26364A" stroke-width="3"/>
        <circle cx="-3" cy="-162" r="9.8" fill="#E8F0E6" stroke="#26364A" stroke-width="3"/>
        <circle cx="-8" cy="-200" r="9" fill="#E8F0E6" stroke="#26364A" stroke-width="3"/>

        <!-- Pelindung Tangan Emas-Oranye Segitiga (Chevron Guard) + Ouroboros Dragon Crest -->
        <polygon points="-44,4 44,4 35,32 0,48 -35,32" fill="url(#lostvayneGold)" stroke="#26364A" stroke-width="3.4" stroke-linejoin="round"/>
        <circle cx="0" cy="22" r="10" fill="none" stroke="#78350F" stroke-width="2.5" stroke-dasharray="4 2"/>

        <!-- Gagang Hijau Tua dengan Lilitan Tali Emas & Pommel Bulat -->
        <rect x="-14" y="42" width="28" height="82" rx="5" fill="#1E4426" stroke="#26364A" stroke-width="3.2"/>
        <line x1="-14" y1="52" x2="14" y2="62" stroke="#E5B84B" stroke-width="2.5"/>
        <line x1="14" y1="62" x2="-14" y2="72" stroke="#E5B84B" stroke-width="2.5"/>
        <line x1="-14" y1="72" x2="14" y2="82" stroke="#E5B84B" stroke-width="2.5"/>
        <line x1="14" y1="82" x2="-14" y2="92" stroke="#E5B84B" stroke-width="2.5"/>
        <line x1="-14" y1="92" x2="14" y2="102" stroke="#E5B84B" stroke-width="2.5"/>
        <ellipse cx="0" cy="128" rx="18" ry="10" fill="url(#lostvayneGold)" stroke="#26364A" stroke-width="3.2"/>

        <!-- Tangan Meliodas Memegang Gagang Lostvayne -->
        <rect x="-20" y="58" width="40" height="36" rx="12" fill="#FAD7BD" stroke="#26364A" stroke-width="3"/>
      </g>
    </g>

    <!-- Bar Bawah Kartu Editorial -->
    <text x="92" y="684" font-family="'Cinzel', 'Georgia', serif" font-size="24" font-weight="900" fill="#26364A" letter-spacing="2">MELIODAS</text>
    <text x="92" y="705" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="700" fill="#5B8C3E">Kapten Boar Hat • Harta Suci Lostvayne</text>
  </svg>`;
}

/**
 * Menghasilkan Ilustrasi Lencana Pencapaian (Achievements) Pixel-Art
 */
export function getAchievementSVG(iconType, unlocked = false, size = 56) {
  const bg = unlocked ? '#FFF6E8' : '#E2DBD0';
  const stroke = unlocked ? '#D49A3D' : '#8C857B';
  const accent = unlocked ? '#C85A7C' : '#7A756C';
  const secondary = unlocked ? '#5C9EAD' : '#9E988E';
  const dark = '#26364A';

  let innerArt = '';
  switch (iconType) {
    case 'spool':
      innerArt = `
        <rect x="20" y="14" width="24" height="5" fill="${stroke}" stroke="${dark}" stroke-width="1.5"/>
        <rect x="23" y="19" width="18" height="24" fill="${accent}" stroke="${dark}" stroke-width="1.5"/>
        <line x1="23" y1="25" x2="41" y2="25" stroke="#FFF" stroke-width="1.5"/>
        <line x1="23" y1="31" x2="41" y2="31" stroke="#FFF" stroke-width="1.5"/>
        <line x1="23" y1="37" x2="41" y2="37" stroke="#FFF" stroke-width="1.5"/>
        <rect x="20" y="43" width="24" height="5" fill="${stroke}" stroke="${dark}" stroke-width="1.5"/>
      `;
      break;
    case 'scroll':
      innerArt = `
        <rect x="16" y="14" width="32" height="6" rx="2" fill="${stroke}" stroke="${dark}" stroke-width="1.5"/>
        <rect x="19" y="20" width="26" height="24" fill="#FFFDF9" stroke="${dark}" stroke-width="1.5"/>
        <line x1="24" y1="26" x2="40" y2="26" stroke="${accent}" stroke-width="2"/>
        <line x1="24" y1="32" x2="40" y2="32" stroke="${secondary}" stroke-width="2"/>
        <line x1="24" y1="38" x2="35" y2="38" stroke="${secondary}" stroke-width="2"/>
        <rect x="16" y="44" width="32" height="6" rx="2" fill="${stroke}" stroke="${dark}" stroke-width="1.5"/>
      `;
      break;
    case 'hourglass':
      innerArt = `
        <rect x="18" y="13" width="28" height="4" fill="${stroke}" stroke="${dark}" stroke-width="1.5"/>
        <polygon points="21,17 43,17 34,31 43,45 21,45 30,31" fill="${secondary}" stroke="${dark}" stroke-width="1.5"/>
        <polygon points="26,22 38,22 32,30" fill="#FFE08A"/>
        <polygon points="25,43 39,43 32,35" fill="#FFE08A"/>
        <rect x="18" y="45" width="28" height="4" fill="${stroke}" stroke="${dark}" stroke-width="1.5"/>
      `;
      break;
    case 'fan':
      innerArt = `
        <path d="M12 38 C16 18, 48 18, 52 38 L32 48 Z" fill="${accent}" stroke="${dark}" stroke-width="1.5"/>
        <line x1="32" y1="48" x2="22" y2="24" stroke="#FFE08A" stroke-width="1.5"/>
        <line x1="32" y1="48" x2="32" y2="21" stroke="#FFE08A" stroke-width="1.5"/>
        <line x1="32" y1="48" x2="42" y2="24" stroke="#FFE08A" stroke-width="1.5"/>
        <circle cx="32" cy="46" r="3" fill="${stroke}"/>
      `;
      break;
    case 'sword':
      innerArt = `
        <polygon points="32,11 36,36 32,40 28,36" fill="${secondary}" stroke="${dark}" stroke-width="1.5"/>
        <rect x="22" y="36" width="20" height="4" fill="${stroke}" stroke="${dark}" stroke-width="1.5"/>
        <rect x="29" y="40" width="6" height="10" fill="${accent}" stroke="${dark}" stroke-width="1.5"/>
      `;
      break;
    case 'shield':
      innerArt = `
        <polygon points="32,12 48,18 44,38 32,50 20,38 16,18" fill="${secondary}" stroke="${dark}" stroke-width="1.5"/>
        <polygon points="32,17 42,21 39,35 32,44 25,35 22,21" fill="${accent}"/>
        <circle cx="32" cy="29" r="4" fill="#FFE08A"/>
      `;
      break;
    case 'torii':
      innerArt = `
        <path d="M12 18 Q32 14 52 18 L50 23 Q32 20 14 23 Z" fill="${accent}" stroke="${dark}" stroke-width="1.5"/>
        <rect x="16" y="26" width="32" height="4" fill="${accent}" stroke="${dark}" stroke-width="1.2"/>
        <rect x="20" y="22" width="5" height="28" fill="${accent}" stroke="${dark}" stroke-width="1.5"/>
        <rect x="39" y="22" width="5" height="28" fill="${accent}" stroke="${dark}" stroke-width="1.5"/>
      `;
      break;
    case 'crown':
    default:
      innerArt = `
        <polygon points="14,42 16,20 26,30 32,16 38,30 48,20 50,42" fill="#FFE08A" stroke="${dark}" stroke-width="1.5"/>
        <rect x="14" y="42" width="36" height="6" fill="${accent}" stroke="${dark}" stroke-width="1.5"/>
        <circle cx="32" cy="34" r="3" fill="${accent}"/>
      `;
      break;
  }

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="achievement-svg ${unlocked ? 'is-unlocked' : 'is-locked'}">
    <polygon points="32,3 56,15 56,49 32,61 8,49 8,15" fill="${bg}" stroke="${stroke}" stroke-width="3"/>
    ${innerArt}
  </svg>`;
}

/**
 * Menghasilkan Ilustrasi Boss Arena (Monster Penundaan & Distraksi)
 */
export function getBossSVG(bossId, size = 130) {
  if (bossId === 'sloth_oni') {
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <ellipse cx="32" cy="58" rx="18" ry="4" fill="#26364A" opacity="0.4"/>
      <!-- Tanduk Oni -->
      <polygon points="16,18 20,6 26,16" fill="#FFE08A" stroke="#26364A" stroke-width="1.5"/>
      <polygon points="48,18 44,6 38,16" fill="#FFE08A" stroke="#26364A" stroke-width="1.5"/>
      <!-- Tubuh Daruma Bayangan -->
      <rect x="14" y="16" width="36" height="38" rx="8" fill="#9E2A47" stroke="#26364A" stroke-width="2"/>
      <rect x="18" y="22" width="28" height="16" fill="#F5EBDD" stroke="#26364A" stroke-width="1.5"/>
      <!-- Mata Mengantuk / Marah -->
      <rect x="21" y="26" width="8" height="6" fill="#26364A"/>
      <rect x="23" y="28" width="4" height="3" fill="#FF6B6B"/>
      <rect x="35" y="26" width="8" height="6" fill="#26364A"/>
      <rect x="37" y="28" width="4" height="3" fill="#FF6B6B"/>
      <!-- Kumis & Mulut Taring -->
      <rect x="24" y="42" width="16" height="6" fill="#26364A"/>
      <polygon points="26,42 28,46 30,42" fill="#FFF"/>
      <polygon points="34,42 36,46 38,42" fill="#FFF"/>
    </svg>`;
  } else if (bossId === 'distraction_tengu') {
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <ellipse cx="32" cy="58" rx="18" ry="4" fill="#26364A" opacity="0.4"/>
      <!-- Sayap Gagak Tengu -->
      <polygon points="4,20 18,26 14,46 2,36" fill="#26364A" stroke="#D49A3D" stroke-width="1.5"/>
      <polygon points="60,20 46,26 50,46 62,36" fill="#26364A" stroke="#D49A3D" stroke-width="1.5"/>
      <!-- Tubuh & Wajah Tengu -->
      <rect x="18" y="14" width="28" height="38" fill="#C94A4A" stroke="#26364A" stroke-width="2"/>
      <!-- Topi Tokin Kecil -->
      <rect x="27" y="7" width="10" height="7" fill="#26364A" stroke="#FFE08A" stroke-width="1.2"/>
      <!-- Mata Tajam Emas -->
      <polygon points="21,23 29,26 21,29" fill="#FFE08A"/>
      <polygon points="43,23 35,26 43,29" fill="#FFE08A"/>
      <!-- Kipas Angin Tengu -->
      <polygon points="24,36 40,36 32,48" fill="#FFE08A" stroke="#26364A" stroke-width="1.5"/>
    </svg>`;
  }
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <ellipse cx="32" cy="58" rx="22" ry="4" fill="#26364A" opacity="0.4"/>
    <!-- Aura Naga Waktu -->
    <circle cx="32" cy="32" r="26" fill="none" stroke="#C4B5FD" stroke-width="2" stroke-dasharray="4 3"/>
    <!-- Tanduk & Kepala Naga -->
    <polygon points="12,8 22,20 16,24" fill="#81ECEC" stroke="#26364A" stroke-width="1.5"/>
    <polygon points="52,8 42,20 48,24" fill="#81ECEC" stroke="#26364A" stroke-width="1.5"/>
    <polygon points="32,10 48,22 44,48 32,56 20,48 16,22" fill="#4834D4" stroke="#81ECEC" stroke-width="2"/>
    <!-- Mata Naga Bercahaya -->
    <polygon points="21,26 29,30 22,33" fill="#81ECEC"/>
    <polygon points="43,26 35,30 42,33" fill="#81ECEC"/>
    <!-- Jam Pasir Retak di Dahi -->
    <polygon points="28,16 36,16 32,23 36,28 28,28 32,23" fill="#FFE08A"/>
  </svg>`;
}

/**
 * Menghasilkan Ikon Antarmuka RPG Vektor (Tanpa Emoji)
 */
export function getIconSVG(name, size = 18) {
  const icons = {
    book: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    briefcase: `<rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" stroke-width="2"/>`,
    home: `<path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z" stroke="currentColor" stroke-width="2"/><path d="M9 22V12h6v10" stroke="currentColor" stroke-width="2"/>`,
    heart: `<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.3l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z" stroke="currentColor" stroke-width="2"/>`,
    brush: `<path d="M18 3l3 3-11 11-4 1 1-4L18 3z" stroke="currentColor" stroke-width="2"/><path d="M4 20h16" stroke="currentColor" stroke-width="2"/>`,
    star: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
    check: `<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    plus: `<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
    trash: `<polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2"/>`,
    edit: `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>`,
    volumeOn: `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" stroke-width="2"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
    volumeOff: `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" stroke-width="2"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/>`,
    sun: `<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/>`,
    sunset: `<path d="M17 18a5 5 0 0 0-10 0" stroke="currentColor" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="2" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" stroke="currentColor" stroke-width="2"/><line x1="1" y1="18" x2="3" y2="18" stroke="currentColor" stroke-width="2"/><line x1="21" y1="18" x2="23" y2="18" stroke="currentColor" stroke-width="2"/><line x1="23" y1="22" x2="1" y2="22" stroke="currentColor" stroke-width="2"/>`,
    moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2"/>`,
    sword: `<polygon points="18 2 22 6 7 21 3 21 3 17 18 2" stroke="currentColor" stroke-width="2"/><line x1="14" y1="6" x2="18" y2="10" stroke="currentColor" stroke-width="2"/>`,
    compass: `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" stroke="currentColor" stroke-width="2"/>`,
    chart: `<line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
    download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>`,
    upload: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/><polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="2"/><line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2"/>`,
    camera: `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/>`,
    userPlus: `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2"/><line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" stroke-width="2"/><line x1="17" y1="11" x2="23" y2="11" stroke="currentColor" stroke-width="2"/>`,
    users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="2"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2"/>`,
    lock: `<rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>`
  };

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="ui-icon-svg">${icons[name] || icons.star}</svg>`;
}
