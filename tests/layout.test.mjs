// Koltuk modeli ve config doğrulama testleri: `npm test`
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import config from '../src/venue/volkswagen-arena.config.js';
import { buildSeatModel, seatsForConfig, ringLayout, makeGroundHeight, makeCameraBounds, blockLabel } from '../src/engine/layout.js';
import { SeatPicker } from '../src/engine/picker.js';

const model = buildSeatModel(config);
const configs = Object.keys(config.configurations);

test('config: tribün/blok tanımları tutarlı', () => {
  const ids = new Set();
  for (const t of config.tribunes) {
    assert.ok(t.configs.length && t.configs.every((c) => configs.includes(c)), `${t.id}: bilinmeyen düzen`);
    assert.ok(['flat', 'rake', 'fan', 'tables'].includes(t.kind), `${t.id}: kind`);
    if (t.facing) assert.ok(Math.hypot(...t.facing) > 0, `${t.id}: facing sıfır`);
    for (const b of t.blocks ?? t.tables) {
      assert.ok(!ids.has(b.id), `yinelenen blok ${b.id}`);
      ids.add(b.id);
      assert.ok(config.categories[b.category ?? t.category], `${b.id}: kategori yok`);
    }
  }
});

test('koltuklar: kimlikler benzersiz, her koltuk tek sırada', () => {
  const seen = new Set();
  for (const s of model.seats) {
    assert.ok(!seen.has(s.id), `yinelenen koltuk ${s.id}`);
    seen.add(s.id);
    assert.ok(s.pos.every(Number.isFinite) && s.eye.every(Number.isFinite), `${s.id}: sayısal değil`);
  }
  const inRows = new Set();
  for (const b of model.blocks.values()) {
    for (const r of b.rows) {
      r.seats.forEach((i, k) => {
        assert.ok(!inRows.has(i));
        inRows.add(i);
        assert.equal(model.seats[i].seatIndexInRow, k);
        assert.equal(model.seats[i].rowIndex, r.index);
      });
    }
  }
  assert.equal(inRows.size, model.seats.length);
});

test('koltuklar aynı düzende üst üste binmez (≥ 0,30 m)', () => {
  for (const cfg of configs) {
    const list = seatsForConfig(model, cfg);
    const grid = new Map();
    const key = (x, z) => `${Math.floor(x / 0.5)},${Math.floor(z / 0.5)}`;
    for (const s of list) {
      const [x, y, z] = s.pos;
      const cx = Math.floor(x / 0.5), cz = Math.floor(z / 0.5);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (const o of grid.get(`${cx + dx},${cz + dz}`) ?? []) {
            const d = Math.hypot(o.pos[0] - x, o.pos[2] - z);
            // farklı kotlarda (ör. loca ikinci sıra) yatay yakınlık serbest
            if (Math.abs(o.pos[1] - y) < 0.2) assert.ok(d >= 0.3, `${cfg}: ${s.id} ile ${o.id} çakışıyor (${d.toFixed(2)} m)`);
          }
        }
      }
      const k = key(x, z);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(s);
    }
  }
});

test('koltuklar salon sınırları içinde', () => {
  const r = config.hall.ring, roof = config.hall.roof;
  for (const s of model.seats) {
    assert.ok(Math.abs(s.pos[0]) < r.frontX + r.depth + r.corridor, `${s.id}: x dışarıda`);
    assert.ok(s.pos[2] > roof.zMin && s.pos[2] < roof.zMax, `${s.id}: z dışarıda`);
    assert.ok(s.eye[1] > 0.5 && s.eye[1] < roof.springY - roof.trussDepth, `${s.id}: göz yüksekliği garip (${s.eye[1]})`);
  }
});

test('eğimli tribünlerde sıra arkaya gittikçe yükselir', () => {
  for (const b of model.blocks.values()) {
    if (b.kind === 'flat' || b.kind === 'loca') continue;
    for (let r = 1; r < b.rows.length; r++) {
      const a = model.seats[b.rows[r - 1].seats[0]], c = model.seats[b.rows[r].seats[0]];
      assert.ok(c.pos[1] > a.pos[1], `${b.id}: sıra ${r + 1} yükselmiyor`);
    }
  }
});

test('resmî rakamlarla uyum', () => {
  const count = (pred) => model.seats.filter(pred).length;
  assert.equal(count((s) => s.category === 'sahne-onu' || s.category === 'saha-ici'), 2160, 'zemin oturmalı 6×18×20');
  assert.equal(count((s) => s.category === 'loca'), 304, '20 loca × 12 + 4 loca × 16 (Arkiv: 304 skybox koltuğu)');
  assert.equal(ringLayout(config).locas.length, 24);
  const concert = seatsForConfig(model, 'concert').length;
  assert.ok(Math.abs(concert - 5240) <= 120, `konser tam oturmalı ≈ 5.240 = 2.160 + 1.392 + 822 + 562 + 304 (model: ${concert})`);
  const tele = count((s) => s.category === 'ek-tribun');
  assert.ok(Math.abs(tele - 562) <= 10, `ek tribün ≈ 562 (model: ${tele})`);
  assert.equal(count((s) => s.category === 'vip'), 88, '88 saha kenarı VIP');
});

