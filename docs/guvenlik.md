# Güvenlik değerlendirmesi

Uygulama **tamamen istemci tarafı** statik bir sayfadır: sunucu, veritabanı, oturum, çerez, çalışma zamanı ağ isteği ve
üçüncü taraf betik **yoktur**. Saldırı yüzeyi küçüktür.

| Konu | Durum |
|---|---|
| Bağımlılıklar | Çalışma zamanında yalnızca `three`; derleme: `vite`, `vite-plugin-singlefile`. `npm audit` → 0 açık. Sürümler `package-lock.json` ile sabit. |
| XSS | Kullanıcı girdisi yok. `innerHTML` yalnızca config'ten gelen sabit metinler için kullanılıyor ve HTML kaçışından geçiriyor (`esc`, `safeColor`). Hata ekranı `textContent` kullanıyor. |
| URL parametreleri | `?q` yalnızca izinli listeden (`auto/high/medium/low`) okunur; `?debug` yalnızca test API'sini (`window.__arena`) açar, üretim bağlantısında kapalıdır. |
| CSP | Üretim derlemesi `Content-Security-Policy` meta etiketi taşır: `default-src 'none'`, betik/stil/görsel yalnızca kendi kaynağı (+`data:`/`blob:`), `connect-src 'self'`, `object-src 'none'`, `form-action 'none'`. Tek dosya sürümü satır içi betik için `'unsafe-inline'` ister (stil için her iki sürümde de gerekli: JS koltuk/ipucu konumlarını stil özniteliğiyle yazar). |
| Depolama | Yalnızca `localStorage['arena.quality']` (kalite tercihi); okuma/yazma `try/catch` içinde. |
| CI | `.github/workflows/pages.yml`: `contents: read`, `pages: write`, `id-token: write` (yalnızca Pages dağıtımı için). Üçüncü taraf eylemler `actions/*` resmî eylemleri. |
| Sırlar | Depoda anahtar/token yok; `.gitignore` `node_modules`, `dist*` dışlar. |
| Dış kaynak | Referans fotoğraflar yalnızca karşılaştırma için indirildi, depoya konmadı. |

## Bilinen sınırlar

* Meta etiketiyle verilen CSP `frame-ancestors`'ı desteklemez; sayfanın iframe içinde gömülmesini engellemek isteyen
  barındırıcı bunu HTTP başlığıyla (`Content-Security-Policy: frame-ancestors …` / `X-Frame-Options`) vermelidir.
  Bilet sitesine iframe olarak gömmek istendiğinde tam tersi (izin verme) gerekecektir.
* `style-src 'unsafe-inline'` gerekli (yukarıya bakın).
