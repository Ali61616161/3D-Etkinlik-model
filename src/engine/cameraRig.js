import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Kamera: genel görünüm (OrbitControls) ↔ koltuk görünümü (yaw/pitch ile etrafa bakma).
 * Geçişler yay şeklinde (bezier) ve ease-in-out; yönelim slerp ile.
 */
export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.camera.rotation.order = 'YXZ';
    this.mode = 'orbit'; // 'orbit' | 'fly' | 'seat'
    this.fly = null;
    this.yaw = 0;
    this.pitch = 0;
    this.seatFov = 72;
    this.overviewFov = 55;
    this.onModeChange = () => {};

    this.orbit = new OrbitControls(camera, dom);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.07;
    this.orbit.minDistance = 4;
    this.orbit.maxDistance = 70;
    this.orbit.maxPolarAngle = Math.PI * 0.49;
    this.orbit.zoomSpeed = 0.8;
    this.orbit.rotateSpeed = 0.7;
    this.orbit.screenSpacePanning = false;

    this._tmp = new THREE.PerspectiveCamera();
    this._drag = null;
    this._pointers = new Map();
    this._pinch = 0;

    dom.addEventListener('pointerdown', (e) => this._down(e));
    window.addEventListener('pointermove', (e) => this._move(e));
    window.addEventListener('pointerup', (e) => this._up(e));
    window.addEventListener('pointercancel', (e) => this._up(e));
    dom.addEventListener('wheel', (e) => this._wheel(e), { passive: false });
  }

  setMode(m) {
    this.mode = m;
    this.orbit.enabled = m === 'orbit';
    this.onModeChange(m);
  }

  /** Genel görünüme (veya bir hedefe) yumuşak dönüş. */
  flyToOrbit(position, target, { duration = 1.8, fov = this.overviewFov } = {}) {
    const p = new THREE.Vector3(...position);
    const tg = new THREE.Vector3(...target);
    this._tmp.position.copy(p);
    this._tmp.up.set(0, 1, 0);
    this._tmp.lookAt(tg);
    this._startFly(p, this._tmp.quaternion.clone(), fov, duration, () => {
      this.orbit.target.copy(tg);
      this.camera.position.copy(p);
      this.orbit.update();
      this.setMode('orbit');
    });
  }

  /** Koltuk gözüne uçuş; focus: bakılacak nokta (sahne/saha). */
  flySeat(seat, focus, { duration, lookDir } = {}) {
    const eye = new THREE.Vector3(...seat.eye);
    const dir = lookDir ?? new THREE.Vector3(focus[0] - eye.x, focus[1] - eye.y, focus[2] - eye.z);
    const yaw = Math.atan2(-dir.x, -dir.z);
    const pitch = clamp(Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -1.2, 1.2);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    const dist = this.camera.position.distanceTo(eye);
    const dur = duration ?? clamp(0.9 + dist * 0.03, 1.1, 2.6);
    this.orbit.enabled = false;
    this._startFly(eye, q, this.seatFov, dur, () => {
      this.yaw = yaw;
      this.pitch = pitch;
      this.camera.position.copy(eye);
      this._applyLook();
      this.setMode('seat');
    }, 0.18);
  }

  /** Koltuk görünümünde anında yön ver (komşu koltuğa geçerken yumuşak uçuş kullanılır). */
  _startFly(toPos, toQuat, toFov, duration, onDone, lift = 0.28) {
    this.setMode('fly');
    const from = this.camera.position.clone();
    const mid = from.clone().lerp(toPos, 0.5);
    const d = from.distanceTo(toPos);
    mid.y += d * lift;
    this.fly = {
      t: 0,
      dur: duration,
      from,
      ctrl: mid,
      to: toPos.clone(),
      qFrom: this.camera.quaternion.clone(),
      qTo: toQuat,
      fovFrom: this.camera.fov,
      fovTo: toFov,
      onDone,
    };
  }

  update(dt) {
    if (this.fly) {
      const f = this.fly;
      f.t = Math.min(1, f.t + dt / f.dur);
      const e = easeInOut(f.t);
      const a = f.from, c = f.ctrl, b = f.to;
      const k = 1 - e;
      this.camera.position.set(
        k * k * a.x + 2 * k * e * c.x + e * e * b.x,
        k * k * a.y + 2 * k * e * c.y + e * e * b.y,
        k * k * a.z + 2 * k * e * c.z + e * e * b.z,
      );
      this.camera.quaternion.slerpQuaternions(f.qFrom, f.qTo, e);
      this.camera.fov = f.fovFrom + (f.fovTo - f.fovFrom) * e;
      this.camera.updateProjectionMatrix();
      if (f.t >= 1) {
        const done = f.onDone;
        this.fly = null;
        done();
      }
    } else if (this.mode === 'orbit') {
      this.orbit.update();
    }
  }

  // ── koltuktan etrafa bakma ───────────────────────────────────────────────────
  _applyLook() {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  _down(e) {
    if (this.mode !== 'seat') return;
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this._pointers.size === 1) this._drag = { x: e.clientX, y: e.clientY };
    if (this._pointers.size === 2) this._pinch = this._pinchDist();
    this.dom.setPointerCapture?.(e.pointerId);
  }

  _move(e) {
    if (this.mode !== 'seat' || !this._pointers.has(e.pointerId)) return;
    const prev = this._pointers.get(e.pointerId);
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this._pointers.size === 2) {
      const d = this._pinchDist();
      if (this._pinch) this._zoomFov((this._pinch - d) * 0.12);
      this._pinch = d;
      return;
    }
    const k = (this.camera.fov / 70) * 0.0042;
    this.yaw += (e.clientX - prev.x) * k;
    this.pitch = clamp(this.pitch + (e.clientY - prev.y) * k, -1.3, 1.3);
    this._applyLook();
  }

  _up(e) {
    this._pointers.delete(e.pointerId);
    if (this._pointers.size < 2) this._pinch = 0;
    if (this._pointers.size === 0) this._drag = null;
  }

  _pinchDist() {
    const [a, b] = [...this._pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  _zoomFov(delta) {
    this.camera.fov = clamp(this.camera.fov + delta, 26, 100);
    this.camera.updateProjectionMatrix();
    this.seatFov = this.camera.fov;
  }

  _wheel(e) {
    if (this.mode !== 'seat') return;
    e.preventDefault();
    this._zoomFov(e.deltaY * 0.04);
  }

  /** Dışarıdan (UI) bakış yönünü sıfırla: odak noktasına dön. */
  lookAt(focus) {
    const eye = this.camera.position;
    const dx = focus[0] - eye.x, dy = focus[1] - eye.y, dz = focus[2] - eye.z;
    this.yaw = Math.atan2(-dx, -dz);
    this.pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -1.2, 1.2);
    this._applyLook();
  }
}
