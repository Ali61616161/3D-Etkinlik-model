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

// Etkinlik düzenleri (araştırma: konser oturmalı/ayakta, senfoni-film konseri, basketbol, gala-ödül-moda, e-spor)
const ALL = ['concert', 'standing', 'symphony', 'basketball', 'gala', 'esports', 'ice']; // konferansta tribünler perdeyle kapatılır
const STAGE_EVENTS = ['concert', 'standing', 'symphony', 'gala', 'esports'];
const FLOOR_SEATED = ['concert', 'symphony', 'esports', 'conference']; // zemin blokları 001–006 yalnızca bu düzenlerde
const ROW = 0.8; // tribün sıra derinliği (m)
const RISE = 0.4; // tribün sıra yükselmesi (m): alt tribün 16 sıra, tepe ≈ +6,7 m (Arkitera kesiti: +57,60 → +64,28)
const BASE = 0.3; // ilk sıranın zeminden yüksekliği (m)
const FLOOR_HALF = 15.3; // Arkitera planı: zemin 30 m genişlik ("3000"), stage duvarından tribün ayağına 52 m ("5200") // tribün ön hattı: zemin yarı genişliği (m)

/** Bir hat boyunca eşit aralıklı blok merkezleri (yanal koordinat). */
function evenCenters(count, blockWidth, span) {
  const gap = (span - count * blockWidth) / (count - 1);
  return Array.from({ length: count }, (_, i) => -span / 2 + blockWidth / 2 + i * (blockWidth + gap));
}

