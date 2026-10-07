# PROJE ÖZETİ VE BELGE HARİTASI (SUPERVISOR_BRIEF)

> **Belge amacı:** Danışman incelemesi için hazırlanmış kısa giriş metni.  
> Projenin neyi hedeflediğini, hangi kararların netleştiğini ve belgelerin nasıl okunması gerektiğini özetler.

---

## 1. Proje Özeti

**Agentic IDE**, kullanıcı tetiklemeli, plan-önce-onay-sonra çalışan bir ajan döngüsünün çok dosyalı kod
değişikliklerinde görev başarısı, güvenlik ihlali, rollback davranışı ve kullanıcı güveni üzerindeki etkisini ölçen
güvenlik odaklı bir AI kod editörü tez prototipidir.

Projenin odak noktası: tam özellikli bir IDE veya Copilot/Cursor alternatifi üretmek değil; **approval-gated AI coding**
akışını ölçülebilir ve denetlenebilir bir prototip üzerinde değerlendirmek.

Bu çalışma, tam özellikli bir IDE üretmeyi değil, aşağıdaki araştırma sorusunu savunulabilir bir prototip üzerinden
yanıtlamayı hedefler:

> **"Kullanıcı tetiklemeli, plan-önce-onay-sonra çalışan güvenli bir ajan döngüsü; çok dosyalı kod değişikliklerinde görev
başarısını, güvenlik ihlali riskini, rollback davranışını ve kullanıcı güvenini doğrudan LLM kullanımına kıyasla
iyileştirir mi?"**

Bu çerçevede **Agentic IDE** ürün artefact'i, **approval-gated AI coding** ana araştırma odağı, **Verification-Driven
Development (VDD)** ise kanıt, izlenebilirlik ve rollback kararlarını adlandıran destekleyici tez çerçevesidir.

---

## 2. Neden Bu Proje?

### Problem

- Çok dosyalı AI önerilerini gereksinimlere göre incelemek ve doğrulamak ek iş yükü oluşturabilir.
- Mevcut araçlar diff, izin ve geri alma özellikleri sunar; bunların yokluğu özgünlük gerekçesi olarak kullanılmaz.
- Bu prototip, plan/onay/kanıt hattının görev doğruluğu, güvenlik ve inceleme maliyetine etkisini ölçmeyi hedefler.

### Fark

- **Katkı adayı:** Gereksinim → plan → diff → onay → değişiklik → kanıt → rollback izlenebilirliği ve kontrollü deney.
- Güvenlik veya üretkenlik üstünlüğü henüz ölçülmemiştir; kaynaklar ve iddia sınırları
  [literatür notunda](docs/LITERATURE_AND_CLAIMS.md) belirtilmiştir.

---

## 3. Mevcut Teknik Baz Çizgi

Tablodaki teknik kararlar repo içindeki **planlama baz çizgisidir**; danışman onayı veya çalışan uygulama kanıtı
anlamına gelmez. 8 Ekim 2026 ilk toplantısında araştırma odağı, kapsam ve gerçek teslim takvimi teyit edilecektir.

`PROJECT_REVIEW_TODO.md`, VDD'yi ana odak olarak işaretlerken ana planlar destekleyici çerçeve olarak tanımlar.
Bu fark [toplantı karar listesinde](ADVISOR_MEETING_AGENDA.md) açık bir karar olarak tutulur.

