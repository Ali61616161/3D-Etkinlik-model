import * as THREE from 'three';
import { seatsForConfig } from './layout.js';

/**
 * Seçim: iki kademeli.
 *  1) pickBlock: ışın hangi BLOK hacmine giriyor? (parmakla uzaktan tek koltuğu vurmak zor; blok büyük hedeftir)
 *  2) pickSeatInBlock: blok seçiliyken ışına en yakın koltuk (geniş tolerans).
 * Raycast yerine analitik kutu/nokta testleri: ≈ 200 blok + 5 000 nokta, mikrosaniyeler.
 */
export class SeatPicker {
  constructor(model) {
    this.model = model;
    this.list = [];
    this.boxes = [];
    this._cache = new Map();
  }

  setConfig(configKey) {
    this.list = seatsForConfig(this.model, configKey);
    if (!this._cache.has(configKey)) this._cache.set(configKey, this._buildBoxes(configKey));
    this.boxes = this._cache.get(configKey);
  }

  /** Her blok için (yerel çerçevede döndürülmüş) sınır kutusu. */
  _buildBoxes(configKey) {
    const out = [];
    for (const block of this.model.blocks.values()) {
      if (!block.configs.includes(configKey)) continue;
      const f = block.facing ?? [0, -1];
      const u = [-f[1], f[0]];
      const fan = block.kind === 'fan';
      const loca = !!block.locaNo;
      let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (const row of block.rows) {
        for (const i of row.seats) {
          const p = this.model.seats[i].pos;
          const l = fan ? p[0] : p[0] * u[0] + p[2] * u[1];
          const d = fan ? p[2] : p[0] * f[0] + p[2] * f[1];
          lo = [Math.min(lo[0], l), Math.min(lo[1], p[1]), Math.min(lo[2], d)];
          hi = [Math.max(hi[0], l), Math.max(hi[1], p[1]), Math.max(hi[2], d)];
        }
      }
      // dolgu: parmak için cömert, ama komşu bloğa taşmayacak kadar
      const padLat = loca ? 0.9 : block.kind === 'tables' ? 0.8 : 0.35;
      const padDep = loca ? 1.2 : block.kind === 'tables' ? 0.8 : 0.5;
      lo = [lo[0] - padLat, lo[1] - 0.3, lo[2] - padDep];
      hi = [hi[0] + padLat, hi[1] + (loca ? 2.3 : block.style === 'standing' ? 1.9 : 1.5), hi[2] + padDep];
      out.push({ block, u, f, fan, lo, hi });
    }
    return out;
  }

  /** @param {THREE.Ray} ray → { block, t } | null */
  pickBlock(ray, { maxDist = 170 } = {}) {
    const o = ray.origin, d = ray.direction;
    let best = null;
    for (const bx of this.boxes) {
      // dünya → yerel (lateral, y, derinlik)
      let ol, od, dl, dd;
      if (bx.fan) {
        ol = o.x; od = o.z; dl = d.x; dd = d.z;
      } else {
        ol = o.x * bx.u[0] + o.z * bx.u[1];
        od = o.x * bx.f[0] + o.z * bx.f[1];
        dl = d.x * bx.u[0] + d.z * bx.u[1];
        dd = d.x * bx.f[0] + d.z * bx.f[1];
      }
      const org = [ol, o.y, od], dir = [dl, d.y, dd];
      let t0 = 0, t1 = maxDist, ok = true;
      for (let k = 0; k < 3 && ok; k++) {
        if (Math.abs(dir[k]) < 1e-9) {
          if (org[k] < bx.lo[k] || org[k] > bx.hi[k]) ok = false;
        } else {
          let a = (bx.lo[k] - org[k]) / dir[k], b = (bx.hi[k] - org[k]) / dir[k];
          if (a > b) [a, b] = [b, a];
          t0 = Math.max(t0, a);
          t1 = Math.min(t1, b);
          if (t0 > t1) ok = false;
        }
      }
      if (ok && (!best || t0 < best.t)) best = { block: bx.block, t: t0 };
    }
    return best;
  }

  /** Blok içinde ışına en yakın koltuk (geniş tolerans); bulunamazsa null. */
  pickSeatInBlock(ray, block, { maxDist = 170 } = {}) {
    const o = ray.origin, d = ray.direction;
    let best = null, bd = Infinity;
    for (const row of block.rows) {
      for (const idx of row.seats) {
        const s = this.model.seats[idx];
        const vx = s.pos[0] - o.x, vy = s.pos[1] + 0.5 * s.scale - o.y, vz = s.pos[2] - o.z;
        const t = vx * d.x + vy * d.y + vz * d.z;
        if (t < 0.3 || t > maxDist) continue;
        const dist2 = vx * vx + vy * vy + vz * vz - t * t;
        const tol = 0.4 + t * 0.014; // ≈ 0,8° + 0,4 m
        if (dist2 < tol * tol && dist2 < bd) {
          bd = dist2;
          best = s;
        }
      }
    }
    return best;
  }

  /** Eski API: koltuk merkezine en yakın ışın (testler ve plan için). */
  pick(ray, { maxDist = 160 } = {}) {
    const o = ray.origin, d = ray.direction;
    let best = null, bestT = Infinity;
    for (const s of this.list) {
      const vx = s.pos[0] - o.x, vy = s.pos[1] + 0.5 * s.scale - o.y, vz = s.pos[2] - o.z;
      const t = vx * d.x + vy * d.y + vz * d.z;
      if (t < 0.3 || t > maxDist) continue;
      const dist2 = vx * vx + vy * vy + vz * vz - t * t;
      const tol = 0.27 + t * 0.0045;
      if (dist2 < tol * tol && t < bestT) {
        bestT = t;
        best = s;
      }
    }
    return best;
  }
}

void THREE;
