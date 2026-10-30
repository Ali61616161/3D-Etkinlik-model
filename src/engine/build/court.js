import * as THREE from 'three';
import { Batch } from '../batch.js';
import { courtTexture, ledRibbonTexture } from '../textures.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { tex: t, ctx, canvas: c };
}

/**
 * Basketbol düzeni (Pozitif / Euroleague fotoğraflarına göre): FIBA parkesi, yeşil gövdeli pota sehpaları
 * (sarı-siyah uyarı bantlı dolgu), şut saati, hakem masası + yedek kulübeleri, saha çevresi LED panolar,
 * asma LED küp (alt ışık halkalı) ve köşe skorbordları. Maç saati ve skor canlı akar.
 */
export function buildCourt(ctx) {
  const { config, mats, groups, anim, state } = ctx;
  const court = config.configurations.basketball.court;
  const root = groups.basketball;
  const hl = court.length / 2;
  const b = new Batch();

  // ── Parke (17×30 m, siyah çevreli doku) ───────────────────────────────────────
  const tex = courtTexture(court);
  const courtMat = new THREE.MeshPhysicalMaterial({
    map: tex,
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(17, 30).rotateX(-Math.PI / 2), courtMat);
  plane.position.set(0, 0.012, court.centerZ);
  plane.receiveShadow = true;
  root.add(plane);

  // ── Pota sehpaları ────────────────────────────────────────────────────────────
  const boardTex = canvasTex(256, 150, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.strokeRect(3, 3, w - 6, h - 6);
    c.lineWidth = 4;
    const iw = (0.59 / 1.8) * w, ih = (0.45 / 1.05) * h;
    c.strokeRect((w - iw) / 2, h - (0.15 / 1.05) * h - ih, iw, ih);
  }).tex;
  const boardMat = new THREE.MeshPhysicalMaterial({
    map: boardTex, color: 0xdfeeff, transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide,
  });
  const netTex = canvasTex(64, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2.5;
    for (let i = -h; i < w + h; i += 16) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke();
      c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke();
    }
  }).tex;
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
  netTex.repeat.set(3, 1);
  const netMat = new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, color: 0xf2f2f2 });
  const clockTex = canvasTex(128, 64, (c, w, h) => {
    c.fillStyle = '#070707';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff3b2f';
    c.font = '800 46px ui-monospace, monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('24', w / 2, h / 2 + 2);
  }).tex;
  const clockMat = new THREE.MeshBasicMaterial({ map: clockTex, toneMapped: false, color: new THREE.Color(1.4, 1.4, 1.4) });

  const cyl = (key, r0, r1, h, x, y, z, seg = 18) => {
    const g = new THREE.CylinderGeometry(r0, r1, h, seg);
    b.geometry(key, g, x, y, z);
    g.dispose();
  };

  for (const s of [-1, 1]) {
    const baseZ = s * (hl + 2.3);
    const boardZ = s * (hl - 1.2);
    const rimZ = s * (hl - 1.575);
    // taban: siyah ağır kızak + sarı-siyah uyarı bantlı dolgu
    b.box('black', 2.5, 0.42, 1.5, 0, 0.21, baseZ);
    b.box('black', 0.6, 0.35, 2.4, -0.95, 0.2, baseZ - s * 0.2);
    b.box('black', 0.6, 0.35, 2.4, 0.95, 0.2, baseZ - s * 0.2);
    b.box('hazard', 1.0, 1.35, 0.55, 0, 1.08, baseZ - s * 0.28);
    b.box('hoopPad', 0.8, 1.2, 0.08, 0, 1.12, baseZ - s * 0.58);
    // direk (yeşil, hafif konik) + kol
    cyl('hoopPad', 0.13, 0.17, 4.0, 0, 2.3, baseZ + s * 0.05);
    b.bar('hoopPad', [0, 3.5, baseZ], [0, 3.55, boardZ + s * 0.06], 0.24, 0.28);
    b.bar('steel', [0, 3.15, baseZ], [0, 3.4, boardZ + s * 0.08], 0.08, 0.08);
    // panya çerçevesi + çember bağlantısı
    b.box('steelLight', 1.86, 0.05, 0.07, 0, 3.98, boardZ);
    b.box('steelLight', 1.86, 0.05, 0.07, 0, 2.88, boardZ);
    b.box('steelLight', 0.05, 1.15, 0.07, -0.93, 3.43, boardZ);
    b.box('steelLight', 0.05, 1.15, 0.07, 0.93, 3.43, boardZ);
    b.box('rim', 0.14, 0.05, 0.22, 0, 3.03, boardZ - s * 0.13);
    // şut saati (panyanın üstünde, sahaya dönük)
    b.box('black', 1.1, 0.62, 0.22, 0, 4.4, boardZ + s * 0.2);
    const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), clockMat);
    clock.position.set(0, 4.4, boardZ - s * 0.0);
    clock.rotation.y = s > 0 ? Math.PI : 0;
    root.add(clock);

    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.05), boardMat);
    board.position.set(0, 3.43, boardZ);
    board.rotation.y = s > 0 ? Math.PI : 0;
    board.renderOrder = 2;
    root.add(board);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.012, 10, 32), mats.rim);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 3.05, rimZ);
    ring.castShadow = true;
    root.add(ring);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.13, 0.42, 16, 1, true), netMat);
    net.position.set(0, 2.84, rimZ);
    root.add(net);
  }

  // ── Hakem masası, monitörler, sandalyeler ─────────────────────────────────────
  b.box('black', 0.8, 0.76, 5.2, 8.9, 0.38, 0);
  b.box('maple', 0.92, 0.04, 5.3, 8.9, 0.78, 0);
  b.box('lampCool', 0.02, 0.07, 4.7, 8.48, 0.5, 0);
  for (let i = -2; i <= 2; i++) {
    b.box('black', 0.3, 0.02, 0.4, 8.95, 0.81, i * 0.95);
    b.box('black', 0.02, 0.28, 0.4, 9.08, 0.95, i * 0.95, 0, 0, -0.25);
    b.box('black', 0.42, 0.45, 0.42, 9.8, 0.25, i * 0.95); // sandalye
    b.box('black', 0.06, 0.5, 0.42, 10.0, 0.7, i * 0.95);
  }
  // Yedek kulübeleri: sıralı sandalyeler, yeşil mat
  for (const s of [-1, 1]) {
    b.box('benchMat', 1.7, 0.02, 6.2, 9.5, 0.012, s * 6.3);
    for (let i = 0; i < 10; i++) {
      const z = s * (3.7 + i * 0.52);
      b.box('black', 0.42, 0.06, 0.44, 9.85, 0.42, z);
      b.box('black', 0.04, 0.3, 0.44, 10.04, 0.62, z);
      b.box('steel', 0.05, 0.4, 0.05, 9.85, 0.2, z);
    }
  }
  // Top arabası
  b.box('steel', 0.8, 0.05, 0.6, 8.4, 0.6, -10.0);
  b.box('steel', 0.8, 0.05, 0.6, 8.4, 0.15, -10.0);
  for (const [dx, dz] of [[-0.38, -0.28], [0.38, -0.28], [-0.38, 0.28], [0.38, 0.28]]) b.box('steel', 0.04, 0.6, 0.04, 8.4 + dx, 0.3, -10.0 + dz);
  const ballGeo = new THREE.SphereGeometry(0.12, 14, 10);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xd2641a, roughness: 0.75 });
  const balls = new THREE.InstancedMesh(ballGeo, ballMat, 6);
  const dm = new THREE.Object3D();
  for (let i = 0; i < 6; i++) {
    dm.position.set(8.4 + ((i % 3) - 1) * 0.25, 0.75, -10.0 + (Math.floor(i / 3) - 0.5) * 0.3);
    dm.updateMatrix();
    balls.setMatrixAt(i, dm.matrix);
  }
  root.add(balls);

  // ── Saha çevresi LED reklam panoları (kayan yazı, hafif açılı) ─────────────────
  const adTex = ledRibbonTexture('VW ARENA  ★  İSTANBUL  ★  BASKET', '#9fe8ff');
  adTex.repeat.set(2, 1);
  const adMat = new THREE.MeshBasicMaterial({ map: adTex, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) });
  const adBoard = (len, x, z, ry) => {
    const g = new THREE.PlaneGeometry(len, 0.88);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 6));
    const m = new THREE.Mesh(g, adMat);
    m.position.set(x, 0.5, z);
    m.rotation.set(-0.12, ry, 0, 'YXZ'); // hafif geriye yatık, seyirciye/kameraya okunur
    root.add(m);
    b.box('black', len + 0.1, 0.96, 0.1, x - Math.sin(ry) * 0.06, 0.48, z - Math.cos(ry) * 0.06, ry);
  };
  adBoard(13.2, 0, hl + 0.95, Math.PI);
  adBoard(13.2, 0, -hl - 0.95, 0);
  adBoard(18, -8.4, 0, Math.PI / 2);
  adBoard(4.2, 8.4, -11.6, -Math.PI / 2);
  adBoard(4.2, 8.4, 11.6, -Math.PI / 2);

  // ── Asma LED küp: dört yüz + alt ışık halkası (Pozitif fotoğrafı) ───────────────
  const faces = [0, 1, 2, 3].map(() => canvasTex(512, 288, () => {}));
  const drawFace = (f, i, t) => {
    const c = f.ctx, w = 512, h = 288;
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#05080c');
    g.addColorStop(1, '#0a1c16');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const mins = Math.max(0, 9 - (Math.floor(t / 60) % 10)), secs = 59 - (Math.floor(t) % 60);
    const home = 52 + Math.floor(t / 7) * 2 + (Math.floor(t / 11) % 2);
    const away = 49 + Math.floor(t / 9) * 2;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (i % 2 === 0) {
      c.fillStyle = '#5cff9d';
      c.font = '800 54px system-ui, sans-serif';
      c.fillText('VW ARENA', w / 2, 70);
      c.fillStyle = '#fff';
      c.font = '700 96px ui-monospace, monospace';
      c.fillText(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, w / 2, 170);
      c.fillStyle = '#9fe8ff';
      c.font = '600 34px system-ui, sans-serif';
      c.fillText('3. PERİYOT', w / 2, 245);
    } else {
      c.fillStyle = '#fff';
      c.font = '800 44px system-ui, sans-serif';
      c.fillText('EV SAHİBİ        KONUK', w / 2, 58);
      c.fillStyle = '#5cff9d';
      c.font = '800 110px ui-monospace, monospace';
      c.fillText(`${home}`, w * 0.27, 160);
      c.fillText(`${away}`, w * 0.73, 160);
      c.fillStyle = '#9fe8ff';
      c.font = '600 32px system-ui, sans-serif';
      c.fillText('BASKET !!!', w / 2, 245);
    }
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (let y = 0; y < h; y += 3) c.fillRect(0, y + 2, w, 1);
    f.tex.needsUpdate = true;
  };
  faces.forEach((f, i) => drawFace(f, i, 0));
  const faceMat = (f) => new THREE.MeshBasicMaterial({ map: f.tex, toneMapped: false, color: new THREE.Color(1.35, 1.35, 1.35) });
  // BoxGeometry yüz sırası: +x, −x, +y, −y, +z, −z
  const cubeMats = [faceMat(faces[0]), faceMat(faces[1]), mats.black, mats.black, faceMat(faces[2]), faceMat(faces[3])];
  const cubeY = 11.6;
  const cube = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.5, 4.4), cubeMats);
  cube.position.set(0, cubeY, court.centerZ);
  root.add(cube);
  b.box('black', 4.6, 0.2, 4.6, 0, cubeY + 1.35, court.centerZ);
  b.box('black', 4.55, 0.1, 4.55, 0, cubeY - 1.3, court.centerZ);
  const discMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.35, 2.2), toneMapped: false });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.08, 48), discMat);
  disc.position.set(0, cubeY - 1.42, court.centerZ);
  root.add(disc);
  const ringMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.95, 0.22, 48, 1, true), mats.black);
  ringMesh.position.set(0, cubeY - 1.38, court.centerZ);
  root.add(ringMesh);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    b.bar('steel', [x, cubeY + 1.4, z + court.centerZ], [x * 1.7, 19.8, z * 1.7 + court.centerZ], 0.04);
  }

  // ── Köşe skorbordları ─────────────────────────────────────────────────────────
  const sb = canvasTex(512, 256, () => {});
  const drawSb = (t) => {
    const c = sb.ctx;
    c.fillStyle = '#040806';
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = '#41ff8a';
    c.font = '800 96px ui-monospace, monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const mins = Math.max(0, 9 - (Math.floor(t / 60) % 10)), secs = 59 - (Math.floor(t) % 60);
    c.fillText(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, 256, 80);
    c.font = '800 80px ui-monospace, monospace';
    c.fillText(`${52 + Math.floor(t / 7) * 2}   ${49 + Math.floor(t / 9) * 2}`, 256, 190);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (let y = 0; y < 256; y += 3) c.fillRect(0, y + 2, 512, 1);
    sb.tex.needsUpdate = true;
  };
  drawSb(0);
  const sbMat = new THREE.MeshBasicMaterial({ map: sb.tex, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), sbMat);
    m.position.set(s * 17.5, 8.4, config.hall.ring.stageWallZ + 0.8);
    m.rotation.y = -s * 0.5;
    root.add(m);
    b.box('black', 3.5, 1.8, 0.14, m.position.x + s * 0.01, m.position.y, m.position.z - 0.09, -s * 0.5);
  }

  root.add(b.build(mats, { uvScale: { hazard: 1.4 } }));

  let lastClock = -1;
  anim.push((t) => {
    if (state.config !== 'basketball') return;
    adTex.offset.x = (t * 0.04) % 1;
    const sec = Math.floor(t);
    if (sec !== lastClock) {
      lastClock = sec;
      faces.forEach((f, i) => drawFace(f, i, t));
      drawSb(t);
    }
  });
}
