# VERİ GİZLİLİĞİ VE KORUMA (DATA_AND_PRIVACY)

> **Belge amacı:** Kullanıcı verilerinin toplanması, işlenmesi ve korunmasına ilişkin politikaları tanımlar.  
> Güvenlik katmanları için → `SAFETY_AND_GUARDRAILS.md`

---

## 1. Veri Akışı Haritası

### 1.1 Kullanıcı Verileri ve Nereye Gider

| Veri Türü                | Yerel Kalır | Bulut Modele Gönderilir    | Loglanır                 |
|--------------------------|-------------|----------------------------|--------------------------|
| Kaynak kod dosyaları     | ✅           | ✅ (yalnızca ilgili bağlam) | Dosya adı (içerik değil) |
| Proje dizin yapısı       | ✅           | ✅ (dosya/klasör adları)    | Yok                      |
| Kullanıcı chat mesajları | ✅           | ✅                          | Zaman damgası            |
| Ajan yanıtları           | ✅           | ❌ (buluttan gelir)         | Zaman damgası            |
| Embedding vektörleri     | ✅           | ❌ (yerel üretilir)         | Yok                      |
| API anahtarları          | ✅           | ❌                          | Yok                      |
| `.env` / gizli dosyalar  | ✅           | **❌ KESİNLİKLE HAYIR**     | İhlal girişimi loglanır  |
| Audit log                | ✅           | ❌                          | N/A (log kendisi)        |
| Kullanıcı tercihleri     | ✅           | ❌                          | Yok                      |

### 1.2 Veri Akış Diyagramı

```
Kullanıcı → [Chat mesajı]
    ↓
Bağlam Motoru → [İlgili kod parçaları retrieve]
    ↓
Gizlilik Filtresi → [.env, .pem, .key dosyaları çıkarılır]
    ↓
  ┌─── Yerel Model (Ollama) ← Veri yerel kalır ✅
  │
  └─── Bulut Model (Claude API) ← Veri HTTPS ile gönderilir ⚠
           ↓
      API sağlayıcı gizlilik politikası geçerlidir
```

---

## 2. Yerel Model vs. Bulut Model: Gizlilik Karşılaştırması

| Özellik                          | Yerel Model (Ollama)       | Bulut Model (Claude API)     |
|----------------------------------|----------------------------|------------------------------|
| Veri nereye gider?               | Hiçbir yere, tamamen yerel | Anthropic sunucularına       |
| API kullanım verisi loglanır mı? | Hayır                      | Anthropic politikasına bağlı |
| İnternet bağlantısı gerekli mi?  | Hayır                      | Evet                         |
| KVKK/GDPR uyumluluğu             | Otomatik (veri çıkmaz)     | API sağlayıcı DPA gerekli    |
| Performans                       | Yavaş (donanıma bağlı)     | Hızlı                        |
| Kod güvenliği                    | Maksimum                   | Sağlayıcıya güven            |

### 2.1 Kullanıcıya Gizlilik Kontrolü Sunulması

Kullanıcı aşağıdaki tercihlerden birini seçebilir:

- **🔒 Yalnızca Yerel:** Tüm veriler cihazda kalır. Bulut API hiç kullanılmaz.
- **⚖️ Manuel Hibrit (varsayılan):** Kullanıcı görev bazında yerel veya bulut modeli seçer; sistem otomatik karmaşıklık
  tabanlı routing yapmaz.
- **☁️ Yalnızca Bulut:** Tüm görevler bulut modele gönderilir (en yüksek kalite, en yüksek veri çıkışı).

---

## 3. KVKK / GDPR Uyumluluk Değerlendirmesi

### 3.1 KVKK (Kişisel Verilerin Korunması Kanunu — Türkiye)

| İlke               | Durum | Açıklama                                                     |
|--------------------|-------|--------------------------------------------------------------|
| Hukuka uygunluk    | ✅     | Kullanıcı açık rıza ile veri gönderir (model seçimi)         |
| Amaçla bağlılık    | ✅     | Veri yalnızca kod analizi için kullanılır                    |
| Veri minimizasyonu | ✅     | Yalnızca ilgili bağlam gönderilir (tüm repo değil)           |
| Doğruluk           | ⚠     | Veri doğruluğu kullanıcı sorumluluğunda                      |
| Saklama süresi     | ✅     | Yerel veri kullanıcı kontrolünde; bulut sağlayıcı politikası |
| Güvenlik           | ✅     | HTTPS iletişim + gizli dosya filtresi                        |

