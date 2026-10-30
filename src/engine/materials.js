import * as THREE from 'three';
import { concreteTexture, fenceTexture, hazardTexture, parquetTexture } from './textures.js';

/** Mekânın malzeme paleti: beton gri, siyah, açık akçaağaç, çelik (Yazgan Design / fotoğraflar). */
export function createMaterials() {
  const conc = concreteTexture();
  const parquet = parquetTexture();
  const fence = fenceTexture();
  const hazard = hazardTexture();
  const std = (o) => new THREE.MeshStandardMaterial(o);

  const mats = {
    concrete: std({ color: 0x9a9a9d, map: conc, roughness: 0.93, metalness: 0 }),
    tread: std({ color: 0x45464b, map: conc, roughness: 0.92, metalness: 0 }),
    concreteDark: std({ color: 0x55565a, map: conc, roughness: 0.95, metalness: 0 }),
    wall: std({ color: 0x2a2b2f, map: conc, roughness: 0.96, metalness: 0 }),
    // Pozitif fotoğraflarında konser zemini sıcak, parlak cilalı beton
    floorConcert: std({ color: 0x77706a, map: conc, roughness: 0.46, metalness: 0.12 }),
    floorGala: std({ color: 0x14141a, roughness: 0.7, metalness: 0.02 }),
    floorGame: std({ color: 0x090a0c, roughness: 0.5, metalness: 0.05 }),
    black: std({ color: 0x0c0c0e, roughness: 0.7, metalness: 0.1 }),
    blackGloss: std({ color: 0x08080a, roughness: 0.25, metalness: 0.4 }),
    steel: std({ color: 0x4a4e55, roughness: 0.45, metalness: 0.85 }),
    steelLight: std({ color: 0x8a9098, roughness: 0.5, metalness: 0.8 }),
    nosing: std({ color: 0xcfcfc6, roughness: 0.7, metalness: 0 }),
    white: std({ color: 0xe8e6e0, roughness: 0.5, metalness: 0 }),
    yellow: std({ color: 0xd9a400, roughness: 0.6, metalness: 0 }),
    maple: std({ color: 0xcaa273, map: parquet, roughness: 0.5, metalness: 0 }),
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
    woodDark: std({ color: 0x70503a, roughness: 0.65, metalness: 0 }),
    doorDark: std({ color: 0x050506, roughness: 1, metalness: 0 }),
    duct: std({ color: 0x3d4045, roughness: 0.6, metalness: 0.6 }),
    fence: std({ color: 0x15161a, map: fence, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.7 }),
    hazard: std({ map: hazard, roughness: 0.7, metalness: 0 }),
    rim: std({ color: 0xff5a1f, roughness: 0.4, metalness: 0.3 }),
    net: new THREE.MeshBasicMaterial({ color: 0xf3f3f3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, wireframe: true }),
    boardGlass: new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }),
    hoopPad: std({ color: 0x14a085, roughness: 0.5, metalness: 0.1 }),
    benchMat: std({ color: 0x16905f, roughness: 0.9, metalness: 0 }),
    stageDeck: std({ color: 0x0b0b0d, roughness: 0.35, metalness: 0.25 }),
    curtain: std({ color: 0x050506, roughness: 1, metalness: 0 }),
  };
  mats.concrete.userData.shared = true;
  return mats;
}
