// Config → koltuk modeli. Saf veri üretir (THREE'ye bağımlı değil), böylece
// UI, seçici ve 3D kurucu aynı koltuk listesini paylaşır.

const DEG = Math.PI / 180;

const norm = (v) => {
  const l = Math.hypot(v[0], v[1]);
  return [v[0] / l, v[1] / l];
};
const lerp = (a, b, t) => a + (b - a) * t;

/** Skybox/loca halkası: yol (polyline) ve loca yerleşimleri. */
export function ringLayout(config) {
  const r = config.hall.ring;
  const F = r.frontX;
  const xe = F - (r.endFrontZ - r.chamferStartZ); // köşe yayının bittiği |x|
  const N = r.cornerSegments ?? 1;

  // Köşe: (F, zc) → (xe, zE) arası, F hattına teğet başlayıp uç hattına teğet biten ikinci derece Bezier
  const corner = (sx) => {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = [sx * F, r.chamferStartZ];
      const c = [sx * F, r.endFrontZ];
      const b = [sx * xe, r.endFrontZ];
      const k = 1 - t;
      pts.push([k * k * a[0] + 2 * k * t * c[0] + t * t * b[0], k * k * a[1] + 2 * k * t * c[1] + t * t * b[1]]);
    }
    return pts;
  };
  const left = corner(-1); // sol-arka: yan hattan uç hattına
  const right = corner(1).reverse(); // uç hattından sağ yan hatta
  // Soldan başlayıp saat yönünde dolaşan ön hat (x,z)
  const path = [[-F, r.stageWallZ], ...left, ...right, [F, r.stageWallZ]];

  const tangentNormal = (pts, t) => {
    // t ∈ [0,1] noktasındaki konum ve bowl içine bakan birim yön
    const i = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
    const a = pts[i], b = pts[i + 1];
    const f = t * (pts.length - 1) - i;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l = Math.hypot(dx, dz);
    let n = [-dz / l, dx / l];
    const px = a[0] + dx * f, pz = a[1] + dz * f;
    if (n[0] * (0 - px) + n[1] * (5 - pz) < 0) n = [-n[0], -n[1]];
    return { pos: [px, pz], n };
  };

  const locas = [];
  const w = r.locaWidth;
  const we = r.endLocaWidth ?? w;
  const sideHalf = (r.sideLocas * w) / 2;
  // 1–8: sol hat, sahneden karşı uca
  for (let i = 0; i < r.sideLocas; i++) {
    locas.push({ n: 1 + i, front: [-F, -sideHalf + w / 2 + i * w], facing: [1, 0] });
  }
  // 9: sol köşe (yayın ortası)
  const m1 = tangentNormal(left, 0.5);
  locas.push({ n: 9, front: m1.pos, facing: m1.n });
  // 10–15: karşı uç, soldan sağa
  const endHalf = (r.endLocas * we) / 2;
  for (let i = 0; i < r.endLocas; i++) {
    locas.push({ n: 10 + i, front: [-endHalf + we / 2 + i * we, r.endFrontZ], facing: [0, -1], width: we });
  }
  // 16: sağ köşe
  const m2 = tangentNormal(right, 0.5);
  locas.push({ n: 16, front: m2.pos, facing: m2.n });
  // 17–24: sağ hat, karşı uçtan sahneye
  for (let i = 0; i < r.sideLocas; i++) {
    locas.push({ n: 17 + i, front: [F, sideHalf - w / 2 - i * w], facing: [-1, 0] });
  }
  return { path, locas, xe };
}

