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

## Arkitera mimari projesinden düzeltmeler (3. tur) — en güvenilir kaynak

[Arkitera proje sayfası](https://www.arkitera.com/proje/volkswagen-arena/) 29 çizim/fotoğraf içeriyor (konser kat planı +64,28 ve +68,50 kotları, A-A ve B-B kesitleri, mekân fotoğrafları, yönlendirme tabelaları).
Plan üzerindeki "3000 / 5200 / 2700×1800" ölçü çizgilerinden ölçek çıkarıldı (≈12,6 px/m) ve kesitlerdeki kotlarla çapraz doğrulandı:

| Kalem | Eski model | Plan/kesitten | Not |
|---|---|---|---|
| Zemin | 31 × 54 m | **30 × 52 m** (zemin ayağı 3000; sahne duvarı → tribün ayağı 5200) | kesit B-B: zemin kotu +57,60 |
| Alt tribün | 12 sıra | **yan: 13 sıra (3 geri çekilebilir + 10 sabit), uç: 14 sıra (3 + 11)**, tepe +64,28 (6,7 m) | sıralar planın yakın görüntüsünden sayıldı |
| Loca zemini | 5,0 m | **+68,50 → 10,9 m** | localar alt tribünün arka sıraları üzerine **kantilever** taşar; altı boş |
| Loca ön hattı | \|x\| 26,3 m, derinlik 5,2 | **\|x\| 22,6 m, derinlik ≈ 4,2 m**, uç hat z ≈ 29,7, **köşeler 45° pah** | plan +68,50 |
| Loca ölçüsü | 5,0 m genişlik | yan 5,2 m, uç ≈ 5,7 m | 8 + 1 + 6 + 1 + 8 = 24 ✓ |
| Çatı | 21,5 m tepeli beşik tonoz | **neredeyse düz çelik makas**: alt başlık ≈ +73,0 (≈ 15,4 m), üst +76,55 (19 m), derinlik ≈ 3 m, boru delikli Warren makas | A-A / B-B kesitleri |
| Loca kapasitesi | 24 × 10 = 240 | **20 × 12 + 4 × 16 = 304** | [vwarena.com loca kiralama](https://www.vwarena.com/tr/loca-kiralama): "12 ya da 16 kişilik"; [Arkiv](https://www.arkiv.com.tr/proje/blackbox-istanbul/3210): 304 skybox koltuğu. 16 kişilik 4 locanın yeri bilinmiyor (modelde 11–14) |
| Kapılar | yok | **KAPI / GATE 01–11** tünelleri (sarı RAL 1028 siyah zeminde), blok yönlendirmesi 201–206 / 207–211 | Arkitera tabela fotoğrafları |
| Seyirci sirkülasyonu | — | zemin altında 3 bodrum kat (+57,60 altı); giriş fuayesi +64,28 | A-A kesiti |

Yan tribün koltuk sayısı/sıra planda okunamadı; toplam kapasiteyi resmî 4.500–5.800 aralığında tutmak için sıra başına 12 koltuk alındı (**tahmin**).

## Referans fotoğraflardan çıkarılanlar (2. tur)

Pozitif/vwarena.com galeri fotoğrafları ve Eurohoops (2015) görselleri, yalnızca karşılaştırma için incelendi (projeye konmadı):

* Salon kabuğu **yuvarlak köşeli bir kâse**; tribün önlerinde **siyah metal çit**, aralarda siyah merdiven korkulukları → model köşelerde Bezier yayına çevrildi, ön bariyer cam yerine çit dokusu.
* Basketbolda yan tribünler sahanın kenarından başlıyor (geri çekilebilir ek tribün) → `S1–S8` blokları eklendi (tahmini).
* Pota sehpası: yeşil gövde, **sarı-siyah uyarı bantlı dolgu**, üstte şut saati; saha çevresinde açılı **LED reklam panoları**; yedek kulübelerinde yeşil mat → modele eklendi.
* Asma LED **küp**, altında yuvarlak ışık diski; maç günü skor/süre akıyor.
* Konser zemini **sıcak, parlak cilalı beton**; sahnede devasa LED duvarlar, hareketli kafalı truss ızgaraları, mavi/mor huzmeler, gobo desenleri → zemin malzemesi, truss ızgarası, gobo/lazer efektleri eklendi.
* Koltuk: yüksek, kıvrımlı siyah sırtlık, kalın kolçak, **katlanır oturak** (boş salonda yukarıda) → tribünlerde katlı, zemin/loca/VIP'te açık model.
* vwarena.com galeri başlıkları yalnızca etkinlik afişleri (Blue, Yalın, Ebru Gündeş …); mimari bilgi içermiyor.

## Çelişkiler

* Kapasite: 4.500–5.800 (Vikipedi), 5.800 (Uniq/Time Out), **6.500** (vwarena.com *Main Hall Renting*, ayakta+tribün).
* Loca koltuğu: 240 (Vikipedi) vs 304 (Arkiv). Modelde 240.
* Arkiv kalemlerinin toplamı: zemin oturmalı 2.160 + sabit tribün 1.392 + premium 822 + ek tribün 562 + loca 304 = **5.240**
  = resmî basketbol kapasitesi. Yani basketbol düzeninde 2.160'lık "zemin oturmalı" kalemi de sayılıyor olabilir
  (saha etrafında teleskopik/zemin tribünü). **Mevcut modelde basketbolda saha içi bloklar yok** (talimat bu yönde);
  bu nedenle model basketbol toplamı ≈3.350, resmî 5.240'ın altında. Gerçek basketbol oturma planı gelince düzeltilecek.

## Tahmin (resmî veri yok → `estimated`)

Yan tribünlerde sıra başına koltuk sayısı, basketbolda ek (geri çekilebilir) tribünlerin yeri ve boyu, 16 kişilik locaların konumu,
loca iç düzeninin ayrıntıları (plan yalnızca iki sıra koltuk ve arka bar/ayakta alanı gösteriyor), sahne arkası/üstü donanımı,
buz pisti ve konferans düzenlerinin ölçüleri.
Tahminler fotoğraf (2 iç mekân fotoğrafı + 1 mimari plan) ve Biletix planının oranlarından türetildi.

## Açık sorular (Pozitif / kullanıcı)

1. Basketbol düzeninin resmî oturma planı (saha etrafı ek tribün var mı? 5.240'ın dağılımı?).
2. Yan tribünlerde gerçek sıra sayısı ve sıra başına koltuk sayısı (plandaki 3…14 numaraları sıra uçlarını mı gösteriyor?).
3. Zemin blokları sıra harfleri (planda 001–003: A…U, 004/006: A…Z, 005: A…T → modelde hepsi A…U, 20 sıra).
4. Salon iç ölçüleri ve çatı yüksekliği (*Promoters Pack* PDF'i).
5. Koltuk kategorileri/fiyat bantları (modelde alan bazlı geçici kategoriler var).
