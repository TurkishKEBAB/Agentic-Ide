# SİSTEM PLANLAMA BELGESİ (SYSTEM_PLAN)

> **Belge amacı:** Bu belge, Agentic IDE lisans bitirme projesinin teknik ve mimari boyutunu tanımlar.  
> Nasıl inşa edileceğini, nasıl güvenli hale getirileceğini ve nasıl değerlendirileceğini netleştirir.  
> Ürün kararları için → `PRODUCT_PLAN.md`

---

## 7. Önerilen Ajan Mimarisi

### Öneri: Single-Agent ReAct Döngüsü

MVP için tek bir ajan kullanılır. Bu ajan aşağıdaki döngüde çalışır:

```
Kullanıcı İsteği
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  GÖZLEMLE (Observe)                                         │
│  - Aktif dosya içeriğini al                                 │
│  - Context motorundan ilgili sembolleri retrieve et         │
│  - Kullanıcı isteğini parse et                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  PLANLA (Plan)                                              │
│  - Hangi dosyalar değişecek?                                │
│  - Her dosyada tam olarak ne değişecek?                     │
│  - Değişiklik sırası nedir?                                 │
│  - Güvenlik kurallarını kontrol et                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  ONAY İSTEME (Request Approval)                             │
│  - Planı kullanıcıya diff olarak göster                     │
│  - Hangi dosyaların neden değiştirileceğini açıkla          │
│  - Kullanıcı: Uygula / Reddet / Düzenle                     │
└────────────────────┬────────────────────────────────────────┘
                     │ (yalnızca onay sonrası)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  UYGULA (Execute)                                           │
│  - Dosyaları atomik olarak yaz                              │
│  - Her değişikliği undo stack'e ekle                        │
│  - Sonucu kullanıcıya raporla                               │
└─────────────────────────────────────────────────────────────┘
```

**Tool sistemi:** Ajan aşağıdaki araçlara erişebilir:
- `read_file(path)` — dosya okuma
- `write_file(path, content)` — güvenlik kontrolünden geçerek dosya yazma
- `search_symbols(query)` — retrieval motoruna sorgu
- `list_files(pattern)` — dosya ağacı sorgulama
- `explain(text)` — yalnızca açıklama üretme (dosya değişikliği yok)

**Araç kısıtlaması:** Terminal komutları, `exec`, `eval`, `shell` araçları MVP'de **yoktur**.

### Gerekçe
Single-agent döngüsü araştırma sorusunu yanıtlamak için yeterlidir. Multi-agent mimarisi, koordinasyon protokolleri, failure recovery ve test edilebilirlik açısından 1.5 yılın çok üzerinde bir mühendislik çabası gerektirir.

### Trade-off
Single-agent yaklaşımı, paralel görev yürütmeyi ve uzmanlaşmış ajanlar arasında iş bölümünü dışarıda bırakır. Bu, büyük ölçekli refaktorlarda performans sınırı anlamına gelir.

### Yanlış yapılırsa ne bozulur?
Multi-agent sisteme erken geçilirse, koordinasyon hataları ayıklamak asıl özellik geliştirme süresini yok eder. "Ajan A, ajan B'nin bitirmesini beklerken sistem durdu" türü hatalar üretkenliği çökertir.

---

## 8. Context / Retrieval Yaklaşımı

### Öneri: Katmanlı Bağlam Modeli

Tüm repo'yu tek seferde modele göndermek yerine, üç katmanlı bir bağlam modeli kullanılır:

```
Katman 1 — Her zaman dahil (Always-on context)
├── Aktif dosyanın tam içeriği
├── Aktif dosyada cursor'ın bulunduğu fonksiyon / sınıf
└── Proje kök dizini yapısı (yalnızca dosya/klasör adları, içerik değil)

Katman 2 — Talep üzerine retrieve (On-demand retrieval)
├── Aktif dosyanın import ettiği modüller
├── Sembolik arama: kullanıcı isteğindeki anahtar kelimelerle eşleşen fonksiyon/sınıf adları
└── Embedding tabanlı benzerlik araması (top-5 en alakalı dosya parçası)

Katman 3 — Kullanıcı tarafından eklenen (User-pinned context)
└── Kullanıcının sürükle-bırak veya "@dosya.ts" sözdizimi ile eklediği dosyalar
```

