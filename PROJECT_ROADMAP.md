# PROJE YOL HARİTASI (PROJECT_ROADMAP)

> **Belge amacı:** 18 aylık geliştirme takvimini, faz hedeflerini ve teslimatları tanımlar.  
> Ürün kapsamı için → `PRODUCT_PLAN.md`

---

## 1. Genel Yapı

```
Ay 1–3   │ Faz 1: Zemin (Foundation)
Ay 4–6   │ Faz 2: Editör Çekirdeği (Editor Core)
Ay 7–10  │ Faz 3: Ajan Döngüsü (Agent Loop)
Ay 11–15 │ Faz 4: Güvenlik ve Değerlendirme (Safety & Evaluation)
Ay 16–18 │ Faz 5: Tez ve Final (Thesis & Final)
```

---

## 2. Faz 1: Zemin (Ay 1–3)

**Hedef:** Proje çalışır durumda. Mimari kararlar verilmiş, teknoloji öğrenilmiş.

### Teslimatlar

| #   | Görev                                         | Hafta  | Çıktı                                 |
|-----|-----------------------------------------------|--------|---------------------------------------|
| 1.1 | TypeScript + Electron temelleri öğren         | H1-H2  | 2-3 mini proje                        |
| 1.2 | Monaco Editor'ü Electron'da çalıştır          | H3     | Hello world editör                    |
| 1.3 | Dosya aç / kaydet / sekme yönetimi            | H4-H6  | Temel editör shell                    |
| 1.4 | nomic-embed-text ile embedding demosu         | H7-H8  | 5 dosyalık indeks                     |
| 1.5 | SQLite-vec kurulumu ve 100 dosya indeks testi | H9-H10 | Çalışan vektör DB                     |
| 1.6 | Mimari karar belgesi (ADR)                    | H11    | Seçenekler karşılaştırılmış           |
| 1.7 | Danışman gösterisi                            | H12    | "Editör açılıyor, dosya görüntülüyor" |

### Faz 1 Kontrol Noktası

- [ ] Electron + Monaco shell çalışıyor mu?
- [ ] 5 dosya indekslenip sorgulanabiliyor mu?
- [ ] Performans kabul edilebilir mi? (açılış < 5 sn)

### Ne Yapılmaz

Ajan kodu yok. AI entegrasyonu yok. Güvenlik kodu yok.

---

## 3. Faz 2: Editör Çekirdeği (Ay 4–6)

**Hedef:** Kod yazılabilir, stabil bir editör. AI henüz dosya değiştirmiyor ama sohbet çalışıyor.

### Teslimatlar

| #   | Görev                                                 | Hafta   | Çıktı                   |
|-----|-------------------------------------------------------|---------|-------------------------|
| 2.1 | Dosya ağacı (açma, yenileme, arama)                   | H1-H2   | Çalışan file tree       |
| 2.2 | Sözdizim vurgulama (Monaco dil desteği)               | H2      | .ts, .js, .py desteği   |
| 2.3 | Durum çubuğu (dosya, satır/sütun, encoding)           | H3      | Status bar              |
| 2.4 | Model soyutlama katmanı (Claude + Ollama)             | H4-H6   | ModelProvider interface |
| 2.5 | Basit chat paneli (soru-cevap, dosya değişikliği yok) | H7-H9   | Çalışan sohbet          |
| 2.6 | Bağlam motoru v1 (aktif dosya + import listesi)       | H10-H11 | Context retrieval       |
| 2.7 | `.agentignore` mekanizması                            | H12     | Gizli dosya filtresi    |

### Faz 2 Kontrol Noktası

- [ ] Editör stabil mi? (crash yok)
- [ ] Chat panelinde model yanıt veriyor mu?
- [ ] Bağlam motoru doğru dosyaları mı buluyor?

### Ne Yapılmaz

Dosya yazma yok. Diff yok. Ajan döngüsü yok.

---

## 4. Faz 3: Ajan Döngüsü (Ay 7–10)

**Hedef:** Ajan değişiklik önerebilir. Kullanıcı onaylar. Değişiklik uygulanır.

### Teslimatlar

| #   | Görev                                               | Hafta   | Çıktı                                                    |
|-----|-----------------------------------------------------|---------|----------------------------------------------------------|
| 3.1 | Tool sistemi: read_file, search_symbols, list_files | H1-H3   | Araç altyapısı                                           |
| 3.2 | write_file + güvenlik katmanları                    | H4-H6   | Workspace boundary + path normalization + write boundary |
| 3.3 | Diff üretimi (unified diff → Monaco diff view)      | H7-H8   | Diff paneli                                              |
| 3.4 | Onay akışı: tek dosya + çok dosya                   | H9-H10  | Onay UI                                                  |
| 3.5 | Undo stack (son 10 değişiklik seti)                 | H11-H12 | Rollback                                                 |
| 3.6 | Bağlam motoru v2: embedding retrieval entegrasyonu  | H13-H14 | Semantik arama                                           |
| 3.7 | Audit log: audit.jsonl                              | H15     | Log mekanizması                                          |
| 3.8 | PathSanitizer + güvenlik test suite                 | H16     | Güvenlik testleri                                        |

