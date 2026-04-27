# DAĞITIM VE PAKETLEME (DEPLOYMENT_AND_PACKAGING)

> **Belge amacı:** Uygulamanın geliştirme ortamında çalıştırılması, paketlenmesi ve dağıtılmasına ilişkin planı belgeler.

---

## 1. Geliştirme Ortamı

### 1.1 Gereksinimler

| Bileşen | Versiyon | Açıklama |
|---|---|---|
| Node.js | 20 LTS+ | Runtime |
| npm | 10+ | Paket yöneticisi |
| TypeScript | 5.4+ | Dil |
| Electron | 30+ | Masaüstü framework |
| Git | 2.40+ | Kaynak kontrol |
| Ollama | 0.3+ | Yerel model çalıştırıcı (opsiyonel) |

### 1.2 Kurulum Adımları

```bash
# Repo'yu klonla
git clone https://github.com/[user]/agentic-ide.git
cd agentic-ide

# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır
npm run dev

# TypeScript derlemesi
npm run build

# Testleri çalıştır
npm test
```

### 1.3 Ortam Değişkenleri

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `ANTHROPIC_API_KEY` | Evet (bulut kullanılacaksa) | Claude API anahtarı |
| `OLLAMA_HOST` | Hayır | Ollama sunucu adresi (varsayılan: `http://localhost:11434`) |
| `AGENTIDE_LOG_LEVEL` | Hayır | Log seviyesi: `debug`, `info`, `warn`, `error` |

---

## 2. Paketleme Stratejisi

### 2.1 MVP Döneminde (Ay 1-15)

**Karar:** Paketleme yapılmaz. `npm run dev` ile çalıştırılır.

**Gerekçe:**
- Demo için yeterli
- Paketleme karmaşıklığı (code signing, auto-update) zaman kaybı
- Hızlı iterasyon gerekiyor

### 2.2 Savunma Öncesi (Ay 16-17)

Jüri demosu için basit paketleme yapılabilir:

| Seçenek | Araç | Çıktı | Karmaşıklık |
|---|---|---|---|
| **Electron-Forge** | `@electron-forge/cli` | `.exe` / `.dmg` / `.AppImage` | Orta |
| **Electron-Builder** | `electron-builder` | Installer + portable | Orta-Yüksek |
| **Portable build** | `electron-packager` | Klasör (zip ile dağıt) | Düşük |

**Tavsiye:** `electron-forge` ile basit portable build. Installer ve auto-update gereksiz.

### 2.3 Paketleme Kontrol Listesi

- [ ] Production build çalışıyor mu? (`npm run build`)
- [ ] Node native modüller (SQLite-vec) doğru derlenmiş mi?
- [ ] API anahtarları pakete gömülmedi mi?
- [ ] Uygulama boyutu kabul edilebilir mi? (< 300 MB)
- [ ] Windows Defender false positive gerektirmiyor mu?
- [ ] Kullanıcı makinedeki ilk açılış sorunsuz mu?

---

## 3. CI/CD Pipeline

### 3.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

### 3.2 CI/CD Kararları

| Özellik | MVP'de | Neden |
|---|---|---|
| Lint + TypeCheck | ✅ | Kod kalitesi temel |
| Birim testler | ✅ | Regresyon önleme |
| Build kontrolü | ✅ | Derleme hatası yakalama |
| Auto paketleme | ❌ | Gereksiz karmaşıklık |
| Auto deploy | ❌ | Masaüstü uygulama, deploy yok |
| SonarQube | ❌ | Tez için overkill |

---

## 4. Dağıtım Planı

### 4.1 Jüri Demosu İçin
1. Geliştirme makinesinde `npm run dev` ile çalıştır
2. Projeksiyon/ekran paylaşımı ile göster
3. Yedek: önceden hazırlanmış portable build USB'de

### 4.2 Kaynak Kod Teslimi
1. GitHub repository (public veya university-restricted)
2. `README.md` ile kurulum ve çalıştırma kılavuzu
3. `docs/` klasöründe mimari dokümantasyon
4. `.env.example` ile gerekli ortam değişkenleri şablonu
5. Demo videosu (5 dakika, önceden kaydedilmiş)

---

*Dağıtım planı için → bu belge.*  
*Teknik yığın için → `TECH_STACK_AND_AI.md`*  
*Proje takvimi için → `PROJECT_ROADMAP.md`*