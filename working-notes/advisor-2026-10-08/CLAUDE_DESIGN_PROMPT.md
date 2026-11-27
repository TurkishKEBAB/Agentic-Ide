# Claude Design'a doğrudan yapıştırılacak sunum promptu

Aşağıdaki metin tek başına yeterlidir. Köşeli parantez içindeki ad/bölüm alanlarını istersen doldur.
Sunum süresi belirtilmediği için 15 dakika varsayıldı; ardından danışmanla karar tartışması planlandı.

---

8 Ekim 2026 tarihinde lisans bitirme projemin danışmanıyla yapacağım **ilk toplantı** için Türkçe,
16:9 formatında bir akademik sunum tasarla. 12 ana slayt ve 2 kısa ek slayt olsun. Ana anlatım 15 dakika sürsün.
Sunumun amacı araştırma odağını, minimum prototipi, değerlendirme yöntemini ve ilk teslimleri danışmanla netleştirmek.

Proje adı **Agentic IDE**. Öğrenci: [Ad Soyad]. Bölüm: [Bölüm / Üniversite]. Danışman: [Danışman adı].
Başlık önerisi: **“Agentic IDE: Kod Değişikliklerinde Doğrulama, İnsan Onayı ve İzlenebilirlik”**.
Alt başlık: **“İlk danışman görüşmesi · Araştırma önerisi ve MVP kapsamı · 8 Ekim 2026”**.

## Doğruluk ve anlatım kuralları

Bu bilgiler gerçek proje incelemesine dayanır:

- Repo planlama ve requirements aşamasında. Uygulama kodu, çalışan ürün demosu veya ölçülmüş deney sonucu yok.
- GitHub'da 95 açık planlama issue'su, 17 epic ve üç milestone var. İncelemede mevcut 26 kartın canonical
  requirements dosyasında olmadığı ve yapısal Project alanlarının eksik olduğu bulundu; bunlar tamamlandı.
  Bu işlem yeni özellik üretmek veya 26 işi bitirmek anlamına gelmez. Yeni issue açılmadı.
- Üç milestone: **Faz 1 – Implementation Readiness**, **Faz 2 – MVP**, **Faz 3 – Evaluation & Thesis**.
  Kesin teslim tarihleri henüz atanmadı. Eski plan 18 ay / beş teknik faz içeriyor; bunun gerçek akademik takvimle
  uyumu ilk toplantıda teyit edilecek. 8 Ekim'i otomatik proje başlangıcı kabul etme.
- Repo mimari baz çizgisi: Electron + Monaco + TypeScript, kullanıcı tetiklemeli single-agent döngüsü,
  bir bulut ve bir yerel sağlayıcı, manuel model seçimi. Teknik baz çizgi, danışman onayı veya çalışan kod kanıtı değildir.
- Temel süreç: **gereksinim → bağlam → plan → diff → güvenlik kontrolü → insan onayı → kontrollü apply → kanıt → rollback**.
- MVP'de terminal/shell execution, background/proaktif görev başlatma, multi-agent koordinasyon, VS Code extension
  uyumluluğu ve hesap/bulut senkronizasyonu yok. Testler IDE ajanı dışında sabit bir değerlendirme ortamında çalıştırılır.
- VDD'nin açılımı **Verification-Driven Development**. İnceleme notunda VDD ana odak, eski ana belgelerde
  destekleyici çerçeve olarak yazılmış. **Toplantıya götürülen öneri:** VDD'yi dar bir proje-özel araştırma çerçevesi,
  approval-gate'i ölçülebilir bileşen ve Agentic IDE'yi deney prototipi olarak konumlandırmak. Bu henüz onaylanmadı.
- Bağımsız verifier ayrı bir ana araştırma değişkeni yapılırsa başka bir ablation gerekir; mevcut B/C deneyi verifier
  etkisini kanıtlamaz. Ayrı model/prompt kullanmak bağımsız doğruluk oracle'ı sağlamaz.
