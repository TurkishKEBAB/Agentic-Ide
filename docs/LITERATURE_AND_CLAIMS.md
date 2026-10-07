# Literatür ve iddia denetimi

İnceleme tarihi: 7 Ekim 2026. İlk danışman toplantısı: 8 Ekim 2026.
Durum: İlk kaynak taraması; sistematik literatür incelemesi ve özgünlük kanıtı değildir.

## Savunulabilir katkı adayı

Agentic IDE, gereksinim → plan → diff → insan kararı → değişiklik → doğrulama kanıtı →
rollback bağlantısını sınırlı bir editör prototipinde kurmayı ve kontrollü değerlendirmeyi
hedefler. VDD'nin ana araştırma çerçevesi mi, destekleyici adlandırma mı olacağı danışman
kararıdır. İnsan onayı kod doğruluğunu kanıtlamaz; test, bağımsız kabul ölçütü ve güvenlik
kontrolleri farklı kanıt türleridir. Farklı model veya prompt kullanımı da bağımsız oracle
garantisi sağlamaz.

## İlk okuma listesi

| Birincil kaynak | Bu projeyle ilişkisi | Çıkarılmaması gereken sonuç |
|----------------|---------------------|----------------------------|
| [ReAct, Yao ve diğerleri](https://arxiv.org/abs/2210.03629) | Akıl yürütme ve eylem döngüsü için mimari dayanak. | Bu projenin kod doğruluğu veya onay akışı kanıtlanmış değildir. |
| [SWE-bench, Jimenez ve diğerleri](https://arxiv.org/abs/2310.06770) | Repo ve gerçek issue üzerinden görev değerlendirmesi örneği. | Yerel 20 görev SWE-bench ile aynı kapsamı temsil etmez. |
| [Asleep at the Keyboard?, Pearce ve diğerleri](https://arxiv.org/abs/2108.09293) | AI tarafından üretilen kodun güvenlik değerlendirmesine tarihsel örnek. | Eski ürün/model bulguları 2026 modellerine doğrudan taşınamaz. |
| [METR, 2026 deney tasarımı güncellemesi](https://metr.org/blog/2026-02-24-uplift-update/) | Üretkenlik ölçümünde örneklem seçimi ve zaman ölçümü sorunlarının önemi. | Tek çalışma tüm kullanıcılar için AI hızlandırır/yavaşlatır sonucunu vermez. |
| [When Help Hurts: Verification Load and Fatigue with AI Coding Assistants, CHI 2026](https://doi.org/10.1145/3772318.3791176) | Doğrulama yükü ve AI arayüzlerinin etkisi yakından ilişkili bir çalışma alanıdır. | Başlık/özet taraması tam makale incelemesinin yerini tutmaz. |

İlk dört kaynağın resmî özetleri / yazar yayını, son kaynağın yayınevi kaydı taranmıştır.
Danışmanla son makalenin tam metni ve yöntemleri okunarak yakınlık/özgünlük matrisi
tamamlanmalıdır. "Bu konuda hiç akademik çalışma yok" cümlesi kullanılmaz.

## Güncel ürün iddiaları

| Önceki ifade | Doğrulanan kaynak | Güncel kullanım |
|--------------|--------------------|-----------------|
| Copilot çok dosyalı düzenleme veya geri alma sunmaz. | [GitHub agent mode](https://docs.github.com/en/copilot/how-tos/copilot-in-your-ide/use-copilot-agents/use-agent-mode), [VS Code review/revert](https://code.visualstudio.com/docs/agents/run/review-code-edits) | Çok dosyalı değişiklik ve inceleme/geri alma akışları bulunur; sürüm ve oturum türüne göre davranış değişir. |
| Cursor'da diff ve rollback yoktur. | [Cursor diff/review belgesi](https://docs.cursor.com/en/agent/review), [checkpoint belgesi](https://docs.cursor.com/en/agent/chat/checkpoints) | Resmî belgelerde diff inceleme ve checkpoint geri yükleme anlatılır. Belge URL'leri yönlenebilir; savunma öncesi tekrar kontrol edilir. |
| Claude Code'un IDE entegrasyonu yoktur ve yazması kontrolsüzdür. | [İzin yönetimi](https://code.claude.com/docs/en/permissions), [checkpointing](https://code.claude.com/docs/en/checkpointing), [VS Code](https://code.claude.com/docs/en/vs-code) | İzin modları, geri yükleme ve IDE entegrasyonu bulunur. Güvenlik davranışı seçilen moda bağlıdır. |
| Agentic IDE açık kaynak ve daha güvenlidir. | [Repo lisans durumu](../README.md) | Lisans henüz seçilmemiştir; çalışan uygulama ve karşılaştırma sonucu yoktur. |

Bu tablo ürün benchmark'ı değildir. Resmî dokümantasyon özelliklerin tanımlandığını
gösterir; hatasızlık, yeterlilik veya ürünler arasında üstünlük göstermez.

## Sunumda kullanılacak dil

- "Öneriyorum", "planladım", "ölçeceğim" ve "danışman onayı bekliyor" ifadelerini kullan.
- %60 başarı, %20 rollback ve %15 yanlış atıf değerlerini ölçülmüş sonuç veya
  istatistiksel anlamlılık eşiği olarak sunma; bunlar gözden geçirilecek hedef sinyalleridir.
- Sıfır ihlal yalnızca belirtilen test setinde gözlenen sonuç olabilir; evrensel güvenlik garantisi değildir.
- Rollback oranı güvenin doğrudan ölçüsü değildir; başarılı müdahaleyi de gösterebilir.
- TDD'yi reddetmek yerine, testlerin gereksinim, güvenlik ve izlenebilirlik kanıtlarıyla
  tamamlanmasını tartış. Bu tamamlamanın etkisi ayrıca ölçülmelidir.
- İnsan katılımcı çalışması yapılmazsa kullanıcı güveni, öğrenme veya üretkenlik hakkında
  genellenebilir sonuç iddiası kurulmaz.

## Sonraki araştırma işi

Mevcut [#66](https://github.com/TurkishKEBAB/Agentic-Ide/issues/66),
[#71](https://github.com/TurkishKEBAB/Agentic-Ide/issues/71) ve
[#99](https://github.com/TurkishKEBAB/Agentic-Ide/issues/99) üzerinden şu çıktılar izlenir:
aramalar ve tarihleri, dahil/haric ölçütleri, insan-onayı/doğrulama/rollback çalışmaları
için yöntem matrisi, bu projenin kapsadığı ve kapsamadığı boşluklar. İlk toplantıdan
sonra tam kaynakça hazırlanır; literatürden yokluk sonucu çıkarılmadan önce tarama kapsamı
belgelenir.
