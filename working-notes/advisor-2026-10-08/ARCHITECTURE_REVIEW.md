# 8 Ekim 2026 Danışman Toplantısı — Mimari İncelemesi

**İnceleme tarihi:** 7 Ekim 2026. **Kapsam:** Yerel çalışma ağacındaki mimari, safety/privacy,
ADR, şema, diagram ve uygulama hazırlık belgeleri. GitHub durumu başka inceleme çıktısında değerlendirilir.

## Değerlendirme

Projenin kapsam tercihi savunulabilir: Electron + Monaco, tek ajan döngüsü, kullanıcı model seçimi,
diff/onay, workspace boundary, rollback ve 20 görevlik araştırma prototipi. Ancak güvenli apply'ın
çalışma zamanı sözleşmesi henüz yeterli değildi. Bu incelemede [CHANGE_LIFECYCLE_CONTRACT](../../docs/CHANGE_LIFECYCLE_CONTRACT.md)
eklendi; onayın patch'e bağlanması, stale dosyalar, transaction/recovery, rollback ve evidence kimliği
için somut teklif getiriyor. Kod uygulanmadı; accepted ADR'ler değiştirilmedi.

Repo'da uygulama `package.json`, Electron kaynakları veya uygulama testleri bulunmuyor. ADR'deki
“Accepted”, belgesel kararın durumudur; “uygulandı”, “güvenli çalışıyor” veya “benchmark sonucu” anlamına gelmez.
Sunumda bu üç düzey ayrı gösterilmelidir: **seçildi / öneriliyor / uygulanıp ölçüldü**.

## Kritik bulgular ve tamamlanan sözleşme

