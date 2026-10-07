# 8 Ekim 2026 — Değerlendirme, Tez ve Takvim İncelemesi

İnceleme tarihi: 7 Ekim 2026. Kanıt: mevcut çalışma ağacı, ilgili yerel dirty diff'ler, değerlendirme/tez/roadmap/ADR/benchmark belgeleri ve bu oturumdaki GitHub milestone snapshot'ı. Bu not sonuç raporu değildir; repo planlama aşamasındadır. Önceden mevcut yerel değişiklikler korunmuştur; değerlendirme planındaki yöntem çelişkileri bu incelemede ayrıca düzeltilmiştir. Bulgular inceleme öncesi durumu kaydeder; yöntem taslakları onaylanmış deney değildir.

Yeni çıktı: [Değerlendirme protokolü taslağı](../../docs/EVALUATION_PROTOCOL.md). Protokol eksik yöntem ayrıntılarını tamamlar; danışman kararı gerektiren tercihleri kabul edilmiş gibi göstermeden 20 görev ve A/B/C planını korur.

## 1. Toplantıdaki en önemli karar

`PROJECT_REVIEW_TODO.md:53` açıkça “Cevap verification driven development” diyor. Buna karşılık `PRODUCT_PLAN.md` §0.2, `ADVISOR_MEETING_AGENDA.md` K1 ve yerel VDD diff'i approval-gated AI coding'i ana odak yapıyor. Kullanıcının VDD yönelimi, belgelerin daha dar konumlandırmasıyla uyuşmuyor. Yarın “mevcut kararımız gate” diye sunmak, kullanıcı niyetini sessizce geçersiz kılar.

Önerilen sunum cümlesi: **“VDD'yi ana tez çerçevesi olarak incelemek istiyorum. Agentic IDE bunun kontrollü prototipi; ilk ampirik incelemeyi gereksinim→kanıt→insan kararı→rollback hattının dar bir bileşeninde yapmak istiyorum. Hangi bileşenin yeterli ve ölçülebilir olduğunu birlikte netleştirelim.”** Bu bir öneridir; VDD'nin yeni veya üstün bir metodoloji olduğu iddiası değildir.

İki uygulanabilir kapsam var: VDD çerçevesi + onay/izlenebilirlik bileşeninin değerlendirilmesi; veya bağımsız verifier etkisini ana değişken yapmak. İkinci yol mevcut A/B/C'nin ötesine geçer. Verifier rolünü açıp kapatan deney, defect oracle'ı ve yeni kaynak tahmini gerekir. Altı VDD RQ'si, iki kullanıcı modu, çoklu verifier ve learning outcome aynı lisans tezinde zorunlu yapılamaz. Bir ana soru ve en çok bir ikincil teknik soru seçilmeli.

## 2. P0 yöntem eksikleri ve düzeltme önerileri