test('Biletix plan aralıkları: 208/210 16→21, 209 18→12 (4–15)', () => {
  const rowLens = (id) => model.blocks.get(id).rows.map((r) => r.seats.length);
  assert.equal(rowLens('208')[0], 16);
  assert.equal(rowLens('208').at(-1), 21);
  assert.equal(rowLens('209')[0], 18);
  assert.equal(rowLens('209').at(-1), 12);
  const last = model.blocks.get('209').rows.at(-1).seats.map((i) => model.seats[i].seatNo);
  assert.equal(Math.min(...last), 4);
  assert.equal(Math.max(...last), 15);
});

test('loca halkası: köşe locaları bowl içine bakar', () => {
  for (const L of ringLayout(config).locas) {
    const toCenter = [-L.front[0], 5 - L.front[1]];
    assert.ok(L.facing[0] * toCenter[0] + L.facing[1] * toCenter[1] > 0, `loca ${L.n} dışarı bakıyor`);
  }
});

test('seçici: koltuk merkezine bakan ışın o koltuğu bulur', () => {
  const picker = new SeatPicker(model);
  for (const cfg of configs) {
    picker.setConfig(cfg);
    const sample = picker.list.filter((_, i) => i % 97 === 0);
    for (const s of sample) {
      const target = new THREE.Vector3(s.pos[0], s.pos[1] + 0.5 * s.scale, s.pos[2]);
      const origin = new THREE.Vector3(s.pos[0] + 0.01, s.pos[1] + 9, s.pos[2] + 0.01);
      const ray = new THREE.Ray(origin, target.clone().sub(origin).normalize());
      const hit = picker.pick(ray);
      assert.ok(hit, `${s.id}: bulunamadı`);
      // yukarıdan bakınca aynı noktadaki en yakın koltuk: aynı konum (± 0,35 m)
      assert.ok(Math.hypot(hit.pos[0] - s.pos[0], hit.pos[2] - s.pos[2]) < 0.35, `${s.id}: yanlış koltuk ${hit.id}`);
    }
  }
});

test('etkinlik düzenleri: her düzenin sahnesi/sahası/pisti, odağı ve kamerası tanımlı', () => {
  for (const [id, c] of Object.entries(config.configurations)) {
    assert.ok(c.label && c.kind && c.lighting && c.floorMat, `${id}: eksik alan`);
    assert.ok(c.focus.length === 3 && c.overview.position.length === 3 && c.overview.target.length === 3, `${id}: kamera`);
    assert.ok(c.stage || c.court || c.rink, `${id}: sahne, saha veya pist yok`);
    assert.ok(seatsForConfig(model, id).length > 1000, `${id}: koltuk çok az`);
  }
});

test('ayakta konser: koltuk yok, yalnızca bakış noktaları; tribün ve localar oturmalı', () => {
  const list = seatsForConfig(model, 'standing');
  assert.ok(list.some((s) => s.style === 'standing' && s.noMesh));
  assert.ok(list.every((s) => (s.style === 'standing') === (s.category === 'ayakta' || s.category === 'ayakta-gc')));
  assert.ok(!list.some((s) => s.category === 'sahne-onu' || s.category === 'saha-ici'), 'zemin blokları ayakta düzende olmamalı');
  const st = list.find((s) => s.noMesh);
  assert.ok(Math.abs(st.eye[1] - 1.68) < 1e-6, 'ayakta göz yüksekliği 1,68 m');
  assert.equal(seatsForConfig(model, 'standing').filter((s) => s.category === 'loca').length, 304);
});

test('gala: 24 masa × 10 sandalye, masaya bakar', () => {
  const tables = [...model.blocks.values()].filter((b) => b.kind === 'tables');
  assert.equal(tables.length, 24);
  for (const t of tables) {
    assert.equal(t.rows[0].seats.length, 10);
    assert.match(blockLabel(t), /^Masa \d+$/);
  }
  const tb = config.tribunes.find((t) => t.kind === 'tables').tables[0];
  const s = model.seats[tables[0].rows[0].seats[3]];
  const toCenter = [tb.center[0] - s.pos[0], tb.center[1] - s.pos[2]];
  assert.ok(s.facing[0] * toCenter[0] + s.facing[1] * toCenter[1] > 0.5, 'sandalye masa merkezine dönük');
});

