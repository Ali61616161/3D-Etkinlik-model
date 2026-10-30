import * as THREE from 'three';
import { Batch } from '../batch.js';
import { beamTexture, dotTexture } from '../textures.js';

/** Kare kesitli truss: 4 ana boru + iki yüzde diyagonaller. a→b eksen, size kesit. */
export function truss(b, a, c, size = 0.4) {
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

/** FOH (ses/ışık) platformu: siyah kasa, çelik üst, konsol ve iki monitör. */
export function fohBox(batch, fz, w = 5.8) {
  batch.box('black', w, 0.9, 2.3, 0, 0.45, fz);
  batch.box('steel', w + 0.1, 0.06, 2.4, 0, 0.93, fz);
  batch.box('blackGloss', 3.2, 0.12, 0.9, 0, 1.12, fz - 0.4);
  batch.box('black', 0.6, 0.35, 0.4, -1.0, 1.3, fz - 0.55);
  batch.box('black', 0.6, 0.35, 0.4, 1.0, 1.3, fz - 0.55);
}

/** Konser düzeni: sahne, LED duvar, truss'lar, hoparlör dizileri, bariyer, FOH, ışık huzmeleri. */
export function buildStage(ctx) {
  const { config, mats, hooks, anim, state } = ctx;
  // Rock sahnesi: oturmalı ve ayakta konserde ortak
  const rockIds = Object.entries(config.configurations).filter(([, c]) => c.kind === 'rock').map(([id]) => id);
  const cfg = config.configurations[rockIds[0]];
  const st = cfg.stage;
  const zc = st.z0 + st.depth / 2;
  const b = new Batch();
  const root = ctx.groupFor(rockIds);

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
    for (const r of rows) b.bar('steel', [s * (towerX - 0.5), r.y + 0.3, r.z], [s * (towerX - 0.5), 15.6, r.z], 0.03);
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
      // hareketli kafa: taban + çatal (yoke) + silindirik kafa + renkli mercek
      b.box('black', 0.34, 0.1, 0.34, x, r.y - 0.32, r.z);
      b.box('black', 0.045, 0.42, 0.08, x - 0.17, r.y - 0.55, r.z);
      b.box('black', 0.045, 0.42, 0.08, x + 0.17, r.y - 0.55, r.z);
      const hg = new THREE.CylinderGeometry(0.13, 0.17, 0.4, 14);
      b.geometry('black', hg, x, r.y - 0.66, r.z);
      hg.dispose();
      lampBatches[li % 4].box('lamp' + (li % 4), 0.25, 0.03, 0.25, x, r.y - 0.87, r.z);
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
    b.bar('steel', [side.position.x, side.position.y + sh / 2, side.position.z - 0.1], [side.position.x, 15.6, side.position.z - 0.1], 0.03);
  }

  // Hoparlör dizileri (line array): hafif kavisli 12 modül
  for (const s of [-1, 1]) {
    const x = s * (st.width / 2 + 1.9);
    const z = st.z0 + 2.2;
    for (let m = 0; m < 12; m++) {
      b.box('black', 0.72, 0.4, 0.6, x, 11.3 - m * 0.42, z, 0, 0.02 * m);
    }
    b.bar('steel', [x, 11.6, z], [x, 15.6, z], 0.04);
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

  // Backline: davul podyumu + davul seti, amfi kuleleri, monitör kamaları, mikrofon sehpaları
  const zb = st.z0 + 3.4;
  const yS = st.height;
  b.box('black', 3.2, 0.35, 2.8, 0, yS + 0.175, zb);
  const drum = (r, h, x, y, z, rx = 0, rz = 0) => {
    const g = new THREE.CylinderGeometry(r, r, h, 22);
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    b.geometry('steelLight', g, x, y, z);
    g.dispose();
  };
  const dy = yS + 0.35;
  drum(0.34, 0.42, 0, dy + 0.36, zb + 0.3, Math.PI / 2); // kick
  drum(0.2, 0.2, -0.4, dy + 0.88, zb + 0.05); // tom
  drum(0.22, 0.22, 0.4, dy + 0.88, zb + 0.05);
  drum(0.27, 0.35, 0.95, dy + 0.5, zb + 0.35); // floor tom
  drum(0.2, 0.15, -0.75, dy + 0.62, zb + 0.55); // snare
  for (const [x, y, z] of [[-1.15, 1.2, zb - 0.1], [0.05, 1.3, zb - 0.45], [1.25, 1.2, zb - 0.1], [-1.0, 0.85, zb + 0.5]]) {
    const g = new THREE.CylinderGeometry(0.27, 0.27, 0.012, 24);
    b.geometry('yellow', g, x, dy + y, z);
    g.dispose();
    b.bar('steel', [x, dy, z], [x, dy + y, z], 0.02);
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) b.box('black', 0.7, 0.6, 0.4, s * 5.2, yS + 0.3 + k * 0.62, st.z0 + 2.4);
    b.box('black', 1.1, 0.5, 0.5, s * 3.0, yS + 0.25, st.z0 + 4.0);
  }
  for (let i = -3; i <= 3; i++) {
    b.box('black', 0.9, 0.26, 0.5, i * 2.0 + 0.5, yS + 0.13, st.z0 + st.depth - 1.1, 0, -0.35); // monitör kaması
  }
  for (const x of [-3.2, 0, 3.2]) {
    const zm = st.z0 + st.depth - 2.4;
    b.bar('steel', [x, yS, zm], [x, yS + 1.5, zm], 0.025);
    b.bar('black', [x, yS + 1.5, zm], [x, yS + 1.52, zm + 0.3], 0.03);
    b.box('black', 0.05, 0.12, 0.05, x, yS + 1.52, zm + 0.34);
  }
  // Sahne önü LED şerit + yan merdivenler
  b.box('lampWarm', st.width, 0.05, 0.06, 0, st.height - 0.1, st.z0 + st.depth + 0.04);
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const hgt = (st.height * (3 - k)) / 4;
      b.box('black', 1.1, hgt, 0.5, sx * (st.width / 2 + 0.6), hgt / 2, st.z0 + st.depth - 1.8 + k * 0.5);
    }
  }

  // Arka perde: kıvrımlı siyah drape
  {
    const cg = new THREE.PlaneGeometry(34, 12, 90, 1);
    const pos = cg.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 2.6) * 0.14);
    cg.computeVertexNormals();
    const curtain = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 1, side: THREE.DoubleSide }));
    curtain.position.set(0, 7.2, config.hall.ring.stageWallZ + 0.4);
    root.add(curtain);
  }

  // Salon üstü truss ızgarası (konsere göre): kalabalık alanı üstünde iki uzun + üç enine kiriş, hareketli kafalar
  {
    const gy = 14.3;
    for (const x of [-9, 9]) truss(b, [x, gy, -16], [x, gy, 12], 0.45);
    for (const z of [-14, -3, 8]) truss(b, [-9, gy, z], [9, gy, z], 0.45);
    for (const x of [-9, 9]) for (const z of [-14, -3, 8, 12]) b.bar('steel', [x, gy + 0.2, z], [x, 15.6, z], 0.03);
    let gi = 0;
    for (const x of [-9, 9]) {
      for (let z = -15; z <= 11; z += 2.2) {
        b.box('black', 0.3, 0.1, 0.3, x, gy - 0.28, z);
        const hg = new THREE.CylinderGeometry(0.11, 0.15, 0.34, 12);
        b.geometry('black', hg, x, gy - 0.56, z);
        hg.dispose();
        lampBatches[gi % 4].box('lamp' + (gi % 4), 0.22, 0.03, 0.22, x, gy - 0.75, z);
        gi++;
      }
    }
  }

  // Fotoğraf çukuru bariyeri (sahne önünden 1,2 m)
  const barZ = st.z0 + st.depth + 1.2;
  const barHalf = 14.6;
  b.box('steelLight', barHalf * 2, 0.05, 0.05, 0, 1.12, barZ);
  b.box('steel', barHalf * 2, 0.05, 0.05, 0, 0.5, barZ);
  for (let x = -barHalf; x <= barHalf + 0.01; x += 1.2) b.box('steel', 0.05, 1.15, 0.05, x, 0.57, barZ);

  // FOH (ses/ışık masası): oturmalıda ön-arka blok arası enine koridorda; ayakta konserde saha arkasında kule
  const mkFoh = fohBox;
  const fohSeated = new Batch();
  mkFoh(fohSeated, 4.85);
  ctx.groupFor(['concert']).add(fohSeated.build(mats, {}));
  // Ayakta konser: saha arkasında FOH + ön/arka bölgeleri ayıran seyirci bariyeri + yan çit
  const fohStanding = new Batch();
  mkFoh(fohStanding, 22.4, 8);
  for (const x of [-4, 4]) fohStanding.bar('steel', [x, 0.9, 21.2], [x, 3.4, 21.2], 0.06);
  fohStanding.box('black', 8.2, 0.08, 2.5, 0, 3.4, 22.4);
  const splitZ = -4.2;
  fohStanding.box('steelLight', 29, 0.05, 0.05, 0, 1.12, splitZ);
  fohStanding.box('steel', 29, 0.05, 0.05, 0, 0.5, splitZ);
  for (let x = -14.5; x <= 14.51; x += 1.2) fohStanding.box('steel', 0.05, 1.15, 0.05, x, 0.57, splitZ);
  ctx.groupFor(['standing']).add(fohStanding.build(mats, {}));

  root.add(b.build(mats, { uvScale: {} }));
  // lamba renkleri (emissive)
  lampBatches.forEach((lb, i) => {
    const g = lb.build({ ['lamp' + i]: lampMats[i] }, {});
    g.traverse((o) => (o.castShadow = false));
    root.add(g);
  });

  // Işık huzmeleri: truss'tan hedeflere (sahnedeki sanatçılar + ön seyirci) uzanır ve orada biter; uçta ışık havuzu oluşur.
  // Hedefler tarayarak hareket eder; seyirci hedefi oturmalıda baş hizasında (1,15 m), ayakta kalabalıkta 1,75 m.
  const beams = [];
  const coneGeo = new THREE.CylinderGeometry(0.012, 0.1, 1, 24, 1, true);
  coneGeo.translate(0, -0.5, 0);
  const fade = beamTexture();
  const poolTex = dotTexture();
  const poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const NB = 12;
  for (let i = 0; i < NB; i++) {
    const m = new THREE.MeshBasicMaterial({
      map: fade,
      color: new THREE.Color().setHSL(i / NB, 0.9, 0.55),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const cone = new THREE.Mesh(coneGeo, m);
    const piv = new THREE.Group();
    const x = -towerX + 1.5 + (i * (2 * towerX - 3)) / (NB - 1);
    piv.position.set(x, rows[1].y - 0.9, rows[1].z);
    piv.add(cone);
    root.add(piv);
    const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: m.color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.renderOrder = 1;
    root.add(pool);
    beams.push({ piv, m, pool, poolMat, phase: i * 0.7, toAudience: i % 3 !== 0 });
  }
  const _tgt = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _down = new THREE.Vector3(0, -1, 0);
  const headY = () => (state.config === 'standing' ? 1.75 : 1.15);

  // Animasyon: LED duvar içeriği + huzme süpürmesi
  let last = 0;
  anim.push((t) => {
    if (!rockIds.includes(state.config)) return;
    for (const bm of beams) {
      const k = Math.sin(t * 0.5 + bm.phase);
      if (bm.toAudience) _tgt.set(Math.sin(t * 0.35 + bm.phase * 1.7) * 11, headY(), -13.6 + (k * 0.5 + 0.5) * 9.5);
      else _tgt.set(Math.sin(t * 0.4 + bm.phase) * 6.5, st.height + 1.6, -24 + k * 2.2);
      _dir.subVectors(_tgt, bm.piv.position);
      const len = _dir.length();
      _dir.divideScalar(len);
      bm.piv.quaternion.setFromUnitVectors(_down, _dir);
      bm.piv.children[0].scale.setScalar(len);
      bm.pool.position.set(_tgt.x, _tgt.y + 0.04, _tgt.z);
      bm.pool.scale.setScalar(len * 0.26);
      bm.m.color.setHSL(((t * 0.05 + bm.phase / 7) % 1 + 1) % 1, 0.9, 0.55);
      bm.poolMat.color.copy(bm.m.color);
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