| Bulgu | Yerel kanıt | Etkisi | Tamamlanan/proposed düzeltme |
|---|---|---|---|
| Görev sayısı çelişkisi | `EVALUATION_PLAN.md` §4.2 ve tez §5.1: 5/4/4/3/4=20; benchmark README: beş kategori×5=25 | Tekrar bütçesi, örneklem ve sunum yanlış anlaşılır | Yeni protokol ana 20 dağılımını koruyor; README onay sonrası hizalanmalı. |
| Ön kayıt mevcut değil | Plan §2.3 H4, §3 H3 ve son satır `PREREGISTRATION.md`'ye atıf yapıyor; dosya yok | Onaylı hipotez varmış izlenimi | Protokol ön kayıt taslağı ve karar tablosu ekliyor; formal freeze/tag hâlâ yapılmalı. |
| Üç koşulda aynı sistem iddiası yanlış | Plan §1.1 A manuel LLM ama notta model/retrieval/safety/kod üçünde değişmez | A/C gate'in nedensel etkisi diye yorumlanamaz | A/C iş akışı, B/C review politikası ayrı estimand olarak yazıldı. |
| B birden çok kararı atlıyor | B tablosu approval ve `LARGE_EDIT_THRESHOLD` devamını otomatik seçiyor | Yalnız gate bool etkisi garanti değil | Large-edit davranışını eşitleme veya ana görevler eşiğin altında + ayrı safety çalışma seçenekleri. |
| Gate öncesi/sonrası kalite karışıyor | Plan task success yalnız ajan çıktısını tanımlıyor | Red edilen yanlış patch güvenli ama görev çözümsüz; ikisini tek başarıya indirger | Aday kalite, final artifact ve hatalı uygulama ayrı tanımlandı. |
| Güvenin ana kanıtı yok | Ana RQ trust içeriyor; §8 kullanıcı çalışması opsiyonel ve qualitative | Otomatik 60 koşu insan güveni/öğrenmesini ölçemez | İnsan review operatörü ve nitel pilot ayrı; pilotsuz güven sonucu yok. |
| H4 yapısal olarak anlamsız | Plan §2.3 reject yalnız C, ama A/B'ye göre anlamlı yüksek bekleniyor | Gate olmayan B'de reject yapısal olarak yok; sonuç zaten arayüz tasarımı | C reject descriptive; yanlış adayı red/doğruyu yanlış red gibi karar kalitesi önerildi. |
| Yüksek reject=anlama varsayımı | Plan §2.3.a | Kötü çıktı, belirsizlik veya aşırı temkin de yüksek reject üretir | Red nedenleri ve oracle etiketi birlikte kaydedilir. |
| Her sonuç hipotezi destekliyor | Tez §1.3 düşük rollback veya yüksek rollback'in sinyal olması | Falsifiye edilebilir hipotez yerine her sonucu olumlu yorumlama | Rollback hedefi ürün sinyali; kusur kalması ve recovery ile yorum. |
| Kör katılımcı hedefi gerçekçi değil | Plan §6.2 single/double blind | Gate varlığı kullanıcıya görünür | Koşul etiketi gizli artifact puanlama; participant double-blind iddiası çıkarılmalı. |
| Analiz bağımsız veri varsayıyor | Plan §6.3 ANOVA/Kruskal | Görevler A/B/C eşlenik, 0/1/2 ordinal, başarı binary | Task düzeyinde tablo, effect size ve eşlenik yöntemler; tekrarlar task cluster. |
| Precision hedefi yanlış operasyonelleştirilmiş | Plan §3 P@5≥70%; ürün top-5 | Yalnız 1 ilgili dosyalı görevde P@5 üst sınır %20; 3 dosyada %60 | Gold birimi sabitle, P@5/Recall@5/ilk doğru rank birlikte; hedef danışman kararı. |
| Token %50 claim ayrı deney istiyor | Plan §3 retrieval vs full file | A/C manual-context farkı kontrollü retrieval ablation değil | Sabit model+task+policy, ayrı context ablation ve kalite kontrolü. |
| Güvenlik için normal görev sayımı yetersiz | Plan §2.2 20×3 | Normal görevlerde saldırı/ihlal nadirse sıfır gözlem ayırt edici değil | Ayrı adversarial suite; attempt/applied/count/payda; filesystem observer. |
| 0 ihlal gate'e bağlanıyor | Tez §1.3 gate güvenlik ihlalini sıfırlar | B/C boundary/secret koruması zaten aynı; A'da gate yok; sıfır risk kanıtlanmaz | Politika ihlali ve istenmeyen işlevsel diff ayrıldı; B gate yokluğu B ihlali değil. |
| Q&A gate araştırmasına karışıyor | 4/20 görev read-only | Gate'in etkisinin olmadığı görevler toplam etkiyi sulandırır | Genel 20 özeti +16 yazma / 4 Q&A ayrı. |
| Test-writing oracle bağımsız değil | Plan §4.4 derleme/test/coverage | AI kendi testini kendi koduna uygun yazabilir, yanlışlıkları kaçırır | İnsan/requirement-derived kabul testleri + bilinen hatalı varyantlar. |
| Run/result şeması eksik | Task ve audit şemaları var; görev JSON örnekleri yok | Version/timing/usage/rater/final score/fixture hashes uçtan uca tanımlı değil | Protokolde dış run manifest taslağı, oracle evidence, A dış logger ihtiyacı. |
| Süre/tekrar/budget freeze yok | Plan §6 | Koşula göre daha çok deneme başarı ve süreyi bozar | Pilotta 20 dakika / 2 tur önerisi; main öncesi exact limit; 60 asgari/180 opsiyonel koşu. |

