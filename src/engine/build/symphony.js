import * as THREE from 'three';
import { Batch } from '../batch.js';
import { truss } from './stage.js';

/**
 * Senfoni / film konseri: orkestra sahnesi (üç kademeli podyum, yaylı ve nefesli sıralar, nota sehpaları,
 * şef podyumu, kuyruklu piyano, timpani), arkada dev film perdesi, sıcak ışık donanımı ve hoparlör hatları.
 * (Referans: Harry Potter In Concert, "Adamlar – An Epic Symphony", Fazıl Say Nazım Oratoryosu)
 */
export function buildSymphony(ctx) {
  const { config, mats, anim, state } = ctx;
  const id = 'symphony';
  const st = config.configurations[id].stage;
  const root = ctx.groupFor([id]);
  const b = new Batch();
  const yS = st.height;
  const zc = st.z0 + st.depth / 2;

  // Platform: parke üstlü
  b.box('black', st.width, yS, st.depth, 0, yS / 2, zc);
  b.box('maple', st.width, 0.03, st.depth, 0, yS + 0.015, zc);
  b.box('lampWarm', st.width, 0.05, 0.06, 0, yS - 0.1, st.z0 + st.depth + 0.04);

  // Orkestra podyumları (arkaya doğru yükselir)
  const tiers = [
    { z0: -25.1, z1: -23.4, h: 0.3 },
    { z0: -26.6, z1: -25.1, h: 0.6 },
    { z0: st.z0, z1: -26.6, h: 0.9 },
  ];
  for (const t of tiers) b.box('black', 15, t.h, t.z1 - t.z0, 0, yS + t.h / 2, (t.z0 + t.z1) / 2);
  const riserAt = (z) => (z > -23.4 ? 0 : z > -25.1 ? 0.3 : z > -26.6 ? 0.6 : 0.9);

  // Şef podyumu + korkuluk
  const cz = -19.4;
  b.box('maple', 1.3, 0.28, 1.3, 0, yS + 0.14, cz);
  b.bar('black', [-0.6, yS + 0.28, cz - 0.6], [-0.6, yS + 1.0, cz - 0.6], 0.03);
  b.bar('black', [0.6, yS + 0.28, cz - 0.6], [0.6, yS + 1.0, cz - 0.6], 0.03);
  b.bar('steelLight', [-0.6, yS + 1.0, cz - 0.6], [0.6, yS + 1.0, cz - 0.6], 0.035);

  // Sandalyeler + nota sehpaları: şefin etrafında yaylar
  const chair = (x, y, z, yaw) => {
    b.box('black', 0.42, 0.06, 0.4, x, y + 0.45, z, yaw);
    const bx = x - Math.sin(yaw) * 0.2, bz = z - Math.cos(yaw) * 0.2;
    b.box('black', 0.4, 0.38, 0.05, bx, y + 0.68, bz, yaw);
    b.box('steel', 0.04, 0.45, 0.04, x, y + 0.22, z);
  };
  const stand = (x, y, z, yaw) => {
    const sx = x + Math.sin(yaw) * 0.75, sz = z + Math.cos(yaw) * 0.75;
    b.bar('black', [sx, y, sz], [sx, y + 1.05, sz], 0.02);
    b.box('black', 0.55, 0.38, 0.02, sx, y + 1.1, sz, yaw, -0.28);
  };
  const arcs = [
    { r: 2.7, n: 9, span: 1.35 },
    { r: 3.8, n: 11, span: 1.3 },
    { r: 4.9, n: 12, span: 1.25 },
    { r: 6.0, n: 12, span: 1.2 },
    { r: 7.1, n: 9, span: 1.05 },
  ];
  for (const a of arcs) {
    for (let i = 0; i < a.n; i++) {
      const phi = -a.span + (i * 2 * a.span) / (a.n - 1);
      const x = Math.sin(phi) * a.r * 1.28; // elips: yatay daha geniş
      const z = cz - Math.cos(phi) * a.r;
      if (z < st.z0 + 0.6) continue;
      const y = yS + riserAt(z);
      const yaw = Math.atan2(-x, cz - z) * 0; // izleyiciye (+z) bakan sandalye
      chair(x, y, z, yaw);
      stand(x, y, z, yaw);
    }
  }
  // Kuyruklu piyano (solist/piyano): gövde + kapak + ayaklar + tabure
  {
    const px = -6.6, pz = -17.6, py = yS;
    b.box('blackGloss', 1.5, 0.22, 2.3, px, py + 0.9, pz);
    b.box('blackGloss', 1.5, 0.04, 1.7, px, py + 1.2, pz - 0.3, 0, -0.45);
    for (const [dx, dz] of [[-0.6, -0.9], [0.6, -0.9], [0, 0.95]]) b.box('blackGloss', 0.1, 0.85, 0.1, px + dx, py + 0.45, pz + dz);
    b.box('black', 0.5, 0.08, 0.35, px, py + 0.5, pz + 1.55);
    b.box('white', 1.2, 0.02, 0.3, px, py + 0.99, pz + 1.0);
  }
  // Timpani: bakır kazanlar
  for (let i = 0; i < 4; i++) {
    const g = new THREE.CylinderGeometry(0.34 + i * 0.03, 0.22, 0.6, 22);
    b.geometry('yellow', g, -2.4 + i * 1.0, yS + 0.9 + 0.3, -27.0);
    g.dispose();
  }
  // Koro / arka podyum tabure sırası kenarlarda (yan flama)
  for (const s of [-1, 1]) b.box('black', 0.3, 7.6, 0.5, s * 10.2, yS + 3.8, st.z0 + 0.5);

  // Işık donanımı: üç truss + sıcak PAR'lar (emissive), yan hoparlör hatları
  const towerX = st.width / 2 + 0.8;
  for (const s of [-1, 1]) truss(b, [s * towerX, yS, st.z0 + 1.2], [s * towerX, 12.4, st.z0 + 1.2], 0.5);
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.9), toneMapped: false });
  const lampB = new Batch();
  for (const [z, y] of [[-16.5, 12.6], [-21.0, 12.2], [-26.0, 11.6]]) {
    truss(b, [-towerX, y, z], [towerX, y, z], 0.5);
    for (let i = 0; i < 16; i++) {
      const x = -towerX + 1 + (i * (2 * towerX - 2)) / 15;
      b.box('black', 0.34, 0.4, 0.34, x, y - 0.5, z);
      lampB.box('lamp', 0.24, 0.03, 0.24, x, y - 0.72, z);
    }
  }
  for (const s of [-1, 1]) {
    for (let m = 0; m < 10; m++) b.box('black', 0.72, 0.4, 0.6, s * (st.width / 2 + 2.4), 11.2 - m * 0.42, st.z0 + 3, 0, 0.02 * m);
    b.bar('steel', [s * (st.width / 2 + 2.4), 11.6, st.z0 + 3], [s * (st.width / 2 + 2.4), 15.6, st.z0 + 3], 0.04);
  }

  // Dev film perdesi (animasyonlu) + yan siyah drape
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 232;
  const c = cvs.getContext('2d');
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 7.25),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) }),
  );
  screen.position.set(0, 7.3, st.z0 + 0.9);
  root.add(screen);
  b.box('black', 16.3, 7.55, 0.2, 0, 7.3, st.z0 + 0.72);
  const stars = Array.from({ length: 70 }, () => [Math.random() * 512, Math.random() * 232, 0.4 + Math.random() * 1.6, Math.random() * 6.28]);
  let last = -1;
  const draw = (t) => {
    const g = c.createLinearGradient(0, 0, 512, 232);
    g.addColorStop(0, '#0a1230');
    g.addColorStop(0.55, '#1c2a5e');
    g.addColorStop(1, '#3a2a56');
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 232);
    for (const [x, y, r, ph] of stars) {
      c.fillStyle = `rgba(255,240,210,${0.35 + 0.5 * Math.abs(Math.sin(t * 0.8 + ph))})`;
      c.beginPath();
      c.arc((x + t * 6) % 512, y, r, 0, Math.PI * 2);
      c.fill();
    }
    c.textAlign = 'center';
    c.fillStyle = '#ffe6b0';
    c.font = '700 50px Georgia, serif';
    c.fillText('FİLM KONSERİ', 256, 112);
    c.font = '400 24px Georgia, serif';
    c.fillStyle = 'rgba(255,230,190,0.85)';
    c.fillText('canlı senfoni orkestrası eşliğinde', 256, 156);
    c.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < 232; y += 3) c.fillRect(0, y + 2, 512, 1);
    tex.needsUpdate = true;
  };
  draw(0);

  const built = b.build(mats, {});
  root.add(built);
  const lampMats = { lamp: lampMat };
  root.add(lampB.build(lampMats, {}));
  // perde kıvrımı
  const cg = new THREE.PlaneGeometry(34, 12, 90, 1);
  const pos = cg.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 2.2) * 0.12);
  cg.computeVertexNormals();
  const curtain = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x0b0a0c, roughness: 1, side: THREE.DoubleSide }));
  curtain.position.set(0, 7.2, config.hall.ring.stageWallZ + 0.4);
  root.add(curtain);

  anim.push((t) => {
    if (state.config !== id) return;
    const sec = Math.floor(t * 8);
    if (sec !== last) {
      last = sec;
      draw(t);
    }
  });
}
