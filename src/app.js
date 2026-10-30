import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import config from './venue/volkswagen-arena.config.js';
import { buildSeatModel, blocksForConfig, makeGroundHeight, makeCameraBounds, blockLabel } from './engine/layout.js';
import { createVenue } from './engine/venue.js';
import { CameraRig } from './engine/cameraRig.js';
import { SeatPicker } from './engine/picker.js';
import { Markers } from './engine/markers.js';
import { Crowd } from './engine/crowd.js';
import { createUI } from './ui/ui.js';
import { Minimap } from './ui/minimap.js';

const QUALITY = {
  high: { label: 'Yüksek', shadows: true, shadowMap: 4096, pixelRatio: 2, bloom: true, antialias: true, seatDetail: 'high', seatNear: 22 },
  medium: { label: 'Orta', shadows: true, shadowMap: 2048, pixelRatio: 1.5, bloom: false, antialias: true, seatDetail: 'mid', seatNear: 16 },
  low: { label: 'Düşük', shadows: false, shadowMap: 1024, pixelRatio: 1.5, bloom: false, antialias: true, seatDetail: 'low', seatNear: 12 },
  // Telefon: yüksek yoğunluklu ekranda piksellenmeyi önlemek için 2× çözünürlük, hafif koltuk, tek seferlik gölge
  mobile: { label: 'Mobil', shadows: true, shadowMap: 1024, pixelRatio: 2, bloom: false, antialias: true, seatDetail: 'low', seatNear: 12 },
};
const QUALITY_ORDER = ['auto', 'high', 'medium', 'low'];

/** Cihaz gücüne göre otomatik seviye: telefon → mobil; yazılım render / az çekirdek / az bellek → düşük-orta; diğer → yüksek. */
function autoQuality() {
  const mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  if (mobile) return 'mobile';
  let gpu = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  } catch { /* yoksay */ }
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) return 'low';
  const mem = navigator.deviceMemory ?? 8, cores = navigator.hardwareConcurrency ?? 8;
  if (mem <= 4 || cores <= 4 || /Intel.*(HD|UHD) Graphics [0-9]{3}\b/i.test(gpu)) return 'medium';
  return 'high';
}

function resolveQuality() {
  const url = new URLSearchParams(location.search).get('q');
  let pref = url;
  try { pref = pref || localStorage.getItem('arena.quality'); } catch { /* özel pencere */ }
  if (!QUALITY_ORDER.includes(pref) && pref !== 'mobile') pref = 'auto';
  const key = pref === 'auto' ? autoQuality() : pref;
  return { pref, key, q: QUALITY[key] };
}

// Hafif vinyet: kenarları karartarak odağı merkeze toplar (yalnızca yüksek kalite)
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, strength: { value: 0.5 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader:
    'uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float v = smoothstep(0.9, 0.25, length(vUv - 0.5) * 1.2); c.rgb *= mix(1.0 - strength, 1.0, v); gl_FragColor = c; }',
};

