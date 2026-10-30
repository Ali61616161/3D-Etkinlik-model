import * as THREE from 'three';
import { Batch } from '../batch.js';
import { truss } from './stage.js';

/**
 * Konferans / kurumsal toplantı: alçak platform, üç mavi LED ekran, kürsü, iki koltuk + sehpa,
 * zemin blokları (tiyatro düzeni) ve salonu küçülten siyah perde (Arkitera: "perde ile salon küçültme").
 * (Referans: Pozitif konferans kurulumu fotoğrafı — mavi LED ekranlar, beyaz sahne.)
 */
export function buildConference(ctx) {
  const { config, mats, anim, state } = ctx;
  const id = 'conference';
  const st = config.configurations[id].stage;
  const root = ctx.groupFor([id]);
  const b = new Batch();
  const yS = st.height;
  const zc = st.z0 + st.depth / 2;

  b.box('white', st.width, yS, st.depth, 0, yS / 2, zc);
  b.box('lampCool', st.width, 0.04, 0.05, 0, yS - 0.12, st.z0 + st.depth + 0.04);
  // Kürsü
  b.box('black', 1.1, 1.15, 0.6, 5.2, yS + 0.58, zc + 1.5);
  b.box('white', 0.7, 0.5, 0.02, 5.2, yS + 0.8, zc + 1.78);
  b.box('black', 0.5, 0.05, 0.3, 5.2, yS + 1.18, zc + 1.45, 0, -0.35);
  // Moderatör koltukları + sehpa
  for (const x of [-4.2, -2.8]) {
    b.box('leather', 0.8, 0.45, 0.8, x, yS + 0.3, zc + 1.6);
    b.box('leather', 0.8, 0.75, 0.15, x, yS + 0.7, zc + 1.2);
  }
  b.box('white', 0.7, 0.4, 0.7, -3.5, yS + 0.2, zc + 2.6);
  // Perde: salonu küçültür (siyah drape duvarı, kıvrımlı)
  const cg = new THREE.PlaneGeometry(31, 11, 120, 1);
  const pos = cg.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 2.4) * 0.16);
  cg.computeVertexNormals();
  const curtain = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0x0c0c0f, roughness: 1, side: THREE.DoubleSide }));
  curtain.position.set(0, 5.6, 21.2);
  root.add(curtain);
  // Ses/ışık platformu perde önünde
  b.box('black', 5.4, 0.9, 2.2, 0, 0.45, 19.4);
  b.box('steel', 5.5, 0.06, 2.3, 0, 0.93, 19.4);
  b.box('blackGloss', 3, 0.1, 0.8, 0, 1.1, 19.0);

  // Üç LED ekran (animasyonlu) + truss
  const cvs = document.createElement('canvas');
  cvs.width = 512; cvs.height = 200;
  const c = cvs.getContext('2d');
  const tx = new THREE.CanvasTexture(cvs);
  tx.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) });
  const mk = (w, h, x, y, ry, u0, u1) => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0));
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, st.z0 + 0.8 + Math.abs(x) * 0.05);
    m.rotation.y = ry;
    root.add(m);
    b.box('black', w + 0.2, h + 0.2, 0.16, m.position.x, m.position.y, m.position.z - 0.1, ry);
  };
  mk(10, 5.6, 0, yS + 4.4, 0, 0.2, 0.8);
  mk(5, 5.6, -8, yS + 4.4, 0.35, 0, 0.2);
  mk(5, 5.6, 8, yS + 4.4, -0.35, 0.8, 1);
  const towerX = st.width / 2 + 0.6;
  for (const s of [-1, 1]) truss(b, [s * towerX, yS, st.z0 + 1.2], [s * towerX, 11.5, st.z0 + 1.2], 0.45);
  truss(b, [-towerX, 11.5, st.z0 + 1.2], [towerX, 11.5, st.z0 + 1.2], 0.45);
  const lampB = new Batch();
  for (let i = 0; i < 12; i++) {
    const x = -towerX + 1 + (i * (2 * towerX - 2)) / 11;
    b.box('black', 0.3, 0.1, 0.3, x, 11.2, st.z0 + 1.2);
    lampB.box('lamp', 0.22, 0.03, 0.22, x, 10.85, st.z0 + 1.2);
  }
  root.add(b.build(mats, {}));
  root.add(lampB.build({ lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.8), toneMapped: false }) }, {}));

  let last = -1;
  anim.push((t) => {
    if (state.config !== id) return;
    const f = Math.floor(t * 4);
    if (f === last) return;
    last = f;
    const g = c.createLinearGradient(0, 0, 512, 200);
    g.addColorStop(0, '#0b2a78');
    g.addColorStop(1, '#2457d6');
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 200);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 40; i++) c.beginPath(), c.arc((i * 71 + t * 10) % 512, (i * 37) % 200, 2 + (i % 4), 0, 7), c.fill();
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.font = '800 48px system-ui, sans-serif';
    c.fillText('ZİRVE 2026', 256, 96);
    c.font = '500 22px system-ui, sans-serif';
    c.fillStyle = '#cfe0ff';
    c.fillText('KONFERANS  ★  KURUMSAL ETKİNLİK', 256, 140);
    tx.needsUpdate = true;
  });
}
