import * as THREE from 'three';

/**
 * Işıklandırma: salon (hemisfer + yönlü gölge ışığı) ve etkinliğe özel ışıklar.
 * Gölge haritası statiktir (autoUpdate=false): yalnızca konfigürasyon değişince bir kez hesaplanır.
 */
export function buildLights(ctx) {
  const { scene, hooks, anim, state, quality } = ctx;

  const hemi = new THREE.HemisphereLight(0xdde6ff, 0x2a2a30, 1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4e6, 1);
  sun.position.set(14, 60, 20);
  sun.target.position.set(0, 0, 4);
  scene.add(sun, sun.target);
  sun.castShadow = quality.shadows;
  if (quality.shadows) {
    sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    const c = sun.shadow.camera;
    c.left = -46; c.right = 46; c.top = 52; c.bottom = -44;
    c.near = 10; c.far = 130;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
  }

  // Basket: sahanın üstünde iki geniş sıcak-nötr ışık
  const gameLights = [
    new THREE.PointLight(0xfff1de, 0, 0, 2),
    new THREE.PointLight(0xfff1de, 0, 0, 2),
    new THREE.PointLight(0xe9f1ff, 0, 0, 2),
  ];
  gameLights[0].position.set(0, 17, -9);
  gameLights[1].position.set(0, 17, 9);
  gameLights[2].position.set(0, 9, 30);
  scene.add(...gameLights);

  // Konser: sahne önüne renkli yıkama + kalabalık alanı
  const wash = [
    new THREE.PointLight(0xff3d7f, 0, 0, 2),
    new THREE.PointLight(0x3d7bff, 0, 0, 2),
    new THREE.PointLight(0xb04cff, 0, 0, 2),
  ];
  wash[0].position.set(-8, 10, -17);
  wash[1].position.set(8, 10, -17);
  wash[2].position.set(0, 12, 0);
  scene.add(...wash);

  let cycleWash = true;
  const presets = {
    game: { hemi: 0.9, sun: 1.0, game: 1500, wash: 0, bg: 0x0a0b0e, fog: [0x0c0d11, 0.0032] },
    concert: { hemi: 0.42, sun: 0.22, game: 0, wash: 480, bg: 0x050608, fog: [0x0d0818, 0.0105], cycle: true },
    // Senfoni: sıcak, yumuşak; gala: koyu salon + macenta/mavi yıkama; e-spor: kırmızı/camgöbeği takım renkleri
    classical: { hemi: 0.62, sun: 0.32, game: 0, wash: 300, bg: 0x09070a, fog: [0x110e0c, 0.0072], colors: [0xfff0e0, 0xffe8d0, 0xfff4ea] },
    gala: { hemi: 0.34, sun: 0.16, game: 0, wash: 560, bg: 0x050508, fog: [0x0b0714, 0.0095], colors: [0xff3d9a, 0x3d7bff, 0xb04cff] },
    esports: { hemi: 0.36, sun: 0.18, game: 0, wash: 620, bg: 0x040508, fog: [0x070a14, 0.0105], colors: [0xff3040, 0x20d8ff, 0xff3040] },
  };

  hooks.onConfig.push((key, config) => {
    const p = presets[config.configurations[key].lighting];
    hemi.intensity = p.hemi;
    sun.intensity = p.sun;
    gameLights.forEach((l) => (l.intensity = p.game));
    wash.forEach((l) => (l.intensity = p.wash));
    scene.background = new THREE.Color(p.bg);
    scene.fog = new THREE.FogExp2(p.fog[0], p.fog[1]);
    cycleWash = !!p.cycle;
    if (p.colors) wash.forEach((l, i) => l.color.setHex(p.colors[i % p.colors.length]));
  });

  anim.push((t) => {
    if (!cycleWash) return;
    wash.forEach((l, i) => l.color.setHSL(((t * 0.06 + i / 3) % 1 + 1) % 1, 0.6, 0.6));
  });
}
