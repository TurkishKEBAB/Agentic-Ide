# VERİ GİZLİLİĞİ VE KORUMA (DATA_AND_PRIVACY)

> **Belge amacı:** Kullanıcı verilerinin toplanması, işlenmesi ve korunmasına ilişkin politikaları tanımlar.  
> Güvenlik katmanları için → `SAFETY_AND_GUARDRAILS.md`

---

## 1. Veri Akışı Haritası

### 1.1 Kullanıcı Verileri ve Nereye Gider

| Veri Türü | Yerel Kalır | Bulut Modele Gönderilir | Loglanır |
|---|---|---|---|
| Kaynak kod dosyaları | ✅ | ✅ (yalnızca ilgili bağlam) | Dosya adı (içerik değil) |
| Proje dizin yapısı | ✅ | ✅ (dosya/klasör adları) | Yok |
| Kullanıcı chat mesajları | ✅ | ✅ | Zaman damgası |
| Ajan yanıtları | ✅ | ❌ (buluttan gelir) | Zaman damgası |
| Embedding vektörleri | ✅ | ❌ (yerel üretilir) | Yok |
| API anahtarları | ✅ | ❌ | Yok |
| `.env` / gizli dosyalar | ✅ | **❌ KESİNLİKLE HAYIR** | İhlal girişimi loglanır |
| Audit log | ✅ | ❌ | N/A (log kendisi) |
| Kullanıcı tercihleri | ✅ | ❌ | Yok |

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

| Özellik | Yerel Model (Ollama) | Bulut Model (Claude API) |
|---|---|---|
| Veri nereye gider? | Hiçbir yere, tamamen yerel | Anthropic sunucularına |
| API kullanım verisi loglanır mı? | Hayır | Anthropic politikasına bağlı |
| İnternet bağlantısı gerekli mi? | Hayır | Evet |
| KVKK/GDPR uyumluluğu | Otomatik (veri çıkmaz) | API sağlayıcı DPA gerekli |
| Performans | Yavaş (donanıma bağlı) | Hızlı |
| Kod güvenliği | Maksimum | Sağlayıcıya güven |

### 2.1 Kullanıcıya Gizlilik Kontrolü Sunulması

Kullanıcı aşağıdaki tercihlerden birini seçebilir:

- **🔒 Yalnızca Yerel:** Tüm veriler cihazda kalır. Bulut API hiç kullanılmaz.
- **⚖️ Hibrit (varsayılan):** Basit görevler yerel, karmaşık görevler bulut.
- **☁️ Yalnızca Bulut:** Tüm görevler bulut modele gönderilir (en yüksek kalite).

---

## 3. KVKK / GDPR Uyumluluk Değerlendirmesi

### 3.1 KVKK (Kişisel Verilerin Korunması Kanunu — Türkiye)

| İlke | Durum | Açıklama |
|---|---|---|
| Hukuka uygunluk | ✅ | Kullanıcı açık rıza ile veri gönderir (model seçimi) |
| Amaçla bağlılık | ✅ | Veri yalnızca kod analizi için kullanılır |
| Veri minimizasyonu | ✅ | Yalnızca ilgili bağlam gönderilir (tüm repo değil) |
| Doğruluk | ⚠ | Veri doğruluğu kullanıcı sorumluluğunda |
| Saklama süresi | ✅ | Yerel veri kullanıcı kontrolünde; bulut sağlayıcı politikası |
| Güvenlik | ✅ | HTTPS iletişim + gizli dosya filtresi |

### 3.2 GDPR (AB — referans olarak)

- **Veri işleme temeli:** Meşru menfaat (yazılım geliştirme verimliliği)
- **Veri taşınabilirliği:** Tüm veriler yerel dosya sisteminde, kullanıcı doğrudan erişebilir
- **Silme hakkı:** Kullanıcı projeyi ve audit log'u istediği zaman silebilir
- **Veri koruma etki değerlendirmesi (DPIA):** Bulut model kullanımında önerilir

---

## 4. API Anahtarı Güvenliği

### 4.1 Mevcut Yaklaşım (MVP)

- API anahtarları `~/.agentide/config.json` dosyasında saklanır
- Dosya izinleri `600` (yalnızca sahip okuyabilir)
- Anahtar hiçbir zaman log'a yazılmaz
- Anahtar hiçbir zaman model context'ine dahil edilmez

### 4.2 İyileştirme Seçenekleri (Gelecek)

| Seçenek | Güvenlik | Karmaşıklık |
|---|---|---|
| Ortam değişkeni | Orta | Düşük |
| `.env` dosyası | Orta | Düşük |
| OS Keychain (Keytar) | Yüksek | Orta |
| Hardware Security Module | Çok Yüksek | Yüksek |

**MVP kararı:** Dosya bazlı saklama + dosya izinleri yeterli. OS Keychain gelecek çalışma.

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
