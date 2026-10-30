import * as THREE from 'three';
import { Batch } from '../batch.js';
import { ledRibbonTexture } from '../textures.js';

const DEG = Math.PI / 180;

/**
 * Salon kabuğu: loca halkası (taban, tavan, fasya + LED şerit), duvarlar, çelik kemer çatı,
 * zemin düzlemleri, tavan armatürleri.
 *  - groups.structure : her zaman görünür (halka tabanı, fasya, kemerler, zemin)
 *  - groups.shell     : kamera salonun dışındayken gizlenir (çatı kaplaması, duvarlar, tavanlar)
 */
export function buildShell(ctx) {
  const { config, model, mats, groups, hooks, anim } = ctx;
  const ring = config.hall.ring;
  const roof = config.hall.roof;
  const floor = config.hall.floor;
  const { path } = model.ring;

  const structure = new Batch();
  const shell = new Batch();
  const ribbons = [];

  const wingEndZ = ring.wingZ;
  // ön hat noktaları: sahne ucundaki kanat başlangıcından, yuvarlak köşeler üzerinden, karşı kanada
  const pts = [[-ring.frontX, wingEndZ], ...path.slice(1, -1), [ring.frontX, wingEndZ]];
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);

  for (const [a, b] of segs) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const d = [dx / len, dz / len];
    let n = [-d[1], d[0]];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (n[0] * (0 - mid[0]) + n[1] * (5 - mid[1]) < 0) n = [-n[0], -n[1]];
    const ry = Math.atan2(n[0], n[1]); // yerel +Z = n
    const back = (dist, y, h, t, extra = 0.3) =>
      [mid[0] - n[0] * dist, y, mid[1] - n[1] * dist, len + extra, h, t];
    const place = (batch, key, dist, yc, h, t, extra = 0.3) => {
      const [cx, cy, cz, L] = back(dist, yc, h, t, extra);
      batch.box(key, L, h, t, cx, cy, cz, ry);
    };

    // Dolu taban (yürüme/loca zemini kotu)
    place(structure, 'concreteDark', ring.depth / 2, ring.floorY / 2, ring.floorY, ring.depth);
    // Fasya
    place(structure, 'black', 0.15, 8.5, 1.8, 0.3);
    // Tavan plakası + arka duvar
    place(shell, 'concreteDark', ring.depth / 2, ring.ceilingY - 0.2, 0.4, ring.depth);
    place(shell, 'wall', ring.depth + 0.2, ring.ceilingY / 2, ring.ceilingY, 0.4, 0.8);

    // LED şerit (kendi düzlemi)
    const geo = new THREE.PlaneGeometry(len, 0.62);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 9));
    ribbons.push({ geo, pos: [mid[0] + n[0] * 0.012, 8.85, mid[1] + n[1] * 0.012], ry });

    // Tavan armatürleri (çatı çevresinde projektör sırası)
    const count = Math.max(1, Math.floor(len / 3));
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count - 0.5;
      const px = mid[0] + d[0] * len * t - n[0] * 0.25;
      const pz = mid[1] + d[1] * len * t - n[1] * 0.25;
      structure.box('lampCool', 0.42, 0.2, 0.3, px, ring.ceilingY + 0.35, pz, ry, 35 * DEG);
      structure.box('black', 0.7, 0.4, 0.5, px - n[0] * 0.18, ring.ceilingY + 0.32, pz - n[1] * 0.18, ry, 35 * DEG);
    }
  }

  // Sahne ucu: kanat duvarları ve arka duvar
  const hw = ring.frontX;
  const wallH = archY(roof, hw) + 0.2;
  for (const s of [-1, 1]) {
    shell.box('wall', 0.4, wallH, ring.wingZ - ring.stageWallZ + 0.4, s * (hw + 0.2), wallH / 2, (ring.wingZ + ring.stageWallZ) / 2);
  }
  shell.box('wall', 2 * hw + 0.8, ring.ceilingY, 0.4, 0, ring.ceilingY / 2, ring.stageWallZ - 0.2);

  // Zemin düzlemleri
  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * (ring.frontX + 6), roof.zMax - roof.zMin + 2).rotateX(-Math.PI / 2),
    mats.concreteDark,
  );
  outer.position.set(0, -0.002, (roof.zMax + roof.zMin) / 2);
  outer.receiveShadow = true;
  worldUVMesh(outer, 0.25);
  groups.structure.add(outer);

  const fw = floor.halfWidth * 2, fl = floor.zMax - floor.zMin;
  const floorGeo = new THREE.PlaneGeometry(fw, fl).rotateX(-Math.PI / 2);
  const mkFloor = (mat, key) => {
    const m = new THREE.Mesh(floorGeo, mat);
    m.position.set(0, 0.004, (floor.zMax + floor.zMin) / 2);
    m.receiveShadow = true;
    worldUVMesh(m, 0.25);
    groups[key].add(m);
    return m;
  };
  mkFloor(mats.floorConcert, 'concert');
  mkFloor(mats.floorGame, 'basketball');

  // ── Çelik kemer çatı ────────────────────────────────────────────────────────
  const { R, cy, thetaMax } = archParams(roof);
  const steelBatch = new Batch();
  const N = 30;
  const ribZs = [];
  for (let k = 0; k < roof.ribCount; k++) {
    ribZs.push(roof.zMin + 1.6 + (k * (roof.zMax - roof.zMin - 3.2)) / (roof.ribCount - 1));
  }
  const depthTruss = 1.5;
  const pt = (theta, rad, z) => [rad * Math.sin(theta), cy + rad * Math.cos(theta), z];
  for (const z of ribZs) {
    let prevTop = null, prevBot = null;
    for (let i = 0; i <= N; i++) {
      const th = -thetaMax + (2 * thetaMax * i) / N;
      const top = pt(th, R, z), bot = pt(th, R - depthTruss, z);
      if (prevTop) {
        steelBatch.bar('steel', prevTop, top, 0.2, 0.2);
        steelBatch.bar('steel', prevBot, bot, 0.18, 0.18);
        steelBatch.bar('steel', prevBot, top, 0.07); // diyagonal
      }
      if (i % 2 === 0) steelBatch.bar('steel', bot, top, 0.07);
      prevTop = top;
      prevBot = bot;
    }
  }
  // Aşıklar (z yönünde), kemerlere dik
  for (let j = 0; j <= 14; j++) {
    const th = -thetaMax + (2 * thetaMax * j) / 14;
    steelBatch.bar('steel', pt(th, R + 0.12, ribZs[0]), pt(th, R + 0.12, ribZs[ribZs.length - 1]), 0.13);
  }
  // Çatı kaplaması (iç yüzey koyu): sahne ucundan karşı uca
  const deckLen = roof.zMax - roof.zMin;
  const deck = new THREE.CylinderGeometry(R + 0.3, R + 0.3, deckLen, 64, 1, true, Math.PI - thetaMax, 2 * thetaMax);
  deck.rotateX(Math.PI / 2);
  deck.translate(0, cy, (roof.zMax + roof.zMin) / 2);
  const deckMesh = new THREE.Mesh(deck, mats.ceilingDark);
  deckMesh.name = 'roofDeck';
  groups.shell.add(deckMesh);

  // Kemer ucu alınları (gable)
  const gable = (z, flip) => {
    const sh = new THREE.Shape();
    sh.moveTo(-roof.halfSpan, roof.springY - 0.1);
    for (let i = 0; i <= 40; i++) {
      const th = -thetaMax + (2 * thetaMax * i) / 40;
      sh.lineTo((R + 0.3) * Math.sin(th), cy + (R + 0.3) * Math.cos(th));
    }
    sh.lineTo(roof.halfSpan, roof.springY - 0.1);
    sh.closePath();
    const g = new THREE.ShapeGeometry(sh);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 1, side: THREE.DoubleSide }));
    m.position.z = z + (flip ? -0.02 : 0.02);
    groups.shell.add(m);
  };
  gable(roof.zMin, false);
  gable(roof.zMax, true);

  // Kemer askı armatürleri (parlak beyaz) — basket aydınlatması
  const rigs = new Batch();
  for (const z of ribZs.slice(1, -1)) {
    for (let j = -4; j <= 4; j++) {
      if (j === 0) continue;
      const th = (j / 5) * thetaMax;
      const p = pt(th, R - depthTruss - 0.2, z);
      rigs.box('lampCool', 0.32, 0.18, 0.32, p[0], p[1], p[2], 0);
      rigs.bar('black', pt(th, R - depthTruss, z), p, 0.04);
    }
  }

  // Birleştir
  const add = (batch, target, uvScale) => {
    const g = batch.build(mats, { uvScale });
    target.add(g);
    return g;
  };
  add(structure, groups.structure, { concreteDark: 0.25 });
  add(shell, groups.shell, { concreteDark: 0.25, wall: 0.25 });
  add(steelBatch, groups.structure, {});
  add(rigs, groups.structure, {});

  // LED şeritleri
  const ribbonMat = new THREE.MeshBasicMaterial({ toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) });
  const ribbonTex = {
    basketball: ledRibbonTexture('BASKET !!!', '#5cff9d'),
    concert: ledRibbonTexture('LIVE  ★  KONSER', '#5cc8ff'),
  };
  ribbonMat.map = ribbonTex.basketball;
  for (const r of ribbons) {
    const m = new THREE.Mesh(r.geo, ribbonMat);
    m.position.set(...r.pos);
    m.rotation.y = r.ry;
    groups.structure.add(m);
  }
  hooks.onConfig.push((key) => {
    ribbonMat.map = ribbonTex[key];
    ribbonMat.needsUpdate = true;
    // armatür parlaklığı: maçta tam, konserde loş
    const lv = key === 'basketball' ? 2.2 : 0.1;
    mats.lampCool.color.setRGB(0.91 * lv, 0.945 * lv, lv);
  });
  anim.push((t) => {
    const map = ribbonMat.map;
    if (map) map.offset.x = (t * 0.03) % 1;
  });
}

// ── yardımcılar ───────────────────────────────────────────────────────────────
export function archParams(roof) {
  const sag = roof.apexY - roof.springY;
  const R = (roof.halfSpan * roof.halfSpan + sag * sag) / (2 * sag);
  return { R, cy: roof.apexY - R, thetaMax: Math.asin(roof.halfSpan / R) };
}

export function archY(roof, x) {
  const { R, cy } = archParams(roof);
  return cy + Math.sqrt(Math.max(0, R * R - x * x));
}

function worldUVMesh(mesh, scale) {
  const g = mesh.geometry.clone();
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + mesh.position.x) * scale, (pos.getZ(i) + mesh.position.z) * scale);
  }
  mesh.geometry = g;
}
