# İlk Danışman Toplantısı — 8 Ekim 2026

Durum: Toplantı öncesi karar taslağı. Aşağıdaki öneriler danışman onayı değildir.

- Tarih: **8 Ekim 2026, Perşembe**.
- Katılımcılar: [Öğrenci adı] + [Danışman adı].
- Önerilen süre: **15 dakika sunum + 30 dakika tartışma**; danışmanın ayırdığı süreye göre esnetilebilir.
- Amaç: Araştırma odağı, uygulanabilir MVP, deney protokolü, insan çalışması ve gerçek takvim hakkında beş karar almak.
- Mevcut durum: Planlama belgeleri, ADR'ler, schema'lar, diyagramlar ve backlog var; çalışan uygulama ve deney sonucu henüz gösterilemiyor.

## Sunumun 15 Dakikalık Akışı

| Süre | Anlatılacak konu | Danışmanın değerlendireceği nokta |
|---|---|---|
| 0–3 dk | Problem ve katkı adayı: AI önerisini gereksinime göre doğrulamak, karar ve kanıt üretmek | Tez sorusu yeterince dar ve ölçülebilir mi? |
| 3–6 dk | VDD önerisi ve mevcut kapsam: gereksinim → plan → diff → doğrulama → onay → uygulama → kanıt/geri alma | VDD ana çerçeve mi, destekleyici anlatım mı? |
| 6–9 dk | Mimari baz çizgisi: Electron + Monaco, tek yürütücü, sınırlı tool yüzeyi, workspace/protected-file kontrolleri | İlk prototipin en küçük güvenli kapsamı nedir? |
| 9–12 dk | 20 görevlik önerilen A/B/C değerlendirme ve kanıt planı | Hangi karşılaştırma hangi iddiayı destekler? |
| 12–15 dk | Açık kararlar ve ilk iki haftanın somut çıktıları | Hangi kararlar şimdi alınmalı, hangileri ertelenebilir? |

Sunumda performans, güvenlik üstünlüğü, kullanıcı güveni veya öğrenme artışı elde edilmiş sonuç gibi anlatılmaz.
Özgünlük, mevcut araçlarda diff/onay/rollback bulunmadığı iddiasına dayandırılmaz.

## K1 — Ana Akademik Çerçeve ve Tez İddiası

**Net soru:** “VDD'yi AI destekli geliştirmede gereksinim, doğrulama ve kanıt izlenebilirliğini birleştiren ana tasarım çerçevesi olarak ele alıp, insan onay kapısının etkisini bunun ölçülebilir bileşeni olarak sınırlandırmam uygun mu?”

**Öneri:** Kullanıcının yerel inceleme notundaki VDD odağını esas alan, sınırları açık bir VDD çerçevesi. Ürün artefact'i Agentic IDE; ölçülebilir ilk katkı gereksinim → plan/diff → karar → değişiklik → kanıt bağlantısı ve onay politikasının kontrollü değerlendirmesi. “Yeni ve üstün evrensel metodoloji” veya “TDD'nin yerine geçen yöntem” iddiası yok.

| Seçenek | Kazanç | Bedel / sınır |
|---|---|---|
| VDD ana çerçeve, onay kapısı ölçülebilir bileşen — önerilen | Kullanıcının hedefini korur; daha geniş fikri dar prototip ve kanıtla bağlar | VDD'nin her bileşeninin etkinliği aynı deneyle kanıtlanmış sayılamaz |
| Approval-gated coding ana soru, VDD destekleyici çerçeve | Daha dar araştırma sorusu ve daha az uygulama yükü | VDD ana hedefi daha sınırlı temsil edilir |
| Tam VDD metodolojisi, öğrenci/profesyonel modları ve çoklu verifier değerlendirmesi | Geniş araştırma programı | İlk tez için kapsam, insan deneyi ve doğrulama yükü belirgin artar |

**Gerekli çıktı:** Tek cümlelik tez katkısı, ana araştırma sorusu, iki alt soru ve kaçınılacak iddialar listesi. VDD ana/destekleyici seçimi açıkça kaydedilmeli.

