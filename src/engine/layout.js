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
  const xe = F - (r.endFrontZ - r.chamferStartZ); // 45° pahın bittiği |x|
  // Soldan başlayıp saat yönünde dolaşan ön hat (x,z)
  const path = [
    [-F, r.stageWallZ],
    [-F, r.chamferStartZ],
    [-xe, r.endFrontZ],
    [xe, r.endFrontZ],
    [F, r.chamferStartZ],
    [F, r.stageWallZ],
  ];

  const locas = [];
  const w = r.locaWidth;
  const sideHalf = (r.sideLocas * w) / 2;
  // 1–8: sol hat, sahneden karşı uca
  for (let i = 0; i < r.sideLocas; i++) {
    locas.push({ n: 1 + i, front: [-F, -sideHalf + w / 2 + i * w], facing: [1, 0] });
  }
  // 9: sol köşe (pah ortası)
  const m1 = [(-F - xe) / 2, (r.chamferStartZ + r.endFrontZ) / 2];
  locas.push({ n: 9, front: m1, facing: norm([1, -1]) });
  // 10–15: karşı uç, soldan sağa
  const endHalf = (r.endLocas * w) / 2;
  for (let i = 0; i < r.endLocas; i++) {
    locas.push({ n: 10 + i, front: [-endHalf + w / 2 + i * w, r.endFrontZ], facing: [0, -1] });
  }
  // 16: sağ köşe
  locas.push({ n: 16, front: [(F + xe) / 2, m1[1]], facing: norm([-1, -1]) });
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
      meshKey: block.configs.length > 1 ? 'shared' : block.configs[0],
    };
    seat.eye = [
      s.pos[0] + s.facing[0] * 0.04,
      s.pos[1] + eye * seat.scale,
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
          const off = (i - (n - 1) / 2) * pitch;
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
  const locaTribune = { id: 'locas', kind: 'loca', configs: ['concert', 'basketball'], group: 'Localar' };
  for (const L of ring.locas) {
    const f = L.facing;
    const u = [-f[1], f[0]];
    const block = newBlock({ id: `L${L.n}`, name: `Loca ${L.n}`, category: lc.category, style: 'lounge' }, locaTribune, {
      locaNo: L.n,
    });
    block.facing = f;
    for (let r = 0; r < lc.rows; r++) {
      const rowObj = { index: r, label: String(r + 1), seats: [] };
      block.rows.push(rowObj);
      const d = lc.rowDepth[r];
      for (let i = 0; i < lc.seatsPerRow; i++) {
        const off = (i - (lc.seatsPerRow - 1) / 2) * lc.seatSpacing;
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
