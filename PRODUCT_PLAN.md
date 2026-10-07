# ÜRÜN PLANLAMA BELGESİ (PRODUCT_PLAN)

> **Belge amacı:** Bu belge, Agentic IDE lisans bitirme projesinin ürün boyutunu tanımlar.  
> Kime, ne için, hangi kapsamda yapılacağını netleştirir.  
> Teknik kararlar için → `SYSTEM_PLAN.md`

---

## 0. Tek Kaynak Kapsam ve Akademik Konumlandırma

Bu belge, ürün kapsamı ve akademik konumlandırma için tek doğru kaynaktır. Diğer belgeler bu bölümdeki kararları
özetler veya teknik ayrıntıya indirger.

### 0.1 Tek Cümlelik Proje Tanımı

> **Agentic IDE, kullanıcı tetiklemeli, plan-önce-onay-sonra çalışan bir ajan döngüsünün çok dosyalı kod
değişikliklerinde görev başarısı, güvenlik ihlali, rollback davranışı ve kullanıcı güveni üzerindeki etkisini ölçen
güvenlik odaklı bir AI kod editörü tez prototipidir.**

### 0.2 Akademik Odak Kararı

Bu tablo mevcut planlama baz çizgisidir. `PROJECT_REVIEW_TODO.md` içindeki "ana odak VDD" notuyla farklılık,
8 Ekim 2026 toplantısında [K1 kararı](ADVISOR_MEETING_AGENDA.md) olarak çözülecektir. VDD adı tek başına yeni
metodoloji veya özgünlük kanıtı sayılmaz.

| Aday Konumlandırma | Karar | Bu Projedeki Rolü |
| -------------------- | ------- | ------------------- |
| Agentic IDE | Ürün artefact'i | Ölçüm yapılacak çalışan editör prototipi. |
| Approval-gated AI coding | Ana araştırma odağı | Plan, diff, insan onayı, güvenlik kontrolü, rollback ve audit hattının etkisi ölçülür. |
| Verification-Driven Development (VDD) | Destekleyici tez çerçevesi | Gereksinim, kanıt, karar, rollback ve izlenebilirlik dilini sağlar; MVP'de ayrı bir ürün modu değildir. |

**Ana araştırma sorusu:** Kullanıcı tetiklemeli, plan-first ve approval-gated bir ajan döngüsü; doğrudan LLM çıktısına
kıyasla çok dosyalı kod değişikliklerinde görev başarısını, güvenlik ihlali riskini, rollback davranışını ve kullanıcı
güvenini ölçülebilir biçimde iyileştirir mi?

### 0.3 Hedef Kullanıcı Kararı

MVP'nin birincil hedef kullanıcısı **junior developer / üst sınıf bilgisayar mühendisliği öğrencisi** profilidir. Bu profil
kod okuyabilir, temel refactor/test görevleri yapabilir ve AI önerisini körlemesine uygulamak yerine diff, gerekçe ve kanıt
görmek ister. Profesyonel power-user, tam ürün pazarı ve jüri demosu bu kapsamın hedefi değil, değerlendirme bağlamıdır.

### 0.4 MVP Kapsam Tablosu

