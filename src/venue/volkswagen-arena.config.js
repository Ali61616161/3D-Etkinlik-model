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
// Arkitera kat planında yan tribünlerin arka sıralarını kesen merdiven boşlukları (sahneye en yakın bloklar):
// 202 ve 216'da son iki sırada 3'er koltuk yok → toplam 12 koltuk. Böylece tam oturmalı toplam = 5.240 (Arkiv dökümü).
const VOMITORY = { 202: { 11: 11, 12: 11 }, 216: { 11: 11, 12: 11 } };
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
      cornerLocaWidth: 6.6, // köşe locaları pah boyunca daha uzun (plan)
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
      stage: { width: 18, depth: 8.9, height: 1.5, z0: -28 }, // vwarena.com: 160 m², 1,5 m; Arkitera planı sahne eni 18 m → derinlik 160/18 ≈ 8,9 m
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
      stage: { width: 18, depth: 8.9, height: 1.5, z0: -28 },
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
      focus: [0, 1.4, -3.5], // saha ortası (sahne kalkınca saha zeminin ortasında)
      focusLabel: 'Saha',
      focusDative: 'Sahaya',
      overview: { position: [0, 13.2, 23], target: [0, 2, -3.5] },
      court: { length: 28, width: 15, centerZ: -3.5 }, // FIBA 28×15; zemin 30×50 m'nin (Arkitera planı) ortası
      crowd: true,
      locaNote: 'Basketbolda localar sezonluk / maç bazlı kiralanır (12/16 kişilik); Darüşşafaka maçları için satış kulüp ve Pozitif üzerinden.',
      note: 'Toplam 5.240 (resmî; EuroCup finali 13.04.2018 seyirci sayısı 5.240): sabit + premium + geri çekilebilir tribün ve 24 loca (3.080) + zemin 2.160 (saha çevresinde 1xx blokları ve 2 sıra saha içi VIP, 88).',
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
    'ek-tribun': { label: 'Zemin Tribünü (basketbol)', color: '#a3e635' },
    vip: { label: 'Saha İçi VIP', color: '#f87171' },
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
        rowSeats: VOMITORY[id],
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
        rowSeats: VOMITORY[id],
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
      rows: 10,
      rowPitch: 0.85,
      lowRows: 3,
      lowRise: 0.15,
      rise: 0.4,
      baseY: BASE,
      blocks: [{ id: '207', name: 'Tribün 207', seats: { near: 4, far: 18 }, category: 'tribun-karsi' }], // Biletix: ön 1–4, arka 1–18
    },
    {
      id: 'fan-right',
      kind: 'fan',
      configs: ALL,
      group: 'Karşı Tribün',
      center: [FLOOR_HALF, 21.9],
      angles: [8, 82],
      r0: 1.4,
      rows: 10,
      rowPitch: 0.85,
      lowRows: 3,
      lowRise: 0.15,
      rise: 0.4,
      baseY: BASE,
      blocks: [{ id: '211', name: 'Tribün 211', seats: { near: 4, far: 18 }, category: 'tribun-karsi' }],
    },
    // ── Basketbol zemin düzeni (toplam 2.160 = 88 saha içi VIP + 2.072 zemin tribünü) ──────────────────────────
    // Kaynak: Arkiv dökümünde "zemin oturmalı 2.160" kalemi resmî basketbol toplamı 5.240'ın içinde; Darüşşafaka kombine
    // duyurusu (Mobilet) basketbolda 103, 104 ve 109 numaralı zemin bloklarını kullanıyor; Darüşşafaka biletlerinde
    // "Saha İçi 1. Sıra / 2. Sıra" kategorileri var. Blokların sahaya göre yerleşimi zemin ölçüsünden (30×50 m) türetildi.
    {
      id: 'bb-vip',
      kind: 'flat',
      configs: ['basketball'],
      group: 'Saha İçi (VIP)',
      origin: [-9.7, -3.5],
      facing: [1, 0],
      rows: 2,
      rowPitch: 0.8,
      seatStyle: 'vip',
      rowLabels: '12',
      blocks: [{ id: 'VIP', name: 'Saha İçi VIP', lateral: 0, seats: 44, category: 'vip' }],
    },
    {
      id: 'bb-left',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Zemin Tribünü (Basketbol)',
      origin: [-11.4, -3.5],
      facing: [1, 0],
      rows: 5,
      rowPitch: 0.8,
      rise: 0.25,
      baseY: 0.25,
      span: [-17.6, 17.6],
      blocks: [
        { id: '112', name: 'Blok 112', lateral: -8.5, seats: 36, category: 'ek-tribun' },
        { id: '113', name: 'Blok 113', lateral: 8.5, seats: 36, category: 'ek-tribun' },
      ],
    },
    {
      id: 'bb-right',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Zemin Tribünü (Basketbol)',
      origin: [10.8, -3.5],
      facing: [-1, 0],
      rows: 6,
      rowPitch: 0.8,
      rise: 0.25,
      baseY: 0.25,
      span: [-17.6, 17.6],
      blocks: [
        { id: '106', name: 'Blok 106', lateral: -8.5, seats: 36, category: 'ek-tribun' },
        { id: '107', name: 'Blok 107', lateral: 8.5, seats: 36, category: 'ek-tribun' },
      ],
    },
    {
      id: 'bb-far',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Zemin Tribünü (Basketbol)',
      origin: [0, 14.2],
      facing: [0, -1],
      rows: 8,
      rowPitch: 0.8,
      rise: 0.3,
      baseY: 0.3,
      span: [-14.8, 14.8],
      blocks: [
        { id: '109', name: 'Blok 109', lateral: -10, seats: 20, category: 'ek-tribun' },
        { id: '110', name: 'Blok 110', lateral: 0, seats: 20, category: 'ek-tribun' },
        { id: '111', name: 'Blok 111', lateral: 10, seats: 20, category: 'ek-tribun' },
      ],
    },
    {
      id: 'bb-stage-low',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Zemin Tribünü (Basketbol)',
      origin: [0, -21.2],
      facing: [0, 1],
      rows: 5,
      rowPitch: 0.8,
      rise: 0.3,
      baseY: 0.3,
      span: [-14.8, 14.8],
      blocks: [
        { id: '103', name: 'Blok 103', lateral: -10, seats: 20, category: 'ek-tribun' },
        { id: '104', name: 'Blok 104', lateral: 0, seats: 20, category: 'ek-tribun' },
        { id: '105', name: 'Blok 105', lateral: 10, seats: 20, category: 'ek-tribun' },
      ],
    },
    {
      // sahne kalkınca boşalan sahne bölgesi (27 m genişlik + kanatlar): geniş üst tribün
      id: 'bb-stage-high',
      kind: 'rake',
      configs: ['basketball'],
      group: 'Zemin Tribünü (Basketbol)',
      origin: [0, -25.2],
      facing: [0, 1],
      rows: 5,
      rowPitch: 0.8,
      rise: 0.3,
      baseY: 1.8,
      span: [-24.2, 24.2],
      blocks: [
        { id: '101', name: 'Blok 101', lateral: -18, seats: 25, category: 'ek-tribun' },
        { id: '102', name: 'Blok 102', lateral: -6, seats: 25, category: 'ek-tribun' },
        { id: '114', name: 'Blok 114', lateral: 6, seats: 25, category: 'ek-tribun' },
        { id: '115', name: 'Blok 115', lateral: 18, seats: 25, category: 'ek-tribun' },
      ],
    },
  ],

  // 24 loca (Biletix: LOCA 1–8 sol üstten aşağı, 9 sol köşe, 10–15 karşı uç, 16 sağ köşe, 17–24 sağ alttan yukarı).
  // Her loca planda iki karo → 2 sıra × 5 koltuk = 10 koltuk (Vikipedi: 24 loca / 240 koltuk).
  // 24 loca. Resmî loca kiralama sayfası: "12 ya da 16 kişilik"; Arkiv: 304 skybox koltuğu = 20 × 12 + 4 × 16.
  // Plan (+68,50 kotu): her loca iki sıra koltuk (ön sıra alçak, arka sıra bir basamak yüksekte) + arkada ayakta/bar alanı.
  locas: {
    rows: 2,
    seatsPerRow: 6,
    bigSeatsPerRow: 8,
    bigLocas: [9, 10, 15, 16], // Arkitera +68,50 planı: köşe locaları (9, 16) ve uç sıranın iki dış locası (10, 15) 2 × (4 + 4); diğerleri 2 × (3 + 3)
    aisle: 0.9, // her sıra ortadan merdivenle ikiye bölünür
    rowDepth: [0.95, 1.9],
    rowRise: 0.32,
    category: 'loca',
  },

};
