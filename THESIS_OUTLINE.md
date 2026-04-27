# TEZ TASLAĞL (THESIS_OUTLINE)

> **Belge amacı:** Bu belge, tez çalışmasının bölüm yapısını, her bölümün kapsamını ve beklenen sayfa dağılımını tanımlar.
> **Not:** Bu taslak danışman geri bildirimiyle şekillendirilecektir.

---

## Bölüm 1: Giriş (8–10 sayfa)

### 1.1 Problemin Tanımı
- Geliştiricilerin bağlam kırılması (context fragmentation) sorunu
- Araştırma verileri: günde 1-2 saat kayıp, 23 dakika yeniden odaklanma süresi
- Mevcut AI araçlarının (ChatGPT, Copilot) bu problemi çözmedeki yetersizlikleri
- Editör-AI kopukluğunun maliyeti: hata oranı, token israfı, güven eksikliği

### 1.2 Motivasyon ve Araştırma Boşluğu
- AI destekli kod editörlüleri hız optimize eder; güvenlik ve şeffaflık arka planda kalır
- "Plan-first, approval-gated" döngüsü için ölçülebilir akademik çalışma eksikliği
- Tezin konumlandırılması: güvenli ve açıklanabilir ajan davranışı

### 1.3 Araştırma Sorusu ve Hipotez
- Ana araştırma sorusu: Plan-onay döngüsü hata oranı ve güveni iyileştirir mi?
- Alt sorular: Retrieval etkinliği, diff etkisi, güvenlik maliyeti, model karşılaştırma
- Hipotez: Onay mekanizması güvenlik ihlalini sıfıra indirir, rollback oranını %20'nin altına düşürür

### 1.4 Katkılar
- Açık kaynaklı, ölçülebilir bir ajan destekli editör prototipi
- Plan-approval döngüsünün etkinliğine ilişkin nicel ve nitel veriler
- Güvenlik modeli tasarım önerisi (workspace boundary + path normalization + write boundary + reactive safety warnings + audit log)

### 1.5 Belge Organizasyonu
- Bölümlerin kısa açıklamaları

---

## Bölüm 2: Literatür Taraması ve Arka Plan (12–15 sayfa)

### 2.1 Büyük Dil Modelleri (LLM) ve Kod Üretimi
- Transformer mimarisi ve attention mekanizması (Vaswani et al., 2017)
- Codex, Code Llama, Qwen2.5-Coder, DeepSeek-Coder gibi kod modelleri
- SLM (Small Language Models) vs. LLM karşılaştırması: parametre sayısı, hız, doğruluk
- Prompt mühendisliği ve few-shot learning etkileri kod üretiminde

### 2.2 RAG (Retrieval-Augmented Generation)
- RAG'ın temel mimarisi: retriever + generator (Lewis et al., 2020)
- Kod için RAG: AST tabanlı sembol çıkarma + embedding benzerlik araması
- Chunk stratejileri: fonksiyon bazlı, dosya bazlı, semantik parçalama
- Vektör veritabanları: FAISS, ChromaDB, SQLite-vec karşılaştırması
- Kod bağlamında precision/recall ölçümü

### 2.3 Yapay Zeka Ajanları
- ReAct (Reasoning + Acting) döngüsü (Yao et al., 2022)
- Plan-and-Execute ajan mimarisi
- Tool-use ajanları ve function calling (Schick et al., 2023)
- Reflection ve self-correction mekanizmaları
- Multi-agent vs. single-agent tartışması

### 2.4 Mevcut AI Destekli Geliştirme Araçları
- GitHub Copilot: evrim süreci ve Agent Mode (2025)
- Cursor: VS Code fork, Composer, agentic mode
- Windsurf: Cascade ajan sistemi
- Claude Code: terminal tabanlı ajan
- Devin: tam otonom ajan — güven ve kontrol sorunu
- OpenCode: açık kaynak terminal ajanı
- AWS Kiro: spec-driven otomasyon
- Google Antigravity: agent-first IDE mimarisi

### 2.5 Güvenlik ve Güven
- Human-in-the-loop (HITL) sistemleri
- Principle of Least Privilege prensibinin yazılım ajanlarına uygulanması
- Workspace boundary ve path normalization mekanizmaları
- AI güvenliği araştırmaları: alignment, jailbreak, prompt injection

### 2.6 Değerlendirme Çerçeveleri
- SWE-bench: gerçek GitHub issue'ları üzerinden ajan değerlendirmesi
- SWE-bench Verified ve SWE-bench Pro varyantları
- HumanEval, MBPP: fonksiyon seviyesi değerlendirme
- ColBench: işbirlikli benchmark (2025)
- LiveCodeBench: canlı, kontamine olmamış değerlendirme

---

## Bölüm 3: Sistem Tasarımı ve Mimari (15–18 sayfa)

### 3.1 Genel Mimari Bakış
- Monolithic electron uygulaması yapısı
- Renderer (editor + chat) ve Main (ajan + dosya sistemi) süreç ayrımı
- IPC (Inter-Process Communication) mimarisi

### 3.2 Editör Katmanı
- Monaco Editor entegrasyonu
- Dosya ağacı, sekme yönetimi, durum çubuğu
- Sözdizim vurgulama ve dil desteği

### 3.3 Bağlam Motoru (RAG Altyapısı)
- Katmanlı bağlam modeli:
  - Katman 1: Always-on (aktif dosya + proje yapısı)
  - Katman 2: On-demand retrieval (import grafı + embedding araması)
  - Katman 3: User-pinned (@dosya sözdizimi)
- İndeksleme stratejisi: nomic-embed-text + SQLite-vec
- Gizlilik filtreleri: .agentignore mekanizması

