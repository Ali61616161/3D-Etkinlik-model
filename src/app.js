import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import config from './venue/volkswagen-arena.config.js';
import { buildSeatModel, blocksForConfig } from './engine/layout.js';
import { createVenue } from './engine/venue.js';
import { CameraRig } from './engine/cameraRig.js';
import { SeatPicker } from './engine/picker.js';
import { Markers } from './engine/markers.js';
import { createUI } from './ui/ui.js';
import { Minimap } from './ui/minimap.js';

const QUALITY = {
  high: { label: 'Yüksek', shadows: true, shadowMap: 4096, pixelRatio: 2, bloom: true, antialias: true, seatDetail: 'high' },
  medium: { label: 'Orta', shadows: true, shadowMap: 2048, pixelRatio: 1.5, bloom: false, antialias: true, seatDetail: 'high' },
  low: { label: 'Düşük', shadows: false, shadowMap: 1024, pixelRatio: 1, bloom: false, antialias: false, seatDetail: 'low' },
};
const QUALITY_ORDER = ['auto', 'high', 'medium', 'low'];

function resolveQuality() {
  const url = new URLSearchParams(location.search).get('q');
  let pref = url;
  try { pref = pref || localStorage.getItem('arena.quality'); } catch { /* özel pencere */ }
  if (!QUALITY_ORDER.includes(pref)) pref = 'auto';
  let key = pref;
  if (pref === 'auto') {
    const mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
    key = mobile ? 'low' : 'high';
  }
  return { pref, key, q: QUALITY[key] };
}

const AUTO_ACCENT = new THREE.Color(0.1, 0.5, 0.95); // blok vurgusu: mavi (koltuk görünümünde hiç kullanılmaz)

