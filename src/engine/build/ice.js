import * as THREE from 'three';
import { Batch } from '../batch.js';

function tex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { t, ctx, c };
}

/**
 * Buz gösterisi (ör. "Ice Age Live", 2015): zemini kaplayan buz pisti, beyaz bantlar + cam, Zamboni, sahne ucunda dev LED
 * dekor perdesi ve soğuk ışık. Resmî sayfa: ana salon "buz pistine" dönüşebilir. Pist ölçüsü tahminidir (22 × 44 m).
 */
export function buildIce(ctx) {
  const { config, mats, anim, state } = ctx;
  const id = 'ice';
  const cfg = config.configurations[id];
  const rk = cfg.rink;
  const root = ctx.groupFor([id]);
  const b = new Batch();

  // Buz yüzeyi: çizgi dokusu + parlak malzeme
  const W = rk.width, L = rk.length;
  const ppm = 24;
  const ice = tex(W * ppm, L * ppm, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#e4f1ff');
    g.addColorStop(1, '#cfe3f7');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // çizik/iz dokusu
    c.strokeStyle = 'rgba(120,160,200,0.18)';
    c.lineWidth = 1.2;
    for (let i = 0; i < 160; i++) {
      c.beginPath();
      const x = Math.random() * w, y = Math.random() * h;
      c.moveTo(x, y);
      c.quadraticCurveTo(x + (Math.random() - 0.5) * 200, y + (Math.random() - 0.5) * 200, x + (Math.random() - 0.5) * 400, y + (Math.random() - 0.5) * 400);
      c.stroke();
    }
    // pist çizgileri (hokey benzeri): orta çizgi, daire, uç çizgileri
    c.lineWidth = 4;
    c.strokeStyle = 'rgba(200,40,50,0.55)';
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    c.strokeStyle = 'rgba(40,90,200,0.5)';
    c.beginPath(); c.arc(w / 2, h / 2, 4.5 * ppm, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(0, h * 0.25); c.lineTo(w, h * 0.25); c.moveTo(0, h * 0.75); c.lineTo(w, h * 0.75); c.stroke();
    c.fillStyle = 'rgba(40,90,200,0.45)';
    c.beginPath(); c.arc(w / 2, h / 2, 14, 0, Math.PI * 2); c.fill();
  });
  const iceMat = new THREE.MeshPhysicalMaterial({
    map: ice.t, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.6, color: 0xffffff,
  });
  const rink = new THREE.Mesh(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2), iceMat);
  rink.position.set(0, 0.03, rk.centerZ);
  rink.receiveShadow = true;
  root.add(rink);

  // Bantlar: beyaz gövde, ince sarı üst, alt siyah süpürgelik; üstünde cam panel; kapı boşlukları (köşe)
  const hl = L / 2, hw = W / 2, cz = rk.centerZ;
  const board = (x, z, len, ry) => {
    b.box('white', len, 1.05, 0.12, x, 0.525, z, ry);
    b.box('yellow', len + 0.04, 0.05, 0.16, x, 1.07, z, ry);
    b.box('black', len, 0.12, 0.14, x, 0.07, z, ry);
    b.box('glass', len, 0.9, 0.04, x, 1.55, z, ry);
    b.box('steelLight', len, 0.04, 0.06, x, 2.0, z, ry);
  };
  board(0, cz - hl, W, 0);
  board(0, cz + hl, W, 0);
  board(-hw, cz, L, Math.PI / 2);
  board(hw, cz, L, Math.PI / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('white', 0.9, 1.05, 0.9, sx * (hw - 0.2), 0.525, cz + sz * (hl - 0.2), Math.PI / 4);
  // Giriş kapısı (sağ uzun kenar, orta) + Zamboni (buz bakım aracı) kapı önünde
  b.box('doorDark', 0.1, 1.1, 3.2, hw + 0.1, 0.55, cz + 2);
  b.box('white', 1.9, 1.3, 3.0, hw + 2.6, 0.7, cz + 2);
  b.box('blackGloss', 1.95, 0.5, 3.05, hw + 2.6, 0.55, cz + 2);
  b.box('yellow', 1.9, 0.2, 3.0, hw + 2.6, 1.45, cz + 2);
  b.box('black', 1.2, 0.8, 1.0, hw + 2.5, 1.7, cz + 1.2);
  for (const dz of [-1.0, 1.0]) b.bar('steel', [hw + 1.6, 0.25, cz + 2 + dz], [hw + 3.6, 0.25, cz + 2 + dz], 0.4);

  // Dekor: sahne ucunda beyaz "buzul" kayalıkları (kaba şekiller) + LED perde
  const decor = new THREE.MeshStandardMaterial({ color: 0xeaf4ff, roughness: 0.55, metalness: 0, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const r = 0.8 + Math.random() * 1.8;
    const g = new THREE.DodecahedronGeometry(r, 0);
    const m = new THREE.Mesh(g, decor);
    m.position.set(-hw + 0.6 + (i / 13) * (2 * hw - 1.2), r * 0.7, cz - hl - 1.6 - Math.random() * 1.2);
    m.scale.set(1, 0.8 + Math.random() * 0.9, 1);
    root.add(m);
  }
  const screen = tex(512, 200, () => {});
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), new THREE.MeshBasicMaterial({ map: screen.t, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }));
  sm.position.set(0, 7.2, config.hall.ring.stageWallZ + 0.9);
  root.add(sm);
  b.box('black', 20.3, 8.3, 0.2, 0, 7.2, config.hall.ring.stageWallZ + 0.72);
  // Üst truss + kafalar
  const lampB = new Batch();
  for (const z of [-14, -2, 10]) {
    b.box('steel', 20, 0.35, 0.35, 0, 13.4, z);
    for (let i = 0; i < 10; i++) {
      const x = -9 + i * 2;
      b.box('black', 0.3, 0.1, 0.3, x, 13.1, z);
      lampB.box('lamp', 0.22, 0.03, 0.22, x, 12.7, z);
    }
    for (const x of [-9.8, 9.8]) b.bar('steel', [x, 13.5, z], [x, 15.6, z], 0.04);
  }
  root.add(b.build(mats, {}));
  root.add(lampB.build({ lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 2.3, 2.8), toneMapped: false }) }, {}));

  // Soğuk "kar" parçacıkları (yavaş düşen) — buz show ambiyansı
  const N = 260;
  const pos = new Float32Array(N * 3);
  const sd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 28;
    pos[i * 3 + 1] = Math.random() * 12;
    pos[i * 3 + 2] = cz + (Math.random() - 0.5) * 50;
    sd[i] = Math.random() * 6.28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const snow = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true }));
  snow.frustumCulled = false;
  root.add(snow);

  let last = -1;
  anim.push((t) => {
    if (state.config !== id) return;
    const p = geo.attributes.position;
    for (let i = 0; i < N; i++) {
      p.array[i * 3 + 1] -= 0.012;
      p.array[i * 3] += Math.sin(t * 0.5 + sd[i]) * 0.004;
      if (p.array[i * 3 + 1] < 0.1) p.array[i * 3 + 1] = 12;
    }
    p.needsUpdate = true;
    const f = Math.floor(t * 6);
    if (f === last) return;
    last = f;
    const c = screen.ctx;
    const g = c.createLinearGradient(0, 0, 0, 200);
    g.addColorStop(0, '#0a2a52');
    g.addColorStop(1, '#4aa0d8');
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 200);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 60; i++) c.fillRect(((i * 97 + t * 14) % 512), ((i * 53 + t * 25) % 200), 2, 2);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.font = '800 54px system-ui, sans-serif';
    c.fillText('BUZ GÖSTERİSİ', 256, 100);
    c.font = '600 22px system-ui, sans-serif';
    c.fillStyle = '#cfe9ff';
    c.fillText('ICE SHOW  ★  AİLE EĞLENCESİ', 256, 146);
    screen.t.needsUpdate = true;
  });
}
