import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch } from '../batch.js';
import { labelMesh } from './labels.js';
import { rowHeight } from '../layout.js';

const DEG = Math.PI / 180;
const norm = (v) => {
  const l = Math.hypot(v[0], v[1]);
  return [v[0] / l, v[1] / l];
};

/**
 * Tribün basamakları, koridor (merdiven) detayları, korkuluklar ve ön camlar.
 * Çıktı: ctx.groups.{shared,concert,basketball}'e eklenen birleşik mesh'ler.
 */
export function buildBowl(ctx) {
  const { config, mats } = ctx;
  // Tribünler etkinlik kümesine göre gruplanır (aynı düzen kümesinde görünenler tek mesh'te birleşir)
  const lazy = (make) => new Proxy({}, { get: (o, k) => (k in o ? o[k] : (o[k] = make())) });
  const batches = lazy(() => new Batch());
  const plaques = lazy(() => []);
  const fences = lazy(() => []);
  const keyConfigs = {};
  const keyOf = (t) => {
    const k = [...t.configs].sort().join('+');
    keyConfigs[k] = t.configs;
    return k;
  };
  const pitchSeat = config.dims.seatPitch;

  for (const t of config.tribunes) {
    const b = batches[keyOf(t)];
    if (t.kind === 'fan') {
      buildFan(t, b);
      continue;
    }
    if (t.kind !== 'rake') continue;
    const f = norm(t.facing);
    const u = [-f[1], f[0]];
    const ry = Math.atan2(f[0], f[1]);
    const { rows, rowPitch, rise = 0, baseY = 0, origin, span } = t;
    const w = span[1] - span[0];
    const cL = (span[0] + span[1]) / 2;
    const at = (lat, depth) => [origin[0] + u[0] * lat - f[0] * depth, origin[1] + u[1] * lat - f[1] * depth];

    // Basamaklar
    for (let r = 0; r < rows; r++) {
      const top = rowHeight(t, r);
      const [cx, cz] = at(cL, r * rowPitch);
      b.box('tread', w, top, rowPitch + 0.004, cx, top / 2, cz, ry);
    }

    // Ön bariyer: siyah metal çit (referans fotoğraflardaki gibi) + üst küpeşte
    {
      const [cx, cz] = at(cL, -rowPitch / 2 + 0.02);
      const g = new THREE.PlaneGeometry(w, 0.95);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * w);
      g.rotateY(ry);
      g.translate(cx, baseY + 0.475, cz);
      fences[keyOf(t)].push(g);
      b.box('black', w, 0.05, 0.07, cx, baseY + 0.96, cz, ry);
    }

    // Koridorlar (bloklar arası boşluk): basamak burunları + küpeşteler
    const blocks = [...t.blocks].sort((a, c) => a.lateral - c.lateral);
    const half = (blk) => {
      const n = typeof blk.seats === 'number' ? blk.seats : Math.max(blk.seats.near, blk.seats.far);
      return (n * pitchSeat) / 2 + 0.03;
    };
    for (let i = 0; i < blocks.length - 1; i++) {
      const eL = blocks[i].lateral + half(blocks[i]);
      const eR = blocks[i + 1].lateral - half(blocks[i + 1]);
      const gap = eR - eL;
      if (gap < 0.6) continue;
      const mid = (eL + eR) / 2;
      for (let r = 0; r < rows; r++) {
        const top = rowHeight(t, r);
        const [cx, cz] = at(mid, r * rowPitch - rowPitch / 2 + 0.05);
        b.box('nosing', gap, 0.03, 0.09, cx, top + 0.012, cz, ry);
        // basamak ışıkları (koridor kenarlarında) + sıra numarası levhası (riser üzerinde)
        for (const lat of [eL + 0.07, eR - 0.07]) {
          const [lx, lz] = at(lat, r * rowPitch - rowPitch / 2 - 0.008);
          b.box('lampWarm', 0.07, 0.035, 0.02, lx, top - (r === 0 ? baseY / 2 : (top - rowHeight(t, r - 1)) / 2) + 0.07, lz, ry);
        }
        const [px, pz] = at(mid, r * rowPitch - rowPitch / 2 - 0.006);
        plaques[keyOf(t)].push({
          text: String(r + 1),
          pos: [px, top - (r === 0 ? baseY / 2 : (top - rowHeight(t, r - 1)) / 2), pz],
          ry,
          w: 0.2,
          h: 0.1,
        });
      }
      if (rise > 0) {
        for (const lat of [eL + 0.04, eR - 0.04]) {
          const [x0, z0] = at(lat, 0);
          const [x1, z1] = at(lat, (rows - 1) * rowPitch);
          const y1 = rowHeight(t, rows - 1);
          b.bar('black', [x0, baseY + 0.95, z0], [x1, y1 + 0.95, z1], 0.05);
          b.bar('steel', [x0, baseY, z0], [x0, baseY + 0.95, z0], 0.04);
          b.bar('steel', [x1, y1, z1], [x1, y1 + 0.95, z1], 0.04);
        }
      }
    }
    // Yan uçlar için küpeşte
    if (rise > 0) {
      for (const lat of [span[0] + 0.03, span[1] - 0.03]) {
        const [x0, z0] = at(lat, 0);
        const [x1, z1] = at(lat, (rows - 1) * rowPitch);
        const y1 = rowHeight(t, rows - 1);
        b.bar('steel', [x0, baseY + 0.9, z0], [x1, y1 + 0.9, z1], 0.04);
      }
    }
  }

  function buildFan(t, b) {
    const [cx, cz] = t.center;
    const a0 = t.angles[0] * DEG - 0.03;
    const a1 = t.angles[1] * DEG + 0.03;
    for (let r = 0; r < t.rows; r++) {
      const rho = t.r0 + r * t.rowPitch;
      const top = rowHeight(t, r);
      const rIn = rho - t.rowPitch / 2;
      const rOut = rho + t.rowPitch / 2 + 0.004;
      const shape = new THREE.Shape();
      shape.absarc(cx, -cz, rOut, -a0, -a1, true);
      shape.absarc(cx, -cz, rIn, -a1, -a0, false);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: top, bevelEnabled: false, curveSegments: 18 });
      geo.rotateX(-Math.PI / 2);
      b.geometry('tread', geo);
      geo.dispose();
    }
  }

  for (const [key, batch] of Object.entries(batches)) {
    const g = batch.build(mats, { uvScale: { tread: 0.25 } });
    g.name = `bowl:${key}`;
    const grp = ctx.groupFor(keyConfigs[key]);
    grp.add(g);
    if (plaques[key].length) grp.add(labelMesh(plaques[key], { cols: 8 }));
    if (fences[key].length) {
      const m = new THREE.Mesh(mergeGeometries(fences[key], false), mats.fence);
      m.name = `fence:${key}`;
      grp.add(m);
    }
  }
}
