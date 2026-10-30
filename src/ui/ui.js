import { blockLabel } from '../engine/layout.js';

const esc = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeColor = (c) => (/^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '#4cc2ff');

/** DOM bağları: üst bar, ayarlar menüsü, sekmeli panel, HUD. İş mantığı app.js'te. */
export function createUI({ config, model, handlers }) {
  const $ = (id) => document.getElementById(id);
  const el = {
    cfgSelect: $('cfgSelect'),
    selBlock: $('selBlock'),
    lblBlock: $('lblBlock'),
    selRow: $('selRow'),
    selSeat: $('selSeat'),
    seatFields: $('seatFields'),
    infoCard: $('infoCard'),
    infoTitle: $('infoTitle'),
    infoDot: $('infoDot'),
    infoCat: $('infoCat'),
    infoStats: $('infoStats'),
    infoNote: $('infoNote'),
    crowd: $('btnCrowd'),
    tint: $('btnTint'),
    imm: $('btnImm'),
    quick: $('quick'),
    bar: $('blockBar'),
    bbTitle: $('bbTitle'),
    bbSub: $('bbSub'),
    btnView: $('btnView'),
    legend: $('legend'),
    hud: $('hud'),
    hudTitle: $('hudTitle'),
    hudSub: $('hudSub'),
    tip: $('tip'),
    toast: $('toast'),
    loading: $('loading'),
    loadDetail: $('loadDetail'),
    about: $('about'),
    panel: $('panel'),
    menu: $('menu'),
    btnMenu: $('btnMenu'),
    qList: $('qList'),
    tabs: [$('tabPick'), $('tabMap')],
    panes: { pick: $('paneSeat'), map: $('paneMap') },
  };
  let silent = false;
  const quiet = (fn) => {
    silent = true;
    try { fn(); } finally { silent = false; }
  };
  const opt = (value, text, extra = {}) => Object.assign(new Option(text, value), extra);
  const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');
  const catLabel = (k) => config.categories[k]?.label ?? k;

  // ── etkinlik düzeni seçici ──
  for (const [key, c] of Object.entries(config.configurations)) el.cfgSelect.append(opt(key, c.label));
  el.cfgSelect.addEventListener('change', () => handlers.onConfig(el.cfgSelect.value));

  // ── seçiciler ──
  el.selBlock.addEventListener('change', () => !silent && el.selBlock.value && handlers.onBlock(el.selBlock.value));
  el.selRow.addEventListener('change', () => !silent && handlers.onRow(Number(el.selRow.value)));
  el.selSeat.addEventListener('change', () => !silent && handlers.onSeat(model.seats[Number(el.selSeat.value)]));
  el.btnView.addEventListener('click', () => handlers.onView());
  el.imm.addEventListener('click', () => handlers.onFullscreen());
  $('bbGo').addEventListener('click', () => handlers.onView());
  $('bbClose').addEventListener('click', () => handlers.onClearBlock());
  $('panelToggle').addEventListener('click', () => el.panel.classList.toggle('open'));
  $('hudPrev').addEventListener('click', () => handlers.onStep(-1, 0));
  $('hudNext').addEventListener('click', () => handlers.onStep(1, 0));
  $('hudFront').addEventListener('click', () => handlers.onStep(0, -1));
  $('hudBack').addEventListener('click', () => handlers.onStep(0, 1));
  $('hudReset').addEventListener('click', () => handlers.onResetLook());
  $('hudExit').addEventListener('click', () => handlers.onExit());

  // ── sekmeler ──
  const showTab = (name) => {
    el.tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    for (const [k, p] of Object.entries(el.panes)) p.hidden = k !== name;
    if (name === 'map') handlers.onMapShown?.();
  };
  el.tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

  // ── ayarlar menüsü ──
  const setMenu = (open) => {
    el.menu.hidden = !open;
    el.btnMenu.setAttribute('aria-expanded', String(open));
  };
  el.btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    setMenu(el.menu.hidden);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!el.menu.hidden && !el.menu.contains(e.target) && e.target !== el.btnMenu && !el.btnMenu.contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.menu.hidden) setMenu(false);
  });
  const toggle = (btn, cb) =>
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      cb(on);
    });
  toggle(el.tint, (on) => handlers.onTint(on));
  toggle(el.crowd, (on) => handlers.onCrowd(on));
  $('btnFs').addEventListener('click', () => { setMenu(false); handlers.onFullscreen(); });
  $('btnAbout').addEventListener('click', () => {
    setMenu(false);
    el.about.showModal();
    el.about.scrollTop = 0;
  });

  // Grafik kalitesi: açık liste (tıklayınca seçilir). "Otomatik" cihaza göre belirlenir.
  const qOptions = handlers.qualityOptions();
  for (const o of qOptions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.dataset.q = o.key;
    b.innerHTML = `<span>${esc(o.label)}<small data-sub="${esc(o.key)}">${esc(o.sub ?? '')}</small></span>`;
    b.addEventListener('click', () => handlers.onQualityPick(o.key));
    el.qList.append(b);
  }

  // Bilgi penceresi
  const meta = config.meta;
  const evtList = Object.values(config.configurations)
    .map((c) => `<li><b>${esc(c.label)}</b> — ${esc(c.note ?? '')}</li>`)
    .join('');
  $('aboutBody').innerHTML = `
    <p>${esc(meta.name)} — ${esc(meta.location)} · İşletmeci: ${esc(meta.operator)}</p>
    <h3>Etkinlik düzenleri</h3>
    <ul>${evtList}</ul>
    <h3>Kaynaklar</h3>
    <ul>${meta.sources.map((s) => `<li><b>${esc(s.label)}</b> — ${esc(s.use)}</li>`).join('')}</ul>
    <h3>Tahmin / varsayımlar</h3>
    <ul>${meta.assumptions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <h3>Not</h3>
    <ul><li>Model, resmî plan ve fotoğraflardan üretilmiş tahmini bir yerleşimdir; gerçek bilet planı yerine geçmez.</li>
    <li>Ölçüler <code>src/venue/volkswagen-arena.config.js</code> dosyasından okunur; resmî plan geldiğinde yalnızca bu dosya güncellenir.</li></ul>`;

  const standZones = [
    ['Sol ön', 'Ön', 'Sağ ön'],
    ['Sol orta', 'Orta', 'Sağ orta'],
    ['Sol arka', 'Arka', 'Sağ arka'],
  ];

  return {
    setLoading(msg) { el.loadDetail.textContent = msg ?? ''; },
    hideLoading() { el.loading.classList.add('done'); setTimeout(() => el.loading.remove(), 800); },
    /** pref: seçili tercih (auto|high|medium|low|mobile); autoLabel: "Otomatik" satırının yanında gösterilen seçilen seviye. */
    setQuality(pref, autoLabel) {
      el.qList.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.q === pref)));
      const sub = el.qList.querySelector('[data-sub="auto"]');
      if (sub) sub.textContent = autoLabel ? `· ${autoLabel}` : '';
    },
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
      const seated = blocks.filter((b) => b.style !== 'standing');
      const hasStanding = seated.length !== blocks.length;
      el.lblBlock.textContent = 'Blok / loca / masa';
      quiet(() => {
        el.selBlock.replaceChildren(opt('', 'Seçin…'));
        const groups = new Map();
        for (const b of seated) {
          if (!groups.has(b.group)) groups.set(b.group, []);
          groups.get(b.group).push(b);
        }
        for (const [name, list] of groups) {
          const og = document.createElement('optgroup');
          og.label = name;
          for (const b of list) og.append(opt(b.id, `${blockLabel(b)} · ${b.capacity ?? b.seatCount} kişi`));
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

      // hızlı seçim: ayakta konum ızgarası, loca ve masa numaraları (büyük, parmakla basılır)
      el.quick.replaceChildren();
      if (hasStanding) {
        const wrap = document.createElement('div');
        const h = document.createElement('h3');
        h.textContent = 'Ayakta nerede durmak istersin?';
        const note = document.createElement('p');
        note.className = 'stand-note';
        note.textContent = 'Ayakta alanda yer ayrılmaz. Bir bölge seç ya da salonda istediğin yere dokun.';
        const grid = document.createElement('div');
        grid.className = 'grid stand';
        standZones.forEach((row, iz) =>
          row.forEach((label, ix) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = label;
            btn.dataset.stand = `${ix - 1},${iz}`;
            btn.addEventListener('click', () => handlers.onStandZone(ix - 1, iz));
            grid.append(btn);
          }),
        );
        const hh = document.createElement('div');
        hh.className = 'heights';
        const hl = document.createElement('span');
        hl.textContent = 'Boyun';
        hh.append(hl);
        for (const v of [1.55, 1.7, 1.85]) {
          const b = document.createElement('button');
          b.type = 'button';
          b.dataset.h = String(v);
          b.setAttribute('aria-pressed', String(v === 1.7));
          b.textContent = `${String(v).replace('.', ',')} m`;
          b.addEventListener('click', () => {
            hh.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
            handlers.onStandHeight(v);
          });
          hh.append(b);
        }
        wrap.append(h, note, grid, hh);
        el.quick.append(wrap);
      }
      for (const [title, cls, pick] of [['Localar', 'loca', (b) => b.locaNo], ['Masalar', 'masa', (b) => b.kind === 'tables']]) {
        const list = blocks.filter(pick);
        if (!list.length) continue;
        const wrap = document.createElement('div');
        const h = document.createElement('h3');
        h.textContent = `${title} (${list.length})`;
        const grid = document.createElement('div');
        grid.className = 'grid';
        for (const b of list) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = cls;
          btn.dataset.block = b.id;
          btn.textContent = b.locaNo ?? b.id.replace('M', '');
          btn.setAttribute('aria-label', b.name);
          btn.addEventListener('click', () => handlers.onBlock(b.id));
          grid.append(btn);
        }
        wrap.append(h, grid);
        el.quick.append(wrap);
      }
      el.infoCard.hidden = true;
      el.hud.hidden = true;
    },

    /** Blok seçimi: sıra listesini doldur. */
    setBlock(block, rowIndex = null, seat = null) {
      quiet(() => {
        el.selBlock.value = block && block.style !== 'standing' ? block.id : '';
        el.selRow.replaceChildren();
        el.selSeat.replaceChildren();
        if (!block || block.style === 'standing') { el.selRow.disabled = el.selSeat.disabled = true; return; }
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

    /** Seçili blok çubuğu (koltuk seçilene kadar). */
    setBlockBar(block, visible) {
      el.bar.hidden = !visible || !block;
      el.quick.querySelectorAll('button[data-block]').forEach((b) => b.setAttribute('aria-pressed', String(!!block && b.dataset.block === block.id)));
      if (!visible || !block) return;
      el.bbTitle.textContent = blockLabel(block);
      const cap = block.capacity ?? block.seatCount;
      el.bbSub.textContent = `${cap} kişi · bir koltuğa dokun`;
    },
    setCrowd(on) { el.crowd.setAttribute('aria-pressed', String(on)); },
    setTint(on) { el.tint.setAttribute('aria-pressed', String(on)); },
    setImmersive(on) {
      document.body.classList.toggle('immersive', on);
      el.imm.hidden = !on;
    },

    /** Blok seçildi (koltuk henüz değil): özet kart. */
    showBlock(block, stats, note) {
      el.infoCard.hidden = false;
      el.infoTitle.textContent = blockLabel(block);
      el.infoDot.style.background = safeColor(config.categories[block.category]?.color);
      el.infoCat.textContent = catLabel(block.category);
      const cap = block.capacity ?? block.seatCount;
      el.infoStats.innerHTML = `
        <div><dt>${block.locaNo ? 'Kapasite' : 'Koltuk'}</dt><dd>${cap} kişi</dd></div>
        <div><dt>${esc(stats.focusLabel)}</dt><dd>${fmt(stats.distance, 0)} m</dd></div>`;
      el.infoNote.textContent = note ?? '';
      el.btnView.textContent = block.locaNo ? 'Locadan göster' : 'Bloktan göster';
    },

    showSeat(seat, stats, block, note) {
      if (!seat) { el.infoCard.hidden = true; return; }
      el.infoCard.hidden = false;
      el.infoTitle.textContent = stats.title ?? `${blockLabel(block)} · Sıra ${seat.rowLabel} · Koltuk ${seat.seatNo}`;
      el.infoDot.style.background = safeColor(config.categories[seat.category]?.color);
      el.infoCat.textContent = stats.sub ?? catLabel(seat.category);
      el.infoStats.innerHTML = `
        <div><dt>${esc(stats.focusLabel)}</dt><dd>${fmt(stats.distance, 0)} m</dd></div>
        <div><dt>Yükseklik</dt><dd>${fmt(stats.height)} m</dd></div>`;
      el.infoNote.textContent = note ?? '';
      el.btnView.textContent = seat.style === 'standing' ? 'Buradan göster' : 'Koltuktan göster';
      quiet(() => {
        el.selBlock.value = block.style === 'standing' ? '' : block.id;
      });
    },

    setHud(seat, block, visible, focusDative, stats) {
      el.hud.hidden = !visible;
      document.body.classList.toggle('seat-mode', visible);
      if (!visible || !seat) return;
      el.hudTitle.textContent = stats?.title ?? `${blockLabel(block)} · Sıra ${seat.rowLabel} · Koltuk ${seat.seatNo}`;
      el.hudSub.textContent = stats?.sub ?? catLabel(seat.category);
      $('hudReset').textContent = `⟲ ${focusDative} bak`;
      const standing = seat.style === 'standing';
      $('hudFront').textContent = standing ? '▲ İleri' : '▲ Öne';
      $('hudBack').textContent = standing ? '▼ Geri' : '▼ Arkaya';
    },
  };
}
