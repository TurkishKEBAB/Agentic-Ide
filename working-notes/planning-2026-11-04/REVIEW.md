# Planlama kapanışı ve uygulama devri

Tarih: 4 Kasım 2026. Kullanıcı, daha önce danışman görüşmesi yapılmadığını ve ilk görüşmenin 5 Kasım'da olacağını bildirdi.
Akademik onay, teslim tarihi veya çalışma sonucu uydurulmadı. Önceki #119 PR'ı main'e birleşmişti; bu inceleme onun
üzerine kurulmuştur. Orijinal çalışma klasöründeki yerel değişiklikler korunarak ayrı worktree kullanıldı.

## Sonuç ve kapsam

Teknik plan [uygulama baz çizgisinde](../../docs/IMPLEMENTATION_BASELINE.md) tekleştirildi. Sabit ürün sınırı,
runtime/IPC/provider yetkisi, hata/timeout/cancel bütçeleri, exact-patch onayı, recovery/rollback, yerel veri tutma,
araştırma sınırları ve S0–S6 teslim sırası uygulamaya devredilebilir biçimdedir. S1 güvenli shell ve saf workspace
policy işlerine başlamak, formal benchmark veya akademik isim kararına bağlı değildir.

İncelenenler: 95 issue'nun tamamı, body/yorum, 78 native parent ve 193 upstream başlangıç ilişkisi, 18 Project view,
32 mevcut alan, üç milestone, bütün ana planlar, ADR'ler, schema/CI, gizlilik ve deployment belgeleri.
Başlangıçta 95 issue açık, 60 Backlog/35 Review ve sıfır Ready idi; tamamlanmış dokümanlar da açıktı.

## Giderilen boşluklar

- Planlama çıktısı, gerçek uygulama ve dış danışman kararı ayrıldı; Ready yalnız explicit DoR ve tamamlanan upstream ile verilir.
- 23 doküman/kontrat işi için completion evidence tanımlandı. S0 Done, çalışan uygulama veya advisor approval değildir.
- Partial approval/transaction sırası, context öncesi privacy, model adapter öncesi onboarding ve formal freeze bağımlılıkları düzeltildi.
- Ayrı model verifier ve öğrenci/profesyonel ürün modları MVP kapsamından ayrıldı. Traceability ve broker/human/external-oracle rolleri korundu.
- Bekleyen v2 alan/event sözleşmeleri tamamlandı: plan, patch, approval, transaction, evidence ve audit; ayrıca benchmark-run sonucu.
- 13 toplam şema, 7 sentetik record, 48 ret senaryosu, 5 pilot task ve requirement DAG/metadata CI doğrulaması sağlandı.
- Pilot fixture özgün/sentetiktir; final 20 görev için TASK_CATALOG hazırlanmıştır. Nihai fixture/oracle/data freeze gerçek araştırma kapısıdır.
- Model/spec/fiyat tablolarındaki dayanağı olmayan garantiler kaldırıldı; library/native sürüm kilitleme scaffold uyumluluk işidir.
- local-only varsayılanı, OS-backed credential referansı, ayrı audit/index/key clear ve recovery koruması netleştirildi.
- Uygulama manifesti mevcutken eksik required npm script'inin sessiz geçmesine yol açan CI boşluğu kapatıldı.
- Issue başlık değişiminin duplicate yaratması engellendi. Normal metadata sync canlı Status/Readiness'i korur.
- User-owned REST view endpoint varsayımı yerine desteklenen GraphQL view update kullanılır; kişisel görünüm korunur.
- Gerçek tez takvimi bilinmediği için boş tarihli roadmap yerine Delivery Order slice görünümü kullanılır.

## Canonical GitHub kapanış hedefi

Bu bölüm uygulanacak ve read-back ile doğrulanacak canonical durumu tanımlar:

| Durum | Adet | Anlam |
|-------|-----:|-------|
| Done | 23 | Birleşmiş doküman/kontrat ve validation kanıtı |
| Ready | 2 | #33 safe shell, #49 pure workspace policy |
| Review | 6 | #20, #25, #54, #66, #71, #113 gerçek danışman/araştırma kararları |
| Deferred | 1 | #70 ayrı öğrenci/profesyonel modları |
| Backlog | 63 | Henüz uygulanmamış ürün, araştırma ve teslim işleri/epic'ler |

Toplam 95; yeni issue açılması gerekmiyor. Native dependency hedefi 198 (26 eski link kaldırılır, 31 gerekli link
eklenir); parent sayısı 78 olarak kalır, #113 karar epic'ine taşınır. Tüm kartlarda source, acceptance, owner role,
workstream, slice, risk, test ve evidence vardır. Yalnız ilk iki Ready iş repo sahibine atanır; danışman hesabı uydurulmaz.
Üç milestone teknik doküman / S1–S4 ürün / S5–S6 araştırma-teslim kapsamına hizalanır; gerçek due date henüz yoktur.

## Danışmanla açık kalması gerekenler

1. #20/#66: akademik ad, dar VDD çerçevesi ve birincil soru/hipotez.
2. #54/#25: B/C onay bileşeni, 20 görev, dış oracle/rater, nihai bütçe ve veri öncesi onay/freeze.
3. #113: insan çalışması gerekli mi; gerekiyorsa kurumsal izin/onam, retention ve katılımcı planı.
4. #71: gerçek başlangıç/teslim/savunma tarihi, haftalık kapasite, görüşme sıklığı ve ilk iki hafta taahhüdü.

Bu konular teknik tasarım eksiği gibi görünmez; ayrı Review/gate'tir. Karar gelene kadar katılımcı yok, güven/öğrenme
sonucu yok, formal veri yok. Güvenli S1 read-only foundation başlayabilir. Olumsuz bulgu tezin başarısızlığı sayılmaz.

## Doğrulama ve çalışma alanı

`scripts/validate-planning-contracts.py`: gerçek Draft202012Validator ve format checker; path testleri fingerprint'ten
bağımsız da çalışır. `scripts/test-planning-sync.ps1`: 10 identity/workflow/evidence regresyon kontrolü; mock dışında
network çalıştırmaz. Governance, link, PlantUML ve diff kontrolleri yayın öncesi çalıştırılır. Bunlar uygulamanın runtime
doğruluğunu kanıtlamaz. Final canlı karşılaştırma özeti yerel `after-verification.json` dosyasına kaydedilir.

Ham before snapshot'ları ve tek-seferlik prepare/apply yardımcıları yerel inceleme klasöründedir; repo'ya büyük ham
çıktılar veya geçmiş kişisel görüşme mektuplarının kopyaları yayımlanmaz. Kapanış commit'i/PR ve Project read-back
gerçek kaynak kaydıdır. `PROJECT_REVIEW_TODO.md` geçmiş liste olarak korunur; güncel açık işler canonical seed'dedir.
