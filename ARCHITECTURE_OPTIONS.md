# MİMARİ SEÇENEKLER (ARCHITECTURE_OPTIONS)

> **Belge amacı:** Editör platformu için değerlendirilen mimari seçenekleri karşılaştırır.  
> Karar gerekçeleri ve alternatifler belgelenir.

---

## 1. Framework Karşılaştırması

### Seçenek A: Electron + Monaco (ÖNERİLEN)

**Açıklama:** VS Code'un temelini oluşturan Electron framework'ü ile Monaco editör bileşeni. Web teknolojileri (HTML,
CSS, JS/TS) üzerine inşa edilen masaüstü uygulama.

**Avantajlar:**

- Monaco Editor, VS Code'un editör bileşenidir — olgun, stabil, kapsamlı API
- JavaScript/TypeScript ekosistemi: zengin NPM paketleri, LLM API kütüphaneleri
- Cross-platform: Windows, macOS, Linux tek kod tabanıyla
- Büyük topluluk ve dokümantasyon (VS Code extension ekosistemine yakın)
- Node.js runtime: dosya sistemi erişimi, child_process, native modüller
- SQLite-vec gibi native bağımlılıklar kullanılabilir

**Dezavantajlar:**

- Yüksek bellek kullanımı (~300-500 MB boşta)
- Chromium bundle'ı nedeniyle büyük uygulama boyutu (~150-200 MB)
- Güvenlik: Renderer process'te potansiyel XSS/injection riskleri
- Performance: DOM tabanlı UI, native uygulamalardan yavaş

**2025 Durumu:**

- Cursor, Windsurf gibi başarılı AI IDE'ler Electron tabanlıdır
- Electron v30+ önemli performans iyileştirmeleri içerir
- WASM desteği sayesinde bazı ağır işlemler native hıza yakın çalıştırılabilir

### Seçenek B: Tauri (Rust Backend)

**Açıklama:** Rust tabanlı backend + sistem WebView (Chromium bundle yok). Daha hafif bir alternatif.

**Avantajlar:**

- Çok düşük bellek kullanımı (~30-50 MB boşta)
- Küçük uygulama boyutu (~5-10 MB)
- Rust güvenliği: bellek güvenliği garantisi
- Tauri v2: mobil platform desteği (iOS, Android)
- Daha iyi güvenlik modeli (varsayılan olarak kısıtlı API erişimi)

**Dezavantajlar:**

- Monaco Editor entegrasyonu sorunlu (WebView uyumluluk farklılıkları)
- Rust öğrenme eğrisi: TypeScript'ten çok daha dik
- Daha küçük ekosistem: AI/LLM kütüphaneleri sınırlı
- WebView farkları: Windows (WebView2), macOS (WKWebView), Linux (WebKitGTK) — platform bazlı rendering farklılıkları
- Node.js runtime yok: SQLite-vec, native modüller için Rust binding gerekir

**2025 Durumu:**

- Tauri v2 stabil, production-ready
- Ancak AI IDE ekosisteminde henüz başarılı bir Tauri örneği yok
- Rust + LLM entegrasyonu için kütüphane desteği gelişmekte

### Seçenek C: Web Uygulaması (Browser-based)

**Açıklama:** Tam tarayıcı tabanlı IDE. Monaco doğal ortamında çalışır.

**Avantajlar:**

- Kurulum gerekliliği yok
- Her platformda çalışır
- Dağıtım kolay (URL paylaş)
- Monaco en iyi bu ortamda çalışır

**Dezavantajlar:**

- Yerel dosya sistemi erişimi kısıtlı (File System Access API sadece Chrome/Edge)
- Yerel model (Ollama) çalıştırmak backend gerektirir
- Güvenlik modeli tamamen farklı: browser sandbox kısıtlamaları
- Offline çalışma mümkün değil
- Performans: büyük projeler için yetersiz

### Seçenek D: VS Code Extension

**Açıklama:** Mevcut VS Code içinde çalışan bir extension olarak geliştirme.

**Avantajlar:**

- Kullanıcılar zaten VS Code kullanıyor
- Extension API zengin ve iyi belgelenmiş
- Dağıtım kolay (VS Code Marketplace)
- Editör katmanı hazır — sadece ajan mantığına odaklanılır

**Dezavantajlar:**

- Extension API sınırlamaları: bazı UI özelleştirmeleri mümkün değil
- VS Code güncellemelerinde kırılma riski (API uyumsuzluğu)
- Bağımsız ürün değil, VS Code'a bağımlı
- Araştırma sorusu açısından: "Kendi aracınız mı, yoksa başkasının aracının eklentisi mi?" argümanı
- Rekabetçi ortam: Copilot, Cursor extension'ları zaten mevcut

---

## 2. Karar Matrisi

| Kriter                   | Ağırlık  | Electron | Tauri   | Web App | VS Code Ext  |
|--------------------------|----------|----------|---------|---------|--------------|
| Monaco desteği           | %20      | 9/10     | 6/10    | 10/10   | N/A (mevcut) |
| AI/LLM ekosistemi        | %20      | 9/10     | 5/10    | 8/10    | 8/10         |
| Öğrenme eğrisi           | %15      | 7/10     | 3/10    | 8/10    | 7/10         |
| Dosya sistemi erişimi    | %15      | 10/10    | 10/10   | 3/10    | 8/10         |
| Yerel model desteği      | %10      | 9/10     | 8/10    | 4/10    | 7/10         |
| Performans               | %10      | 5/10     | 9/10    | 6/10    | 8/10         |
| Bağımsız araştırma ürünü | %10      | 10/10    | 10/10   | 8/10    | 3/10         |
| **Toplam**               | **%100** | **8.3**  | **6.2** | **7.0** | **6.7**      |

---

## 3. Nihai Karar

**Seçilen:** Electron + Monaco

**Gerekçe:**

1. AI IDE ekosisteminde kanıtlanmış (Cursor, Windsurf aynı temel)
2. Monaco Editor'ün en iyi çalıştığı ortam
3. TypeScript bilgisi projeye transfer edilebilir
4. NPM ekosistemi LLM entegrasyonunu kolaylaştırır
5. Bağımsız araştırma ürünü olarak konumlandırılabilir

**Tauri neden reddedildi:**

- Rust öğrenme eğrisi 1.5 yıllık projede kritik zaman kaybı
- AI/LLM JavaScript kütüphaneleri Rust'a portlanmamış
- WebView farklılıkları Monaco'da sorun çıkarabilir

**Yeniden değerlendirme koşulları:**

- Electron bellek kullanımı proje gereksinimlerini karşılayamazsa → Tauri değerlendirilir
- Tez sonrası ürünleştirme aşamasında Tauri migration planlanabilir

---

*Mimari kararlar için → `SYSTEM_PLAN.md`*  
*Teknik yığın detayları için → `TECH_STACK_AND_AI.md`*
