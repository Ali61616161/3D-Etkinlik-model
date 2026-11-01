import * as THREE from 'three';
import { goboTexture, dotTexture } from '../textures.js';

/**
 * Etkinliğe göre değişen efektler:
 *  - konser: zemine yansıyan dönen gobo desenleri, tarayan lazerler, strobe titreşimi
 *  - ortak: havada süzülen toz/pırıltı parçacıkları (konserde ışık huzmelerinde belirgin, maçta ince)
 */
export function buildEffects(ctx) {
  const { hooks, anim, state, scene, quality } = ctx;
  const goboIds = ['concert', 'standing', 'esports', 'gala'];
  const laserIds = ['concert', 'standing', 'esports'];
  const goboGroup = ctx.groupFor(goboIds);
  const laserGroup = ctx.groupFor(laserIds);

  // ── gobo desenleri (zemin) ───────────────────────────────────────────────────
  const goboTex = goboTexture();
  const gobos = [];
  const spots = [[-9, -8], [0, -10], [9, -8], [-7, 0], [7, 0], [0, 5], [-9, 10], [9, 10]];
  spots.forEach(([x, z], i) => {
    const m = new THREE.MeshBasicMaterial({
      map: goboTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      color: new THREE.Color().setHSL(i / spots.length, 0.9, 0.55),
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), m);
    mesh.position.set(x, 0.05, z);
    mesh.renderOrder = 1;
    goboGroup.add(mesh);
    gobos.push({ mesh, m, phase: i * 0.9 });
  });

  // ── lazerler ────────────────────────────────────────────────────────────────
  const lasers = [];
  const beamGeo = new THREE.CylinderGeometry(0.014, 0.014, 46, 5, 1, true);
  beamGeo.translate(0, -23, 0);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(i % 2 ? 0.1 : 2.4, i % 2 ? 2.6 : 0.2, i % 2 ? 0.5 : 0.35),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const yaw = new THREE.Group();
    yaw.position.set(-6 + i * (12 / 7), 11.8, -19.5);
    const pitch = new THREE.Group();
    pitch.add(new THREE.Mesh(beamGeo, m));
    yaw.add(pitch);
    laserGroup.add(yaw);
    lasers.push({ yaw, pitch, m, phase: i * 0.8 });
  }

  // ── toz / pırıltı ────────────────────────────────────────────────────────────
  const N = quality.shadows ? 520 : 260;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 52;
    pos[i * 3 + 1] = 1.5 + Math.random() * 17;
    pos[i * 3 + 2] = -26 + Math.random() * 62;
    seed[i] = Math.random() * 6.28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: dotTexture(),
      size: 0.16,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xbfc8ff,
      sizeAttenuation: true,
    }),
  );
  dust.frustumCulled = false;
  scene.add(dust);

  const dustLook = { concert: [0.38, 0xcfb8ff], standing: [0.42, 0xcfb8ff], esports: [0.4, 0xffb8c8], ice: [0.2, 0xdff0ff], conference: [0.1, 0xffffff], gala: [0.3, 0xffc8f0], symphony: [0.22, 0xffe3b8] };
  hooks.onConfig.push((key) => {
    const [o, c] = dustLook[key] ?? [0.12, 0xffffff];
    dust.material.opacity = o;
    dust.material.color.set(c);
  });

  const p = geo.attributes.position;
  anim.push((t) => {
    const lite = !!state.lite;
    dust.visible = !lite;
    goboGroup.visible = !lite && goboGroup.visible;
    if (lite) { laserGroup.visible = false; return; }
    for (let i = 0; i < N; i++) {
      p.array[i * 3 + 1] += Math.sin(t * 0.4 + seed[i]) * 0.0016;
      p.array[i * 3] += Math.cos(t * 0.3 + seed[i] * 1.7) * 0.0022;
    }
    p.needsUpdate = true;

    if (!goboIds.includes(state.config)) return;
    const gy = { standing: 1.78, concert: 1.28, esports: 1.28, gala: 0.95 }[state.config] ?? 1.2;
    for (const g of gobos) {
      g.mesh.position.y = gy;
      g.mesh.rotation.y = t * 0.35 + g.phase;
      g.m.color.setHSL(((t * 0.05 + g.phase / 6) % 1 + 1) % 1, 0.9, 0.5);
      g.m.opacity = (0.28 + 0.2 * Math.sin(t * 1.3 + g.phase)) * (state.dim ?? 1);
    }
    // lazerler: 12 sn döngüde 8 sn açık; yelpaze süpürme
    const on = laserIds.includes(state.config) && t % 12 < 8;
    for (const l of lasers) {
      l.yaw.visible = on;
      l.yaw.rotation.y = Math.sin(t * 0.7 + l.phase) * 0.9;
      l.pitch.rotation.x = -1.65 + Math.sin(t * 1.1 + l.phase) * 0.28;
      l.m.opacity = (0.5 + 0.3 * Math.sin(t * 9 + l.phase)) * Math.max(0.35, state.dim ?? 1);
    }
  });
}
