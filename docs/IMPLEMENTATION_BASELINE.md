# Uygulama baz çizgisi 1.0

Tarih: 4 Kasım 2026. Durum: öğrenci/repo teknik planı; danışman onayı ve çalışan uygulama anlamına gelmez.
İlk danışman görüşmesi 5 Kasım 2026'dadır. 8 Ekim paketindeki toplantı ve onay beklentileri tarihsel hazırlıktır.

Bu belge uygulama kapsamı, bileşen sınırları ve teslim sırası için bağlayıcı teknik baz çizgidir.
[PRODUCT_PLAN](../PRODUCT_PLAN.md) kullanıcı ihtiyacını, [yaşam döngüsü](CHANGE_LIFECYCLE_CONTRACT.md)
değişiklik protokolünü, [değerlendirme protokolü](EVALUATION_PROTOCOL.md) deney yöntemini ayrıntılandırır.
Eski seçenek/araştırma notları bu belgede seçilen mühendislik kapsamını genişletmez.

## 1. Kabiliyet

Üst sınıf bilgisayar mühendisliği öğrencisi / junior geliştirici, seçtiği TypeScript workspace'inde AI'dan açıklama
veya kod değişikliği ister. Kaynakları, planı ve kesin diff'i inceler; izin verdiği değişiklik kontrollü uygulanır,
kanıtı kaydedilir ve çakışma yoksa son 10 değişiklik setinden geri alınabilir.

Akademik teklif: VDD gereksinim–kanıt–karar izini adlandıran dar proje çerçevesi, approval-gate karşılaştırılabilir
bileşen, Agentic IDE ölçüm prototipidir. Akademik ad ve birincil hipotez #20/#66'da danışman incelemesinde kalır.
İnsan güveni/öğrenme etkisi ana teknik benchmark sonucu değildir. Olumsuz sonuç da geçerli tez bulgusudur.

## 2. Sabit teknik kapsam

| Alan | Baz çizgi | Kapsam sınırı |
|------|-----------|--------------|
| Platform | Windows üzerinde ilk demo; Electron + Monaco + TypeScript; Node 24 geliştirme runtime'ı | Electron'un gömülü Node sürümü ayrıdır; diğer OS'lar ölçülmeden destekli sayılmaz. |
| Build | electron-vite, npm ve tek package-lock; vanilla TypeScript renderer | Eski tsup/esbuild seçenekleri aktif alternatif değildir; sürümler scaffold PR'ında kilitlenir. |
| Dil/dosyalar | TypeScript/JavaScript, UTF-8 düz metin; en fazla 5 açık sekme | Binary, encoding dönüştürme, delete/rename/link oluşturma MVP dışında. |
| Değişiklik | İlk dilimde modify; kontrollü create sonraki dilimde; son ürün dependency-aware partial approval | Bağlı dosya grubu bölünemez; bağımsız grup seçimi yeni diff ve onay doğurur. |
| Ajan | Tek kullanıcı tetiklemeli orchestration loop | Ayrı model verifier, autonomous swarm, proaktif görev başlatma ve MCP entegrasyonu gelecek çalışma. |
| Verification | Deterministik policy/schema kontrolleri + insan review + dış harness evidence | Bir LLM'in kendi testleri veya ikinci prompt'u bağımsız oracle değildir. |
| Model | Bir Anthropic adaptörü, bir loopback Ollama adaptörü; manuel seçim; yeni kurulum local-only | İndirme/setup dışında local-only run'da dış ağ yok; chat/embedding remote fallback yok. |
| Context | Aktif dosya + TS import/export/semboller + top-5 retrieval; SQLite/sqlite-vec adaptörü | Dosya watcher yalnız indeks yeniler; background AI analizi yapmaz. |
| Güvenlik | Canonical workspace, protected-file union, secret-in-diff, hash'e bağlı onay, kalıcı journal | Shell/terminal/process tool'u yok; workspace policy OS sandbox olarak sunulmaz. |
| Veri | OS-backed secret storage referansı; yerel index/audit/backup; ayrı temizleme kontrolleri | Düz metin key fallback, cloud sync ve gizli içerik içeren thesis export yok. |

electron-vite veya sqlite-vec demo cihazında uyumsuzsa ilgili ADR'nin revisit koşulu uygulanır; gizli alternatif
seçilmez. İlk retrieval dilimi lexical olabilir; vektör fallback'inin kullanıldığı kanıta yazılır ve model deneyleri
farklı retrieval politikalarıyla birleştirilmez. Sağlayıcı model sürümü, fixture ve bütçeler formal koşudan önce kilitlenir.

## 3. Modüller, yetki ve arayüzler

