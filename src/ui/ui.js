import { blockLabel } from '../engine/layout.js';

const esc = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeColor = (c) => (/^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#4cc2ff');

/** DOM bağları: seçiciler, bilgi kartı, HUD, açıklama penceresi. İş mantığı app.js'te. */
export function createUI({ config, model, handlers }) {
  const $ = (id) => document.getElementById(id);
  const el = {
    cfgSelect: $('cfgSelect'),
    evtNote: $('evtNote'),
    selBlock: $('selBlock'),
    selRow: $('selRow'),
    selSeat: $('selSeat'),
    infoCard: $('infoCard'),
    infoTitle: $('infoTitle'),
    infoDot: $('infoDot'),
    infoCat: $('infoCat'),
    infoStats: $('infoStats'),
    btnView: $('btnView'),
    legend: $('legend'),
    mapHint: $('mapHint'),
    hud: $('hud'),
    hudTitle: $('hudTitle'),
    hudSub: $('hudSub'),
    tip: $('tip'),
    toast: $('toast'),
    loading: $('loading'),
    loadDetail: $('loadDetail'),
    about: $('about'),
    panel: $('panel'),
    tint: $('btnTint'),
    qLabel: $('qLabel'),
  };
  let silent = false;
  const quiet = (fn) => {
    silent = true;
    try { fn(); } finally { silent = false; }
  };
  const opt = (value, text, extra = {}) => Object.assign(new Option(text, value), extra);

  // ── etkinlik düzeni seçici ──
  for (const [key, c] of Object.entries(config.configurations)) el.cfgSelect.append(opt(key, c.label));
  el.cfgSelect.addEventListener('change', () => handlers.onConfig(el.cfgSelect.value));

  el.selBlock.addEventListener('change', () => !silent && el.selBlock.value && handlers.onBlock(el.selBlock.value));
  el.selRow.addEventListener('change', () => !silent && handlers.onRow(Number(el.selRow.value)));
  el.selSeat.addEventListener('change', () => !silent && handlers.onSeat(model.seats[Number(el.selSeat.value)]));
  el.btnView.addEventListener('click', () => handlers.onView());
  el.tint.addEventListener('click', () => {
    const on = el.tint.getAttribute('aria-pressed') !== 'true';
    el.tint.setAttribute('aria-pressed', String(on));
    handlers.onTint(on);
  });
  $('btnQuality').addEventListener('click', () => handlers.onQuality());
  $('btnFs').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.()?.catch?.(() => {});
  });
  $('btnAbout').addEventListener('click', () => {
    el.about.showModal();
    el.about.scrollTop = 0;
  });
  $('panelToggle').addEventListener('click', () => el.panel.classList.toggle('open'));
  $('hudPrev').addEventListener('click', () => handlers.onStep(-1, 0));
  $('hudNext').addEventListener('click', () => handlers.onStep(1, 0));
  $('hudFront').addEventListener('click', () => handlers.onStep(0, -1));
  $('hudBack').addEventListener('click', () => handlers.onStep(0, 1));
  $('hudReset').addEventListener('click', () => handlers.onResetLook());
  $('hudExit').addEventListener('click', () => handlers.onExit());

  // Bilgi penceresi
  const meta = config.meta;
  $('aboutBody').innerHTML = `
    <p>${esc(meta.name)} — ${esc(meta.location)} · İşletmeci: ${esc(meta.operator)}</p>
    <h3>Kaynaklar</h3>
    <ul>${meta.sources.map((s) => `<li><b>${esc(s.label)}</b> — ${esc(s.use)}</li>`).join('')}</ul>
    <h3>Tahmin / varsayımlar</h3>
    <ul>${meta.assumptions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <h3>Bu görünüm</h3>
    <ul><li>Tüm model kodla, parametrik olarak üretilir; ölçüler <code>src/venue/volkswagen-arena.config.js</code> dosyasından okunur.</li>
    <li>Resmî plan ve teknik doküman geldiğinde yalnızca bu config güncellenir.</li></ul>`;

  const catLabel = (k) => config.categories[k]?.label ?? k;
  const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');

  return {
    setLoading(msg) { el.loadDetail.textContent = msg ?? ''; },
    hideLoading() { el.loading.classList.add('done'); setTimeout(() => el.loading.remove(), 800); },
    setQuality(label) { el.qLabel.textContent = label; },
    toast(msg, ms = 2400) {
      el.toast.textContent = msg;
      el.toast.hidden = false;
      clearTimeout(this._t);
      this._t = setTimeout(() => (el.toast.hidden = true), ms);
    },
    tip(text, x, y) {
      if (!text) { el.tip.hidden = true; return; }
      el.tip.textContent = text;
      el.tip.style.left = `${x}px`;
      el.tip.style.top = `${y}px`;
      el.tip.hidden = false;
    },

    setConfig(key, blocks) {
      el.cfgSelect.value = key;
      el.evtNote.textContent = config.configurations[key].note ?? '';
      quiet(() => {
        el.selBlock.replaceChildren(opt('', 'Blok seçin…'));
        const groups = new Map();
        for (const b of blocks) {
          if (!groups.has(b.group)) groups.set(b.group, []);
          groups.get(b.group).push(b);
        }
        for (const [name, list] of groups) {
          const og = document.createElement('optgroup');
          og.label = name;
          for (const b of list) og.append(opt(b.id, `${b.name} · ${b.seatCount} koltuk`));
          el.selBlock.append(og);
        }
        el.selRow.replaceChildren();
        el.selSeat.replaceChildren();
        el.selRow.disabled = el.selSeat.disabled = true;
      });
      const cats = new Set(blocks.map((b) => b.category));
      el.legend.innerHTML = [...cats]
        .map((k) => `<span><i style="background:${safeColor(config.categories[k].color)}"></i>${esc(config.categories[k].label)}</span>`)
        .join('');
      el.mapHint.textContent = key === 'concert' ? '· sahne üstte' : '· saha ortada';
      el.infoCard.hidden = true;
      el.hud.hidden = true;
    },

    /** Blok seçimi: sıra listesini doldur. */
    setBlock(block, rowIndex = null, seat = null) {
      quiet(() => {
        el.selBlock.value = block ? block.id : '';
        el.selRow.replaceChildren();
        el.selSeat.replaceChildren();
        if (!block) { el.selRow.disabled = el.selSeat.disabled = true; return; }
        el.selRow.append(opt('', 'Sıra…', { disabled: true }));
        for (const r of block.rows) el.selRow.append(opt(r.index, `Sıra ${r.label}  (${r.seats.length})`));
        el.selRow.disabled = false;
        el.selRow.value = rowIndex ?? '';
        if (rowIndex == null) el.selRow.selectedIndex = 0;
        this._fillSeats(block, rowIndex, seat);
      });
    },

    _fillSeats(block, rowIndex, seat) {
      el.selSeat.replaceChildren();
      if (rowIndex == null) { el.selSeat.disabled = true; return; }
      el.selSeat.append(opt('', 'Koltuk…', { disabled: true }));
      for (const idx of block.rows[rowIndex].seats) el.selSeat.append(opt(idx, `Koltuk ${model.seats[idx].seatNo}`));
      el.selSeat.disabled = false;
      el.selSeat.value = seat ? seat.index : '';
      if (!seat) el.selSeat.selectedIndex = 0;
    },

    setRow(block, rowIndex) {
      quiet(() => {
        el.selRow.value = rowIndex;
        this._fillSeats(block, rowIndex, null);
      });
    },

    showSeat(seat, stats, block) {
      if (!seat) { el.infoCard.hidden = true; return; }
      el.infoCard.hidden = false;
      const blockName = blockLabel(block);
      el.infoTitle.textContent = `${blockName} · Sıra ${seat.rowLabel} · Koltuk ${seat.seatNo}`;
      el.infoDot.style.background = safeColor(config.categories[seat.category]?.color);
      el.infoCat.textContent = catLabel(seat.category);
      el.infoStats.innerHTML = `
        <div><dt>${esc(stats.focusLabel)} mesafesi</dt><dd>${fmt(stats.distance, 0)} m</dd></div>
        <div><dt>Zeminden yükseklik</dt><dd>${fmt(stats.height)} m</dd></div>
        <div><dt>Konum</dt><dd>${esc(stats.side)}</dd></div>
        <div><dt>Başı çevirme</dt><dd>${fmt(stats.angle, 0)}°</dd></div>`;
      quiet(() => {
        el.selBlock.value = block.id;
      });
    },

    setHud(seat, block, visible, focusDative) {
      el.hud.hidden = !visible;
      document.body.classList.toggle('seat-mode', visible);
      if (!visible || !seat) return;
      const blockName = blockLabel(block);
      el.hudTitle.textContent = `${blockName} · Sıra ${seat.rowLabel} · Koltuk ${seat.seatNo}`;
      el.hudSub.textContent = catLabel(seat.category);
      $('hudReset').textContent = `⟲ ${focusDative} bak`;
    },
  };
}
