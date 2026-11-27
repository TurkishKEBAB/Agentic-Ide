# Agentic IDE · Uygulama kaydı

- [x] İskelet. Vite ve TypeScript girişi, yerel fontlar, tema ve sabit alt şerit.
- [x] 01 · Açılış ve çalışma alanı
- [x] 02 · Dosya gezinmesi ve elle düzenleme
- [x] 03 · Tek giriş satırından istek
- [x] 04 · Plan ve satır bazında bağlam
- [x] 05 · Diff ve süreli grup onayı
- [x] 06 · Engelleyici güvenlik kontrolleri
- [x] 07 · Uygulama, geçmiş ve geri alma
- [x] 08 · Vizyon katmanı

Ana editör uygulamanın ömrü boyunca aynı örneği kullanır. Geçmiş ve canlı dosyalar ayrı Monaco modellerine, kararlar tek durum modeline bağlanır. Geri alma, uygulanmış setin ters yamasını canlı içerikle üç yönlü birleştirir.

## Tarayıcı doğrulaması

- 1440 × 900 ana görünüm, 390 × 780 dar pencere ve iki tema.
- Tek Monaco örneği, klavye ile dosya arama, elle düzenleme, Tab ve Escape.
- Bağlı grup, iki diff görünümü, onayın süre ve içerik değişikliğiyle düşmesi.
- Korumalı dosya, maskeli sır, çalışma alanı sınırı ve büyük düzenlemenin ayrı kararı.
- Uygulama, salt okunur geçmiş, sonraki elle düzenlemeyi koruyan ters yama ve çakışma.
- Vizyon kartları, isteği göndermeden hazırlayan not ve örnek yüksek risk onayı.
- Monaco dışındaki erişilebilirlik taraması ve açık tema kontrast örnekleri.

## İlk Görev güncellemesi

- [x] Tam boy editör, geçici dosya seçici, beş dosyalık çalışma seti ve Niyet görünümü.
- [x] Electron çalışma alanında elle kaydetme, kaydedilmemiş taslaklar ve disk sürümü çakışması.
- [x] İlk Görev rehberi. Dosya açma, yorum kaydetme, istek gönderme, kaynak inceleme, v1 diff, güvenli v2 diff, açık onay ve geri alma.
- [x] Duraklatma, devam etme, önceki açıklama, neden ve ipuçsuz tekrar.
- [x] Süresi dolan onay ve çakışmalı geri alma alıştırmaları. Görevi iptal etme geçmişte ayrı bir karar.
- [x] Tarayıcıda Türkçe yorumun Ctrl+S ile kaydı, kaynak penceresinden Esc ile odak dönüşü, v1 engeli, v2 onayı, uygulama ve iki yorumun geri almadan sonra korunması.
