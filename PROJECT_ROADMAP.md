# PROJE_YOL_HARITASI (PROJECT_ROADMAP)

Hocam selamlar, proje süresinin 2 yıl olması elimizi çok rahatlatacaktır diye düşünmekteyim. Aceleye getirmeden, akademik derinliği olan bir iş çıkarmak için şöyle bir 4 dönemlik plan taslağı hazırladım. Görüşlerinize sunarım.

## Proje Yönetimi
Hocam haftalık ilerlemeyi takip etmek için **Trello** kullanalım demiştiniz ben de bu konuda kendimi geliştirmeye çalışıyorum hocam. Siz bana kendi repo'nuzun linkini paylaştığınızda (bunu siz oluşturmuştunuz diye hatırlıyoeum hocam), "Yapılacaklar", "Devam Edenler" ve "Bitenler" şeklinde net bir süreç izler ve sizin öğretilerinizden faydalanabilirim hocam.

---

## 1. Dönem: Ön Araştırma ve Konsept (İlk 6 Ay)
**Odak:** Literatür taraması, mimari kararların netleşmesi ve klasikleşmiş "Hello World" prototipi.

- **Ay 1-2**:
  - Literatürdeki Ajan/LLM-SML makalelerinin okunması.
  - Mimari seçeneklerin (Electron vs Tauri) ufak demolarla denenip son kararın verilmesi.
- **Ay 3-4**:
  - Proje iskeletinin oluşturulması.
  - Basit bir metin editörü (MVP) ayağa kaldırılması.
- **Ay 5-6**:
  - Trello üzerinde ilk backlog'un (iş listesi) oluşturulması.
  - Dönem sonu raporu: "Hocam altyapı hazır, mimariden eminiz."

## 2. Dönem: Çekirdek Geliştirme (6-12. Ay)
**Odak:** Editörün editör gibi hissettirmesi (UX) ve temel AI hazırlığı.

- **Yapılacaklar**:
  - Dosya ağacı, sekmeler, arama özellikleri.
  - Temel terminal entegrasyonu.
  - Veri gizliliği altyapısının (yerel vs bulut ayrımı) kodlanması.
- **Hedef**: Dönem sonunda elimizde kod yazılabilir, çökmeyen sağlam bir editör olması.

## 3. Dönem: Ajan Entegrasyonu (12-18. Ay)
**Odak:** Projenin asıl yenilikçi tarafı olan "AGENT AI".

- **Yapılacaklar**:
  - RAG (Bağlam kurma) sisteminin eklenmesi.
  - Ajanın "Planla -> Onay Al -> Uygula" döngüsünün kodlanması.
  - Güvenlik duvarlarının (Dry-run, Undo) inşası.
- **Hedef**: Ajanın basit görevleri (örn: "Buton rengini değiştir") kendi başına yapabilmesi.

## 4. Dönem: Tez Yazımı ve Final (18-24. Ay)
**Odak:** Deneyler, ölçümler ve akademik çıktı.

- **Yapılacaklar**:
  - Ajanın performansının ölçülmesi (Başarı oranı, hız).
  - Tezin yazılması.
  - Final demosunun ve savunma sunumunun hazırlanması.
- **Hedef**: Başarıyla mezuniyet :)

### Kritik Karar Noktaları
- **1. Dönem Sonu**: Mimariden memnun muyuz? Radikal değişimler  için son şans diye düşündüm.
- **3. Dönem Başı**: AI maliyetleri (API parası) bütçemizi aşıyor mu? Yerel modellere dönmeli miyiz?
