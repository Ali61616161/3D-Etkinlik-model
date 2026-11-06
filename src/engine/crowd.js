import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seatsForConfig } from './layout.js';

/**
 * Seyirci kalabalığı: insan oranlı figürler (baş, boyun, omuz, gövde, kol, bacak, ayakkabı, saç), ten/saç/kıyafet rengi
 * örnek başına ayrı; yakın (≈ 480 üçgen) ve uzak (≈ 70 üçgen) detay kademesi.
 *
 * Boy dağılımı (Türkiye yetişkin): erkek ≈ 176,5 ± 7 cm, kadın ≈ 163,5 ± 6,5 cm (Neyzi ve ark. 2008; 2018 haber aktarımı);
 * genç yetişkinlerde son 20 yılda ≈ +1,8 cm artış bildiriliyor (JCRPE 2025), bu yüzden konser kitlesi için üst değerler alındı.
 * 50/50 erkek-kadın karışımı → ortalama ≈ 170 cm, aralık 145–200 cm.
 */
export const HUMAN_H = 1.75; // figür modelinin boyu (m)
export const EYE_RATIO = 0.936; // göz yüksekliği / boy (antropometrik oran; 170 cm için ≈ 11 cm fark)

const CLOTH = [0x1d2230, 0x2b2f3a, 0x3a2b2b, 0x24362f, 0x40424a, 0x16171b, 0x4a3a2c, 0x2c2a45, 0x5a2f3a, 0x20324a, 0x6a6e78, 0x7a3b2a, 0x8a8f99, 0x3d5a73, 0x6b2a2a, 0xb9b4a8]
  .map((c) => new THREE.Color(c));
const SKIN = [0xf0c8a8, 0xe8b894, 0xd9a47c, 0xc68a62, 0xb8805a, 0x8d5a3b].map((c) => new THREE.Color(c));
const HAIR = [0x1a1410, 0x1a1410, 0x2a1d14, 0x2a1d14, 0x3d2a1b, 0x6b4a2a, 0x9a9a9a, 0xb89a5a].map((c) => new THREE.Color(c));

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function personHeight(r) {
  const male = r() < 0.5;
  const h = (male ? 1.765 : 1.635) + gauss(r) * (male ? 0.07 : 0.065);
  return { h: Math.min(2.0, Math.max(1.45, h)), male };
}

// ── figür geometrisi ────────────────────────────────────────────────────────────
// vertex rengi = (ten maskesi, saç maskesi, gölge); gerçek renk örnek başına shader'da karışır
function part(geo, mask, shade, tf) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (tf) g.applyMatrix4(tf);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = mask === 'skin' ? 1 : 0; col[i * 3 + 1] = mask === 'hair' ? 1 : 0; col[i * 3 + 2] = shade; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

function limb(r0, r1, len, seg) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg);
  return g;
}

/**
 * Sade figür (her kalite seviyesinde aynı, ≈ 60 üçgen): bacak, gövde, baş (küre), kollar; saç ve kıyafet renkli.
 * pose: 'stand' | 'cheer' (kollar havada) | 'sit'. Yerel +z = baktığı yön.
 */
