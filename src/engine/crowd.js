import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seatsForConfig } from './layout.js';

const PALETTE = [0x1d2230, 0x2b2f3a, 0x3a2b2b, 0x24362f, 0x40424a, 0x16171b, 0x4a3a2c, 0x2c2a45, 0x5a2f3a, 0x20324a, 0x6a6e78, 0x7a3b2a]
  .map((c) => new THREE.Color(c));

// Yetişkin boy dağılımı (Türkiye): erkek ≈ 176 ± 7 cm, kadın ≈ 163 ± 6,5 cm (Neyzi ve ark. 2008; haber aktarımları 2018). 50/50 karışım.
const FIG_H = 1.755; // figür modelinin boyu (m)
function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function personHeight(r) {
  const male = r() < 0.5;
  const h = (male ? 1.76 : 1.63) + gauss(r) * (male ? 0.07 : 0.065);
  return Math.min(2.0, Math.max(1.45, h));
}

// deterministik rastgele: her açılışta aynı kalabalık
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function figure(kind, lowDetail) {
  const parts = [];
  const add = (g, x, y, z, shade = 1) => {
    g = g.index ? g.toNonIndexed() : g;
    g.translate(x, y, z);
    const n = g.attributes.position.count;
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(shade), 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    parts.push(g);
  };
  const head = () => new THREE.SphereGeometry(0.115, lowDetail ? 5 : 8, lowDetail ? 4 : 6);
  const skin = 1.9; // kafa parlak (instanceColor ile çarpılır; ten tonu ayrı malzemede değil, hafif açık)
  if (kind === 'standing') {
    add(new THREE.BoxGeometry(0.34, 0.86, 0.22), 0, 0.43, 0, 0.8);
    add(new THREE.BoxGeometry(0.46, 0.62, 0.27), 0, 1.17, 0, 1.0);
    add(head(), 0, 1.64, 0.01, skin);
    if (!lowDetail) {
      add(new THREE.BoxGeometry(0.1, 0.55, 0.1), -0.29, 1.22, 0, 0.9);
      add(new THREE.BoxGeometry(0.1, 0.55, 0.1), 0.29, 1.22, 0, 0.9);
    }
  } else {
    // oturan: yerel +z = baktığı yön
    add(new THREE.BoxGeometry(0.42, 0.6, 0.24), 0, 0.82, -0.02, 1.0);
    add(head(), 0, 1.28, 0.0, skin);
    add(new THREE.BoxGeometry(0.32, 0.14, 0.5), 0, 0.52, 0.26, 0.8);
    if (!lowDetail) add(new THREE.BoxGeometry(0.28, 0.5, 0.14), 0, 0.27, 0.5, 0.75);
  }
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return g;
}

/** Seyirci kalabalığı: etkinlik düzenine göre tembel kurulan InstancedMesh'ler. */
export class Crowd {
  constructor({ model, config, quality, scene }) {
    this.model = model;
    this.config = config;
    this.low = quality.seatDetail === 'low';
    this.scene = scene;
    this.sets = new Map();
    this.current = null;
    this.geos = {
      standing: figure('standing', this.low),
      seated: figure('seated', this.low),
    };
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  }

  _build(key) {
    const r = rng(key.length * 977 + 13);
    const seats = seatsForConfig(this.model, key);
    const people = [];
    const perPoint = this.low ? 1 : 2; // ayakta: nokta başına kişi (0,9 m ızgara → ≈ 2,5 kişi/m² gerçekçi yoğunluk)
    for (const s of seats) {
      const standing = s.style === 'standing';
      const loca = s.category === 'loca';
      const occ = standing ? 0.94 : loca ? 0.7 : s.category === 'vip' ? 0.9 : 0.64;
      for (let k = 0; k < (standing ? perPoint : 1); k++) {
      if (r() > occ) continue;
      const jitter = standing ? (perPoint > 1 ? 0.42 : 0.14) : 0.02;
      people.push({
        seat: s,
        standing,
        x: s.pos[0] + (r() - 0.5) * jitter * 2,
        y: s.pos[1],
        z: s.pos[2] + (r() - 0.5) * jitter * 2,
        yaw: standing ? Math.atan2(0, -1) * 0 + (r() - 0.5) * 0.7 : s.yaw,
        scale: personHeight(r) / FIG_H,
        color: PALETTE[Math.floor(r() * PALETTE.length)],
      });
      }
    }
    const set = { key, items: people, meshes: [], hidden: new Set(), byIndex: new Map() };
    const d = new THREE.Object3D();
    for (const standing of [true, false]) {
      const list = people.filter((p) => p.standing === standing);
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(this.geos[standing ? 'standing' : 'seated'], this.mat, list.length);
      mesh.frustumCulled = false;
      mesh.receiveShadow = false;
      mesh.castShadow = false;
      mesh.name = `crowd:${key}:${standing ? 'stand' : 'sit'}`;
      list.forEach((p, i) => {
        d.position.set(p.x, p.y, p.z);
        d.rotation.set(0, p.yaw, 0);
        d.scale.setScalar(p.scale);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
        mesh.setColorAt(i, p.color);
        p.mesh = mesh;
        p.i = i;
        if (!standing) set.byIndex.set(p.seat.index, p);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      this.scene.add(mesh);
      set.meshes.push(mesh);
    }
    set.list = people;
    return set;
  }

  /** Bir düzen için kalabalığı göster/gizle. */
  setConfig(key, on) {
    for (const s of this.sets.values()) s.meshes.forEach((m) => (m.visible = false));
    this.current = on ? key : null;
    if (!on) return;
    if (!this.sets.has(key)) this.sets.set(key, this._build(key));
    this.sets.get(key).meshes.forEach((m) => (m.visible = true));
  }

  /** Oturulan koltuğun (veya ayakta noktanın) önündeki/üstündeki kişiyi gizle. */
  hideAt(seat) {
    const set = this.current && this.sets.get(this.current);
    if (!set) return;
    const d = new THREE.Object3D();
    const restore = () => {
      for (const p of set.hidden) {
        d.position.set(p.x, p.y, p.z);
        d.rotation.set(0, p.yaw, 0);
        d.scale.setScalar(p.scale);
        d.updateMatrix();
        p.mesh.setMatrixAt(p.i, d.matrix);
        p.mesh.instanceMatrix.needsUpdate = true;
      }
      set.hidden.clear();
    };
    restore();
    if (!seat) return;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const hide = (p) => {
      p.mesh.setMatrixAt(p.i, zero);
      p.mesh.instanceMatrix.needsUpdate = true;
      set.hidden.add(p);
    };
    if (seat.style === 'standing') {
      for (const p of set.list) if (p.standing && Math.hypot(p.x - seat.eye[0], p.z - seat.eye[2]) < 0.8) hide(p);
    } else {
      const p = set.byIndex.get(seat.index);
      if (p) hide(p);
    }
  }
}
