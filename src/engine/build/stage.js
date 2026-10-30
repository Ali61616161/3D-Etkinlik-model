import * as THREE from 'three';
import { Batch } from '../batch.js';

/** Kare kesitli truss: 4 ana boru + iki yüzde diyagonaller. a→b eksen, size kesit. */
function truss(b, a, c, size = 0.4) {
  const dir = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = dir.length();
  dir.normalize();
  // kesit eksenleri: dünya Y'ye (veya X'e) dik iki vektör
  const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const s1 = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(size / 2);
  const s2 = new THREE.Vector3().crossVectors(dir, s1).normalize().multiplyScalar(size / 2);
  const corner = (i, j, t) => [
    a[0] + dir.x * len * t + s1.x * i + s2.x * j,
    a[1] + dir.y * len * t + s1.y * i + s2.y * j,
    a[2] + dir.z * len * t + s1.z * i + s2.z * j,
  ];
  for (const [i, j] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.bar('steel', corner(i, j, 0), corner(i, j, 1), 0.07);
  const step = size * 1.1;
  const n = Math.max(2, Math.round(len / step));
  const faces = [[[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]], [[-1, 1], [1, 1]]];
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n;
    for (const [p, q] of faces) {
      const flip = k % 2 === 0;
      b.bar('steel', corner(...(flip ? p : q), t0), corner(...(flip ? q : p), t1), 0.03);
    }
  }
}

