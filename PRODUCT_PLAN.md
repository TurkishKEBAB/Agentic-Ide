# ÜRÜN PLANLAMA BELGESİ (PRODUCT_PLAN)

> **Belge amacı:** Bu belge, Agentic IDE lisans bitirme projesinin ürün boyutunu tanımlar.  
> Kime, ne için, hangi kapsamda yapılacağını netleştirir.  
> Teknik kararlar için → `SYSTEM_PLAN.md`

---

## 1. Problem Tanımı

### Öneri
Geliştiriciler bugün iki ayrı bağlamda çalışmak zorunda kalır: editör ve AI araç. Kod yazarken yapay zeka yardımı almak için editörden çıkıp ChatGPT/Claude'a gitmek, aktif bağlamı (açık dosyalar, hata mesajı, proje yapısı) elle taşımayı gerektirir. Bu bağlam kırılması hem zaman kaybına hem de yanlış veya eksik önerilere yol açar. Var olan editör entegrasyonları (GitHub Copilot, Cursor) bu boşluğu kapatmaya çalışır; ancak iki temel eksiklikleri vardır: (a) değişiklik yapma sürecinde yeterli güvenlik ve şeffaflık sunamazlar, (b) projenin bütününü gerçek anlamda anlayan bir bağlam motoru yerine token bazlı tahmin kullanırlar.

### Gerekçe
Bu problem ölçülebilirdir, gerçektir ve akademik açıdan incelenmemiş bir alt sorunu vardır: "Bir AI ajanı, güvenli ve açıklanabilir şekilde çok dosyalı bir kod değişikliği yapabilir mi?"

### Trade-off
Problemi çok geniş tanımlamak kapsam şişmesine yol açar. Çok dar tanımlamak (örn. yalnızca tek dosya düzenleme) akademik katkıyı zayıflatır.

### Yanlış yapılırsa ne bozulur?
Problem "Copilot gibi bir şey yapalım" olarak tanımlanırsa, tezin araştırma sorusu belirsizleşir ve jüri "Neden bunu yapmak gerekiyordu?" sorusunu yanıtsız bırakır.

---

## 2. Akademik Katkı / Araştırma Sorusu

### Öneri
**Ana araştırma sorusu:**  
> "Kullanıcı tetiklemeli, plan-önce-onay-sonra (plan-first, approval-gated) bir ajan döngüsü, çok dosyalı kod değişikliklerinde hata oranını ve kullanıcı güvenini, doğrudan LLM çıktısına kıyasla ölçülebilir biçimde iyileştirir mi?"

**Alt araştırma soruları:**
1. Semantik retrieval (RAG + AST sembolleri) ile naif tam-dosya gönderme karşılaştırıldığında, doğruluk ve token maliyeti nasıl değişir?
2. Diff önizleme + rollback mekanizması, kullanıcının ajanı reddedip yeniden istek yapma davranışını nasıl etkiler?

### Gerekçe
Bu soru ölçülebilir, karşılaştırılabilir ve tek bir araç tarafından 1.5 yılda yanıtlanabilir. Jüri "Ne öğrendik?" sorusuna net bir cevap var.

### Trade-off
Araştırma sorusunu çok geniş tutmak (örn. "En iyi AI editörü nedir?") cevapla-namaz hale getirir. Çok dar tutmak (örn. "Tek dosyada renk değiştirmek") anlamlı katkı üretmez.

### Yanlış yapılırsa ne bozulur?
Araştırma sorusu yoksa ya da ölçülemeyen bir soruya dönüşürse, tez savunmasında metodoloji bölümü çöker. Jüri "Başarı kriterlerinizi kendiniz belirleyip kendiniz geçtiniz" der.

---

## 3. Hedef Kullanıcı

### Öneri
**Birincil hedef kullanıcı:** Orta seviye bir yazılım geliştirici (2–5 yıl deneyim). Henüz büyük ölçekli refaktorlara güvenle girişemeyen, AI önerilerini körü körüne uygulamak yerine anlamak isteyen, güven duyduğu araçları aktif olarak kullanan profil.

**İkincil hedef kullanıcı:** Tez değerlendirmesi için katılımcı olan bilgisayar mühendisliği öğrencileri (3.–4. sınıf). Benchmark çalışması için kontrollü grup oluşturulabilir.