| ID / Öncelik | Kaynak | Somut boşluk veya çelişki | Düzeltme / kalan iş |
|---|---|---|---|
| ARCH-01 / P0 | `SYSTEM_PLAN` §9–10; `SAFETY_AND_GUARDRAILS` §2.4; UC-02 | Temp dosya + rename tek hedefin replace'ini anlatıyor; çok dosyalı refactor için bütün setin atomikliği veya ikinci dosyada hata/crash recovery tanımlı değil. | Yeni sözleşme §6–7 journal, before/after hash, all-set recovery ve sınırları tanımlıyor. Uygulama/test kartları gerekir. |
| ARCH-02 / P0 | `plan.schema.json` satır7, 70; `SYSTEM_PLAN` §10 | PlanId, dosya listesi ve approval boolean var; gösterilen patch/base içerikle karar bağı yok. Preview–apply arası kullanıcı veya model değişikliği onaylıymış gibi yazılabilir. | Yeni sözleşme §3–5 patch fingerprint, plan revision, exact byte hash ve stale onay kuralları getiriyor; şema uzantısı bekliyor. |
| ARCH-03 / P0 | ADR-001 Consequences; `TECH_STACK_AND_AI` §1, 4; `IMPLEMENTATION_READINESS` First Slice | Renderer/main ayrımına dikkat deniyor; preload/IPC API sınırı, sender/input doğrulama, key ve filesystem sahibi somut değil. | Yeni sözleşme §1 broker sınırını ve ilk shell kontrolünü tanımlıyor; Electron spike'ı ve kaynak incelemesi gerekli. |
| ARCH-04 / P0 | `AGENT_ARCHITECTURE_ANALYSIS` §6; `SYSTEM_PLAN` §7; UC-02 | Eski rol diyagramında “EXECUTE: write_file” ve yapılan değişikliği review etme, diff/onaydan önce görünüyor; diğer akış onayı yazmadan önce istiyor. | Yeni sözleşme `write_file = staging/proposal`, `apply = broker` ayrımını sabitliyor. Eski rol diyagramı bir sonraki temizleme PR'ında uyarlanmalı. |
| ARCH-05 / P0 | `SAFETY_AND_GUARDRAILS` §2.1, 2.2; `config.schema.json` satır47–48 | `path.resolve + prefix check` ifadesi path segment/canonical/create ebeveyni kurallarını anlatmıyor; config `respectAgentIgnore: false` ve boş exclude listesi kabul ediyor, oysa zorunlu filtre daraltılamaz. | Sözleşme §2, 6 filtreyi bütün data yollarına ve broker'a bağlıyor. Runtime politika sabit minimum + kullanıcı ekleri olarak tanımlanmalı; config şeması tek başına güvenlik sınırı değil. |
| ARCH-06 / P0 | `SAFETY_AND_GUARDRAILS` §2.5; `audit-event.schema.json` satır7–37; ADR-009 | İnceleme başlangıcında Safety örneği snake_case/action/model string kullanıyordu; şema camelCase/eventType/model object istiyordu. Normal runId davranışı da uyuşmuyordu. | **Belge örneği düzeltildi.** Yeni sözleşme §9 her oturuma runId ve benchmark dışı condition tanımlar. Runtime audit/evidence uygulaması hâlâ bekliyor. |
| ARCH-07 / P0 | ADR-009 Decision; `plan.schema.json` satır32–44; `audit-event.schema.json` satır54–72 | Prompt/policy/model versionları ADR'de must; şemada optional. Verifier actor var, verifier verdict/evidence/requirement correlation ve failure/recovery event'i yok. | Sözleşme §4, 8–9 evidence kimliğini ve gereken eventleri listeliyor. Versioned schema geçişi yapılmadan “izlenebilirlik hazır” denmemeli. |
| ARCH-08 / P0 | ADR-006; `VERIFICATION_DRIVEN_DEVELOPMENT` Evidence Matrix / Minimum Evaluation; `TESTING_AND_CI` | VDD test/static evidence istiyor ama agent test komutu çalıştıramaz. Harici testin hangi patch'i ölçtüğü ve `not-run` durumu belirtilmezse yanlış doğrulama iddiası doğar. | Sözleşme §8 ürünün no-shell sınırını korur; manual/external harness evidence, artifact fingerprint ve stale evidence kuralını tanımlar. |
| ARCH-09 / P1 | `SYSTEM_PLAN` §10; UC-02 ApplySelected | Çok dosyalı refactor'un yalnızca bir kısmını uygulamak import/type bağımlılığını bozabilir. Seçilmiş setin yeniden kontrol/onay kuralı eksik. | Sözleşme §5 bunu tamamlar; ilk dilimde all-set approval önerisi backlog/danışman kararını bekler. |
| ARCH-10 / P1 | `DATA_AND_PRIVACY` §2, 4; `config.schema.json`; UC-05/06 | İnceleme başlangıcında Ollama baseUrl kısıtsızdı; key plaintext config planıyla apiKeyRef şeması çelişiyordu. | **Belge/şema önerisi tamamlandı:** ADR-010 Proposed; config yalnızca referans, OS credential/encrypted store ve broker; loopback URL/immutable ignore şema kısıtları. 29 schema örneği geçti; runtime storage/network/IPC hâlâ bekliyor. |

Bu bulgular kaynak kodunda keşfedilmiş güvenlik açıkları değildir; uygulama öncesi sözleşme ve kanıt boşluklarıdır.

## İlk toplantıda özellikle çözülmesi gereken çelişkiler

### 1. Tek ajan kararının VDD ile ilişkisi

`AGENT_ARCHITECTURE_ANALYSIS` §7 “1 Agent. Başka seçenek yok” diyor. VDD belgesi ise ayrı implementation ve
verification prompt/model/runtime seçeneklerini Advisor Review olarak açıyor. Bunlar aynı kesinlik düzeyinde sunulmamalı.
Öneri: MVP tek kontrol döngüsü ve deterministik broker ile kalsın; verifier rolü ilk etapta evidence/review sorumluluğu
olarak ayrı kaydedilsin. Ayrı agent/runtime veya model çağrısı ancak ayrı deney sorusu ve zaman bütçesiyle karara bağlansın.

Tek ajan seçimi LLM çıktısını deterministik yapmaz. Eski analiz §1 ve §5'teki “aynı input → aynı trace” ifadeleri
garanti olarak kullanılamaz. Deterministik olan sınır/izin/transaction kodu ve replay edilebilir kayıt düzeni olmalıdır;
model cevabı için sürüm/ayar ve tekrar koşulları kaydedilir.

### 2. Roadmap'te safety-first sırası

