# ÜRÜN PLANLAMA BELGESİ (PRODUCT_PLAN)

> **Belge amacı:** Bu belge, Agentic IDE lisans bitirme projesinin ürün boyutunu tanımlar.  
> Kime, ne için, hangi kapsamda yapılacağını netleştirir.  
> Teknik kararlar için → `SYSTEM_PLAN.md`

---

## 1. Problem Tanımı

### 1.1 Bağlam Kırılması (Context Fragmentation)

Geliştiriciler bugün iki ayrı bağlamda çalışmak zorunda kalır: editör ve AI araç. Kod yazarken yapay zeka yardımı almak
için editörden çıkıp ChatGPT/Claude'a gitmek, aktif bağlamı (açık dosyalar, hata mesajı, proje yapısı) elle taşımayı
gerektirir.

**Araştırma verileri:**

- Bir bağlam değişikliği sonrası odağı yeniden kazanmak ortalama **23 dakika 15 saniye** sürer (Dr. Gloria Mark, UC
  Irvine)
- Geliştiriciler günde ortalama **1-2 saat** bağlam kırılması nedeniyle verimlilik kaybeder — bu, geliştirici başına
  yıllık **$50.000+** gizli maliyete karşılık gelir
- Geliştiriciler saatte ortalama **35 kez** farklı araçlar arasında geçiş yapar
- 4 eşzamanlı görevle çalışan geliştiricilerin verimliliğinin **%60'ı** kaybolur
- Sık kesintiler hata oranını **%50-100** artırır

### 1.2 Mevcut Çözümlerin Yetersizlikleri

Var olan editör entegrasyonları bu boşluğu kapatmaya çalışır ancak iki temel eksiklikleri vardır:

| Araç               | Ne Yapar                                               | Nerede Yetersiz                                                |
|--------------------|--------------------------------------------------------|----------------------------------------------------------------|
| **GitHub Copilot** | Satır/blok bazlı otomatik tamamlama, Agent Mode (2025) | Çok dosyalı refaktor zayıf; güvenlik model kontrolleri yok     |
| **Cursor**         | VS Code fork, Composer ile proje genelinde düzenleme   | Kapalı kaynak; diff önizleme kısıtlı; fiyatlandırma endişeleri |
| **Windsurf**       | Cascade ajan sistemi, gerçek zamanlı bağlam takibi     | Yeni ve olgunlaşmamış; güvenlik kontrolleri yüzeysel           |
| **Claude Code**    | Terminal tabanlı ajan, derin akıl yürütme              | IDE entegrasyonu yok; dosya yazma kontrolsüz                   |
| **Devin**          | Tam otonom ajan, bulut sandbox                         | Kullanıcıyı döngüden tamamen çıkarır; güven sorunu             |

**Ortak sorun:** Hiçbiri "güvenli, açıklanabilir ve kullanıcı onaylı" bir ajan döngüsünü akademik olarak ölçmemiştir.

### 1.3 Neden Bu Problem Önemli?

- **Ölçülebilir:** Bağlam kırılmasının maliyeti araştırmalarla kanıtlanmıştır
- **Gerçek:** Her geliştirici bu sorunu günlük yaşar
- **Akademik açıdan incelenmemiş alt sorun:** "Bir AI ajanı, güvenli ve açıklanabilir şekilde çok dosyalı bir kod
  değişikliği yapabilir mi?"

### 1.4 Yanlış Tanım Riski

Problem "Copilot gibi bir şey yapalım" olarak tanımlanırsa:

- Tezin araştırma sorusu belirsizleşir
- Jüri "Neden bunu yapmak gerekiyordu?" sorusunu yanıtsız bırakır
- Feature parité hedefi ölçülemeyen ve sürekli kaçan bir çıta oluşturur

---

## 2. Akademik Katkı / Araştırma Sorusu

### 2.1 Ana Araştırma Sorusu

> **"Kullanıcı tetiklemeli, plan-önce-onay-sonra (plan-first, approval-gated) bir ajan döngüsü, çok dosyalı kod
değişikliklerinde hata oranını ve kullanıcı güvenini, doğrudan LLM çıktısına kıyasla ölçülebilir biçimde iyileştirir
mi?"**

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

**Profil:** Orta seviye yazılım geliştirici (2–5 yıl deneyim)

- Büyük ölçekli refaktorlara henüz güvenle girişemeyen
- AI önerilerini körü körüne uygulamak yerine anlamak isteyen
- Güven duyduğu araçları aktif olarak kullanan
- Bağlam kırılması sorununu yoğun yaşayan

### 3.2 İkincil Hedef Kullanıcı

**Profil:** Bilgisayar mühendisliği öğrencileri (3.–4. sınıf)

- Tez değerlendirmesi için katılımcı
- Benchmark çalışması için kontrollü grup oluşturulabilir
- Araç kullanım alışkanlıkları henüz oturmamış

### 3.3 Hedef DIŞI Kullanıcılar (MVP için)

- Üst düzey mühendisler (Cursor/Copilot zaten yeterli ve daha olgun)
- Non-teknik kullanıcılar
- Mobil geliştiriciler (farklı toolchain gereksinimleri)
- DevOps/altyapı mühendisleri (terminal ağırlıklı çalışma biçimi)

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

