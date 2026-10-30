// Tarayıcı duman testi (Playwright gerekir: `npm i -D playwright`). Üretim derlemesine karşı çalışır:
//   npm run build && npm run preview &   →   npm run smoke [http://127.0.0.1:4173/]
// Her düzende her bloğun ilk/son koltuğunu seçer, koltuk gözüne iner, komşu koltuğa geçer;
// konsol hatası / CSP ihlali / yakalanmamış istisna olursa başarısız çıkar.
import { createRequire } from 'node:module';

const require = createRequire(process.env.PLAYWRIGHT_DIR ?? `${process.cwd()}/`);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:4173/';
const url = `${base}${base.includes('?') ? '&' : '?'}debug=1&q=low`;
const problems = [];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 480 } })).newPage();
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type()) && !/willReadFrequently|GPU stall|swiftshader/i.test(m.text())) problems.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => problems.push(`[requestfailed] ${r.url()}`));

await page.goto(url);
await page.waitForFunction(() => window.__arena, null, { timeout: 120000 });
const frame = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const land = async () => {
  await page.evaluate(() => { if (window.__arena.rig.fly) window.__arena.rig.fly.t = 0.9999; });
  await frame();
  await frame();
};

const configs = await page.evaluate(() => Object.keys(window.__arena.config.configurations));
const tested = new Set();
const blocksDone = new Set();
let checked = 0;
for (const cfg of configs) {
  await page.evaluate((c) => window.__arena.applyConfig(c, { fly: false }), cfg);
  await frame();
  const blocks = await page.evaluate((c) => [...window.__arena.model.blocks.values()].filter((b) => b.configs.includes(c)).map((b) => b.id), cfg);
  for (const id of blocks) {
    process.stdout.write(`${cfg}:${id} `);
    const ids = await page.evaluate((bid) => {
      const b = window.__arena.model.blocks.get(bid);
      const first = window.__arena.model.seats[b.rows[0].seats[0]];
      const lastRow = b.rows[b.rows.length - 1];
      const last = window.__arena.model.seats[lastRow.seats[lastRow.seats.length - 1]];
      return [first.id, last.id];
    }, id);
    if (blocksDone.has(id) && !id.startsWith('0')) continue; // ortak bloklar tek kez (zemin blokları her düzende denenir)
    blocksDone.add(id);
    // blok seçimi (kamera karşıdan bakış) da denenir
    await page.evaluate((bid) => window.__arena.selectBlock(bid), id);
    await land();
    const bv = await page.evaluate(() => ({ v: window.__arena.state.view, b: window.__arena.state.block?.id, p: window.__arena.camera.position.toArray() }));
    if (bv.b !== id || bv.v !== 'overview') problems.push(`[${cfg}] blok görünümü hatalı: ${id} ${JSON.stringify(bv)}`);
    const lim = await page.evaluate(() => { const c = window.__arena.config.hall; return [c.ring.frontX, c.roof.apexY]; });
    if (Math.abs(bv.p[0]) > lim[0] || bv.p[1] > lim[1] || bv.p[1] < 0) problems.push(`[${cfg}] blok kamerası sınır dışı: ${id} ${bv.p.map((v) => v.toFixed(1))}`);
    for (const sid of ids) {
      if (tested.has(sid)) continue; // ortak bloklar tek kez denenir
      tested.add(sid);
      await page.evaluate((s) => window.__arena.selectSeat(window.__arena.seatById(s)), sid);
      await land();
      const r = await page.evaluate((s) => {
        const a = window.__arena, seat = a.seatById(s);
        const d = Math.hypot(a.camera.position.x - seat.eye[0], a.camera.position.y - seat.eye[1], a.camera.position.z - seat.eye[2]);
        return { d, view: a.state.view, mode: a.rig.mode, sel: a.state.seat?.id };
      }, sid);
      if (r.d > 0.05 || r.view !== 'seat' || r.sel !== sid) problems.push(`[${cfg}] ${sid}: kamera koltuk gözünde değil ${JSON.stringify(r)}`);
      checked++;
    }
    await page.evaluate(() => window.__arena.exitSeat(false));
  }
}