**Hedef DIŞI kullanıcılar (MVP için):**
- Üst düzey mühendisler (Cursor/Copilot zaten yeterli ve daha olgun)
- Non-teknik kullanıcılar
- Mobil geliştiriciler (farklı toolchain gereksinimleri)

### Gerekçe
Hedef kullanıcı ne kadar net tanımlanırsa, hangi özelliklerin öncelikli olduğu o kadar netleşir. "Herkes için araç" hiç kimse için araç demektir.

### Trade-off
Dar hedef kullanıcı tanımı, ürünün büyüme potansiyelini limitleyebilir gibi görünse de 1.5 yıllık bir tez projesi için bu sınır zorunludur.

### Yanlış yapılırsa ne bozulur?
Hedef kullanıcı belirsiz kalırsa, UX kararları sürekli tartışmaya açık hale gelir. "Bunu bir kıdemli geliştirici sever mi?" ve "Bir öğrenci anlayabilir mi?" soruları aynı anda cevaplanamaz.

---

## 4. Temel Kullanım Senaryoları

Aşağıdaki 5 senaryo MVP kapsamını oluşturur. Her biri bağımsız olarak değerlendirilebilir ve ölçülebilir bir çıktı üretir.

### Senaryo 1: Hata Tespiti ve Düzeltme Önerisi
**Kullanıcı:** "Şu fonksiyon çalışmıyor, neyi düzeltemem gerek?"  
**Ajan:** Aktif dosyayı ve ilgili sembolleri okur → olası hatayı tespit eder → değişiklik planını diff olarak sunar → kullanıcı onaylar → değişiklik uygulanır.  
**Başarı kriteri:** Ajan doğru dosyayı, doğru satırı değiştirir.

### Senaryo 2: Çok Dosyalı Refactor
**Kullanıcı:** "Bu fonksiyonu yeniden adlandır, tüm kullanımları güncelle."  
**Ajan:** Repo'yu tarayarak tüm referans noktalarını bulur → hangi dosyaların değiştirileceğini listeler → kullanıcı onaylar → atomik olarak uygular.  
**Başarı kriteri:** Hiçbir referans atlanmaz, yanlış dosya değiştirilmez.

### Senaryo 3: Test Yazma
**Kullanıcı:** "Bu modül için birim testleri yaz."  
**Ajan:** Fonksiyon imzalarını ve davranışını analiz eder → test dosyası önerir → kullanıcı inceler ve onaylar.  
**Başarı kriteri:** Üretilen testler derlenir ve temel senaryoları kapsar.

### Senaryo 4: Kod Tabanını Anlama (Q&A)
**Kullanıcı:** "Bu projede authentication nasıl çalışıyor?"  
**Ajan:** Alakalı dosyaları retrieval ile bulur → doğal dil açıklaması üretir → hangi dosyalardan bilgi aldığını gösterir.  
**Başarı kriteri:** Doğru dosyalar atıflanır, yanıt tutarlıdır.

### Senaryo 5: Güvenli Tek Dosya Düzenleme
**Kullanıcı:** "Bu CSS dosyasındaki renkleri design token'larına çevir."  
**Ajan:** Değişiklik planını oluşturur → diff gösterir → onay alır → uygular → rollback seçeneği aktif kalır.  
**Başarı kriteri:** Yalnızca hedef dosya değişir, başka dosyaya dokunulmaz.

### Gerekçe
Bu 5 senaryo hem gerçek kullanım değeri taşır hem de benchmark görevlerini doğrudan besler. Her biri için başarı kriteri net olduğundan akademik ölçüm mümkündür.

### Trade-off
Daha fazla senaryo eklemek değerlendirme kapsamını genişletir ama geliştirme süresini tüketir. Bu 5 senaryo 1.5 yıl için maksimum sınırı temsil eder.

### Yanlış yapılırsa ne bozulur?
Kullanım senaryoları tanımlanmazsa, hangi özelliklerin yapılıp yapılmayacağı sürekli müzakereye açık kalır. Her sprint'te "acaba bunu da yapsak mı?" sorusu yeniden gündeme gelir.

---

## 5. MVP Kapsamı

MVP'nin tanımı: **18 ay sonunda jüri önünde canlı olarak çalıştırılabilir, akademik araştırma sorusunu yanıtlayacak yeterli veriye sahip, stabil bir sistem.**

### MVP'ye Dahil Olan Özellikler

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

