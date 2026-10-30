import * as THREE from 'three';
import { Batch } from '../batch.js';
import { truss, fohBox } from './stage.js';

function animTex(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { c, ctx: c.getContext('2d'), t };
}

/**
 * E-spor finali: sahnede iki takımın oyuncu masaları (monitör + oyuncu koltuğu), ortada kupa podyumu,
 * kıvrımlı dev LED duvar, yan LED sütunlar, seyirci için iki asma maç ekranı, takım renkleri (kırmızı/camgöbeği).
 * (Referans: VALORANT Champions İstanbul, Volkswagen Arena)
 */
export function buildEsports(ctx) {
  const { config, mats, anim, state } = ctx;
  const id = 'esports';
  const st = config.configurations[id].stage;
  const root = ctx.groupFor([id]);
  const b = new Batch();
  const yS = st.height;
  const zc = st.z0 + st.depth / 2;
  const glow = (r, g, bl) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, bl), toneMapped: false });

  // Platform: siyah parlak üst + ışıklı kenar
  b.box('black', st.width, yS, st.depth, 0, yS / 2, zc);
  b.box('blackGloss', st.width, 0.03, st.depth, 0, yS + 0.015, zc);
  const edgeB = new Batch();
  edgeB.box('edgeR', st.width / 2, 0.06, 0.06, -st.width / 4, yS - 0.05, st.z0 + st.depth + 0.04);
  edgeB.box('edgeC', st.width / 2, 0.06, 0.06, st.width / 4, yS - 0.05, st.z0 + st.depth + 0.04);

  // Takım masaları (A: kırmızı sol, B: camgöbeği sağ): masa + monitör + oyuncu koltuğu
  const monB = new Batch();
  const team = (sx, key) => {
    for (let i = 0; i < 5; i++) {
      const x = sx * (2.6 + i * 1.75);
      const z = zc - 0.4 + Math.abs(i - 2) * 0.12;
      const yaw = -sx * 0.2;
      b.box('black', 1.35, 0.05, 0.75, x, yS + 0.75, z, yaw);
      b.box('black', 1.3, 0.7, 0.04, x, yS + 0.4, z - 0.34, yaw);
      b.box('black', 0.6, 0.3, 0.02, x, yS + 1.12, z - 0.18, yaw, -0.12);
      monB.box(key, 0.56, 0.28, 0.01, x - Math.sin(yaw) * 0.0, yS + 1.12, z - 0.165, yaw, -0.12);
      // oyuncu koltuğu (arkada, izleyiciye yakın): kasa + sırt + başlık
      const cx = x - Math.sin(yaw) * -0.9, cz = z + 0.95;
      b.box('black', 0.5, 0.1, 0.5, cx, yS + 0.5, cz, yaw);
      b.box('black', 0.5, 0.7, 0.1, cx, yS + 0.95, cz + 0.25, yaw);
      b.box('black', 0.3, 0.2, 0.1, cx, yS + 1.4, cz + 0.27, yaw);
      b.box('steel', 0.06, 0.45, 0.06, cx, yS + 0.25, cz, yaw);
    }
  };
  team(-1, 'monR');
  team(1, 'monC');

  // Kupa podyumu (ortada) + spot ışığı
  const ped = new THREE.CylinderGeometry(0.75, 0.9, 1.1, 32);
  b.geometry('black', ped, 0, yS + 0.55, zc + 0.6);
  ped.dispose();
  const cup = new THREE.CylinderGeometry(0.12, 0.28, 0.6, 12);
  const cupMesh = new THREE.Mesh(cup, glow(2.6, 2.0, 0.8));
  cupMesh.position.set(0, yS + 1.5, zc + 0.6);
  root.add(cupMesh);

  // Yorumcu masası (sahne solunda)
  b.box('black', 3.4, 0.74, 0.8, -st.width / 2 - 2.2, 0.37, st.z0 + st.depth + 0.3);
  for (const dx of [-0.9, 0.9]) {
    b.box('black', 0.5, 0.05, 0.5, -st.width / 2 - 2.2 + dx, 0.8, st.z0 + st.depth + 0.7);
    b.box('black', 0.5, 0.6, 0.06, -st.width / 2 - 2.2 + dx, 1.1, st.z0 + st.depth + 0.95);
  }

  // Kıvrımlı dev LED duvar: üç panel (orta düz, yanlar içe dönük) + yan sütunlar
  const wall = animTex(512, 180);
  const wallMat = new THREE.MeshBasicMaterial({ map: wall.t, toneMapped: false, color: new THREE.Color(1.35, 1.35, 1.35) });
  const panels = [
    { w: 12, x: 0, ry: 0 },
    { w: 5, x: -8.6, ry: 0.55 },
    { w: 5, x: 8.6, ry: -0.55 },
  ];
  panels.forEach((p, i) => {
    const g = new THREE.PlaneGeometry(p.w, 7.4);
    const uv = g.attributes.uv;
    const u0 = i === 0 ? 0.2 : i === 1 ? 0 : 0.8, u1 = i === 0 ? 0.8 : i === 1 ? 0.2 : 1;
    for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0));
    const m = new THREE.Mesh(g, wallMat);
    m.position.set(p.x, yS + 4.3, st.z0 + 0.8 + Math.abs(p.x) * 0.06);
    m.rotation.y = p.ry;
    root.add(m);
    b.box('black', p.w + 0.2, 7.6, 0.18, m.position.x, m.position.y, m.position.z - 0.12, p.ry);
  });
  const pylons = [];
  for (const s of [-1, 1]) {
    const tx = animTex(128, 512);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 8.5), new THREE.MeshBasicMaterial({ map: tx.t, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }));
    m.position.set(s * (st.width / 2 + 1.4), 4.9, st.z0 + 3.5);
    m.rotation.y = -s * 0.35;
    root.add(m);
    b.box('black', 2.1, 8.6, 0.16, m.position.x, m.position.y, m.position.z - 0.1, -s * 0.35);
    pylons.push({ tx, s });
  }

  // Seyirci için iki asma maç ekranı
  const hud = animTex(512, 288);
  const hudMat = new THREE.MeshBasicMaterial({ map: hud.t, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.94), hudMat);
    m.position.set(s * 9.5, 9.6, -9);
    m.rotation.y = -s * 0.28;
    root.add(m);
    b.box('black', 7.2, 4.14, 0.2, m.position.x, m.position.y, m.position.z - 0.14, -s * 0.28);
    b.bar('steel', [m.position.x - 2.6, 11.6, m.position.z], [m.position.x - 2.6, 19, m.position.z], 0.04);
    b.bar('steel', [m.position.x + 2.6, 11.6, m.position.z], [m.position.x + 2.6, 19, m.position.z], 0.04);
  }

  // Üst truss çerçevesi + hareketli kafalar
  const lampB = new Batch();
  const gy = 13.0;
  for (const z of [st.z0 + 2, zc, st.z0 + st.depth - 1]) {
    truss(b, [-st.width / 2 - 1, gy, z], [st.width / 2 + 1, gy, z], 0.5);
    for (let i = 0; i < 12; i++) {
      const x = -st.width / 2 + i * (st.width / 11);
      b.box('black', 0.32, 0.1, 0.32, x, gy - 0.3, z);
      const hg = new THREE.CylinderGeometry(0.11, 0.15, 0.36, 12);
      b.geometry('black', hg, x, gy - 0.58, z);
      hg.dispose();
      lampB.box(i % 2 ? 'lampR' : 'lampC', 0.22, 0.03, 0.22, x, gy - 0.78, z);
    }
  }
  for (const s of [-1, 1]) truss(b, [s * (st.width / 2 + 1), yS, st.z0 + 1.6], [s * (st.width / 2 + 1), gy, st.z0 + 1.6], 0.5);

  // FOH (aynı enine koridor)
  const fohB = new Batch();
  fohBox(fohB, 4.85);
  root.add(fohB.build(mats, {}));

  root.add(b.build(mats, {}));
  root.add(edgeB.build({ edgeR: glow(2.8, 0.3, 0.4), edgeC: glow(0.3, 2.4, 2.8) }, {}));
  root.add(monB.build({ monR: glow(2.2, 0.3, 0.4), monC: glow(0.3, 1.9, 2.4) }, {}));
  root.add(lampB.build({ lampR: glow(2.6, 0.3, 0.4), lampC: glow(0.3, 2.2, 2.6) }, {}));

  let last = -1;
  anim.push((t) => {
    if (state.config !== id) return;
    cupMesh.rotation.y = t;
    const f = Math.floor(t * 10);
    if (f === last) return;
    last = f;
    const c = wall.ctx, w = 512, h = 180;
    c.fillStyle = '#05060c';
    c.fillRect(0, 0, w, h);
    // iki takım renginde çapraz akan şeritler
    for (let i = 0; i < 9; i++) {
      const x = ((i * 70 + t * 50) % (w + 140)) - 70;
      c.fillStyle = i % 2 ? 'rgba(255,48,64,0.75)' : 'rgba(32,216,255,0.75)';
      c.beginPath();
      c.moveTo(x, h);
      c.lineTo(x + 28, h);
      c.lineTo(x + 28 + 60, 0);
      c.lineTo(x + 60, 0);
      c.closePath();
      c.fill();
    }
    c.fillStyle = 'rgba(5,6,12,0.55)';
    c.fillRect(110, 40, 292, 100);
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.font = '800 40px system-ui, sans-serif';
    c.fillText('FINALS', w / 2, 88);
    c.font = '700 20px system-ui, sans-serif';
    c.fillStyle = '#ff7080';
    c.fillText('TAKIM A', 190, 126);
    c.fillStyle = '#7fe8ff';
    c.fillText('TAKIM B', 322, 126);
    wall.t.needsUpdate = true;
    pylons.forEach(({ tx, s }) => {
      const cc = tx.ctx;
      cc.fillStyle = s < 0 ? '#2a0810' : '#06202a';
      cc.fillRect(0, 0, 128, 512);
      cc.fillStyle = s < 0 ? 'rgba(255,48,64,0.8)' : 'rgba(32,216,255,0.8)';
      for (let k = 0; k < 10; k++) cc.fillRect(10, ((t * 90 + k * 55) % 512), 108, 10);
      tx.t.needsUpdate = true;
    });
    // seyirci ekranı: sahte oyun arayüzü (mini harita + skor + kill feed)
    const hc = hud.ctx;
    hc.fillStyle = '#0a0e14';
    hc.fillRect(0, 0, 512, 288);
    hc.fillStyle = '#16202c';
    hc.fillRect(160, 40, 192, 192);
    hc.strokeStyle = '#2d4a63';
    for (let i = 0; i < 6; i++) hc.strokeRect(160 + i * 6, 40 + i * 6, 192 - i * 12, 192 - i * 12);
    const bx = 256 + Math.sin(t * 0.9) * 60, by = 136 + Math.cos(t * 0.7) * 50;
    hc.fillStyle = '#ff3040'; hc.beginPath(); hc.arc(bx, by, 7, 0, 7); hc.fill();
    hc.fillStyle = '#20d8ff'; hc.beginPath(); hc.arc(512 - bx + 0, 288 - by, 7, 0, 7); hc.fill();
    hc.fillStyle = '#fff'; hc.font = '800 34px ui-monospace, monospace'; hc.textAlign = 'center';
    hc.fillText(`${8 + (Math.floor(t / 9) % 6)}  :  ${7 + (Math.floor(t / 11) % 6)}`, 256, 26);
    hc.font = '600 14px ui-monospace, monospace'; hc.textAlign = 'right'; hc.fillStyle = '#ff8090';
    hc.fillText('A-3 ► B-5', 500, 120 + ((t * 20) % 30));
    hud.t.needsUpdate = true;
  });
}
