# Agentic IDE · Niyet Sayfası

Bitirme tezi için tıklanabilir Agentic IDE arayüzü. Türkçe çalışma alanı koyu temada açılır. Ana tasarım 1440 × 900 pencereyi hedefler.

## Çalıştırma

Node.js 24 ve npm ile bu dizinde çalıştır.

```bash
npm ci
npm run dev
```

Tarayıcı adresi [http://localhost:5173/](http://localhost:5173/). İlk ekranda **İlk Göreve başla** ve **Deneme projesini aç** seçenekleri var. `?adim=1` ile `?adim=8` arasındaki adresler demo başlangıç durumlarını açar.

```bash
npm test
npm run build
```

Gerçek klasör açma ve kaydetme için [Electron uygulamasını](../README.md#running-the-app) repo kökünden çalıştır.

## İlk Görev

Sekiz adım, bir dosyayı açıp kendi yorumunu kaydetmekle başlar. Kullanıcı örnek isteği gönderir, kaynak satırlarını ve v1 diff’ini açar. Korumalı dosya ve sır uyarısından sonra v2 diff’ini inceler, grubu onaylar ve yamayı uygular. Uygulamadan sonra yeni bir yorum kaydeder ve seti geri aldığında yorumun korunduğunu görür.

Her adım ilgili işlem gerçekleşince ilerler. **Neden?** gerekçeyi açar. **Önceki açıklama** tamamlanan adımı yeniden gösterir. **Duraklat** rehberi gizler ve **Yardım** menüsü aynı oturumda devam etmeyi sağlar. Eğitim sonunda ipuçları kapalı olarak tekrar edilebilir. **Yardım** menüsünde onay süresi ve çakışmalı geri alma için iki ayrı alıştırma bulunur.

## Akışlar

| Adım | Başlangıç durumu ve işlem |
| --- | --- |
| 01 · Açılış | Çalışma alanı seçicisinden sentetik `auth-lab` projesini aç. |
| 02 · Gezinme | Çalışma setinde dosya değiştir veya `@token` yaz. Monaco’da elle düzenle. |
| 03 · İstek | Örnek görev satırda hazır. Göndererek ajanın simüle edilmiş planını aç. |
| 04 · Plan | Dosya bazında gerekçeleri ve plana dayanak olan satır aralıklarını incele. |
| 05 · Diff | Yan yana ve birleşik yamayı aç. Bağlı grubu birlikte seç. Onayı ver ve kalan süreyi gör. |
| 06 · Kontroller | Korumalı dosya ile maskeli sır bulgularını gör. Engelli adımı çıkarıp yeni diff aç. Diğer örnekler sınır ihlalini ve büyük yama kararını gösterir. |
| 07 · Uygulama | Güvenli diff’te grubu onayla ve uygula. Geçmiş görüntüsünü aç veya seti tek tuşla geri al. |
| 08 · Vizyon | Önceden uygulanmış demo kaydı üzerinden dört vizyon kartını incele. |

`Ctrl+P` dosya seçiciyi, `Ctrl+S` etkin dosyanın kaydetme işlemini açar. `Ctrl+K` giriş satırına gider. `@` ile dosya veya içerik aranır. `/` komutları listeler. `Tab` Monaco’dan çıkar. `Esc` geçici görünümü kapatıp önceki kontrole döner. **Görevi iptal et** planı ve onayı sonlandırır, kararı geçmişe kaydeder.

## Tasarım ve varsayımlar

- Dosya açıldığında kod alanı çalışma yüzeyini doldurur. Bir görev açıldığında **Niyet** görünümü kodu, öneriyi ve bağlamı aynı akışta gösterir. Kesikli çerçeve ve köşeler öneriyi, düz çerçeve uygulanan satırı işaretler.
- Tek Monaco örneği yerel, deneme ve salt okunur geçmiş modelleri arasında geçer. Çalışma seti en fazla beş dosya tutar. Diff ve onay, uygulama katmanındadır. Monaco, worker’lar, fontlar ve ikonlar yerel paketlerden veya kaynaklardan yüklenir.
- `auth-lab` dosyaları, rehber ilerlemesi ve ajan değişiklikleri açık oturumun belleğinde tutulur. Demo seçicisi yeni bir başlangıç durumu yükler. Yerel ve bulut model seçenekleri sentetik yanıt üretir. Electron’da gerçek dosyaları kullanıcı açıkça kaydeder.
- Serbest istekler AuthSession senaryosunu çalıştırır. Proaktif notta hazırlanan süre sabiti açıklaması ayrı bir örnek istektir. Onayın süresi 10 dakikadır. Demo süre dolumu düğmesi aynı geçersizleştirme yolunu hızlandırır.
- Son 10 uygulanmış set geri alma penceresindedir. Ters yama sonraki bağımsız satır düzenlemelerini korur. Çakışma bütün setin geri almasını durdurur.
- MVP akışı 01–07 adımlarını kapsar. Test kanıtı, ikinci ajan, proaktif not ve riske göre onay kartları **Vizyon · MVP dışı** olarak işaretlenir.
- `design/agentic-ide-first-task` tasarım dalı, PR #123’ün birleştiği `639008d` tabanından ayrıldı.
