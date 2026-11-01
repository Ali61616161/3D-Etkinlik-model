# Yeni mekân ekleme

1. `src/venue/volkswagen-arena.config.js` dosyasını kopyalayıp yeni ad verin.
2. Şunları doldurun:
   * `hall` — zemin boyutu, loca halkası (`ring`), çatı (`roof`)
   * `configurations` — her etkinlik düzeni (`concert`, `basketball` …): odak noktası, genel bakış kamerası, sahne/saha ölçüleri
   * `tribunes` — her biri `kind: 'flat' | 'rake' | 'fan'`:
     * `origin` (1. sıra orta hattı) + `facing` (koltukların baktığı yön, x/z) + `rows`, `rowPitch`, `rise`, `baseY`
     * `blocks[]`: `id`, `lateral` (bloğun yanal konumu), `seats` (sayı ya da `{near, far}` yamuk blok), `firstSeat`
     * `configs`: hangi düzenlerde var (`['concert']`, `['basketball']` ya da ikisi)
   * `locas` — loca iç düzeni
3. `src/app.js` içindeki `import config from ...` satırını değiştirin.
4. `npm run stats` ile koltuk sayılarını resmî kapasiteyle karşılaştırın.

> Sahne/saha/çatı yapıları şu an Volkswagen Arena'ya özel (`src/engine/build/stage.js`, `court.js`, `shell.js`);
> yeni bir mekân için bu dosyalardaki ölçüler zaten config'den okunur, farklı bir tasarım gerekirse yeni bir `build/*.js` eklenir.