20 görevde ≥%60 tam başarı, bir ürün/demo eşiğidir. Eşiği geçmek hipotezin desteklendiğini göstermez; B veya A da aynı başarıyı elde edebilir. 20 görevde yüzdelik her 5 puan yalnız bir görevdir. Küçük örneklem, özellikle dört çok-dosya görevinde, kategori bazında güçlü istatistiksel sonuç için zayıftır. Görev sayısını sırf “anlamlılık” için sonuçtan sonra artırmak yerine güç/bütçe sınırı ve belirsizlik açık yazılmalı.

## 3. Gözlenebilir başarı tanımı

Birincil technical çıktı: dondurulmuş gereksinim/kabul kriterlerini karşılayan final artifact, bağımsız testler ve hedef dışı diff. Aday patch'in test geçmesi, C'de reddedilmesi ve nihai görev çözümü ayrı sütunlar olmalı. İnsan doğru biçimde riskli patch'i reddederse güvenlik kararı başarılı, görev çözümü başarısız/eksik olabilir; iki gerçeği de kaydetmek gerekir.

Q&A yanlış dosya/olmayan sembol sayımı yetmez: gerçek dosyaya yanlış davranış atfetme ve atıfsız iddia da tanımlanmalı. Hiç atıf yapmayan model “0 hallucination” ile ödüllendirilmemeli; cevap/kanıt kapsaması ayrıca puanlanmalı.

Rollback oranı, apply olmuş setleri payda almalı; rejectler dahil edilmemeli, sıfır apply N/A olmalı. Pencere örneğin görev sonu bağımsız kontrolüne kadar sabitlenmeli. Rollback'in gerçekten başlangıç hash'lerini geri getirmesi ve kullanıcının sonraki meşru değişikliklerini ezmemesi technical success kriteridir.

VDD ana çerçeve seçilirse en erken ölçülebilecek ek kanıtlar: gereksinim→kabul kriteri→bağımsız oracle→review kararı→artifact bağlantısı; drift için önceden tanımlı requirement değişimi; verifier finding'in oracle ile doğrulanması. “Log var” izlenebilirlik kanıtı olabilir, “kalite arttı” sonucu olamaz. İki agent veya ayrı prompt, aynı yanlışı paylaşan verifier'ın bağımsızlığını garantilemez.

## 4. Deney yapılabilirliği ve katılımcılar

Onaylı karar verici olmadan full C yalnızca simüle edilmiş onay akışıdır. İlk teknik benchmark tek bir öğrenci/operatörle yapılabilir; fakat sonuç bu operatöre aittir. Otomatik “approve all” C, gate teknik davranışını test eder; insan inceleme değerini test etmez. C'nin ana etkisini anlatan en küçük dürüst tasarım, gerçek review kararları ve bağımsız output puanlamasıdır.

5 kişilik pilot 60–90 dakika içinde küçük eşdeğer görev altkümeleriyle yapılabilir. 20 görevin tamamını kişi başına üç koşulda yaptırmak bu plana sığmaz. Beş kişiyle altı sıra permütasyonu tam dengelenmez. Görev zorluğu, önceki bilgi, programlama tecrübesi, sıra/öğrenme, operatör familiarity, prompt farkı, manual apply hatası ve cloud latency kaydedilmeli. Gate UI görünür olduğu için kullanıcıları koşula kör tutma iddiası yapılmamalı.