export function buildHuman(pose) {
  const P = [];
  const sitting = pose === 'sit';
  const hipY = sitting ? 0.47 : 0.92;
  const shoulderY = hipY + 0.5;
  const headY = hipY + (sitting ? 0.74 : 0.7);
  // bacaklar
  if (sitting) {
    for (const sx of [-0.1, 0.1]) {
      P.push(part(new THREE.BoxGeometry(0.15, 0.14, 0.45), 'cloth', 0.75, M4(sx, hipY, 0.22)));
      P.push(part(new THREE.BoxGeometry(0.13, 0.46, 0.13), 'cloth', 0.7, M4(sx, 0.23, 0.44)));
    }
  } else {
    for (const sx of [-0.1, 0.1]) P.push(part(new THREE.BoxGeometry(0.16, 0.9, 0.16), 'cloth', 0.72, M4(sx, 0.45, 0)));
  }
  // gövde
  P.push(part(new THREE.BoxGeometry(0.46, 0.56, 0.24), 'cloth', 1.0, M4(0, hipY + 0.28, 0)));
  // baş (küre) + saç (üst yarım küre)
  P.push(part(new THREE.SphereGeometry(0.115, 8, 6), 'skin', 1.0, M4(0, headY, 0.01, 0, 0, 0, 0.95, 1.15, 1)));
  P.push(part(new THREE.SphereGeometry(0.12, 8, 4, 0, Math.PI * 2, 0, 1.45), 'hair', 0.9, M4(0, headY + 0.03, -0.015, -0.15, 0, 0, 0.98, 1.1, 1.03)));
  // kollar
  for (const s of [-1, 1]) {
    if (pose === 'cheer') {
      P.push(part(new THREE.BoxGeometry(0.1, 0.62, 0.1), 'cloth', 1.0, M4(s * 0.3, shoulderY + 0.28, 0, 0, 0, -s * 0.18)));
    } else {
      P.push(part(new THREE.BoxGeometry(0.1, 0.5, 0.1), 'cloth', 1.0, M4(s * 0.29, shoulderY - 0.2, sitting ? 0.06 : 0)));
    }
  }
  const g = mergeGeometries(P, false);
  P.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
}

/** Ten/saç/kıyafet karışımı için malzeme (örnek başına renk nitelikleri). */
function humanMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aCloth; attribute vec3 aSkin; attribute vec3 aHair; varying vec3 vTint;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n  vTint = mix(mix(aCloth, aHair, color.y), aSkin, color.x) * color.z;\n  vColor = vColor * 0.0 + 1.0;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= vTint;');
  };
  return m;
}

/** Seyirci kalabalığı: etkinlik düzenine göre tembel kurulan, kameraya göre detay seçen InstancedMesh'ler. */
export class Crowd {
  constructor({ model, config, quality, scene }) {
    this.model = model;
    this.config = config;
    this.low = quality.seatDetail === 'low';
    this.scene = scene;
    this.sets = new Map();
    this.current = null;
    this.mat = humanMaterial();
    this.nearR = 0; // tek detay seviyesi
    this.geos = {};
    for (const pose of ['stand', 'cheer', 'sit']) {
      const g = buildHuman(pose);
      this.geos[pose] = { near: g, far: g };
    }
    this.camPos = new THREE.Vector3(1e9, 0, 0);
    this.dirty = true;
  }

  _build(key) {
    const r = rng(key.length * 977 + 13);
    const seats = seatsForConfig(this.model, key);
    const people = [];
    // ayakta alan: Arkiv "zemin ayakta 3.300" ≈ 3 kişi/m²; nokta ızgarası 0,9 m → nokta başına 3 kişi (hafif cihazda 1)
    const perPoint = this.low ? 1 : 3;
    for (const s of seats) {
      const standing = s.style === 'standing';
      const loca = s.category === 'loca';
      const occ = standing ? 0.96 : loca ? 0.7 : s.category === 'vip' ? 0.9 : 0.64;
      for (let k = 0; k < (standing ? perPoint : 1); k++) {
        if (r() > occ) continue;
        const { h, male } = personHeight(r);
        const jitter = standing ? (perPoint > 1 ? 0.5 : 0.14) : 0.02;
        const pose = standing ? (r() < 0.16 ? 'cheer' : 'stand') : 'sit';
        people.push({
          seat: s, pose,
          x: s.pos[0] + (r() - 0.5) * jitter * 2,
          y: s.pos[1],
          z: s.pos[2] + (r() - 0.5) * jitter * 2,
          yaw: standing ? Math.PI + (r() - 0.5) * 0.6 : s.yaw, // ayakta: sahneye (−z) dönük
          sy: h / HUMAN_H,
          sx: (male ? 1.04 : 0.93) * (0.94 + r() * 0.12),
          cloth: CLOTH[Math.floor(r() * CLOTH.length)],
          skin: SKIN[Math.floor(r() * SKIN.length)],
          hair: HAIR[Math.floor(r() * HAIR.length)],
          hidden: false,
        });
      }
    }
    const set = { key, people, byIndex: new Map(), meshes: [], groups: [] };
    for (const pose of ['stand', 'cheer', 'sit']) {
      const list = people.filter((p) => p.pose === pose);
      if (!list.length) continue;
      const g = { pose, list, n: list.length };
      const mk = (geo, tag) => {
        const geom = geo.clone();
        const mk3 = () => new THREE.InstancedBufferAttribute(new Float32Array(g.n * 3), 3);
        geom.setAttribute('aCloth', mk3());
        geom.setAttribute('aSkin', mk3());
        geom.setAttribute('aHair', mk3());
        const mesh = new THREE.InstancedMesh(geom, this.mat, g.n);
        mesh.frustumCulled = false;
        mesh.castShadow = false;
        mesh.count = 0;
        mesh.name = `crowd:${key}:${pose}:${tag}`;
        this.scene.add(mesh);
        set.meshes.push(mesh);
        return mesh;
      };
      g.near = mk(this.geos[pose].near, 'n');
      g.far = mk(this.geos[pose].far, 'f');
      list.forEach((p, i) => { p.i = i; if (pose === 'sit') set.byIndex.set(p.seat.index, p); });
      set.groups.push(g);
    }
    return set;
  }

