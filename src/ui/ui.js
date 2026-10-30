/** DOM bağları: seçiciler, bilgi kartı, HUD, açıklama penceresi. İş mantığı app.js'te. */
export function createUI({ config, model, handlers }) {
  const $ = (id) => document.getElementById(id);
  const el = {
    seg: $('cfgSeg'),
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

  // ── konfigürasyon seçici ──
  el.seg.querySelectorAll('button').forEach((b) => {
    b.textContent = config.configurations[b.dataset.cfg].label;
    b.addEventListener('click', () => handlers.onConfig(b.dataset.cfg));
  });

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
    else document.documentElement.requestFullscreen?.();
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
    <p>${meta.name} — ${meta.location} · İşletmeci: ${meta.operator}</p>
    <h3>Kaynaklar</h3>
    <ul>${meta.sources.map((s) => `<li><b>${s.label}</b> — ${s.use}</li>`).join('')}</ul>
    <h3>Tahmin / varsayımlar</h3>
    <ul>${meta.assumptions.map((s) => `<li>${s}</li>`).join('')}</ul>
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
      el.seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.cfg === key)));
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
        .map((k) => `<span><i style="background:${config.categories[k].color}"></i>${config.categories[k].label}</span>`)
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
      const blockName = block.id.startsWith('L') ? `Loca ${block.locaNo}` : block.id.startsWith('VIP') ? block.name : `Blok ${block.id}`;
      el.infoTitle.textContent = `${blockName} · Sıra ${seat.rowLabel} · Koltuk ${seat.seatNo}`;
      el.infoDot.style.background = config.categories[seat.category]?.color ?? '#4cc2ff';
      el.infoCat.textContent = catLabel(seat.category);
      el.infoStats.innerHTML = `
        <div><dt>${stats.focusLabel} mesafesi</dt><dd>${fmt(stats.distance, 0)} m</dd></div>
        <div><dt>Zeminden yükseklik</dt><dd>${fmt(stats.height)} m</dd></div>
        <div><dt>Konum</dt><dd>${stats.side}</dd></div>
        <div><dt>Bakış açısı</dt><dd>${fmt(stats.angle, 0)}°</dd></div>`;
      quiet(() => {
        el.selBlock.value = block.id;
      });
    },

    setHud(seat, block, visible, focusDative) {
      el.hud.hidden = !visible;
      document.body.classList.toggle('seat-mode', visible);
      if (!visible || !seat) return;
      const blockName = block.id.startsWith('L') ? `Loca ${block.locaNo}` : block.id.startsWith('VIP') ? block.name : `Blok ${block.id}`;
      el.hudTitle.textContent = `${blockName} · Sıra ${seat.rowLabel} · Koltuk ${seat.seatNo}`;
      el.hudSub.textContent = catLabel(seat.category);
      $('hudReset').textContent = `⟲ ${focusDative} bak`;
    },
  };
}