```text
src/renderer/        Monaco, tree, chat, diff, decision ve recovery ekranı
src/preload/         yalnız isimleri sabit typed IPC çağrıları
src/main/workspace/  canonical path, protected policy, file snapshot/buffer uyuşması
src/main/agent/      read/retrieve/plan araçları; patch önerisi; tur/timeout/cancel sınırları
src/main/providers/ Anthropic/Ollama adaptörleri; credential erişimi burada
src/main/context/   TS sembolleri, indeks, privacy filter, retrieval snapshot
src/main/changes/   patch fingerprint, approval, apply journal, recovery, rollback
src/main/evidence/  audit, version manifest, dış evidence import, sanitize export
src/shared/         şemalardan türeyen DTO'lar ve hata kodları
evaluation/         IDE dışı disposable-fixture runner ve scoring
tests/              policy, transaction fault injection, IPC, provider contract, E2E
```

Renderer'a fs, shell, provider key veya generic IPC verilmez. Modelin `write_file` adlı eski aracı gerçek write
yetkisi değil `propose_change` staging davranışıdır. Broker ayrı `applyApprovedPatch` çağrısı yapar.
IPC capability'leri: `chooseWorkspace`, `listFiles`, `readFile`, `saveUserBuffer`, `startRun`, `cancelRun`,
`reviewPatch`, `approvePatch`, `applyApprovedPatch`, `rollbackTransaction`, `clearIndex`, `removeProvider`,
`clearAudit`, `exportEvidence`. Her çağrı sender doğrulaması, DTO validation ve işlem-özel policy kontrolünden geçer.
`saveUserBuffer` insan editör kaydıdır; ajan approval bypass yolu değildir ve aynı workspace/protected policy'yi uygular.

Sağlayıcı kontratı: `stream(messages, tools, budget, signal) -> chunks + normalized usage + finishReason`;
`health(signal) -> availability/capabilities`. Provider hata kodları unauthorized/unavailable/rate-limited/timeout/
cancelled/invalid-output/budget-exhausted olarak normalize edilir. Yarım stream'den tool/patch uygulanmaz.
Üretim modunda en çok 8 model turu, run başına 120 saniye wall-clock bütçesi, transient hatada en çok 2 retry;
iptalde yeni çağrı yapılmaz. Deney bütçesi bunun üzerinde sessizce değiştirilmez; protokol manifesti override'ı kaydeder.

## 4. Veri sözleşmeleri ve invariant'lar

Şema v1 plan/audit/config/task dosyaları geriye dönük tarihsel kayıtlardır. Yeni runtime kayıtları v2 plan/audit,
patch-set, approval, transaction ve evidence şemalarını kullanır: [şema kataloğu](schemas/README.md).
Şemalar yapıyı, validator örnekler/cross-record invariant'ları, runtime broker ise gerçek yetki ve dosya davranışını doğrular.

- Patch set, exact base/proposed bayt hashlerine ve normalize relative path'lere bağlıdır.
- Approval yalnız bir workspace/patch/fingerprint/seçim için geçerlidir; 10 dakika sonra veya içerik/policy değişince iptal olur.
- Create için absent precondition zorunlu; ilk ürün diliminde create disabled capability'dir.
- Partial approval bağımsız dependency group seçer. Seçim değişirse yeniden validation, diff ve approval gerekir.
- Tek workspace write transaction; journal/audit hazırlanamazsa apply yok. Crash recovery bitmeden yeni write yok.
- Rollback yalnız mevcut post-hashler eşleşirse exact before baytlarını getirir; kullanıcı düzenlemesini ezmez.
- Evidence doğru patch/tree fingerprint'ine bağlıdır; `not-run` test sonucu pass sayılmaz.
- Audit'te opaque workspace ID ve relative yollar kullanılır; raw prompt/code/key/backup yazılmaz.

Araştırma B modunda genel insan gate'i yalnız disposable fixture capability'siyle atlanır; normal approval nesnesi
üretilmiş gibi davranılmaz. Mandatory policy, journal, audit ve large-edit uyarısının davranışı B/C'de aynı kalır.
Normal ürün config'i B modunu açamaz. Ana 16 yazma görevi large-edit sınırının altında hazırlanır; büyük değişiklik
ayrı adversarial pakette raporlanır. Q&A için approval/apply/rollback N/A'dır.

## 5. İşlevsel olmayan bütçeler ve veri yönetimi

- Tek run ve tek active transaction/workspace; SQLite yazmaları serialize edilir. Renderer ağır indeks işini yapmaz.
- Açılış hedefi ≤5 saniye, ~100 dosyalı fixture ilk indeks hedefi ≤30 saniye; cihaz/OS/model/durum ölçümle kaydedilir.
  Bunlar uygulama öncesi bütçedir, sonuç değildir. Retry/index iptali UI'ı kilitlemez.
- Context bütçesi başlangıçta 8.000 input token ve top-5 chunk; protected filtreler bütçe hesabından önce uygulanır.
  Farklı tokenizasyon/limitlerle provider capability check yapılır; taşma sessiz truncate edilmez.