| Özellik                   | Copilot | Cursor  | Windsurf | Devin | **Agentic IDE** |
|---------------------------|---------|---------|----------|-------|-----------------|
| Çok dosyalı düzenleme     | Kısıtlı | ✅       | ✅        | ✅     | ✅               |
| Diff önizleme + onay      | Yok     | Kısıtlı | Kısıtlı  | Yok   | **✅ Zorunlu**   |
| Rollback                  | Yok     | Yok     | Yok      | Yok   | **✅ 10 adım**   |
| Yerel model desteği       | Yok     | ✅       | Yok      | Yok   | **✅**           |
| Bağlam kaynağı şeffaflığı | Yok     | Kısıtlı | ✅        | Yok   | **✅**           |
| Güvenlik denetim logu     | Yok     | Yok     | Yok      | Yok   | **✅**           |
| Açık kaynak / akademik    | Yok     | Yok     | Yok      | Yok   | **✅**           |

**Fark yaratan özellik:** Araştırma odaklı güvenlik + şeffaflık. Copilot gibi ajanlar hız optimize eder; Agentic IDE
güven optimize eder.

---

## 6. MVP Dışı Bırakılacak Özellikler

Aşağıdaki özellikler **ilk sürümde kesinlikle yapılmayacaktır.** Her biri için neden çıkarıldığı ve ne zaman yeniden
değerlendirilebileceği belirtilmiştir.

| Özellik                                                              | Neden Dışarıda                                                       | Ne Zaman Yeniden Değerlendir                         |
|----------------------------------------------------------------------|----------------------------------------------------------------------|------------------------------------------------------|
| **Proaktif / background analiz (save-time, idle-time, alert queue)** | Alert fatigue riski; araştırma sorusunun dışında; teknik karmaşıklık | Gelecek çalışma olarak belgele (`UC-03B`)            |
| **Reactive safety warnings (apply-öncesi)**                          | **MVP İÇİNDE** — `SAFETY_AND_GUARDRAILS §2.6` ve `UC-03A`            | N/A (MVP kapsamı)                                    |
| **Multi-agent mimari**                                               | Koordinasyon karmaşıklığı; tek ajan yeterli                          | Single-agent sınırlarına ulaşıldıktan sonra          |
| **3+ model sağlayıcısı**                                             | Her API farklı hata yönetimi gerektirir                              | Soyutlama katmanı varken eklenmesi kolay             |
| **VS Code extension uyumluluğu**                                     | Yıllarca sürecek uyumluluk mühendisliği                              | Hiçbir zaman bu proje kapsamında                     |
| **Debug adaptörü (DAP)**                                             | Araştırma sorusuyla ilgisi yok                                       | Tez sonrası ürün geliştirme                          |
| **Terminal entegrasyonu**                                            | Shell injection riski; güvenlik ek karmaşıklık                       | Güvenlik modeli olgunlaştıktan sonra                 |
| **Git entegrasyonu**                                                 | Kapsam dışı; rollback için undo stack yeterli                        | Tez sonrası                                          |
| **Tema / görsel özelleştirme**                                       | Kozmetik özellikler araştırma zamanı çalar                           | Tez bitiminden sonra                                 |
| **Otomatik paketleme / installer**                                   | Demo için `npm run dev` yeterli                                      | Savunma öncesi son ay                                |
| **Bulut sync / hesap sistemi**                                       | Gizlilik ve altyapı karmaşıklığı                                     | Bu proje kapsamında değil                            |
| **MCP (Model Context Protocol)**                                     | Standart henüz olgunlaşmamış; ekstra karmaşıklık                     | Tez sonrası topluluk katkısı olarak                  |
| **Tüm repo'yu context'e almak**                                      | Context window aşımı + token maliyeti                                | Retrieval yaklaşımı ile karşılaştırma olarak belgele |

---

## 7. Başarı Kriterleri (Özet)

| Metrik              | Hedef                  | Ölçüm Yöntemi                          |
|---------------------|------------------------|----------------------------------------|
| Görev başarı oranı  | ≥ %60                  | 20 benchmark görevi üzerinden          |
| Güvenlik ihlali     | 0 başarılı ihlal       | Audit log incelemesi                   |
| Rollback oranı      | ≤ %20                  | Onay sonrası geri alma sayısı / toplam |
| Hallucination oranı | ≤ %15                  | Yanlış atıf / toplam atıf              |
| Demo stabilitesi    | 5 dakikalık canlı demo | Jüri önünde hatasız çalışma            |

---

## 8. Danışman Toplantısında Sorulacak Karar Soruları

Bu bölüm, belgeyi finalize etmeden önce danışmandan net karar almak için hazırlanmıştır.

1. Ana araştırma sorusu bu haliyle akademik olarak yeterince net mi, yoksa daha da daraltmalı mıyız?
2. Başarı eşiği olarak görev başarı oranı hedefi (≥ %60) uygun mu, yoksa daha yüksek bir eşik mi belirlemeliyiz?
3. Kullanıcı güveni ölçümü için rollback oranı + anket yeterli mi, ek metrik ister misiniz?
4. MVP'de terminal entegrasyonunu kesin dışarıda mı tutalım?
5. MVP dışı listeden bu tezde içeri alınması gereken tek bir özellik var mı?
6. Hedef kullanıcıyı tek gruba (2–5 yıl deneyimli geliştirici) indirmek doğru mu?
7. Beş kullanım senaryosu jüri için yeterli mi, yoksa birini çıkarıp daha derin değerlendirme mi yapalım?
8. Rekabet tablosundaki iddiaları (özellikle güvenlik ve şeffaflık farkı) savunma dili açısından yumuşatmalı mıyız?

**Toplantı kapanış sorusu:**
"Bugün onay verdiğiniz 3 maddeyi ve revize etmem gereken 3 maddeyi netleştirebilir miyiz?"

---

*Ürün kararları için → bu belge.*  
*Teknik ve mimari kararlar için → `SYSTEM_PLAN.md`*  
*Değerlendirme detayları için → `EVALUATION_PLAN.md`*
