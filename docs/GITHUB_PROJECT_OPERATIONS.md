# GitHub Project işletim sözleşmesi

4 Kasım 2026 baz çizgisi. [Project #8](https://github.com/users/TurkishKEBAB/projects/8) uygulama/tez işini,
[requirements-analysis.json](../github-projects/requirements-analysis.json) kapsam ve başlangıç metadata'sını tutar.
`githubIssueNumber` sabit kimliktir; başlık değişmesi yeni issue açmaz.

## Alanların anlamı

| Alan | Kullanım |
|------|----------|
| Status | Backlog / Ready / In Progress / Review / Done / Deferred günlük iş akışı |
| Requirement Status | Planned teknik kapsam; Advisor Review dış karar; Done tamamlanan ilgili çıktı |
| Readiness | Ready yalnız DoR'u geçen PR-sized iş; Blocked gerçek açık upstream; Validated evidence-backed Done |
| Workstream | Planning / Implementation / Research / Decision / Future |
| Delivery Slice | S0 doküman, S1–S4 ürün, S5 araştırma, S6 teslim; Future kapsam dışı |
| Owner Role | Student / Advisor / Joint; öğrenci işlerine repo sahibi atanır, hoca hesabı uydurulmaz |
| Decision Status | Not Required / Pending Advisor / Recorded / Deferred; yalnız gerçek karar kaydı Recorded olabilir |
| Source / Acceptance / Test / Evidence / Risk | Davranış, authoritative belge, test senaryosu ve üretilecek kanıt |
| Blocked by / Blocking | Native dependency özeti; tamamlanan upstream linki tarihsel iz için kalabilir |
| Target Date | Gerçek tarih bilinirse atanır; 5 Kasım karar kartları görüşme hedefidir, tez teslim tarihi değildir |

Doküman Done, ürünün çalıştığı veya danışmanın onayladığı anlamına gelmez. Epic yalnız aktif çocuklar ve exit
evidence tamamlandığında kapanır. Phase/priority/etiketlerden otomatik Ready sonucu çıkarılmaz.

## Görünümler

Requirements Master kapsamı; Workflow Board aktif işleri; Implementation Queue gerçek Ready işlerini; First Slice
S1'i; Advisor Review Pending Advisor kararlarını gösterir. Blocked Work / Dependency Map, Evidence Matrix,
Planning Complete, Safety & Privacy, Risks, VDD Research, Quality Gates ve By Phase ayrı amaçlar taşır.
Delivery Order tarih uydurmadan slice/phase sırasını gösterir; akademik takvim gelince dated roadmap kurulabilir.
Kişisel TODO-Yigit görünümü korunur. Eski Detailed kopyaları First Slice / Blocked Work olarak yeniden kullanılır.

GraphQL ile name/filter/layout/visible fields güncellenir ve tekrar okunur. Mevcut group/sort korunur;
API'nın desteklemediği düzen ayarlanmış gibi raporlanmaz. User-owned REST view endpoint'i çalışıyor varsayılmaz.

## Senkronizasyon ve ritim

Normal sync mevcut Status/Readiness'i korur. `-SyncWorkflowStatus`, canonical workflow/readiness incelendikten
sonra kullanılacak kasıtlı reset'tir. Önce `-DryRun`, sonra gerekiyorsa bilinçli sync kullanılır.
Stable issue ID, source/test/evidence ve native bağımlılıklar birlikte güncellenir; title üzerinden duplicate açılmaz.

Ready'den tek küçük iş seç, In Progress yap, acceptance/test/evidence üret, PR'da review et, merge'den sonra Done
ve canonical evidence'i güncelle. S5 gerçek danışman kararı ve pre-data freeze gerektirir. İlk görüşme 5 Kasım 2026;
başlangıç/teslim/haftalık kapasite kararı bekler. Preparing-baseline araçları tekrar çalıştırılıp canlı ilerleme sıfırlanmaz.
