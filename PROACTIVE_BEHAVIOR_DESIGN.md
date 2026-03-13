# PROAKTİF DAVRANIŞ TASARIMI (PROACTIVE_BEHAVIOR_DESIGN)

> **Belge amacı:** Bu belge, Agentic IDE'de kullanıcı prompt yazmadan tetiklenen AI davranışlarının
> ürün ve UX tasarımını tanımlar. Hangi durumlarda konuşulacağını, hangi durumlarda sessiz
> kalınacağını ve kontrolün her zaman kullanıcıda kalmasını nasıl sağlayacağını açıklar.  
> Mimari bağlam için → `SYSTEM_PLAN.md`  
> Agent mimarisi için → `AGENT_ARCHITECTURE_ANALYSIS.md`  
> Temel UX akışı için → `UX_AND_INTERACTION.md`

---

## Temel Tasarım Gerilimi

Proaktif AI davranışı iki zıt riski dengeler:

```
   Çok fazla konuşursa:              Hiç konuşmazsa:
   ─────────────────────             ──────────────────
   Alert fatigue                     Önlenebilir hatalar engellenmez
   Güvensizlik ("AI yanılıyor")      Katma değer kaybolur
   Üretkenlik kaybı ("dur bakalım")  Araştırma sorusu zayıflar
   Spam hissi → sistem kapatılır     Reaktif araçtan farkı kalmaz
```

Her tasarım kararı bu gerilimi çözmeyi hedefler.

---

## 1. Proaktif Davranış İlkeleri

### Öneri
Beş ilke tüm proaktif davranışı yönetir:

**İlke 1 — Yalnızca Yüksek Güven Eşiğinde Konuş**  
Sistem, bulgu güvenilirliği **≥ 0.85** olmadıkça kullanıcıya hiçbir şey göstermez.
Güven eşiğini kullanıcı ayarlayabilir (düşük / orta / yüksek). Varsayılan: **orta (0.85)**.

**İlke 2 — Gözlemle, Yargılama Değil**  
Proaktif mesajlar "Bu kod yanlış" değil, "Bu kod şunu yapıyor gibi görünüyor" tonunda olur.
Asla `HATA:` prefixiyle başlamaz — bu ton kullanıcıyı savunmacı kılar.

**İlke 3 — Akışı Kesmeden Bildir**  
Hiçbir proaktif mesaj kullanıcının odaklandığı işlemi durdurmaz veya engel çıkarmaz.
Tüm uyarılar **non-blocking**: kapatılabilir, ertelenebilir, kalıcı olarak susturulabilir.

**İlke 4 — Bir Seferde En Fazla Bir Uyarı**  
Kullanıcı aynı anda en fazla **bir** proaktif mesaj görür. Sıradaki mesaj, önceki
kapatılmadan gösterilmez (queue + debounce mekanizması).

**İlke 5 — Her Uyarı İzlenebilir ve Geri Alınabilir**  
Her proaktif mesaj, "neden bu öneriyi yaptım?" açıklamasına sahiptir.
Kullanıcı "Bunu bir daha gösterme" diyebilir ve sistem bunu `preferences.json`'a kaydeder.

### Gerekçe
Bu ilkeler; Google Keep, Clippy, GitHub Copilot ve Grammarly'nin kullanıcı araştırmaları
üzerine kurgulanmıştır. Alert fatigue'in başladığı nokta, uyarı sıklığından çok
**uyarı alaka düzeyi düşüklüğüdür.** Kullanıcı bir uyarıyı yanlış bulduğunda, sistemin
diğer uyarılarına da güveni azalır.

### Trade-off
Yüksek güven eşiği bazı gerçek hataların sessizce geçmesine yol açabilir. Ancak bu,
yanlış pozitifin güven zedelemesinden daha az maliyetlidir. Kullanıcı güven eşiğini
düşürebilir ve bu bir tercihtir — sistem zorla düşürülmez.

