# Veri doğrulama notları (Volkswagen Arena İstanbul)

Son araştırma: 2026-10-30. Resmî teknik doküman (vwarena.com *Promoters Pack* PDF, 85 sayfa) **parola korumalı**
olduğu için okunamadı; Pozitif'ten alınınca ölçüler tek dosyada (`volkswagen-arena.config.js`) güncellenir.

## Kaynaklı (modelde birebir kullanıldı)

| Veri | Değer | Kaynak |
|---|---|---|
| Zemin oturmalı bloklar | 001–003 (sahne önü) + 004–006 (saha içi), her biri 18 koltuk × 20 sıra = 6×360 = **2.160** | Biletix planı + Arkiv ("zemin oturmalı 2160") |
| Loca | 24 loca; planda her loca 2 karo; 1–8 sol, 9 sol köşe, 10–15 karşı uç, 16 sağ köşe, 17–24 sağ | Biletix planı, Vikipedi |
| Loca koltuğu | 24 × 10 = 240 | Vikipedi EN (Arkiv 304 diyor — bkz. çelişkiler) |
| Karşı tribün | 208/210: ön sıra 16, arka sıra 21 koltuk; 209: ön 18, arka 4–15 (12) | Biletix planı |
| Sahne | 1,5 m yükseklik, 160 m² (16×10) | vwarena.com *Main Hall Renting* |
| Basketbol | 5.240 kapasite, 88 saha kenarı VIP, çıkarılabilir parke, hareketli potalar, tavandan asılı LED küp, 2 skorbord | Vikipedi, Yazgan Design, vwarena.com |
| Çatı | Çelik, 286 t yük kapasitesi; tribünler betonarme | Arkiv / Yazgan Design |
| Malzeme/renk | Açık beton, siyah, açık akçaağaç; yönlendirme yazıları siyah/RAL 1028 sarı | Yazgan Design |

## Çelişkiler

* Kapasite: 4.500–5.800 (Vikipedi), 5.800 (Uniq/Time Out), **6.500** (vwarena.com *Main Hall Renting*, ayakta+tribün).
* Loca koltuğu: 240 (Vikipedi) vs 304 (Arkiv). Modelde 240.
* Arkiv kalemlerinin toplamı: zemin oturmalı 2.160 + sabit tribün 1.392 + premium 822 + ek tribün 562 + loca 304 = **5.240**
  = resmî basketbol kapasitesi. Yani basketbol düzeninde 2.160'lık "zemin oturmalı" kalemi de sayılıyor olabilir
  (saha etrafında teleskopik/zemin tribünü). **Mevcut modelde basketbolda saha içi bloklar yok** (talimat bu yönde);
  bu nedenle model basketbol toplamı ≈3.350, resmî 5.240'ın altında. Gerçek basketbol oturma planı gelince düzeltilecek.

## Tahmin (resmî veri yok → `estimated`)

Salon iç ölçüleri (zemin 31×54 m, çatı tepe 21,5 m), yan/karşı tribün sıra sayısı (12), sıra yüksekliği (0,38 m),
sıra derinliği (0,8 m), loca iç düzeni, kemer çatı aralıkları, sahne arkası/üstü donanımı.
Tahminler fotoğraf (2 iç mekân fotoğrafı + 1 mimari plan) ve Biletix planının oranlarından türetildi.

## Açık sorular (Pozitif / kullanıcı)

1. Basketbol düzeninin resmî oturma planı (saha etrafı ek tribün var mı? 5.240'ın dağılımı?).
2. Yan tribünlerde gerçek sıra sayısı ve sıra başına koltuk sayısı (plandaki 3…14 numaraları sıra uçlarını mı gösteriyor?).
3. Zemin blokları sıra harfleri (planda 001–003: A…U, 004/006: A…Z, 005: A…T → modelde hepsi A…U, 20 sıra).
4. Salon iç ölçüleri ve çatı yüksekliği (*Promoters Pack* PDF'i).
5. Koltuk kategorileri/fiyat bantları (modelde alan bazlı geçici kategoriler var).