`SYSTEM_PLAN` §14 Ay1–3 “güvenlik kodu yok” diyor; `IMPLEMENTATION_READINESS` ilk dilimde workspace/protected-file
kontrollerini istiyor. Retrieval erken dönemde kod okurken privacy filtreleri zaten gerekir. Önce shell + boundary +
gizlilik + broker; ardından read-only retrieval/chat; sonra staged diff/onay; sonrasında write/recovery/rollback önerilir.
İlk toplantı bunun kabulünü ve ilk somut demo teslimini belirlemeli. 18 ayın başlangıç tarihi ayrıca açıklanmalı.

### 3. Araştırmanın baseline'ı ve iddia sınırı

`SYSTEM_PLAN` §12 baseline olarak araçsız geliştirici yazıyor; ADR-007 A=direct LLM, B=gate disabled, C=full flow diyor.
Sunum tek kanonik A/B/C tanımını kullanmalı. B/C aynı sistemde yalnızca gate farkıysa bir gate ablation'ıdır; A/C karşılaştırması
retrieval, UI, tool ve approval dahil paket etkisidir. “Approval görev doğruluğunu tek başına artırdı” sonucu bu tasarımdan
otomatik çıkmaz. VDD verifier etkisi ayrı deney tasarımı olmadan iddia edilmemeli.

Soru: Tezin birincil katkısı approval/diff workflow mu, bağımsız verifier mı, VDD süreç modeli mi? İlk toplantıda birini
birincil, diğerlerini destekleyici/gelecek çalışma seçmek kapsamı korur.

### 4. Güvenlik iddiası ve standart referansı