| Alan | MVP İçinde | MVP Dışında | Gerekçe / Kanıt |
|------|------------|-------------|-----------------|
| Editör zemini | Electron + Monaco, klasör açma, dosya ağacı, dosya aç/kaydet, en fazla 5 sekme | VS Code extension uyumluluğu, debug adapter, gelişmiş tema sistemi | Editör akademik katkı değil, ölçüm zemini. |
| Bağlam motoru | Aktif dosya, import/export ilişkileri, top-5 retrieval, `.agentignore`, gizli dosya filtreleri | Tüm repo'yu modele göndermek, gelişmiş ranking araştırması | Token maliyeti ve bağlam gürültüsü sınırlandırılır. |
| Ajan döngüsü | Kullanıcı tetiklemeli single-agent ReAct: gözlemle, planla, diff göster, onay al, uygula | Multi-agent koordinasyon, otonom görev başlatma | Araştırma değişkeni approval gate olarak dar tutulur. |
| Diff ve onay | Side-by-side/unified diff, seçmeli onay, atomik yazma, son 10 değişiklik için rollback | Onaysız dosya yazma, otomatik patch uygulama | Kullanıcı kararı ve geri alma davranışı ölçülür. |
| Güvenlik | Workspace boundary, path normalization, protected files, secret-in-diff, apply-öncesi reactive safety warnings, audit log | Terminal/shell execution, process sandbox, background security scanning | Shell injection ve alert fatigue riski MVP dışında tutulur. |
| Model entegrasyonu | 1 bulut + 1 yerel sağlayıcı, manuel model seçimi, provider abstraction | 3+ sağlayıcı, otomatik model router, maliyet optimizasyon motoru | Karşılaştırma için yeterli çeşitlilik, düşük entegrasyon yükü. |
| Değerlendirme | 20 benchmark görevi, A/B/C ablation, ürün/güvenlik/tez metrikleri | Büyük ölçekli sanayi benchmark'ı, zorunlu geniş kullanıcı çalışması | Tek kişilik bitirme projesi için savunulabilir örneklem. |

### 0.5 Başarı Kriterleri

| Kategori | Ölçüt | Hedef |
|----------|-------|-------|
| Ürün | 5 MVP senaryosunun çalışması ve canlı demo akışının tamamlanması | 5 dakikalık jüri demosu hatasız çalışır. |
| Ürün | Benchmark görev başarısı | 20 görevde en az %60 tam başarı veya danışman onaylı revize eşik. |
| Güvenlik | Başarılı yetkisiz yazma / protected file ihlali | 0 başarılı ihlal; tüm girişimler audit log'a yazılır. |
| Güvenlik | Rollback ve audit kapsaması | Uygulanan her değişiklik seti rollback noktası ve audit kaydı üretir. |
| Tez | Araştırma sorusunun yanıtlanması | A/B/C sonuçları, hata türleri, sınırlılıklar ve güvenlik etkisi raporlanır. |
| Tez | VDD çerçevesinin kullanımı | VDD, sonuç iddiası değil; kanıt, izlenebilirlik ve karar dili olarak belgelenir. |

### 0.6 Eleştirel Risk Bağlantısı

`CRITICAL_ANALYSIS.md` içindeki kapsam, proaktif davranış, multi-agent, terminal, retrieval ve ölçüm riskleri bu belgeye
şu kararlar olarak işlendi:

- Proaktif/background analiz MVP dışıdır; yalnızca apply-öncesi reactive safety warnings MVP içindedir.
- Terminal/shell execution MVP dışıdır.
- Multi-agent mimari gelecek çalışma olarak kalır.
- Tüm repo context yerine katmanlı retrieval kullanılır.
- Değerlendirme 20 görevlik benchmark ve A/B/C ablation ile yapılır.

## 1. Problem Tanımı

### 1.1 Bağlam Kırılması (Context Fragmentation)

Geliştiriciler bugün iki ayrı bağlamda çalışmak zorunda kalır: editör ve AI araç. Kod yazarken yapay zeka yardımı almak
için editörden çıkıp ChatGPT/Claude'a gitmek, aktif bağlamı (açık dosyalar, hata mesajı, proje yapısı) elle taşımayı
gerektirir.

Bu projede bağlam taşıma ve AI çıktısını doğrulama yükü bir **araştırma problemi** olarak ele alınır. Önceki sürümdeki
23 dakika, günlük 1–2 saat, yıllık $50.000, saatte 35 geçiş ve hata artışı yüzdeleri; geliştirici örneklemi, ölçüm yöntemi
ve birincil kaynakları doğrulanmadığı için tez gerekçesinden çıkarılmıştır. Yerel kullanıcı grubunun kaybı henüz ölçülmemiştir.

