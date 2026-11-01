import * as THREE from 'three';
import { labelAtlas } from '../textures.js';

/**
 * Atlas dokulu etiketler → tek mesh.
 * @param {{text:string,pos:number[],ry?:number,rx?:number,w:number,h:number}[]} items
 */
export function labelMesh(items, { cols = 8 } = {}) {
  const { texture, uvs } = labelAtlas(items.map((l) => l.text), cols, 256, 128);
  const geos = items.map((l, i) => {
    const g = new THREE.PlaneGeometry(l.w, l.h);
    const uv = g.attributes.uv;
    const [u0, v0, u1, v1] = uvs[i];
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
    if (l.rx) g.rotateX(l.rx);
    if (l.ry) g.rotateY(l.ry);
    g.translate(l.pos[0], l.pos[1], l.pos[2]);
    return g;
  });
  const merged = mergeAll(geos);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) });
  const mesh = new THREE.Mesh(merged, mat);
  mesh.renderOrder = 3;
  mesh.name = 'labels';
  return mesh;
}

function mergeAll(geos) {
  let count = 0, idx = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), uv = new Float32Array(count * 2), index = [];
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, idx * 3);
    uv.set(g.attributes.uv.array, idx * 2);
    for (const i of g.index.array) index.push(i + idx);
    idx += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(index);
  return out;
}

/** Blok numara plaketleri: rampa tribünlerde arka üst duvar, zemin bloklarında yer yazısı, masalarda masa numarası. */
export function buildBlockLabels(ctx) {
  const { config, model, groupFor } = ctx;
  const byKey = {};
  const keyConfigs = {};
  for (const t of config.tribunes) {
    const key = [...t.configs].sort().join('+');
    keyConfigs[key] = t.configs;
    byKey[key] ??= [];
    for (const b of t.blocks ?? t.tables) {
      const block = model.blocks.get(b.id);
      if (!block || b.id.startsWith('VIP')) continue;
      const rows = block.rows;
      const last = rows[rows.length - 1];
      const mid = last.seats[Math.floor(last.seats.length / 2)];
      const seat = model.seats[mid];
      const f = seat.facing;
      if (t.kind === 'tables') {
        byKey[key].push({ text: b.id.replace('M', ''), pos: [b.center[0], 0.9, b.center[1]], rx: -Math.PI / 2, w: 0.6, h: 0.3 });
      } else if (t.kind === 'flat') {
        // zemin: bloğun ön hattında yer yazısı (sahneye bakan okuyucu için)
        const first = rows[0];
        const s0 = model.seats[first.seats[Math.floor(first.seats.length / 2)]];
        byKey[key].push({ text: b.id, pos: [s0.pos[0], 0.025, s0.pos[2] - 0.95], rx: -Math.PI / 2, w: 1.5, h: 0.75 });
      } else {
        byKey[key].push({
          text: b.id,
          pos: [seat.pos[0] - f[0] * 0.75, seat.pos[1] + 1.55, seat.pos[2] - f[1] * 0.75],
          ry: Math.atan2(f[0], f[1]),
          w: 1.0,
          h: 0.5,
        });
      }
    }
  }
  for (const [key, items] of Object.entries(byKey)) {
    if (items.length) groupFor(keyConfigs[key]).add(labelMesh(items));
  }
}
