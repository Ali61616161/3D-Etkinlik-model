import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Koltuk geometrileri (yerel +Z = baktığı yön, taban y=0).
 *  - 'folded': tribün koltuğu, oturak yukarı katlı (boş salon fotoğraflarındaki görünüm)
 *  - 'open'  : zemin sandalyesi, loca/VIP koltuğu, oturak aşağıda
 * detail 'high': yuvarlatılmış hatlı gövde (~190 üçgen) · 'low': kutu gövde (~70 üçgen)
 */

function roundedSlab(w, h, d, r, segs = 2) {
  // XY düzleminde yuvarlatılmış dikdörtgen, kalınlık Z (d)
  const x = w / 2, y = h / 2;
  const s = new THREE.Shape();
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);
  s.absarc(x - r, -y + r, r, -Math.PI / 2, 0);
  s.lineTo(x, y - r);
  s.absarc(x - r, y - r, r, 0, Math.PI / 2);
  s.lineTo(-x + r, y);
  s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI);
  s.lineTo(-x, -y + r);
  s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: segs });
  g.translate(0, 0, -d / 2);
  return g;
}

function box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d).toNonIndexed();
}

function finish(parts) {
  const prepared = parts.map(({ g, shade, m }) => {
    let geo = g.index ? g.toNonIndexed() : g;
    if (m) geo.applyMatrix4(m);
    const n = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(shade), 3));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(k)) geo.deleteAttribute(k);
    return geo;
  });
  const merged = mergeGeometries(prepared, false);
  prepared.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}

const M = (fn) => {
  const m = new THREE.Matrix4();
  fn(m);
  return m;
};
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const RX = (a) => new THREE.Matrix4().makeRotationX(a);

export function createSeatGeometry(kind = 'open', detail = 'high') {
  if (detail === 'far') {
    // uzak LOD: 4 kutu (48 üçgen) — sırt, oturak (katlı/açık), yan ayak, kolçak
    const parts = [];
    const tilt = -0.17;
    parts.push({ g: box(0.43, 0.8, 0.075), shade: 1.0, m: T(0, 0.85, -0.2).multiply(RX(tilt)) });
    parts.push({ g: box(0.42, kind === 'folded' ? 0.44 : 0.085, kind === 'folded' ? 0.085 : 0.44), shade: 1.0, m: kind === 'folded' ? T(0, 0.64, -0.12) : T(0, 0.43, 0.04) });
    parts.push({ g: box(0.03, 0.44, 0.3), shade: 0.42, m: T(0.232, 0.22, -0.03) });
    parts.push({ g: box(0.05, 0.05, 0.38), shade: 0.6, m: T(0.232, 0.66, 0.0) });
    return finish(parts);
  }
  const hi = detail !== 'low';
  const ultra = hi; // yumuşatılmış normaller orta ve yüksek kalitede
  const rich = detail === 'high';
  const segs = 3;
  const parts = [];
  const tilt = -0.17; // sırtlık geriye eğimi

  // Yüksek kalitede: kenarları yumuşatılmış (crease) normaller, sırtlık plan görünüşte kıvrımlı
  const soft = (g, bend = 0) => {
    if (bend) {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) - bend * pos.getX(i) * pos.getX(i));
    }
    return ultra ? toCreasedNormals(g, 0.7) : g;
  };

  // Sırtlık (yüksek, hafif geriye eğimli, kıvrımlı) + başlık
  const back = hi ? soft(roundedSlab(0.43, 0.64, 0.075, 0.075, segs), 0.9) : box(0.43, 0.64, 0.075);
  parts.push({ g: back, shade: 1.0, m: T(0, 0.8, -0.2).multiply(RX(tilt)) });
  const head = rich ? soft(roundedSlab(0.34, 0.13, 0.09, 0.05, 2), 0.9) : box(0.34, 0.12, 0.085);
  parts.push({ g: head, shade: 1.22, m: T(0, 1.075, -0.218).multiply(RX(tilt)) });
  // bel desteği: arkaya doğru koyu şerit
  parts.push({ g: box(0.36, 0.14, 0.03), shade: 0.72, m: T(0, 0.6, -0.17).multiply(RX(tilt)) });

  // Oturak
  const cushionGeo = () => {
    const c = hi ? soft(roundedSlab(0.42, 0.44, 0.09, 0.07, segs)) : box(0.42, 0.44, 0.085);
    return c.rotateX(-Math.PI / 2); // kalınlık → Y
  };
  if (kind === 'folded') {
    // menteşe arkada: oturak dikey, sırtlığa yaslı
    parts.push({ g: cushionGeo(), shade: 1.0, m: T(0, 0.64, -0.075).multiply(RX(-Math.PI / 2 - 0.08)) });
  } else {
    parts.push({ g: cushionGeo(), shade: 1.0, m: T(0, 0.43, 0.04) });
  }

  // Yan ayak (tek, +x tarafında; komşu koltukla paylaşılır) + kalın kolçak + sırtlık bağlantısı
  parts.push({ g: box(0.03, 0.44, 0.3), shade: 0.42, m: T(0.232, 0.22, -0.03) });
  parts.push({ g: box(0.04, 0.06, 0.4), shade: 0.4, m: T(0.232, 0.03, 0.02) });
  const arm = rich ? soft(roundedSlab(0.06, 0.09, 0.4, 0.025, 2)) : box(0.055, 0.045, 0.34);
  parts.push({ g: arm, shade: 0.62, m: T(0.232, 0.66, 0.0) });
  parts.push({ g: box(0.035, 0.34, 0.05), shade: 0.45, m: T(0.232, 0.5, -0.19) });
  return finish(parts);
}

