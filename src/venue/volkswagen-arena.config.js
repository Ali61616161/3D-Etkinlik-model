// Volkswagen Arena İstanbul — parametrik mekân tanımı.
//
// Birim: metre.  Eksenler: +X sağ, +Y yukarı, +Z "karşı tribün" ucu. Sahne −Z ucunda.
// Bu dosya motorun TEK girdisidir: bloklar, sıralar, eğim, localar, sahne/saha ölçüleri.
// Başka bir mekân için yeni bir config dosyası yazmak yeterli (bkz. docs/yeni-mekan.md).
//
// ── DOĞRULUK DURUMU ─────────────────────────────────────────────────────────────
//  KAYNAKLI (doğrulandı):  blok adları/sayıları (Biletix planı), loca sayısı ve sıralaması,
//                          zemin blokları 6×18×20 = 2160, kapasite rakamları, sahne 160 m² / 1,5 m,
//                          çatı 286 t çelik, betonarme tribün, renk/malzeme paleti.
//  TAHMİN (resmî veri yok): salonun metrik ölçüleri, tribün eğimi, sıra sayıları (yan/karşı),
//                          çatı yüksekliği, loca iç düzeni.  `estimated: true` ile işaretlidir.
//  Resmî teknik doküman (vwarena.com Promoters Pack PDF) elde edilince yalnızca bu dosya güncellenir.

const SEAT = 0.46; // koltuk eni (m)
const ROW = 0.8; // tribün sıra derinliği (m)
const RISE = 0.38; // tribün sıra yükselmesi (m)
const BASE = 0.6; // ilk sıranın zeminden yüksekliği (m)
const FLOOR_HALF = 15.5; // tribün ön hattı: zemin yarı genişliği (m)

/** Bir hat boyunca eşit aralıklı blok merkezleri (yanal koordinat). */
function evenCenters(count, blockWidth, span) {
  const gap = (span - count * blockWidth) / (count - 1);
  return Array.from({ length: count }, (_, i) => -span / 2 + blockWidth / 2 + i * (blockWidth + gap));
}

const SIDE_SEATS = 14; // Biletix planındaki en geniş yan blok sırası: 14 koltuk
const sideCenters = evenCenters(5, SIDE_SEATS * SEAT, 40);
const ROW_LETTERS = 'ABCDEFGHIJKLMNOPRSTU'; // planda zemin blokları A…U → 20 sıra (6×18×20 = 2160)

