# 3D Etkinlik Modeli — "Koltuğundan Gör"

Kullanıcı blok → sıra → koltuk seçer, kamera yumuşak geçişle o koltuğun göz hizasına iner ve oradan sahneyi/sahayı
nasıl göreceğini 3D olarak gösterir. İlk mekân: **Volkswagen Arena İstanbul** (Pozitif).

Tüm 3D model **kodla, parametrik** üretilir (Blender yok). Three.js + Vite, ~80 draw call, koltuklar `InstancedMesh`.

## Çalıştırma

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # dist/  (siteye gömmek için)
npm run build:single   # dist-single/index.html → tek dosya, çift tıkla açılır (demo / video çekimi)
npm run stats          # koltuk sayıları + resmî rakamlarla karşılaştırma
npm test               # 9 birim testi (koltuk modeli, plan aralıkları, çakışma, seçici)
npm run smoke          # tarayıcı duman testi (Playwright; her bloğun koltuk görünümü)
```

Grafik kalitesi: üstteki **Kalite** düğmesi ya da `?q=high|medium|low` (varsayılan: masaüstü Yüksek, telefon Düşük).
Yüksek = bloom + vinyet + 4096 gölge haritası + yumuşatılmış koltuklar, Orta = gölge + MSAA, Düşük = gölgesiz, basit koltuk.

## Kullanım

| Eylem | Nasıl |
|---|---|
| Salonu döndür / yakınlaştır | Sürükle / tekerlek |
| Koltuk seç | Salonda ya da planda tıkla, veya Blok → Sıra → Koltuk listesi |
| Koltuktan bak | Seçince otomatik uçar; sürükleyerek etrafa bak, tekerlek/çimdik = yakınlaştır |
| Komşu koltuk | ← → (koltuk), ↑ ↓ (sıra) · Esc = salona dön · Boşluk = sahneye/sahaya bak |
| Konser ↔ Basketbol | Üstteki anahtar (saha içi bloklar yalnızca konserde; basketbolda saha + teleskopik ek tribün + saha kenarı VIP) |
| Kategori renkleri | "Kategoriler" düğmesi |

## Yapı

```
src/venue/volkswagen-arena.config.js   ← mekânın TEK tanımı (bloklar, sıralar, eğim, localar, sahne/saha)
src/engine/layout.js                   config → koltuk modeli (saf veri)
src/engine/venue.js                    sahneyi kurar (build/* parçaları)
src/engine/build/                      bowl (basamak/korkuluk) · shell (çatı, halka) · locas · stage · court · lights · labels
src/engine/seats.js                    tek koltuk geometrisi + InstancedMesh
src/engine/cameraRig.js                orbit ↔ koltuk görünümü, yay şeklinde yumuşak geçiş
src/engine/picker.js                   ışın–koltuk eşleştirme (raycast yerine nokta-ışın mesafesi)
src/ui/                                panel, plan (minimap), HUD
docs/                                  doğrulama notları, yeni mekân ekleme
```

Güvenlik notları → [docs/guvenlik.md](docs/guvenlik.md).
Başka bir mekân için yeni bir config yazmak yeterlidir → [docs/yeni-mekan.md](docs/yeni-mekan.md).
Veri kaynakları, doğrulanan/tahmin edilen kalemler → [docs/dogrulama.md](docs/dogrulama.md).