### Yanlış yapılırsa ne bozulur?
Güven eşiği olmadan tüm düşük güvenli bulgular gösterilirse: kullanıcı ilk haftada
sistemi "sürekli yanlış uyarı veriyor" olarak etiketler ve panel kapatılır. Bu noktadan
sonra hiçbir uyarı — doğru olanlar dahil — görülmez.

---

## 2. Trigger Türleri

### Öneri
Proaktif tetikleyiciler iki ana kategoride gruplandırılır: **güvenlik odaklı** ve **kalite odaklı**.

### 2A. Güvenlik Odaklı Tetikleyiciler (Her Zaman Aktif)

| Tetikleyici | Açıklama | Gecikme | Öncelik |
|---|---|---|---|
| **SECRET_DETECTED** | Açık dosyada API key, token, şifre pattern'i algılandı | Anında (< 500ms) | Kritik |
| **PROTECTED_FILE_OPEN** | `.env`, `id_rsa`, `*.pem` gibi korumalı dosya editörde açıldı | Anında | Kritik |
| **LARGE_EDIT_PREVIEW** | Kullanıcı bir AI eylemini onaylamak üzere; değişiklik 10+ dosyayı etkiliyor | Onay öncesi | Yüksek |
| **ROLLBACK_AVAILABLE** | Son AI değişikliğinden bu yana 5 dakika geçti, rollback hâlâ mümkün | 5 dakika sonra | Düşük |

### 2B. Kalite Odaklı Tetikleyiciler (Kullanıcı Tercihine Göre Aktif/Pasif)

| Tetikleyici | Açıklama | Gecikme | Varsayılan |
|---|---|---|---|
| **SYNTAX_ERROR** | Editördeki dosyada dil sunucusu syntax hatası bildirdi | 3 saniye yazma duraksadıktan sonra | Aktif |
| **DEAD_CODE** | Çağrılmayan fonksiyon / import algılandı (statik analiz) | Dosya kaydedildiğinde | Pasif |
| **LONG_FUNCTION** | Bir fonksiyon 60+ satırı aştı | Dosya kaydedildiğinde | Pasif |
| **DUPLICATE_LOGIC** | Mevcut codebase'de çok benzer bir fonksiyon tespit edildi (embedding similarity > 0.9) | Dosya kaydedildiğinde | Pasif |
| **TODO_COMMENT** | `// TODO` veya `// FIXME` içeren satır eklendi | Anında | Aktif |
| **TEST_MISSING** | Yeni bir public fonksiyon eklendi ama test dosyasında karşılığı yok | Dosya kaydedildiğinde | Pasif |

### 2C. Sessiz Kalınan Durumlar (Proaktif Davranış Yoktur)

```
Kullanıcı şunları yaparken AI konuşmaz:
  ■ Dosya açma / kapatma
  ■ Klasör gezintisi
  ■ Kopyala / yapıştır
  ■ Yorum satırı yazma
  ■ Boş satır ekleme / silme
  ■ Dosya yeniden adlandırma (AI-tetiklemeli değilse)
  ■ Terminalde komut çalıştırma (MVP'de terminal yok)
  ■ Son 2 dakika içinde zaten bir uyarı gösterilmişse
  ■ Kullanıcı aktif olarak AI chat panelinde yazıyorsa
  ■ Dosya boyutu > 10.000 satır (analiz atlanır, performans nedeniyle)
```

### Gerekçe
Sessiz kalınan durumların listesi, tetikleyiciler listesi kadar önemlidir.
"Hangi durumlarda konuşmalı?" sorusunun doğru yanıtı, "Hangi durumlarda kesinlikle
konuşmamalı?" sorusu yanıtlanmadan tamamlanamaz.

### Trade-off
Kalite odaklı tetikleyicilerin varsayılan olarak pasif olması, yeni kullanıcıların
bu özelliği keşfetme oranını düşürür. Çözüm: ilk kullanım sırasında kurulum sihirbazı
"Hangi öneri türlerini görmek istersiniz?" sorusuyla aktif/pasif durumu netleştirir.

