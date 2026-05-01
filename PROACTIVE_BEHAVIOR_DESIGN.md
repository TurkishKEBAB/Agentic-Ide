# PROAKTİF DAVRANIŞ TASARIMI (PROACTIVE_BEHAVIOR_DESIGN)

> **Belge durumu:** ⚠️ BU BELGE YALNIZCA **BACKGROUND PROAKTİF ANALİZ** KAPSAMINI TANIMLAR — MVP DIŞI / GELECEK ÇALIŞMA
>
> **Net ayrım:**
> - **Background proactive analysis (save-time, idle-time, alert queue, debounce, snooze, mute):** MVP DIŞIDIR. Bu belge
    ve `UC-03B` referansıdır.
> - **Reactive safety warnings (apply öncesi, kullanıcı tetiklemeli plan akışı içinde):** **MVP İÇİNDEDİR.** Bunun
    tek-doğru kaynağı `SAFETY_AND_GUARDRAILS.md §2.6` ve `diagrams/UC/UC-03A-reactive-safety-warnings.puml`'dir.
>
> MVP kapsamı için → `PRODUCT_PLAN.md` §6

---

## 1. Tanım ve Motivasyon

Proaktif davranış, kullanıcı bir istek yapmadan önce ajanın kendi inisiyatifiyle analiz yapması ve uyarı/öneri
sunmasıdır.

**Örnekler:**

- Dosya kaydedildiğinde otomatik hata taraması
- Kullanılmayan import'ları tespit etme
- Güvenlik açığı olabilecek pattern'ları işaretleme
- Karmaşıklığı yüksek fonksiyonları refactor önerme

### 1.1 Neden MVP'den Çıkarıldı?

| Sorun                     | Açıklama                                                                      |
|---------------------------|-------------------------------------------------------------------------------|
| **Alert fatigue**         | Sürekli uyarı kullanıcıyı duyarsızlaştırır. Windows Clippy sendromu.          |
| **Flow state bozulması**  | Geliştirici akışa girdiğinde her kesinti ortalama 23 dakika maliyet           |
| **Yanlış pozitif riski**  | Ajan yüksek yanlış pozitif verirse güven hızla erir                           |
| **Araştırma sorusu dışı** | Plan-approval döngüsünün etkinliği ölçülüyor, proaktif analiz farklı bir soru |
| **Teknik karmaşıklık**    | Dosya değişikliği izleme, intelligent throttling, priority queue gerekir      |

### 1.2 Akademik Konumlandırma

Bu özellik ayrı bir araştırma sorusu olarak ele alınabilir:

> "Proaktif bir ajan, gerçek zamanlı kod analizi yaparak geliştiricinin hata oranını düşürürken aynı zamanda kesinti
> maliyetini minimumda tutabilir mi?"

Bu sorunun alt soruları:

1. Proaktif uyarıların optimal sıklığı nedir?
2. Hangi uyarı türleri kabul edilir, hangileri irritan olarak algılanır?
3. Güven eşiği (confidence threshold) ne olmalıdır — yalnızca yüksek güven + yüksek risk?

---

## 2. Tasarım Taslağı (Gelecek Çalışma İçin)

### 2.1 Katmanlı Aktivasyon Modeli

```
Katman 0 — Sessiz (MVP)
  Ajan hiçbir proaktif analiz yapmaz. Yalnızca kullanıcı isteğiyle çalışır.

Katman 1 — Pasif İzleme (Faz 2)
  Ajan arka planda analiz yapar ama sonuçları yalnızca durum çubuğunda gösterir.
  Kullanıcı tıklarsa detayları görür.

Katman 2 — Akıllı Bildirim (Faz 3)
  Yalnızca yüksek güven + yüksek risk kesişiminde bildirim gösterilir.
  "Bu fonksiyonda olası null pointer var" (güven > %90, risk: crash)

Katman 3 — Aktif Öneri (Araştırma)
  Ajan düzeltme planı önerir (diff ile). Kullanıcı onaylar veya reddeder.
  Bu katman araştırma sorusu için ölçüm gerektirir.
```

### 2.2 Sinyal Kalitesi Metrikleri

| Metrik                          | Hedef    |
|---------------------------------|----------|
| Precision (doğru pozitif oranı) | ≥ %85    |
| Kullanıcı kabul oranı           | ≥ %50    |
| Ortalama uyarı sıklığı          | ≤ 3/saat |
| False positive oranı            | ≤ %15    |

### 2.3 Bildirim Yönetimi Kuralları

Gelecek çalışma taslağında proaktif uyarılar, alert fatigue riskini azaltmak için aşağıdaki kurallarla sınırlandırılır:

- Kullanıcı chat paneline aktif olarak yazarken uyarı gösterilmez
- Aynı tetikleyici son 2 dakika içinde uyarı verdiyse bekletilir
- Aynı anda en fazla bir uyarı gösterilir; diğerleri tek uyarı kuyruğuna alınır
- Kritik güvenlik uyarıları kalite uyarılarından daha yüksek öncelik alır

Bu kurallar MVP içinde uygulanmaz; yalnızca `UC-03B` future-work diyagramının debounce/throttle ve alert queue notlarını
temellendirir.

### 2.4 Tetikleme Koşulları

| Tetikleyici             | Analiz Türü                  | Gecikme               |
|-------------------------|------------------------------|-----------------------|
| Dosya kaydedildi        | Sözdizim kontrolü            | 500ms                 |
| 30 saniye hareketsizlik | Statik analiz                | 2 saniye              |
| Proje açıldı            | Bağımlılık güvenlik taraması | Arka plan             |
| Git commit öncesi       | Kapsamlı analiz              | Kullanıcı tetiklemeli |

---

## 3. Karar Özeti

| Soru                        | Cevap                                                                                 |
|-----------------------------|---------------------------------------------------------------------------------------|
| MVP'de var mı?              | **HAYIR**                                                                             |
| Neden?                      | Alert fatigue, araştırma sorusu dışı, teknik karmaşıklık                              |
| Ne zaman değerlendirilecek? | Tez sonrası veya ayrı araştırma olarak                                                |
| Bu belge ne için?           | Gelecek çalışma referansı, jüriye "bunu düşündük ama bilinçli olarak çıkardık" cevabı |

---

*Proaktif davranış tasarımı için → bu belge (gelecek çalışma).*  
*MVP kapsamı için → `PRODUCT_PLAN.md`*  
*Güvenlik modeli için → `SAFETY_AND_GUARDRAILS.md`*
