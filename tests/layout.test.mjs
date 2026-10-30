// Koltuk modeli ve config doğrulama testleri: `npm test`
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import config from '../src/venue/volkswagen-arena.config.js';
import { buildSeatModel, seatsForConfig, ringLayout } from '../src/engine/layout.js';
import { SeatPicker } from '../src/engine/picker.js';

const model = buildSeatModel(config);
const configs = Object.keys(config.configurations);

test('config: tribün/blok tanımları tutarlı', () => {
  const ids = new Set();
  for (const t of config.tribunes) {
    assert.ok(t.configs.length && t.configs.every((c) => configs.includes(c)), `${t.id}: bilinmeyen düzen`);
    assert.ok(['flat', 'rake', 'fan'].includes(t.kind), `${t.id}: kind`);
    if (t.facing) assert.ok(Math.hypot(...t.facing) > 0, `${t.id}: facing sıfır`);
    for (const b of t.blocks) {
      assert.ok(!ids.has(b.id), `yinelenen blok ${b.id}`);
      ids.add(b.id);
      assert.ok(config.categories[b.category], `${b.id}: kategori yok (${b.category})`);
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
    assert.ok(Math.abs(s.pos[0]) < r.frontX + r.depth, `${s.id}: x dışarıda`);
    assert.ok(s.pos[2] > roof.zMin && s.pos[2] < roof.zMax, `${s.id}: z dışarıda`);
    assert.ok(s.eye[1] > 0.5 && s.eye[1] < roof.springY, `${s.id}: göz yüksekliği garip (${s.eye[1]})`);
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
  assert.equal(count((s) => s.category === 'loca'), 240, '24 loca × 10');
  assert.equal(ringLayout(config).locas.length, 24);
  const concert = seatsForConfig(model, 'concert').length;
  assert.ok(concert > 4500 && concert < 5300, `konser tam oturmalı ≈ 5.000 (model: ${concert})`);
  const tele = count((s) => s.blockId.startsWith('T'));
  assert.ok(Math.abs(tele - 562) <= 5, `ek tribün ≈ 562 (model: ${tele})`);
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