/** Tüm blokları, sıraları ve koltukları üretir. */
export function buildSeatModel(config) {
  const seats = [];
  const blocks = new Map();
  const pitch = config.dims.seatPitch;
  const eye = config.dims.eyeHeight;

  const addSeat = (block, rowObj, s) => {
    const seat = {
      index: seats.length,
      blockId: block.id,
      rowIndex: rowObj.index,
      rowLabel: rowObj.label,
      seatNo: s.seatNo,
      seatIndexInRow: rowObj.seats.length,
      pos: s.pos, // koltuk tabanı (basamak yüzeyi)
      yaw: s.yaw,
      facing: s.facing,
      scale: s.scale ?? 1,
      configs: block.configs,
      category: block.category,
      style: block.style,
      geo: block.kind === 'rake' || block.kind === 'fan' ? 'folded' : 'open',
      group: block.group,
      meshKey: [...block.configs].sort().join('+'),
      noMesh: block.style === 'standing', // ayakta noktalar: koltuk çizilmez, yalnızca bakış noktası
    };
    const eyeH = block.style === 'standing' ? 1.68 : eye * seat.scale;
    seat.eye = [
      s.pos[0] + s.facing[0] * 0.04,
      s.pos[1] + eyeH,
      s.pos[2] + s.facing[1] * 0.04,
    ];
    seat.id = `${block.id}-${rowObj.label}-${s.seatNo}`;
    seats.push(seat);
    rowObj.seats.push(seat.index);
  };

  const newBlock = (b, t, extra = {}) => {
    const block = {
      id: b.id,
      name: b.name,
      category: b.category,
      group: t.group,
      tribuneId: t.id,
      kind: t.kind,
      configs: t.configs,
      style: b.style ?? t.seatStyle ?? 'standard',
      rows: [],
      facing: null,
      center: [0, 0, 0],
      ...extra,
    };
    blocks.set(block.id, block);
    return block;
  };

  for (const t of config.tribunes) {
    if (t.kind === 'tables') {
      // Yuvarlak masalar: her masa bir blok, tek sıra, etrafında sandalyeler (masaya bakar)
      for (const tb of t.tables) {
        const block = newBlock({ id: tb.id, name: tb.name, category: t.category, style: t.seatStyle }, t);
        block.facing = [0, -1]; // sahneye bakan taraf (blok görünümünde kamera sahne tarafından bakar)
        const rowObj = { index: 0, label: '1', seats: [] };
        block.rows.push(rowObj);
        for (let i = 0; i < tb.seats; i++) {
          const ang = Math.PI / 2 + (i * Math.PI * 2) / tb.seats; // 1. sandalye sahneye en yakın
          const x = tb.center[0] + t.radius * Math.cos(ang);
          const z = tb.center[1] - t.radius * Math.sin(ang);
          const f = [-Math.cos(ang), Math.sin(ang)];
          addSeat(block, rowObj, { seatNo: i + 1, pos: [x, 0, z], yaw: Math.atan2(f[0], f[1]), facing: f });
        }
      }
      continue;
    }
    if (t.kind === 'fan') {
      const [cx, cz] = t.center;
      const a0 = t.angles[0] * DEG;
      const a1 = t.angles[1] * DEG;
      for (const b of t.blocks) {
        const block = newBlock(b, t);
        for (let r = 0; r < t.rows; r++) {
          const rho = t.r0 + r * t.rowPitch;
          const n = Math.floor((rho * (a1 - a0)) / pitch);
          const rowObj = { index: r, label: String(r + 1), seats: [] };
          block.rows.push(rowObj);
          const y = t.baseY + r * t.rise;
          for (let i = 0; i < n; i++) {
            const ang = a1 - ((i + 0.5) * (a1 - a0)) / n; // 1. koltuk bakana göre solda
            const x = cx + rho * Math.cos(ang);
            const z = cz + rho * Math.sin(ang);
            const f = [-Math.cos(ang), -Math.sin(ang)];
            addSeat(block, rowObj, { seatNo: i + 1, pos: [x, y, z], yaw: Math.atan2(f[0], f[1]), facing: f });
          }
        }
      }
      continue;
    }

    // flat / rake
    const f = norm(t.facing);
    const u = [-f[1], f[0]]; // bakan kişinin sağı (x,z)
    const rise = t.rise ?? 0;
    const baseY = t.baseY ?? 0;
    for (const b of t.blocks) {
      const block = newBlock(b, t);
      block.facing = f;
      const rows = b.rows ?? t.rows;
      const pitchHere = t.seatPitch ?? pitch;
      for (let r = 0; r < rows; r++) {
        const k = rows > 1 ? r / (rows - 1) : 0;
        const n = typeof b.seats === 'number' ? b.seats : Math.round(lerp(b.seats.near, b.seats.far, k));
        const first = b.firstSeat ? Math.round(lerp(b.firstSeat.near, b.firstSeat.far, k)) : 1;
        const label = t.rowLabels ? t.rowLabels[r] : String(r + 1);
        const rowObj = { index: r, label, seats: [] };
        block.rows.push(rowObj);
        const cx = t.origin[0] + u[0] * b.lateral - f[0] * r * t.rowPitch;
        const cz = t.origin[1] + u[1] * b.lateral - f[1] * r * t.rowPitch;
        const y = baseY + r * rise;
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * pitchHere;
          addSeat(block, rowObj, {
            seatNo: first + i,
            pos: [cx + u[0] * off, y, cz + u[1] * off],
            yaw: Math.atan2(f[0], f[1]),
            facing: f,
          });
        }
      }
    }
  }

  // Localar
  const lc = config.locas;
  const ring = ringLayout(config);
  const floorY = config.hall.ring.floorY;
  const locaTribune = { id: 'locas', kind: 'loca', configs: Object.keys(config.configurations), group: 'Localar' };
  for (const L of ring.locas) {
    const f = L.facing;
    const u = [-f[1], f[0]];
    const big = lc.bigLocas?.includes(L.n);
    const perRow = big ? lc.bigSeatsPerRow : lc.seatsPerRow;
    const W = L.width ?? config.hall.ring.locaWidth;
    const spacing = (W - 1.1) / perRow;
    const block = newBlock({ id: `L${L.n}`, name: `Loca ${L.n}`, category: lc.category, style: 'lounge' }, locaTribune, {
      locaNo: L.n,
      capacity: perRow * lc.rows,
    });
    block.facing = f;
    for (let r = 0; r < lc.rows; r++) {
      const rowObj = { index: r, label: String(r + 1), seats: [] };
      block.rows.push(rowObj);
      const d = lc.rowDepth[r];
      for (let i = 0; i < perRow; i++) {
        const off = (i - (perRow - 1) / 2) * spacing;
        addSeat(block, rowObj, {
          seatNo: i + 1,
          pos: [L.front[0] - f[0] * d + u[0] * off, floorY + r * lc.rowRise, L.front[1] - f[1] * d + u[1] * off],
          yaw: Math.atan2(f[0], f[1]),
          facing: f,
          scale: 1.12,
        });
      }
    }
  }

  // Blok merkezleri (kamera yönlendirme / etiket için)
  for (const block of blocks.values()) {
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const row of block.rows) {
      for (const idx of row.seats) {
        const p = seats[idx].pos;
        sx += p[0]; sy += p[1]; sz += p[2]; n++;
      }
    }
    block.seatCount = n;
    block.center = n ? [sx / n, sy / n, sz / n] : [0, 0, 0];
    if (!block.facing) {
      // fan: merkeze doğru ortalama yön
      const s0 = seats[block.rows[0].seats[0]];
      block.facing = s0 ? s0.facing : [0, -1];
    }
  }

  return { seats, blocks, ring };
}