**İndeksleme stratejisi:**
- Proje açılışında: tüm `.ts`, `.js`, `.py`, `.go` dosyaları embedding ile indekslenir (arka planda, editörü bloklamadan)
- Her dosya kaydında: ilgili dosyanın indeksi güncellenir
- Vektör store: SQLite + `sqlite-vec` (sıfır dış bağımlılık, taşınabilir)
- Embedding modeli: `nomic-embed-text` (yerel, API maliyeti yok)

**Gizlilik filtreleri:**
- `.env`, `.pem`, `*.key`, `id_rsa`, `*.secret` dosyaları indekse alınmaz
- `node_modules`, `.git`, `dist`, `build` klasörleri atlanır
- Kural listesi yapılandırılabilir (`.agentignore` dosyası)

### Gerekçe
Bu model, gerçek projeler için ölçeklenebilir. 100.000 satırlık bir repo için tüm içerik modele gönderilemez; ancak alakalı bağlam akıllıca seçilirse model performansı artar, maliyet düşer. Araştırma sorusunun alt sorusu bu yaklaşımın etkinliğini ölçmeyi hedefler.

### Trade-off
Katmanlı retrieval, yanlış parçaları seçme riskini taşır. Bir symbol başka bir isimde tanımlanmışsa retrieval onu kaçırabilir. Bu sınır tezde "sistem sınırı" olarak belgelenebilir.

### Yanlış yapılırsa ne bozulur?
Tüm repo context göndermek: küçük projelerde çalışır, büyük projelerde context window taşar, API maliyeti artar. Vaat edilen özellik gerçek kullanımda çöker.

---

## 9. Dosya Düzenleme Güvenlik Stratejisi

### Öneri: Çok Katmanlı Güvenlik Modeli

Güvenlik modeli "ne yasak" değil "ne izinli" sorusuna dayanır. Varsayılan her şey yasaklıdır; izinler açıkça tanımlanır.

#### Katman 1 — Workspace Boundary + Path Normalization (Çalışma Dizini Kısıtlaması ve Traversal Koruması)
- Ajan yalnızca kullanıcının açtığı proje dizini içindeki dosyaları okuyabilir ve yazabilir
- Proje dizini dışına çıkmak için hiçbir araç yoktur
- `../` traversal girişimleri path normalizasyonu ile önlenir

#### Katman 2 — Gizli Dosya Koruması
- Sabit kural: şu pattern'lar hiçbir zaman yazılamaz:
  - `.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, `*.secret`, `*.p12`, `*.pfx`
- Bu liste kullanıcı tarafından genişletilebilir ama daraltılamaz
- Kural ihlal girişimi audit log'a yazılır ve kullanıcıya bildirilir

#### Katman 3 — Değişiklik Onayı (Human Gate)
- Her `write_file` çağrısı önce diff üretir
- Diff kullanıcıya gösterilir; "Uygula" tıklanmadan işlem yapılmaz
- Birden fazla dosya içeren planlar için: dosya listesi özeti önce, ardından her dosya için ayrı diff

#### Katman 4 — Atomik Yazma ve Undo Stack
- Dosya yazma işlemi: önce `.agentbackup` geçici dosyasına yaz, ardından atomik rename
- Başarısız yazma işlemi orijinal dosyayı bozmaz
- Son 10 değişiklik seti undo stack'te tutulur (her set, etkilenen tüm dosyaların önceki halini içerir)

#### Katman 5 — Audit Log
- Her ajan eylemi (dosya oku, dosya yaz, retrieval sorgusu) zaman damgası ve kullanıcı kararıyla loglanır
- Log dosyası: `~/.agentide/audit.jsonl` (satır bazlı JSON)
- Log imzasız, salt metin; kullanıcı istediği zaman inceleyebilir

### Gerekçe
Her katman bağımsız bir güvenlik önlemidir. Bir katman aşılsa bile bir sonraki devreye girer. Bu savunma derinliği (defense in depth) yaklaşımı, akademik tezde güvenlik bölümünü güçlendirir.

### Trade-off
Bu model terminal komutlarını (shell execution) dışarıda bırakır. Kullanıcılar ajanın otomatik `npm install` ya da `pytest` çalıştırmasını isteyebilir. Bu özellik MVP'de yoktur; güvenlik modeli hazır olmadan eklenmez.

### Yanlış yapılırsa ne bozulur?
Güvenlik modeli "yasaklı komutlar listesi" şeklinde tasarlanırsa, listedeki olmayan ama tehlikeli bir komut çalıştırıldığında sistem saldırıya açık kalır. Pozitif liste (whitelist) yaklaşımı negatif listeden (blacklist) her zaman daha güvenlidir.

---

## 10. Diff Önizleme / Onay / Rollback Modeli

### Öneri: Üç Aşamalı Değişiklik Akışı

#### Aşama 1 — Diff Üretimi
Ajan değişiklik planını oluşturduktan sonra, uygulama öncesinde:
- Unified diff formatında (+ / - satırları) her dosya için değişiklik üretilir
- Yan yana (side-by-side) görünüm varsayılandır; kullanıcı unified diff'e geçebilir
- Değişiklik kapsamı özeti: "3 dosyada 12 satır eklendi, 4 satır silindi"
- Hangi bağlam kaynaklarından yararlandığı listelenir: "Şu 4 dosyayı referans aldım"

#### Aşama 2 — Onay Akışı

```
Tek dosya değişikliği:
  [Değişikliği Gör] → [Uygula] veya [İptal]