`SAFETY_AND_GUARDRAILS` §4 inceleme başlangıcında 2025 OWASP dediği halde eski kodları kullanıyordu. 2025 karşılıkları LLM02 Sensitive Information
Disclosure, LLM05 Improper Output Handling ve LLM06 Excessive Agency'dir; LLM08 ise Vector and Embedding Weaknesses.
[Resmî OWASP listesi](https://genai.owasp.org/llm-top-10/) bunu doğruluyor. **Kodlar ve durum etiketleri düzeltildi**;
“Covered” yerine “Planlandı; test bekliyor” yazıldı. Diff/onay, bütün output handling risklerinin kapatıldığı anlamına gelmez.

`DATA_AND_PRIVACY` §2 “KVKK/GDPR otomatik” ve §3 yeşil uyumluluk etiketleri bir prototype planından kanıtlanmış sonuç
olarak sunulamaz. Model seçimi, veri akışı kontrolü ve hukuki uygunluk farklı konulardır. Sunum teknik veri minimizasyonu
ve açık provider seçimi vaat etmeli; hukuki durum “değerlendirme gerekli” kalmalı. Gizli dosya filtresi, sırları içeren
normal `.ts` dosyası veya kullanıcı chat'i için tam DLP garantisi değildir.

## Sonraki sprint için daraltılmış teknik eksikler

| Alan | Hazır olan | Eksik sözleşme / somut çıkış |
|---|---|---|
| Provider | ADR-005 boundary; `chat`, `ping`, maxTokens önerisi | `AbortSignal`, streaming tool fragment→validated final message, usage/end/error normalization, retry budget ve provider capability matrisi. Yarım stream apply edilemez. |
| Retrieval | ADR-003 local SQLite + sqlite-vec aday; nomic embedding planı | Source hash/version, chunk/citation line aralığı, index freshness/invalidation, `.agentignore` değişince silme, parsing/token bütçesi ve modeli olmayan makinede fallback. |
| Onboarding | Manuel model seçimi ve availability UC'leri | Cloud-only uygulamada local embedding kurulumu gerekip gerekmediği; model download/availability, donanım ve privacy profile netliği. |
| Secret storage | File-based MVP kararı; apiKeyRef şeması | Tek canonical storage şekli, Windows ACL veya OS-backed store, export/log exclusion ve clear-key behavior. Electron `safeStorage` seçeneği değerlendirmeye açık; Linux backend fallback ve platform sınırları ölçülmeli. |
| Evidence | Plan/audit/benchmark JSON şemaları | Requirement→plan→patch→approval→apply→rollback/test lineage; schema version ve valid fixtures; failed/cancelled runs da export'ta görünür. |
| Recovery | 10 set undo hedefi | Snapshot/journal retention, disk-full/permission/crash, büyük snapshot bütçesi ve kullanıcı değişikliğinde conflict. |

Electron `safeStorage`, Windows'ta DPAPI kullanır; aynı kullanıcı bağlamındaki bütün uygulamalara karşı tam izolasyon
garantisi vermez. Linux'ta `basic_text` backend'i korumasız olabilir. Bu nedenle “keychain kullandım, sır güvende” yerine
platform davranışı acceptance criterion yapılmalıdır. [Resmî safeStorage belgesi](https://www.electronjs.org/docs/latest/api/safe-storage).

## Maliyet ve mimari karşılaştırma düzeltmeleri

- `COST_AND_PERFORMANCE` §1.1 tablosu “2025 güncel”dir; 7 Ekim 2026 güncel fiyatı gibi gösterilmemeli. Model ID, fiyat
  tarihi ve provider kaynağı ile yeniden doğrulanmalı. Görev maliyeti toplam input+output+retry'ı içerir.
- §1.3 toplam token'dan aylık ücret çıkarıyor ama input/output ayrımı yok. §1.2 orta görev tahminlerine göre ayda
  20–30×30 = 600–900 görev, yaklaşık $0.10/görev kabulüyle $60–90 olur; tabloda $6–12 yazıyor. Kullanım varsayımları
  tutarsızdır. Bu hesap örnektir; gerçek fiyat/ölçüm değildir.
- §1.4 “%83 tasarruf” yalnızca verilen varsayımların oranıdır; retrieval kalitesi veya toplam görev maliyeti için
  deneysel bulgu değildir. Output token ve tekrarlar hesaba katılmadan toplam harcama azalması iddia edilmemeli.
- `ARCHITECTURE_OPTIONS` §2 puan matrisi kendi ağırlıklarıyla Electron=8.55, Tauri=6.85, Web=7.05 üretir; yazılı toplamlar
  8.3/6.2/7.0. VS Code Monaco satırındaki N/A için normalizasyon tanımı yok. Puanlar karar desteği varsayımıdır,
  literatür veya benchmark sonucu değildir. “Bağımsız ürün daha akademik” tek başına eklentiyi elemek için güçlü gerekçe olmaz.

## Toplantıda talep edilecek karar çıktıları

1. Birincil RQ ve katkı sınırı: approval workflow birincil; VDD destekleyici framing mi?
2. MVP mimarisi: tek agent loop + deterministik broker; verifier yalnızca rol mü, ayrı çağrı mı?
3. No-shell sınırı: manual/external harness evidence tez değerlendirmesi için yeterli mi?
4. A/B/C: gate ablation ve full-workflow karşılaştırması ayrı yorumlanacak mı? B kontrollü fixture ile sınırlı mı?
5. İlk teslim: güvenli Electron/Monaco shell + read-only context; ardından tek dosya staged diff/onay/apply/recovery.
6. İlk çok dosya diliminde all-set approval; selected apply bağımlılık desteğinden sonra mı?
7. Kabul edilen süre, gerçek başlangıç tarihi, danışman kontrol sıklığı ve her milestone'daki somut kanıt artefaktı.

Toplantıda regex, undo sayısı ve tek tek model markaları ana gündemi tüketmemeli. Akademik soru, scope, evaluation ve
ilk deliverable karara bağlandıktan sonra bu uygulama ayrıntıları issue acceptance criteria'ya dönüştürülebilir.

## Doğrulama sınırı

Bu inceleme mevcut çalışma ağacını okudu; önceden değiştirilmiş root belgeleri yeniden yazmadı. Yeni lifecycle belgesi,
bilinmeyen bir implementation davranışını olmuş gibi anlatmaz. Acceptance senaryoları planlanan kontrollerdir;
application test, güvenlik garantisi, kullanıcı çalışma sonucu veya güncel fiyat doğrulaması değildir.

Temiz olan `SAFETY_AND_GUARDRAILS.md` üzerinde yalnızca audit örneği/normal oturum metni ve OWASP eşleştirme/durum
etiketleri hedefli düzeltildi. Accepted ADR'ler değiştirilmedi. Ek tamamlamada config planning şeması ADR-010 Proposed
ile uyumlu daraltıldı; secret storage/privacy belgeleri ve UC-05/06 referans akışı güncellendi.
[Şema doğrulama kaydı](CONFIG_SCHEMA_VALIDATION.md) 29 kabul/ret örneğini ve audit JSON için tam format doğrulamasını içerir.
