import * as THREE from 'three';
import { Batch } from '../batch.js';
import { truss } from './stage.js';

function animTex(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { c, ctx: c.getContext('2d'), t };
}

/**
 * Gala / ödül / moda: merkez podyum (runway), dev LED perde ve yan sütunlar, masa örtülü yuvarlak masalar,
 * tavandan sarkan halka truss + LED küp, mavi huzmeler.
 * (Referans: Pozitif "Men of the Year" ve defile kurulumları)
 */
export function buildGala(ctx) {
  const { config, mats, anim, state } = ctx;
  const id = 'gala';
  const st = config.configurations[id].stage;
  const root = ctx.groupFor([id]);
  const b = new Batch();
  const yS = st.height;
  const zc = st.z0 + st.depth / 2;

  const glow = (r, g, bl) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, bl), toneMapped: false });
  const edgeMat = glow(2.2, 1.7, 2.6);
  const edgeB = new Batch();

  // Ana sahne + podyum (T biçimi): beyaz parlak üst, kenarda LED şerit
  b.box('black', st.width, yS, st.depth, 0, yS / 2, zc);
  b.box('white', st.width, 0.03, st.depth, 0, yS + 0.015, zc);
  const rwW = 4.2, rwLen = 21;
  const rwZ = st.z0 + st.depth + rwLen / 2 - 0.5;
  b.box('black', rwW, yS - 0.04, rwLen, 0, (yS - 0.04) / 2, rwZ);
  b.box('white', rwW, 0.06, rwLen, 0, yS - 0.01, rwZ);
  for (const s of [-1, 1]) edgeB.box('edge', 0.06, 0.06, rwLen, s * (rwW / 2 + 0.03), yS - 0.02, rwZ);
  edgeB.box('edge', rwW + 0.1, 0.06, 0.06, 0, yS - 0.02, rwZ + rwLen / 2);
  // Runway ucunda yuvarlak podyum (üç basamak, ışıklı kenarlı) — "Men of the Year" fotoğrafındaki gibi
  const rz = rwZ + rwLen / 2 + 0.2;
  for (let k = 0; k < 3; k++) {
    const g = new THREE.CylinderGeometry(3.3 - k * 0.7, 3.3 - k * 0.7, 0.3, 48);
    b.geometry(k === 2 ? 'white' : 'black', g, 0, 0.15 + k * 0.3, rz);
    g.dispose();
    const ring = new THREE.TorusGeometry(3.3 - k * 0.7, 0.03, 6, 64).rotateX(Math.PI / 2);
    edgeB.geometry('edge', ring, 0, 0.3 + k * 0.3, rz);
    ring.dispose();
  }

  // Masalar: örtülü gövde + etek + merkez parçası (sandalyeler koltuk olarak ayrı çizilir)
  const tribune = config.tribunes.find((t) => t.kind === 'tables');
  const glowBatch = new Batch();
  for (const tb of tribune.tables) {
    const [x, z] = tb.center;
    const top = new THREE.CylinderGeometry(0.92, 0.92, 0.05, 32);
    b.geometry('white', top, x, 0.76, z);
    top.dispose();
    const skirt = new THREE.CylinderGeometry(0.9, 1.0, 0.75, 32, 1, true);
    b.geometry('white', skirt, x, 0.38, z);
    skirt.dispose();
    const stem = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8);
    b.geometry('steelLight', stem, x, 0.97, z);
    stem.dispose();
    glowBatch.box('glow', 0.18, 0.18, 0.18, x, 1.2, z);
  }

  // Arka LED duvar + yan sütunlar (animasyonlu)
  const wall = animTex(512, 180);
  const wallMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 7),
    new THREE.MeshBasicMaterial({ map: wall.t, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) }),
  );
  wallMesh.position.set(0, yS + 0.4 + 3.5, st.z0 + 0.7);
  root.add(wallMesh);
  b.box('black', 20.3, 7.3, 0.2, 0, yS + 0.4 + 3.5, st.z0 + 0.55);
  const cols = [];
  for (const s of [-1, 1]) {
    const tx = animTex(128, 512);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 9.6),
      new THREE.MeshBasicMaterial({ map: tx.t, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }),
    );
    m.position.set(s * 12.8, yS + 4.8, st.z0 + 1.6);
    m.rotation.y = -s * 0.2;
    root.add(m);
    b.box('black', 2.5, 9.7, 0.18, m.position.x, m.position.y, m.position.z - 0.12, -s * 0.2);
    cols.push(tx);
  }

  // Tavan: halka truss (dairesel) + hareketli kafalar + LED küp (alt ışık halkalı)
  const ringZ = rz - 3;
  const ringY = 13.2;
  const ringGeo = new THREE.TorusGeometry(5.2, 0.12, 8, 72).rotateX(Math.PI / 2);
  b.geometry('steel', ringGeo, 0, ringY, ringZ);
  ringGeo.dispose();
  const ringGeo2 = new THREE.TorusGeometry(5.2, 0.12, 8, 72).rotateX(Math.PI / 2);
  b.geometry('steel', ringGeo2, 0, ringY - 0.9, ringZ);
  ringGeo2.dispose();
  const lampB = new Batch();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = Math.cos(a) * 5.2, z = ringZ + Math.sin(a) * 5.2;
    b.bar('steel', [x, ringY, z], [x, ringY - 0.9, z], 0.05);
    b.box('black', 0.3, 0.1, 0.3, x, ringY - 1.0, z);
    const hg = new THREE.CylinderGeometry(0.1, 0.14, 0.34, 12);
    b.geometry('black', hg, x, ringY - 1.3, z);
    hg.dispose();
    lampB.box('lamp', 0.22, 0.03, 0.22, x, ringY - 1.5, z);
  }
  for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    b.bar('steel', [Math.cos(a) * 5.2, ringY + 0.1, ringZ + Math.sin(a) * 5.2], [Math.cos(a) * 3, 19.2, ringZ + Math.sin(a) * 3], 0.04);
  }
  const cubeFace = animTex(256, 200);
  const cubeMat = new THREE.MeshBasicMaterial({ map: cubeFace.t, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 3.6), [cubeMat, cubeMat, mats.black, mats.black, cubeMat, cubeMat]);
  cube.position.set(0, ringY - 3.3, ringZ);
  root.add(cube);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 40), glow(2.4, 2.3, 2.2));
  disc.position.set(0, ringY - 4.55, ringZ);
  root.add(disc);

  // Mavi huzmeler (sabit, hafif salınan)
  const beams = [];
  const coneGeo = new THREE.CylinderGeometry(0.05, 1.6, 14, 20, 1, true);
  coneGeo.translate(0, -7, 0);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.6 + (i % 2) * 0.1, 0.9, 0.55),
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const piv = new THREE.Group();
    piv.position.set(Math.cos(a) * 5.2, ringY - 1.5, ringZ + Math.sin(a) * 5.2);
    piv.add(new THREE.Mesh(coneGeo, m));
    root.add(piv);
    beams.push({ piv, a });
  }

  root.add(b.build(mats, { uvScale: {} }));
  root.add(edgeB.build({ edge: edgeMat }, {}));
  root.add(glowBatch.build({ glow: glow(2.6, 1.9, 1.0) }, {}));
  root.add(lampB.build({ lamp: glow(2.0, 2.2, 2.6) }, {}));

  let last = -1;
  anim.push((t) => {
    if (state.config !== id) return;
    for (const b2 of beams) {
      b2.piv.rotation.z = Math.cos(b2.a) * (0.38 + Math.sin(t * 0.5 + b2.a) * 0.12);
      b2.piv.rotation.x = -Math.sin(b2.a) * (0.38 + Math.sin(t * 0.5 + b2.a) * 0.12);
    }
    const f = Math.floor(t * 8);
    if (f === last) return;
    last = f;
    // ana LED duvar: akan renk bantları + başlık
    const c = wall.ctx, w = 512, h = 180;
    const hue = (t * 14) % 360;
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, `hsl(${hue},80%,38%)`);
    g.addColorStop(1, `hsl(${(hue + 70) % 360},85%,48%)`);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.lineWidth = 3;
    for (let i = -4; i < 14; i++) {
      c.beginPath();
      c.moveTo(i * 60 + ((t * 40) % 60), 0);
      c.lineTo(i * 60 + 90 + ((t * 40) % 60), h);
      c.stroke();
    }
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.font = '800 46px system-ui, sans-serif';
    c.fillText('GALA GECESİ', w / 2, 92);
    c.font = '600 22px system-ui, sans-serif';
    c.fillText('ÖDÜL  ★  DEFİLE  ★  KUTLAMA', w / 2, 134);
    wall.t.needsUpdate = true;
    cols.forEach((tx, i) => {
      const cc = tx.ctx;
      const gg = cc.createLinearGradient(0, 0, 0, 512);
      gg.addColorStop(0, `hsl(${(hue + 160 + i * 40) % 360},85%,30%)`);
      gg.addColorStop(1, `hsl(${(hue + 220 + i * 40) % 360},85%,50%)`);
      cc.fillStyle = gg;
      cc.fillRect(0, 0, 128, 512);
      cc.fillStyle = 'rgba(255,255,255,0.3)';
      for (let k = 0; k < 8; k++) cc.fillRect(8, ((t * 60 + k * 70) % 512), 112, 6);
      tx.t.needsUpdate = true;
    });
    const cc = cubeFace.ctx;
    cc.fillStyle = '#0a0f1a';
    cc.fillRect(0, 0, 256, 200);
    cc.fillStyle = '#fff';
    cc.textAlign = 'center';
    cc.font = '800 54px system-ui, sans-serif';
    cc.fillText('GALA', 128, 90);
    cc.font = '700 30px system-ui, sans-serif';
    cc.fillStyle = '#8fd0ff';
    cc.fillText('VW ARENA', 128, 140);
    cubeFace.t.needsUpdate = true;
  });
}
