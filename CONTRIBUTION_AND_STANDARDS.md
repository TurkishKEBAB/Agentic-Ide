# KATKI STANDARTLARI VE KOD KALİTESİ (CONTRIBUTION_AND_STANDARDS)

> **Belge amacı:** Proje geliştirme sürecinde uyulacak kodlama standartlarını, commit kurallarını ve kalite eşiklerini
> tanımlar.

---

## 1. Kodlama Standartları

### 1.1 TypeScript Kuralları

- **Katı mod:** `strict: true` tsconfig'de aktif
- **Tip tanımları:** `any` kullanımı yasak; `unknown` + tip daraltma tercih edilir
- **Naming convention:**
  - Dosyalar: `kebab-case.ts` (örn. `context-engine.ts`)
  - Sınıflar: `PascalCase` (örn. `ContextEngine`)
  - Fonksiyonlar ve değişkenler: `camelCase` (örn. `buildMarkdown`)
  - Sabitler: `UPPER_SNAKE_CASE` (örn. `MAX_UNDO_STACK`)
  - Interface'ler: `I` prefix'i yok, `PascalCase` (örn. `ModelProvider`)
- **İthalat düzeni:** Harici → dahili → tip onları (ESLint import/order kuralı)
- **Yorum dili:** Türkçe veya İngilizce, ancak proje genelinde tutarlı (tercihen Türkçe)

### 1.2 Kod Dosyası Yapısı

```typescript
// 1. İthalatlar (harici → dahili → tip)
import {app} from 'electron';
import {ContextEngine} from './context-engine';
import type {ModelProvider} from './types';

// 2. Sabitler
const MAX_UNDO_STACK = 10;

// 3. Tip tanımları (dosyaya özel)
interface InternalState { /* ... */
}

// 4. Ana sınıf / fonksiyonlar
export class AgentLoop { /* ... */
}

// 5. Yardımcı fonksiyonlar (dışa aktarılmayan)
function normalizeText(input: string): string { /* ... */
}
```

### 1.3 Dosya Boyutu Kuralı

- Tek dosya **300 satırı** aşmamalı (test dosyaları hariç)
- 300 satırı aşan dosyaler refactor edilmeli

---

## 2. Commit ve Branch Kuralları

### 2.1 Commit Mesaj Formatı (Conventional Commits)

```
<tip>(<kapsam>): <açıklama>

[opsiyonel gövde]

[opsiyonel alt bilgi]
```

**Tip'ler:**

| Tip        | Kullanım                             |
|------------|--------------------------------------|
| `feat`     | Yeni özellik                         |
| `fix`      | Hata düzeltme                        |
| `refactor` | Davranış değiştirmeyen kod düzenleme |
| `test`     | Test ekleme/güncelleme               |
| `docs`     | Dokümantasyon değişikliği            |
| `chore`    | Build, CI, bağımlılık güncellemesi   |
| `security` | Güvenlik düzeltmesi                  |

**Örnekler:**

```
feat(agent): add ReAct loop implementation
fix(sandbox): prevent path traversal via symlinks
test(retrieval): add precision@5 benchmark tests
docs(thesis): update literature review section
```

### 2.2 Branch Stratejisi

```
main ← stabil, her zaman çalışır
  ├── dev ← aktif geliştirme
  │   ├── feat/editor-core
  │   ├── feat/agent-loop
  │   ├── fix/sandbox-symlink
  │   └── test/benchmark-suite
  └── release/v0.1 ← milestone etiketleri
```

---

## 3. Kalite Eşikleri

### 3.1 Kod Kalitesi

| Metrik                   | Hedef       | Araç                     |
|--------------------------|-------------|--------------------------|
| TypeScript strict hatası | 0           | `tsc --noEmit`           |
| ESLint hatası            | 0           | `eslint .`               |
| Kullanılmayan import     | 0           | ESLint no-unused-imports |
| `any` kullanımı          | 0           | ESLint no-explicit-any   |
| Dosya boyutu             | < 300 satır | Manuel kontrol           |

### 3.2 Test Kalitesi

| Metrik               | Hedef              | Araç            |
|----------------------|--------------------|-----------------|
| Birim test coverage  | ≥ %70              | Vitest / Jest   |
| Güvenlik testleri    | %100 pass          | Özel test suite |
| Entegrasyon testleri | Kritik yollar %100 | Vitest          |
| CI pipeline durumu   | Her push'ta yeşil  | GitHub Actions  |

### 3.3 Dokümantasyon

| Kural                         | Açıklama                             |
|-------------------------------|--------------------------------------|
| Her public fonksiyon JSDoc'lu | Açıklama + parametre + dönüş tipi    |
| Her modül README'si           | Modülün amacı ve örnek kullanımı     |
| Mimari değişikliklerde ADR    | Architecture Decision Record yazılır |

---

## 4. Code Review Kontrol Listesi

Her PR/commit öncesi aşağıdaki kontroller yapılmalı:

- [ ] TypeScript derlemesi hatasız mı?
- [ ] ESLint uyarısı/hatası yok mu?
- [ ] Yeni fonksiyonlar için test yazıldı mı?
- [ ] Güvenlik katmanlarını etkileyen değişiklik varsa güvenlik testi eklendi mi?
- [ ] Commit mesajı Conventional Commits formatında mı?
- [ ] `any` tipi kullanılmadı mı?
- [ ] Dosya boyutu 300 satırı aşmadı mı?

---

*Kalite standartları için → bu belge.*  
*Test stratejisi için → `TESTING_AND_CI.md`*  
*Teknik mimari için → `SYSTEM_PLAN.md`*
