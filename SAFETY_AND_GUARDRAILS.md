# GÜVENLİK VE KORUMA KATMANLARI (SAFETY_AND_GUARDRAILS)

> **Belge amacı:** Ajanın dosya sistemi üzerindeki eylemlerini kısıtlayan güvenlik modelini tanımlar.  
> Mimari detaylar için → `SYSTEM_PLAN.md`

---

## 1. Güvenlik Felsefesi

### 1.1 Temel İlke: En Küçük Yetki (Principle of Least Privilege)

Güvenlik modeli "ne yasak" değil, "ne izinli" sorusuna dayanır. **Varsayılan olarak her şey yasaklıdır**; izinler açıkça
tanımlanır.

Bu yaklaşım, yasaklı komut listesinden (blacklist) temelden farklıdır:

- **Blacklist:** Bilinen tehlikeleri listeler → listede olmayan yeni tehlike geçer
- **Whitelist:** Yalnızca izin verilenleri tanımlar → bilinmeyen her şey engellenir

### 1.2 Savunma Derinliği (Defense in Depth)

Her katman bağımsız bir güvenlik önlemidir. Bir katman aşılsa bile sonraki devreye girer:

```
Katman 1: Workspace Boundary + Path Normalization (dizin kısıtlaması ve traversal koruması)
    ↓ geçerse
Katman 2: Write Boundary (gizli dosya koruması — protected file filter)
    ↓ geçerse
Katman 3: İnsan onayı (human gate) + Reactive Safety Warnings (apply öncesi, §2.6)
    ↓ geçerse
Katman 4: Atomik yazma + undo
    ↓ her durumda
Katman 5: Audit log
```

> **Terminoloji notu:** "Sandbox" terimi MVP'de kullanılmaz; çünkü process/shell izolasyonu çağrıştırır ve bu özellik
> MVP dışıdır. Bunun yerine üç ayrı kavram kullanılır: **Workspace Boundary** (dizin kısıtı), **Path Normalization** (
> traversal koruması) ve **Write Boundary** (protected file write filtresi). Detay:
`docs/adr/ADR-008-workspace-boundary-terminology.md`.

---

## 2. Katman Detayları

### 2.1 Katman 1 — Workspace Boundary + Path Normalization

#### 2.1.a Workspace Boundary (Çalışma Dizini Kısıtlaması)

- Ajan yalnızca kullanıcının açtığı proje dizini içindeki dosyaları okuyabilir ve yazabilir
- Proje dizini dışına çıkmak için hiçbir araç yoktur
- Boundary tek bir kök yol referansıdır; alt projeler / monorepo içi alt-paketler aynı kök altında kalır

#### 2.1.b Path Normalization (Traversal Koruması)

- `../` traversal girişimleri path normalizasyonu ile önlenir (`path.resolve` + prefix check)
- URL-encoded varyantlar (`%2e%2e%2f`) decode sonrası tekrar normalize edilir
- Null byte (`%00`) içeren yol denemeleri reddedilir

#### 2.1.c Symlink Koruması

- Symlink takibi engellenir (symlink hedefi workspace boundary dışındaysa erişim reddedilir)
- Junction point (Windows) kontrolü aynı kuralı uygular

**Test senaryoları:**

- `../../../etc/passwd` okuma girişimi → engellenmeli
- `../../.ssh/id_rsa` okuma girişimi → engellenmeli
- Symlink ile workspace boundary dışına yönlendirme → engellenmeli
- Proje dizini içindeki alt klasörlere normal erişim → izin verilmeli

### 2.2 Katman 2 — Write Boundary (Gizli Dosya Koruması)

Sabit kural: Aşağıdaki pattern'lar **hiçbir zaman yazılamaz ve context'e alınamaz:**

| Pattern                            | Risk                                  |
|------------------------------------|---------------------------------------|
| `.env`, `.env.*`                   | API anahtarları, veritabanı şifreleri |
| `*.pem`, `*.key`, `*.p12`, `*.pfx` | SSL/TLS sertifikaları                 |
| `id_rsa`, `id_ed25519`             | SSH özel anahtarları                  |
| `*.secret`                         | Uygulama sırları                      |
| `.npmrc` (auth token içerenler)    | Registry erişim tokenleri             |
| `credentials.json`                 | Cloud sağlayıcı kimlik bilgileri      |
| `.aws/credentials`                 | AWS erişim anahtarları                |

**Önemli kurallar:**