export async function startApp() {
  const { pref, key: qKey, q: quality } = resolveQuality();
  const model = buildSeatModel(config);
  const canvas = document.getElementById('gl');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.antialias && !quality.bloom,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080b);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.16;

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 400);
  // Dikey ekranda (telefon) yatay görüş daralır: dikey FOV'u büyüterek salonu sığdır
  const overviewFovFor = (aspect) => (aspect < 1 ? Math.min(92, 55 + (1 - aspect) * 60) : 55);
  camera.fov = overviewFovFor(camera.aspect);
  camera.updateProjectionMatrix();

  const ui = createUI({
    config,
    model,
    handlers: {
      onConfig: (k) => applyConfig(k),
      onBlock: (id) => selectBlock(id),
      onRow: (i) => onRow(i),
      onSeat: (s) => s && selectSeat(s),
      onView: () => state.seat && selectSeat(state.seat),
      onTint: (on) => { state.tint = on; refreshColors(); },
      onQuality: () => cycleQuality(),
      onStep: (ds, dr) => step(ds, dr),
      onResetLook: () => resetLook(),
      onExit: () => exitSeat(),
    },
  });
  ui.setQuality(pref === 'auto' ? `Oto (${QUALITY[qKey].label})` : QUALITY[qKey].label);
  ui.setLoading('Koltuklar, tribünler ve çatı yapısı üretiliyor');
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

  const venue = createVenue({ config, model, quality, scene });
  const picker = new SeatPicker(model);
  const ownMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.06, color: venue.seatVis.styleColor('standard') });
  const markers = new Markers(scene, venue.seatVis.geometry, ownMat);
  const rig = new CameraRig(camera, canvas);
  rig.overviewFov = overviewFovFor(camera.aspect);
  rig.seatFov = camera.aspect < 1 ? 88 : 72;
  if (matchMedia('(max-width: 860px)').matches) document.getElementById('panel').classList.remove('open');

  const minimap = new Minimap(document.getElementById('mini'), {
    model,
    config,
    onPick: (s) => selectSeat(s),
    onHover: (s, e) => {
      markers.setHover(s);
      if (s && e) ui.tip(seatText(s), e.clientX, e.clientY);
      else ui.tip(null);
    },
  });

  // Post-processing (yalnızca yüksek kalite)
  let composer = null;
  if (quality.bloom) {
    const w = innerWidth, h = innerHeight;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.55, 0.9));
    composer.addPass(new OutputPass());
  }

  const state = { cfg: 'concert', seat: null, block: null, tint: false, view: 'overview' };
  const blockOf = (s) => model.blocks.get(s.blockId);
  const cfgOf = () => config.configurations[state.cfg];
  const seatText = (s) => {
    const b = blockOf(s);
    const bn = b.id.startsWith('L') ? `Loca ${b.locaNo}` : b.id.startsWith('VIP') ? b.name : `Blok ${b.id}`;
    return `${bn} · Sıra ${s.rowLabel} · Koltuk ${s.seatNo}`;
  };

  function refreshColors() {
    // Blok vurgusu yalnızca blok seçili ve koltuk seçili değilken (koltuk görünümünde çevredeki koltuklar boyanmaz)
    // Koltuk görünümünde koltuklar HER ZAMAN gerçek (siyah) renginde çizilir: kategori boyası ve blok vurgusu kapalı.
    const inSeat = state.view === 'seat';
    const blockId = state.block && !state.seat && !inSeat ? state.block.id : null;
    venue.seatVis.refreshColors({ tint: state.tint && !inSeat, blockId, accent: AUTO_ACCENT });
  }

  function invalidateShadows() {
    if (quality.shadows) renderer.shadowMap.needsUpdate = true;
  }

  // ── konfigürasyon ──
  function applyConfig(key, { fly = true } = {}) {
    state.cfg = key;
    state.seat = null;
    state.block = null;
    state.view = 'overview';
    setOwnSeat(null);
    venue.setConfig(key);
    picker.setConfig(key);
    minimap.setConfig(key);
    markers.setSelected(null);
    markers.setBeamAllowed(true);
    ui.setConfig(key, blocksForConfig(model, key));
    if (!matchMedia('(max-width: 860px)').matches) document.getElementById('panel').classList.add('open');
    refreshColors();
    invalidateShadows();
    const ov = cfgOf().overview;
    if (fly) rig.flyToOrbit(ov.position, ov.target, { duration: 1.6 });
    else {
      camera.position.set(...ov.position);
      rig.orbit.target.set(...ov.target);
      rig.orbit.update();
    }
  }

  // ── blok / sıra / koltuk ──
  function selectBlock(id) {
    const block = model.blocks.get(id);
    if (!block) return;
    if (state.view === 'seat') exitSeat(false);
    state.block = block;
    state.seat = null;
    markers.setSelected(null);
    minimap.setSelected(null);
    minimap.setBlock(id);
    ui.setBlock(block);
    ui.showSeat(null);
    refreshColors();
    const c = block.center, f = block.facing;
    const lift = block.kind === 'flat' ? 10 : 8;
    rig.flyToOrbit([c[0] + f[0] * 16, c[1] + lift, c[2] + f[1] * 16], [c[0], c[1] + 1.2, c[2]], { duration: 1.5 });
  }

  function onRow(rowIndex) {
    if (!state.block) return;
    ui.setRow(state.block, rowIndex);
  }

  function statsFor(seat) {
    const focus = cfgOf().focus;
    const dx = focus[0] - seat.pos[0], dy = focus[1] - seat.pos[1], dz = focus[2] - seat.pos[2];
    const hd = Math.hypot(dx, dz) || 1;
    const dot = (seat.facing[0] * dx + seat.facing[1] * dz) / hd;
    return {
      focusLabel: cfgOf().focusLabel,
      distance: Math.hypot(dx, dy, dz),
      height: seat.pos[1],
      side: blockOf(seat).group,
      angle: (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI,
    };
  }

  let ownSeat = null;
  function setOwnSeat(seat) {
    if (ownSeat) venue.seatVis.setSeatHidden(ownSeat, false);
    ownSeat = seat;
    if (seat) venue.seatVis.setSeatHidden(seat, true);
    markers.setOwn(seat);
  }

  function selectSeat(seat, { fly = true, keepLook = false } = {}) {
    const block = blockOf(seat);
    if (fly) state.view = 'seat';
    state.seat = seat;
    state.block = block;
    ui.setBlock(block, seat.rowIndex, seat);
    ui.showSeat(seat, statsFor(seat), block);
    markers.setSelected(seat);
    minimap.setSelected(seat);
    minimap.setBlock(block.id);
    refreshColors();
    if (!fly) return;
    setOwnSeat(seat);
    ui.setHud(seat, block, true, cfgOf().focusDative);
    markers.setBeamAllowed(false);
    let lookDir = null;
    if (keepLook) {
      const cp = Math.cos(rig.pitch);
      lookDir = new THREE.Vector3(-Math.sin(rig.yaw) * cp, Math.sin(rig.pitch), -Math.cos(rig.yaw) * cp);
    }
    rig.flySeat(seat, cfgOf().focus, { lookDir, duration: keepLook ? 0.75 : undefined });
    document.getElementById('panel').classList.remove('open');
  }

  function exitSeat(fly = true) {
    if (state.view !== 'seat') return;
    state.view = 'overview';
    setOwnSeat(null);
    refreshColors();
    ui.setHud(null, null, false);
    markers.setBeamAllowed(true);
    if (!matchMedia('(max-width: 860px)').matches) document.getElementById('panel').classList.add('open');
    if (fly) {
      const ov = cfgOf().overview;
      rig.flyToOrbit(ov.position, ov.target, { duration: 1.7 });
    }
  }

  function step(ds, dr) {
    const seat = state.seat;
    if (!seat || state.view !== 'seat' || rig.mode === 'fly') return;
    const block = blockOf(seat);
    let row = block.rows[seat.rowIndex];
    let next = null;
    if (dr) {
      const target = block.rows[seat.rowIndex + dr];
      if (!target) return ui.toast(dr < 0 ? 'Bu blokta daha öne sıra yok' : 'Bu blokta daha arkaya sıra yok');
      row = target;
      let bd = Infinity;
      for (const idx of target.seats) {
        const s = model.seats[idx];
        const d = (s.pos[0] - seat.pos[0]) ** 2 + (s.pos[2] - seat.pos[2]) ** 2;
        if (d < bd) { bd = d; next = s; }
      }
    } else {
      const idx = row.seats[seat.seatIndexInRow + ds];
      if (idx == null) return ui.toast(ds < 0 ? 'Sıranın başındasın' : 'Sıranın sonundasın');
      next = model.seats[idx];
    }
    if (next) selectSeat(next, { keepLook: true });
  }

  function resetLook() {
    if (state.view !== 'seat' || rig.mode !== 'seat') return;
    rig.lookAt(cfgOf().focus);
  }

  function cycleQuality() {
    const i = QUALITY_ORDER.indexOf(pref);
    const next = QUALITY_ORDER[(i + 1) % QUALITY_ORDER.length];
    try {
      localStorage.setItem('arena.quality', next);
    } catch {
      ui.toast('Bu ortamda kalite ayarı kaydedilemiyor');
      return;
    }
    const u = new URL(location.href);
    if (u.searchParams.has('q')) {
      u.searchParams.delete('q');
      location.href = u.toString();
    } else {
      location.reload();
    }
  }

  function setTint(on) {
    state.tint = on;
    refreshColors();
  }

  // ── fare: hover + tıklama ──
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const mouse = { x: 0, y: 0, dirty: false, down: null };
  const pickAt = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return picker.pick(ray.ray);
  };
  canvas.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.dirty = e.pointerType === 'mouse';
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.dirty = false;
    markers.setHover(null);
    ui.tip(null);
  });
  canvas.addEventListener('pointerdown', (e) => {
    mouse.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointerup', (e) => {
    const d = mouse.down;
    mouse.down = null;
    if (!d || rig.mode !== 'orbit') return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return;
    const s = pickAt(e.clientX, e.clientY);
    if (s) selectSeat(s);
  });

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLSelectElement) return;
    if (state.view === 'seat') {
      const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (map[e.key]) { e.preventDefault(); step(...map[e.key]); }
      else if (e.key === 'Escape') exitSeat();
      else if (e.key === ' ') { e.preventDefault(); resetLook(); }
    }
  });

  rig.onModeChange = (m) => {
    document.body.dataset.cam = m;
    if (m !== 'orbit') {
      ui.tip(null);
      markers.setHover(null);
    }
  };

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    rig.overviewFov = overviewFovFor(camera.aspect);
    if (rig.mode !== 'seat') rig.seatFov = camera.aspect < 1 ? 88 : 72;
    if (rig.mode === 'orbit') camera.fov = rig.overviewFov;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    composer?.setSize(innerWidth, innerHeight);
  });

  // ── başlangıç ──
  camera.position.set(...config.configurations.concert.overview.position);
  applyConfig('concert', { fly: false });
  rig.orbit.update();
  setTint(false);

  let last = performance.now();
  let t = 0;
  let frames = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    rig.update(dt);
    if (venue.update(t, camera.position)) invalidateShadows();
    markers.update(t);
    if (mouse.dirty && rig.mode === 'orbit' && !mouse.down) {
      mouse.dirty = false;
      const s = pickAt(mouse.x, mouse.y);
      markers.setHover(s);
      ui.tip(s ? seatText(s) : null, mouse.x, mouse.y);
      canvas.style.cursor = s ? 'pointer' : '';
    }
    if (composer) composer.render();
    else renderer.render(scene, camera);
    if (++frames === 2) ui.hideLoading();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Test/demo için küçük dış API
  window.__arena = {
    model,
    config,
    state,
    camera,
    rig,
    venue,
    renderer,
    applyConfig,
    selectBlock,
    selectSeat,
    exitSeat,
    seatById: (id) => model.seats.find((s) => s.id === id),
    quality: qKey,
    setTint,
  };
}
