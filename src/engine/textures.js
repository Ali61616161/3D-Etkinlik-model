import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

// Deterministik rastgele (tohumlu) — her açılışta aynı doku
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Açık beton: ince gren + hafif lekeler. Renk malzemeden gelir. */
export function concreteTexture(seed = 7) {
  const [c, ctx] = canvas(512, 512);
  const r = rng(seed);
  ctx.fillStyle = '#c9c9c9';
  ctx.fillRect(0, 0, 512, 512);
  const img = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 34;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // dilatasyon / panel derzleri (her 4 m'de bir)
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, 0, 512, 3);
  ctx.fillRect(0, 0, 3, 512);
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512, rad = 20 + r() * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const a = 0.05 + r() * 0.07;
    g.addColorStop(0, r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * FIBA basketbol sahası (28×15 m) + siyah çevre (runoff). Doku 17×30 m'yi kaplar.
 * Canvas x → dünya x, canvas y → dünya z.
 */
export function courtTexture(court) {
  const W = 17, L = 30, ppm = 64;
  const [c, ctx] = canvas(W * ppm, L * ppm);
  ctx.fillStyle = '#0c0d0f';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.translate(c.width / 2, c.height / 2);
  ctx.scale(ppm, ppm);

  const hl = court.length / 2, hw = court.width / 2;
  // Parke
  ctx.fillStyle = '#dcb784';
  ctx.fillRect(-hw, -hl, court.width, court.length);
  // Tahta damarları
  const r = rng(11);
  for (let i = 0; i < 220; i++) {
    const x = -hw + (i / 220) * court.width;
    ctx.fillStyle = `rgba(${120 + r() * 40},${80 + r() * 30},${30 + r() * 20},${0.05 + r() * 0.07})`;
    ctx.fillRect(x, -hl, court.width / 220, court.length);
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`;
    ctx.fillRect(-hw + r() * court.width, -hl + r() * court.length, court.width * 0.15, 0.02);
  }

  const line = 0.05;
  const paint = '#1b1d22';
  const keyW = 4.9, ftDist = 5.8, ftR = 1.8, threeR = 6.75, cornerOff = 0.9, restR = 1.25;
  const basketZ = hl - 1.575;

  // Boyalı alanlar (yasak alan) + merkez daire
  for (const s of [-1, 1]) {
    ctx.fillStyle = paint;
    const zEnd = s * hl, zFt = s * (hl - ftDist);
    ctx.fillRect(-keyW / 2, Math.min(zEnd, zFt), keyW, Math.abs(zEnd - zFt));
    ctx.beginPath();
    ctx.arc(0, zFt, ftR, s > 0 ? Math.PI : 0, s > 0 ? 2 * Math.PI : Math.PI);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, ftR, 0, Math.PI * 2);
  ctx.fillStyle = paint;
  ctx.fill();

  ctx.strokeStyle = '#f4f4ee';
  ctx.lineWidth = line;
  ctx.lineCap = 'butt';
  ctx.strokeRect(-hw + line / 2, -hl + line / 2, court.width - line, court.length - line);
  ctx.beginPath();
  ctx.moveTo(-hw, 0);
  ctx.lineTo(hw, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, ftR, 0, Math.PI * 2);
  ctx.stroke();

  for (const s of [-1, 1]) {
    const bz = s * basketZ;
    const zFt = s * (hl - ftDist);
    // Yasak alan çizgileri
    ctx.strokeRect(-keyW / 2, Math.min(s * hl, zFt), keyW, Math.abs(s * hl - zFt));
    // Serbest atış yarım dairesi: saha içi düz, iç kısım kesik
    ctx.beginPath();
    ctx.arc(0, zFt, ftR, s > 0 ? Math.PI : 0, s > 0 ? 2 * Math.PI : Math.PI);
    ctx.stroke();
    ctx.setLineDash([0.35, 0.35]);
    ctx.beginPath();
    ctx.arc(0, zFt, ftR, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
    // Üç sayı çizgisi
    const xs = hw - cornerOff;
    const dz = Math.sqrt(threeR * threeR - xs * xs);
    const phi = Math.atan2(dz, xs);
    ctx.beginPath();
    if (s > 0) ctx.arc(0, bz, threeR, -Math.PI + phi, -phi);
    else ctx.arc(0, bz, threeR, phi, Math.PI - phi);
    ctx.stroke();
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * xs, s * hl);
      ctx.lineTo(sx * xs, bz - s * dz);
      ctx.stroke();
    }
    // Yarım daire (çarpışmasız alan)
    ctx.beginPath();
    ctx.arc(0, bz, restR, s > 0 ? Math.PI : 0, s > 0 ? 2 * Math.PI : Math.PI);
    ctx.stroke();
  }

  // Yan çizgi yazısı
  ctx.fillStyle = 'rgba(245,245,238,0.85)';
  ctx.font = '600 0.42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(hw + 1.25, 0);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('VOLKSWAGEN ARENA  İSTANBUL', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(0, 0);
  ctx.font = '700 0.7px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(245,245,238,0.92)';
  ctx.rotate(0);
  ctx.fillText('ARENA', 0, 0.25);
  ctx.restore();

  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Kayan yazılı LED şerit dokusu (yatay tekrar eder). */
export function ledRibbonTexture(text, color = '#5cff9d') {
  const [c, ctx] = canvas(1024, 64);
  ctx.fillStyle = '#04070a';
  ctx.fillRect(0, 0, 1024, 64);
  ctx.font = '800 38px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  const unit = `${text}   `;
  const w = ctx.measureText(unit).width;
  const reps = Math.max(1, Math.round(1024 / w));
  const sw = 1024 / reps;
  ctx.textAlign = 'center';
  for (let i = 0; i < reps; i++) ctx.fillText(text, sw * (i + 0.5), 34);
  // LED matris etkisi
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < 64; y += 4) ctx.fillRect(0, y + 3, 1024, 1);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Küp / skorbord ekranı için basit metin paneli. */
export function ledPanelTexture(lines, { bg = '#05080c', fg = '#ffffff', accent = '#5cff9d', w = 512, h = 320 } = {}) {
  const [c, ctx] = canvas(w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, bg);
  g.addColorStop(1, '#0d1b17');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => {
    ctx.font = `${ln.weight ?? 800} ${ln.size}px system-ui, sans-serif`;
    ctx.fillStyle = ln.accent ? accent : fg;
    ctx.fillText(ln.text, w / 2, ln.y ?? (h / (lines.length + 1)) * (i + 1));
  });
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y + 2, w, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Çok hücreli etiket atlası (blok no, loca no). */
export function labelAtlas(texts, cols = 8, cellW = 256, cellH = 128) {
  const rows = Math.ceil(texts.length / cols);
  const [c, ctx] = canvas(cols * cellW, rows * cellH);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const uvs = [];
  texts.forEach((t, i) => {
    const cx = i % cols, cy = Math.floor(i / cols);
    const x = cx * cellW, y = cy * cellH;
    ctx.fillStyle = 'rgba(8,10,14,0.92)';
    ctx.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);
    ctx.strokeStyle = 'rgba(255,196,0,0.9)';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 6, y + 6, cellW - 12, cellH - 12);
    ctx.fillStyle = '#ffd24a'; // RAL 1028 sarısı (Yazgan Design: yönlendirme yazıları)
    const small = t.length > 4;
    ctx.font = `800 ${small ? 56 : 84}px system-ui, sans-serif`;
    ctx.fillText(t, x + cellW / 2, y + cellH / 2 + 4);
    uvs.push([x / c.width, 1 - (y + cellH) / c.height, (x + cellW) / c.width, 1 - y / c.height]);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { texture: tex, uvs };
}

/** Yeşil acil çıkış levhası. */
export function exitSignTexture() {
  const [c, ctx] = canvas(256, 96);
  ctx.fillStyle = '#0c8f4a';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, 246, 86);
  ctx.fillStyle = '#fff';
  ctx.font = '800 46px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ÇIKIŞ', 150, 50);
  // koşan figür
  ctx.beginPath();
  ctx.arc(52, 28, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(48, 40); ctx.lineTo(60, 56); ctx.lineTo(42, 72);
  ctx.moveTo(60, 56); ctx.lineTo(76, 66);
  ctx.moveTo(48, 42); ctx.lineTo(30, 50);
  ctx.moveTo(52, 42); ctx.lineTo(70, 36);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Siyah metal bariyer: dikey çubuklar + üst/alt korkuluk (alfa testli, 1 m'de bir tekrar). */
export function fenceTexture() {
  const [c, ctx] = canvas(128, 128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#d0d4da';
  for (let i = 0; i < 8; i++) ctx.fillRect(i * 16 + 6, 6, 4, 116); // dikey çubuklar
  ctx.fillRect(0, 2, 128, 9); // üst korkuluk
  ctx.fillRect(0, 56, 128, 4); // orta korkuluk
  ctx.fillRect(0, 117, 128, 8); // alt korkuluk
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Sarı–siyah uyarı bandı (pota sehpası dolgusu). */
export function hazardTexture() {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#f2c200';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#101010';
  for (let i = -2; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 32, 128);
    ctx.lineTo(i * 32 + 16, 128);
    ctx.lineTo(i * 32 + 16 + 128, 0);
    ctx.lineTo(i * 32 + 128, 0);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Hareketli kafa gobo deseni: radyal çizgiler + noktalar (zemine yansıyan ışık deseni). */
export function goboTexture() {
  const [c, ctx] = canvas(512, 512);
  ctx.clearRect(0, 0, 512, 512);
  ctx.translate(256, 256);
  const r = rng(5);
  for (let i = 0; i < 18; i++) {
    ctx.rotate((Math.PI * 2) / 18);
    const g = ctx.createLinearGradient(0, 20, 0, 240);
    g.addColorStop(0, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.35, `rgba(255,255,255,${0.5 + r() * 0.4})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-5, 20);
    ctx.lineTo(5, 20);
    ctx.lineTo(18 + r() * 10, 240);
    ctx.lineTo(-18 - r() * 10, 240);
    ctx.closePath();
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const mask = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  mask.addColorStop(0, 'rgba(255,255,255,0.9)');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Yumuşak ışık huzmesi gradyanı (koni yüzeyi için, uçta sönen). */
export function beamTexture() {
  const [c, ctx] = canvas(8, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Yuvarlak yumuşak nokta (toz/pırıltı parçacıkları). */
export function dotTexture() {
  const [c, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sac parke dokusu: açık akçaağaç tahta damarı (loca zemini). */
export function parquetTexture() {
  const [c, ctx] = canvas(256, 256);
  const r = rng(21);
  ctx.fillStyle = '#d4ad7c';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(${110 + r() * 40},${70 + r() * 30},${30 + r() * 20},${0.1 + r() * 0.12})`;
    ctx.fillRect(i * 16, 0, 15, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(i * 16 + 15, 0, 1, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
