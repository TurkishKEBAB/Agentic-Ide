# TEST STRATEJİSİ VE SÜREKLİ ENTEGRASYON (TESTING_AND_CI)

> **Belge amacı:** Proje genelinde test stratejisini, test türlerini, araçları ve CI pipeline'ını tanımlar.  
> Kod kalitesi standartları için → `CONTRIBUTION_AND_STANDARDS.md`

---

## 1. Test Piramidi

```
        /  E2E  \        ← Az sayıda, yavaş, kırılgan
       / Entegrasyon \    ← Orta sayıda, bileşenler arası
      /   Birim Test   \  ← Çok sayıda, hızlı, izole
     /___________________\
```

### 1.1 Hedef Dağılım

| Tür                  | Sayı  | Coverage Hedefi                     | Çalışma Süresi |
|----------------------|-------|-------------------------------------|----------------|
| Birim testler        | 100+  | ≥ %70                               | < 30 saniye    |
| Entegrasyon testleri | 20-30 | Kritik yollar %100                  | < 2 dakika     |
| E2E testler          | 5-10  | Ana senaryo akışları                | < 5 dakika     |
| Güvenlik testleri    | 50+   | Path traversal, dosya filtresi %100 | < 1 dakika     |

---

## 2. Birim Testler

### 2.1 Test Edilecek Modüller

| Modül                | Öncelik   | Test Odağı                                     |
|----------------------|-----------|------------------------------------------------|
| **PathSanitizer**    | 🔴 Kritik | Path traversal, symlink, workspace boundary    |
| **FileFilter**       | 🔴 Kritik | Gizli dosya pattern eşleştirme, .agentignore   |
| **ContextEngine**    | 🔴 Kritik | Retrieval doğruluğu, indeksleme tutarlılığı    |
| **DiffGenerator**    | 🟡 Yüksek | Diff doğruluğu, çok dosyalı diff birleştirme   |
| **UndoStack**        | 🟡 Yüksek | Transaction yönetimi, çakışma algılama         |
| **ModelAbstraction** | 🟡 Yüksek | Sağlayıcı değişimi, hata yönetimi, retry       |
| **PromptBuilder**    | 🟡 Yüksek | Şablon değişken enjeksiyonu, token sayımı      |
| **AuditLogger**      | 🟢 Orta   | Log formatı, dosya yazma, append-only davranış |
| **AgentLoop**        | 🟢 Orta   | Tool çağrı sıralaması, hata durumu yönetimi    |

### 2.2 Mock Stratejisi

| Bileşen          | Mock Yöntemi                     |
|------------------|----------------------------------|
| Dosya sistemi    | `memfs` in-memory filesystem     |
| LLM API yanıtı   | Önceden kaydedilmiş JSON fixture |
| Embedding modeli | Sabit vektör döndüren mock       |
| SQLite-vec       | In-memory SQLite                 |

### 2.3 Test Framework: Vitest

```typescript
// Örnek birim test
import {describe, it, expect} from 'vitest';
import {PathSanitizer} from '../src/security/path-sanitizer';

describe('PathSanitizer', () => {
  it('should block path traversal', () => {
    const sanitizer = new PathSanitizer('/project');
    expect(() => sanitizer.validate('/project/../../../etc/passwd')).toThrow();
  });

  it('should allow valid project paths', () => {
    const sanitizer = new PathSanitizer('/project');
    expect(sanitizer.validate('/project/src/index.ts')).toBe('/project/src/index.ts');
  });
});
```

---

## 3. Entegrasyon Testleri

### 3.1 Test Senaryoları

| Senaryo                                    | Bileşenler                 | Beklenen Davranış                                  |
|--------------------------------------------|----------------------------|----------------------------------------------------|
| Dosya aç → indeksle → retrieve             | FileSystem + ContextEngine | Dosya içeriği indekslenir, sorgu doğru sonuç döner |
| Kullanıcı isteği → plan üret → diff göster | AgentLoop + DiffGenerator  | Diff doğru dosyaları gösterir                      |
| Onay → dosya yaz → undo                    | DiffApplier + UndoStack    | Dosya değişir, undo orijinale döner                |
| Workspace boundary dışı erişim girişimi    | AgentLoop + PathSanitizer  | Erişim engellenir, audit log yazılır               |
| Gizli dosya context'e alma girişimi        | ContextEngine + FileFilter | Dosya filtrelenir, ajan erişemez                   |