- Mevcut araçlarda diff, geri alma ve izin özellikleri bulunur. “Cursor/Copilot/Claude'da bunlar yok”,
  “bunu ilk yapan proje”, “literatürde hiç çalışma yok”, “TDD bitti” veya “VDD üstünlüğü kanıtlandı” yazma.
- %60 görev başarısı, sıfır gözlenen politika ihlali gibi ifadeler **hedef / değerlendirme ölçütü** olarak etiketlenir.
  Gerçekleşmiş başarı oranı çizme. Düşük rollback oranını güvenin doğrudan ölçüsü olarak gösterme.
- Kullanıcı çalışması yapılmazsa güven, öğrenme ve üretkenlik artışı hakkında sonuç iddiası kurulmaz.
- Repo lisansı henüz seçilmedi; ürünü lisanslanmış açık kaynak yazılım diye tanıtma.

Her slaytta “mevcut plan”, “öneri”, “danışman kararı bekliyor” veya “uygulama sonrası ölçülecek” ayrımını gerektiği
yerlerde küçük ve okunabilir bir etiketle göster. Uygulanmış / tamamlanmış rozetlerini yalnız doküman incelemesi için
kullan; uygulama veya deney için kullanma. Hayalî ekran görüntüsü üretme. Arayüz çizimi kullanırsan açıkça
**“kavramsal wireframe”** yaz.

## Görsel yön