İlgili kartlar: [#20](https://github.com/TurkishKEBAB/Agentic-Ide/issues/20), [#66](https://github.com/TurkishKEBAB/Agentic-Ide/issues/66), [#71](https://github.com/TurkishKEBAB/Agentic-Ide/issues/71).

## K2 — MVP Sınırı ve Doğrulamanın Bağımsızlığı

**Net sorular:**

1. “Tek yürütücü ajan ve MVP içinde shell/terminal çalıştırmama sınırı yeterli mi?”
2. “Minimum doğrulama kanıtını sabit gereksinim/kabul kriterleri ve harici test oracle'ı ile kurmam; read-only LLM verifier'ı danışman kararına bağlı ek değerlendirme rolü olarak tutmam uygun mu?”
3. “Onaylanan diff değişirse veya dosya içeriği eskirse yeniden onay; çok dosyalı apply hata verirse recovery; undo sırasında kullanıcı değişikliği varsa conflict politikası zorunlu kabul kriteri olsun mu?”

**Öneri:** Tek yürütücü; kullanıcı tetiklemeli plan/diff/onay; agent tool yüzeyinde shell/exec/eval yok. Testler geliştirici, CI veya harici benchmark harness tarafından çalıştırılabilir. Deterministik policy testleri ve önceden sabitlenmiş test/kabul oracle'ı temel kanıttır. Read-only verifier, öneri/bulgu üretebilir; dosya değiştiremez ve insan kararının yerini alamaz.

| Seçenek | Kazanç | Bedel / sınır |
|---|---|---|
| Bağımsız oracle + tek yürütücü; read-only verifier kapsamı ayrıca seçilir — önerilen | Test edilebilir, sınırları açık ve ilk prototipe uygun | Verifier'ın ek yararı ayrı bir deney yapılmadan iddia edilemez |
| Aynı LLM, ayrı prompt/context ile zorunlu read-only verifier | Rol ve tool yüzeyi ayrımı görünür | Korelasyonlu hatalar mümkündür; farklı prompt doğruluk bağımsızlığını kanıtlamaz |
| Farklı model verifier + multi-agent koordinasyon veya shell araçları | Daha geniş otomasyon ve araştırma soruları | Ek maliyet, güvenlik yüzeyi ve deney değişkenleri; ilk MVP kapsamını büyütür |

**Gerekli çıktı:** MVP içi/dışı kısa liste; minimum verifier seviyesi; harici test yürütme sınırı; approval/recovery/undo kabul kriterleri. Workspace boundary ve protected-file testleri agent loop'tan önce bulunmalı.

İlgili kartlar: [#31](https://github.com/TurkishKEBAB/Agentic-Ide/issues/31), [#68](https://github.com/TurkishKEBAB/Agentic-Ide/issues/68).

## K3 — Deney Tasarımı ve Formal Çalışma Öncesi Dondurma

**Net sorular:**

1. “Primary benchmark için aşağıdaki 20 görev ve kategori dağılımı uygun mu?”
2. “A/C'yi tüm iş akışının karşılaştırması; B/C'yi yalnızca onay politikasının ablation'ı olarak raporlamam doğru mu?”
3. “Model/prompt/policy sürümleri, fixture reset'i, tekrar sayısı, timeout/bütçe, primary metrik ve analiz planını formal run'lardan önce donduralım mı; gerekli tekrar ve raporlama düzeyi nedir?”

**Önerilen primary görev dağılımı:**

| Kategori | Görev sayısı |
|---|---:|
| Bug fix | 5 |
| Çok dosyalı refactor | 4 |
| Test yazma | 4 |
| Codebase Q&A | 3 |
| Güvenli tek dosya değişikliği | 4 |
| Toplam | **20** |

20 görev bir kapsam önerisidir; yeterli istatistiksel güç sağlandığı iddia edilmez. Görev sayısı, tekrar sayısı ve run sayısı ayrı kaydedilir: **20 × 3 koşul × danışmanla belirlenecek tekrar sayısı**. Adversarial policy fixture'ları ayrı güvenlik paketi olabilir; primary görev paydasına sessizce eklenmez.

| Koşul | Ne ölçer? | Kontrol edilmesi gereken sınır |
|---|---|---|
| A — Doğrudan LLM ile görev ve elle uygulama | A/C tüm iş akışını karşılaştırır | Manuel context/review/apply farkları açık yazılır; tek değişkenli karşılaştırma değildir |
| B — Aynı uygulamada deneysel approval-gate-disabled modu | B/C onay politikasını karşılaştırır | Model, retrieval, prompt/policy sürümleri ve hard safety kontrolleri sabit tutulur |
| C — Tam kullanıcı onaylı akış | Normal ürün akışını temsil eder | Kullanıcı kararları, uygulanmış değişiklik ve sonuç birlikte kaydedilir |

**Alternatifler:** 25 primary görev, kategori başına eşit 5 görev sağlar fakat yazım/koşu yükünü artırır. Daha küçük pilot seti protocol/runner hatalarını erken gösterir fakat formal primary benchmark'ın yerini tutmaz. Farklı model/verifier karşılaştırması ek faktördür; ilk A/B/C'den ayrı kapsam kararı gerekir.

**Gerekli çıktı:** Task taxonomy/count; lisanslı ve dondurulmuş fixture; primary metrik ve denominatörler; tekrar/timeout/bütçe; rubric; model/prompt/policy ve protocol sürümü; analiz planı. Bunlar formal ölçüm öncesi sabitlenmeli. Runner geliştirmek, formal deney başlaması anlamına gelmez.

Görev başarısı için %60 ve başarılı yetkisiz yazma için 0 gibi değerler varsa **hedef** olarak etiketlenir. Sıfır gözlenen ihlal genel güvenlik garantisi değildir. Reject/rollback oranı bağlamıyla raporlanır; düşük oran tek başına kalite veya kullanıcı güveni artışı sayılmaz.

İlgili kartlar: [#25](https://github.com/TurkishKEBAB/Agentic-Ide/issues/25), [#54](https://github.com/TurkishKEBAB/Agentic-Ide/issues/54), [#95](https://github.com/TurkishKEBAB/Agentic-Ide/issues/95), [#99](https://github.com/TurkishKEBAB/Agentic-Ide/issues/99).

## K4 — İnsan Çalışması, Güven ve Öğrenme İddiaları

**Net soru:** “Bu tezde insan katılımcılı pilot zorunlu mu? Zorunlu değilse teknik benchmark'ı primary kanıt kabul edip güven/öğrenme artışını test edilmemiş gelecekteki çalışma olarak sınırlamam uygun mu?”

**Öneri:** İlk kapsamda teknik benchmark ve davranış kanıtları zorunlu; katılımcılı pilot ayrı ve koşullu karar. Pilot yapılmazsa audit/reject/rollback kayıtları kullanıcı kontrolünü gösterir; kullanıcı güvenini veya öğrenmeyi artırdığı sonucunu kanıtlamaz.

| Seçenek | Kazanç | Bedel / sınır |
|---|---|---|
| Teknik değerlendirme primary; pilot kararı kapsam/takvime bağlı — önerilen | İlk prototip ve deney yükü yönetilebilir | İnsan güveni/öğrenmesi hakkında sonuç iddiası sınırlandırılır |
| Küçük keşifsel pilot | Kullanılabilirlik ve yorumlanabilirlik hakkında nitel geri bildirim | Etik/izin, onam, anonimleştirme ve katılımcı planı gerekir; genelleme sınırlıdır |
| Öğrenci öğrenmesi veya kullanıcı güveni için formal çalışma | Doğrudan insan çıktısı ölçülebilir | Ek tasarım, ölçüm aracı, örneklem ve takvim gerektirir; teknik benchmark'tan ayrı iş paketi olur |

**Gerekli çıktı:** “Pilot var / yok / şu koşula bağlı” kararı; yapılacaksa etik ve onam sorumlusu, örneklem/ölçüm taslağı ve gereken izin adımları. Yapılmayacaksa tezde kullanılacak açık limitation cümlesi.

İlgili kartlar: [#71](https://github.com/TurkishKEBAB/Agentic-Ide/issues/71), [#113](https://github.com/TurkishKEBAB/Agentic-Ide/issues/113).

## K5 — Gerçek Takvim, Kapasite ve İlk İki Hafta

**Net sorular:**

1. “Akademik başlangıç ve son teslim/savunma tarihi nedir; mevcut 18 ay / 5 faz taslağı gerçek takvime uyuyor mu?”
2. “Haftalık ayırabileceğim süreyi ve görüşme sıklığını esas alarak üç GitHub milestone'unu hangi çıkış kanıtlarıyla tamamlanmış sayalım?”
3. “İlk iki hafta sonunda aşağıdaki güvenli temel prototip ve örnek kanıt paketini göstermem yeterli mi; kapasite düşükse hangi çıktıyı erteleyelim?”

**Öneri:** Takvimi gerçek teslim tarihinden geriye kur; 5 fazlı uzun taslağı 3 GitHub milestone'una açık eşle. İlk hedefi çalışan temel shell + workspace güvenlik testi + schema-valid örnek kanıt olarak sınırla. Model/provider entegrasyonu, embedding index, agent loop ve çok dosyalı transaction tümü aynı iki haftanın taahhüdü olmasın.

| Seçenek | Kazanç | Bedel / sınır |
|---|---|---|
| Kapasiteye göre dar ilk dilim ve kanıt odaklı milestone çıkışları — önerilen | İlerleme danışmana somut ve incelenebilir gösterilir | Geniş ürün özellikleri sonraki dilimlere kalır |
| Mevcut 18 ay / 5 fazı aynen sürdürmek | Ayrıntılı eski plan korunur | Akademik tarihlerle uyumu önce doğrulanmalı |
| İki haftada agent/retrieval/approval/rollback'in tümünü istemek | Erken kapsamlı demo hedefi | Güvenlik zemini ve doğrulama için ayrılan süre azalır; kapasite teyidi olmadan taahhüt edilemez |

**Gerekli çıktı:** Gerçek başlangıç/teslim tarihi, haftalık saat, toplantı sıklığı, milestone çıkışları, ilk iki hafta teslim listesi ve bir sonraki görüşme tarihi. Bu alanlar aşağıda boş bırakılmıştır; proje takvimine keyfî tarih atanmaz.

Milestone'lar: [Faz 1 — Implementation Readiness](https://github.com/TurkishKEBAB/Agentic-Ide/milestone/2), [Faz 2 — MVP](https://github.com/TurkishKEBAB/Agentic-Ide/milestone/3), [Faz 3 — Evaluation & Thesis](https://github.com/TurkishKEBAB/Agentic-Ide/milestone/4).

## İlk İki Hafta İçin Önerilen Çıktılar

Başlangıç tarihi ve kapasite K5'te kararlaştırılacak. Aşağıdaki sıralama kapsam önerisidir.

| Dilim | Çıktı | İncelenecek kanıt / durma koşulu |
|---|---|---|
| Önce karar ve hazırlık | K1–K5 karar kaydı; minimum MVP ve DoR/DoD; ilk slice için açık dependency'ler | Onay bekleyen kararlar ve çözülemeyen blokajlar görünür; blanket Ready/Done ataması yok |
| İlk hafta | Electron + Monaco açılışı; workspace seçimi; tek yerel dosyayı görüntüleme | Başlatma/file-open smoke sonucu, runtime manifesti ve review edilebilir küçük PR |
| İlk hafta / ikinci hafta | Workspace boundary ve protected-file pure kontrolleri | Traversal, sibling-prefix, dış symlink/junction ve protected-file fixture'ları; CI test sonucu |
| İkinci hafta, kapasite yeterliyse | Her benchmark kategorisinden birer örnek: toplam 5 schema-valid task; fixture/reset ve scoring taslağı | JSON Schema doğrulaması; henüz formal deney sonucu veya başarı oranı yok |
| Sonraki görüşme | Temel prototip gösterimi, güvenlik test raporu, açık karar/blokaj listesi | Güvenli zemin oluştuysa agent loop için sonraki dar slice seçilir |

İlk uygulama için mevcut kartlar kullanılmalı: [#33](https://github.com/TurkishKEBAB/Agentic-Ide/issues/33), [#44](https://github.com/TurkishKEBAB/Agentic-Ide/issues/44), [#49](https://github.com/TurkishKEBAB/Agentic-Ide/issues/49), [#45](https://github.com/TurkishKEBAB/Agentic-Ide/issues/45), [#27](https://github.com/TurkishKEBAB/Agentic-Ide/issues/27), [#97](https://github.com/TurkishKEBAB/Agentic-Ide/issues/97).

## Toplantı Karar Kaydı — Toplantıda Doldurulacak

Boş karar hücreleri önerinin kabul edildiği anlamına gelmez.

| ID | Danışmanın kararı: kabul / revizyon / erteleme | Karar cümlesi ve gerekçe | İlgili issue / doküman güncellemesi | Sorumlu / takip |
|---|---|---|---|---|
| K1 | ____ | ____ | ____ | ____ |
| K2 | ____ | ____ | ____ | ____ |
| K3 | ____ | ____ | ____ | ____ |
| K4 | ____ | ____ | ____ | ____ |
| K5 | ____ | ____ | ____ | ____ |

- Karar kaydı tarihi: ____.
- Akademik başlangıç: ____.
- Son teslim / savunma: ____.
- Haftalık çalışma kapasitesi: ____ saat.
- Danışman görüşme sıklığı: ____.
- İlk iki haftanın seçilen zorunlu çıktıları: ____.
- İlk iki haftadan ertelenen kapsam: ____.
- Sonraki görüşme tarihi ve göstereceğim kanıt: ____.
- Açık kalan soru / karar ve çözüm sahibi: ____.

## Görüşme İçin Okuma Paketi

1. [SUPERVISOR_BRIEF.md](SUPERVISOR_BRIEF.md): kısa proje özeti.
2. [PRODUCT_PLAN.md](PRODUCT_PLAN.md): kapsam, araştırma sorusu ve başarı ölçütleri.
3. [VERIFICATION_DRIVEN_DEVELOPMENT.md](VERIFICATION_DRIVEN_DEVELOPMENT.md): VDD/TDD dili ve iddia sınırları.
4. [SYSTEM_PLAN.md](SYSTEM_PLAN.md): uygulama, tool ve güvenlik sınırları.
5. [EVALUATION_PLAN.md](EVALUATION_PLAN.md): A/B/C, metrikler ve değerlendirme taslağı.
6. [docs/REQUIREMENTS_TRACEABILITY.md](docs/REQUIREMENTS_TRACEABILITY.md): davranış → doğrulama → planlanan tez kanıtı.
7. [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md): gerçek takvimle eşlenecek uzun plan.

Sunumdaki her teknik karar “mevcut öneri / danışman kararı / çalışan kanıt” ayrımını korumalı. Toplantı sonrasında karar kaydı, ilgili issue ve canonical plan birlikte güncellenir.