| Karar                                      | Durum               | Belge                         |
|--------------------------------------------|---------------------|-------------------------------|
| Proje süresi: 18 ay taslak                  | Takvim teyidi bekliyor | `PROJECT_ROADMAP`             |
| Platform: Electron + Monaco                | Repo mimari kararı    | `ARCHITECTURE_OPTIONS`        |
| Ajan: Single-agent (ReAct döngüsü)          | Repo mimari kararı    | `AGENT_ARCHITECTURE_ANALYSIS` |
| Değişiklik onayı: Diff + onay zorunlu       | Tasarım baz çizgisi   | `SYSTEM_PLAN`                 |
| Model: 1 bulut + 1 yerel sağlayıcı          | Tasarım baz çizgisi   | `TECH_STACK_AND_AI`           |
| Proaktif analiz: MVP dışı                  | Kapsam baz çizgisi    | `PROACTIVE_BEHAVIOR_DESIGN`   |
| Benchmark: 20 görev, üçlü karşılaştırma     | Danışman incelemesi   | `EVALUATION_PLAN`             |
| Terminal entegrasyonu                      | MVP dışı              | `PRODUCT_PLAN` §6             |

---

## 4. Belge Okuma Sırası

Danışman incelemesi için önerilen okuma sırası:

### Öncelik 1 — Karar Belgeleri (toplam ~20 dakika okuma)

1. **Bu belge** (SUPERVISOR_BRIEF) — genel bakış
2. **PRODUCT_PLAN** — problem, araştırma sorusu, MVP kapsamı
3. **SYSTEM_PLAN** — ajan mimarisi, güvenlik katmanları

### Öncelik 2 — Detay Belgeleri (toplam ~30 dakika okuma)

1. **EVALUATION_PLAN** — benchmark yapısı, metrikler
2. **PROJECT_ROADMAP** — 18 aylık takvim
3. **ARCHITECTURE_OPTIONS** — Electron vs. Tauri kararı
4. **TECH_STACK_AND_AI** — model seçimi, soyutlama katmanı

### Öncelik 3 — Destek Belgeleri (ihtiyaçta okunabilir)

1. **AGENT_ARCHITECTURE_ANALYSIS** — single-agent gerekçesi
2. **CRITICAL_ANALYSIS** — kapsam ve risk eleştirisi
3. **THESIS_OUTLINE** — tez bölüm yapısı
4. **Diğer belgeler** — güvenlik, gizlilik, test, maliyet

---

## 5. Bu Aşamada Açık Olan Konular

Aşağıdaki başlıklar danışman geri bildirimiyle netleştirilecektir:

| # | Karar Başlığı | Danışmandan Beklenen Karar |
|---|---------------|----------------------------|
| 1 | Akademik odak | Ana iddia "approval-gated AI coding"; VDD destekleyici çerçeve olsun mu? |
| 2 | Hedef kullanıcı | Junior developer / üst sınıf bilgisayar mühendisliği öğrencisi profili yeterince net mi? |
| 3 | MVP dışı sınırlar | Terminal, multi-agent, proaktif/background analiz ve VS Code extension kesin dışarıda kalsın mı? |
| 4 | Benchmark tasarımı | 20 görevlik A/B/C tasarım ve görev hazırlama yöntemi onaylanıyor mu? |
| 5 | Güven metrikleri | Rollback davranışı + audit log + kısa anket kullanıcı güveni için yeterli mi? |
| 6 | VDD/TDD dili | "Testler gerekli ama tek başına yeterli değil" çizgisi tez için uygun mu? |

---

## 6. Beklenen Sonuç

Danışmanla başlangıç ve teslim tarihleri teyit edilecek 18 aylık taslak sonunda hedeflenen çıktı:

- **Çalışan prototip:** Güvenli, açıklanabilir, ölçülebilir bir ajan destekli editör
- **Akademik katkı:** Plan-approval döngüsünün etkinliğine ilişkin nicel veriler
- **Tez:** 66-81 sayfalık savunulmuş akademik belge
- **Demo:** 5 dakikalık jüri önünde canlı demo

Başarının ölçütü: yalnızca çalışan demo değil; **hangi koşullarda güvenilir çalıştığını ve hangi sınırları olduğunu
sistematik biçimde gösterebilmek.**

---

*Danışman brifingi için → bu belge.*  
*Detaylı belge hariyası için → yukarıdaki §4 okuma sırası.*