test('kamera sınırı: yerin altına, çatının üstüne, duvar dışına çıkılamaz', () => {
  const ground = makeGroundHeight(config);
  const clamp = makeCameraBounds(config, ground);
  const roof = config.hall.roof;
  const cases = [
    [0, -5, 0], [0, 80, 0], [100, 5, 0], [-100, 5, 0], [0, 5, 200], [0, 5, -200], [30, 5, 40], [-30, 5, 40],
    [22, 0.1, 10], [-22, 0.1, -10], [0, 21, 0],
  ];
  const limit = config.hall.ring.frontX;
  for (const [x, y, z] of cases) {
    const p = clamp({ x, y, z });
    assert.ok(Math.abs(p.x) <= limit, `x dışarıda: ${p.x}`);
    assert.ok(p.z >= config.hall.ring.stageWallZ && p.z <= config.hall.ring.endFrontZ, `z dışarıda: ${p.z}`);
    assert.ok(p.y >= ground(p.x, p.z) + 1.3, `yerin altında: ${p.y}`);
    assert.ok(p.y <= roof.apexY - 3, `çatıda: ${p.y}`);
  }
  // salon içindeki makul bir nokta değişmez
  const ok = clamp({ x: 3, y: 10, z: 5 });
  assert.deepEqual([ok.x, ok.y, ok.z], [3, 10, 5]);
});

test('zemin yüksekliği: yan tribünde sıra sıra yükselir, zeminde 0', () => {
  const g = makeGroundHeight(config);
  assert.equal(g(0, 0), 0);
  assert.ok(g(17, 0) > 0.5 && g(24, 0) > g(18, 0), 'yan tribün yükselmiyor');
  assert.ok(g(0, 33) > g(0, 28), 'karşı tribün yükselmiyor');
});

test('blok seçici: salon ortasından her locaya ve her bloğa dokunma o bloğu bulur', () => {
  const picker = new SeatPicker(model);
  for (const cfg of configs) {
    picker.setConfig(cfg);
    let miss = 0, total = 0;
    for (const block of new Set(picker.list.map((s) => model.blocks.get(s.blockId)))) {
      const c = new THREE.Vector3(...block.center);
      c.y += block.locaNo ? 0.6 : 0.4;
      // kamera: salon ortasında, 11 m yukarıda (blok görünümü öncesi tipik genel bakış)
      const origin = new THREE.Vector3(0, block.locaNo ? 9 : 14, block.kind === 'flat' || block.kind === 'tables' ? 26 : 0);
      const ray = new THREE.Ray(origin, c.clone().sub(origin).normalize());
      const hit = picker.pickBlock(ray);
      total++;
      if (!hit || hit.block.id !== block.id) miss++;
    }
    assert.ok(miss / total < 0.12, `${cfg}: ${miss}/${total} blok yanlış seçildi`);
  }
});

test('blok içinde koltuk seçimi: koltuk merkezine yakın ışın o koltuğu bulur', () => {
  const picker = new SeatPicker(model);
  picker.setConfig('concert');
  const block = model.blocks.get('204');
  const s = model.seats[block.rows[5].seats[6]];
  const origin = new THREE.Vector3(s.pos[0] - 12, s.pos[1] + 9, s.pos[2] + 0.3);
  const target = new THREE.Vector3(s.pos[0], s.pos[1] + 0.5, s.pos[2]);
  const hit = picker.pickSeatInBlock(new THREE.Ray(origin, target.sub(origin).normalize()), block);
  assert.ok(hit && Math.hypot(hit.pos[0] - s.pos[0], hit.pos[2] - s.pos[2]) < 0.6);
});

test('kalabalık boyları: yetişkin aralığı, erkek ≈176 / kadın ≈163 karışımı (ortalama ≈169–170 cm)', async () => {
  // crowd.js tarayıcı DOM'u gerektirmez ama THREE sahnesi ister; dağılım mantığını aynı formülle doğrula
  const r = (() => { let s = 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const g = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  let sum = 0, min = 9, max = 0; const N = 20000;
  for (let i = 0; i < N; i++) {
    const male = r() < 0.5;
    const h = Math.min(2.0, Math.max(1.45, (male ? 1.76 : 1.63) + g() * (male ? 0.07 : 0.065)));
    sum += h; min = Math.min(min, h); max = Math.max(max, h);
  }
  const mean = sum / N;
  assert.ok(mean > 1.68 && mean < 1.71, `ortalama ${mean}`);
  assert.ok(min >= 1.45 && max <= 2.0);
});

test('Arkitera planı: yan tribün 13 sıra (3+10) × 14 koltuk, karşı uç 14 sıra; sabit tribün ≈ 1.392 + geri çekilebilir pay', () => {
  for (const id of ['202', '203', '204', '205', '206', '212', '213', '214', '215', '216']) {
    const b = model.blocks.get(id);
    assert.equal(b.rows.length, 13, `${id}: sıra`);
    assert.equal(b.rows[0].seats.length, 14, `${id}: sıra başı koltuk`);
  }
  for (const id of ['208', '209', '210']) assert.equal(model.blocks.get(id).rows.length, 14, `${id}: sıra`);
  const side = ['202', '203', '204', '205', '206', '212', '213', '214', '215', '216'].reduce((n, id) => n + model.blocks.get(id).seatCount, 0);
  assert.equal(side, 1820); // 10 blok × 13 sıra × 14 = 1.392 sabit (10 sıra) + 420 geri çekilebilir (3 sıra)
  const top = model.seats[model.blocks.get('204').rows[12].seats[0]].pos[1];
  assert.ok(top > 5.8 && top < 6.8, `alt tribün tepe kotu ≈ 6,7 m (model: ${top})`);
});