#### Model Entegrasyonu
- 1 bulut sağlayıcı (Anthropic Claude — API üzerinden)
- 1 yerel sağlayıcı (Ollama — Llama3 veya benzeri)
- Model seçimi kullanıcı tercihine bırakılır
- Soyutlama katmanı: yeni sağlayıcı eklemek tek dosya değişikliği olsun

### Gerekçe
Bu kapsam, araştırma sorusunu yanıtlamak için gereken minimum işlevsel sistemi oluşturur. Her özellik doğrudan bir benchmark görevi ya da güvenlik gereksinimini karşılar.

### Trade-off
Kapsam bu şekilde tutulursa, editörün görsel zenginliği (temalar, extension desteği, multi-panel layout) eksik kalır. Bu trade-off bilinçli ve savunulabilirdir: araç görünümü değil, ajan davranışı araştırılmaktadır.

### Yanlış yapılırsa ne bozulur?
MVP kapsamı genişlerse (her toplantıda "şunu da ekleyelim"), 18. ayda yarım kalmış özellikler listesi ortaya çıkar ve demo güvenilmez hale gelir.

---

## 6. MVP Dışı Bırakılacak Özellikler

Aşağıdaki özellikler **ilk sürümde kesinlikle yapılmayacaktır.** Her biri için neden çıkarıldığı ve ne zaman yeniden değerlendirilebileceği belirtilmiştir.

| Özellik | Neden Dışarıda | Ne Zaman Yeniden Değerlendir |
|---|---|---|
| **Proaktif / otomatik analiz** | Alert fatigue riski; araştırma sorusuyla ilgisi yok; UX güven sorunlarına yol açar | Asla MVP'de olmayacak; ikinci proje olarak ayrı araştırılabilir |
| **Multi-agent mimari** | Koordinasyon karmaşıklığı; tek ajan döngüsü araştırma sorusunu yanıtlamaya yeterli | Single-agent sınırlarına ulaşıldıktan sonra, tez sonrası çalışma olarak |
| **3+ model sağlayıcısı** | Her API farklı hata yönetimi gerektirir; soyutlama katmanı yeterlidir | Tez bitiminden sonra topluluk katkısı olarak |
| **VS Code extension uyumluluğu** | Yıllarca sürecek geriye dönük uyumluluk mühendisliği | Hiçbir zaman bu proje kapsamında değil |
| **Debug adaptörü (DAP)** | Tam bir geliştirme döngüsü için değerli ama araştırma sorusuyla ilgisi yok | Tez sonrası ürün geliştirme aşaması |
| **Terminal entegrasyonu** | Shell injection riski; güvenlik modeli için ek karmaşıklık; MVP'de komut çalıştırma yok | Yalnızca güvenlik modeli olgunlaştıktan sonra, seçmeli |
| **Git entegrasyonu (commit, push)** | Kapsam dışı; rollback için kendi undo stack'imiz yeterli | Tez sonrası |
| **Tema / görsel özelleştirme** | Monaco varsayılan teması yeterli; kozmetik özellikler araştırma zamanı çalar | Tez bitiminden sonra |
| **Otomatik paketleme / installer** | Demo için `npm run dev` yeterli; `.exe` üretimi gereksiz erken yatırım | Savunma öncesi son ay |
| **Bulut sync / hesap sistemi** | Gizlilik ve altyapı karmaşıklığı; tez projesi için overkill | Hiçbir zaman bu proje kapsamında değil |
| **Tüm repo'yu tek seferde context'e almak** | Context window aşımı + token maliyeti + sinyal-gürültü sorunu | Araştırma hipotezi olarak belgelenebilir ama default yaklaşım olamaz |

### Gerekçe
Her "hayır" kararı, asıl araştırma sorusuna "evet" demek için ayrılan süreyi korur. Bu liste danışman toplantılarında kapsam genişleme baskısına karşı referans belge olarak kullanılmalıdır.

### Trade-off
Bu kısıtlamalar, projenin tam özellikli bir IDE olarak piyasaya sürülmesini engeller. Ancak bu bir tez projesidir, ürün lansmanı değil.

### Yanlış yapılırsa ne bozulur?
"Bir özellik daha eklemek 1 haftadan fazla sürmez" düşüncesi birikirse, 6 ay içinde kaybolan zaman bütçesiyle karşılaşılır. Kapsam kontrolü disiplin işidir.

---

*Ürün kararları için → bu belge.*  
*Teknik ve mimari kararlar için → `SYSTEM_PLAN.md`*