### Yanlış yapılırsa ne bozulur?
Tüm tetikleyiciler varsayılan olarak aktif yapılırsa, kullanıcı ilk 30 dakikada
kalite önerilerini "neden sürekli bir şeyler çıkıyor?" diye kapatır ve güvenlik
uyarılarını da aynı kapatma davranışıyla susturur. Güvenlik mesajları kumara gömülür.

---

## 3. Uyarı Öncelik Seviyeleri

### Öneri
Dört seviye, farklı görsel ve davranışsal ağırlığa sahiptir:

```
┌──────────────────────────────────────────────────────────────────────┐
│  SEVİYE 1 — KRİTİK (BLOCKING)                                       │
│  Görsel: Kırmızı banner, tam ekran genişliği, ikon: 🔴              │
│  Davranış: Editörün üstünde görünür. Kullanıcı kapatmadan       │
│             diğer işlemlere devam edemez. ("Non-blocking" ilkesinin  │
│             tek savunulabilir istisnasıdır: güvenlik hasarı geri     │
│             alınamaz, bu nedenle kullanıcı dikkatini zorunlu kılar.) │
│  Örnek: "Bu dosyada API anahtarı tespit ettim. Commit etmeden       │
│           önce kaldırmanızı şiddetle öneririm."                      │
│  Tetikleyiciler: SECRET_DETECTED, PROTECTED_FILE_OPEN               │
│  Neden blocking? → Güvenlik hasarı geri alınamaz.                   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  SEVİYE 2 — YÜKSEK (NON-BLOCKING, KALICI)                           │
│  Görsel: Turuncu yan panel notu, otomatik kapanmaz                  │
│  Davranış: Kullanıcı ilerleyebilir; mesaj kapatılana kadar durur    │
│  Örnek: "10 dosyayı etkileyen bu değişikliği onaylamak üzeresiniz.  │
│           Devam etmek istiyor musunuz?"                              │
│  Tetikleyiciler: LARGE_EDIT_PREVIEW                                  │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  SEVİYE 3 — ORTA (NON-BLOCKING, GEÇİCİ)                            │
│  Görsel: Sarı inline indicator, 8 saniye sonra otomatik solar        │
│  Davranış: Kullanıcıya "x" butonu + "Daha fazla bilgi" linki        │
│  Örnek: "Bu fonksiyonda syntax hatası var."                          │
│  Tetikleyiciler: SYNTAX_ERROR, TODO_COMMENT                          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  SEVİYE 4 — DÜŞÜK (SOFT SUGGESTION, KENAR ÇUBUĞU)                  │
│  Görsel: Mavi nokta, editör kenarında küçük ikon; hover ile görünür │
│  Davranış: Kullanıcı hoverlamamışsa varlığını bile bilmeyebilir      │
│  Örnek: "Bu fonksiyon için test oluşturmamı ister misiniz?"          │
│  Tetikleyiciler: DEAD_CODE, LONG_FUNCTION, DUPLICATE_LOGIC,         │
│                  TEST_MISSING, ROLLBACK_AVAILABLE                    │
└──────────────────────────────────────────────────────────────────────┘
```

### Gerekçe
Tüm uyarılar aynı görsel ağırlıkta olursa (hepsi pop-up ya da hepsi inline),
kullanıcı tehdit düzeyini ayırt edemez. Kritik uyarının tutarlı olarak kırmızı
ve yüksek görsel ağırlıkta olması, zamanla bir "Pavlov refleksi" yaratır:
kırmızı gördüğünde durar, mavi gördüğünde isteğe bağlı karar verir.

