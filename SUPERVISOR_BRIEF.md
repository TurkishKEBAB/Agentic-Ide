# PROJE ÖZETİ VE BELGE HARİTASI (SUPERVISOR_BRIEF)

> **Belge amacı:** Danışman incelemesi için hazırlanmış kısa giriş metni.  
> Projenin neyi hedeflediğini, hangi kararların netleştiğini ve belgelerin nasıl okunması gerektiğini özetler.

---

## 1. Proje Özeti

**Agentic IDE**, kod yazma ortamı ile yapay zeka destekli geliştirme akışını tek çatı altında birleştirmeyi hedefleyen bir lisans bitirme projesidir.

Projenin odak noktası: yalnızca yanıt veren bir sohbet aracı değil; **kullanıcının açık bağlamını anlayan, plan sunan, onay alan ve güvenli biçimde değişiklik uygulayan** bir ajan döngüsünü ölçülebilir şekilde değerlendirmek.

Bu çalışma, tam özellikli bir IDE üretmeyi değil, aşağıdaki araştırma sorusunu savunulabilir bir prototip üzerinden yanıtlamayı hedefler:

> **"Kullanıcı tetiklemeli, plan-önce-onay-sonra çalışan güvenli bir ajan döngüsü; çok dosyalı değişikliklerde hata oranını, güvenlik ihlali riskini ve kullanıcı güvenini doğrudan LLM kullanımına kıyasla iyileştirir mi?"**

---

## 2. Neden Bu Proje?

### Problem
- Geliştiriciler günde 1-2 saat bağlam kırılması nedeniyle verimlilik kaybeder
- Mevcut AI araçları (Copilot, Cursor, Windsurf) hız optimize eder; güvenlik ve şeffaflık arka planda kalır
- "Plan-first, approval-gated" döngüsü için ölçülebilir akademik çalışma yok

### Fark
- Copilot/Cursor/Windsurf → hız optimize eder
- **Agentic IDE → güven optimize eder** (diff önizleme, onay, rollback, audit log)

---

## 3. Netleşen Kararlar

| Karar | Durum | Belge |
|---|---|---|
| Proje süresi: 18 ay | ✅ Kesinleşti | `PROJECT_ROADMAP` |
| Platform: Electron + Monaco | ✅ Kesinleşti | `ARCHITECTURE_OPTIONS` |
| Ajan: Single-agent (ReAct döngüsü) | ✅ Kesinleşti | `AGENT_ARCHITECTURE_ANALYSIS` |
| Değişiklik onayı: Diff + onay zorunlu | ✅ Kesinleşti | `SYSTEM_PLAN` |
| Model: 1 bulut (Claude) + 1 yerel (Ollama) | ✅ Kesinleşti | `TECH_STACK_AND_AI` |
| Proaktif analiz: MVP dışı | ✅ Kesinleşti | `PROACTIVE_BEHAVIOR_DESIGN` |
| Benchmark: 20 görev, üçlü karşılaştırma | 🟡 Onay bekliyor | `EVALUATION_PLAN` |
| Terminal entegrasyonu | 🟡 Karar bekleniyor | `PRODUCT_PLAN` §6 |

---

## 4. Belge Okuma Sırası

Danışman incelemesi için önerilen okuma sırası:

### Öncelik 1 — Karar Belgeleri (toplam ~20 dakika okuma)
1. **Bu belge** (SUPERVISOR_BRIEF) — genel bakış
2. **PRODUCT_PLAN** — problem, araştırma sorusu, MVP kapsamı
3. **SYSTEM_PLAN** — ajan mimarisi, güvenlik katmanları

### Öncelik 2 — Detay Belgeleri (toplam ~30 dakika okuma)
4. **EVALUATION_PLAN** — benchmark yapısı, metrikler
5. **PROJECT_ROADMAP** — 18 aylık takvim
6. **ARCHITECTURE_OPTIONS** — Electron vs. Tauri kararı
7. **TECH_STACK_AND_AI** — model seçimi, soyutlama katmanı

### Öncelik 3 — Destek Belgeleri (ihtiyaçta okunabilir)
8. **AGENT_ARCHITECTURE_ANALYSIS** — single-agent gerekçesi
9. **CRITICAL_ANALYSIS** — kapsam ve risk eleştirisi
10. **THESIS_OUTLINE** — tez bölüm yapısı
11. **Diğer belgeler** — güvenlik, gizlilik, test, maliyet

---

## 5. Bu Aşamada Açık Olan Konular

Aşağıdaki başlıklar danışman geri bildirimiyle netleştirilecektir:

| # | Konu | Seçenekler |
|---|---|---|
| 1 | Terminal entegrasyonu | MVP'de mi, gelecek çalışmada mı? |
| 2 | Kullanıcı çalışması | 5-10 katılımcı zorunlu mu, opsiyonel mi? |
| 3 | Benchmark görev tasarımı | Kim tasarlayacak? (danışman, sınıf arkadaşı, açık kaynak) |
| 4 | Model version kilitleme | API güncellemeleri karşısında strateji |
| 5 | Etik kurul onayı | Bulut modele kod gönderme için gerekli mi? |

---

## 6. Beklenen Sonuç

18 ay sonunda hedeflenen çıktı:
- **Çalışan prototip:** Güvenli, açıklanabilir, ölçülebilir bir ajan destekli editör
- **Akademik katkı:** Plan-approval döngüsünün etkinliğine ilişkin nicel veriler
- **Tez:** 66-81 sayfalık savunulmuş akademik belge
- **Demo:** 5 dakikalık jüri önünde canlı demo

Başarının ölçütü: yalnızca çalışan demo değil; **hangi koşullarda güvenilir çalıştığını ve hangi sınırları olduğunu sistematik biçimde gösterebilmek.**

---

*Danışman brifingi için → bu belge.*  
*Detaylı belge hariyası için → yukarıdaki §4 okuma sırası.*
