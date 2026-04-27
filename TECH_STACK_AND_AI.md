# TEKNOLOJİ YIĞINI VE AI MODEL STRATEJİSİ (TECH_STACK_AND_AI)

> **Belge amacı:** Projede kullanılacak teknolojileri, AI model seçimini ve soyutlama stratejisini belgeler.  
> Mimari seçenekler için → `ARCHITECTURE_OPTIONS.md`

---

## 1. Teknoloji Yığını

### 1.1 Geliştirme Dili ve Runtime

| Teknoloji | Versiyon | Rol | Neden? |
|---|---|---|---|
| **TypeScript** | 5.4+ | Ana geliştirme dili | Tip güvenliği, refactor kolaylığı, VS Code ekosistemi |
| **Node.js** | 20 LTS | Runtime + backend işlemleri | Dosya sistemi, child_process, native modüller |
| **Electron** | 30+ | Masaüstü framework | Cross-platform, Monaco desteği, olgun ekosistem |

### 1.2 UI ve Editör

| Teknoloji | Rol | Neden? |
|---|---|---|
| **Monaco Editor** | Kod editörü | VS Code editör bileşeni, zengin API, diff viewer |
| **HTML/CSS** | UI katmanı | Electron renderer, özel stiller |
| **Vanilla JS/TS** | UI mantığı | Framework karmaşıklığından kaçınma (React/Vue gereksiz) |

### 1.3 Veri ve İndeksleme

| Teknoloji | Rol | Neden? |
|---|---|---|
| **SQLite** | Yerel veritabanı | Sıfır dış bağımlılık, tek dosya, taşınabilir |
| **sqlite-vec** | Vektör araması | SQLite extension, embedding benzerlik sorgusu |
| **nomic-embed-text** | Embedding modeli | Yerel, API maliyeti yok, yüksek kalite |

### 1.4 Build ve Geliştirme Araçları

| Araç | Rol |
|---|---|
| **tsup** veya **esbuild** | TypeScript derleme + bundling |
| **Vitest** | Test framework |
| **ESLint** | Kod kalitesi |
| **Prettier** | Kod formatlandırma |
| **GitHub Actions** | CI pipeline |

---

## 2. AI Model Stratejisi

### 2.1 Model Seçim Yaklaşımı (MVP)

> **Karar:** MVP'de model seçimi **kullanıcı tercihine bırakılır**. Otomatik karmaşıklık-tabanlı router MVP DIŞIDIR (gelecek çalışma). Detay: `docs/adr/ADR-004-manual-model-selection.md`.

Kullanıcı, görevin gereksinimine göre yerel veya bulut modeli kendisi seçer. Seçim arayüzü:
- **Durum çubuğunda** aktif model adı gösterilir; tıklandığında provider listesi açılır (UC-05)
- **Tercih ayarları** (`preferences.json`): varsayılan model + projeye özgü override
- Otomatik anahtarlama veya görev karmaşıklığı analizi yapılmaz

**Üç tercih profili (kullanıcı seçer):**
- 🔒 **Yalnızca Yerel:** Tüm görevler Ollama'da çalışır
- ⚖️ **Manuel Hibrit (varsayılan):** Kullanıcı her görevde seçer; sistem otomatik karar vermez
- ☁️ **Yalnızca Bulut:** Tüm görevler Claude API'de çalışır

**Otomatik router neden MVP dışı:**
- Görev karmaşıklığı sınıflandırıcısı kendi başına bir araştırma sorusu gerektirir
- Yanlış sınıflandırma kullanıcıyı şaşırtır ve güveni zedeler
- Plan-approval döngüsünün etkinliği ölçülürken model seçimi sabit/şeffaf olmalıdır
- Tezde "manuel seçim" varsayımı altında ölçülen sonuçlar daha temiz savunulur

### 2.2 Desteklenen Modeller

#### Bulut Modeller

| Model | Sağlayıcı | Context Window | Güçlü Yanı |
|---|---|---|---|
| **Claude Sonnet 4** | Anthropic | 200K token | Kod üretimi, plan yapma, hız/kalite dengesi |
| **Claude Opus 4** | Anthropic | 200K token | Derin akıl yürütme, karmaşık analiz |
| *(Gelecek) GPT-4.1* | OpenAI | 1M token | Geniş context, çok dilli destek |
| *(Gelecek) Gemini 2.5 Pro* | Google | 1M token | Uzun bağlam, multimodal (gelecek) |

#### Yerel Modeller (Ollama)

