# KULLANICI DENEYİMİ VE ETKİLEŞİM TASARIMI (UX_AND_INTERACTION)

> **Belge amacı:** Kullanıcı akışlarını, arayüz bileşenlerini ve etkileşim kararlarını belgeler.  
> Ürün tanımı için → `PRODUCT_PLAN.md`

---

## 1. Tasarım İlkeleri

### 1.1 Güven Öncelikli (Trust-First)

- Her değişiklik öncesinde diff önizleme gösterilir
- Kullanıcı neyin değişeceğini bilmeden onay vermez
- "Ne yaptığımı göstereyim, sonra sen karar ver" yaklaşımı
- Bağlam kaynakları her zaman görünür: "Şu dosyalardan bilgi aldım"

### 1.2 Minimum Sürtüşme (Low Friction)

- Basit görevlerde kısa diff, hızlı onay
- Tek tuşla undo (rollback)
- Sohbet paneli her zaman erişilebilir
- Modeller arası geçiş tek tıkla

### 1.3 Şeffaflık (Transparency)

- Ajan hangi dosyaları okuduğunu gösterir
- Token kullanımı görünür (maliyet farkındalığı)
- Model seçimi açık: yerel mi, bulut mu?
- Audit log kullanıcı tarafından incelenebilir

---

## 2. Ana Ekran Düzeni

### 2.1 Düzen

```
┌─────────────────────────────────────────────────────────┐
│  Üst Çubuk: dosya adı / model / durum                   │
├─────────────┬───────────────────────┬───────────────────┤
│             │                       │                   │
│  Dosya      │   Editör              │   Sohbet Paneli   │
│  Ağacı      │   (Monaco)            │   (Chat)          │
│             │                       │                   │
│  [sidebar]  │   [merkez]            │   [sağ panel]     │
│             │                       │                   │
├─────────────┴───────────────────────┴───────────────────┤
│  Alt Çubuk: satır/sütun | encoding | model | token      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Panel Boyutları (Varsayılan)

| Panel | Genişlik | Yeniden boyutlandırılabilir |
|---|---|---|
| Dosya ağacı | 250px | ✅ |
| Editör | Kalan alan | ✅ |
| Sohbet paneli | 400px | ✅ (gizlenebilir) |

---

## 3. Kullanıcı Akışları

### 3.1 İlk Açılış Akışı

```
1. Uygulama açılır → Hoş geldin ekranı
2. "Klasör Aç" butonu → sistem dosya seçici
3. Klasör seçilir → dosya ağacı yüklenir + indeksleme başlar
4. İndeksleme tamamlanır → durum çubuğunda "Hazır" gösterilir
5. Sohbet paneli aktif → kullanıcı ilk sorusunu yazabilir
```

### 3.2 Sohbet + Değişiklik Akışı

```
1. Kullanıcı doğal dilde istek yazar
2. Ajan düşünüyor göstergesi (streaming response)
3. Ajan bağlam kaynaklarını gösterir: "3 dosya incelendi"
4. Ajan yanıt verir:
   a. Yalnızca açıklama → metin gösterilir
   b. Değişiklik planı → diff önizleme paneli açılır
5. Diff paneli:
   ┌─────────────────────────────────────┐
   │ Değişiklik Planı                     │
   │ 📁 src/auth/login.ts (+5, -2)       │
   │ 📁 src/utils/jwt.ts (+3, -1)        │
   │                                     │
   │ [Tümünü Uygula] [Seçerek Uygula]    │
   │ [Düzenle] [İptal]                   │
   └─────────────────────────────────────┘
6. Kullanıcı onaylar → değişiklik uygulanır
7. Durum çubuğunda "✅ 2 dosya değiştirildi — Geri al" gösterilir
```

### 3.3 Rollback Akışı

```
1. Kullanıcı "Geri Al" tıklar (veya Ctrl+Z x2)
2. Geri alınacak değişiklik özeti gösterilir
3. "Geri Al" onayı → dosyalar önceki haline döner
4. Çakışma varsa → uyarı: "Bu dosya sonra değiştirilmiş, yine de geri alınsın mı?"
```

### 3.4 Q&A (Yalnızca Soru-Cevap) Akışı

```
1. Kullanıcı soru sorar: "Bu projede auth nasıl çalışıyor?"
2. Ajan retrieval ile ilgili dosyaları bulur
3. Yanıt render edilir + altında bağlam kaynakları gösterilir:
   "Kaynaklar: src/auth/login.ts, src/auth/types.ts, src/middleware/session.ts"