### Trade-off
Seviye 1'deki "blocking" davranış, non-blocking ilkesinin tek istisnasıdır.
Bu istisna bilinçli ve savunulabilirdir: secret commit hatasının geri alınma maliyeti
(GitHub geçmişi temizleme, token yenileme, potansiyel sızıntı) kullanıcıyı 5 saniye
durdurmaktan çok daha büyüktür.

### Yanlış yapılırsa ne bozulur?
Seviyeler karıştırılırsa (örn. soft suggestion de turuncu banner ile gelirse):
kullanıcı bannerları görmezden gelmeyi öğrenir. İlk gerçek SECRET_DETECTED
uyarısı da görmezden gelinir.

---

## 4. Önerilen UX Akışı

### Öneri
Proaktif mesajın tam yaşam döngüsü:

```
[TETIKLEYICI OLAYI]
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  DEBOUNCE + THROTTLE                                        │
│  - Son 2 dakikada uyarı gösterildi mi? → ATLA              │
│  - Kuyrukta başka mesaj var mı? → SIRAYA EKLE              │
│  - Güven skoru < eşik mi? → ATLA                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  MESAJ OLUŞTUR                                              │
│  - Seviye belirle (1/2/3/4)                                 │
│  - "Neden?" açıklaması ekle                                 │
│  - Aksiyon seçeneklerini hazırla (max 2 buton)              │
│    • [Birincil eylem] "Düzelt" / "İncele" / "Onayla"        │
│    • [İkincil] "Şimdi değil" / "Bunu gösterme"             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  GÖSTER                                                     │
│  Seviye 1: Blocking banner                                  │
│  Seviye 2: Yan panel notu                                   │
│  Seviye 3: Inline indicator, 8 sn sonra solar               │
│  Seviye 4: Kenar ikonu, hover ile açılır                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  KULLANICI YANITI                                           │
│  A) Birincil eylemi seçti → AI eylemi başlatır              │
│  B) "Şimdi değil" → Mesaj kapanır, 30 dk tekrar göstermez  │
│  C) "Bunu gösterme" → preferences.json'a yaz, kalıcı sustur │
│  D) Mesajı görmezden geldi → Seviye 3/4 otomatik solar      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  LOG                                                        │
│  audit.jsonl: {timestamp, trigger, level, action, skipped}  │
│  Bu log, benchmark ve araştırma analizi için kullanılır      │
└─────────────────────────────────────────────────────────────┘
```

**Mesaj dil kılavuzu — doğru ve yanlış tonlama:**

| ❌ Yanlış (yargılayıcı) | ✅ Doğru (gözlemleyici) |
|---|---|
| "Bu fonksiyon çok uzun, refactor etmelisin." | "Bu fonksiyon 73 satır. Parçalara bölmemi ister misiniz?" |
| "HATA: API anahtarı tespit edildi." | "Bu satırda API anahtarı gibi görünen bir string var." |
| "Test yazmayı unuttunuz." | "Bu yeni fonksiyon için test oluşturmamı ister misiniz?" |
| "Uyarı: Güvensiz kod." | "Bu pattern'i benzer bir güvenlik kaygısıyla ilişkilendirdim." |

### Gerekçe
Tonlama, güven kadar önemlidir. Kullanıcı araştırmaları (özellikle Grammarly ve Copilot
kullanıcı çalışmaları) göstermektedir ki, "zorunlu" veya "yargılayıcı" dilli uyarılar
kullanıcıda direnç yaratır ve aynı içerikli "sorumayan" tonlamadan daha sık kapatılır.

### Trade-off
"Sorumayan" tonlama (her şeyi soru ile bitirme) kullanıcıyı zamanla yorabilir.
Çözüm: Tekrar eden aynı tür öneriler için ton kısaltılır —
ilk gösterim: soru ("İster misiniz?"), sonraki gösterimler: kompakt ("Test oluştur →").

