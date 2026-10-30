# Arenada olan etkinlikler ve modellenen düzenler

Araştırma tarihi: 2026-10-30. Kesin ve güncel takvim için vwarena.com ve Biletix/Passo sayfalarına bakılmalı; kaynaklar arasında tarih/saat çelişkileri var.

| Etkinlik türü | Kanıt | Modeldeki düzen |
|---|---|---|
| **Konser (oturmalı)** | Resmî: tam oturmalı ≈4.500; Biletix planı (sahne önü + saha içi oturmalı) | `Konser · oturmalı` — zemin blokları 001–006, tribünler, localar (≈4.870 koltuk) |
| **Konser (zemin ayakta)** | vwarena.com: zemin ayakta + tribün oturmalı ≈6.500; Arkiv: zemin ayakta 3.300 | `Konser · ayakta` — Golden Circle + saha içi ayakta "bakış noktaları" (göz 1,68 m), ara bariyer, FOH kulesi |
| **Senfoni / film konseri** | "Harry Potter ve Ateş Kadehi In Concert" (28 Kas 2026), "Adamlar – An Epic Symphony", Ebru Yaşar Senfoni, Emel Sayın "Yeşilçam Senfonisi", Fazıl Say Nazım Oratoryosu (2016) | `Senfoni · film konseri` — orkestra podyumu (3 kademe), ~60 sandalye + nota sehpası, şef podyumu, kuyruklu piyano, timpani, 16×7 m film perdesi, sıcak ışık |
| **Basketbol** | Darüşşafaka ev sahibi; resmî 5.240; çıkarılabilir parke, hareketli potalar | `Basketbol` — FIBA sahası, ek tribünler (uç + yan, tahmini), saha kenarı VIP, canlı skor |
| **Gala / ödül / moda** | Wikipedia: fashion show, award ceremony; Pozitif "Men of the Year 2016" ve defile fotoğrafları | `Gala · ödül · moda` — 24 yuvarlak masa × 10 sandalye (masa/sandalye seçimi), T podyum + yuvarlak podyum, dev LED perde, halka truss + LED küp |
| **E-spor** | "VALORANT Champions İstanbul" (yorum sayfasında geçiyor; kanıt zayıf) | `E-spor` — sahnede iki takım masası, kupa podyumu, kıvrımlı LED duvar, yan sütunlar, seyirci maç ekranları |

## Modellenmedi (kanıt yok / veri yok)

* **Konferans/fuar** (resmî sitede "dönüşebilir" deniyor, boyut ve düzen yok; Pozitif fotoğrafı yalnızca bir konferans kurulumu gösteriyor).
* **Buz pisti** (resmî sitede sayılıyor; Uniq'in buz pisti dış mekân ve bu salonla ilgisiz görünüyor).
* **Stand-up, tiyatro, dans** (türler anılıyor, mekâna özel düzen bilgisi yok; kısmi düzen için senfoni/gala düzeni uyarlanabilir).
* Boks, Disney/buz gösterisi: hiçbir kaynakta doğrulanamadı.

## Notlar

* "Ayakta" düzende koltuk numarası yoktur; seçilen nokta bir bakış noktasıdır (sıra: 0,9 m aralıklı çizgiler).
* Düzen başına resmî oturma planı yalnızca konser (oturmalı) için elimizde (Biletix). Diğerleri fotoğraf ve genel kapasite bilgisinden türetilmiş tahmini yerleşimdir; Pozitif'ten gerçek planlar gelince `src/venue/volkswagen-arena.config.js` güncellenir.
* Kaynaklar: [vwarena.com](https://www.vwarena.com/), [Vikipedi EN](https://en.wikipedia.org/wiki/Volkswagen_Arena_(Istanbul)), [JamBase](https://www.jambase.com/venue/volkswagen-arena), [Concert Archives](https://www.concertarchives.org/venues/volkswagen-arena-4d292f9e-0c44-46ff-9039-8ec0db34d6a7), [haberler.com](https://www.haberler.com/haber/volkswagen-arena-kapasite-kac-kisilik-vw-arena-19270858-haberi/), [Firsat.me](https://www.firsat.me/Blog/volkswagen-arena-etkinlik-takvimi-ve-adamlar-an-epic-symphony-projesi-pratik-seyahat-rehberi-butce-organizasyon-ve-detayli-anlatim), [Arkiv](https://www.arkiv.com.tr/proje/blackbox-istanbul/3210).