Çok dosya değişikliği:
  [Etkilenen Dosyalar Listesi]
     ↓
  [Her Dosya için Diff]
     ↓
  [Tümünü Uygula] veya [Seçilerek Uygula] veya [İptal]
```

**"Seçelerek Uygula":** Kullanıcı bazı dosyaların değişimini onaylayıp diğerlerini reddedebilir. Ajan kısmen uygulanmış durumu belirtir ve kullanıcıya "Kalan kısmı tamamlamamı ister misin?" diye sorar.

#### Aşama 3 — Rollback
- Her başarılı uygulama sonrası "Geri Al" butonu aktif kalır (10 adım)
- Rollback: ilgili dosyaların önceki halini undo stack'ten restore eder
- Rollback sırasında başka bir değişiklik yapılmışsa, çakışma kullanıcıya bildirilir
- Rollback işlemi de audit log'a yazılır

### Gerekçe
Bu model güveni arayüz düzeyinde inşa eder. Kullanıcı "ne olacağını" görmeden "tamam" demek zorunda değildir. Bu, araştırma sorusunun "kullanıcı güveni" boyutunu doğrudan ele alır.

### Trade-off
Her değişiklik için diff göstermek, basit işlemlerde (örn. tek satır değişikliği) ekstra tıklama gerektiriyor gibi görünebilir. Uzun vadede "onaydan yorulma" riskini doğurabilir. Bu risk tezde ölçülmeli ve raporlanmalıdır.

### Yanlış yapılırsa ne bozulur?
"Onay mekanizması ekleyelim" deyip diff göstermeden yalnızca "Uygulayayım mı?" sorusu sormak, anlamlı bir onay değildir. Kullanıcı neyi onayladığını bilmeden "Evet" derse, güven mekanizması kağıt üzerinde kalır.

---

## 11. Değerlendirme Metrikleri

### Öneri: Dört Boyutlu Değerlendirme Çerçevesi

#### Boyut 1 — Görev Başarı Oranı (Task Success Rate)
**Tanım:** Ajan tarafından üretilen değişikliğin, hedeflenen işlevsel sonucu doğru şekilde gerçekleştirip gerçekleştirmediği.  
**Ölçüm:** Her benchmark görevi için: Başarılı / Kısmen Başarılı / Başarısız  
**Başarı kriteri:** Değişiklik uygulandıktan sonra görev tanımındaki koşulları karşılıyor mu?  
**Hedef:** ≥ %60 tam başarı (20 görev üzerinden)

#### Boyut 2 — Güvenlik İhlali Oranı (Safety Violation Rate)
**Tanım:** Ajanın hedef dışı dosyaları değiştirmeye çalışması, korumalı dosyalara erişmesi veya onaysız değişiklik yapması.  
**Ölçüm:** 20 görev içinde güvenlik ihlali girişimi sayısı  
**Hedef:** 0 başarılı ihlal (girişimler loglanır ve önlenir)

#### Boyut 3 — Kullanıcı Geri Alma Oranı (Rollback Rate)
**Tanım:** Kullanıcının onay verdikten sonra değişikliği geri aldığı durumların oranı.  
**Ölçüm:** Uygulanan değişiklikler içinde geri alınan değişikliklerin yüzdesi  
**Yorum:** Yüksek rollback oranı → ya ajan kalitesi düşük ya da diff yeterince anlaşılır değil  
**Hedef:** ≤ %20 rollback oranı

#### Boyut 4 — Hallucination Oranı (Factual Accuracy)
**Tanım:** Ajanın var olmayan fonksiyon, dosya veya sembol atfetmesi.  
**Ölçüm:** Her Q&A görevi için yanlış atıf sayısı / toplam atıf sayısı  
**Hedef:** ≤ %15 yanlış atıf

#### İkincil Metrikler (Tez için ek veri)
- Ortalama yanıt gecikmesi (ms): bulut model vs. yerel model
- Context retrieval doğruluğu: sorguyla alakalı dosyaların "ilk 5 sonuç"ta bulunma oranı
- Token verimliliği: retrieval yaklaşımı vs. tüm dosya gönderme karşılaştırması

### Gerekçe
Bu çerçeve, araştırma sorusunun her boyutunu bir metrikle eşleştirir. Sonuçlar hem nicel (oranlar, süreler) hem nitel (kullanıcı davranış örüntüleri) veri sağlar.

### Trade-off
Dört boyut ayrı ayrı kodlanacak ölçüm altyapısı gerektirir. Basitçe "başarılı mı, değil mi" diye ölçmek daha kolaydır ama jüri önünde savunulamaz.

### Yanlış yapılırsa ne bozulur?
Tek metrik (görev başarı oranı) kullanılırsa, ajan başarılı bir değişiklik yaparken korumalı dosyayı da değiştirse bu görünmez. Güvenli olmayan ama "başarılı" görünen sistem üretilmiş olur.

---

## 12. Benchmark / Görev Tasarımı

### Öneri: 20 Görevlik Standart Benchmark Seti

**Tasarım ilkeleri:**
1. Görevler dışarıdan tasarlanır — projeyi geliştiren kişi (tez öğrencisi) tarafından değil; tercihan danışman veya projeyi tanımayan üçüncü bir kişi tarafından
2. Her görev için beklenen çıktı önceden belgelenir
3. Değerlendirme kör (blind) yapılır: ajan çıktısı anonimleştirilmiş şekilde başka bir kişi tarafından puanlanır
4. Karşılaştırma noktası (baseline): aynı görev, araçsız geliştirici tarafından yapılır

**Görev Kategorileri:**

| Kategori | Görev Sayısı | Örnek Görevler |
|---|---|---|
| Tek dosya düzenleme | 5 | Fonksiyon yeniden adlandırma, tip düzeltme, yorum ekleme |
| Çok dosya refactor | 4 | Import yolu değiştirme, interface güncelleme, sabiti merkezi yere taşıma |
| Hata tespiti ve düzeltme | 4 | Null pointer, eksik async/await, yanlış parametre sırası |
| Test yazma | 3 | Verilen modül için birim testleri, edge case'ler dahil |
| Kod tabanı Q&A | 4 | "Bu projede auth nasıl çalışıyor?", "Bu fonksiyon nerede kullanılıyor?" |

**Test projesi:** Orta büyüklükte (~3.000 satır), 15–20 dosyalı, TypeScript tabanlı örnek bir uygulama. Gerçek açık kaynak projeden türetilir (lisans uyumlu).

**Değerlendirme formu:** Her görev için:
- Doğru dosya/satırlar değiştirildi mi? (0/1)
- Değişiklik derleniyor mu? (0/1)
- Değişiklik görev tanımını karşılıyor mu? (0/1/2 — kısmen doğru için 1)
- Hedef dışı dosya değiştirildi mi? (ihlal olarak kayıt)

### Gerekçe
20 görev istatistiksel olarak çok büyük değil ama tek geliştirici tezi için makul bir örneklemdir. Dışarıdan tasarlanmış görevler jürinin "kendi sınavınızı kendiniz geçtiniz" eleştirisini engeller.

### Trade-off
20 görev, ajan davranışının tüm boyutlarını kapsamaz. Ancak 50+ görev hazırlamak ve değerlendirmek tez süresinin önemli bir kısmını tüketir.

### Yanlış yapılırsa ne bozulur?
Görevleri ajan geliştiricisi tasarlarsa, bilinçsiz olarak ajanın iyi performans gösterdiği görev türleri seçilir. Bu akademik açıdan geçersiz bir değerlendirme üretir.

---

## 13. Teknik Riskler ve Azaltma Planları

| Risk | Olasılık | Etki | Azaltma Planı | B Planı |
|---|---|---|---|---|
| **Electron bellek kullanımı VS Code'u aşıyor** | Yüksek | Orta | Electron süreç mimarisini doğru kur; renderer'da ağır işlem yapma; erken performans ölçümü | Demo için yeterli RAM'li makinede çalıştır; tezde sınır olarak belgele |
| **Context retrieval alakasız dosyalar döndürüyor** | Orta | Yüksek | Precision/recall metriği erken ölç; manuel validation seti oluştur | Kullanıcıya "context'i düzelt" arayüzü sun (katman 3) |
| **Bulut API maliyeti bütçeyi aşıyor** | Orta | Düşük | Günlük harcama limiti (hard cap); token sayacı dashboard | Yerel modele geç; bulut özelliklerini teze "maliyet analizi" olarak ekle |
| **Model güncellenmesi prompt'ları bozuyor** | Orta | Yüksek | Model versiyonunu kilitle; prompt şablonları versionlanmış dosyada tut | Kilitli eski versiyona geri dön; güncellemeyi tez bitiminde yap |
| **TypeScript/Electron öğrenme süresi uzuyor** | Yüksek | Yüksek | İlk 2 ay tamamen öğrenme + basit prototip'e ayır; ajan kodu başlangıçta yok | Electron yerine Tauri (Rust) değil; daha basit bir Electron şablonu kullan |
| **Undo stack çok dosyalı senaryoda tutarsızlaşıyor** | Düşük | Yüksek | Undo'yu transaction tabanlı modellemek; test kapsamını erken yaz | Rollback özelliğini MVP'den çıkar, sadece "dosyayı geri yükle" sun |
| **Güvenlik duvarı bypass edilebiliyor** | Düşük | Çok Yüksek | Her yeni araç eklenmeden önce güvenlik incelemesi; path traversal testleri | Araç erişimini tamamen kapat; okuma moduna geç |
| **Benchmark görevi tasarımı taraflı çıkıyor** | Orta | Yüksek | Görevleri danışman veya sınıf arkadaşı tasarlasın | Açık kaynak benchmark seti kullan (SWE-bench mini gibi) |

### Gerekçe
Risk tablosu, proje boyunca haftalık danışman toplantılarında kontrol listesi olarak kullanılmalıdır. Her risk için "B planı" hazır olmak, tez savunmasında "Bu sorunu nasıl çözerdинiz?" sorusuna hazırlıklı olmak demektir.

### Trade-off
Tüm riskleri sıfıra indirmek mümkün değildir. Hedef, yüksek etki + yüksek olasılık kombinasyonlarını yönetilebilir hale getirmektir.

### Yanlış yapılırsa ne bozulur?
Risk tablosu hazırlanıp bir kez "bakıldıktan" sonra rafa kaldırılırsa, riskler gerçekleştiğinde plansız yakalanılır. Risk kaydı canlı bir dokümandır.

---

## 14. 18 Aylık Geliştirme Roadmap'i

### Genel Yapı

```
Ay 1–3   │ Zemin (Foundation)
Ay 4–6   │ Editör Çekirdeği (Editor Core)
Ay 7–10  │ Ajan Döngüsü (Agent Loop)
Ay 11–15 │ Güvenlik ve Değerlendirme (Safety & Evaluation)
Ay 16–18 │ Tez ve Final (Thesis & Final)
```

---

### Ay 1–3: Zemin

**Hedef:** Proje çalışır durumda, mimari kararlar verilmiş, teknoloji öğrenilmiş.

**Yapılacaklar:**
- [ ] TypeScript ve Electron temellerini öğren (resmi dokümantasyon + 2-3 mini proje)
- [ ] Monaco Editor'ü Electron içinde çalıştır (merhaba dünya seviyesi)
- [ ] Dosya aç / kaydet / sekme yönetimi (en fazla 5 sekme)
- [ ] `nomic-embed-text` ile basit embedding demosu (5 dosyalık proje)
- [ ] SQLite + `sqlite-vec` kurulumu ve 100 dosyalık indeks testi
- [ ] Mimari karar belgesi: tüm seçenekler karşılaştırılmış, seçilen yol netleştirilmiş
- [ ] Danışman gösterisi: "Bu küçük editör açılıyor ve dosya açabiliyor"

**Çıktı:** Çalışan bir Electron + Monaco shell; çalışan bir embedding indeksi.

**Ne yapılmaz:** Ajan kodu yok, AI entegrasyonu yok, güvenlik kodu yok.

---

### Ay 4–6: Editör Çekirdeği

**Hedef:** Kod yazılabilir, stabil bir editör. AI henüz yok ama altyapı hazır.

**Yapılacaklar:**
- [ ] Dosya ağacı (klasör açma, yenileme, arama)
- [ ] Sözdizim vurgulama (Monaco dil desteği aktivasyonu)
- [ ] Durum çubuğu (aktif dosya, satır/sütun, encoding)
- [ ] Model soyutlama katmanı: Claude API + Ollama API aynı interface'i implemente etsin
- [ ] Basit chat panel: kullanıcı metin yazar, model yanıt verir (hiçbir dosya değişmez)
- [ ] Bağlam motoru v1: aktif dosya + import listesi
- [ ] `.agentignore` mekanizması

**Çıktı:** Kullanılabilir bir editör + AI'ın cevap verdiği bir sohbet paneli.

**Ne yapılmaz:** Dosya yazma yok, diff yok, ajan döngüsü yok.

---

### Ay 7–10: Ajan Döngüsü

**Hedef:** Ajan değişiklik önerebilir, kullanıcı onaylar, değişiklik uygulanır.

**Yapılacaklar:**
- [ ] Tool sistemi: `read_file`, `write_file`, `search_symbols`, `list_files`
- [ ] `write_file` güvenlik katmanları (workspace boundary, path normalization, write boundary / gizli dosya filtresi)
- [ ] Diff üretimi (unified diff → Monaco'da görsel diff)
- [ ] Onay akışı: tek dosya ve çok dosya senaryoları
- [ ] Undo stack: son 10 değişiklik seti
- [ ] Bağlam motoru v2: embedding retrieval entegrasyonu
- [ ] Audit log: `~/.agentide/audit.jsonl`

**Çıktı:** Senaryo 1 (hata düzeltme) ve Senaryo 5 (tek dosya düzenleme) çalışıyor.

---

### Ay 11–15: Güvenlik ve Değerlendirme

**Hedef:** Tüm benchmark senaryoları çalışıyor; ölçüm altyapısı hazır; güvenlik testleri geçilmiş.

**Yapılacaklar:**
- [ ] Çok dosyalı refactor desteği (Senaryo 2)
- [ ] Test yazma modu (Senaryo 3)
- [ ] Q&A modu — sadece açıklama, dosya değişikliği yok (Senaryo 4)
- [ ] Güvenlik test paketi: path traversal, gizli dosya erişim girişimi, büyük repo testi
- [ ] Benchmark görev setinin hazırlanması (danışman/dışarıdan kişi tarafından)
- [ ] Benchmark çalıştırma protokolü
- [ ] Performans ölçümü: bellek kullanımı, yanıt gecikmesi
- [ ] Token verimliliği analizi: retrieval vs. tüm dosya gönderme

**Çıktı:** 20 benchmark görevi çalıştırılmış, sonuçlar ölçülmüş ve kaydedilmiş.

---

### Ay 16–18: Tez ve Final

**Hedef:** Tez yazılmış, demo hazır, savunma yapılmış.

**Yapılacaklar:**
- [ ] Tez yazımı (ölçüm sonuçları, bulgular, tartışma)
- [ ] Demo senaryosu hazırlığı (5 dakikalık canlı demo akışı)
- [ ] Bilinen sınırlar bölümü: ne yapılamadı, neden
- [ ] Gelecek çalışmalar: terminal entegrasyonu, proaktif analiz araştırması, multi-agent hipotezi
- [ ] Savunma sunumu hazırlığı
- [ ] Kaynak kodu teslimi + kurulum kılavuzu

**Çıktı:** Savunulmuş tez, çalışan sistem, dokümante edilmiş kaynak kodu.

---

## Özet: Projeyi Kurtaran 5 Karar

Bu özet bölümü, tüm belgeden çıkan en kritik kararlardır.

---

### Tek Cümlelik Net Proje Tanımı

> **"Güvenli, açıklanabilir ve kullanıcı onaylı bir ajan döngüsü kullanan AI destekli kod editörü; çok dosyalı değişikliklerde hata oranını ve güven düzeyini, doğrudan LLM çıktısına kıyasla ölçmektedir."**

---

### En Savunulabilir Akademik Araştırma Sorusu

> **"Kullanıcı tetiklemeli, plan-önce-onay-sonra bir ajan döngüsü, çok dosyalı kod değişikliklerinde güvenlik ihlali oranını ve kullanıcı rollback davranışını, doğrudan LLM uygulamasına kıyasla istatistiksel olarak anlamlı biçimde iyileştirir mi?"**

---

### En Mantıklı MVP Feature Set

1. Electron + Monaco editör shell (dosya aç/kaydet/sekme)
2. Katmanlı bağlam motoru (aktif dosya + embedding retrieval)
3. Kullanıcı tetiklemeli ajan döngüsü (ReAct: gözlemle → planla → onay al → uygula)
4. Çok dosyalı diff önizleme + onay akışı
5. Undo stack (son 10 değişiklik)
6. Güvenlik katmanları (workspace boundary + path normalization + write boundary + reactive safety warnings + audit log)
7. 2 model sağlayıcısı (Claude + Ollama) soyutlama katmanı üzerinden

---

### İlk 3 Ayda Yapılacak İşler

1. **TypeScript + Electron öğrenimi** — resmi dokümanlar + 2 mini proje (2 hafta)
2. **Monaco'yu Electron içinde çalıştır** — merhaba dünya (1 hafta)
3. **Dosya aç/kaydet/sekme** — temel editör işlevi (3 hafta)
4. **Embedding demo** — `nomic-embed-text` + SQLite + `sqlite-vec` ile 5 dosyalık indeks (2 hafta)
5. **Mimari karar belgesi** — seçenekler karşılaştırılmış, yol netleştirilmiş (1 hafta)
6. **Danışman gösterisi** — çalışan editör shell + embedding demosu (hafta 12)

**Ay 3 sonunda elimizde olması gereken:** Dosya açabilen bir editör ve 5 dosyalık bir proje üzerinde embedding araması yapabilen ayrı bir demo scripti. Ajan kodu henüz yok.

---

### Kesin Çıkarılması Gereken Özellikler

| Özellik | Neden Çıkarılmalı |
|---|---|
| Proaktif / otomatik ajan analizi | Alert fatigue, araştırma sorusuyla ilgisi yok, UX güvenini zedeler |
| Multi-agent mimari | Tamamlanamaz karmaşıklık, single-agent yeterli |
| Terminal / shell komut çalıştırma | Shell injection riski, güvenlik modeli hazır değil |
| 3+ model sağlayıcısı | Soyutlama katmanı yeterli, her sağlayıcı ayrı hata yönetimi istiyor |
| VS Code extension desteği | Yıllarca sürecek geriye dönük uyumluluk mühendisliği |
| Tüm repo'yu tek seferde context'e almak | Context window aşımı + token maliyeti + sinyal-gürültü problemi |
| Git entegrasyonu | Kapsam dışı, undo stack yeterli |
| Otomatik CI/CD ve installer | Demo için `npm run dev` yeterli |

---

*Sistem kararları için → bu belge.*  
*Ürün kararları için → `PRODUCT_PLAN.md`*