### Yanlış yapılırsa ne bozulur?
Tüm mesajlar aynı "yardımsever AI" tonlamasıyla yazılırsa, kritik güvenlik uyarıları
"öneri" olarak algılanır. "API anahtarı gibi görünüyor, isterseniz kaldırın?"
mesajı, "Bunu gösterme" ile kapatılır — ve key sızdırılır.

---

## 5. Yanlış Pozitifler ve Güven Zedelenmesi

### Öneri
Yanlış pozitif, sistem güvenini aşındıran en kritik faktördür ve **kümülatif etki** gösterir.

**Güven bozulma modeli:**

```
1. yanlış pozitif: "İlginç, belki gerçekten bir şey var diye baktım."
2. yanlış pozitif: "Yine mi? Tamam, bu sistem zaman zaman yanılıyor."
3. yanlış pozitif: "Artık açmıyorum bile."
4. yanlış pozitif: "Bu paneli tamamen kapattım."
5. yanlış pozitif (gerçek hata): [Kullanıcı görmedi, sistem kapalıydı]
```

Yani yanlış pozitif sıfır güvenlik hasarı yaratmaz — gerçek hataların gözden
kaçmasına zemin hazırlar. Bu asıl tehlikedir.

**Ölçüm hedefi:** Her tetikleyici türü için yanlış pozitif oranı **≤ %10** olmalıdır.
Bu oran, ilk 20 görevlik benchmark setinde ölçülür ve sonuçlar araştırma bulgularına dahil edilir.

### Gerekçe
"%10 yanlış pozitif" eşiği keyfi değildir. Grammarly'nin kendi kullanıcı araştırmasına
göre, bir gramer önerisi aracında %15 üzerindeki yanlış pozitif oranı, kullanıcının
araçla "çatışma" hissine girdiği eşik değeridir. Kod analizi araçları için bu eşiğin
daha düşük olduğu tahmin edilmektedir.

### Trade-off
Yanlış pozitif oranını düşürmenin en kolay yolu eşiği yükseltmek ve daha az uyarı
üretmektir. Ancak bu, gerçek hataların da kaçırılması anlamına gelir. Optimum nokta,
tetikleyici türüne göre farklı eşiklerle bulunur: güvenlik tetikleyicileri için
eşik düşük (daha hassas), kalite tetikleyicileri için eşik yüksek (daha seçici).

### Yanlış yapılırsa ne bozulur?
Yanlış pozitif oranı izlenmezse: sistem zaman içinde kullanıcı tarafından
"gürültü kaynağı" olarak etiketlenir, tüm proaktif davranışlar kapatılır,
araştırma sorusu "proaktif davranış kullanıcıyı rahatsız etti" bulgusuna indirgenir.

---

## 6. Spam Hissini Önleme Mekanizmaları

### Öneri
Spam hissi, uyarı **sıklığından** değil uyarı **alakasızlığından** kaynaklanır.
Ancak sıklık da kontrol altında tutulmalıdır.

**Teknik mekanizmalar:**

| Mekanizma | Açıklama | Değer |
|---|---|---|
| **Debounce** | Aynı tetikleyici için minimum bekleme süresi | 120 saniye |
| **Global throttle** | Toplam uyarı sıklığı (tüm türler) | Saatte maksimum 5 |
| **Session cap** | Tek oturumda aynı tür uyarı maksimumu | 3 |
| **Ertele** | "Şimdi değil" seçeneği | 30 dakika baskı |
| **Kalıcı sustur** | "Bunu gösterme" seçeneği | preferences.json |
| **Toplu gösterim** | 2 uyarı aynı anda gelirse birleştir | "2 öneri var →" |

**Sıklık Kılavuzu:**

```
İdeal: Kullanıcı günde 2–4 uyarı görür.
        Bunların ≥ 1 tanesi aksiyon alınan ("düzelt" butonuna basılan) uyarıdır.
        Aksiyon oranı < %20 ise → throttle eşiği düşürülür.
```