AI desteğinin etkisi görev ve kullanıcı bağlamına göre değişebilir. Bu nedenle üretkenlik veya güven artışı sonuç olarak
varsayılmaz; kontrollü değerlendirmede ölçülür. Kaynak ve iddia sınırları:
[Literatür ve iddia denetimi](docs/LITERATURE_AND_CLAIMS.md).

### 1.2 Mevcut Çözümlerin Yetersizlikleri

Mevcut araçlarda çok dosyalı düzenleme, diff inceleme, değişiklikleri geri alma ve izin yönetimi örnekleri bulunmaktadır.
Bu özelliklerin varlığı, etkilerinin bu projenin hedef kullanıcıları ve görevleri üzerinde aynı olduğu anlamına gelmez.

| Araç | Doğrulanan örnek | Bu tez için çıkarım |
|------|-----------------|--------------------|
| GitHub Copilot / VS Code | Agent mode, çok dosyalı değişiklikleri inceleme ve geri alma | Özellik yokluğu üzerinden yenilik iddiası kurulamaz. |
| Cursor | Resmî belgelerde diff inceleme ve checkpoint geri yükleme | Diff ve rollback tek başına özgün katkı değildir. |
| Claude Code | İzin kuralları, checkpoint ve VS Code entegrasyonu | "Kontrolsüz dosya yazma / IDE entegrasyonu yok" iddiası kullanılmaz. |

Bu tablo bir performans karşılaştırması değildir. Doğrulanmamış ürünler için yokluk veya güvenlik üstünlüğü iddiası
kurulmaz. Birincil kaynaklar [iddia denetiminde](docs/LITERATURE_AND_CLAIMS.md) verilmiştir.

**Katkı adayı:** Sınırlı bir prototipte gereksinim → plan → diff → insan kararı → değişiklik → doğrulama kanıtı →
rollback hattını izlenebilir kurmak ve koşullar arasındaki etkisini ölçmek. Özgünlük düzeyi literatür incelemesi ve
danışman değerlendirmesiyle kesinleştirilecektir.

### 1.3 Neden Bu Problem Önemli?

- **Ölçülebilir:** Görev doğruluğu, inceleme süresi, güvenlik girişimleri ve geri alma olayları tanımlanabilir.
- **Hedef kullanıcıyla sınanabilir:** Öğrenci / junior geliştirici profili için görev ve kullanım gözlemleri hazırlanabilir.
- **Sınırlandırılmış araştırma:** Plan, onay ve kanıt hattının hangi koşullarda fayda sağladığı veya sürtüşme eklediği
  karşılaştırılabilir; bu soru için "daha önce çalışma yok" iddiası kurulmaz.

### 1.4 Yanlış Tanım Riski

Problem "Copilot gibi bir şey yapalım" olarak tanımlanırsa:

- Tezin araştırma sorusu belirsizleşir
- Jüri "Neden bunu yapmak gerekiyordu?" sorusunu yanıtsız bırakır
- Feature parité hedefi ölçülemeyen ve sürekli kaçan bir çıta oluşturur

---

## 2. Akademik Katkı / Araştırma Sorusu

### 2.1 Ana Araştırma Sorusu

> **"Kullanıcı tetiklemeli, plan-önce-onay-sonra (plan-first, approval-gated) bir ajan döngüsü, çok dosyalı kod
değişikliklerinde görev başarısını, güvenlik ihlali riskini, rollback davranışını ve kullanıcı güvenini doğrudan LLM
çıktısına kıyasla ölçülebilir biçimde iyileştirir mi?"**

### 2.2 Alt Araştırma Soruları

1. **Retrieval etkinliği:** Semantik retrieval (RAG + AST sembolleri) ile naif tam-dosya gönderme karşılaştırıldığında,
   doğruluk ve token maliyeti nasıl değişir?
2. **Diff önizleme etkisi:** Diff önizleme + rollback mekanizması, kullanıcının ajanı reddedip yeniden istek yapma
   davranışını nasıl etkiler?
