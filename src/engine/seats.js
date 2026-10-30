import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Tek koltuk geometrisi (≈70 üçgen): yerel +Z = baktığı yön, taban y=0.
 * Köşe renkleri parça tonunu verir; gerçek renk instanceColor ile çarpılır.
 */
export function createSeatGeometry() {
  const parts = [];
  const add = (w, h, d, x, y, z, rx = 0, shade = 1) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    if (rx) g.rotateX(rx);
    g.translate(x, y, z);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3).fill(shade);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    parts.push(g);
  };
  add(0.41, 0.075, 0.43, 0, 0.44, 0.04, 0, 1.0); // oturak
  add(0.41, 0.5, 0.07, 0, 0.73, -0.19, -0.16, 1.12); // sırtlık
  add(0.33, 0.1, 0.03, 0, 0.55, -0.15, -0.16, 0.7); // bel desteği (gölge)
  add(0.035, 0.42, 0.34, 0.225, 0.21, -0.02, 0, 0.45); // yan ayak
  add(0.055, 0.035, 0.34, 0.225, 0.62, 0.0, 0, 0.62); // kolçak
  add(0.05, 0.3, 0.05, 0.225, 0.4, -0.2, 0, 0.5); // sırt bağlantısı
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  geo.computeBoundingSphere();
  return geo;
}

const STYLE_COLORS = {
  standard: new THREE.Color(0x1c1d21),
  vip: new THREE.Color(0x56585f),
  lounge: new THREE.Color(0x3a2a22),
};

/**
 * Koltukları meshKey'e göre InstancedMesh'lere böler.
 * @returns {{meshes: Record<string, THREE.InstancedMesh>, setSeatColor: Function, resetColors: Function}}
 */
export function createSeatMeshes(seats, categories, quality) {
  const geo = createSeatGeometry();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.05 });

  const groups = new Map();
  for (const s of seats) {
    if (!groups.has(s.meshKey)) groups.set(s.meshKey, []);
    groups.get(s.meshKey).push(s);
  }

  const meshes = {};
  const dummy = new THREE.Object3D();
  const catColors = {};
  for (const [k, v] of Object.entries(categories)) catColors[k] = new THREE.Color(v.color);

  for (const [key, list] of groups) {
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.name = `seats:${key}`;
    mesh.castShadow = quality.shadows;
    mesh.receiveShadow = quality.shadows;
    mesh.frustumCulled = false; // instanceler geniş alana yayılır
    list.forEach((s, i) => {
      s.instanceId = i;
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

  const seatMesh = (s) => meshes[s.meshKey];
  const tmp = new THREE.Color();

  return {
    meshes,
    geometry: geo,
    setSeatColor(s, color) {
      const m = seatMesh(s);
      m.setColorAt(s.instanceId, color);
      m.instanceColor.needsUpdate = true;
    },
    /** Kategori renkleri açık/kapalı; seçili bloğu vurgula. */
    refreshColors({ tint, blockId, accent }) {
      for (const s of seats) {
        const m = seatMesh(s);
        if (tint) {
          tmp.copy(catColors[s.category] ?? STYLE_COLORS.standard).multiplyScalar(0.62);
        } else {
          tmp.copy(STYLE_COLORS[s.style] ?? STYLE_COLORS.standard);
        }
        if (blockId && s.blockId === blockId) tmp.copy(accent).multiplyScalar(0.9);
        m.setColorAt(s.instanceId, tmp);
      }
      for (const m of Object.values(meshes)) m.instanceColor.needsUpdate = true;
    },
  };
}
