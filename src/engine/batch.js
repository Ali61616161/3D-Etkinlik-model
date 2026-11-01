import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _dir = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);

/**
 * Statik mimariyi malzeme anahtarına göre toplayıp tek bir mesh'e birleştirir.
 * Yüzlerce kutu → birkaç draw call.
 */
export class Batch {
  constructor() {
    this.parts = new Map();
  }

  _push(key, geo, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    g.clearGroups();
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(g);
  }

  /** Kutu: merkez (x,y,z), Y ekseni etrafında ry, sonra opsiyonel rx/rz. */
  box(key, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
    _e.set(rx, ry, rz, 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(_p.set(x, y, z), _q, _s);
    this._push(key, new THREE.BoxGeometry(w, h, d), _m);
  }

  /** A'dan B'ye uzanan ince çubuk (trus, korkuluk, halat). */
  bar(key, a, b, thick = 0.05, thick2 = thick) {
    _dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = _dir.length();
    if (len < 1e-6) return;
    _dir.divideScalar(len);
    _q.setFromUnitVectors(_z, _dir);
    _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s);
    this._push(key, new THREE.BoxGeometry(thick, thick2, len), _m);
  }

  /** Hazır geometri; x,y,z ötelemesi ve ry dönüşü. */
  geometry(key, geo, x = 0, y = 0, z = 0, ry = 0) {
    _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, ry);
    _m.compose(_p.set(x, y, z), _q, _s);
    this._push(key, geo, _m);
  }

  /**
   * @param {Record<string, THREE.Material>} materials
   * @param {{uvScale?: Record<string, number>, shadow?: Record<string, {cast?:boolean, receive?:boolean}>}} opts
   */
  build(materials, opts = {}) {
    const group = new THREE.Group();
    for (const [key, list] of this.parts) {
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      const mat = materials[key];
      if (!mat) throw new Error(`Batch: '${key}' için malzeme yok`);
      const uvScale = opts.uvScale?.[key] ?? (mat.map ? 0.25 : 0);
      if (uvScale) worldUV(merged, uvScale);
      const mesh = new THREE.Mesh(merged, mat);
      const sh = opts.shadow?.[key] ?? {};
      const isGlass = mat.transparent;
      mesh.castShadow = sh.cast ?? !isGlass;
      mesh.receiveShadow = sh.receive ?? !isGlass;
      if (isGlass) mesh.renderOrder = 2;
      mesh.name = `batch:${key}`;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

/** Dünya koordinatından kutu-eşleme UV'si (gerilmeyen doku). */
export function worldUV(geo, scale) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, x * scale, z * scale);
    else if (nx >= nz) uv.setXY(i, z * scale, y * scale);
    else uv.setXY(i, x * scale, y * scale);
  }
  uv.needsUpdate = true;
}