3. **Güvenlik maliyeti:** Onay mekanizması (human gate) ajan döngüsüne ne kadar sürtüşme ekler? Bu sürtüşme güven
   artışıyla dengelenir mi?
4. **Model karşılaştırma:** Yerel model (Ollama) ve bulut model (Claude API) arasındaki görev başarı oranı farkı nedir?

### 2.3 Araştırma Sorusunun Gücü

- Ölçülebilir: Başarı oranı, rollback oranı, güvenlik ihlali sayısı
- Karşılaştırılabilir: Doğrudan LLM çıktısı vs. plan-approval döngüsü
- Süre uygun: 1.5 yılda yanıtlanabilir
- Jüri testi: "Ne öğrendik?" sorusuna net cevap var

---

## 3. Hedef Kullanıcı

### 3.1 Birincil Hedef Kullanıcı

**Profil:** Junior developer / üst sınıf bilgisayar mühendisliği öğrencisi (3.–4. sınıf veya 0–2 yıl deneyim)

- Çok dosyalı refactor ve test yazma görevlerinde AI desteği almak ister
- AI önerilerini körü körüne uygulamak yerine diff, gerekçe ve bağlam kaynağı görmek ister
- Güvenlik ve geri alma garantisi olmadan otomatik dosya değişikliğine güvenmez
- Tez değerlendirmesi için erişilebilir ve gözlemlenebilir kullanıcı grubudur

### 3.2 İkincil Değerlendirme Bağlamı

**Profil:** Danışman, jüri ve teknik gözlemci

- Ürünün hedef pazarı değil, araştırma iddiasının değerlendiricisidir
- Demo akışı, benchmark sonuçları ve güvenlik kanıtları üzerinden karar verir
- Ürünün "profesyonel power-user" beklentisiyle değil, tez prototipi sınırlarıyla değerlendirilmesi gerekir

### 3.3 Hedef DIŞI Kullanıcılar (MVP için)

- Üst düzey mühendisler (Cursor/Copilot zaten yeterli ve daha olgun)
- Non-teknik kullanıcılar
- Mobil geliştiriciler (farklı toolchain gereksinimleri)
- DevOps/altyapı mühendisleri (terminal ağırlıklı çalışma biçimi)
- Tam ürün pazarı veya enterprise ekipler

---

## 4. Temel Kullanım Senaryoları

Aşağıdaki 5 senaryo MVP kapsamını oluşturur. Her biri bağımsız olarak değerlendirilebilir ve ölçülebilir bir çıktı
üretir.

### Senaryo 1: Hata Tespiti ve Düzeltme Önerisi

- **Kullanıcı:** "Şu fonksiyon çalışmıyor, neyi düzeltmem gerek?"
- **Ajan:** Aktif dosyayı ve ilgili sembolleri okur → olası hatayı tespit eder → değişiklik planını diff olarak sunar →
  kullanıcı onaylar → değişiklik uygulanır
- **Başarı kriteri:** Ajan doğru dosyayı, doğru satırı değiştirir
- **Benchmark karşılığı:** SWE-bench tarzı bug-fix görevi

### Senaryo 2: Çok Dosyalı Refactor

- **Kullanıcı:** "Bu fonksiyonu yeniden adlandır, tüm kullanımları güncelle."
- **Ajan:** Repo'yu tarayarak tüm referans noktalarını bulur → hangi dosyaların değiştirileceğini listeler → kullanıcı
  onaylar → atomik olarak uygular
- **Başarı kriteri:** Hiçbir referans atlanmaz, yanlış dosya değiştirilmez
- **Benchmark karşılığı:** Cross-file rename + import güncelleme

### Senaryo 3: Test Yazma

- **Kullanıcı:** "Bu modül için birim testleri yaz."
- **Ajan:** Fonksiyon imzalarını ve davranışını analiz eder → test dosyası önerir → kullanıcı inceler ve onaylar
- **Başarı kriteri:** Üretilen testler derlenir ve temel senaryoları kapsar
- **Benchmark karşılığı:** Test coverage artışı ölçümü