### Gerekçe
"Günde 2–4 uyarı" hedefi, e-posta inbox araştırmalarından esinlenmiştir.
Günde 10'dan fazla bildirim alan kullanıcıların %73'ü bildirimleri tamamen kapatır.
IDE bağlamında bu sayı daha da düşüktür — geliştirici akış halindeyken kesilmek istemez.

### Trade-off
Saatte 5 uyarı sınırı, hızlı çalışan bir kullanıcının birden fazla gerçek hatayı
aynı saatte geçirmesi halinde bazı uyarıları görmemesine yol açabilir. Çözüm:
kalan uyarılar sıradaki saate taşınır — iptal edilmez, ertelenir.

### Yanlış yapılırsa ne bozulur?
Throttle mekanizması olmadan 10 dosyalı bir klasörü tara komutu çalıştırıldığında,
sistem 10 "DUPLICATE_LOGIC bulundu" uyarısı üretebilir. Kullanıcı bunu spam olarak
işaretler ve "Tüm önerileri kapat" ayarını açar.

---

## 7. Kullanıcıya Kontrol Hissi Verme

### Öneri
Kontrol hissi üç katmanda sağlanır:

**Katman 1 — Anlık Kontrol (Her Uyarıda)**
```
[Uyarı metni]
  [Birincil Eylem]  [Şimdi Değil ▼]
                         └─ Bunu gösterme
                         └─ 30 dk ertele
                         └─ Neden önerdin? →
```

**Katman 2 — Oturum Kontrolü (Panelden)**
```
AI Öneriler Paneli
  ┌─ Aktif (yeşil)   [Duraklat]
  ├─ Bugün 3 öneri gösterildi
  ├─ 1 tanesini kabul ettiniz
  └─ [Tercihler →]
```

**Katman 3 — Kalıcı Tercihler (Ayarlar)**
```
Proaktif Davranış Ayarları
  🔒 Güvenlik uyarıları [Sabit — kapatılamaz]
  ☑ Syntax hataları
  ☐ Uzun fonksiyon önerileri
  ☐ Test eksikliği bildirimleri
  ☐ Duplike kod tespiti
  ─────────────────────────────
  Güven eşiği: [Düşük] [Orta ●] [Yüksek]
  Sıklık sınırı: Saatte [5 ▼] uyarı
  ─────────────────────────────
  * Güvenlik uyarıları kapatılamaz. Bu bir tasarım kararıdır.
```

**"Kapatılamaz" notu hakkında:** SECRET_DETECTED ve PROTECTED_FILE_OPEN uyarıları
kullanıcı tarafından susturulamaz. Bu kısıtlama, kullanıcıya ilk kurulumda şeffaf
biçimde açıklanır: "Bu iki uyarı tipi güvenlik nedeniyle her zaman açıktır."

### Gerekçe
Kontrol hissi veren sistemlerde kullanıcı aynı özelliği daha az "müdahaleci" olarak
algılar — içerik değişmese bile. Bu, Self-Determination Theory'nin "otonomi" bileşeniyle
örtüşür ve HCI araştırmalarında defalarca gösterilmiştir. Kontrol verildiğinde,
kullanıcı uyarıları daha dikkatli okur.

### Trade-off
"Kapatılamaz güvenlik uyarıları" kararı, bazı kullanıcılar tarafından paternalist
bulunabilir. Bu karara itiraz eden kullanıcılar için: tercihler ekranında bu kararın
gerekçesi görünür ("secret commit'ler kalıcı veri sızıntısına yol açabilir"). Gerekçe
görünür olduğunda çoğu kullanıcı kısıtlamayı kabul eder.

### Yanlış yapılırsa ne bozulur?
Kullanıcıya hiç kontrol verilmezse (tüm uyarılar zorunlu, tüm davranışlar sabit):
kullanıcı sistemi "bana emir veren bir araç" olarak algılar. Bu algı, AI'a karşı
genel güvensizlik yaratır ve araştırma bulgularını ("kullanıcı güveni") olumsuz etkiler.

