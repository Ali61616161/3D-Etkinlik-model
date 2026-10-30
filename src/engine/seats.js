import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
  const hi = detail === 'high';
  const parts = [];
  const tilt = -0.17; // sırtlık geriye eğimi

  // Sırtlık (yüksek, hafif geriye eğimli) + başlık bandı
  const back = hi ? roundedSlab(0.43, 0.64, 0.075, 0.07) : box(0.43, 0.64, 0.075);
  parts.push({ g: back, shade: 1.0, m: T(0, 0.8, -0.2).multiply(RX(tilt)) });
  const head = box(0.34, 0.12, 0.085);
  parts.push({ g: head, shade: 1.25, m: T(0, 1.07, -0.215).multiply(RX(tilt)) });
  // bel desteği: arkaya doğru koyu şerit
  parts.push({ g: box(0.36, 0.14, 0.03), shade: 0.75, m: T(0, 0.6, -0.17).multiply(RX(tilt)) });

  // Oturak
  const cushionGeo = () => {
    const c = hi ? roundedSlab(0.42, 0.44, 0.085, 0.06) : box(0.42, 0.44, 0.085);
    return c.rotateX(-Math.PI / 2); // kalınlık → Y
  };
  if (kind === 'folded') {
    // menteşe arkada: oturak dikey, sırtlığa yaslı
    parts.push({ g: cushionGeo(), shade: 1.0, m: T(0, 0.64, -0.075).multiply(RX(-Math.PI / 2 - 0.08)) });
  } else {
    parts.push({ g: cushionGeo(), shade: 1.0, m: T(0, 0.43, 0.04) });
  }

  // Yan ayak (tek, +x tarafında; komşu koltukla paylaşılır) + kolçak + sırtlık bağlantısı
  parts.push({ g: box(0.03, 0.44, 0.3), shade: 0.42, m: T(0.232, 0.22, -0.03) });
  parts.push({ g: box(0.04, 0.06, 0.4), shade: 0.4, m: T(0.232, 0.03, 0.02) });
  parts.push({ g: box(0.05, 0.04, 0.32), shade: 0.6, m: T(0.232, 0.64, -0.02) });
  parts.push({ g: box(0.035, 0.34, 0.05), shade: 0.45, m: T(0.232, 0.5, -0.19) });
  return finish(parts);
}

const STYLE_COLORS = {
  standard: new THREE.Color(0x15161a),
  vip: new THREE.Color(0x3d3f46),
  lounge: new THREE.Color(0x2e231e),
};
const _hidden = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Koltukları (meshKey, geometri türü) gruplarına göre InstancedMesh'lere böler.
 */
export function createSeatMeshes(seats, categories, quality) {
  const detail = quality.seatDetail ?? 'high';
  const geos = { folded: createSeatGeometry('folded', detail), open: createSeatGeometry('open', detail) };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.06 });

  const groups = new Map();
  for (const s of seats) {
    const k = `${s.meshKey}:${s.geo}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }

  const meshes = {};
  const dummy = new THREE.Object3D();
  const catColors = {};
  for (const [k, v] of Object.entries(categories)) catColors[k] = new THREE.Color(v.color);

  for (const [key, list] of groups) {
    const geo = geos[list[0].geo];
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.name = `seats:${key}`;
    mesh.userData.group = list[0].meshKey;
    mesh.castShadow = quality.shadows;
    mesh.receiveShadow = quality.shadows;
    mesh.frustumCulled = false;
    list.forEach((s, i) => {
      s.instanceId = i;
      s.meshName = key;
      dummy.position.set(s.pos[0], s.pos[1], s.pos[2]);
      dummy.rotation.set(0, s.yaw, 0);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, STYLE_COLORS[s.style] ?? STYLE_COLORS.standard);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    meshes[key] = mesh;
  }

  const meshOf = (s) => meshes[s.meshName];
  const tmp = new THREE.Color();
  const _m = new THREE.Matrix4();

  return {
    meshes,
    geometry: geos.open,
    /** Kendi koltuğumuz: katlı oturak yerine kamera altında açık koltuk çizilir → örneği gizle. */
    setSeatHidden(s, hidden) {
      const m = meshOf(s);
      if (hidden) {
        m.setMatrixAt(s.instanceId, _hidden);
      } else {
        dummyPlace(dummy, s);
        _m.copy(dummy.matrix);
        m.setMatrixAt(s.instanceId, _m);
      }
      m.instanceMatrix.needsUpdate = true;
    },
    /** Kategori renkleri ve blok vurgusu. Varsayılan: gerçek koltuk rengi (siyah). */
    refreshColors({ tint, blockId, accent }) {
      for (const s of seats) {
        const m = meshOf(s);
        if (tint) tmp.copy(catColors[s.category] ?? STYLE_COLORS.standard).multiplyScalar(0.62);
        else tmp.copy(STYLE_COLORS[s.style] ?? STYLE_COLORS.standard);
        if (blockId && s.blockId === blockId) tmp.copy(accent);
        m.setColorAt(s.instanceId, tmp);
      }
      for (const m of Object.values(meshes)) m.instanceColor.needsUpdate = true;
    },
    styleColor: (style) => STYLE_COLORS[style] ?? STYLE_COLORS.standard,
    geos,
  };
}

function dummyPlace(d, s) {
  d.position.set(s.pos[0], s.pos[1], s.pos[2]);
  d.rotation.set(0, s.yaw, 0);
  d.scale.setScalar(s.scale);
  d.updateMatrix();
}