### 3.2 GDPR (AB — referans olarak)

- **Veri işleme temeli:** Meşru menfaat (yazılım geliştirme verimliliği)
- **Veri taşınabilirliği:** Tüm veriler yerel dosya sisteminde, kullanıcı doğrudan erişebilir
- **Silme hakkı:** Kullanıcı projeyi ve audit log'u istediği zaman silebilir
- **Veri koruma etki değerlendirmesi (DPIA):** Bulut model kullanımında önerilir

---

## 4. API Anahtarı Güvenliği

### 4.1 Önerilen Saklama Sözleşmesi (MVP — Uygulama Bekliyor)

- `~/.agentide/config.json` yalnızca boş olmayan `apiKeyRef` referansı ve sır içermeyen provider ayarlarını saklar;
  ham API anahtarı config'e yazılmaz.
- Anahtar OS credential store'da veya anahtarı OS tarafından korunan şifreli secret store'da tutulur. Gerçek
  mekanizma ve Windows/macOS/Linux davranışı uygulama spike'ında seçilir; kabul edilmiş teknoloji kararı değildir.
- Anahtarı okuma/kullanma yetkisi main-process broker'dadır. Onboarding girdisi dar preload/IPC çağrısıyla iletilir;
  anahtar renderer'a geri döndürülmez ve ajan araçlarına açılmaz.
- Güvenli storage yoksa cloud credential işlemi açık hata verir; plaintext config veya `.env` fallback'i yapılmaz.
  Kullanıcı yerel profili seçebilir.
- Anahtar model context'ine, retrieval indeksine, audit log'a, hata mesajına veya benchmark export'a dahil edilmez.
- Provider silindiğinde secret store kaydı ve config referansı kaldırılır. Dosya silme/credential kaldırma,
  SSD veya backup üzerinde adli düzeyde geri getirilemezlik garantisi olarak sunulmaz.

Bu sözleşme [ADR-010 önerisi](docs/adr/ADR-010-secret-storage-and-ipc-broker.md) ve GitHub #52 ile eşleşir.
Mevcut uygulama kodu olmadığından storage, IPC ve sızıntı kontrolleri henüz çalışma zamanında doğrulanmamıştır.

### 4.2 Uygulama Spike'ı ve Kabul Kriterleri

| Kontrol | Beklenen sonuç |
|---|---|
| Config/export incelemesi | Ham anahtar yok; config'de yalnızca secret referansı var |
| Store erişilemez veya şifreleme başarısız | Cloud credential işlemi durur; plaintext fallback yok |
| IPC'de yanlış sender, kanal veya girdi | Broker isteği reddeder; secret değeri döndürmez |
| Provider kaldırma / key clear | Secret kaydı ve referansı kaldırılır; sonraki cloud çağrısı credential ister |
| Platform testi | Seçilen OS storage mekanizmasının erişim/fallback sınırı ve hata davranışı belgelenir |

Electron `safeStorage` değerlendirilebilir; Windows DPAPI ve Linux storage backend davranışları farklıdır.
Linux `basic_text` güvenli saklama kabul edilmez. Mekanizma seçimi bu sınırlara göre yapılmalıdır.
[Resmî Electron safeStorage belgesi](https://www.electronjs.org/docs/latest/api/safe-storage).

---

## 5. Veri Sızıntısı Önleme Kontrol Listesi

- [ ] `.env` dosyacıları context'e alınmıyor mu? → Otomatik filtre
- [ ] API anahtarları audit log'a yazılmıyor mu? → Log sanitizer
- [ ] Model yanıtında gizli veri parçası var mı? → Output scanning (gelecek)
- [ ] Embedding indeksinde gizli dosya var mı? → İndeksleme filtresi
- [ ] Bulut iletişimi HTTPS zounlu mu? → TLS certificate validation
- [ ] Yerel model seçildiğinde internet trafiği var mı? → Network audit

---

*Gizlilik ve veri koruma için → bu belge.*  
*Güvenlik katmanları için → `SAFETY_AND_GUARDRAILS.md`*  
*Ürün tanımı için → `PRODUCT_PLAN.md`*