4. Kullanıcı kaynağa tıklarsa → dosya editörde açılır
```

---

## 4. Mevcut AI IDE'lerle UX Karşılaştırması

### 4.1 Cursor UX

| Özellik | Cursor | Agentic IDE |
|---|---|---|
| Değişiklik önerisi | Tab ile kabul, inline diff | Ayrı diff panelinde detaylı görünüm |
| Çok dosya düzenleme | Composer panelinde | Dosya listesi + adım adım diff |
| Onay mekanizması | "Accept" / "Reject" (hızlı) | "Tümünü Uygula" / "Seçerek Uygula" |
| Rollback | Yok | ✅ Son 10 değişiklik |
| Bağlam kaynakları | Kısıtlı görünürlük | Tam şeffaflık |
| Model seçimi | Ayarlar menüsünde | Alt çubukta tek tıkla |

### 4.2 Windsurf UX

| Özellik | Windsurf | Agentic IDE |
|---|---|---|
| Ajan döngüsü | Cascade (otomatik) | ReAct (kullanıcı tetiklemeli) |
| Bağlam yönetimi | Otomatik akış takibi | Katmanlı retrieval + manual pin |
| Onay | Bazı işlemler otomatik | Her değişiklik onay zorunlu |
| Güvenlik | Temel | Çok katmanlı (workspace boundary, write boundary, reactive safety, audit) |

---

## 5. UX Sorunları ve Çözüm Önerileri

### 5.1 Onay Yorgunluğu (Approval Fatigue)

**Risk:** Her değişiklik için onay istemek kullanıcıyı "her şeyi kabul eden robot"a dönüştürebilir.

**Azaltma stratejileri:**
- Basit değişikliklerde (yorum, formatlama) kısa diff göster
- Kritik değişikliklerde (dosya silme, çok dosya) detaylı uyarı
- Gelecekte: güven seviyesine göre otomatik onay seçeneği
- Trend takibi: kullanıcı ardışık hızla onay veriyorsa → uyarı göster

### 5.2 İlk Kullanıcı Deneyimi (Onboarding)

**Tasarım:**
- Hoş geldin ekranı: "Klasör Aç" + "Son Projeler" + kısa demo videosu
- İlk görev önerisi: "Bir soru sorun veya dosya üzerinde değişiklik isteyin"
- Tooltip'ler: ilk 3 kullanımda sohbet paneli, diff paneli, rollback açıklaması

### 5.3 Hata Durumu İletişimi

| Hata Türü | Gösterim |
|---|---|
| Model yanıt vermedi | "Model yanıt veremedi. Tekrar deneyin veya model değiştirin." |
| Güvenlik ihlali girişimi | "⚠ Bu dosya güvenlik sebebiyle erişilemez: .env" |
| Diff uygulama hatası | "Dosya değiştirilmiş. Güncel versiyonu görmek ister misiniz?" |
| Bağlantı hatası (bulut model) | "İnternet bağlantısı yok. Yerel modele geçmek ister misiniz?" |

---

## 6. Erişilebilirlik (Temel)

| Özellik | Durum |
|---|---|
| Klavye navigasyonu | ✅ (Monaco sağlar) |
| Screen reader desteği | ⚠ Temel (Monaco desteği) |
| Yüksek kontrast tema | ❌ (MVP'de yok, Monaco varsayılan) |
| Özelleştirilebilir yazı boyutu | ✅ (Monaco sağlar) |
| Kısayol tuşları | ✅ Özelleştirilebilir |

---

*UX tasarımı için → bu belge.*  
*Ürün kararları için → `PRODUCT_PLAN.md`*  
*Güvenlik UX'i için → `SAFETY_AND_GUARDRAILS.md`*
