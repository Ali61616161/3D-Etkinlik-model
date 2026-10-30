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
npm test               # 14 birim testi (koltuk modeli, plan aralıkları, çakışma, seçici, etkinlik düzenleri, kamera sınırı)
npm run smoke          # tarayıcı duman testi (Playwright; her bloğun koltuk görünümü)
```

Grafik kalitesi: üstteki **Kalite** düğmesi ya da `?q=high|medium|low` (varsayılan: masaüstü Yüksek, telefon Düşük).
Yüksek = bloom + vinyet + 4096 gölge haritası + yumuşatılmış koltuklar, Orta = gölge + MSAA, Düşük = gölgesiz, basit koltuk.

## Kullanım

| Eylem | Nasıl |
|---|---|
| Salonu döndür / yakınlaştır | Sürükle / tekerlek (kamera salon içinde sınırlıdır: yerin altına, çatının üstüne, duvarların dışına çıkılamaz) |
| Koltuk seç | Salonda ya da planda bir **bloğa dokun** → blok karşıdan görünür → bir **koltuğa dokun**; ya da Blok → Sıra → Koltuk listesi |
| Koltuktan bak | Seçince otomatik uçar; sürükleyerek etrafa bak, tekerlek/çimdik = yakınlaştır |
| Komşu koltuk | ← → (koltuk), ↑ ↓ (sıra) · Esc = salona dön · Boşluk = sahneye/sahaya bak |
| Etkinlik düzeni | Üstteki seçici: Konser (oturmalı / ayakta), Senfoni · film konseri, Basketbol, Gala · ödül · moda, E-spor → [docs/etkinlikler.md](docs/etkinlikler.md) |
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