---

## 4. Güvenlik Testleri (Özel Test Suite)

### 4.1 Path Traversal Test Matrisi

```typescript
const TRAVERSAL_PAYLOADS = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config',
  './../../.ssh/id_rsa',
  '%2e%2e%2f%2e%2e%2f',
  '....//....//etc/passwd',
  '/etc/passwd%00.ts',
  'valid/../../../etc/passwd',
  'symlink_to_outside/secret.key',
];
```

### 4.2 Gizli Dosya Test Matrisi

```typescript
const SECRET_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  'id_rsa',
  'server.pem',
  'cert.key',
  'secrets.json',
  '.npmrc',
  'credentials.json',
];
```

---

## 5. E2E Testler

### 5.1 Framework: Playwright (Electron)

```typescript
// Örnek E2E test
import {test, expect} from '@playwright/test';
import {ElectronApplication} from 'playwright';

test('should open project and display file tree', async () => {
  const app = await electron.launch({args: ['./dist/main.js']});
  const window = await app.firstWindow();
  await window.click('[data-testid="open-folder"]');
  // ... dosya ağacı kontrolü
  await app.close();
});
```

### 5.2 E2E Test Senaryoları

| Senaryo           | Adımlar                             | Doğrulama                   |
|-------------------|-------------------------------------|-----------------------------|
| Proje açma        | Klasör seç → dosya ağacı yüklenir   | Dosyalar listede görünür    |
| Dosya düzenleme   | Dosya aç → düzenle → kaydet         | Dosya içeriği değişir       |
| Chat ile Q&A      | Soru sor → yanıt gelir              | Yanıtta kaynak atıfı var    |
| Güvenli düzenleme | Değişiklik iste → diff gör → onayla | Dosya değişir, undo çalışır |
| Rollback          | Değişiklik yap → undo tıkla         | Orijinal içerik geri gelir  |

---

## 6. CI Pipeline

### 6.1 PR Açıldığında

```
1. npm ci (bağımlılık yükleme)
2. npm run lint (ESLint)
3. npm run typecheck (TypeScript derlemesi)
4. npm test (birim + güvenlik testleri)
5. npm run test:integration (entegrasyon testleri)
```

### 6.2 Main Branch'e Merge'de

```
1. Yukarıdaki tüm adımlar
2. npm run build (production build)
3. Coverage raporu oluştur
```

### 6.3 CI Başarı Kriterleri

| Kriter                | Eşik                        |
|-----------------------|-----------------------------|
| Tüm testler geçiyor   | %100                        |
| Coverage düşmedi      | Önceki commit ≤ yeni commit |
| Lint hatası yok       | 0                           |
| TypeScript hatası yok | 0                           |
| Build başarılı        | Hatasız derleme             |

---

## 7. Test Karşılaması ve Önceliklendirme

### Faz 1 (Ay 1-3): Zemin

- PathSanitizer birim testleri
- FileFilter birim testleri
- CI pipeline kurulumu

### Faz 2 (Ay 4-6): Editör Çekirdeği

- ContextEngine birim testleri
- İndeksleme entegrasyon testleri
- Temel E2E: proje açma, dosya düzenleme

### Faz 3 (Ay 7-10): Ajan Döngüsü

- AgentLoop birim testleri
- DiffGenerator + UndoStack testleri
- Güvenlik test suite tamamlanır
- Tam entegrasyon test senaryoları

### Faz 4 (Ay 11-15): Değerlendirme

- Benchmark test runner
- Performans testleri
- E2E test suite tamamlanır

---

*Test stratejisi için → bu belge.*  
*Kod kalitesi standartları için → `CONTRIBUTION_AND_STANDARDS.md`*  
*CI/CD pipeline için → `DEPLOYMENT_AND_PACKAGING.md`*