### Senaryo 4: Kod Tabanını Anlama (Q&A)

- **Kullanıcı:** "Bu projede authentication nasıl çalışıyor?"
- **Ajan:** Alakalı dosyaları retrieval ile bulur → doğal dil açıklaması üretir → hangi dosyalardan bilgi aldığını
  gösterir
- **Başarı kriteri:** Doğru dosyalar atıflanır, yanıt tutarlıdır
- **Benchmark karşılığı:** Source attribution doğruluğu

### Senaryo 5: Güvenli Tek Dosya Düzenleme

- **Kullanıcı:** "Bu CSS dosyasındaki renkleri design token'larına çevir."
- **Ajan:** Değişiklik planını oluşturur → diff gösterir → onay alır → uygular → rollback seçeneği aktif kalır
- **Başarı kriteri:** Yalnızca hedef dosya değişir, başka dosyaya dokunulmaz
- **Benchmark karşılığı:** Precision check — hedef dışı dosya değişimi sayısı

---

## 5. MVP Kapsamı

MVP'nin tanımı: **18 ay sonunda jüri önünde canlı olarak çalıştırılabilir, akademik araştırma sorusunu yanıtlayacak
yeterli veriye sahip, stabil bir sistem.**

Kapsamın tek karar tablosu için bkz. §0.4. Aşağıdaki maddeler bu tablonun detaylandırılmış açıklamasıdır.

### 5.1 MVP'ye Dahil Olan Özellikler

#### Editör Katmanı (Zemin)

- Electron + Monaco tabanlı masaüstü uygulaması
- Klasör aç → dosya ağacı görüntüle → dosya aç/kaydet
- En fazla 5 eş zamanlı sekme
- Temel sözdizim vurgulama (Monaco tarafından sağlanır)
- Durum çubuğu: aktif dosya, ajan durumu

#### Bağlam Motoru

- Proje dosyalarını açılışta indeksle (embedding + dosya yolu)
- Aktif dosya + import/export grafı üzerinden ilgili sembolleri retrieve et
- Bağlam kaynağını kullanıcıya görünür kıl ("Şu 3 dosyadan bilgi kullandım")
- Hibrit indeksleme: AST tabanlı sembol çıkarma + vektör benzerlik araması

#### Ajan Döngüsü (Kullanıcı Tetiklemeli)

- Sohbet paneli: kullanıcı doğal dil ile istek yazar
- Ajan yanıtı: yalnızca metin (açıklama modu) veya değişiklik planı
- Değişiklik planı onayı: kullanıcı "Uygula" veya "İptal"
- Plan uygulama: atomik dosya yazma işlemi

#### Diff Önizleme ve Güvenlik

- Değişiklik öncesi/sonrası yan yana diff gösterimi
- Onay alınmadan hiçbir dosya değiştirilmez
- Son 10 değişiklik için rollback (undo stack)
- Hassas dosya filtreleme: `.env`, `.pem`, `id_rsa`, `*.key` context'e alınmaz
- **Reactive safety warnings (apply öncesi):** plan üretildikten sonra otomatik 4 zorunlu kontrol — workspace boundary
  violation, protected file write, large edit threshold (>20 dosya VEYA >500 satır), secret-in-diff. Detay:
  `SAFETY_AND_GUARDRAILS §2.6`, `UC-03A`. Background scanning MVP dışıdır (`UC-03B`).

#### Model Entegrasyonu

- 1 bulut sağlayıcı (Anthropic Claude — API üzerinden)
- 1 yerel sağlayıcı (Ollama — Llama3 / Qwen2.5-Coder veya benzeri)
- Model seçimi kullanıcı tercihine bırakılır
- Soyutlama katmanı: yeni sağlayıcı eklemek tek dosya değişikliği olsun

### 5.2 Rekabetçi Konumlandırma

