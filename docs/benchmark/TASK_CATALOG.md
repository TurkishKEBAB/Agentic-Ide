# Birincil görev planı

Dağılım 20 = 5 tek dosya + 4 refactor + 4 bugfix + 3 test + 4 Q&A. Aşağıdaki liste görev yazım planıdır;
formal JSON/fixture/oracle freeze değildir. Beş geliştirme pilotu bu listeye dahil edilmez.

| ID | Kategori | Görev tipi | Önceden hazırlanacak oracle |
|----|----------|------------|-----------------------------|
| SS-01 | Tek dosya | Sabit değer düzeltme | Exact value, exported API ve hedef dışı diff kontrolü |
| SS-02 | Tek dosya | Yerel tip düzeltme | Typecheck ve davranış regresyonu |
| SS-03 | Tek dosya | Guard ekleme | Null/empty ve normal durum kabul testleri |
| SS-04 | Tek dosya | Mesaj formatlama | Sınırlandırılmış snapshot/çıktı eşlemesi |
| SS-05 | Tek dosya | Yerel fonksiyon sadeleştirme | Davranış eşdeğerliği ve allowedFiles |
| MR-01 | Refactor | Interface üyesi yeniden adlandırma | Tanım/kullanım derleme ve davranış |
| MR-02 | Refactor | Sabiti ortak modüle taşıma | Tüm referanslar ve bağımlılık grubu |
| MR-03 | Refactor | Fonksiyon imzası güncelleme | Tüm çağrı noktaları ve regresyon |
| MR-04 | Refactor | Import/export yolu düzenleme | Çözümleme ve tüketici modül davranışı |
| BF-01 | Bugfix | Boş dizi/aggregation | Önce fail sonra pass; normal/regresyon |
| BF-02 | Bugfix | Null/undefined dalı | İlgili sınır değerler ve normal dal |
| BF-03 | Bugfix | Async/await sırası | Deterministik fake zaman/çağrı sırası |
| BF-04 | Bugfix | Parametre/karşılaştırma hatası | Pozitif/negatif/tam sınır testleri |
| TW-01 | Test | Saf fonksiyon edge case | Önceden tanımlı mutantları yakalama |
| TW-02 | Test | Servis mock/bağımlılık | Doğru ve yanlış implementasyon ayrımı |
| TW-03 | Test | Hata yolu/regresyon | Fail-before/pass-after ve uygulamayı değiştirmeme |
| QA-01 | Q&A | Veri akışı açıklama | Dondurulmuş iddia ve dosya/sembol gold listesi |
| QA-02 | Q&A | Çağrı ilişkisi bulma | Gerçek referanslar ve eksik/yanlış atıf |
| QA-03 | Q&A | Konfigürasyon davranışı | Gerçek config tüketimi ve desteklenmeyen iddia |
| QA-04 | Q&A | Hata yolu açıklama | Dal koşulları ve kaynaklı cevap |

Yazma görevleri aynı edit bütçesinde large-edit eşiğinin altında tasarlanır. Q&A gate etkisinin paydasına girmez.
Adversarial güvenlik paketi ayrı vaka ID'leri ve ayrı payda kullanır. Sonuçlara bakarak görev değiştirme yapılmaz;
formal değişiklik protokol sapması olarak kaydedilir ve veri toplama yeniden planlanır.
