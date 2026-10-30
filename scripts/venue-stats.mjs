// Konfigürasyon doğrulama: koltuk sayıları, resmî rakamlarla karşılaştırma.
import config from '../src/venue/volkswagen-arena.config.js';
import { buildSeatModel } from '../src/engine/layout.js';

const model = buildSeatModel(config);
const count = (pred) => model.seats.filter(pred).length;
const byCat = (cfg) => {
  const m = {};
  for (const s of model.seats) if (s.configs.includes(cfg)) m[s.category] = (m[s.category] ?? 0) + 1;
  return m;
};
console.log('Toplam koltuk kaydı:', model.seats.length);
for (const cfg of Object.keys(config.configurations)) {
  console.log(`\n[${cfg}] toplam:`, count((s) => s.configs.includes(cfg)), byCat(cfg));
}
console.log('\nBlok başına koltuk:');
for (const b of model.blocks.values()) console.log(' ', b.id.padEnd(6), String(b.seatCount).padStart(4), `${b.rows.length} sıra`, b.group);
console.log('\nResmî referans: konser tam oturmalı ≈ 5.000 · basketbol 5.240 · loca 24 (240 koltuk) · zemin oturmalı 2.160 · ek tribün 562');