export default {
  meta: {
    id: 'volkswagen-arena-istanbul',
    name: 'Volkswagen Arena İstanbul',
    operator: 'Pozitif',
    location: 'UNIQ İstanbul, Maslak / Sarıyer',
    sources: [
      { label: 'Biletix oturma planı (kullanıcı sağladı)', use: 'blok adları, koltuk aralıkları, loca 1–24 sırası' },
      { label: 'Vikipedi (TR/EN)', use: 'kapasite 4.500–5.800, basketbol 5.240, 24 loca süiti, 88 VIP' },
      { label: 'Arkiv / Yazgan Design / Archello', use: 'zemin oturmalı 2.160, ek tribün 562, 286 t çelik çatı, malzeme ve renk paleti' },
      { label: 'vwarena.com – Main Hall Renting', use: 'sahne 1,5 m yükseklik, 160 m²; iki skorbord' },
      { label: 'Uniq İstanbul – VW Arena', use: '5.800 kişi; buz pisti/konferans/basketbol dönüşümü' },
    ],
    assumptions: [
      'Salonun metrik ölçüleri, çatı yüksekliği ve tribün eğimleri resmî olarak yayımlanmamış; fotoğraf ve plan oranlarından tahmin edildi.',
      'Yan/karşı tribün sıra sayısı (12) ve sıra başına koltuk sayısı tahmin; plandaki 14 koltuk üst sınırı baz alındı.',
      'Basketbol düzeninde saha içi bloklar yok; sahanın iki başında teleskopik ek tribün (3×11×17 ≈ 561, resmî ek tribün 562) var.',
      'Resmî basketbol kapasitesi 5.240; bu modeldeki toplam daha düşük çıkar — gerçek basketbol oturma planı gelince güncellenecek.',
      'Zemin blokları plandaki A…U harf dizisi yerine 20 harflik tek dizi (A–U) ile etiketlendi.',
    ],
  },

  dims: {
    seatPitch: SEAT,
    eyeHeight: 1.18, // oturan kişinin göz yüksekliği, tribün basamağından (m)
  },

  hall: {
    floor: { halfWidth: FLOOR_HALF, zMin: -28, zMax: 26 },
    ring: {
      frontX: 26.3, // yan loca hattı (|x|)
      endFrontZ: 36.0, // karşı uç loca hattı
      chamferStartZ: 24.7, // yan hattın bittiği, köşe pahının başladığı z
      wingZ: -21.0, // yan hattın sahne ucundaki başlangıcı
      stageWallZ: -29.0,
      depth: 5.2, // loca derinliği
      floorY: 5.0, // loca zemin kotu
      ceilingY: 9.4,
      locaWidth: 5.0,
      sideLocas: 8,
      endLocas: 6,
    },
    roof: { springY: 9.4, apexY: 21.5, halfSpan: 32.2, zMin: -29, zMax: 41.6, ribCount: 13 },
    estimated: true,
  },

  configurations: {
    concert: {
      label: 'Konser',
      lighting: 'concert',
      focus: [0, 3.4, -23], // koltuktan bakılan nokta (sahne ortası)
      focusLabel: 'Sahne',
      focusDative: 'Sahneye',
      overview: { position: [0, 15.5, 37], target: [0, 3, -8] },
      stage: { width: 16, depth: 10, height: 1.5, z0: -28 }, // 160 m², 1,5 m (vwarena.com)
    },
    basketball: {
      label: 'Basketbol',
      lighting: 'game',
      focus: [0, 1.4, 0], // saha ortası
      focusLabel: 'Saha',
      focusDative: 'Sahaya',
      overview: { position: [0, 14.5, 34], target: [0, 2, 0] },
      court: { length: 28, width: 15, centerZ: 0 }, // FIBA ölçüsü
    },
  },

  categories: {
    'sahne-onu': { label: 'Sahne Önü Oturmalı', color: '#ff5d8f' },
    'saha-ici': { label: 'Saha İçi Oturmalı', color: '#ffb13d' },
    tribun: { label: 'Yan Tribün', color: '#4cc2ff' },
    'tribun-karsi': { label: 'Karşı Tribün', color: '#5eead4' },
    loca: { label: 'Loca', color: '#c084fc' },
    'ek-tribun': { label: 'Ek (Teleskopik) Tribün', color: '#a3e635' },
    vip: { label: 'Saha Kenarı VIP', color: '#f87171' },
  },

  // Tribün = ortak geometriyi paylaşan blok grubu.
  //  kind: 'flat' (düz zemin) | 'rake' (eğimli, doğrusal) | 'fan' (köşe yelpazesi)
  //  origin/facing: 1. sıranın orta hattı ve koltukların baktığı yön (x,z)
  //  lateral: bloğun, bakan kişiye göre sağ ekseni (u = (−fz, fx)) boyunca merkez konumu
  tribunes: [
    {
      id: 'floor-front',
      kind: 'flat',
      configs: ['concert'],
      group: 'Sahne Önü',
      origin: [0, -13],
      facing: [0, -1],
      rows: 20,
      rowPitch: 0.85,
      rowLabels: ROW_LETTERS,
      blocks: [
        { id: '001', name: 'Sahne Önü Oturmalı 001', lateral: -10.3, seats: 18, category: 'sahne-onu' },
        { id: '002', name: 'Sahne Önü Oturmalı 002', lateral: 0, seats: 18, category: 'sahne-onu' },
        { id: '003', name: 'Sahne Önü Oturmalı 003', lateral: 10.3, seats: 18, category: 'sahne-onu' },
      ],
    },
    {
      id: 'floor-back',
      kind: 'flat',
      configs: ['concert'],
      group: 'Saha İçi',
      origin: [0, 6.5],
      facing: [0, -1],
      rows: 20,
      rowPitch: 0.85,
      rowLabels: ROW_LETTERS,
      blocks: [
        { id: '004', name: 'Saha İçi 004', lateral: -10.3, seats: 18, category: 'saha-ici' },
        { id: '005', name: 'Saha İçi 005', lateral: 0, seats: 18, category: 'saha-ici' },
        { id: '006', name: 'Saha İçi 006', lateral: 10.3, seats: 18, category: 'saha-ici' },
      ],
    },
    {
      id: 'side-left',
      kind: 'rake',
      configs: ['concert', 'basketball'],
      group: 'Yan Tribün (sol)',
      origin: [-16, 0],
      facing: [1, 0],
      rows: 12,
      rowPitch: ROW,
      rise: RISE,
      baseY: BASE,
      span: [-20.4, 20.4],
      blocks: ['202', '203', '204', '205', '206'].map((id, i) => ({
        id,
        name: `Tribün ${id}`,
        lateral: sideCenters[i],
        seats: SIDE_SEATS,
        category: 'tribun',
      })),
    },
    {
      id: 'side-right',
      kind: 'rake',
      configs: ['concert', 'basketball'],
      group: 'Yan Tribün (sağ)',
      origin: [16, 0],
      facing: [-1, 0],
      rows: 12,
      rowPitch: ROW,
      rise: RISE,
      baseY: BASE,
      span: [-20.4, 20.4],
      blocks: ['212', '213', '214', '215', '216'].map((id, i) => ({
        id,
        name: `Tribün ${id}`,
        lateral: sideCenters[i],
        seats: SIDE_SEATS,
        category: 'tribun',
      })),
    },
    {
      id: 'stage-corner-left',
      kind: 'rake',
      configs: ['concert', 'basketball'],
      group: 'Yan Tribün (sol)',
      origin: [-16, -23.4],
      facing: [1, 0],
      rows: 3,
      rowPitch: ROW,
      rise: RISE,
      baseY: BASE,
      span: [-1.6, 1.6],
      blocks: [{ id: '201', name: 'Tribün 201', lateral: 0, seats: 5, category: 'tribun' }],
    },
    {
      id: 'stage-corner-right',
      kind: 'rake',
      configs: ['concert', 'basketball'],
      group: 'Yan Tribün (sağ)',
      origin: [16, -23.4],
      facing: [-1, 0],
      rows: 3,
      rowPitch: ROW,
      rise: RISE,
      baseY: BASE,
      span: [-1.6, 1.6],
      blocks: [{ id: '217', name: 'Tribün 217', lateral: 0, seats: 5, category: 'tribun' }],
    },
    {
      id: 'end',
      kind: 'rake',
      configs: ['concert', 'basketball'],
      group: 'Karşı Tribün',
      origin: [0, 26.5],
      facing: [0, -1],
      rows: 12,
      rowPitch: ROW,
      rise: RISE,
      baseY: BASE,
      span: [-15.4, 15.4],
      blocks: [
        // Biletix planı: 208/210 ön sıra 16, arka sıra 21 koltuk; 209 ön 18, arka 4–15 (12 koltuk)
        { id: '208', name: 'Tribün 208', lateral: -10.3, seats: { near: 16, far: 21 }, category: 'tribun-karsi' },
        { id: '209', name: 'Tribün 209', lateral: 0, seats: { near: 18, far: 12 }, firstSeat: { near: 1, far: 4 }, category: 'tribun-karsi' },
        { id: '210', name: 'Tribün 210', lateral: 10.3, seats: { near: 16, far: 21 }, category: 'tribun-karsi' },
      ],
    },
    {
      id: 'fan-left',
      kind: 'fan',
      configs: ['concert', 'basketball'],
      group: 'Karşı Tribün',
      center: [-FLOOR_HALF, 26],
      angles: [98, 172], // derece, (x,z) düzleminde +x'ten +z'ye
      r0: 1.2,
      rows: 7,
      rowPitch: ROW,
      rise: RISE,
      baseY: BASE,
      blocks: [{ id: '207', name: 'Tribün 207', category: 'tribun-karsi' }],
    },
    {
      id: 'fan-right',
      kind: 'fan',
      configs: ['concert', 'basketball'],
      group: 'Karşı Tribün',
      center: [FLOOR_HALF, 26],
      angles: [8, 82],
      r0: 1.2,
      rows: 7,
      rowPitch: ROW,
      rise: RISE,
      baseY: BASE,
      blocks: [{ id: '211', name: 'Tribün 211', category: 'tribun-karsi' }],
    },
    {
      // Basketbol: sahne ucunda teleskopik ek tribün (resmî: 562 koltuk ≈ 3×11×17 = 561)
      id: 'telescopic',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Ek Tribün (Basketbol)',
      origin: [0, -17.3],
      facing: [0, 1],
      rows: 11,
      rowPitch: 0.85,
      rise: 0.35,
      baseY: 0.3,
      span: [-14.4, 14.4],
      blocks: [
        { id: 'T1', name: 'Ek Tribün T1', lateral: -9.6, seats: 17, category: 'ek-tribun' },
        { id: 'T2', name: 'Ek Tribün T2', lateral: 0, seats: 17, category: 'ek-tribun' },
        { id: 'T3', name: 'Ek Tribün T3', lateral: 9.6, seats: 17, category: 'ek-tribun' },
      ],
    },
    {
      // Basketbol: 88 saha kenarı VIP koltuk (Yazgan Design) — iki kenarda 44'er
      id: 'courtside-right',
      kind: 'flat',
      configs: ['basketball'],
      group: 'Saha Kenarı VIP',
      origin: [12.2, 0],
      facing: [-1, 0],
      rows: 1,
      rowPitch: 1,
      seatStyle: 'vip',
      blocks: [{ id: 'VIP-A', name: 'Saha Kenarı VIP A', lateral: 0, seats: 44, category: 'vip' }],
    },
    {
      id: 'courtside-left',
      kind: 'flat',
      configs: ['basketball'],
      group: 'Saha Kenarı VIP',
      origin: [-10.4, 0],
      facing: [1, 0],
      rows: 1,
      rowPitch: 1,
      seatStyle: 'vip',
      blocks: [{ id: 'VIP-B', name: 'Saha Kenarı VIP B', lateral: 0, seats: 44, category: 'vip' }],
    },
  ],

  // 24 loca (Biletix: LOCA 1–8 sol üstten aşağı, 9 sol köşe, 10–15 karşı uç, 16 sağ köşe, 17–24 sağ alttan yukarı).
  // Her loca planda iki karo → 2 sıra × 5 koltuk = 10 koltuk (Vikipedi: 24 loca / 240 koltuk).
  locas: {
    rows: 2,
    seatsPerRow: 5,
    seatSpacing: 0.9,
    rowDepth: [0.95, 1.85],
    rowRise: 0.3,
    category: 'loca',
  },
};
