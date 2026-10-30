import * as THREE from 'three';
import { Batch } from '../batch.js';
import { ledPanelTexture } from '../textures.js';
import { labelMesh } from './labels.js';

/**
 * 24 loca: bölme duvarları, ahşap zemin, cam korkuluk, ikinci sıra platformu, koltuk grubu,
 * bar, ekran ve sıcak tavan ışığı. Her loca ön hatta (front) göre yerel çerçevede çizilir.
 */
export function buildLocas(ctx) {
  const { config, model, mats, groups } = ctx;
  const ring = config.hall.ring;
  const lc = config.locas;
  const b = new Batch();
  const shellB = new Batch();
  const W = ring.locaWidth;
  const D = ring.depth;
  const fy = ring.floorY;
  const H = ring.ceilingY - fy;

  const screenTex = ledPanelTexture(
    [{ text: 'VW ARENA', size: 70, accent: true }, { text: 'LOCA', size: 46, weight: 600 }],
    { w: 512, h: 288 },
  );
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) });
  const screenGeos = [];

  const labels = [];

  for (const L of model.ring.locas) {
    const f = L.facing;
    const u = [-f[1], f[0]];
    const ry = Math.atan2(f[0], f[1]);
    const P = (lat, depth) => [L.front[0] + u[0] * lat - f[0] * depth, L.front[1] + u[1] * lat - f[1] * depth];
    const box = (batch, key, w, h, d, lat, depth, y) => {
      const [x, z] = P(lat, depth);
      batch.box(key, w, h, d, x, y, z, ry);
    };

    // Bölme duvarları (iki yan)
    for (const s of [-1, 1]) {
      box(b, 'wall', 0.14, H, D, s * (W / 2), D / 2, fy + H / 2);
    }
    // Ahşap zemin + ikinci sıra platformu
    box(b, 'maple', W, 0.03, D, 0, D / 2, fy + 0.015);
    box(b, 'concreteDark', W - 0.14, lc.rowRise, 1.6, 0, 1.85 + 0.2, fy + lc.rowRise / 2 + 0.03);
    // Cam korkuluk + küpeşte
    box(b, 'glass', W - 0.14, 1.05, 0.03, 0, 0.12, fy + 0.55);
    box(b, 'steelLight', W - 0.14, 0.045, 0.07, 0, 0.12, fy + 1.07);
    // Arka lounge: kanepe, bar tezgâhı, ekran
    box(b, 'sofa', W - 1.0, 0.45, 0.75, 0, D - 0.85, fy + 0.25);
    box(b, 'sofa', W - 1.0, 0.55, 0.18, 0, D - 0.45, fy + 0.75);
    box(b, 'black', 1.7, 1.0, 0.55, -W / 2 + 1.1, D - 0.4, fy + 0.5);
    box(b, 'maple', 1.76, 0.04, 0.6, -W / 2 + 1.1, D - 0.4, fy + 1.02);
    // Küçük masa + tabureler, mini buzdolabı, tavan spotları
    box(b, 'maple', 0.95, 0.04, 0.6, -0.9, D - 2.15, fy + 0.74);
    box(b, 'steel', 0.06, 0.72, 0.06, -0.9, D - 2.15, fy + 0.37);
    box(b, 'steel', 0.45, 0.03, 0.4, -0.9, D - 2.15, fy + 0.02);
    for (const dz of [-0.55, 0.55]) box(b, 'leather', 0.32, 0.5, 0.32, -0.9, D - 2.15 + dz, fy + 0.27);
    box(b, 'steelLight', 0.62, 0.9, 0.58, W / 2 - 0.5, D - 0.36, fy + 0.46);
    box(b, 'black', 0.02, 0.5, 0.5, W / 2 - 0.5, D - 0.65, fy + 0.5);
    for (const lat of [-1.6, -0.5, 0.6, 1.7]) box(shellB, 'lampWarm', 0.18, 0.02, 0.18, lat, 3.4, ring.ceilingY - 0.41);
    // Sıcak tavan şeridi
    box(shellB, 'lampWarm', W - 1.2, 0.04, 0.3, 0, 3.0, ring.ceilingY - 0.42);
    box(shellB, 'lampWarm', W - 1.2, 0.04, 0.3, 0, 1.4, ring.ceilingY - 0.42);

    // TV
    {
      const [x, z] = P(0.9, D - 0.18);
      const g = new THREE.PlaneGeometry(1.5, 0.84);
      g.rotateY(ry);
      g.translate(x, fy + 2.0, z);
      screenGeos.push(g);
    }

    labels.push({
      text: String(L.n),
      pos: [...P(0, -0.02)],
      y: 8.0,
      ry,
      w: 0.95,
      h: 0.48,
    });
  }

  groups.structure.add(b.build(mats, { uvScale: { wall: 0.25, concreteDark: 0.25 } }));
  groups.shell.add(shellB.build(mats, {}));

  // TV ekranları
  for (const g of screenGeos) {
    const m = new THREE.Mesh(g, screenMat);
    groups.structure.add(m);
  }

  // Loca numara plaketleri (atlas, tek draw call)
  groups.structure.add(
    labelMesh(
      labels.map((l) => ({ text: l.text, pos: [l.pos[0], l.y, l.pos[1]], ry: l.ry, w: l.w, h: l.h })),
      { cols: 6 },
    ),
  );
}