  setConfig(key, on) {
    for (const s of this.sets.values()) s.meshes.forEach((m) => (m.visible = false));
    this.current = on ? key : null;
    if (!on) return;
    if (!this.sets.has(key)) this.sets.set(key, this._build(key));
    this.sets.get(key).meshes.forEach((m) => (m.visible = true));
    this.dirty = true;
  }

  /** Her karede çağrılır; kamera 2 m'den fazla oynadıysa yakın/uzak dağılımı yeniler. */
  update(cam) {
    const set = this.current && this.sets.get(this.current);
    if (!set) return;
    if (!this.dirty && cam.distanceToSquared(this.camPos) < 4) return;
    const r2 = this.nearR * this.nearR;
    const d = new THREE.Object3D();
    for (const g of set.groups) {
      let kn = 0, kf = 0;
      for (const p of g.list) {
        if (p.hidden) continue;
        const dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z;
        const isNear = this.nearR > 0 && dx * dx + dy * dy + dz * dz < r2;
        const mesh = isNear ? g.near : g.far;
        const k = isNear ? kn++ : kf++;
        d.position.set(p.x, p.y, p.z);
        d.rotation.set(0, p.yaw, 0);
        d.scale.set(p.sx * p.sy, p.sy, p.sy);
        d.updateMatrix();
        mesh.setMatrixAt(k, d.matrix);
        const gm = mesh.geometry;
        gm.attributes.aCloth.setXYZ(k, p.cloth.r, p.cloth.g, p.cloth.b);
        gm.attributes.aSkin.setXYZ(k, p.skin.r, p.skin.g, p.skin.b);
        gm.attributes.aHair.setXYZ(k, p.hair.r, p.hair.g, p.hair.b);
      }
      for (const [mesh, n] of [[g.near, kn], [g.far, kf]]) {
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
        for (const a of ['aCloth', 'aSkin', 'aHair']) mesh.geometry.attributes[a].needsUpdate = true;
      }
    }
    this.camPos.copy(cam);
    this.dirty = false;
  }

  /** Oturulan koltuktaki (veya ayakta noktadaki) kişiyi gizle: kendi yerimiz boş olsun. */
  hideAt(seat) {
    const set = this.current && this.sets.get(this.current);
    if (!set) return;
    for (const p of set.people) p.hidden = false;
    if (seat) {
      if (seat.style === 'standing') {
        for (const p of set.people) if (p.pose !== 'sit' && Math.hypot(p.x - seat.eye[0], p.z - seat.eye[2]) < 0.6) p.hidden = true;
      } else {
        const p = set.byIndex.get(seat.index);
        if (p) p.hidden = true;
      }
    }
    this.dirty = true;
  }
}
