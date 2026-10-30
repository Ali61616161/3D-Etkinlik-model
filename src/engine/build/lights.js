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

  const presets = {
    game: { hemi: 0.9, sun: 1.0, game: 1500, wash: 0, bg: 0x0a0b0e },
    concert: { hemi: 0.42, sun: 0.22, game: 0, wash: 480, bg: 0x050608 },
  };

  hooks.onConfig.push((key, config) => {
    const p = presets[config.configurations[key].lighting];
    hemi.intensity = p.hemi;
    sun.intensity = p.sun;
    gameLights.forEach((l) => (l.intensity = p.game));
    wash.forEach((l) => (l.intensity = p.wash));
    scene.background = new THREE.Color(p.bg);
  });

  anim.push((t) => {
    if (state.config !== 'concert') return;
    wash.forEach((l, i) => l.color.setHSL(((t * 0.06 + i / 3) % 1 + 1) % 1, 0.6, 0.6));
  });
}
