import * as THREE from 'three';
import { Batch } from '../batch.js';
import { exitSignTexture } from '../textures.js';
import { labelMesh } from './labels.js';

/**
 * Çevre detayları: acil çıkış kapıları ve levhaları, akustik ahşap panel duvarlar,
 * havalandırma kanalları, kablo taşıyıcılar, basketbol asma hoparlör kümeleri, tavan kornişi aydınlatması.
 */
export function buildDetails(ctx) {
  const { config, mats, groups, hooks } = ctx;
  const ring = config.hall.ring;
  const roof = config.hall.roof;
  const F = ring.frontX + ring.depth + (ring.corridor ?? 1.5); // arka duvar hattı

  const structure = new Batch();
  const shell = new Batch();
  const game = new Batch();
  const signs = [];

  // Kapı: ön hat (front) + bakış yönü (f) çerçevesinde
  const door = (batch, front, f, w, h, { sign = true, y0 = 0 } = {}) => {
    const u = [-f[1], f[0]];
    const ry = Math.atan2(f[0], f[1]);
    const P = (lat, depth) => [front[0] + u[0] * lat - f[0] * depth, front[1] + u[1] * lat - f[1] * depth];
    const put = (key, bw, bh, bd, lat, depth, y) => {
      const [x, z] = P(lat, depth);
      batch.box(key, bw, bh, bd, x, y + y0, z, ry);
    };
    put('doorDark', w, h, 0.08, 0, -0.04, h / 2);
    put('black', 0.16, h + 0.16, 0.14, -w / 2 - 0.08, -0.05, (h + 0.16) / 2);
    put('black', 0.16, h + 0.16, 0.14, w / 2 + 0.08, -0.05, (h + 0.16) / 2);
    put('black', w + 0.32, 0.16, 0.14, 0, -0.05, h + 0.08);
    put('lampWarm', w - 0.4, 0.05, 0.12, 0, -0.02, h - 0.1);
    put('yellow', w, 0.06, 0.2, 0, 0.1, 0.03); // eşik şeridi
    if (sign) {
      const [x, z] = P(0, -0.015);
      signs.push({ x, y: h + 0.62 + y0, z, ry });
    }
  };

  // Kapılar (Arkitera: "KAPI / GATE 01–11", sarı RAL 1028 yazı siyah zeminde): tribün tepesindeki giriş tünelleri
  // yan duvarda 1,4–11 numaralı kapı olarak, zemin katta ise sahne kanadında yükleme kapıları.
  const gateZ = [-17.5, -8.8, 0, 8.8, 17.5];
  const gateLabels = [];
  for (const s of [-1, 1]) {
    gateZ.forEach((z, i) => {
      door(structure, [s * (F - 0.1), z], [-s, 0], 2.4, 2.6, { sign: false, y0: 6.4 });
      gateLabels.push({ text: String(s < 0 ? i + 1 : i + 6), pos: [s * (F - 0.25), 6.4 + 3.4, z], ry: Math.atan2(-s, 0), w: 1.1, h: 0.55 });
    });
  }
  // Sahne kanadı: yükleme kapıları
  for (const s of [-1, 1]) {
    door(shell, [s * F, -25.2], [-s, 0], 4.2, 3.8);
    door(shell, [s * F, -22.4], [-s, 0], 1.6, 2.4, { sign: false });
  }

  // Akustik ahşap panel: sahne ucu duvarı + kanat duvarları (dikey lamel)
  for (let x = -F + 0.4; x <= F - 0.3; x += 0.34) shell.box('woodDark', 0.16, 6.6, 0.06, x, 5.4, ring.stageWallZ + 0.04);
  for (const s of [-1, 1]) {
    for (let z = ring.stageWallZ + 0.5; z <= ring.wingZ - 0.3; z += 0.34) {
      if (Math.abs(z + 25.2) < 2.4 || Math.abs(z + 22.4) < 1.2) continue; // kapı boşlukları
      shell.box('woodDark', 0.06, 6.6, 0.16, s * (F - 0.04), 5.4, z);
    }
  }
  // Panel üstü yatay kuşak
  shell.box('black', 2 * F, 0.25, 0.1, 0, 8.9, ring.stageWallZ + 0.06);

  // Havalandırma kanalları (kemerlerin altından boydan boya) + askılar
  const zA = roof.zMin + 1.5, zB = roof.zMax - 1.5;
  const ductDrop = (roof.trussDepth ?? 1.5) + 1.2;
  const duct = (x, y, r) => {
    const g = new THREE.CylinderGeometry(r, r, zB - zA, 20, 1, false).rotateX(Math.PI / 2);
    structure.geometry('duct', g, x, y, (zA + zB) / 2);
    g.dispose();
    for (let z = zA + 3; z < zB; z += 6) {
      structure.bar('steel', [x - r * 0.7, y + r * 0.7, z], [x - r * 0.7, y + r + 1.0, z], 0.04);
      structure.bar('steel', [x + r * 0.7, y + r * 0.7, z], [x + r * 0.7, y + r + 1.0, z], 0.04);
      structure.box('steelLight', r * 2.1, 0.06, 0.12, x, y + r * 0.2, z);
    }
  };
  const archY = (x) => {
    const sag = roof.apexY - roof.springY;
    const R = (roof.halfSpan ** 2 + sag ** 2) / (2 * sag);
    return roof.apexY - R + Math.sqrt(R * R - x * x);
  };
  duct(-12.5, archY(12.5) - ductDrop, 0.38);
  duct(12.5, archY(12.5) - ductDrop, 0.38);
  duct(-22, archY(22) - ductDrop, 0.3);
  duct(22, archY(22) - ductDrop, 0.3);
  // Kablo taşıyıcılar
  for (const x of [-5.5, 5.5]) {
    structure.box('steel', 0.5, 0.06, zB - zA, x, archY(x) - ductDrop + 0.2, (zA + zB) / 2);
    for (let z = zA + 4; z < zB; z += 6) structure.bar('steel', [x, archY(x) - ductDrop + 0.2, z], [x, archY(x) - ductDrop + 1.2, z], 0.03);
  }

  // Basketbol: asma hoparlör kümeleri (küpün dört köşesi)
  for (const [x, z] of [[-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5]]) {
    const ry = Math.atan2(-x, -z);
    for (let k = 0; k < 3; k++) game.box('black', 0.9, 0.55, 0.75, x, 13.9 - k * 0.58, z, ry, 0.32);
    game.box('black', 0.8, 0.6, 0.8, x, 12.0, z, ry);
    for (const [dx, dz] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) {
      game.bar('steel', [x + dx, 14.4, z + dz], [x * 1.2 + dx * 0.5, 15.6, z * 1.2 + dz * 0.5], 0.035);
    }
  }

  // Kornişte gizli ışık şeridi (halka üstü, çatı yayının altında)
  const cove = new Batch();
  const wallPath = ctx.model.ring.path;
  for (let i = 0; i < wallPath.length - 1; i++) {
    const a = wallPath[i], b = wallPath[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1) continue;
    cove.box('lampWarm', len, 0.06, 0.09, (a[0] + b[0]) / 2, ring.ceilingY - 0.5, (a[1] + b[1]) / 2, Math.atan2(-dz, dx));
  }

  // Levhalar (tek atlas, tek malzeme)
  const signTex = exitSignTexture();
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) });
  const geos = signs.map((s) => {
    const g = new THREE.PlaneGeometry(0.95, 0.36);
    g.rotateY(s.ry);
    g.translate(s.x, s.y, s.z);
    return g;
  });
  const addSigns = (list, target) => {
    for (const g of list) target.add(new THREE.Mesh(g, signMat));
  };
  addSigns(geos.slice(0, 2), groups.structure);
  addSigns(geos.slice(2), groups.shell);

  groups.structure.add(structure.build(mats, {}));
  groups.structure.add(labelMesh(gateLabels, { cols: 5 }));
  groups.shell.add(shell.build(mats, { uvScale: {} }));
  ctx.groupFor(['basketball']).add(game.build(mats, {}));
  const coveGroup = cove.build(mats, {});
  coveGroup.traverse((o) => (o.castShadow = false));
  groups.structure.add(coveGroup);
  void hooks;
}
