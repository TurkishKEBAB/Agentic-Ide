# RİSK KAYDI (RISK_REGISTER)

> **Belge amacı:** Proje boyunca izlenecek riskleri, olasılıklarını, etkilerini ve azaltma planlarını belgeler.  
> Bu belge canlı bir doküman olarak haftalık danışman toplantılarında gözden geçirilmeli.

---

## 1. Risk Değerlendirme Matrisi

| Etki ↓ / Olasılık → | Düşük    | Orta      | Yüksek    |
|---------------------|----------|-----------|-----------|
| **Çok Yüksek**      | 🟡 Orta  | 🔴 Yüksek | 🔴 Kritik |
| **Yüksek**          | 🟡 Orta  | 🔴 Yüksek | 🔴 Yüksek |
| **Orta**            | 🟢 Düşük | 🟡 Orta   | 🟡 Orta   |
| **Düşük**           | 🟢 Düşük | 🟢 Düşük  | 🟡 Orta   |

---

## 2. Teknik Riskler

### R1 — Electron Bellek Kullanımı Demo Sırasında Sorun Çıkarır

- **Olasılık:** Yüksek | **Etki:** Orta | **Skor:** 🟡 Orta
- **Azaltma:** Electron süreç mimarisini doğru kur; renderer'da ağır işlem yapma; erken performans ölçümü
- **B Planı:** Demo için yeterli RAM'li makinede çalıştır; tezde sınır olarak belgele
- **Durum:** [ ] Açık

### R2 — Context Retrieval Alakasız Dosyalar Döndürüyor

- **Olasılık:** Orta | **Etki:** Yüksek | **Skor:** 🔴 Yüksek
- **Azaltma:** Precision@5 metriği erken ölç; ayar seti oluştur; chunk stratejisini test et
- **B Planı:** Kullanıcıya "bağlamı düzelt" arayüzü sun (Katman 3 — user-pinned context)
- **Durum:** [ ] Açık

### R3 — Bulut API Maliyeti Tez Bütçesini Aşıyor

- **Olasılık:** Orta | **Etki:** Düşük | **Skor:** 🟢 Düşük
- **Azaltma:** Günlük harcama limiti ($5/gün hard cap); geliştirmede yerel model öncelikli
- **B Planı:** Yerel modele geç; bulut özelliklerini "maliyet analizi" olarak teze ekle
- **Durum:** [ ] Açık

### R4 — Model Güncellemesi Prompt'ları Bozuyor

- **Olasılık:** Orta | **Etki:** Yüksek | **Skor:** 🔴 Yüksek
- **Azaltma:** Model versiyonunu kilitle; prompt şablonları versiyon kontrollü dosyada tut
- **B Planı:** Kilitli eski versiyona geri dön; güncellemeyi tez bitiminde yap
- **Durum:** [ ] Açık

### R5 — TypeScript/Electron Öğrenme Süresi Uzuyor

- **Olasılık:** Yüksek | **Etki:** Yüksek | **Skor:** 🔴 Yüksek
- **Azaltma:** İlk 2 ay tamamen öğrenmeye ayır; ajan kodu başlangıçta yok
- **B Planı:** Daha basit bir Electron boilerplate kullan; karmaşık UI özelliklerini kes
- **Durum:** [ ] Açık

### R6 — Undo Stack Çok Dosyalı Senaryoda Tutarsızlaşıyor

- **Olasılık:** Düşük | **Etki:** Yüksek | **Skor:** 🟡 Orta
- **Azaltma:** Undo'yu transaction tabanlı modellemek; test kapsamını erken yaz
- **B Planı:** Rollback'i MVP'den çıkar, sadece "dosyayı geri yükle" sun
- **Durum:** [ ] Açık

### R7 — Güvenlik Duvarı Bypass Edilebiliyor

- **Olasılık:** Düşük | **Etki:** Çok Yüksek | **Skor:** 🟡 Orta
- **Azaltma:** Her yeni araç eklenmeden güvenlik incelemesi; path traversal testleri
- **B Planı:** Araç erişimini tamamen kapat; okuma moduna geç
- **Durum:** [ ] Açık

---

## 3. Akademik Riskler

### R8 — Benchmark Görevi Tasarımı Taraflı Çıkıyor

- **Olasılık:** Orta | **Etki:** Yüksek | **Skor:** 🔴 Yüksek
- **Azaltma:** Görevleri danışman veya sınıf arkadaşı tasarlasın; kör değerlendirme yap
- **B Planı:** Açık kaynak benchmark seti kullan (SWE-bench mini gibi)
- **Durum:** [ ] Açık

### R9 — Yetersiz Katılımcı Sayısı (Kullanıcı Çalışması)

- **Olasılık:** Yüksek | **Etki:** Orta | **Skor:** 🟡 Orta
- **Azaltma:** Minimum 5 katılımcı hedefle; üniversite öğrencilerinden gönüllü bul
- **B Planı:** Kullanıcı çalışmasını pilot olarak belgele; tezin kapsamını otomatik benchmark'a çek
- **Durum:** [ ] Açık

### R10 — Araştırma Sorusu Ölçülemeyen Bir Konuma Kayıyor

- **Olasılık:** Düşük | **Etki:** Çok Yüksek | **Skor:** 🟡 Orta
- **Azaltma:** Her danışman toplantısında araştırma sorusunu gözden geçir; metrikleri erken tanımla
- **B Planı:** Daha dar bir soru formüle et (yalnızca güvenlik odaklı)
- **Durum:** [ ] Açık

---

## 4. Proje Yönetimi Riskleri

### R11 — Kapsam Şişmesi (Feature Creep)

- **Olasılık:** Yüksek | **Etki:** Yüksek | **Skor:** 🔴 Yüksek
- **Azaltma:** `PRODUCT_PLAN.md` §6 "Dışarıda Bırakılacak Özellikler" listesini her toplantıda referans al
- **B Planı:** Faz bazlı teslimat; her fazda sadece o fazın görevlerini yap
- **Durum:** [ ] Açık

### R12 — Motivasyon Düşüşü / Tükenmişlik

- **Olasılık:** Orta | **Etki:** Yüksek | **Skor:** 🔴 Yüksek
- **Azaltma:** Haftalık küçük hedefler koy; ilerlemeyi görünür tut; danışman toplantıları motivasyon noktası olsun
- **B Planı:** Kritik olmayan özellikleri kes; MVP kapsamını daralt
- **Durum:** [ ] Açık

---

## 5. Risk İzleme Takvimi

| Zaman                | Kontrol                                                  |
|----------------------|----------------------------------------------------------|
| **Haftalık**         | Aktif riskleri gözden geçir, yeni risk var mı?           |
| **Aylık**            | Risk skorlarını güncelle, azaltma planlarını değerlendir |
| **Faz geçişlerinde** | Tüm risk kaydını dahilce denetle                         |
| **Milestone'larda**  | Kapatılan riskleri belgele, yeni açılan riskleri ekle    |

---

*Risk kaydı için → bu belge.*  
*Teknik detaylar için → `SYSTEM_PLAN.md`*  
*Proje takvimi için → `PROJECT_ROADMAP.md`*
