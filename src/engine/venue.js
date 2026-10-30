import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { createSeatMeshes } from './seats.js';
import { buildBowl } from './build/bowl.js';
import { buildShell } from './build/shell.js';
import { buildLocas } from './build/locas.js';
import { buildDetails } from './build/details.js';
import { buildBlockLabels } from './build/labels.js';
import { buildStage } from './build/stage.js';
import { buildSymphony } from './build/symphony.js';
import { buildGala } from './build/gala.js';
import { buildEsports } from './build/esports.js';
import { buildCourt } from './build/court.js';
import { buildLights } from './build/lights.js';
import { buildEffects } from './build/effects.js';

/**
 * Config + koltuk modelinden tüm 3D sahneyi üretir.
 * Gruplar: structure (hep görünür) · shell (dışarıdan bakınca gizlenir) ·
 * ve etkinlik kümesine göre dinamik gruplar (groupFor(['concert','symphony']) → yalnızca o düzenlerde görünür).
 */
export function createVenue({ config, model, quality, scene }) {
  const root = new THREE.Group();
  root.name = config.meta.id;
  scene.add(root);

  const groups = {};
  for (const k of ['structure', 'shell']) {
    groups[k] = new THREE.Group();
    groups[k].name = k;
    root.add(groups[k]);
  }
  const allConfigs = Object.keys(config.configurations);
  const sets = new Map(); // anahtar → { group, configs }
  const groupFor = (configs) => {
    const list = [...configs].sort();
    const key = list.join('+');
    if (!sets.has(key)) {
      const g = new THREE.Group();
      g.name = `cfg:${key}`;
      root.add(g);
      sets.set(key, { group: g, configs: list });
    }
    return sets.get(key).group;
  };

  const mats = createMaterials();
  const hooks = { onConfig: [] };
  const anim = [];
  const state = { config: allConfigs[0] };
  const activeIn = (ids) => ids.includes(state.config);
  const ctx = { config, model, mats, groups, groupFor, activeIn, allConfigs, hooks, anim, quality, state, scene };

  buildBowl(ctx);
  buildShell(ctx);
  buildLocas(ctx);
  buildDetails(ctx);
  buildBlockLabels(ctx);
  buildStage(ctx);
  buildSymphony(ctx);
  buildGala(ctx);
  buildEsports(ctx);
  buildCourt(ctx);
  buildLights(ctx);
  buildEffects(ctx);

  const seatVis = createSeatMeshes(model.seats, config.categories, quality);
  for (const mesh of Object.values(seatVis.meshes)) groupFor(mesh.userData.configs).add(mesh);

  const roofCfg = config.hall.roof;
  const ringCfg = config.hall.ring;
  const insideHall = (p) =>
    Math.abs(p.x) < roofCfg.halfSpan - 0.5 && p.z > roofCfg.zMin + 0.3 && p.z < roofCfg.zMax - 0.3 && p.y < roofCfg.apexY - 0.5 && p.y > -0.5
    && Math.abs(p.x) < (ringCfg.frontX + ringCfg.depth - 0.3);

  return {
    root,
    groups,
    groupFor,
    mats,
    seatVis,
    state,
    setConfig(key) {
      state.config = key;
      for (const { group, configs } of sets.values()) group.visible = configs.includes(key);
      hooks.onConfig.forEach((fn) => fn(key, config));
    },
    /** Kabuk görünürlüğü değiştiyse true (gölge haritası yenilenmeli). */
    update(t, cameraPos) {
      for (const fn of anim) fn(t);
      const inside = insideHall(cameraPos);
      const changed = groups.shell.visible !== inside;
      groups.shell.visible = inside;
      return changed;
    },
  };
}