### 3.4 Ajan Döngüsü
- ReAct pattern uyarlaması: Gözlemle → Planla → Onay İste → Uygula
- Tool sistemi: read_file, write_file, search_symbols, list_files, explain
- Prompt şablonları ve model soyutlama katmanı
- Hibrit model stratejisi: bulut (Claude) + yerel (Ollama)

### 3.5 Diff Önizleme ve Onay Akışı
- Unified diff üretimi ve Monaco diff editor
- Tek dosya ve çok dosya onay senaryoları
- "Seçerek Uygula" mekanizması

### 3.6 Güvenlik Katmanları
- Workspace boundary + path normalization: çalışma dizini kısıtlaması ve traversal koruması
- Gizli dosya koruması (pozitif liste yaklaşımı)
- Atomik yazma ve undo stack
- Audit log: ~/.agentide/audit.jsonl

---

## Bölüm 4: Uygulama (Implementation) (12–15 sayfa)

### 4.1 Kullanılan Teknolojiler
- TypeScript, Electron, Monaco Editor
- Node.js runtime, SQLite-vec
- Anthropic Claude API, Ollama API
- nomic-embed-text embedding modeli

### 4.2 Proje Yapısı ve Kod Organizasyonu
- Main process modülleri
- Renderer process modülleri
- Paylaşılan tip tanımları

### 4.3 Bağlam Motoru Implementasyonu
- İndeksleme pipeline'ı akış şeması
- Embedding üretimi ve vektör deposu
- Retrieval sorgu işleme süreci

### 4.4 Ajan Döngüsü Implementasyonu
- Tool sistemi kaynak kodu
- Prompt şablonları ve değişken enjeksiyonu
- Model soyutlama katmanı arayüzü
- Hata yönetimi ve retry mantığı

### 4.5 Güvenlik Mekanizması Implementasyonu
- Path normalizasyonu ve traversal önleme kodu
- Dosya filtresi kuralları ve .agentignore parser
- Atomik yazma mekanizması (temp file + rename)
- Audit log yazıcı

### 4.6 Karşılaşılan Zorluklar ve Çözümler
- Electron bellek yönetimi
- Büyük dosyalarda indeksleme performansı
- Model latency ve streaming yanıt yönetimi
- Cross-platform uyumluluk sorunları

---

## Bölüm 5: Değerlendirme ve Deneyler (15–18 sayfa)

### 5.1 Deney Tasarımı
- 20 görevlik benchmark seti tanımı
- Görev kategorileri: tek dosya düzenleme (5), çok dosya refactor (4), hata düzeltme (4), test yazma (3), Q&A (4)
- Test projesi: ~3.000 satır, 15-20 dosya, TypeScript
- Baseline tanımı: araçsız geliştirici vs. doğrudan LLM vs. Agentic IDE

### 5.2 Değerlendirme Metrikleri
- Görev başarı oranı (task success rate)
- Güvenlik ihlali oranı (safety violation rate)
- Kullanıcı geri alma oranı (rollback rate)
- Hallucination oranı (factual accuracy)
- İkincil metrikler: gecikme, token verimliliği, retrieval doğruluğu

### 5.3 Deney Sonuçları
- Her görev kategorisi için başarı/başarısızlık dağılımı
- Bulut model vs. yerel model karşılaştırması
- Retrieval vs. tam dosya gönderme karşılaştırması
- Güvenlik testi sonuçları

### 5.4 Kullanıcı Çalışması (Opsiyonel)
- 5-10 katılımcılı pilot çalışma
- System Usability Scale (SUS) anket sonuçları
- Nitel geri bildirimler ve davranış gözlemleri

### 5.5 Tartışma
- Hipotez desteklendi mi?
- Hangi görev türlerinde ajan başarılı, hangilerinde başarısız?
- Plan-approval döngüsünün gerçek etkisi
- Güvenlik modelinin maliyeti ve değeri
- Sonuçların genelleştirilebilirliği ve sınırları

---

## Bölüm 6: Sonuç ve Gelecek Çalışmalar (4–5 sayfa)

### 6.1 Katkıların Özeti
- Proje ne başardı?
- Araştırma sorusuna verilen yanıt
- Akademik katkının değerlendirilmesi

### 6.2 Bilinen Sınırlar
- Ne yapılamadı ve neden
- Model bağımlılığı ve prompt kırılganlığı
- Benchmarkların temsililik sınırı

### 6.3 Gelecek Çalışmalar
- Terminal entegrasyonu (process/shell isolation güvenlik modeli ile)
- Proaktif analiz: kullanıcı tetiklemesi olmadan uyarı mekanizması
- Multi-agent hipotezi: uzmanlaşmış ajanlar arası işbirliği
- MCP (Model Context Protocol) desteği
- VS Code extension olarak yeniden paketleme
- Daha büyük kullanıcı çalışması ile UX doğrulama

---

## Ekler

### Ek A: Prompt Şablonları
- Ajan sistem prompt'u
- Tool çağrı şablonları
- Hata düzeltme ve refactor özel prompt'ları

### Ek B: Benchmark Görev Seti
- 20 görevin tam tanımları
- Beklenen çıktılar ve değerlendirme rubriği

### Ek C: Deney Sonuçları Detay Tabloları
- Görev bazlı ham sonuçlar
- İstatistiksel analiz tabloları

### Ek D: Kullanıcı Çalışması Materyalleri
- Katılımcı bilgilendirme formu
- SUS anket formu
- Gözlem notları şablonu

---

**Tahmini toplam sayfa:** 66–81 sayfa (ekler hariç)