---

## 8. Antipattern'ler

### Öneri
Aşağıdaki UX antipattern'leri bu sistemde **kesinlikle uygulanmayacaktır:**

| Antipattern | Neden Yasak | Gerçek Dünya Örneği |
|---|---|---|
| **Clippy Sendromu** | Kullanıcı ne yapmaya çalıştığını zaten biliyor; "Mektup mu yazıyorsunuz?" tipi uyarı güven öldürür | Microsoft Word 97 Clippy |
| **Alert Storms** | Tek bir eylem (örn. dosya kaydet) birden fazla uyarı tetikler | ESLint'in default modu (50 uyarı aynı anda) |
| **Engel Çıkarma** | Kullanıcı bir şeyi yapmak istiyor, AI "emin misiniz?" ile durduruyor | Windows Vista UAC |
| **Belirsiz Uyarı** | "Bir sorun tespit edildi" — hangi sorun? Nerede? Ne yapmalıyım? | Eski macOS disk uyarıları |
| **Geri Alınamaz Eylem** | AI proaktif olarak dosyayı değiştiriyor, kullanıcı onayı yok | Bazı ESLint --fix davranışları |
| **Gizli Davranış** | AI bir şey yaptı ama kullanıcıya bildirmedi | Bazı auto-formatter araçları |
| **Yargılayıcı Ton** | "Bu kötü bir pattern." / "Bunu yapmamalısınız." | SonarQube bazı mesajları |
| **Ezici Öneri Listesi** | "23 iyileştirme önerim var" — kullanıcı bunaltılır | Resharper ilk kurulum |

### Gerekçe
Bu antipattern'ler endüstri deneyiminden çıkarılmıştır. Her biri belgelenen
kullanıcı araştırmalarında "aracı bırakma" veya "özelliği kapatma" davranışıyla
ilişkilendirilmiştir. Tasarım kararları verilirken "bu bir Clippy mi?" sorusu
kontrol listesinin ilk maddesinde yer almalıdır.

### Trade-off
Bu antipattern'lerin kaçınılması, zaman zaman daha az proaktif davranışla sonuçlanır.
Bu kabul edilebilir bir bedel: daha az ama daha alakalı uyarı, daha fazla ama
alakasız uyarıdan her zaman daha değerlidir.

### Yanlış yapılırsa ne bozulur?
"Daha çok öneri = daha değerli araç" yanılgısıyla sistem çok sayıda düşük kaliteli
öneri üretirse: tez savunmasında "kullanıcılar sistemi kaçınılacak bir araç olarak
değerlendirdi" bulgusunu açıklamak zorunda kalınır. Bu, araştırma sorusunun tam
tersini kanıtlar.

---

## 9. MVP için En Güvenli Proaktif Davranış Seti

### Öneri
**Sadece 3 tetikleyici aktif, geri kalan her şey pasif:**

```
MVP PROAKTİF DAVRANIŞ SETİ (Minimum Viable Proactive)
─────────────────────────────────────────────────────
✅ AKTIF:
   1. SECRET_DETECTED (Kritik, blocking, kapatılamaz)
      → Açık dosyada API key / token / şifre pattern tespiti
   2. PROTECTED_FILE_OPEN (Kritik, blocking, kapatılamaz)
      → .env / id_rsa / *.pem gibi korumalı dosya açıldığında
   3. SYNTAX_ERROR (Orta, non-blocking, 3 sn gecikme)
      → Dil sunucusundan gelen syntax hatası bildirimi

❌ PASIF (kullanıcı isteğe bağlı açabilir):
   - DEAD_CODE
   - LONG_FUNCTION
   - DUPLICATE_LOGIC
   - TODO_COMMENT
   - TEST_MISSING
   - LARGE_EDIT_PREVIEW (AI eylem akışında zaten var, ayrıca tetiklenmiyor)
   - ROLLBACK_AVAILABLE
```

