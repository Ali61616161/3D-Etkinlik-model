import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { createSeatMeshes } from './seats.js';
import { buildBowl } from './build/bowl.js';
import { buildShell } from './build/shell.js';
import { buildLocas } from './build/locas.js';
import { buildDetails } from './build/details.js';
import { buildBlockLabels } from './build/labels.js';
import { buildStage } from './build/stage.js';
import { buildCourt } from './build/court.js';
import { buildLights } from './build/lights.js';
import { buildEffects } from './build/effects.js';

/**
 * Config + koltuk modelinden tüm 3D sahneyi üretir.
 * Gruplar: structure (hep görünür) · shell (dışarıdan bakınca gizlenir) · shared · concert · basketball
 */
export function createVenue({ config, model, quality, scene }) {
  const root = new THREE.Group();
  root.name = config.meta.id;
  scene.add(root);

  const groups = {};
  for (const k of ['structure', 'shell', 'shared', 'concert', 'basketball']) {
    groups[k] = new THREE.Group();
    groups[k].name = k;
    root.add(groups[k]);
  }

  const mats = createMaterials();
  const hooks = { onConfig: [] };
  const anim = [];
  const state = { config: 'concert' };
  const ctx = { config, model, mats, groups, hooks, anim, quality, state, scene };

  buildBowl(ctx);
  buildShell(ctx);
  buildLocas(ctx);
  buildDetails(ctx);
  buildBlockLabels(ctx);
  buildStage(ctx);
  buildCourt(ctx);
  buildLights(ctx);
  buildEffects(ctx);

  const seatVis = createSeatMeshes(model.seats, config.categories, quality);
  for (const mesh of Object.values(seatVis.meshes)) groups[mesh.userData.group].add(mesh);

  const roofCfg = config.hall.roof;
  const ringCfg = config.hall.ring;
  const insideHall = (p) =>
    Math.abs(p.x) < roofCfg.halfSpan - 0.5 && p.z > roofCfg.zMin + 0.3 && p.z < roofCfg.zMax - 0.3 && p.y < roofCfg.apexY - 0.5 && p.y > -0.5
    && Math.abs(p.x) < (ringCfg.frontX + ringCfg.depth - 0.3);

  return {
    root,
    groups,
    mats,
    seatVis,
    state,
    setConfig(key) {
      state.config = key;
      groups.concert.visible = key === 'concert';
      groups.basketball.visible = key === 'basketball';
      hooks.onConfig.forEach((fn) => fn(key, config));
    },
    update(t, cameraPos) {
      for (const fn of anim) fn(t);
      groups.shell.visible = insideHall(cameraPos);
    },
  };
}