// klavye ile komşu koltuk / sıra
await page.evaluate(() => window.__arena.applyConfig('concert', { fly: false }));
await page.evaluate(() => window.__arena.selectSeat(window.__arena.seatById('204-6-7')));
await land();
for (const [key, want] of [['ArrowRight', '204-6-8'], ['ArrowLeft', '204-6-7'], ['ArrowUp', '204-5-7'], ['ArrowDown', '204-6-7']]) {
  await page.keyboard.press(key);
  await land();
  const got = await page.evaluate(() => window.__arena.state.seat.id);
  if (got !== want) problems.push(`klavye ${key}: beklenen ${want}, gelen ${got}`);
}
await page.keyboard.press('Escape');
await land();
if ((await page.evaluate(() => window.__arena.state.view)) !== 'overview') problems.push('Esc genel görünüme dönmedi');

// hızlı seçim düğmesi + blok çubuğu + sinema modu
await page.evaluate(() => window.__arena.applyConfig('concert', { fly: false }));
await page.evaluate(() => document.querySelector('#quick button[data-block="L12"]').click());
await land();
if ((await page.evaluate(() => window.__arena.state.block?.id)) !== 'L12') problems.push('hızlı seçim L12 çalışmadı');
if (await page.evaluate(() => document.getElementById('blockBar').hidden)) problems.push('blok çubuğu görünmüyor');
await page.evaluate(() => document.getElementById('bbGo').click());
await land();
if ((await page.evaluate(() => window.__arena.state.view)) !== 'seat') problems.push('"Buradan göster" koltuk görünümüne geçmedi');
await page.evaluate(() => window.__arena.exitSeat(false));
await page.click('#btnMenu');
await page.click('#btnFs');
if (!(await page.evaluate(() => document.body.classList.contains('immersive')))) problems.push('sinema modu açılmadı');
await page.click('#btnImm');
if (await page.evaluate(() => document.body.classList.contains('immersive'))) problems.push('sinema modundan çıkılamadı');
// kamera sınırları: aşırı konumlar
const lim = await page.evaluate(() => {
  const a = window.__arena; const out = [];
  for (const p of [[0, -20, 0], [90, 60, 90], [-60, 3, -60], [0, 40, 0]]) { a.camera.position.set(...p); a.rig.mode = 'orbit'; a.rig.update(0.016); out.push(a.camera.position.toArray()); }
  return out;
});
for (const p of lim) if (Math.abs(p[0]) > 23 || p[1] < 0 || p[1] > 16 || p[2] < -29 || p[2] > 30) problems.push(`kamera sınır dışında: ${p.map((v) => v.toFixed(1))}`);

// kategori boyası / bilgi penceresi
await page.click('#btnMenu');
await page.click('#btnTint');
await page.click('#btnAbout');
await page.keyboard.press('Escape');
// kalite listesi: seçenekler görünür ve tek tıkla seçilir (yeniden yükleme yapmadan yalnızca varlığı kontrol)
await page.click('#btnMenu');
if ((await page.locator('#qList button').count()) !== 4) problems.push('kalite listesi 4 seçenek içermiyor');
await page.keyboard.press('Escape');

// ayakta bölge seçimi
await page.evaluate(() => window.__arena.applyConfig('standing', { fly: false }));
await page.evaluate(() => document.querySelector('#quick button[data-stand="0,0"]').click());
await land();
if ((await page.evaluate(() => window.__arena.state.seat?.style)) !== 'standing') problems.push('ayakta bölge seçimi çalışmadı');

console.log(`${checked} koltuk görünümü denendi; sorun sayısı: ${problems.length}`);
for (const p of problems.slice(0, 40)) console.log(' -', p);
await browser.close();
process.exit(problems.length ? 1 : 0);