const SIDE_SEATS = 14; // Biletix planı: yan blokların ön sırası 1–14 (kaynaklı); Arkitera planında sıra başına 14 koltuk görünür
const sideCenters = evenCenters(5, SIDE_SEATS * SEAT, 41);
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
      { label: 'vwarena.com, Vikipedi, JamBase, Firsat.me, haberler.com (etkinlik türleri)', use: 'konser (oturmalı ≈4.500 / zemin ayakta ≈6.500), senfoni-film konseri, basketbol, ödül/moda gala, e-spor; ayrıntı docs/etkinlikler.md' },
      { label: 'Pozitif / vwarena.com galeri fotoğrafları, Eurohoops (2015)', use: 'yuvarlak köşeli kâse, siyah çit ve korkuluklar, sarı-siyah uyarı bantlı yeşil pota sehpası, LED reklam panoları, katlanır siyah koltuklar, sıcak parlak beton zemin (konser), asma LED küp' },
    ],
    assumptions: [
      'Salonun metrik ölçüleri, çatı yüksekliği ve tribün eğimleri resmî olarak yayımlanmamış; fotoğraf ve plan oranlarından tahmin edildi.',
      'Yan tribün 13 sıra (3 geri çekilebilir + 10 sabit) ve karşı uç 14 sıra (3 + 11): Arkitera kat planından sayıldı; sıra başı koltuk Biletix (14) ve Arkiv dökümüyle uyumlu.',
      'Basketbol düzeninde saha içi bloklar yok; sahne ucunda teleskopik ek tribün (3×11×17 ≈ 561, resmî ek tribün 562) ve — referans fotoğraflara göre — sahanın iki yanında geri çekilebilir ek tribün (tahmini) var.',
      'Resmî basketbol kapasitesi 5.240; bu modeldeki toplam daha düşük çıkar — gerçek basketbol oturma planı gelince güncellenecek.',
      'Zemin blokları plandaki A…U harf dizisi yerine 20 harflik tek dizi (A–U) ile etiketlendi.',
    ],
  },

  dims: {
    seatPitch: SEAT,
    eyeHeight: 1.18, // oturan kişinin göz yüksekliği, tribün basamağından (m)
  },

  hall: {
    // Ölçüler Arkitera mimari projesinden (plan + A-A/B-B kesitleri) okundu: zemin kotu +57,60, alt tribün tepesi +64,28,
    // loca zemini +68,50, çatı alt başlığı ≈ +73,0, çatı üstü +76,55. Plan ölçeği "3000 × 5200 / 2700 × 1800" ölçülerinden.
    floor: { halfWidth: FLOOR_HALF, zMin: -29, zMax: 22 },
    ring: {
      frontX: 22.6, // yan loca ön hattı (|x|); localar alt tribünün arka sıraları üzerine taşar
      endFrontZ: 29.7, // karşı uç loca ön hattı
      chamferStartZ: 24.1, // yan hattın bittiği, 45° köşe pahının başladığı z
      wingZ: -21.0, // yan hattın sahne ucundaki başlangıcı
      stageWallZ: -29.0,
      depth: 4.2, // loca derinliği
      corridor: 1.5, // loca arkası koridor
      floorY: 10.9, // loca zemini (+68,50 − 57,60)
      ceilingY: 14.0,
      locaWidth: 5.2,
      endLocaWidth: 5.7,
      sideLocas: 8,
      endLocas: 6,
      cornerSegments: 1, // plan: köşeler 45° pah (tek açılı loca)
    },
    // Çatı: 54–58 m açıklıklı, ≈3 m derin, neredeyse düz çelik makas (bombeli: kenar 18,4 → orta 19,0)
    roof: { springY: 18.4, apexY: 19.0, trussDepth: 3.0, halfSpan: 29.4, zMin: -29, zMax: 36.4, ribCount: 14 },
    estimated: false,
  },

  configurations: {
    concert: {
      label: 'Konser · oturmalı',
      short: 'Konser',
      kind: 'rock',
      lighting: 'concert',
      floorMat: 'floorConcert',
      focus: [0, 3.4, -23], // koltuktan bakılan nokta (sahne ortası)
      focusLabel: 'Sahne',
      focusDative: 'Sahneye',
      overview: { position: [0, 13.6, 26.5], target: [0, 2.5, -9] },
      stage: { width: 16, depth: 10, height: 1.5, z0: -28 }, // 160 m², 1,5 m (vwarena.com)
      locaNote: 'Localar 12 veya 16 kişilik; loca kapısından hızlı giriş, VIP giriş + vale, asansörle loca katı, Volkswagen Lounge hakkı. Satış etkinliğe göre değişir.',
      note: 'Tam oturmalı konser: zemin 2.160 + tribün (sabit 1.392 + premium 822 + geri çekilebilir 562) + loca 304 = 5.240 (Arkiv dökümü); resmî duyurularda 4.500–5.800.',
    },
    standing: {
      label: 'Konser · ayakta',
      short: 'Ayakta konser',
      kind: 'rock',
      lighting: 'concert',
      floorMat: 'floorConcert',
      focus: [0, 3.4, -23],
      focusLabel: 'Sahne',
      focusDative: 'Sahneye',
      overview: { position: [0, 13.6, 26.5], target: [0, 2.5, -9] },
      stage: { width: 16, depth: 10, height: 1.5, z0: -28 },
      crowd: true,
      locaNote: 'Zemin ayakta olsa da localar oturmalıdır (12/16 kişilik); loca satışı etkinliğe göre değişir.',
      note: 'Zemin ayakta (Golden Circle + saha içi), tribünler ve localar oturmalı. Resmî toplam ≈ 6.500 kişi; modeldeki noktalar kapasite değil bakış noktasıdır.',
    },
    symphony: {
      label: 'Senfoni · film konseri',
      short: 'Senfoni',
      kind: 'symphony',
      lighting: 'classical',
      floorMat: 'floorConcert',
      focus: [0, 3.2, -22],
      focusLabel: 'Orkestra',
      focusDative: 'Orkestraya',
      overview: { position: [0, 13.6, 26.5], target: [0, 2.5, -9] },
      stage: { width: 20, depth: 12, height: 1.2, z0: -28 },
      locaNote: 'Senfoni ve film konserlerinde localar oturmalı satılır (12/16 kişilik); catering istek üzerine.',
      note: 'Orkestra sahnesi + dev perde; tam oturmalı (ör. film konseri, senfoni gecesi).',
    },
    basketball: {
      label: 'Basketbol',
      short: 'Basketbol',
      kind: 'basketball',
      lighting: 'game',
      floorMat: 'floorGame',
      focus: [0, 1.4, 0], // saha ortası
      focusLabel: 'Saha',
      focusDative: 'Sahaya',
      overview: { position: [0, 13.2, 26.5], target: [0, 2, 0] },
      court: { length: 28, width: 15, centerZ: 0 }, // FIBA ölçüsü
      crowd: true,
      locaNote: 'Basketbolda localar sezonluk / maç bazlı kiralanır (12/16 kişilik); Darüşşafaka maçları için satış kulüp ve Pozitif üzerinden.',
      note: 'Saha ortada; saha içi bloklar yok. Yan ve uç ek tribünler, saha kenarı VIP (resmî 5.240).',
    },
    gala: {
      label: 'Gala · ödül · moda',
      short: 'Gala',
      kind: 'gala',
      lighting: 'gala',
      floorMat: 'floorGala',
      focus: [0, 2.4, -20],
      focusLabel: 'Podyum',
      focusDative: 'Podyuma',
      overview: { position: [0, 13.6, 26.5], target: [0, 2.5, -8] },
      stage: { width: 24, depth: 8, height: 1.0, z0: -28 },
      crowd: true,
      locaNote: 'Resmî sayfa: bazı özel yapılandırılmış etkinliklerde loca konukları biletle değil DAVETİYE ile alınır; gala/ödül/defilede loca genelde davetli konuklara ayrılır.',
      note: '24 yuvarlak masa (10 sandalye), merkez podyum (runway), dev LED perde; tribün ve localar açık.',
    },
    esports: {
      label: 'E-spor',
      short: 'E-spor',
      kind: 'esports',
      lighting: 'esports',
      floorMat: 'floorConcert',
      focus: [0, 3.2, -23],
      focusLabel: 'Sahne',
      focusDative: 'Sahneye',
      overview: { position: [0, 13.6, 26.5], target: [0, 2.5, -9] },
      stage: { width: 22, depth: 10, height: 1.2, z0: -28 },
      locaNote: 'E-spor finallerinde localar organizatör (yayıncı/turnuva) tarafından satılır ya da ağırlanır; kapasite 12/16 kişi.',
      note: 'Takım masaları sahnede, dev LED duvar ve asma ekranlar; zemin oturmalı (ör. VALORANT Champions).',
    },
    ice: {
      label: 'Buz gösterisi',
      short: 'Buz',
      kind: 'ice',
      lighting: 'ice',
      floorMat: 'floorIce',
      crowd: true,
      focus: [0, 0.6, -4],
      focusLabel: 'Buz pisti',
      focusDative: 'Buz pistine',
      overview: { position: [0, 13.6, 26.5], target: [0, 1.5, -4] },
      rink: { width: 22, length: 44, centerZ: -4 },
      note: 'Zemin buz pistine dönüşür (ör. "Ice Age Live", 2015); izleyici tribün ve localarda. Pist ölçüsü tahmini.',
      locaNote: 'Aile gösterilerinde localar genelde grup/kurumsal satılır (12/16 kişilik); satış etkinliğe göre değişir.',
    },
    conference: {
      label: 'Konferans · kurumsal',
      short: 'Konferans',
      kind: 'conference',
      lighting: 'conference',
      floorMat: 'floorConcert',
      focus: [0, 2.6, -23],
      focusLabel: 'Kürsü',
      focusDative: 'Kürsüye',
      overview: { position: [0, 10.5, 17.5], target: [0, 2.5, -14] },
      stage: { width: 20, depth: 8, height: 0.8, z0: -28 },
      note: 'Tiyatro düzeni (zemin blokları), mavi LED ekranlar; salon perdeyle küçültülür, tribünler kapalı (Arkitera: "perde ile salon küçültme").',
      locaNote: 'Kurumsal etkinliklerde localar konuk ağırlamak için kullanılır; yemek/içecek loca katında (Volkswagen Lounge) sunulur.',
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
    'ayakta-gc': { label: 'Golden Circle (ayakta)', color: '#ff5d8f' },
    ayakta: { label: 'Saha İçi Ayakta', color: '#ffb13d' },
    masa: { label: 'Masa (gala)', color: '#facc15' },
  },

  // Tribün = ortak geometriyi paylaşan blok grubu.
  //  kind: 'flat' (düz zemin) | 'rake' (eğimli, doğrusal) | 'fan' (köşe yelpazesi)
  //  origin/facing: 1. sıranın orta hattı ve koltukların baktığı yön (x,z)
  //  lateral: bloğun, bakan kişiye göre sağ ekseni (u = (−fz, fx)) boyunca merkez konumu
  tribunes: [
    {
      id: 'floor-front',
      kind: 'flat',
      configs: FLOOR_SEATED,
      group: 'Sahne Önü',
      origin: [0, -15.4],
      facing: [0, -1],
      rows: 20,
      rowPitch: 0.8,
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
      configs: FLOOR_SEATED,
      group: 'Saha İçi',
      origin: [0, 3.0],
      facing: [0, -1],
      rows: 20,
      rowPitch: 0.8,
      rowLabels: ROW_LETTERS,
      blocks: [
        { id: '004', name: 'Saha İçi 004', lateral: -10.3, seats: 18, category: 'saha-ici' },
        { id: '005', name: 'Saha İçi 005', lateral: 0, seats: 18, category: 'saha-ici' },
        { id: '006', name: 'Saha İçi 006', lateral: 10.3, seats: 18, category: 'saha-ici' },
      ],
    },
    {
      // Ayakta konser: sahne önü (Golden Circle) ve saha içi ayakta alan. Koltuk yok; yalnızca "ayakta bakış noktası"
      // (göz yüksekliği 1,68 m). Resmî: zemin ayakta + tribün oturmalı ≈ 6.500 kişi.
      id: 'standing-front',
      kind: 'flat',
      configs: ['standing'],
      group: 'Sahne Önü Ayakta',
      origin: [0, -15.6],
      facing: [0, -1],
      rows: 9,
      rowPitch: 0.9,
      seatPitch: 0.9,
      seatStyle: 'standing',
      blocks: [{ id: 'GC', name: 'Golden Circle (sahne önü ayakta)', lateral: 0, seats: 31, category: 'ayakta-gc' }],
    },
    {
      id: 'standing-back',
      kind: 'flat',
      configs: ['standing'],
      group: 'Saha İçi Ayakta',
      origin: [0, -7.0],
      facing: [0, -1],
      rows: 28,
      rowPitch: 0.9,
      seatPitch: 0.9,
      seatStyle: 'standing',
      blocks: [{ id: 'AY', name: 'Saha İçi Ayakta', lateral: 0, seats: 31, category: 'ayakta' }],
    },
    {
      // Gala / ödül / moda: 24 yuvarlak masa × 10 sandalye (Pozitif "Men of the Year" ve defile fotoğraflarına göre)
      id: 'gala-tables',
      kind: 'tables',
      configs: ['gala'],
      group: 'Masalar',
      category: 'masa',
      seatStyle: 'banquet',
      radius: 1.18,
      tables: Array.from({ length: 24 }, (_, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        return { id: `M${i + 1}`, name: `Masa ${i + 1}`, center: [-10.8 + col * 7.2, -9.4 + row * 5.0], seats: 10 };
      }),
    },
    {
      id: 'side-left',
      kind: 'rake',
      configs: ALL,
      group: 'Yan Tribün (sol)',
      origin: [-15.6, 0],
      facing: [1, 0],
      rows: 13, // Arkitera planı: 3 geri çekilebilir ön sıra + 10 sabit sıra
      rowPitch: 0.87,
      lowRows: 3,
      lowRise: 0.15,
      rise: 0.6, // kesit: sabit tribün dik (≈ 31°), tepe +64,28
      baseY: BASE,
      span: [-21.5, 21.5],
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
      configs: ALL,
      group: 'Yan Tribün (sağ)',
      origin: [15.6, 0],
      facing: [-1, 0],
      rows: 13, // Arkitera planı: 3 geri çekilebilir ön sıra + 10 sabit sıra
      rowPitch: 0.87,
      lowRows: 3,
      lowRise: 0.15,
      rise: 0.6, // kesit: sabit tribün dik (≈ 31°), tepe +64,28
      baseY: BASE,
      span: [-21.5, 21.5],
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
      configs: ALL,
      group: 'Yan Tribün (sol)',
      origin: [-15.6, -23.4],
      facing: [1, 0],
      rows: 2,
      rowPitch: 0.87,
      lowRows: 3,
      lowRise: 0.15,
      rise: 0.6,
      baseY: BASE,
      span: [-1.6, 1.6],
      blocks: [{ id: '201', name: 'Tribün 201', lateral: 0, seats: 5, category: 'tribun' }],
    },
    {
      id: 'stage-corner-right',
      kind: 'rake',
      configs: ALL,
      group: 'Yan Tribün (sağ)',
      origin: [15.6, -23.4],
      facing: [-1, 0],
      rows: 2,
      rowPitch: 0.87,
      lowRows: 3,
      lowRise: 0.15,
      rise: 0.6,
      baseY: BASE,
      span: [-1.6, 1.6],
      blocks: [{ id: '217', name: 'Tribün 217', lateral: 0, seats: 5, category: 'tribun' }],
    },
    {
      id: 'end',
      kind: 'rake',
      configs: ALL,
      group: 'Karşı Tribün',
      origin: [0, 22.4],
      facing: [0, -1],
      rows: 14, // Arkitera planı: 3 geri çekilebilir + 11 sabit sıra
      rowPitch: 0.85,
      lowRows: 3,
      lowRise: 0.15,
      rise: 0.4,
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
      configs: ALL,
      group: 'Karşı Tribün',
      center: [-FLOOR_HALF, 21.9],
      angles: [98, 172], // derece, (x,z) düzleminde +x'ten +z'ye
      r0: 1.4,
      rows: 9,
      rowPitch: 0.85,
      lowRows: 3,
      lowRise: 0.15,
      rise: 0.4,
      baseY: BASE,
      blocks: [{ id: '207', name: 'Tribün 207', category: 'tribun-karsi' }],
    },
    {
      id: 'fan-right',
      kind: 'fan',
      configs: ALL,
      group: 'Karşı Tribün',
      center: [FLOOR_HALF, 21.9],
      angles: [8, 82],
      r0: 1.4,
      rows: 9,
      rowPitch: 0.85,
      lowRows: 3,
      lowRise: 0.15,
      rise: 0.4,
      baseY: BASE,
      blocks: [{ id: '211', name: 'Tribün 211', category: 'tribun-karsi' }],
    },
    {
      // Basketbol: sahne ucunda teleskopik ek tribün (resmî: 562 koltuk ≈ 3×11×17 = 561)
      id: 'telescopic',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Ek Tribün (Basketbol)',
      origin: [0, -17.6],
      facing: [0, 1],
      rows: 5,
      rowPitch: 0.85,
      rise: 0.3,
      baseY: 0.3,
      span: [-14.4, 14.4],
      blocks: [
        { id: 'T1', name: 'Ek Tribün T1', lateral: -9.6, seats: 14, category: 'ek-tribun' },
        { id: 'T2', name: 'Ek Tribün T2', lateral: 0, seats: 14, category: 'ek-tribun' },
        { id: 'T3', name: 'Ek Tribün T3', lateral: 9.6, seats: 14, category: 'ek-tribun' },
      ],
    },
    {
      // Karşı uç: iki pota arkasında da seyirci olsun diye simetrik ek tribün
      id: 'telescopic-end',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Ek Tribün (Basketbol)',
      origin: [0, 17.6],
      facing: [0, -1],
      rows: 5,
      rowPitch: 0.85,
      rise: 0.3,
      baseY: 0.3,
      span: [-14.4, 14.4],
      blocks: [
        { id: 'T4', name: 'Ek Tribün T4', lateral: -9.6, seats: 14, category: 'ek-tribun' },
        { id: 'T5', name: 'Ek Tribün T5', lateral: 0, seats: 14, category: 'ek-tribun' },
        { id: 'T6', name: 'Ek Tribün T6', lateral: 9.6, seats: 14, category: 'ek-tribun' },
      ],
    },
    {
      // Basketbol: yan kenarlarda sahaya yakın geri çekilebilir (teleskopik) tribün.
      // Referans fotoğraflarda (Euroleague maçı) yan tribünler sahanın hemen kenarında başlıyor; tahmini yerleşim.
      id: 'telescopic-left',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Ek Tribün (Basketbol)',
      origin: [-12.0, 0],
      facing: [1, 0],
      rows: 2,
      rowPitch: 0.85,
      rise: 0.15,
      baseY: 0.15,
      span: [-13.6, 13.6],
      blocks: [
        { id: 'S1', name: 'Yan Ek Tribün S1', lateral: -10.2, seats: 9, category: 'ek-tribun' },
        { id: 'S2', name: 'Yan Ek Tribün S2', lateral: -3.4, seats: 9, category: 'ek-tribun' },
        { id: 'S3', name: 'Yan Ek Tribün S3', lateral: 3.4, seats: 9, category: 'ek-tribun' },
        { id: 'S4', name: 'Yan Ek Tribün S4', lateral: 10.2, seats: 9, category: 'ek-tribun' },
      ],
    },
    {
      id: 'telescopic-right',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Ek Tribün (Basketbol)',
      origin: [12.0, 0],
      facing: [-1, 0],
      rows: 2,
      rowPitch: 0.85,
      rise: 0.15,
      baseY: 0.15,
      span: [-13.6, 13.6],
      blocks: [
        { id: 'S5', name: 'Yan Ek Tribün S5', lateral: -10.2, seats: 9, category: 'ek-tribun' },
        { id: 'S6', name: 'Yan Ek Tribün S6', lateral: -3.4, seats: 9, category: 'ek-tribun' },
        { id: 'S7', name: 'Yan Ek Tribün S7', lateral: 3.4, seats: 9, category: 'ek-tribun' },
        { id: 'S8', name: 'Yan Ek Tribün S8', lateral: 10.2, seats: 9, category: 'ek-tribun' },
      ],
    },
    {
      // Basketbol: 88 saha kenarı VIP koltuk (Yazgan Design) — iki kenarda 44'er
      id: 'courtside-right',
      kind: 'flat',
      configs: ['basketball'],
      group: 'Saha Kenarı VIP',
      origin: [10.9, 0],
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
      origin: [-10.2, 0],
      facing: [1, 0],
      rows: 1,
      rowPitch: 1,
      seatStyle: 'vip',
      blocks: [{ id: 'VIP-B', name: 'Saha Kenarı VIP B', lateral: 0, seats: 44, category: 'vip' }],
    },
  ],

  // 24 loca (Biletix: LOCA 1–8 sol üstten aşağı, 9 sol köşe, 10–15 karşı uç, 16 sağ köşe, 17–24 sağ alttan yukarı).
  // Her loca planda iki karo → 2 sıra × 5 koltuk = 10 koltuk (Vikipedi: 24 loca / 240 koltuk).
  // 24 loca. Resmî loca kiralama sayfası: "12 ya da 16 kişilik"; Arkiv: 304 skybox koltuğu = 20 × 12 + 4 × 16.
  // 16 kişilik 4 locanın hangileri olduğu belli değil: karşı uçtaki (daha geniş) orta dört loca varsayıldı.
  // Plan (+68,50 kotu): her loca iki sıra koltuk (ön sıra alçak, arka sıra bir basamak yüksekte) + arkada ayakta/bar alanı.
  locas: {
    rows: 2,
    seatsPerRow: 6,
    bigSeatsPerRow: 8,
    bigLocas: [11, 12, 13, 14],
    rowDepth: [0.95, 1.9],
    rowRise: 0.32,
    category: 'loca',
  },

};
