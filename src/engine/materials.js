import * as THREE from 'three';
import { concreteTexture } from './textures.js';

/** Mekânın malzeme paleti: beton gri, siyah, açık akçaağaç, çelik (Yazgan Design / fotoğraflar). */
export function createMaterials() {
  const conc = concreteTexture();
  const std = (o) => new THREE.MeshStandardMaterial(o);

  const mats = {
    concrete: std({ color: 0x9a9a9d, map: conc, roughness: 0.93, metalness: 0 }),
    tread: std({ color: 0x45464b, map: conc, roughness: 0.92, metalness: 0 }),
    concreteDark: std({ color: 0x55565a, map: conc, roughness: 0.95, metalness: 0 }),
    wall: std({ color: 0x2a2b2f, map: conc, roughness: 0.96, metalness: 0 }),
    floorConcert: std({ color: 0x84858a, map: conc, roughness: 0.82, metalness: 0.02 }),
    floorGame: std({ color: 0x090a0c, roughness: 0.5, metalness: 0.05 }),
    black: std({ color: 0x0c0c0e, roughness: 0.7, metalness: 0.1 }),
    blackGloss: std({ color: 0x08080a, roughness: 0.25, metalness: 0.4 }),
    steel: std({ color: 0x4a4e55, roughness: 0.45, metalness: 0.85 }),
    steelLight: std({ color: 0x8a9098, roughness: 0.5, metalness: 0.8 }),
    nosing: std({ color: 0xcfcfc6, roughness: 0.7, metalness: 0 }),
    yellow: std({ color: 0xd9a400, roughness: 0.6, metalness: 0 }),
    maple: std({ color: 0xcaa273, roughness: 0.55, metalness: 0 }),
    leather: std({ color: 0x2b211c, roughness: 0.5, metalness: 0.05 }),
    sofa: std({ color: 0x3a3f4a, roughness: 0.8, metalness: 0 }),
    ceilingDark: std({ color: 0x0d0e11, roughness: 0.95, metalness: 0, side: THREE.BackSide }),
    lampWarm: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a0).multiplyScalar(1.6) }),
    lampCool: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe8f1ff).multiplyScalar(2.2) }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x86aac4,
      roughness: 0.12,
      metalness: 0,
      envMapIntensity: 0.25,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    rim: std({ color: 0xff5a1f, roughness: 0.4, metalness: 0.3 }),
    net: new THREE.MeshBasicMaterial({ color: 0xf3f3f3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, wireframe: true }),
    boardGlass: new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }),
    hoopPad: std({ color: 0x0f8f78, roughness: 0.6, metalness: 0.05 }),
    stageDeck: std({ color: 0x0b0b0d, roughness: 0.35, metalness: 0.25 }),
    curtain: std({ color: 0x050506, roughness: 1, metalness: 0 }),
  };
  mats.concrete.userData.shared = true;
  return mats;
}