SUS usability'dir; trust ölçeği değildir. “Güven arttı” için uygun ayrı ölçek veya açıkça exploratory kısa soru gerekir. Öğrenme outcome'u için pre/post ve kontrol tasarımı gerekir; öğrencinin ürünü kullanması tek başına öğretici etkisini kanıtlamaz. Etik/onam süreci katılımcı toplandıktan sonra başlatılmamalı; kurum kararını danışman teyit etmeli. Gönüllülük, notlardan bağımsızlık, withdrawal, bulut data aktarımı, ekran/ses tercihleri, süre/access/silme kaydı hazırlanmalı. Hukuki/etik kurul gerekliliği bu review ile belirlenmiş sayılmaz.

Maliyet en az task×condition×repeat×model×tur matrisiyle görünür olmalı. 20×3×3=180 koşu; iki modelle 360; revizyon/verifier bunu büyütür. Önce tek model; ikinci model ve full-context ablation kaynak bulunursa. Bulut güncellemesi sırasında model adı aynı görünse bile exact snapshot/date/provider request ID kaydedilmeli; temperature 0 determinism garantisi diye yazılmamalı.

## 5. Tez iddialarının sınırı ve güncel kaynak kontrolü

`THESIS_OUTLINE.md:12`'deki 1–2 saat kayıp/23 dakika ve ürün planındaki $50.000+ maliyet, geliştirici/IDE bağlamına özgü doğrulanmış veri olarak sunulmamalı. Bu review bunlara birincil çalışma doğrulaması yapmadı; slaytta sayılar kaldırılmalı veya doğrudan incelenmiş bağlamı/tarihiyle kaynaklandırılmalı. “Mevcut araçlar güvenliği geride bırakır”, “bu ölçülebilir akademik çalışma yok” ve “plan approval yenidir” de systematic literature incelemesi olmadan hypothesis/motivation olarak sınırlanmalı.

VDD belgesinin “TDD artık yeterli değil” cümlesi geniş literatür iddiasıdır. TDD test oracle'ının bilinçli şekilde hatalı olduğu veya tüm AI tests'in hatalı olduğu ileri sürülmez. Daha dar savunulabilir gerekçe: aynı süreçten gelen kod ve testler ortak yanlış varsayımları paylaşabilir; bağımsız requirement-derived evidence ile bu risk incelenebilir. Verification/validation, traceability, design-by-contract, independent testing, HITL, spec-driven süreçler ve spiral model literatürüyle fark anlatılmalı; VDD adının varlığı yenilik kanıtı değildir.

`EVALUATION_PLAN.md` §5'teki 2025 leaderboard sayıları tarihi, model+scaffold+dataset/split/run budget ayrılmadan sunulmamalı. Bu not leaderboard yarışı yapmıyor; araştırma yöntemini uyumlandırıyor.

SWE-bench Lite orijinal Python repo'larından 300 görevlik alt kümedir ve gold patch'inde birden fazla dosya değişen vakaları filtreler. Bu nedenle TypeScript'teki çok dosyalı review iddiasının doğrudan dış doğrulaması değildir; beş görev yalnız örnek olay eki olabilir. “Kolay-orta” veya “contamination yok” şeklinde genel garanti verilmez. [SWE-bench Lite birincil açıklaması](https://www.swebench.com/lite.html).

