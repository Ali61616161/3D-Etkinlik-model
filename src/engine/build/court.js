import * as THREE from 'three';
import { Batch } from '../batch.js';
import { courtTexture, ledPanelTexture, ledRibbonTexture } from '../textures.js';

/** Basketbol düzeni: FIBA parkesi, potalar, masa/yedek kulübesi, asma LED küp, skorbordlar. */
export function buildCourt(ctx) {
  const { config, mats, groups, anim, state } = ctx;
  const court = config.configurations.basketball.court;
  const root = groups.basketball;
  const hl = court.length / 2;
  const b = new Batch();

  // Parke (17×30 m siyah çevreli doku)
  const tex = courtTexture(court);
  const courtMat = new THREE.MeshPhysicalMaterial({
    map: tex,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(17, 30).rotateX(-Math.PI / 2), courtMat);
  plane.position.set(0, 0.012, court.centerZ);
  plane.receiveShadow = true;
  root.add(plane);

  // Potalar (hareketli sehpa): taban, direk, kol, panya, çember, file
  for (const s of [-1, 1]) {
    const baseZ = s * (hl + 2.3);
    const boardZ = s * (hl - 1.2);
    const rimZ = s * (hl - 1.575);
    b.box('black', 2.4, 0.45, 1.4, 0, 0.225, baseZ);
    b.box('hoopPad', 0.9, 1.3, 0.55, 0, 1.1, baseZ - s * 0.15);
    b.box('steelLight', 0.22, 3.9, 0.22, 0, 1.95, baseZ);
    b.bar('steelLight', [0, 3.55, baseZ], [0, 3.55, boardZ + s * 0.05], 0.22, 0.26);
    b.box('boardGlass', 1.8, 1.05, 0.05, 0, 3.425, boardZ);
    b.box('steelLight', 1.86, 0.04, 0.06, 0, 3.95, boardZ);
    b.box('steelLight', 1.86, 0.04, 0.06, 0, 2.9, boardZ);
    b.box('steelLight', 0.04, 1.05, 0.06, -0.93, 3.425, boardZ);
    b.box('steelLight', 0.04, 1.05, 0.06, 0.93, 3.425, boardZ);
    b.box('rim', 0.12, 0.05, 0.2, 0, 3.03, boardZ - s * 0.12);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.012, 8, 28), mats.rim);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 3.05, rimZ);
    root.add(ring);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.14, 0.42, 14, 3, true), mats.net);
    net.position.set(0, 2.84, rimZ);
    root.add(net);
  }

  // Hakem masası ve yedek kulübeleri (sağ kenar)
  b.box('black', 0.8, 0.78, 5.2, 8.9, 0.39, 0);
  b.box('maple', 0.9, 0.04, 5.3, 8.9, 0.8, 0);
  b.box('lampCool', 0.02, 0.1, 4.6, 8.49, 0.5, 0);
  for (const s of [-1, 1]) {
    b.box('black', 0.5, 0.45, 5.4, 9.9, 0.225, s * 6.1);
    b.box('black', 0.08, 0.5, 5.4, 10.2, 0.7, s * 6.1);
  }

  // Asma LED küp (merkez)
  const faces = [
    ['VW ARENA', 'BASKET'],
    ['İSTANBUL', 'MAÇ GÜNÜ'],
    ['VW ARENA', 'BASKET'],
    ['İSTANBUL', 'MAÇ GÜNÜ'],
  ];
  const mkFace = (l) =>
    new THREE.MeshBasicMaterial({
      map: ledPanelTexture(
        [
          { text: l[0], size: 62, accent: true },
          { text: l[1], size: 44, weight: 600 },
        ],
        { w: 512, h: 288 },
      ),
      toneMapped: false,
      color: new THREE.Color(1.35, 1.35, 1.35),
    });
  const cubeMats = [mkFace(faces[0]), mkFace(faces[1]), mats.black, mats.black, mkFace(faces[2]), mkFace(faces[3])];
  // BoxGeometry sırası: +x, −x, +y, −y, +z, −z
  const cube = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.5, 4.4), cubeMats);
  cube.position.set(0, 11.4, court.centerZ);
  root.add(cube);
  b.box('black', 4.7, 0.22, 4.7, 0, 12.7, court.centerZ);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    b.bar('steel', [x, 12.8, z + court.centerZ], [x * 1.6, 19.8, z * 1.6 + court.centerZ], 0.04);
  }
  // Alt halka ekran (yuvarlak band hissi)
  b.box('black', 4.7, 0.16, 4.7, 0, 10.1, court.centerZ);

  // Köşe skorbordları (2 adet): sahne ucu duvarında yeşil gösterge
  const sbTex = ledPanelTexture(
    [
      { text: '00 : 00', size: 80, accent: true },
      { text: '0   0', size: 70, weight: 700 },
    ],
    { w: 512, h: 256, accent: '#41ff8a' },
  );
  const sbMat = new THREE.MeshBasicMaterial({ map: sbTex, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) });
  for (const s of [-1, 1]) {
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), sbMat);
    sb.position.set(s * 17.5, 8.4, config.hall.ring.stageWallZ + 0.8);
    sb.rotation.y = -s * 0.5;
    root.add(sb);
    b.box('black', 3.5, 1.8, 0.14, sb.position.x + s * 0.01, sb.position.y, sb.position.z - 0.09, -s * 0.5);
  }

  // Saha çevresi LED reklam panoları (kayan yazı): iki baz çizgisi + sol kenar
  const adTex = ledRibbonTexture('VW ARENA  ★  İSTANBUL  ★  BASKET', '#9fe8ff');
  adTex.repeat.set(2, 1);
  const adMat = new THREE.MeshBasicMaterial({ map: adTex, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) });
  const adBoard = (len, x, z, ry) => {
    const g = new THREE.PlaneGeometry(len, 0.88);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 6));
    const m = new THREE.Mesh(g, adMat);
    m.position.set(x, 0.5, z);
    m.rotation.y = ry;
    root.add(m);
    b.box('black', len + 0.1, 0.96, 0.1, x - Math.sin(ry) * 0.06, 0.48, z - Math.cos(ry) * 0.06, ry);
  };
  adBoard(13.2, 0, hl + 0.95, Math.PI); // güney baz (yüzü sahaya)
  adBoard(13.2, 0, -hl - 0.95, 0);
  adBoard(9.5, -8.6, 0, Math.PI / 2);

  root.add(b.build(mats, {}));
  anim.push((t) => {
    if (state.config === 'basketball') adTex.offset.x = (t * 0.04) % 1;
  });
}