### Faz 3 Kontrol Noktası

- [ ] Senaryo 1 (hata düzeltme) çalışıyor mu?
- [ ] Senaryo 5 (tek dosya düzenleme) çalışıyor mu?
- [ ] Güvenlik testleri %100 geçiyor mu?
- [ ] Undo stack çalışıyor mu?

---

## 5. Faz 4: Güvenlik ve Değerlendirme (Ay 11–15)

**Hedef:** Tüm senaryolar çalışıyor. Benchmark hazır. Ölçüm tamamlanmış.

### Teslimatlar

| #   | Görev                                                 | Hafta   | Çıktı                     |
|-----|-------------------------------------------------------|---------|---------------------------|
| 4.1 | Çok dosyalı refactor desteği (Senaryo 2)              | H1-H4   | Multi-file edit           |
| 4.2 | Test yazma modu (Senaryo 3)                           | H5-H7   | Test generation           |
| 4.3 | Q&A modu — yalnızca açıklama (Senaryo 4)              | H8-H9   | Explain mode              |
| 4.4 | Güvenlik test paketi: path traversal, erişim girişimi | H10-H11 | 50+ test case             |
| 4.5 | Benchmark görev setinin hazırlanması                  | H12-H14 | 20 görev + beklenen çıktı |
| 4.6 | Benchmark çalıştırma protokolü                        | H15-H16 | Koşul A/B/C çalıştırma    |
| 4.7 | Sonuç analizi ve raporlama                            | H17-H20 | İstatistiksel analiz      |
| 4.8 | Performans ölçümü: bellek, gecikme, token verimliliği | H17-H20 | Performans raporu         |

### Faz 4 Kontrol Noktası

- [ ] 5 senaryonun tümü çalışıyor mu?
- [ ] 20 benchmark görevi çalıştırıldı mı?
- [ ] Sonuçlar tabloya kaydedildi mi?
- [ ] Güvenlik testi %100 geçiyor mu?

---

## 6. Faz 5: Tez ve Final (Ay 16–18)

**Hedef:** Tez yazılmış. Demo hazır. Savunma yapılmış.

### Teslimatlar

| #   | Görev                                      | Hafta   | Çıktı                               |
|-----|--------------------------------------------|---------|-------------------------------------|
| 5.1 | Tez yazımı (Bölüm 1-4)                     | H1-H5   | Giriş, literatür, tasarım, uygulama |
| 5.2 | Tez yazımı (Bölüm 5-6)                     | H6-H8   | Değerlendirme, sonuç                |
| 5.3 | Demo senaryosu hazırlığı (5 dk canlı demo) | H9      | Demo script                         |
| 5.4 | Bilinen sınırlar bölümü                    | H10     | Limitations section                 |
| 5.5 | Portable build (opsiyonel)                 | H10-H11 | electron-forge build                |
| 5.6 | Savunma sunumu hazırlığı                   | H11-H12 | Sunum slaytları                     |
| 5.7 | Kaynak kodu teslimi + kurulum kılavuzu     | H12     | README + docs/                      |

### Faz 5 Kontrol Noktası

- [ ] Tez tamamlandı mı? (66-81 sayfa)
- [ ] Demo hatasız çalışıyor mu?
- [ ] Savunma sunumu hazır mı?
- [ ] Kaynak kodu temiz ve dokümante mi?

---

## 7. Milestone Takvimi (Özet)

| Ay | Milestone                                                | Durum |
|----|----------------------------------------------------------|-------|
| 3  | Electron + Monaco editör shell + embedding demo          | [ ]   |
| 6  | Stabil editör + çalışan sohbet + bağlam motoru v1        | [ ]   |
| 10 | Ajan döngüsü çalışıyor + diff + onay + rollback          | [ ]   |
| 15 | 5 senaryo tamamlanmış + 20 görev benchmark çalıştırılmış | [ ]   |
| 18 | Tez teslim + savunma                                     | [ ]   |

---

## 8. Risk Bağlantıları

Bu takvimle ilişkili riskler → `RISK_REGISTER.md`:

- R5 (TypeScript/Electron öğrenme süresi) → Faz 1'i uzatabilir
- R11 (kapsam şişmesi) → her faz geçişinde kapsam kontrolü
- R12 (motivasyon düşüşü) → haftalık küçük hedefler

---

*Yol haritası için → bu belge.*  
*Ürün kapsamı için → `PRODUCT_PLAN.md`*  
*Risk kaydı için → `RISK_REGISTER.md`*