SWE-bench'in resmi değerlendirmesi patch'i uygulayıp test ortamında sonuç değerlendirir; Docker gereksinimi ve run ID cache davranışı dış harness planında dikkate alınmalı. Bu, IDE MVP'sine shell tool'u eklemeyi gerektirmez. [SWE-bench resmi FAQ](https://www.swebench.com/SWE-bench/faq/).

23 Şubat 2026 tarihli OpenAI araştırma yazısı SWE-bench Verified için test geçerliliği ve training contamination sorunlarını bildiriyor. Bu, kaynaklı benchmark kullanmanın tek başına güvenilir oracle/temsililik sağlamadığını gösterir; otomatik olarak SWE-bench Pro'nun bu öğrenci projesine uygun olduğu sonucu çıkarılmaz. [Birincil araştırma yazısı](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/).

ColBench bağlantısı kavramsal olarak uygundur: SWEET-RL makalesi çok turlu human-agent backend/frontend iş birliği görevlerini tanımlar. Bu, plan/gate/rollback'in özgül etkisini ölçtüğü anlamına gelmez. HumanEval fonksiyon/docstring sentezinin işlevsel doğruluğunu ölçer; repo review veya kullanıcı güvenine doğrudan oracle değildir. [SWEET-RL/ColBench makalesi](https://arxiv.org/abs/2503.15478), [HumanEval birincil makalesi](https://arxiv.org/abs/2107.03374).

Tez planındaki bölüm aralıklarının toplamı **66–81**'dir (8–10 + 12–15 + 15–18 + 12–15 + 15–18 + 4–5); toplam tutarlı. Sayfa sayısı akademik başarı metriği değildir; üniversite formatı ve danışman beklentisi belirleyici olmalı. Genel Transformer/LLM girişleri sınırlanıp ana soruyla ilgili evidence/oracle/review çalışmaları derinleştirilmelidir.

## 6. Takvim ve milestone değerlendirmesi

Mevcut `PROJECT_ROADMAP.md` beş engineering fazıyla 18 ay anlatıyor. GitHub snapshot'ında Implementation Readiness, MVP, Evaluation & Thesis şeklinde üç milestone var; hepsinde due_on null ve closed_issues 0. Bunlar bire bir ay fazları değildir; crosswalk yapılabilir. Sırf snapshot Mayıs'ta yaratıldı diye resmi proje Ay 1'in Mayıs olduğunu veya Ekim'de 18 ayın yeniden başladığını varsaymak hatadır. Resmi başlangıç/teslim ve geçen çalışma süresi yarın teyit edilmeli; gecikme varsa kalan süreye göre scope azaltılmalı.

Roadmap güvenlik fonksiyonlarını geç bırakıyor: Faz 1 “güvenlik kodu yok” diyor; readiness ilk slice protected/workspace check istiyor. Editor read-only denemesi dışında workspace dosya API'sinden önce koruma pure-function testleri gelmeli. Güvenlik yalnız Ay 11–15'te yapılan eklenti değildir.

Benchmark görev tasarımı Faz 4 H12–14'e bırakılmış; implementasyonun sonlarına denk geliyor. Bu oracle ve araştırma tasarımının ürüne sonradan uydurulmasına yol açabilir. İlk beş pilot örnek Ay 1–3, protokol/log tasarımı Ay 4–6, görev freeze Ay 11–12, main runs Ay 13–15 daha savunulabilir. Prototype ilk küçük milestone'da AI'sız olabilir; araştırma hazırlığı beklememeli.

Çok dosyalı refactor desteğinin Faz 4'e bırakılması ana RQ için risklidir. Tüm refactor UX'i erken şart değil, fakat çok dosya apply/rollback başarısızlık spike'ı Faz 3'te gerekir. Bu başarısızsa 18 ayın son dörtte birinde öğrenilmiş olmaz. Tez Giriş/Literatür/Yöntem Ay 1'den draft olarak birikir; bütün yazım Ay 16'da başlamaz. Son 3 ayda yeni verifier/model/user-mode eklenmez; tez revizyonu ve ölçüm tekrarları için buffer gerekir.

`CRITICAL_ANALYSIS.md` hâlâ eski 2 yıl, 10 görev, multi-agent, command parameterization anlatıları taşıyor; bazı riskler tarihsel eleştiri olarak doğru olsa da “mevcut scope” diye sunulmamalı. §8 süreleri 3 + 3 + 4 + 3 = 13 ay ediyor;18 ayın 5 aylık farkı buffer olarak mı planlı açıklanmalı. Güncel roadmap 18 ayla tutarlılığı ve history/current ayrımı root review'da tamamlanmalı.

Risk register B planları bazı ana iddiaları düşürüyor: R6 rollback'i çıkarırsa rollback-aware VDD ve güvenli multi-file teslim revize edilmelidir; R7 read-only fallback güvenlik açısından iyi ama approval-gated write araştırmasını tamamlamaz. R8 “SWE-bench mini” tanımsız ve dil/çokdosya uyumu kontrolü gerektirir. B planı ürün küçültme yanında “hangi RQ/claim düşer, hangi gate bloke olur” göstermeli.

## 7. Yarın konuşulması önerilenler ve somut ilk çıktı

1. **10 dakika — Odak:** Öğrencinin VDD ana yönelimi, hangi birincil deney değişkeni, hedef öğrenci/jüri gösterimi mi, learning outcome gerekiyor mu?
2. **10 dakika — Katkı ve scope:** IDE ölçüm zemini; testler gerekli ama yeterli kanıt değil; shell yok; verifier ayrılığı araştırma gereği mi future work mü?
3. **15 dakika — Yöntem:** 20 görev+bağımsız oracle, A/C workflow vs B/C gate/review, Q&A ayrı, gerçek review operatörü, blinded output scoring, başarısız sonucun tezde geçerliliği.
4. **10 dakika — Takvim ve kaynak:** Resmi 18 ayın başlangıç/teslimi, haftalık capacity, tek model first, budget/rater/etik-pilot erişimi ve milestone crosswalk.
5. **10 dakika — İlk sprint ve teslim:** Workspace/editor shell + pure safety checks; parallel olarak 5 pilot task/manifest ve requirement→evidence matrisi. Sonraki toplantıda çalışan shell ve bir görev oracle/log örneği.
6. **5 dakika — Karar kaydı:** Seçilen RQ, approved/deferred scope, oracle/rater sorumlusu, next deliverable, next meeting ve açık kararların deadline'ı.

Slide için sonuç grafiği kullanılmamalı: henüz deney yok. 20 görev dağılımı, A/B/C compare matrix, proposal lifecycle ve göreli 18 ay roadmap kullanılabilir. ≥%60/0/≤%20 sayıları “önerilen hedef; danışman onayı bekliyor” etiketi taşımalı. “VDD kanıtlandı”, “TDD öldü”, “rakiplerden daha güvenli”, “ihlal riskini sıfırlar” kullanılmamalı.

## 8. Hâlâ gerçek olarak tamamlanmamış işler

- Danışman odak/protokol onayı ve gerçek ön kayıt/tag.
- Final 20 görev JSON'u, bağımsız oracle ve fixture lisans/source seçimi.
- Run manifest schema/runner, dış A logger ve veri saklama ayarları.
- Uygulama, safety paketinin gerçekten koşulması, measured results.
- Gerçek rater/participant temini, kurum etik kararı ve onam formu.
- Resmi milestone due date, start/end ve capacity-onaylı calendar takvimi.

Bu eksikler belgede görünür hale getirildi; tamamlanmış deney veya kabul edilmiş karar olarak kapatılmamalıdır.

## 9. Tamamlanan belge değişiklikleri ve kontrol

- `EVALUATION_PLAN.md`: A/C ve B/C çıkarım sınırı, eşit mandatory safety, bağımsız oracle, Recall@5,
  review/payda/rollback ayrımları, paired analiz, dış test koşumu ve insan onam sınırları eklendi.
- `docs/benchmark/README.md`: kanonik 20 görev ve 16 yazma / 4 Q&A; pilot, dış run logger ve evidence alanları.
- `docs/adr/ADR-007-ablation-baseline-design.md`: accepted çekirdek korunarak proposed yöntem açıklığı eklendi.
- `docs/EVALUATION_PROTOCOL.md`: ayrıntılı, danışman onayı bekleyen yöntem/karar/kanıt taslağı oluşturuldu.
- `scripts/validate-doc-links.ps1`: inceleme sırasında 73 Markdown dosyasında geçti. Bu deney veya runtime testi değildir.
- GitHub'a bu alt incelemede yazılmadı; milestone tarihlerine müdahale edilmedi.