- Bu liste kullanıcı tarafından `.agentignore` ile genişletilebilir ama **daraltılamaz**
- Kural ihlal girişimi audit log'a yazılır ve kullanıcıya bildirilir
- İndeksleme sırasında da bu filtreler uygulanır (embedding'e alınmaz)

### 2.3 Katman 3 — Değişiklik Onayı (Human Gate)

- Her `write_file` çağrısı önce diff üretir
- Diff kullanıcıya gösterilir; "Uygula" tıklanmadan işlem yapılmaz
- Birden fazla dosya için: dosya listesi özeti önce, ardından her dosya için ayrı diff
- "Seçerek Uygula" seçeneği: bazı dosyaları onaylamak, diğerlerini reddetmek

**Onay yorulma (approval fatigue) riski:**

- Basit işlemlerde (tek satır, yorum ekleme) kısa diff gösterilir
- Karmaşık işlemlerde detaylı diff + etkilenen dosya sayısı özeti
- Gelecekte: güven seviyesine göre otomatik onay seçeneği (MVP'de yok)

### 2.4 Katman 4 — Atomik Yazma ve Undo Stack

- Dosya yazma: önce `.agentbackup` geçici dosyasına yaz → ardından atomik rename
- Başarısız yazma işlemi orijinal dosyayı bozmaz
- Son 10 değişiklik seti undo stack'te tutulur
- Her set, etkilenen tüm dosyaların önceki halini içerir (snapshot)
- Rollback sırasında başka değişiklik yapılmışsa çakışma kullanıcıya bildirilir

### 2.5 Katman 5 — Audit Log

Her ajan eylemi zaman damgası ve kullanıcı kararıyla loglanır:

```json
{
  "timestamp": "2026-01-15T14:30:00Z",
  "run_id": "eval-run-001",
  "task_id": "bugfix-03",
  "condition": "C",
  "action": "write_file",
  "path": "src/auth/login.ts",
  "lines_changed": 12,
  "user_decision": "approved",
  "context_sources": [
    "src/auth/types.ts",
    "src/utils/jwt.ts"
  ],
  "model": "claude-sonnet-4-20260514",
  "token_count": 2847
}
```

- Log dosyası: `~/.agentide/audit.jsonl`
- Log salt metin, imzasız; kullanıcı istediği zaman inceleyebilir
- Log silindiyse yeniden oluşturulur (append-only)
- `run_id`, `task_id` ve `condition` alanları özellikle benchmark/değerlendirme oturumlarında doldurulur; normal
  kullanımda boş veya yok olabilir

---

### 2.6 Reactive Safety Warnings (Apply Öncesi — MVP İçi)

> **Tek-doğru kaynak.** Background proaktif analiz MVP DIŞIDIR (`PROACTIVE_BEHAVIOR_DESIGN.md`, `UC-03B`). Bu bölüm
> yalnızca **kullanıcı tetiklemeli** plan akışı içinde, plan üretildikten sonra ve apply edilmeden önce çalışan reactive
> uyarıları tanımlar. UC referansı: `diagrams/UC/UC-03A-reactive-safety-warnings.puml`.

Reactive safety check, Katman 3 (human gate) öncesinde otomatik olarak çalışır ve dört zorunlu trigger içerir.
Trigger'lar kullanıcı tarafından kapatılamaz.

#### 2.6.1 Tetikleyiciler

| Trigger                        | Açıklama                                                               | Eşik                              | Kullanıcı seçenekleri      |
|--------------------------------|------------------------------------------------------------------------|-----------------------------------|----------------------------|
| `WORKSPACE_BOUNDARY_VIOLATION` | Plan, workspace boundary dışı bir yola yazma içeriyor                  | Tek girişim yeter                 | Düzelt / İptal (Devam yok) |
| `PROTECTED_FILE_WRITE`         | Plan, protected file pattern (§2.2) eşleşen bir dosyaya yazma içeriyor | Tek girişim yeter                 | Düzelt / İptal (Devam yok) |
| `LARGE_EDIT_THRESHOLD`         | Plan büyük etkili                                                      | >20 dosya VEYA >500 satır toplam  | Devam et / Düzelt / İptal  |
| `SECRET_IN_DIFF`               | Diff içeriği secret pattern barındırıyor                               | API key, private key, token regex | Düzelt / İptal (Devam yok) |

#### 2.6.2 Davranış Kuralları

- Trigger'lar **plan üzerinde** çalışır; arka plan dosya tarama yapmaz
- Tetiklendiğinde diff onay ekranı açılmadan önce uyarı modal'ı gösterilir
- "Why" açıklaması zorunludur: hangi dosya/satır hangi trigger'ı çalıştırdı
- Kullanıcı "İptal" derse plan tamamen düşer; "Düzelt" derse ajan'a geri gider; "Devam et" yalnızca
  `LARGE_EDIT_THRESHOLD` için seçilebilir
- Her trigger sonucu (devam / düzelt / iptal) zaman damgası ve trigger türüyle audit log'a yazılır

#### 2.6.3 MVP Dışı (UC-03B Future)

- Save-time tetikleyiciler
- Idle-time / project-open arka plan tarama
- Alert queue, debounce, throttle
- Snooze, mute, confidence threshold tuning
- Syntax error, code smell, duplicate code uyarıları

---

## 3. Tehdit Modeli

### 3.1 İç Tehditler (Model Kaynaklı)

| Tehdit                                           | Risk  | Azaltma                                     |
|--------------------------------------------------|-------|---------------------------------------------|
| Model hedef dışı dosya değiştirmeye çalışır      | Orta  | Workspace boundary + onay katmanı           |
| Model gizli dosya içeriğini yanıta gömer         | Düşük | Context filtreleme + output scanning        |
| Model zararlı kod üretir (rm -rf, infinite loop) | Düşük | Onay mekanizması + statik analiz (gelecek)  |
| Model prompt injection ile yönlendirilir         | Düşük | Sistem prompt'u koruma + input sanitization |

### 3.2 Dış Tehditler (Kullanıcı/Ortam Kaynaklı)

| Tehdit                                                      | Risk  | Azaltma                                |
|-------------------------------------------------------------|-------|----------------------------------------|
| Kötü niyetli kullanıcı workspace boundary'yi aşmaya çalışır | Düşük | Path normalizasyonu + symlink kontrolü |
| API anahtarı sızıntısı (bulut modele gönderim)              | Orta  | Gizli dosya filtresi + .agentignore    |
| Man-in-the-middle saldırısı (API iletişimi)                 | Düşük | HTTPS zorunluluğu                      |

---

## 4. OWASP LLM Güvenlik Referansları

OWASP Top 10 for LLM Applications (2025) ile eşleştirme:

| OWASP Riski                             | Agentic IDE'deki Karşılık                            | Durum                |
|-----------------------------------------|------------------------------------------------------|----------------------|
| LLM01: Prompt Injection                 | Sistem prompt'u koruma, input sanitization           | MVP'de temel korunma |
| LLM02: Insecure Output Handling         | Diff önizleme + onay                                 | ✅ Covered            |
| LLM03: Training Data Poisoning          | Dış model kullanılıyor, kontrol dışı                 | Belgelenecek sınır   |
| LLM06: Sensitive Information Disclosure | Gizli dosya filtresi                                 | ✅ Covered            |
| LLM08: Excessive Agency                 | Workspace boundary + write boundary + en küçük yetki | ✅ Covered            |

---

## 5. Güvenlik Test Planı

### 5.1 Otomatik Testler

- Path traversal kombinasyonları (100+ varyasyon)
- Gizli dosya pattern eşleştirme testleri
- Workspace boundary sınır testleri (symlink, junction point)
- Atomik yazma kesinti testleri (process kill sırasında)

### 5.2 Manuel Testler

- Kırmızı takım: bilinçli olarak güvenlik açığı arama
- Ajan'a gizli dosya okuma talimatı verme girişimleri
- Çok dosyalı değişiklikte kısmi başarısızlık simülasyonu

---

## 6. Danışman Toplantısında Sorulacak Karar Soruları (İlgili Alan ile)

| Soru                                                                                                                                                                          | İlgili Alan                                        | İlgili Bölüm |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------|--------------|
| Workspace boundary + path normalization için yalnızca `path.resolve + prefix check` yeterli mi, yoksa canonical path + additional guard (örn. junction edge-case) zorunlu mu? | Katman 1 — Workspace Boundary + Path Normalization | §2.1         |
| Gizli dosya listesi MVP için yeterli mi, eklenmesi gereken zorunlu pattern var mı?                                                                                            | Katman 2 — Gizli Dosya Koruması                    | §2.2         |
| Onay akışında “seçerek uygula” özelliği MVP'de kalmalı mı, yoksa basitleştirip tüm-dosya onayına mı düşelim?                                                                  | Katman 3 — Human Gate                              | §2.3         |
| Undo stack kapasitesi (son 10 değişiklik) akademik demo için yeterli mi, artırmalı mıyız?                                                                                     | Katman 4 — Atomik Yazma ve Undo                    | §2.4         |
| Audit log için mevcut alanlar (run_id, task_id, condition, model, token_count, context_sources) tez değerlendirmesi için yeterli mi?                                          | Katman 5 — Audit Log                               | §2.5         |
| Prompt injection azaltımı MVP için yeterince savunulabilir mi, yoksa ek output scanning kuralı zorunlu mu?                                                                    | OWASP Eşleşmesi / İç Tehditler                     | §3.1, §4     |
| API anahtarı sızıntısı riskinde mevcut önlem seti (filter + agentignore) yeterli mi, ek politika gerekir mi?                                                                  | Dış Tehditler / Veri Sızıntısı                     | §3.2         |
| Güvenlik test planında kırmızı takım testlerinin kapsamı danışman beklentisini karşılıyor mu?                                                                                 | Güvenlik Test Planı                                | §5.1, §5.2   |

**Toplantı kapanış sorusu:**
"Bu güvenlik modelinde onayladığınız 3 kontrol ve güçlendirmemi istediğiniz 3 kontrolü netleştirebilir miyiz?"

---

*Güvenlik detayları için → bu belge.*  
*Gizlilik ve veri koruma için → `DATA_AND_PRIVACY.md`*  
*Mimari detaylar için → `SYSTEM_PLAN.md`*