**Neden sadece 3?**
1. **SECRET_DETECTED ve PROTECTED_FILE_OPEN:** Bu uyarılar olmadan sistem gerçek
   anlamda güvenli değildir. Hem araştırma sorusu hem de pratik kullanım için zorunludur.
2. **SYNTAX_ERROR:** Bu, dil sunucusunun zaten bildiğu bir bilgidir — AI analizi gerektirmez.
   Üretimi düşük maliyetli, alaka düzeyi en yüksek kategoridir. Yanlış pozitif oranı
   neredeyse sıfırdır (dil sunucusu hata yaptığında AI da hata yapar sayılmaz).
3. **Diğerleri pasif:** İlk kullanıcı testlerinde ne kadar alakalı oldukları ölçülmeden
   varsayılan açık yapmak risk taşır. Test sonuçlarına göre sonraki versiyonda aktifleştirilebilir.

### Gerekçe
"Minimum Viable Proactive" prensibi şudur: daha az ama kesinlikle doğru uyarı,
güveni inşa eder. Güven inşa edildikten sonra ek uyarılar açılabilir.
Bu, tezin araştırma sorusuyla da örtüşür: "güvenli ajan döngüsü kullanıcı güvenini
artırır mı?" — bu güvenin bir bileşeni de proaktif uyarıların güvenilirliğidir.

### Trade-off
3 tetikleyici ile başlamak, bazı gerçek kalite sorunlarını gözden kaçırmak anlamına gelir.
Bu kabul edilebilir: MVP aşamasında araç güvenini inşa etmek, kalite önerilerini
tam listelemekten daha önceliklidir.

### Yanlış yapılırsa ne bozulur?
Tüm tetikleyiciler MVP'de aktif olarak açılırsa ve kullanıcı testlerinde ilk 5 dakikada
3 kalite önerisi alırsa, güven ölçüm metrikleri araştırma sorusunun lehine değil aleyhine
sonuç verir. Tez bulgusu: "proaktif sistem kullanıcıyı rahatsız etti."

---

## 10. Araştırma Sorusuyla Bağlantı

Bu tasarım, `PRODUCT_PLAN.md § 2`'deki araştırma sorusuyla şu şekilde bağlantılanır:

> *"Güvenli ajan döngüsü, hata oranını ve kullanıcı güvenini ölçülebilir biçimde iyileştirir mi?"*

Proaktif davranış bu soruya iki katkı sağlar:

1. **Hata oranı:** SECRET_DETECTED + SYNTAX_ERROR tetikleyicileri, kullanıcı onayından
   önce engellenen hata sayısını ölçülebilir kılar. Benchmark setinde "proaktif uyarı
   tarafından engellenen hatalar" kategorisi açılır.

2. **Kullanıcı güveni:** Proaktif mesajların aksiyon alma oranı (tıklama / kapatma / susturma)
   güven ölçüm metrikleri arasına girer. Kullanıcı geri bildirimi anketinde
   "AI önerileri ne kadar güvenilirdi?" sorusu bu verileri doğrular.

---

## Referanslar ve İlgili Belgeler

- `UX_AND_INTERACTION.md` — Temel UX akışı (plan-onay-diff döngüsü)  
- `SAFETY_AND_GUARDRAILS.md` — Güvenlik katmanları (SECRET_DETECTED altyapısı)  
- `SYSTEM_PLAN.md § 7` — ReAct döngüsü (proaktif tetikleyicinin döngüye entegrasyonu)  
- `SYSTEM_PLAN.md § 9` — Güvenlik modeli (PROTECTED_FILE_OPEN listesi)  
- `EVALUATION_PLAN.md` — Benchmark metrikleri (proaktif uyarı aksiyon oranı)  
- `PRODUCT_PLAN.md § 6` — MVP dışı liste (proaktif analiz tezin "gelecek çalışmalar" bölümü)