const STYLE_COLORS = {
  standard: new THREE.Color(0x15161a),
  vip: new THREE.Color(0x3d3f46),
  lounge: new THREE.Color(0x2e231e),
  banquet: new THREE.Color(0x2b2e35),
  standing: new THREE.Color(0x15161a),
};
const _hidden = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Koltuklar: (meshKey, geometri türü) gruplarına göre InstancedMesh'ler, kameraya göre İKİ DETAY KADEMESİ (LOD):
 * yakın koltuklar tam modelle, uzaktakiler 48 üçgenlik basit modelle çizilir. Kamera 2 m'den fazla oynayınca yeniden dağıtılır.
 */
export function createSeatMeshes(seats, categories, quality) {
  const nearDetail = quality.seatDetail ?? 'high';
  const nearR = quality.seatNear ?? 0;
  const near = { folded: createSeatGeometry('folded', nearDetail), open: createSeatGeometry('open', nearDetail) };
  const far = { folded: createSeatGeometry('folded', 'far'), open: createSeatGeometry('open', 'far') };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.02 });

  const groups = new Map();
  for (const s of seats) {
    if (s.noMesh) continue;
    const k = `${s.meshKey}:${s.geo}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }

  const catColors = {};
  for (const [k, v] of Object.entries(categories)) catColors[k] = new THREE.Color(v.color);

  const dummy = new THREE.Object3D();
  const meshes = {};
  const sets = [];
  for (const [key, list] of groups) {
    const n = list.length;
    const g = { key, list, n, mats: new Float32Array(n * 16), cols: new Float32Array(n * 3), hidden: new Uint8Array(n) };
    const mk = (geo, tag) => {
      const m = new THREE.InstancedMesh(geo, mat, n);
      m.name = `seats:${key}:${tag}`;
      m.userData.configs = list[0].configs;
      m.castShadow = false; // koltuk gölgesi kapalı: maliyetli, görsel katkısı küçük
      m.receiveShadow = quality.shadows;
      m.frustumCulled = false;
      m.count = 0;
      m.setColorAt(0, STYLE_COLORS.standard); // instanceColor tamponunu oluştur
      meshes[`${key}:${tag}`] = m;
      return m;
    };
    g.near = mk(near[list[0].geo], 'n');
    g.far = mk(far[list[0].geo], 'f');
    list.forEach((s, i) => {
      s.instanceId = i;
      s.setIndex = sets.length;
      dummy.position.set(s.pos[0], s.pos[1], s.pos[2]);
      dummy.rotation.set(0, s.yaw, 0);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      dummy.matrix.toArray(g.mats, i * 16);
      const c = STYLE_COLORS[s.style] ?? STYLE_COLORS.standard;
      g.cols[i * 3] = c.r; g.cols[i * 3 + 1] = c.g; g.cols[i * 3 + 2] = c.b;
    });
    sets.push(g);
  }

  const camPos = new THREE.Vector3(1e9, 0, 0);
  let dirty = true;
  const tmp = new THREE.Color();

  function rebuild(cam) {
    const r2 = nearR * nearR;
    for (const g of sets) {
      let kn = 0, kf = 0;
      const na = g.near.instanceMatrix.array, fa = g.far.instanceMatrix.array;
      const nc = g.near.instanceColor.array, fc = g.far.instanceColor.array;
      for (let i = 0; i < g.n; i++) {
        if (g.hidden[i]) continue;
        const s = g.list[i];
        const dx = s.pos[0] - cam.x, dy = s.pos[1] - cam.y, dz = s.pos[2] - cam.z;
        const isNear = nearR > 0 && dx * dx + dy * dy + dz * dz < r2;
        const mm = g.mats.subarray(i * 16, i * 16 + 16), cc = g.cols.subarray(i * 3, i * 3 + 3);
        if (isNear) { na.set(mm, kn * 16); nc.set(cc, kn * 3); kn++; } else { fa.set(mm, kf * 16); fc.set(cc, kf * 3); kf++; }
      }
      g.near.count = kn; g.far.count = kf;
      g.near.instanceMatrix.needsUpdate = g.far.instanceMatrix.needsUpdate = true;
      g.near.instanceColor.needsUpdate = g.far.instanceColor.needsUpdate = true;
    }
    camPos.copy(cam);
    dirty = false;
  }

  return {
    meshes,
    geometry: near.open,
    /** Her karede çağrılır; kamera yeterince oynadıysa ya da veri değiştiyse LOD yeniden dağıtılır. */
    update(cam) {
      if (dirty || cam.distanceToSquared(camPos) > 4) rebuild(cam);
    },
    /** Kendi koltuğumuz: katlı oturak yerine kamera altında açık koltuk çizilir → örneği gizle. */
    setSeatHidden(s, hidden) {
      if (s.noMesh) return;
      sets[s.setIndex].hidden[s.instanceId] = hidden ? 1 : 0;
      dirty = true;
    },
    /** Kategori renkleri ve blok vurgusu. Varsayılan: gerçek koltuk rengi (siyah). */
    refreshColors({ tint, blockId, accent }) {
      for (const s of seats) {
        if (s.noMesh) continue;
        if (tint) tmp.copy(catColors[s.category] ?? STYLE_COLORS.standard).multiplyScalar(0.62);
        else tmp.copy(STYLE_COLORS[s.style] ?? STYLE_COLORS.standard);
        if (blockId && s.blockId === blockId) tmp.copy(accent);
        const g = sets[s.setIndex], i = s.instanceId;
        g.cols[i * 3] = tmp.r; g.cols[i * 3 + 1] = tmp.g; g.cols[i * 3 + 2] = tmp.b;
      }
      dirty = true;
    },
    styleColor: (style) => STYLE_COLORS[style] ?? STYLE_COLORS.standard,
    geos: near,
  };
}