Sade, teknik, akademik ve konuşmayı destekleyen bir görünüm istiyorum. Açık kırık beyaz zemin (#F5F7FA), koyu lacivert
metin (#0F172A), petrol yeşili vurgu (#0F766E), karar bekleyen alanlar için amber (#B45309) kullan. Okunaklı Inter,
Aptos veya benzeri bir sans-serif seç. Geniş boşluk, tutarlı hizalama ve tek ana mesaj kullan.

Başlıklar 32–40 pt, ana içerik 22–28 pt, kaynak dipnotları en az 12 pt olsun. Renk tek başına durum iletmesin;
etiketler de olsun. En fazla 3–4 kısa madde veya bir ana diyagram kullan. Uzun paragraf, küçük metinli dev requirements
tablosu, dekoratif robot görselleri ve reklam sloganları kullanma. Veri olmayan yerde sonuç grafiği çizme.

Her ana slayt için **30–90 saniyelik Türkçe konuşmacı notu** hazırla. Notlar birinci tekil şahısla doğal bir anlatım
olsun; cümleler slayttaki maddeleri tekrar etmek yerine neden bu kararı istediğimi açıklasın.

## Slayt içeriği

### 1. Proje ve toplantının amacı — 30 saniye

Başlık ve öğrenci bilgileri. Ana mesaj: “Çok dosyalı AI kod değişikliklerinde doğrulama ve kullanıcı kararını
izlenebilir bir prototipte incelemek istiyorum.” Alt satır: “Bugün hedef: araştırma sorusu, MVP ve deney planında ortak karar.”
Durum etiketi: “Planlama aşaması”.

### 2. Araştırılacak problem — 60 saniye

Bir AI önerisi doğru görünebilir; gereksinimi karşılamayabilir, hedef dışı dosyayı değiştirebilir veya yanlış atıf yapabilir.
İnsan öneriyi inceleyebilmek, nedenini görebilmek ve geri alabilmek ister. Üç kartla anlat:
**Doğruluk**, **Kontrol**, **Kanıt**. Kanıtsız günlük verimlilik kaybı sayıları verme.
Konuşmacı notu: “Bunların hedef kullanıcı grubunda ne kadar sorun oluşturduğunu ve akışın ne kadar yardım ettiğini
ölçmem gerekiyor; başlangıçta bir üstünlük varsaymıyorum.”

### 3. Mevcut çalışmalar ve katkı adayı — 75 saniye

Üç satırlı karşılaştırma: mevcut araçlar diff/izin/geri alma sunar; literatür ajan ve kod değerlendirmesini araştırır;
bu proje gereksinimden karara ve kanıta bağlantıyı sınırlı bir deney prototipinde inceleyecek.
Önerilen katkılar: izlenebilir yaşam döngüsü sözleşmesi, güvenlik ve recovery kanıtları, dondurulmuş görevlerde
kontrollü karşılaştırma. Etiket: “Özgünlük literatür ve danışman incelemesinde”.
Kaynak dipnotu: ReAct, SWE-bench, METR ve CHI 2026 doğrulama yükü çalışması.

### 4. K1: VDD'yi nasıl konumlandıracağız? — 75 saniye

Üç katmanlı görsel:
**Araştırma çerçevesi önerisi: VDD** → **Ölçülebilir bileşen: plan/diff/onay/kanıt akışı** →
**Prototip: Agentic IDE**.
Yanında küçük alternatif: “Approval-gate ana odak; VDD destekleyici çerçeve”.
Ana soru önerisi: “Gereksinim ve kanıtlarla ilişkilendirilmiş kod değişikliği akışı, sabit görev/model koşullarında
görev doğruluğunu, hatalı değişikliklerin uygulanmasını ve inceleme maliyetini nasıl etkiler?”
Soru bandı: “Bu dar kapsam lisans bitirme projesi için yeterli ve savunulabilir mi?”
VDD'nin tüm yazılım geliştirme süreçlerinden üstün olduğu iddiasını kurma.

### 5. K2: Kullanıcı ve minimum kapsam — 75 saniye

Hedef profil: üst sınıf bilgisayar mühendisliği öğrencisi / junior geliştirici; jüri, demo değerlendirme bağlamıdır.
Beş senaryo: tek dosya düzenleme, çok dosya refactor, hata düzeltme, test önerisi, kaynaklı codebase Q&A.
MVP kartı: dosya ağacı + editör, bağlam kaynakları, plan/diff/onay, korumalı apply/rollback, audit ve sağlayıcı adaptörleri.
Kapsam sınırı kartı: shell/terminal, multi-agent, proaktif background işler ve extension uyumluluğu dışarıda.
Son soru: “Bu kapsamda hangi tek uçtan uca akışı önce göstermemi beklersiniz?”

### 6. Gereksinimden kanıta iş akışı — 75 saniye

Yatay veya iki satırlı akış çiz:
**Gereksinim → bağlam kaynakları → değişiklik planı → diff + riskler → insan kararı → kontrollü apply → doğrulama kanıtı → rollback**.
Onay/red dalları ve hata durumunda recovery dalı görünür olsun. Apply yanında “yalnız incelenen değişiklik seti” yaz.
Örnek: bir interface değişince tanım ve iki kullanım dosyasına bağlı tek değişiklik seti oluşur. Dosya sonradan
değişmişse onay yeniden alınır. Hedef dışı/protected dosya isteği deterministik politikayla durdurulur.
Test/derleme kanıtının dış harness'ten geldiğini notta açıkla. İnsan onayı ve test geçişini aynı şey gibi sunma.

### 7. Mimari ve güven sınırları — 75 saniye

Basit bileşen diyagramı:
**Electron renderer: Monaco + chat + diff** ↔ **sınırlı preload/IPC** ↔
**main broker: policy, context, agent loop, staged patch, apply/journal/rollback, audit**.
Main broker'dan yerel workspace/index ve seçilen bulut/yerel model adaptörüne oklar çiz.
Model çıktısına “güvenilmeyen öneri”, gerçek write hattına “host kontrolü + geçerli onay” etiketi koy.
Öneri: API anahtarı config'te düz metin olmaz, main process tarafındaki güvenli secret storage'a referans tutulur.
Ana vurgu: single-agent orkestrasyon ile deterministik kontrol ayrımı. Ayrı verifier varsa read-only öneri rolüdür;
yazma yetkisi veya bağımsız oracle garantisi yoktur.
Etiket: “Mimari baz çizgi + uygulama öncesi sözleşme önerileri”.

### 8. K3: Deney tasarımı — 90 saniye

Üç sütunlu A/B/C tablosu:
**A:** Aynı sabit modelle doğrudan LLM; standartlaştırılmış manuel bağlam ve manuel uygulama.
**B:** Aynı Agentic IDE; deney fixture'ında kullanıcı onayı kapalı; zorunlu güvenlik korumaları açık.
**C:** Aynı IDE; diff üzerinden gerçek insan onayı; aynı zorunlu korumalar.

Altında iki ayrı ok:
**A↔C = toplam iş akışı farkı**; **B↔C = onay politikasının etkisi**, ancak model, retrieval, bütçeler ve safety eşitlenirse.
Large-edit uyarısında otomatik devam B/C'ye ikinci fark ekler; bunu eşitleme veya ana görevleri eşiğin altında tutma
kararı formal koşudan önce alınacak.

Görev dağılımını bir şerit/tabloyla göster: **5 tek dosya + 4 refactor + 4 bugfix + 3 test + 4 Q&A = 20**.
16 yazma görevini gate ölçümü için; 4 Q&A'yı atıf/bağlam doğruluğu için ayrı göster. Adversarial güvenlik testleri
ana 20 görevden ayrı. Birincil model sabit; bulut/yerel karşılaştırması ikincil. İnsan incelemesi için gerçek operatör
gerekir; C'nin onayını otomatik “evet” yaparak gate etkisi ölçülmez.
Soru: “Bu örneklem ve karşılaştırma bitirme projesi için yeterli mi; hangi kabul oracle'ı ve dış inceleyen gerekli?”

### 9. Ne ölçeceğiz, ne iddia etmeyeceğiz? — 75 saniye

Dört satırlı sade tablo:
**Görev doğruluğu:** Önceden yazılmış kabul kriterleri/testler veya Q&A rubriği; tam/kısmi/başarısız.
**Güvenlik:** Engellenen girişim ve dosyaya gerçekten yansıyan politika ihlali ayrı; dış hash/sentinel kanıtı.
**İnceleme ve maliyet:** Review süresi, toplam süre, token/maliyet, red gerekçesi ve rollback sonucu.
**İzlenebilirlik:** Gereksinim–kanıt–karar–artifact bağlantısının varlığı ve doğruluğu.

%60 tam başarı yalnız tartışılacak hedef; sıfır gözlenen ihlal yalnız test edilen kapsam için.
Reject ve rollback'i A/B/C'de aynı anlamda zorla kıyaslama. Modelin kendi yazdığı testler tek başına bağımsız oracle değil.
Formal koşudan önce görev, model/prompt, rubrik ve analiz planı dondurulacak. Sonuçlara göre ölçüt seçilmeyecek.

### 10. K4: İnsan çalışması ve iddia sınırı — 60 saniye

İki seçenek kartı:
**Teknik benchmark:** Zorunlu başlangıç kapsamı; doğruluk, güvenlik, izlenebilirlik kanıtı.
**Gönüllü pilot:** Danışman ve kurumun gerekli izin/onam sürecine bağlı; kullanılabilirlik ve nitel geri bildirim.
Ana cümle: “Pilot yapılmazsa kullanıcı güveni ve öğrenme artışı tez sonucu olarak sunulmayacak.”
Soru: “Katılımcı çalışması zorunlu mu; yapılacaksa örneklem, ölçüm ve izin sürecini nasıl kurmalıyım?”
Öğrenci öğrenmesi formal çalışma gerektirir; 20 kod görevi 20 kullanıcı anlamına gelmez.

### 11. K5: Takvim, milestone ve ilk iki hafta — 75 saniye

Üç milestone'u tarih uydurmadan kanıt kapılarıyla göster:
**Readiness:** Araştırma/kapsam kararı, lifecycle ve deney protokolü, schema/CI, ilk slice'ın DoR'u.
**MVP:** Güvenli uçtan uca senaryolar, apply/recovery/rollback ve test kanıtı, özellik dondurma.
**Evaluation & Thesis:** Dondurulmuş görev koşuları, analiz/sınırlılıklar, tez ve savunma paketi.

Alt bölümde ilk iki haftanın dar önerisi:
1. Karar kaydı ve minimum scope.
2. Electron + Monaco shell; workspace seçimi ve bir dosyayı görüntüleme.
3. Workspace/protected-file negatif testleri ve CI kanıtı.
4. Kapasite uygunsa her kategoriden birer schema-valid pilot görev: toplam 5 örnek.
Bu iki haftaya tüm agent/retrieval/rollback sistemini bitirme sözü ekleme.

Soru bandı: “Gerçek başlangıç/teslim tarihi, haftalık kapasite ve görüşme sıklığı nedir?”
18 ayın öneri olduğunu ve geçmiş beş teknik fazla üç milestone'un ayrıca eşlendiğini notta açıkla.

### 12. Bugün almak istediğim beş karar — 60 saniye

Beş numaralı karar kartı ve her biri için boş “onay / revizyon” alanı:
**K1:** VDD ve ana araştırma sorusu.
**K2:** MVP kapsamı, single-agent/no-shell ve verification rolü.
**K3:** 20 görev, A/B/C, oracle ve önceden dondurulacak protokol.
**K4:** Katılımcı çalışması ve güven/öğrenme iddialarının sınırı.
**K5:** Gerçek takvim, kapasite, ilk iki hafta teslimi ve sonraki görüşme.
Son cümle: “Bu kararlarla bir sonraki görüşmeye hangi somut kanıtı getirmemi istersiniz?”
Bu slayt tartışma sırasında açık kalsın. Karar alanlarını önceden doldurma.

## Ek slaytlar

**Ek A — GitHub ve requirement→kanıt haritası:** 95 issue'yu listeme. 6 örnek satır kullan:
#20 araştırma sorusu; #25/#54 benchmark/ablation; #31 onay/apply/rollback; #52 güvenli onboarding;
#66/#68/#71 VDD/verifier kararları; #95/#99/#113 görev dondurma/rubrik/insan çalışması.
Her satırda gerekli çıktı ve kanıt türünü göster. Hepsi açık; doküman mevcut olması uygulama tamamlandı demek değil.
Project: https://github.com/users/TurkishKEBAB/projects/8
Repo: https://github.com/TurkishKEBAB/Agentic-Ide

**Ek B — Kaynaklar ve sınırlılıklar:** Aşağıdaki birincil kaynakları okunur kısa künyeler ve tıklanabilir bağlantıyla yaz:

- ReAct: https://arxiv.org/abs/2210.03629
- SWE-bench: https://arxiv.org/abs/2310.06770
- AI kod güvenliği, Asleep at the Keyboard?: https://arxiv.org/abs/2108.09293
- METR 2026 yöntem güncellemesi: https://metr.org/blog/2026-02-24-uplift-update/
- CHI 2026 verification load: https://doi.org/10.1145/3772318.3791176
- VS Code review/revert: https://code.visualstudio.com/docs/agents/run/review-code-edits
- Cursor diff/review: https://docs.cursor.com/en/agent/review
- Claude Code permissions: https://code.claude.com/docs/en/permissions

Kaynak inceleme tarihi: 7 Ekim 2026. Bu kaynaklar ilgili alanın varlığını gösterir; bütün VDD yaklaşımının doğrulandığını
veya kapsamlı sistematik literatür taraması yapıldığını göstermez.

## Teslim biçimi

Tasarlanmış slaytları, her slaytın konuşmacı notlarını ve 15 dakikalık anlatım sırasını hazırla. Ana slaytlarda kısa metin,
eklerde teknik ayrıntı kullan. Sunumun sonunda anlatımın taşıdığı araştırma iddiasının kanıtla aynı sınırda kaldığını
kontrol et. Tarih, metrik sonucu, danışman onayı veya uygulama ekranı uydurma.