/** Konser düzeni: sahne, LED duvar, truss'lar, hoparlör dizileri, bariyer, FOH, ışık huzmeleri. */
export function buildStage(ctx) {
  const { config, mats, groups, hooks, anim, state } = ctx;
  const cfg = config.configurations.concert;
  const st = cfg.stage;
  const zc = st.z0 + st.depth / 2;
  const b = new Batch();
  const root = groups.concert;

  // Platform
  b.box('stageDeck', st.width, st.height, st.depth, 0, st.height / 2, zc);
  b.box('black', st.width + 0.1, 0.12, st.depth + 0.1, 0, 0.06, zc);

  // Truss çerçevesi: iki dikme + üç yatay hat
  const towerX = st.width / 2 + 0.4;
  const topY = 12.2;
  for (const s of [-1, 1]) {
    truss(b, [s * towerX, st.height, st.z0 + 1.2], [s * towerX, topY, st.z0 + 1.2], 0.5);
    truss(b, [s * towerX, st.height, st.z0 + st.depth - 0.8], [s * towerX, topY - 1.2, st.z0 + st.depth - 0.8], 0.5);
  }
  const rows = [
    { z: st.z0 + st.depth - 0.8, y: topY - 1.2 },
    { z: zc + 0.4, y: topY - 0.4 },
    { z: st.z0 + 1.2, y: topY },
  ];
  for (const r of rows) truss(b, [-towerX, r.y, r.z], [towerX, r.y, r.z], 0.5);
  // Bağlantı kirişleri
  for (const s of [-1, 1]) {
    truss(b, [s * towerX, rows[0].y, rows[0].z], [s * towerX, rows[2].y, rows[2].z], 0.4);
  }
  // Askı halatları (çatıya)
  for (const s of [-1, 1]) {
    for (const r of rows) b.bar('steel', [s * (towerX - 0.5), r.y + 0.3, r.z], [s * (towerX - 0.5), 19.0, r.z], 0.03);
  }

  // Armatürler (gövde siyah; lamba ayrı renkli emissive)
  const lampMats = [0xff2f6d, 0x2f8bff, 0xb04cff, 0xffd84d].map(
    (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2), toneMapped: false }),
  );
  const lampBatches = lampMats.map(() => new Batch());
  let li = 0;
  for (const r of rows) {
    for (let i = 0; i < 14; i++) {
      const x = -towerX + 1 + (i * (2 * towerX - 2)) / 13;
      b.box('black', 0.42, 0.55, 0.42, x, r.y - 0.55, r.z);
      lampBatches[li % 4].box('lamp' + (li % 4), 0.3, 0.06, 0.3, x, r.y - 0.84, r.z);
      li++;
    }
  }

  // LED duvar + yan ekranlar (animasyonlu canvas)
  const wall = document.createElement('canvas');
  wall.width = 512;
  wall.height = 256;
  const wctx = wall.getContext('2d');
  const wallTex = new THREE.CanvasTexture(wall);
  wallTex.colorSpace = THREE.SRGBColorSpace;
  const ledMat = new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) });
  const ledW = st.width - 3;
  const ledH = 6.4;
  const backZ = st.z0 + 0.7;
  const led = new THREE.Mesh(new THREE.PlaneGeometry(ledW, ledH), ledMat);
  led.position.set(0, st.height + 0.5 + ledH / 2, backZ);
  root.add(led);
  b.box('black', ledW + 0.3, ledH + 0.3, 0.2, 0, st.height + 0.5 + ledH / 2, backZ - 0.14);
  for (const s of [-1, 1]) {
    const sw = 3.2, sh = 5.6;
    const side = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), ledMat);
    side.position.set(s * (st.width / 2 + 4.4), 11.2 - sh / 2, st.z0 + 3);
    side.rotation.y = -s * 0.22;
    root.add(side);
    b.box('black', sw + 0.2, sh + 0.2, 0.18, side.position.x - s * 0.02, side.position.y, side.position.z - 0.12, -s * 0.22);
    b.bar('steel', [side.position.x, side.position.y + sh / 2, side.position.z - 0.1], [side.position.x, 19, side.position.z - 0.1], 0.03);
  }

  // Hoparlör dizileri (line array): hafif kavisli 12 modül
  for (const s of [-1, 1]) {
    const x = s * (st.width / 2 + 1.9);
    const z = st.z0 + 2.2;
    for (let m = 0; m < 12; m++) {
      b.box('black', 0.72, 0.4, 0.6, x, 11.3 - m * 0.42, z, 0, 0.02 * m);
    }
    b.bar('steel', [x, 11.6, z], [x, 19, z], 0.04);
  }
  // Sub'lar (sahne önü, kenarlarda)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      b.box('black', 1.1, 0.8, 0.9, s * (2.2 + i * 1.15), st.height + 0.4, st.z0 + st.depth - 0.6);
    }
  }
  // Mikrofon/monitör kamaları
  for (let i = -3; i <= 3; i++) {
    b.box('black', 0.9, 0.38, 0.55, i * 2.0 + 0.5, st.height + 0.19, st.z0 + st.depth - 1.2, 0.0, 0, 0);
  }

  // Fotoğraf çukuru bariyeri (sahne önünden 1,2 m)
  const barZ = st.z0 + st.depth + 1.2;
  const barHalf = 14.6;
  b.box('steelLight', barHalf * 2, 0.05, 0.05, 0, 1.12, barZ);
  b.box('steel', barHalf * 2, 0.05, 0.05, 0, 0.5, barZ);
  for (let x = -barHalf; x <= barHalf + 0.01; x += 1.2) b.box('steel', 0.05, 1.15, 0.05, x, 0.57, barZ);

  // FOH platformu (ön-arka blok arası enine koridor)
  const fz = 4.85;
  b.box('black', 5.8, 0.9, 2.3, 0, 0.45, fz);
  b.box('steel', 5.9, 0.06, 2.4, 0, 0.93, fz);
  b.box('blackGloss', 3.2, 0.12, 0.9, 0, 1.12, fz - 0.4);
  b.box('black', 0.6, 0.35, 0.4, -1.0, 1.3, fz - 0.55);
  b.box('black', 0.6, 0.35, 0.4, 1.0, 1.3, fz - 0.55);

  root.add(b.build(mats, { uvScale: {} }));
  // lamba renkleri (emissive)
  lampBatches.forEach((lb, i) => {
    const g = lb.build({ ['lamp' + i]: lampMats[i] }, {});
    g.traverse((o) => (o.castShadow = false));
    root.add(g);
  });

  // Işık huzmeleri (additive koniler)
  const beams = [];
  const coneGeo = new THREE.CylinderGeometry(0.04, 2.1, 17, 28, 1, true);
  coneGeo.translate(0, -8.5, 0);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / 10, 0.9, 0.55),
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(coneGeo, m);
    const piv = new THREE.Group();
    const x = -towerX + 1.5 + (i * (2 * towerX - 3)) / 9;
    piv.position.set(x, rows[1].y - 0.9, rows[1].z);
    piv.add(cone);
    root.add(piv);
    beams.push({ piv, m, phase: i * 0.7 });
  }

  // Animasyon: LED duvar içeriği + huzme süpürmesi
  let last = 0;
  anim.push((t) => {
    if (state.config !== 'concert') return;
    for (const bm of beams) {
      bm.piv.rotation.x = -0.75 + Math.sin(t * 0.6 + bm.phase) * 0.28;
      bm.piv.rotation.z = Math.sin(t * 0.45 + bm.phase * 1.3) * 0.5;
      bm.m.color.setHSL(((t * 0.05 + bm.phase / 7) % 1 + 1) % 1, 0.9, 0.55);
    }
    if (t - last < 0.07) return;
    last = t;
    const w = wall.width, h = wall.height;
    const g = wctx.createLinearGradient(0, 0, w, h);
    const hue = (t * 22) % 360;
    g.addColorStop(0, `hsl(${hue},85%,40%)`);
    g.addColorStop(1, `hsl(${(hue + 80) % 360},90%,52%)`);
    wctx.fillStyle = g;
    wctx.fillRect(0, 0, w, h);
    wctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let i = 0; i < 28; i++) {
      const bh = (Math.sin(t * 2.2 + i * 0.6) * 0.5 + 0.5) * h * 0.7 + 8;
      wctx.fillRect(i * (w / 28) + 2, h - bh, w / 28 - 4, bh);
    }
    wctx.fillStyle = 'rgba(255,255,255,0.9)';
    wctx.font = '800 40px system-ui, sans-serif';
    wctx.textAlign = 'center';
    wctx.fillText('CANLI PERFORMANS', w / 2, h * 0.42);
    wctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < h; y += 4) wctx.fillRect(0, y + 3, w, 1);
    wallTex.needsUpdate = true;
  });
  hooks.onConfig.push(() => {});
}