- Günlük cloud limitini kullanıcı belirler. Fiyat manifesti yoksa maliyet `unknown`, bulut harcaması fail-closed;
  token rezervasyonu + ölçülen kullanım yerel ledger'da tutulur. Bu mekanizma sağlayıcının kesin faturasını garanti etmez.
- Son 10 committed setin snapshot'ı tutulur; başarısız/in-flight recovery kaydı çözülmeden temizlenmez. Geçici staging
  recovery sonrası silinir. Audit default 30 gün; son 10 setin gerekli recovery metadatası korunur.
- Index temizleme embedding/cache'i siler; backup/audit/key silme ayrı eylemlerdir. Aktif run iptal edilir, writer
  kapatılır ve yeniden indeks kullanıcı tarafından başlatılır. Anahtar silme local secret/reference'i kaldırır;
  uzaktaki provider verisini sildiği iddia edilmez.
- Thesis export opt-in ve sanitize edilmiş manifesttir; raw kişi, key, kod veya mutlak kişisel path içermez.
  İnsan çalışması retention/onam kararı alınmadan insan verisi toplanmaz.
- Kritik UI işlemleri klavye ile yürür; focus, accessible name ve safety error durumu E2E'de gözlenir.

## 6. Teslim dilimleri ve kapılar

| Dilim | Çıktı | Başlama kapısı | Bitiş kanıtı |
|-------|-------|---------------|--------------|
| S0 | Bu teknik baz çizgi, schema/examples, DoR/DoD ve Project düzeni | Kullanıcının planı tamamlama talebi | Validation ve merged plan commit'i; dış kararlar ayrı. |
| S1 | Electron/Monaco shell + saf workspace/protected kontrolleri | Repo ADR/runtime/G0 dokümanları hazır | Clean-clone launch + traversal/protected test raporu; agent write yok. |
| S2 | Dosya akışı, typed IPC, onboarding/secrets, read-only chat/context | S1 ve ilgili güvenlik testleri | IPC/credential/provider contract ve privacy testleri. |
| S3 | Plan/staged diff, audit, approval, single-file modify, recovery/rollback | S2; plan v2; write safety | Stale/unauthorized/hash/crash/rollback negatif testleri; false-success yok. |
| S4 | Çok dosya transaction + dependency-aware partial approval + 5 senaryo | S3 recovery kanıtı | Tüm senaryo/E2E ve N'inci write fault-injection raporu. |
| S5 | Formal benchmark ve tez kanıtı | Danışman #20/#54/#66/#113; freeze manifesti; S4 | Dondurulmuş 20 görev, paired analiz, sınırlılıklar ve sonuçlar. |
| S6 | Temiz kaynak teslimi, demo/fallback, tez/savunma paketi | S5; feature freeze | Clean-clone talimatı ve 5 dakika demo kanıtı. |

S1 için ileri aşamadaki formal benchmark veya akademik isim kararı beklenmez. S3'ten önce write sözleşmesi ve
safety testleri gerekir. S5'e geçiş gerçek danışman kararı ve veri-öncesi freeze gerektirir. Doküman Done,
uygulama Done değildir. İlk iki hafta sadece kapasiteye göre S1 ve beş pilot örneği hedeflenir; resmî tarih uydurulmaz.

## 7. Açık dış kararlar ve uygulama devri

| Karar | Sahibi | Son tarih/kapı | Güvenli varsayım |
|-------|--------|---------------|-----------------|
| Akademik VDD adı/ana soru | Öğrenci + danışman, #20/#66 | 5 Kasım ilk görüşme; formal tasarımdan önce | Dar izlenebilirlik çerçevesi; evrensel üstünlük iddiası yok. |
| Deney/large-edit/oracle ve nihai eşikler | Danışman, #54/#25 | Formal veri öncesi | B/C aynı safety; 20 görev planı, gerçek fixture freeze ayrı. |
| İnsan çalışması ve kurumun izin/onam süreci | Danışman, #113 | Katılımcı teması/veri toplamadan önce | Katılımcı çalışması yok; güven/öğrenme sonucu iddia edilmez. |
| Akademik takvim ve haftalık kapasite | Öğrenci + danışman, #71 | 5 Kasım görüşmesi | Slice/bağımlılık sırası; milestone tarihleri boş. |

**Handoff:** Teknik plan S1 için uygulanabilir. UI/provider/native modül sürümlerini ve OS-backed secret-store
kütüphanesini scaffold/spike PR'ında uyumluluk testiyle seçip lockfile'a kilitle; bu bilinen uygulama işi,
yeni ürün kapsamı kararı değildir. Danışman sonucu gelince yalnız ilgili karar kaydı ve etkilenmiş requirement sürümü değişir.
