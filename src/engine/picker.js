import * as THREE from 'three';
import { seatsForConfig } from './layout.js';

/**
 * Işın–koltuk eşleştirme. Binlerce InstancedMesh örneğini raycast etmek yerine,
 * koltuk merkezlerine ışın mesafesine bakılır (≈5000 nokta, mikrosaniyeler).
 */
export class SeatPicker {
  constructor(model) {
    this.model = model;
    this.list = [];
    this.centers = new Float32Array(0);
  }

  setConfig(configKey) {
    this.list = seatsForConfig(this.model, configKey);
    this.centers = new Float32Array(this.list.length * 3);
    this.list.forEach((s, i) => {
      this.centers[i * 3] = s.pos[0];
      this.centers[i * 3 + 1] = s.pos[1] + 0.5 * s.scale;
      this.centers[i * 3 + 2] = s.pos[2];
    });
  }

  /** @param {THREE.Ray} ray */
  pick(ray, { maxDist = 160 } = {}) {
    const o = ray.origin, d = ray.direction;
    const c = this.centers;
    let best = null;
    let bestT = Infinity;
    for (let i = 0; i < this.list.length; i++) {
      const vx = c[i * 3] - o.x, vy = c[i * 3 + 1] - o.y, vz = c[i * 3 + 2] - o.z;
      const t = vx * d.x + vy * d.y + vz * d.z;
      if (t < 0.3 || t > maxDist) continue;
      const dist2 = vx * vx + vy * vy + vz * vz - t * t;
      const tol = 0.27 + t * 0.0045;
      if (dist2 < tol * tol && t < bestT) {
        bestT = t;
        best = this.list[i];
      }
    }
    return best;
  }
}