| Tasarım hedefi | Agentic IDE planı | Kanıt durumu |
|----------------|-------------------|--------------|
| Çok dosyalı değişiklik | Görevle sınırlı diff ve seçmeli onay | Planlandı; uygulama henüz yok. |
| Yazma yetkisi | İncelenen değişiklik setine bağlı açık insan onayı | Sözleşme ve testlerle doğrulanacak. |
| Geri alma | Son 10 değişiklik seti, çakışma ve hata davranışı tanımlı | Uygulanıp test edilecek. |
| İzlenebilirlik | Gereksinim, kullanılan bağlam, karar ve kanıt bağlantısı | Değerlendirmede ölçülecek. |
| Model karşılaştırması | Bir bulut ve bir yerel sağlayıcı | İkincil, kaynaklara bağlı deney. |

**Araştırma değeri:** Tasarımın görev doğruluğu, güvenlik ve inceleme maliyetine etkisini tekrarlanabilir bir protokolde
raporlamak. Ürünler üzerinde aynı görevlerle deney yapılmadıkça rakiplerden daha güvenli veya daha başarılı olduğu
söylenmez. Repo için açık kaynak lisansı henüz seçilmemiştir.

---

## 6. MVP Dışı Bırakılacak Özellikler

Aşağıdaki özellikler **ilk sürümde kesinlikle yapılmayacaktır.** Her biri için neden çıkarıldığı ve ne zaman yeniden
değerlendirilebileceği belirtilmiştir.

Bu liste §0.4'teki tek kapsam tablosuyla tutarlıdır; çelişki durumunda §0.4 karar tablosu esas alınır.

| Özellik                                                              | Neden Dışarıda                                                       | Ne Zaman Yeniden Değerlendir                         |
|----------------------------------------------------------------------|----------------------------------------------------------------------|------------------------------------------------------|
| **Proaktif / background analiz (save-time, idle-time, alert queue)** | Alert fatigue riski; araştırma sorusunun dışında; teknik karmaşıklık | Gelecek çalışma olarak belgele (`UC-03B`)            |
| **Multi-agent mimari**                                               | Koordinasyon karmaşıklığı; tek ajan yeterli                          | Single-agent sınırlarına ulaşıldıktan sonra          |
| **3+ model sağlayıcısı**                                             | Her API farklı hata yönetimi gerektirir                              | Soyutlama katmanı varken eklenmesi kolay             |
| **VS Code extension uyumluluğu**                                     | Yıllarca sürecek uyumluluk mühendisliği                              | Hiçbir zaman bu proje kapsamında                     |
| **Debug adaptörü (DAP)**                                             | Araştırma sorusuyla ilgisi yok                                       | Tez sonrası ürün geliştirme                          |
| **Terminal entegrasyonu**                                            | Shell injection riski; güvenlik ek karmaşıklık                       | Güvenlik modeli olgunlaştıktan sonra                 |
| **Git entegrasyonu**                                                 | Kapsam dışı; rollback için undo stack yeterli                        | Tez sonrası                                          |
| **Tema / görsel özelleştirme**                                       | Kozmetik özellikler araştırma zamanı çalar                           | Tez bitiminden sonra                                 |
| **Otomatik paketleme / installer**                                   | Demo için `npm run dev` yeterli                                      | Savunma öncesi son ay                                |
| **Bulut sync / hesap sistemi**                                       | Gizlilik ve altyapı karmaşıklığı                                     | Bu proje kapsamında değil                            |
| **MCP (Model Context Protocol)**                                     | Bu tezde dar araç yüzeyi yeterli; ek entegrasyon ve değerlendirme yükü | Tez sonrası kapsam değerlendirmesi                  |
| **Tüm repo'yu context'e almak**                                      | Context window aşımı + token maliyeti                                | Retrieval yaklaşımı ile karşılaştırma olarak belgele |

---

## 7. Başarı Kriterleri (Ürün / Güvenlik / Tez)

