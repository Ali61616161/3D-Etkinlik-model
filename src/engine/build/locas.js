import * as THREE from 'three';
import { Batch } from '../batch.js';
import { ledPanelTexture, exitSignTexture } from '../textures.js';
import { labelMesh } from './labels.js';

/**
 * 24 loca (skybox). Her biri ortak bir yerel çerçevede çizilir: ön hat = salona bakan cam korkuluk (depth 0),
 * arkaya doğru depth artar.
 *
 * Arkitera +68,50 kot planı ve resmî loca kiralama sayfasına göre: iki sıra koltuk (arka sıra bir basamak yüksekte),
 * arkada ayakta/bar alanı (paslanmaz tezgâh, yüksek masa, vestiyer askılığı), arka duvarda TV, koridora açılan kapı;
 * yüzeyler siyah cam, açık akçaağaç parke ve paslanmaz çelik (Yazgan Design: VIP oda malzemeleri).
 * Locanın ön çerçevesi mor ışıkla çizilir: bu alanlar seçilebilir.
 */
export function buildLocas(ctx) {
  const { config, model, mats, groups } = ctx;
  const ring = config.hall.ring;
  const lc = config.locas;
  const b = new Batch();
  const shellB = new Batch();
  const glowB = new Batch();
  const frameB = new Batch();
  const D = ring.depth;
  const fy = ring.floorY;
  const H = ring.ceilingY - fy;

  const screenTex = ledPanelTexture(
    [{ text: 'VW ARENA', size: 70, accent: true }, { text: 'LOCA', size: 46, weight: 600 }],
    { w: 512, h: 288 },
  );
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) });
  const exitMat = new THREE.MeshBasicMaterial({ map: exitSignTexture(), toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) });
  const screenGeos = [];
  const exitGeos = [];
  const labels = [];

  for (const L of model.ring.locas) {
    const f = L.facing;
    const u = [-f[1], f[0]];
    const ry = Math.atan2(f[0], f[1]);
    const W = L.width ?? ring.locaWidth;
    const P = (lat, depth) => [L.front[0] + u[0] * lat - f[0] * depth, L.front[1] + u[1] * lat - f[1] * depth];
    const box = (batch, key, w, h, d, lat, depth, y) => {
      const [x, z] = P(lat, depth);
      batch.box(key, w, h, d, x, y, z, ry);
    };

    // Bölme duvarları (iki yan) + tavan altı korniş
    for (const s of [-1, 1]) {
      box(b, 'wall', 0.14, H, D, s * (W / 2), D / 2, fy + H / 2);
      box(b, 'steelLight', 0.05, H, 0.05, s * (W / 2 - 0.05), 0.02, fy + H / 2); // ön dikme
    }
    // Zemin: açık akçaağaç parke + arka sıra platformu (bir basamak)
    box(b, 'maple', W, 0.04, D, 0, D / 2, fy + 0.02);
    box(b, 'maple', W - 0.14, lc.rowRise, 1.15, 0, lc.rowDepth[1] + 0.05, fy + lc.rowRise / 2 + 0.04);
    box(b, 'black', W - 0.14, 0.03, 0.05, 0, lc.rowDepth[1] - 0.5, fy + lc.rowRise + 0.05); // basamak burnu
    // Ön: cam korkuluk + siyah alt panel + paslanmaz küpeşte
    box(b, 'glass', W - 0.14, 1.0, 0.03, 0, 0.1, fy + 0.62);
    box(b, 'black', W - 0.14, 0.22, 0.05, 0, 0.1, fy + 0.11);
    box(b, 'steelLight', W - 0.14, 0.045, 0.07, 0, 0.1, fy + 1.13);
    // Ön çerçeve: seçilebilir alan göstergesi (mor ışık)
    box(frameB, 'locaFrame', W - 0.1, 0.07, 0.07, 0, 0.0, fy + H - 0.1);
    box(frameB, 'locaFrame', 0.07, H - 0.1, 0.07, -(W / 2 - 0.1), 0.0, fy + H / 2);
    box(frameB, 'locaFrame', 0.07, H - 0.1, 0.07, W / 2 - 0.1, 0.0, fy + H / 2);

    // Arka duvar (koridor tarafı): siyah cam + sıcak aydınlatma paneli + kapı
    box(b, 'doorDark', W - 0.14, H, 0.08, 0, D - 0.04, fy + H / 2);
    box(glowB, 'locaWall', W - 1.2, H - 1.0, 0.03, 0.55, D - 0.1, fy + H / 2 + 0.1);
    box(b, 'black', 0.9, 2.2, 0.1, -W / 2 + 0.7, D - 0.06, fy + 1.1); // kapı
    box(b, 'steelLight', 0.04, 0.2, 0.06, -W / 2 + 1.05, D - 0.11, fy + 1.0);
    {
      const [x, z] = P(-W / 2 + 0.7, D - 0.14);
      const g = new THREE.PlaneGeometry(0.5, 0.19);
      g.rotateY(ry + Math.PI);
      g.translate(x, fy + 2.4, z);
      exitGeos.push(g);
    }
    // Bar: paslanmaz tezgâh + siyah gövde + raf; yanında yüksek masa ve iki tabure; vestiyer askılığı
    box(b, 'black', 1.9, 1.0, 0.55, W / 2 - 1.1, D - 0.45, fy + 0.5);
    box(b, 'steelLight', 1.96, 0.04, 0.6, W / 2 - 1.1, D - 0.45, fy + 1.02);
    box(b, 'steelLight', 1.7, 0.03, 0.25, W / 2 - 1.1, D - 0.28, fy + 1.55);
    box(glowB, 'locaWall', 1.7, 0.04, 0.06, W / 2 - 1.1, D - 0.2, fy + 1.45);
    box(b, 'steelLight', 0.62, 0.9, 0.58, 0.1, D - 0.4, fy + 0.46); // mini buzdolabı
    box(b, 'maple', 0.8, 0.04, 0.5, -0.5, D - 1.55, fy + 1.08);
    box(b, 'steel', 0.06, 1.05, 0.06, -0.5, D - 1.55, fy + 0.55);
    box(b, 'steel', 0.4, 0.03, 0.36, -0.5, D - 1.55, fy + 0.03);
    for (const dz of [-0.5, 0.5]) box(b, 'leather', 0.32, 0.05, 0.32, -0.5 + dz, D - 1.55, fy + 0.72);
    box(b, 'steel', 0.03, 1.6, 0.03, -W / 2 + 0.25, D - 0.7, fy + 0.9); // askılık
    box(b, 'steelLight', 0.6, 0.03, 0.03, -W / 2 + 0.25, D - 0.7, fy + 1.72);
    // Tavan: spotlar + sıcak şerit
    for (const lat of [-1.7, -0.6, 0.55, 1.65]) box(shellB, 'lampWarm', 0.18, 0.02, 0.18, lat, 1.0, ring.ceilingY - 0.41);
    for (const lat of [-1.7, -0.6, 0.55, 1.65]) box(shellB, 'lampWarm', 0.18, 0.02, 0.18, lat, 2.9, ring.ceilingY - 0.41);
    box(shellB, 'lampWarm', W - 1.2, 0.04, 0.25, 0, D - 0.4, ring.ceilingY - 0.42);

    // TV (arka duvarda, sağ üstte)
    {
      const [x, z] = P(0.9, D - 0.14);
      const g = new THREE.PlaneGeometry(1.5, 0.84);
      g.rotateY(ry);
      g.translate(x, fy + 1.9, z);
      screenGeos.push(g);
      box(b, 'black', 1.56, 0.9, 0.04, 0.9, D - 0.1, fy + 1.9);
    }

    // Numara plakası: ön çerçevenin üstünde (uzaktan okunur)
    const [lx, lz] = P(0, -0.04);
    labels.push({ text: String(L.n), pos: [lx, fy + H + 0.38, lz], ry, w: 1.5, h: 0.75 });
  }

  groups.structure.add(b.build(mats, { uvScale: { wall: 0.25, maple: 0.5 } }));
  groups.shell.add(shellB.build(mats, {}));
  {
    const g = glowB.build(mats, {});
    g.traverse((o) => (o.castShadow = o.receiveShadow = false));
    groups.structure.add(g);
    const f = frameB.build(mats, {});
    f.traverse((o) => (o.castShadow = o.receiveShadow = false));
    groups.structure.add(f);
  }

  for (const g of screenGeos) groups.structure.add(new THREE.Mesh(g, screenMat));
  for (const g of exitGeos) groups.structure.add(new THREE.Mesh(g, exitMat));

  groups.structure.add(
    labelMesh(
      labels.map((l) => ({ text: l.text, pos: l.pos, ry: l.ry, w: l.w, h: l.h })),
      { cols: 6 },
    ),
  );
}