/** Bir konfigürasyonda görünür koltuklar. */
export function seatsForConfig(model, configKey) {
  return model.seats.filter((s) => s.configs.includes(configKey));
}

/** Bir konfigürasyondaki bloklar (gruba göre). */
export function blocksForConfig(model, configKey) {
  return [...model.blocks.values()].filter((b) => b.configs.includes(configKey));
}

/**
 * Zemin yüksekliği haritası: herhangi bir (x,z) noktasında tribün basamağının kotu.
 * Kamera sınırlamasında "yerin altına inme" ve katı tribüne girmeyi engellemek için kullanılır.
 */
export function makeGroundHeight(config) {
  const treads = config.tribunes.filter((t) => t.kind === 'rake' || t.kind === 'fan');
  const ring = config.hall.ring;
  return (x, z) => {
    let h = 0;
    for (const t of treads) {
      if (t.kind === 'rake') {
        const f = norm(t.facing);
        const u = [-f[1], f[0]];
        const dx = x - t.origin[0], dz = z - t.origin[1];
        const depth = -(dx * f[0] + dz * f[1]);
        const lat = dx * u[0] + dz * u[1];
        if (lat < t.span[0] || lat > t.span[1]) continue;
        const r = Math.floor(depth / t.rowPitch + 0.5);
        if (r < 0) continue;
        if (r < t.rows) h = Math.max(h, (t.baseY ?? 0) + r * (t.rise ?? 0));
        else if (depth < t.rows * t.rowPitch + 1.4) h = Math.max(h, (t.baseY ?? 0) + (t.rows - 1) * (t.rise ?? 0));
      } else {
        const dx = x - t.center[0], dz = z - t.center[1];
        const ang = Math.atan2(dz, dx);
        const a0 = t.angles[0] * DEG, a1 = t.angles[1] * DEG;
        if (ang < a0 - 0.05 || ang > a1 + 0.05) continue;
        const r = Math.floor((Math.hypot(dx, dz) - t.r0) / t.rowPitch + 0.5);
        if (r >= 0 && r < t.rows) h = Math.max(h, t.baseY + r * t.rise);
      }
    }
    return h;
  };
}

/**
 * Genel görünüm kamerasının serbestçe dolaşabildiği hacim: salon içi, tribün ve zeminin üstünde,
 * çatının altında. Sınırı aşan konum içeri/yukarı/aşağı doğru ittirilir (yerin altına, çatının üstüne,
 * duvarların dışına çıkılamaz).
 */
export function makeCameraBounds(config, groundHeight) {
  const ring = config.hall.ring, roof = config.hall.roof;
  const xMax = ring.frontX - 1.2;
  const zMin = ring.stageWallZ + 1.4;
  const zMax = ring.endFrontZ - 1.4;
  const cx = ring.frontX - (ring.endFrontZ - ring.chamferStartZ); // köşe yayının merkez x'i
  const cz = ring.chamferStartZ;
  const rc = ring.endFrontZ - ring.chamferStartZ - 1.2;
  const yMax = roof.apexY - roof.trussDepth - 1.2;
  return (p) => {
    p.x = Math.max(-xMax, Math.min(xMax, p.x));
    p.z = Math.max(zMin, Math.min(zMax, p.z));
    // yuvarlak köşe: yaya yaslan
    const ax = Math.abs(p.x);
    if (ax > cx && p.z > cz) {
      const dx = ax - cx, dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d > rc) {
        p.x = Math.sign(p.x) * (cx + (dx / d) * rc);
        p.z = cz + (dz / d) * rc;
      }
    }
    p.y = Math.max(groundHeight(p.x, p.z) + 1.4, Math.min(yMax, p.y));
    return p;
  };
}

/** Blok görünen adı: "Loca 7", "Masa 5", "Golden Circle…", "Blok 202". */
export function blockLabel(b) {
  if (b.locaNo) return `Loca ${b.locaNo}`;
  if (b.kind === 'tables' || b.group === 'Sahne Önü Ayakta' || b.group === 'Saha İçi Ayakta' || b.id.startsWith('VIP')) return b.name;
  return `Blok ${b.id}`;
}
