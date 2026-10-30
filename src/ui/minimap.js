import { seatsForConfig, blocksForConfig } from '../engine/layout.js';

const B = { x0: -33, x1: 33, z0: -30.5, z1: 43 };

/** Yukarıdan plan görünümü: koltuk noktaları, blok etiketleri, tıklayarak seçim. */
export class Minimap {
  constructor(canvas, { model, config, onPick, onHover }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = model;
    this.config = config;
    this.onPick = onPick;
    this.onHover = onHover;
    this.key = 'concert';
    this.seats = [];
    this.blocks = [];
    this.selected = null;
    this.hover = null;
    this.blockId = null;
    this.colors = Object.fromEntries(Object.entries(config.categories).map(([k, v]) => [k, v.color]));

    canvas.addEventListener('pointermove', (e) => {
      const s = this._nearest(e);
      if (s !== this.hover) {
        this.hover = s;
        this.onHover?.(s, e);
        this.draw();
      }
    });
    canvas.addEventListener('pointerleave', () => {
      this.hover = null;
      this.onHover?.(null);
      this.draw();
    });
    canvas.addEventListener('click', (e) => {
      const s = this._nearest(e, 12);
      if (s) this.onPick(s);
    });
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
  }

  resize() {
    const w = Math.max(200, this.canvas.parentElement.clientWidth);
    this.scale = w / (B.x1 - B.x0);
    const h = (B.z1 - B.z0) * this.scale;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = `${h}px`;
    this.dpr = dpr;
    this.draw();
  }

  setConfig(key) {
    this.key = key;
    this.seats = seatsForConfig(this.model, key);
    this.blocks = blocksForConfig(this.model, key);
    this.selected = null;
    this.blockId = null;
    this.draw();
  }

  setSelected(seat) {
    this.selected = seat;
    this.draw();
  }

  setBlock(id) {
    this.blockId = id;
    this.draw();
  }

  _xy(x, z) {
    return [(x - B.x0) * this.scale, (z - B.z0) * this.scale];
  }

  _nearest(e, maxPx = 10) {
    const r = this.canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    let best = null, bd = maxPx * maxPx;
    for (const s of this.seats) {
      const [x, y] = this._xy(s.pos[0], s.pos[2]);
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  draw() {
    const { ctx, canvas, dpr, scale: sc } = this;
    if (!this.seats) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cfg = this.config;
    const ring = this.model.ring;

    // Halka (loca hattı)
    ctx.beginPath();
    ring.path.forEach(([x, z], i) => {
      const [px, py] = this._xy(x, z);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Zemin
    const f = cfg.hall.floor;
    const [fx0, fy0] = this._xy(-f.halfWidth, f.zMin);
    const [fx1, fy1] = this._xy(f.halfWidth, f.zMax);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);

    const cc = cfg.configurations[this.key];
    if (cc.stage) {
      const st = cc.stage;
      const [x0, y0] = this._xy(-st.width / 2, st.z0);
      const [x1, y1] = this._xy(st.width / 2, st.z0 + st.depth);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cc.kind === 'symphony' ? 'ORKESTRA' : cc.kind === 'gala' ? 'PODYUM' : 'SAHNE', (x0 + x1) / 2, (y0 + y1) / 2 + 3);
    } else {
      const c = cc.court;
      const [x0, y0] = this._xy(-c.width / 2, c.centerZ - c.length / 2);
      const [x1, y1] = this._xy(c.width / 2, c.centerZ + c.length / 2);
      ctx.fillStyle = 'rgba(214,176,120,0.5)';
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      const [cx, cy] = this._xy(0, c.centerZ);
      ctx.beginPath();
      ctx.moveTo(x0, cy);
      ctx.lineTo(x1, cy);
      ctx.arc(cx, cy, 1.8 * sc, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Koltuklar
    const dim = !!this.blockId;
    for (const s of this.seats) {
      const [x, y] = this._xy(s.pos[0], s.pos[2]);
      const on = !dim || s.blockId === this.blockId;
      ctx.fillStyle = this.colors[s.category];
      ctx.globalAlpha = on ? 0.9 : 0.22;
      ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
    }
    ctx.globalAlpha = 1;

    // Blok etiketleri
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of this.blocks) {
      const [x, y] = this._xy(b.center[0], b.center[2]);
      const loca = b.id.startsWith('L');
      ctx.font = `${loca ? 600 : 700} ${loca ? 7 : 9}px system-ui, sans-serif`;
      ctx.fillStyle = b.id === this.blockId ? '#fff' : 'rgba(255,255,255,0.62)';
      const text = loca ? b.id.slice(1) : b.kind === 'tables' ? b.id.slice(1) : b.id.replace('VIP-', 'VIP ');
      // etiketi bloğun içinde ortala
      ctx.fillText(text, x, y);
    }
    ctx.textBaseline = 'alphabetic';

    // Hover + seçili
    for (const [s, color, r] of [[this.hover, '#ffffff', 4.5], [this.selected, '#ff7a1a', 5.5]]) {
      if (!s) continue;
      const [x, y] = this._xy(s.pos[0], s.pos[2]);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (this.selected) {
      // bakış yönü
      const s = this.selected;
      const [x, y] = this._xy(s.pos[0], s.pos[2]);
      const focus = this.config.configurations[this.key].focus;
      const dx = focus[0] - s.pos[0], dz = focus[2] - s.pos[2];
      const l = Math.hypot(dx, dz) || 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (dx / l) * 22, y + (dz / l) * 22);
      ctx.strokeStyle = 'rgba(255,122,26,0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
