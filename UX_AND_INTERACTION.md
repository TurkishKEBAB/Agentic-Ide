# KULLANICI DENEYİMİ TASARIMI (UX_AND_INTERACTION)

> **Belge amacı:** Bu belge, Agentic IDE'de kullanıcı ile ajan arasındaki her etkileşim
> noktasını tanımlar: kullanıcı tetiklemeli görev akışı, diff-onay döngüsü ve
> proaktif davranış katmanı.  
> Proaktif davranış detayları için → `PROACTIVE_BEHAVIOR_DESIGN.md`  
> Mimari bağlam için → `SYSTEM_PLAN.md § 7`

---

## 1. Kullanıcı Tetiklemeli Görev Akışı

### Öneri
Kullanıcı, sağ panel chat arayüzünden ajana doğal dil ile görev verir.
Ajan hiçbir zaman izinsiz değişiklik yapmaz.

```
[Kullanıcı] → Chat paneline yazar: "Bu fonksiyondaki hatayı düzelt"
                    │
                    ▼
            [Ajan: PLANLA]
            Hangi dosyalar? Hangi satırlar? Neden?
            Planı kullanıcıya sunar.
                    │
                    ▼
            [Kullanıcı: ONAY]
            "Uygula" veya "İptal" veya "Düzenle"
                    │ (yalnızca onay sonrası)
                    ▼
            [Ajan: UYGULA]
            Dosyaları atomik olarak yazar.
                    │
                    ▼
            [Diff Ekranı]
            Kullanıcı değişikliği satır satır görür.
            "Geri Al" tek tuş ile mümkün (10 adım undo stack).
```

### Gerekçe
Onay kapısı (approval gate) olmadan ajan kod değiştirebilirse, kullanıcı güveni
asla tam anlamıyla inşa edilemez. Kullanıcı her zaman "ne olduğunu" görmeli,
onaylamalı ve geri alabilmelidir.

### Trade-off
Onay adımı, kullanıcının "çok adım var" hissine yol açabilir. Çözüm: görev türüne
göre onay seviyesi ayarlanabilir (gelecek versiyon). MVP'de tüm görevler onay gerektirir.

### Yanlış yapılırsa ne bozulur?
Onay atlanırsa veya opsiyonel yapılırsa: güvenlik modeli mantıksal bütünlüğünü kaybeder.
Bir yanlış değişiklik gözden kaçar ve güven zedelenir.

---

## 2. Diff ve Değişiklik İnceleme Ekranı

### Öneri
Ajan her dosya değişikliği için yan yana (before / after) diff gösterimi sunar.

```
┌─────────────────────────────┬─────────────────────────────┐
│  ÖNCE                       │  SONRA                      │
│  ─────────────────────────  │  ─────────────────────────  │
│  function add(a, b) {       │  function add(a, b) {       │
│    return a - b;  ← hata    │    return a + b;  ← düzeltme│
│  }                          │  }                          │
└─────────────────────────────┴─────────────────────────────┘
  [✓ Onayla]  [✗ Reddet]  [← Geri Al]  [? Neden?]
```

Kullanıcı her değişikliği satır düzeyinde görebilir ve "Neden?" butonu ile
ajanın gerekçesini okuyabilir.

### Gerekçe
Diff ekranı olmadan kullanıcı "AI ne yaptı?" sorusunun yanıtını göremez.
Bu görünürlük, hem güven inşası hem de araştırma sorusunun ölçülmesi için zorunludur.

### Trade-off
Küçük değişiklikler (tek satır düzeltme) için diff ekranı fazla adım gibi görünebilir.
Gelecekte "hızlı onay" modu (inline diff) eklenebilir. MVP'de her değişiklik
tam diff ekranından geçer.

### Yanlış yapılırsa ne bozulur?
Diff gösterimi inline veya küçültülmüş yapılırsa: kullanıcı değişikliği gerçekten
incelemez, onay bir formaliteye dönüşür ve güvenlik modeli kâğıt üzerinde kalır.

---

## 3. Proaktif Davranış Katmanı

### Öneri
Kullanıcı prompt yazmadan da ajan, belirli durumlarda sessiz bildirimler üretir.
Bu davranış **non-blocking** ve **kullanıcı kontrolünde** tasarlanmıştır.

MVP'de yalnızca üç tetikleyici aktiftir:

| Tetikleyici | Seviye | Davranış |
|---|---|---|
| **SECRET_DETECTED** | Kritik (kırmızı banner) | Kapatılamaz; API key / token tespiti |
| **PROTECTED_FILE_OPEN** | Kritik (kırmızı banner) | Kapatılamaz; `.env` / `id_rsa` açıldığında |
| **SYNTAX_ERROR** | Orta (sarı inline) | 8 sn sonra solar; dil sunucusu syntax hatası |

Tüm diğer proaktif öneriler (uzun fonksiyon, test eksikliği, duplike kod) **varsayılan olarak pasiftir**.
Kullanıcı Tercihler panelinden istediğini açabilir.

Detaylı tasarım → `PROACTIVE_BEHAVIOR_DESIGN.md`

### Gerekçe
Proaktif davranış, araç güvenini hem inşa edebilir hem yıkabilir. Minimum güvenli
set ile başlamak, ilk kullanıcı testlerinde güven metriklerini ölçmeyi mümkün kılar.

### Trade-off
Az tetikleyici ile başlamak bazı gerçek kalite sorunlarını kaçırmak anlamına gelir.
Bu kabul edilebilir: güven önce inşa edilir, ek uyarılar güven yerleştikten sonra açılır.

### Yanlış yapılırsa ne bozulur?
Tüm tetikleyiciler varsayılan açık olarak başlarsa: kullanıcı ilk 30 dakikada
kalite önerilerini kapatır ve güvenlik uyarıları da aynı kapatma davranışıyla
susturulur.

---

## 4. Kullanıcı Kontrol Noktaları

### Öneri
Kullanıcı her etkileşim seviyesinde kontrolü elinde tutar:

| Seviye | Kontrol noktası | Kullanıcı eylemi |
|---|---|---|
| Görev başlangıcı | Plan sunuldu | Onayla / Reddet / Düzenle |
| Değişiklik uygulaması | Diff gösterildi | Onayla / Reddet / Satır seç |
| Uygulama sonrası | Undo stack | "Geri Al" (10 adım) |
| Proaktif uyarı | Bildirim | Aksiyon / Ertele / Sustur |
| Uzun vadeli tercih | Ayarlar paneli | Tetikleyici aç/kapat, güven eşiği |

### Gerekçe
Her adımda çıkış noktası olan bir sistem, kullanıcıya "ben hâlâ kontroldeyim"
hissini verir. Bu his, AI araçlarına güvenin temel bileşenidir.

### Trade-off
Çok fazla kontrol noktası kullanıcıyı yavaşlatabilir. Denge: kritik noktalarda
(plan onayı, diff) zorunlu kontrol; ikincil noktalarda (uyarı kapatma, ertele)
isteğe bağlı kontrol.

### Yanlış yapılırsa ne bozulur?
Kontrol noktaları yeterince açık değilse: kullanıcı "AI değiştiriyor, ben bakıyorum"
moduna girer ve aslında ne olduğunu takip etmez. İlk yanlış değişiklikte
"bu araç güvenilmez" kararı verilir.