| Model | Parametre | RAM | Güçlü Yanı |
|---|---|---|---|
| **Qwen2.5-Coder 1.5B** | 1.5B | 4 GB | Çok hızlı, basit görevler |
| **Qwen2.5-Coder 7B** | 7B | 8 GB | İyi code completion, açıklama |
| **Llama 3.2 3B** | 3B | 6 GB | Genel amaçlı, hızlı |
| **Llama 3.1 8B** | 8B | 16 GB | Daha derin akıl yürütme |
| **DeepSeek-Coder-V2** | 16B | 16 GB+ | Güçlü kod üretimi |
| **CodeLlama 13B** | 13B | 16 GB | Uzmanlaşmış kod modeli |

### 2.3 Model Seçim Kriterleri

| Kriter | Bulut Tercih | Yerel Tercih |
|---|---|---|
| Görev karmaşıklığı | Çok dosyalı refactor, mimari analiz | Yorum ekleme, tek satır düzeltme |
| Gizlilik gerekliliği | Açık kaynak proje | Kurumsal / gizli proje |
| İnternet bağlantısı | Mevcut | Yok veya sınırlı |
| Maliyet hassasiyeti | Düşük | Yüksek |
| Yanıt kalitesi gereksinimi | Kritik (hata düzeltme) | Rutin (formatlama) |

---

## 3. Model Soyutlama Katmanı

### 3.1 Arayüz Tasarımı

```typescript
interface ModelProvider {
  /** Model adı ve versiyonu */
  readonly name: string;
  
  /** Bir mesaj listesi alır, yanıt stream'i döner */
  chat(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>;
  
  /** Modelin desteklediği maksimum token sayısı */
  readonly maxTokens: number;
  
  /** Model erişilebilir mi? (bağlantı kontrolü) */
  ping(): Promise<boolean>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
}

interface ChatOptions {
  temperature?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  tools?: ToolDefinition[];
}
```

### 3.2 Yeni Sağlayıcı Ekleme

Yeni bir model sağlayıcısı eklemek:
1. `ModelProvider` interface'ini implemente et
2. `providers/` klasöründe yeni dosya oluştur
3. Model registry'ye kaydet
4. Kullanıcı ayarlarına ekle

**Hedef:** Her yeni sağlayıcı tek dosya değişikliği olsun.

---

## 4. Tool Calling ve Function Calling

### 4.1 Tool Sistemini Destekleyen Modeller

| Model | Tool Calling | Güvenilirlik |
|---|---|---|
| Claude Sonnet 4 | ✅ Native | Yüksek |
| Claude Opus 4 | ✅ Native | Çok yüksek |
| GPT-4.1 | ✅ Native | Yüksek |
| Llama 3.1 8B | ✅ Fonksiyon çağrısı | Orta |
| Qwen2.5-Coder 7B | ⚠ Sınırlı | Düşük-Orta |

### 4.2 Tool Tanımları

```typescript
const tools: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Belirtilen dosyanın içeriğini okur',
    parameters: {
      path: { type: 'string', description: 'Okunacak dosyanın yolu' }
    }
  },
  {
    name: 'write_file',
    description: 'Belirtilen dosyaya içerik yazar (onay gerektirir)',
    parameters: {
      path: { type: 'string', description: 'Yazılacak dosyanın yolu' },
      content: { type: 'string', description: 'Yazılacak içerik' }
    }
  },
  {
    name: 'search_symbols',
    description: 'Kod tabanında sembol ve metin araması yapar',
    parameters: {
      query: { type: 'string', description: 'Arama sorgusu' }
    }
  },
  {
    name: 'list_files',
    description: 'Belirtilen dizindeki dosyaları listeler',
    parameters: {
      pattern: { type: 'string', description: 'Glob pattern (ör: src/**/*.ts)' }
    }
  }
];
```

---

## 5. MCP (Model Context Protocol) — Gelecek Çalışma

### 5.1 MCP Nedir?
- Anthropic tarafından geliştirilen açık standart
- AI modellerinin dış araçlar ve veri kaynaklarıyla etkileşim protokolü
- GitHub Copilot ve diğer araçlar tarafından benimsenmeye başlandı (2025)

### 5.2 Neden MVP'de Yok?
- Standart henüz olgunlaşmamış (hızlı değişiyor)
- Kendi tool sistemi yeterli ve daha basit
- MCP eklemek ekstra karmaşıklık (sunucu/istemci mimarisi)

### 5.3 Ne Zaman Eklenebilir?
- Tez sonrası, standart stabil hale geldiğinde
- Soyutlama katmanı MCP'yi de destekleyecek şekilde tasarlanmalı

---

*Teknoloji yığını için → bu belge.*  
*Mimari seçenekler için → `ARCHITECTURE_OPTIONS.md`*  
*Maliyet analizi için → `COST_AND_PERFORMANCE.md`*