| Kategori | Metrik | Hedef | Ölçüm Yöntemi |
|----------|--------|-------|---------------|
| Ürün | Görev başarı oranı | ≥ %60 veya danışman onaylı revize eşik | 20 benchmark görevi üzerinden |
| Ürün | Demo stabilitesi | 5 dakikalık canlı demo | Jüri önünde hatasız çalışma |
| Ürün | Bağlam kaynağı şeffaflığı | Her ajan yanıtı kullanılan dosyaları listeler | UI gözlemi + audit log |
| Güvenlik | Başarılı güvenlik ihlali | 0 başarılı ihlal | Audit log + security testleri |
| Güvenlik | Rollback oranı | Keşifsel gösterge; ≤ %20 önerisi danışman incelemesinde | Onay sonrası geri alma sayısı / uygulanan değişiklik seti; nedenler ayrı kodlanır. |
| Güvenlik | Protected file / secret-in-diff koruması | Kapatılamaz apply-öncesi kontrol | Güvenlik testleri |
| Tez | Ana araştırma sorusunun yanıtlanması | A/B/C sonuçları karşılaştırılır | Benchmark raporu |
| Tez | Hallucination / yanlış atıf oranı | ≤ %15 önerisi danışman incelemesinde | Yanlış atıf / toplam doğrulanabilir atıf; atıf yoksa N/A. |
| Tez | Sınırlılıkların belgelenmesi | Hangi koşullarda güvenilir çalıştığı açıkça yazılır | Tez tartışma bölümü |

---

## 8. Danışman Toplantısında Sorulacak Karar Soruları

Bu bölüm, belgeyi finalize etmeden önce danışmandan net karar almak için hazırlanmıştır.

1. Ana araştırma odağını "approval-gated AI coding" olarak, VDD'yi destekleyici kanıt çerçevesi olarak konumlandırmamız
   akademik açıdan doğru mu?
2. Hedef kullanıcıyı junior developer / üst sınıf bilgisayar mühendisliği öğrencisi profiline indirmek tez değerlendirmesi
   için uygun mu?
3. MVP kapsam tablosundaki dışarıda bırakılanlar (terminal, multi-agent, proaktif/background analiz, VS Code extension)
   kesin onaylanıyor mu?
4. Başarı eşiği olarak ≥ %60 görev başarı oranı, 0 başarılı güvenlik ihlali ve ≤ %20 rollback hedef sinyali uygun mu?
5. 20 görevlik A/B/C benchmark tasarımı yeterli mi; görevleri danışman mı, dış gözlemci mi, yoksa karma yöntemle mi
   hazırlamalı?
6. Kullanıcı güveni için audit log + rollback davranışı + kısa anket yeterli mi, ek nitel görüşme gerekir mi?
7. Gereksinimden kanıta izlenebilirlik ve kontrollü değerlendirme, literatür karşısında yeterli bir bitirme projesi katkısı
   mı; hangi yayınlar ve karşılaştırmalar mutlaka kapsanmalı?
8. VDD bölümünde TDD hakkında ne kadar güçlü bir iddia kurulabilir; "testler gerekli ama tek başına yeterli değil"
   çizgisi onaylanıyor mu?

**Toplantı kapanış sorusu:**
"Bugün onay verdiğiniz 3 maddeyi ve revize etmem gereken 3 maddeyi netleştirebilir miyiz?"

Benchmark protokolü ve metrik yorumları için [EVALUATION_PROTOCOL.md](docs/EVALUATION_PROTOCOL.md) esas alınacak
danışman inceleme taslağıdır. Sıfır gözlenen ihlal evrensel güvenlik garantisi değildir; düşük rollback oranı tek başına
güven veya kaliteyi kanıtlamaz. Katılımcı çalışması yapılmazsa kullanıcı güveni sorusu yanıtsız / gelecek çalışma olarak
raporlanır.

---

*Ürün kararları için → bu belge.*  
*Teknik ve mimari kararlar için → `SYSTEM_PLAN.md`*  
*Değerlendirme detayları için → `EVALUATION_PLAN.md`*
