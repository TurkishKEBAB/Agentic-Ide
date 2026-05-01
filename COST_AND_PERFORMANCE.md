# MALİYET VE PERFORMANS ANALİZİ (COST_AND_PERFORMANCE)

> **Belge amacı:** Token maliyetleri, model performansı ve sistem kaynak kullanımı analizini sunar.  
> Teknik kararlar için → `TECH_STACK_AND_AI.md`

---

## 1. LLM Token Maliyet Analizi

### 1.1 Model Fiyatlandırma Tablosu (2025 Güncel)

| Model           | Input (1M token) | Output (1M token) | Context Window | Hız            |
|-----------------|------------------|-------------------|----------------|----------------|
| Claude Sonnet 4 | $3.00            | $15.00            | 200K           | Hızlı          |
| Claude Opus 4   | $15.00           | $75.00            | 200K           | Orta           |
| GPT-4.1         | $2.00            | $8.00             | 1M             | Hızlı          |
| GPT-4.1 mini    | $0.40            | $1.60             | 1M             | Çok hızlı      |
| Gemini 2.5 Pro  | $1.25            | $10.00            | 1M             | Hızlı          |
| Ollama (yerel)  | **$0.00**        | **$0.00**         | Model bağımlı  | Donanıma bağlı |

### 1.2 Görev Başına Tahmini Token Kullanımı

| Görev Türü            | Yaklaşık Input Token | Yaklaşık Output Token | Claude Sonnet Maliyet |
|-----------------------|----------------------|-----------------------|-----------------------|
| Tek dosya düzenleme   | 2.000-5.000          | 500-2.000             | ~$0.04                |
| Çok dosyalı refactor  | 8.000-20.000         | 2.000-5.000           | ~$0.14                |
| Hata tespiti/düzeltme | 5.000-15.000         | 1.000-4.000           | ~$0.10                |
| Test yazma            | 3.000-8.000          | 2.000-6.000           | ~$0.10                |
| Kod tabanı Q&A        | 3.000-10.000         | 500-2.000             | ~$0.06                |

### 1.3 Aylık Maliyet Tahmini

| Kullanım Yoğunluğu | Günlük Görev | Aylık Token | Aylık Maliyet (Sonnet) |
|--------------------|--------------|-------------|------------------------|
| Düşük              | 5-10 görev   | ~500K       | ~$1.50-$3.00           |
| Orta               | 20-30 görev  | ~2M         | ~$6.00-$12.00          |
| Yoğun              | 50+ görev    | ~5M+        | ~$15.00-$30.00         |

### 1.4 Retrieval vs. Tam Dosya Gönderme Maliyet Karşılaştırması

| Yaklaşım               | 15 Dosyalı Proje      | Token Sayısı   | Maliyet (Sonnet) |
|------------------------|-----------------------|----------------|------------------|
| **Tüm dosya gönderme** | 15 dosya × ~200 satır | ~45.000 token  | $0.135           |
| **Retrieval (top-5)**  | 5 parça × ~50 satır   | ~7.500 token   | $0.023           |
| **Tasarruf**           |                       | **%83 azalma** | **%83 azalma**   |

> Retrieval yaklaşımı hem maliyeti hem de sinyal-gürültü oranını iyileştirir.

---

## 2. Performans Hedefleri

### 2.1 Editör Performansı

| Metrik                     | Hedef    | VS Code Referans | Gerçekçi Beklenti |
|----------------------------|----------|------------------|-------------------|
| Uygulama açılış süresi     | < 3 sn   | ~1.5 sn          | 2-4 sn            |
| Dosya açma (< 1 MB)        | < 500 ms | ~200 ms          | 300-800 ms        |
| Sözdizim vurgulama         | Anlık    | Anlık            | Monaco sağlar     |
| Bellek kullanımı (boşta)   | < 500 MB | ~350 MB          | 300-500 MB        |
| Bellek kullanımı (5 sekme) | < 800 MB | ~500 MB          | 500-900 MB        |

**Önemli not:** VS Code'a yakın performans hedeflenmişti ancak bu gerçekçi değildir. Hedef "kullanılabilir performans"
olmalıdır — jüri demosu için yeterli hız ve stabilite.

### 2.2 Ajan Performansı

| Metrik                               | Bulut Model (Claude) | Yerel Model (Ollama/Llama3) |
|--------------------------------------|----------------------|-----------------------------|
| İlk token gecikmesi (TTFT)           | 1-3 saniye           | 3-10 saniye                 |
| Toplam yanıt süresi (basit görev)    | 5-15 saniye          | 15-60 saniye                |
| Toplam yanıt süresi (karmaşık görev) | 15-45 saniye         | 60-180 saniye               |
| Streaming desteği                    | ✅                    | ✅                           |
| Concurrent request                   | ✅                    | Donanıma bağlı              |

### 2.3 İndeksleme Performansı

| Proje Boyutu          | İlk İndeksleme | Tek Dosya Güncelleme |
|-----------------------|----------------|----------------------|
| Küçük (< 50 dosya)    | < 10 saniye    | < 1 saniye           |
| Orta (50-200 dosya)   | 10-30 saniye   | < 1 saniye           |
| Büyük (200-500 dosya) | 30-120 saniye  | < 2 saniye           |

---

## 3. Donanım Gereksinimleri

### 3.1 Minimum Gereksinimler (Yalnızca Bulut Model)

| Bileşen  | Gereksinim                       |
|----------|----------------------------------|
| RAM      | 4 GB                             |
| Disk     | 500 MB (uygulama) + proje boyutu |
| İnternet | Gerekli (bulut API)              |
| GPU      | Gerekli değil                    |

### 3.2 Yerel Model İçin Ek Gereksinimler

| Model              | RAM   | GPU VRAM         | Disk |
|--------------------|-------|------------------|------|
| Qwen2.5-Coder 1.5B | 4 GB  | Opsiyonel (2 GB) | 1 GB |
| Llama 3.2 3B       | 8 GB  | 4 GB             | 2 GB |
| Llama 3.1 8B       | 16 GB | 8 GB             | 5 GB |
| CodeLlama 13B      | 16 GB | 10 GB            | 8 GB |

---

## 4. Tez İçin Bütçe Planlaması

### 4.1 Tahmini Toplam Maliyet (18 Ay)

| Kalem                                | Tahmini Maliyet |
|--------------------------------------|-----------------|
| Claude API (geliştirme + test)       | ~$50-100        |
| Claude API (benchmark çalıştırma)    | ~$20-40         |
| Ollama (yerel — donanım maliyet yok) | $0              |
| Domain + hosting (opsiyonel)         | $0-50           |
| **Toplam**                           | **~$70-190**    |

### 4.2 Maliyet Kontrol Mekanizmaları

- Günlük API harcama limiti (hard cap): $5/gün
- Geliştirme sırasında yerel model kullanımı öncelik
- Bulut API yalnızca benchmark ve karmaşık görevler için
- Token sayacı dashboard (toplam + görev bazında)

---

*Maliyet ve performans için → bu belge.*  
*Teknik yığın detayları için → `TECH_STACK_AND_AI.md`*  
*Ürün kapsamı için → `PRODUCT_PLAN.md`*