const AUTO_ACCENT = new THREE.Color(0.04, 0.3, 0.7); // blok vurgusu: mavi (koltuk görünümünde hiç kullanılmaz)

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
      onView: () => (state.seat ? selectSeat(state.seat) : state.block && selectSeat(middleSeat(state.block))),
      onFullscreen: () => toggleFullscreen(),
      onClearBlock: () => clearBlock(),
      onCrowd: (on) => setCrowd(on),
      onTint: (on) => { state.tint = on; refreshColors(); },
      qualityOptions: () => [
        { key: 'auto', label: 'Otomatik', sub: '' },
        { key: 'high', label: 'Yüksek', sub: 'güçlü bilgisayar' },
        { key: 'medium', label: 'Orta', sub: 'dengeli' },
        { key: 'low', label: 'Düşük', sub: 'eski cihaz, akıcı' },
      ],
      onQualityPick: (k) => setQualityPref(k),
      onStandZone: (ix, iz) => standZone(ix, iz),
      onStandHeight: (h) => { standH = h; if (state.view === 'seat' && state.seat?.style === 'standing') viewStanding(state.seat); },
      onMapShown: () => minimap.resize(),
      onStep: (ds, dr) => step(ds, dr),
      onResetLook: () => resetLook(),
      onExit: () => exitSeat(),
    },
  });
  ui.setQuality(pref === 'mobile' ? 'auto' : pref, pref === 'auto' || pref === 'mobile' ? QUALITY[qKey].label : '');
  ui.setLoading('Koltuklar, tribünler ve çatı yapısı üretiliyor');
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

  const venue = createVenue({ config, model, quality, scene });
  const picker = new SeatPicker(model);
  const ownMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.02, color: venue.seatVis.styleColor('standard') });
  const markers = new Markers(scene, venue.seatVis.geometry, ownMat);
  const crowd = new Crowd({ model, config, quality, scene });
  const rig = new CameraRig(camera, canvas);
  const groundHeight = makeGroundHeight(config);
  rig.bounds = makeCameraBounds(config, groundHeight); // yerin altına / çatının üstüne / duvar dışına çıkılamaz
  rig.overviewFov = overviewFovFor(camera.aspect);
  rig.seatFov = camera.aspect < 1 ? 88 : 72;
  if (matchMedia('(max-width: 860px)').matches) document.getElementById('panel').classList.remove('open');

  const minimap = new Minimap(document.getElementById('mini'), {
    model,
    config,
    onPick: (s) => handlePick(s),
    onHover: (s, e) => {
      hoverSeat(s);
      if (s && e) ui.tip(hoverText(s), e.clientX, e.clientY);
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
    composer.addPass(new ShaderPass(VignetteShader));
    composer.addPass(new OutputPass());
  }

  const state = { cfg: 'concert', seat: null, block: null, tint: false, view: 'overview', crowd: false, immersive: false };
  const crowdChoice = {}; // düzen başına kullanıcı tercihi
  const blockOf = (s) => model.blocks.get(s.blockId);
  const cfgOf = () => config.configurations[state.cfg];
  const seatText = (s) => (s.style === 'standing' ? 'Ayakta · buradan göster' : `${blockLabel(blockOf(s))} · Sıra ${s.rowLabel} · Koltuk ${s.seatNo}`);

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
    ui.setBlockBar(null, false);
    venue.setConfig(key);
    picker.setConfig(key);
    minimap.setConfig(key);
    markers.setSelected(null);
    markers.setBeamAllowed(true);
    ui.setConfig(key, blocksForConfig(model, key));
    if (!matchMedia('(max-width: 860px)').matches) document.getElementById('panel').classList.add('open');
    syncCrowd();
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
  /** Bloğa karşıdan bakış: blok ekranı dolduracak mesafede, kortlara bakan taraftan, hafif yukarıdan. */
  function blockViewPose(block) {
    const f = block.facing, u = [-f[1], f[0]];
    let minU = Infinity, maxU = -Infinity, minD = Infinity, maxD = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const row of block.rows) {
      for (const i of row.seats) {
        const p = model.seats[i].pos;
        const du = p[0] * u[0] + p[2] * u[1], dd = p[0] * f[0] + p[2] * f[1];
        minU = Math.min(minU, du); maxU = Math.max(maxU, du);
        minD = Math.min(minD, dd); maxD = Math.max(maxD, dd);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      }
    }
    const el = block.kind === 'flat' || block.kind === 'tables' ? 0.62 : 0.34;
    const vfov = (rig.overviewFov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const w = maxU - minU + 1.6;
    const hProj = (maxY - minY + 1.2) * Math.cos(el) + (maxD - minD + 0.8) * Math.sin(el);
    const dist = Math.max(w / 2 / Math.tan(hfov / 2), hProj / 2 / Math.tan(vfov / 2)) * 1.32 + 3;
    const c = block.center;
    // masaüstünde sağ panel görüşün bir kısmını kapatır: bloğu ekranın soluna doğru kaydır
    const shift = innerWidth > 860 ? Math.tan(hfov / 2) * dist * 0.26 : 0;
    const sx = -u[0] * shift, sz = -u[1] * shift;
    const pos = new THREE.Vector3(c[0] + sx + f[0] * dist * Math.cos(el), c[1] + 1 + dist * Math.sin(el), c[2] + sz + f[1] * dist * Math.cos(el));
    rig.bounds(pos);
    return { position: pos.toArray(), target: [c[0] + sx, c[1] + 0.7, c[2] + sz] };
  }

  function selectBlock(id, { hint = false } = {}) {
    const block = model.blocks.get(id);
    if (!block) return;
    if (state.view === 'seat') exitSeat(false);
    state.block = block;
    state.seat = null;
    markers.setSelected(null);
    minimap.setSelected(null);
    minimap.setBlock(id);
    ui.setBlock(block);
    ui.showBlock(block, statsFor({ pos: block.center, facing: block.facing, style: block.style }), blockNote(block));
    ui.setBlockBar(block, true);
    refreshColors();
    const pose = blockViewPose(block);
    rig.flyToOrbit(pose.position, pose.target, { duration: 1.4 });
    if (hint) ui.toast(`${blockName(block)} · bir koltuğa dokun`, 2600);
  }

  function clearBlock() {
    state.block = null;
    state.seat = null;
    markers.setSelected(null);
    minimap.setSelected(null);
    minimap.setBlock(null);
    ui.setBlock(null);
    ui.showSeat(null);
    ui.setBlockBar(null, false);
    refreshColors();
    const ov = cfgOf().overview;
    rig.flyToOrbit(ov.position, ov.target, { duration: 1.2 });
  }

  const middleSeat = (block) => {
    const row = block.rows[Math.floor(block.rows.length / 2)];
    return model.seats[row.seats[Math.floor(row.seats.length / 2)]];
  };

  /** Etkinliğe özel bilgi notu (loca satış politikası vb.). */
  function blockNote(block) {
    if (block.locaNo) return cfgOf().locaNote ?? '';
    if (block.style === 'standing') return 'Ayakta alan: koltuk numarası yok; seçilen nokta bir bakış noktasıdır (göz ≈ 1,68 m).';
    return '';
  }

  /**
   * Salondan/plandan tıklama: önce BLOK seçilir ve karşıdan bakılır (uzaktan tek koltuğu vurmak zor);
   * aynı bloğun içindeyken bir koltuğa tıklanırsa o koltuğun gözüne inilir.
   */
  function handlePick(seat) {
    if (seat.style === 'standing') return viewStanding(seat);
    const block = blockOf(seat);
    if (state.view === 'overview' && state.block && state.block.id === block.id) selectSeat(seat);
    else selectBlock(block.id, { hint: true });
  }

  function hoverSeat(seat) {
    // yalnızca seçili blok içindeki koltuklar tek tek vurgulanır
    markers.setHover(seat && state.block && seat.blockId === state.block.id ? seat : null);
  }

  function hoverText(seat) {
    const b = blockOf(seat);
    return state.block && state.block.id === b.id ? seatText(seat) : `${blockName(b)} · blok görünümü için dokun`;
  }

  const blockName = blockLabel;

  function onRow(rowIndex) {
    if (!state.block) return;
    ui.setRow(state.block, rowIndex);
  }

  // Ayakta alan: yer ayrılmaz; kullanıcı bölge ve boy seçer (göz yüksekliği = boy − 0,1 m).
  let standH = 1.7;
  const standPoints = () => picker.list.filter((s) => s.style === 'standing');
  function nearestStanding(x, z) {
    let best = null, bd = Infinity;
    for (const s of standPoints()) {
      const d = (s.pos[0] - x) ** 2 + (s.pos[2] - z) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function viewStanding(seat) {
    if (!seat) return;
    seat.eye[1] = seat.pos[1] + standH - 0.1;
    selectSeat(seat);
  }
  /** ix: −1 sol / 0 orta / 1 sağ · iz: 0 ön / 1 orta / 2 arka */
  function standZone(ix, iz) {
    const pts = standPoints();
    if (!pts.length) return;
    const zs = pts.map((p) => p.pos[2]);
    const zMin = Math.min(...zs), zMax = Math.max(...zs);
    const xs = pts.map((p) => Math.abs(p.pos[0]));
    const xMax = Math.max(...xs);
    viewStanding(nearestStanding(ix * xMax * 0.6, zMin + ((zMax - zMin) * (iz + 0.5)) / 3));
  }
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const _hit = new THREE.Vector3();

  function statsFor(seat) {
    const focus = cfgOf().focus;
    const dx = focus[0] - seat.pos[0], dy = focus[1] - seat.pos[1], dz = focus[2] - seat.pos[2];
    const hd = Math.hypot(dx, dz) || 1;
    const dot = (seat.facing[0] * dx + seat.facing[1] * dz) / hd;
    const distance = Math.hypot(dx, dy, dz);
    const standing = seat.style === 'standing';
    const lateral = Math.abs(seat.pos[0]) < 4 ? 'orta' : seat.pos[0] < 0 ? 'sol' : 'sağ';
    return {
      title: standing ? `${seat.category === 'ayakta-gc' ? 'Golden Circle' : 'Ayakta'} · ${cfgOf().focusLabel} ${Math.round(distance)} m` : undefined,
      sub: standing ? `${lateral[0].toUpperCase()}${lateral.slice(1)} bölge · boy ${standH.toFixed(2).replace('.', ',')} m` : undefined,
      focusLabel: cfgOf().focusLabel,
      distance,
      height: seat.pos[1],
      side: (seat.blockId ? blockOf(seat) : state.block)?.group ?? '',
      angle: (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI,
    };
  }

  let ownSeat = null;
  function setOwnSeat(seat) {
    if (ownSeat) venue.seatVis.setSeatHidden(ownSeat, false);
    ownSeat = seat;
    if (seat) venue.seatVis.setSeatHidden(seat, true);
    markers.setOwn(seat && !seat.noMesh ? seat : null);
    crowd.hideAt(seat);
  }

  function selectSeat(seat, { fly = true, keepLook = false } = {}) {
    const block = blockOf(seat);
    if (fly) state.view = 'seat';
    state.seat = seat;
    ui.setBlockBar(null, false);
    state.block = block;
    ui.setBlock(block, seat.rowIndex, seat);
    ui.showSeat(seat, statsFor(seat), block, blockNote(block));
    markers.setSelected(seat);
    minimap.setSelected(seat);
    minimap.setBlock(block.id);
    refreshColors();
    if (!fly) return;
    setOwnSeat(seat);
    ui.setHud(seat, block, true, cfgOf().focusDative, statsFor(seat));
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
    if (state.block && !state.seat) ui.setBlockBar(state.block, true);
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

  // ── seyirci kalabalığı ──
  function crowdWanted() {
    if (state.cfg in crowdChoice) return crowdChoice[state.cfg];
    // varsayılan: ayakta, gala ve basketbolda açık; hafif cihazda (mobil/düşük) kapalı
    return !!cfgOf().crowd && qKey !== 'low' && qKey !== 'mobile';
  }
  function syncCrowd() {
    state.crowd = crowdWanted();
    crowd.setConfig(state.cfg, state.crowd);
    crowd.hideAt(state.view === 'seat' ? state.seat : null);
    ui.setCrowd(state.crowd);
  }
  function setCrowd(on) {
    crowdChoice[state.cfg] = on;
    syncCrowd();
  }

  // ── tam ekran / sinema modu ──
  // Gerçek tam ekran çoğu telefonda (iOS Safari) ve gömülü sayfalarda yoktur; bu yüzden her durumda "sinema modu"
  // açılır: arayüz gizlenir, 3D görünüm tüm ekranı kaplar. Gerçek tam ekran destekleniyorsa o da istenir.
  function setImmersive(on) {
    state.immersive = on;
    ui.setImmersive(on);
  }
  async function toggleFullscreen() {
    if (state.immersive) {
      setImmersive(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      return;
    }
    setImmersive(true);
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else ui.toast('Sinema modu açık. Çıkmak için sağ üstteki düğmeye dokun.', 3200);
    } catch {
      ui.toast('Tarayıcı tam ekranı engelledi: sinema modu açık. Çıkmak için sağ üstteki düğmeye dokun.', 3600);
    }
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && state.immersive) setImmersive(false);
  });

  function setQualityPref(next) {
    if (next === pref) return;
    try {
      if (next === 'auto') localStorage.removeItem('arena.quality');
      else localStorage.setItem('arena.quality', next);
    } catch {
      ui.toast('Bu ortamda kalite ayarı kaydedilemiyor');
      return;
    }
    const u = new URL(location.href);
    u.searchParams.delete('q');
    if (u.toString() !== location.href) location.href = u.toString();
    else location.reload();
  }

  function setTint(on) {
    state.tint = on;
    ui.setTint(on);
    refreshColors();
  }

  // ── fare/dokunma: önce blok, sonra bloğun içinden koltuk ──
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const mouse = { x: 0, y: 0, dirty: false, down: null };
  const rayAt = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray;
  };
  /** Dokunma: seçili blok içinde koltuk bulunursa onu, yoksa dokunulan bloğu seçer. */
  function tapAt(cx, cy) {
    const r = rayAt(cx, cy);
    if (state.view === 'overview' && state.block) {
      const seat = picker.pickSeatInBlock(r, state.block);
      if (seat) return selectSeat(seat);
    }
    const hit = picker.pickBlock(r);
    if (!hit) return;
    if (hit.block.style === 'standing') {
      // ayakta alan: dokunulan zemin noktası doğrudan görüş noktası olur
      if (r.intersectPlane(floorPlane, _hit)) return viewStanding(nearestStanding(_hit.x, _hit.z));
    }
    if (state.block && hit.block.id === state.block.id) return ui.toast('Bir koltuğa dokun ya da listeden seç', 1800);
    selectBlock(hit.block.id, { hint: true });
  }
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
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 600) return;
    tapAt(e.clientX, e.clientY);
  });

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLSelectElement) return;
    if (e.key === 'Escape' && state.immersive && state.view !== 'seat') return setImmersive(false);
    if (state.view === 'seat') {
      const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (map[e.key]) { e.preventDefault(); step(...map[e.key]); }
      else if (e.key === 'Escape') (state.immersive ? setImmersive(false) : exitSeat());
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

  // Uyarlanabilir çözünürlük: kare süresi uzarsa piksel oranı kademeli düşer; çok yavaşsa ağır efektler kapanır.
  const perf = { ema: 16, cool: 90, ratio: renderer.getPixelRatio(), max: renderer.getPixelRatio() };
  function adapt(ms) {
    if (ms > 250 || document.hidden) return; // sekme arka plandaydı
    perf.ema = perf.ema * 0.94 + ms * 0.06;
    if (--perf.cool > 0) return;
    if (perf.ema > 32 && perf.ratio > 1) {
      perf.ratio = Math.max(1, perf.ratio - 0.25);
      renderer.setPixelRatio(perf.ratio);
      renderer.setSize(innerWidth, innerHeight, false);
      composer?.setPixelRatio(perf.ratio);
      composer?.setSize(innerWidth, innerHeight);
      perf.cool = 100;
    } else if (perf.ema > 38 && perf.ratio <= 1 && !venue.state.lite) {
      venue.state.lite = true; // lazer, gobo, toz kapanır
      perf.cool = 200;
    } else if (perf.ema < 19 && perf.ratio < perf.max && !venue.state.lite) {
      perf.ratio = Math.min(perf.max, perf.ratio + 0.25);
      renderer.setPixelRatio(perf.ratio);
      renderer.setSize(innerWidth, innerHeight, false);
      composer?.setPixelRatio(perf.ratio);
      composer?.setSize(innerWidth, innerHeight);
      perf.cool = 300;
    }
  }

  let last = performance.now();
  let t = 0;
  let frames = 0;
  function frame(now) {
    const rawMs = now - last;
    adapt(rawMs);
    const dt = Math.min(0.05, rawMs / 1000);
    last = now;
    t += dt;
    rig.update(dt);
    if (venue.update(t, camera.position)) invalidateShadows();
    venue.state.dim = state.view === 'seat' ? 0.22 : state.block ? 0.5 : 1;
    venue.seatVis.update(camera.position);
    markers.update(t);
    if (mouse.dirty && rig.mode === 'orbit' && !mouse.down) {
      mouse.dirty = false;
      const r = rayAt(mouse.x, mouse.y);
      const seat = state.block ? picker.pickSeatInBlock(r, state.block) : null;
      const hit = seat ? null : picker.pickBlock(r);
      markers.setHover(seat && seat !== state.seat ? seat : null);
      ui.tip(seat ? seatText(seat) : hit ? (hit.block.style === 'standing' ? 'Buradan göster' : `${blockLabel(hit.block)} · dokun`) : null, mouse.x, mouse.y);
      canvas.style.cursor = seat || hit ? 'pointer' : '';
    }
    if (composer) composer.render();
    else renderer.render(scene, camera);
    if (++frames === 2) ui.hideLoading();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Test için küçük dış API: yalnızca ?debug ile (üretimde dışarı açılmaz)
  if (new URLSearchParams(location.search).has('debug')) window.__arena = {
    model,
    config,
    state,
    camera,
    rig,
    venue,
    renderer,
    applyConfig,
    selectBlock,
    handlePick,
    selectSeat,
    exitSeat,
    seatById: (id) => model.seats.find((s) => s.id === id),
    quality: qKey,
    setTint,
    picker,
    crowd,
    toggleFullscreen,
    handleTap: tapAt,
    clearBlock,
    perf,
  };
}
