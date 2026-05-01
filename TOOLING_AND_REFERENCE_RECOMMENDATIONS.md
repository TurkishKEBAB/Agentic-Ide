# Tooling and Reference Recommendations

> Son kontrol: 2026-04-29
> Kapsam: Agentic IDE projesini planlama, implementasyon, test, CI/CD, guvenlik, paketleme ve tez degerlendirmesi
> boyunca destekleyecek araclar, uygulamalar, acik kaynak projeler ve referans repolar.

Bu belge, mevcut proje belgeleri
olan [PRODUCT_PLAN.md](PRODUCT_PLAN.md), [TECH_STACK_AND_AI.md](TECH_STACK_AND_AI.md), [TESTING_AND_CI.md](TESTING_AND_CI.md), [DEPLOYMENT_AND_PACKAGING.md](DEPLOYMENT_AND_PACKAGING.md)
ve [EVALUATION_PLAN.md](EVALUATION_PLAN.md) uzerinden hazirlandi. Projenin ana karakteri su: Electron + Monaco +
TypeScript tabanli, yerel-oncelikli, plan-first ve approval-gated bir AI coding IDE.

> 2026-05-01 readiness note: repo artik app CI, CodeQL ve supply-chain workflow placeholder'larini iceriyor.
> Trivy/container scanning su an zorunlu gate degil; proje container uretmiyor ve ek GitHub Action supply-chain yuzeyi
> acmadan once ayri karar alinmali.

## Kisa Sonuc

Bu proje icin en dogru strateji, "en cok arac" degil, "az ama izlenebilir arac" stratejisi:

- Planlama icin GitHub Projects ana kaynak olsun; Linear/Notion sadece destekleyici kalsin.
- Kod baslarken Electron/Vite hattini sade tut: `electron-vite` gelistirme icin, Electron Forge paketleme icin.
- Agent mimarisinde Aider, OpenHands ve SWE-agent'i kopyalanacak urunler olarak degil, "repo context, tool loop, eval
  harness" referanslari olarak incele.
- Guvenlik iddiani CI'da gorunur yap: PathSanitizer, FileFilter, secret scanning, protected files ve prompt-injection
  fixture'lari ilk gunden test edilsin.
- SWE-bench/SWE-bench Verified'i tezde tek ana metrik yapma; kendi 20-30 gorevlik Agentic IDE benchmark setini kur.
- Node 20 hedefini guncelle: Node 20'nin EOL tarihi 2026-04-30. Uygulama kodu Node 24 LTS hedefiyle baslamali; Node 22
  LTS sadece Electron/native modul blokajinda gecici fallback olmali.

## 1. Planlama ve Urun Yonetimi

| Arac                                                                                     | Kullanim                                                 | Karar          | Not                                                                                                                         |
|------------------------------------------------------------------------------------------|----------------------------------------------------------|----------------|-----------------------------------------------------------------------------------------------------------------------------|
| [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects) | Requirement backlog, epics, roadmap, durum takibi        | **Ana kaynak** | Repo zaten GitHub Project seed verisi iceriyor; issue, PR ve CI ile dogrudan bagli oldugu icin en dusuk surtusmeli secenek. |
| [Linear](https://linear.app/docs/github-integration)                                     | Daha hizli issue triage, cycle/roadmap, PR otomasyonu    | Opsiyonel      | Tek kisi/tez projesinde sart degil. GitHub Projects yetersiz gelirse kullan.                                                |
| [Notion GitHub integration](https://www.notion.com/help/github)                          | Danisman toplantilari, haftalik raporlar, karar ozetleri | Opsiyonel      | Teknik kararlar repo icinde kalmali; Notion "sunum ve toplanti defteri" gibi kullanilmali.                                  |
| [Obsidian Canvas](https://obsidian.md/help/plugins/canvas)                               | Yerel Markdown notlar, mimari harita, tez fikir agi      | Opsiyonel      | Yerel dosya mantigi projedeki local-first yaklasima uyuyor.                                                                 |
| [Zotero](https://www.zotero.org/support/quick_start_guide)                               | Makale, benchmark, rakip urun ve kaynakca yonetimi       | **Onerilir**   | Tez tarafinda en cok zaman kazandiracak arac. Makaleleri collection/tag ile ayir.                                           |

**Onerilen is akisi**

1. GitHub Projects: `Backlog`, `Ready`, `In Progress`, `Review`, `Done`, `Deferred`.
2. Her requirement issue'suna `MVP Scenario`, `Risk`, `Test Target`, `Thesis Evidence` alanlari ekle.
3. Danisman kararlarini Notion/Obsidian'da tutabilirsin ama kalici kararlar icin repo icinde ADR veya ilgili `.md`
   dosyasini guncelle.
4. Zotero'da su collection yapisi iyi gider: `AI Coding Agents`, `LLM Security`, `SWE Benchmarks`, `IDE UX`,
   `Human-in-the-loop`.

## 2. Implementasyon Stack'i

| Alan                 | Oneri                                                                                                                          | Neden                                                              | Dikkat                                                                                                                                                                         |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Runtime              | Node 24 LTS; Node 22 LTS fallback                                                                                              | Node 20 EOL 2026-04-30; yeni projeye EOL runtime ile baslama.      | Electron'in gomulu Node surumu ile CI Node surumunu ayri dusun.                                                                                                                |
| Electron build       | [electron-vite](https://electron-vite.org/)                                                                                    | Electron main/preload/renderer icin hizli Vite tabanli gelistirme. | Paketleme/cozumleme icin sonradan Forge veya builder gerekebilir.                                                                                                              |
| Paketleme            | [Electron Forge](https://www.electronforge.io/)                                                                                | Resmi Electron arac zincirine yakin, demo icin yeterli.            | Auto-update/code signing sonraki faza birakilmali.                                                                                                                             |
| Alternatif paketleme | [electron-builder](https://www.electron.build/auto-update.html)                                                                | Auto-update, installer ve release metadata icin guclu.             | macOS auto-update icin code signing gerekiyor; tez MVP'sinde agir olabilir.                                                                                                    |
| Editor               | [Monaco Editor](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.editor.IDiffEditorOptions.html) | Editor ve diff viewer projenin cekirdegi.                          | Unified diff parse etmek yerine original/modified model yaklasimi kullan.                                                                                                      |
| TypeScript AST       | [ts-morph](https://ts-morph.com/)                                                                                              | TypeScript compiler API'yi daha kullanilir hale getirir.           | TS/JS icin cok uygun, cok-dilli hedeflerde tek basina yetmez.                                                                                                                  |
| Cok dilli AST        | [Tree-sitter](https://github.com/tree-sitter/tree-sitter)                                                                      | Incremental parsing ve editor/IDE baglami icin olgun bir secenek.  | MVP'de once TypeScript odakli basla, sonra Tree-sitter'i genislet.                                                                                                             |
| Vektor arama         | [sqlite-vec](https://github.com/asg017/sqlite-vec)                                                                             | Yerel-first RAG icin SQLite icinde vektor arama.                   | Pre-v1 oldugu icin breaking change riski var; adapter arkasina al.                                                                                                             |
| Embedding            | [Ollama embeddings](https://docs.ollama.com/capabilities/embeddings)                                                           | Yerel embedding, gizlilik ve maliyet acisindan iyi.                | `nomic-embed-text` halen kullanilabilir, ama Ollama dokumanlarindaki `embeddinggemma`, `qwen3-embedding`, `all-minilm` adaylarini da kucuk bir retrieval eval ile karsilastir. |
| Bulut model          | [Anthropic TypeScript SDK](https://platform.claude.com/docs/en/agent-sdk/typescript)                                           | Claude entegrasyonu icin resmi yol.                                | Kendi `ModelProvider` interface'in korunmali; SDK'ya mimariyi kilitleme.                                                                                                       |
| Provider abstraction | [Vercel AI SDK](https://vercel.com/docs/ai-gateway/models-and-providers/)                                                      | Coklu model/provider fikrini hizlandirabilir.                      | MVP'de kendi ince adapter'in ana tasarim olsun; AI SDK'yi yardimci katman gibi dusun.                                                                                          |

**Stack karari**

MVP icin onerilen cekirdek:

```text
Electron + electron-vite + TypeScript
Monaco Editor + Monaco Diff Editor
Vitest + Playwright Electron
SQLite + sqlite-vec + Ollama embeddings
Anthropic SDK + Ollama JS/API
ts-morph once, Tree-sitter sonra
```

## 3. Incelenmesi Onerilen AI Coding Agent Reposu ve Urunleri

Bu kaynaklari "rakip klonlama" icin degil, urun/mimari dersleri cikarmak icin incele.

| Proje         | Link                                                                             | Bu projeye faydasi                                                                           | Ne alinmali                                                                 |
|---------------|----------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| Aider         | [Aider-AI/aider](https://github.com/aider-ai/aider)                              | Terminal tabanli AI pair programming; repo map, git tabanli degisiklik akisi, planlama modu. | Repo map mantigi, plan-once uygulama, diff/commit davranisi.                |
| OpenHands     | [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands)                    | Genel software agent platformu; tool use, sandbox, agent runtime fikirleri.                  | Agent loop, tool isolation, task execution gorunurlugu.                     |
| OpenHands SDK | [OpenHands/software-agent-sdk](https://github.com/OpenHands/software-agent-sdk/) | Kod ajanlari icin SDK/harness yaklasimi.                                                     | Agent bilesenlerini ayristirma ve test edilebilir hale getirme.             |
| SWE-agent     | [SWE-agent/SWE-agent](https://github.com/swe-agent/swe-agent)                    | GitHub issue'dan patch uretme ve benchmark harness fikri.                                    | Agent-computer interface, eval harness, patch scoring.                      |
| Continue      | [Continue docs](https://docs.continue.dev/index)                                 | IDE icinde chat/edit/autocomplete/agent ayrimi.                                              | Model/provider konfigleri ve context provider yaklasimi.                    |
| Tabby         | [TabbyML/tabby](https://github.com/TabbyML/tabby)                                | Self-hosted AI coding assistant.                                                             | Yerel/gizlilik odakli urunleme dili.                                        |
| Cline         | [cline.bot](https://cline.bot/)                                                  | IDE icinde agent aksiyonlarini gorunur kilma.                                                | Tool call gorunurlugu, approval UX.                                         |
| OpenCode      | [opencode-ai/opencode](https://github.com/opencode-ai/opencode)                  | Terminal-native agent, coklu model ve local-first pratikleri.                                | CLI/TUI agent ergonomisi; urun kapsamini buyutmek icin degil referans icin. |

**Dikkat**

- Cline/OpenCode/OpenHands gibi araclar daha otonom davranir; senin tez farkin "kontrollu ve onayli" akis. Bu yuzden
  otomasyon seviyesini degil, gorunurluk ve denetlenebilirlik fikirlerini al.
- Aider'in repo-map fikri, `ContextEngine` icin en pratik ilham kaynaklarindan biri olabilir.
- SWE-agent'in harness fikri, kendi benchmark runner'ini tasarlarken cok yararli.

## 4. Test, CI ve Kod Kalitesi

Mevcut repo su anda governance, docs ve security CI kontrollerini ayri workflow'larda
calistiriyor: [.github/workflows/governance.yml](.github/workflows/governance.yml), [.github/workflows/docs.yml](.github/workflows/docs.yml)
ve [.github/workflows/security.yml](.github/workflows/security.yml). Implementasyon baslayinca application pipeline'i
ayrica eklenmeli:

- `governance.yml`: mevcut metadata/seed/dokuman kontrolu.
- `app-ci.yml`: Node/Electron uygulamasi icin lint, typecheck, test, build.

| Arac                | Link                                                                                                                                 | Kullanim                                                       | Faz                           |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|-------------------------------|
| GitHub Actions      | [Docs](https://docs.github.com/en/actions/get-started/understanding-github-actions)                                                  | PR ve main pipeline.                                           | Hemen                         |
| Dependabot          | [Docs](https://docs.github.com/en/code-security/dependabot)                                                                          | npm ve GitHub Actions dependency update.                       | Hemen                         |
| Dependency Review   | [Docs](https://docs.github.com/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review) | PR'da yeni dependency riskini yakalama.                        | Hemen                         |
| CodeQL              | [github/codeql-action](https://github.com/github/codeql-action)                                                                      | JS/TS semantic security analysis.                              | Kod baslayinca                |
| Gitleaks            | [gitleaks-action](https://github.com/gitleaks/gitleaks-action)                                                                       | Secret scanning.                                               | Hemen                         |
| Semgrep             | [semgrep/semgrep](https://github.com/semgrep/semgrep)                                                                                | SAST, custom guardrail rule'lari.                              | Kod baslayinca                |
| Vitest coverage     | [Vitest coverage](https://vitest.dev/guide/coverage.html)                                                                            | Unit/security test coverage.                                   | Kod baslayinca                |
| Codecov             | [codecov-action](https://github.com/codecov/codecov-action)                                                                          | Coverage trend ve PR yorumlari.                                | Opsiyonel                     |
| Playwright Electron | [Playwright Electron](https://playwright.dev/docs/api/class-electron)                                                                | Electron E2E testleri.                                         | Editor cekirdegi calisinca    |
| fast-check          | [fast-check](https://fast-check.dev/)                                                                                                | Path traversal, file filter, diff invariant property testleri. | Guvenlik modulleri baslayinca |
| Knip                | [knip.dev](https://knip.dev/)                                                                                                        | Unused dependency/export/file temizligi.                       | Haftalik/opsiyonel            |
| Prettier            | [Docs](https://prettier.io/docs)                                                                                                     | Format standardi.                                              | Hemen                         |
| typescript-eslint   | [Docs](https://typescript-eslint.io/packages/typescript-eslint)                                                                      | TypeScript lint.                                               | Hemen                         |

**Onerilen CI isleri**

```yaml
pull_request:
  - install
  - lint
  - typecheck
  - unit tests
  - security tests
  - dependency review
  - secret scan

main:
  - pull_request adimlari
  - production build
  - coverage upload

nightly/weekly:
  - Playwright Electron E2E
  - CodeQL
  - Semgrep
  - Knip
```

**Ilk test oncelikleri**

1. `PathSanitizer`: path traversal, symlink, workspace boundary.
2. `FileFilter`: `.env`, `.pem`, `id_rsa`, `.npmrc`, `credentials.json`.
3. `DiffApplier`: hedef disi dosya yazma yok, atomik uygulama, rollback.
4. `PromptBuilder`: protected file ve secret context'e girmiyor.
5. `AgentLoop`: approval olmadan write tool calismiyor.

## 5. Guvenlik ve Guardrail Kaynaklari

| Kaynak                            | Link                                                                                                                                    | Projedeki rol                                                                                                       |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| OWASP Top 10 for LLM Applications | [OWASP](https://owasp.org/www-project-top-10-for-large-language-model-applications/)                                                    | Prompt injection, insecure output handling, excessive agency, sensitive information disclosure icin temel taxonomy. |
| NIST AI RMF GenAI Profile         | [NIST AI 600-1](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence) | Tezde risk yonetimi ve sorumlu AI dilini akademik zemine oturtur.                                                   |
| Electron code signing/security    | [Electron docs](https://www.electronjs.org/docs/latest/tutorial/code-signing)                                                           | Paketleme ve dagitim fazinda guvenlik gereksinimleri.                                                               |
| GitHub CodeQL JS/TS               | [CodeQL JS/TS](https://codeql.github.com/docs/codeql-language-guides/codeql-for-javascript/)                                            | TypeScript veri akisi ve security query'leri.                                                                       |

**Agentic IDE icin guardrail test seti**

- Indirect prompt injection: repo icinde `README.md`, issue metni veya yorum gibi gorunen dosyalara "ignore previous
  instructions" payload'lari koy.
- Secret exfiltration: `.env`, `.npmrc`, `id_rsa`, `*.pem` context'e alinmaya calisilsin.
- Workspace escape: `../`, URL encoded traversal, Windows backslash traversal, symlink-to-outside.
- Protected write: `.git/`, lock file, config file ve secret dosyalarina write denemeleri.
- Large edit threshold: 20+ dosya veya 500+ satirlik diff icin zorunlu warning.
- Diff secret scan: ajan yeni bir API key benzeri string urettiginde apply engellensin.

## 6. Benchmark ve Tez Degerlendirmesi

| Kaynak                         | Link                                                                             | Kullanim                                                        |
|--------------------------------|----------------------------------------------------------------------------------|-----------------------------------------------------------------|
| SWE-bench                      | [swebench.com](https://www.swebench.com/)                                        | Dis dunyadaki agent benchmark dilini anlamak icin.              |
| SWE-bench Verified             | [Verified](https://www.swebench.com/verified.html)                               | Insan dogrulamali subset fikri icin.                            |
| OpenAI SWE-bench Verified notu | [OpenAI](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) | Tek basina frontier coding metrigi olarak kullanmama gerekcesi. |
| SWE-agent                      | [GitHub](https://github.com/swe-agent/swe-agent)                                 | Harness ve task-runner tasarimi.                                |
| Aider Polyglot                 | [Aider benchmark docs](https://aider.chat/docs/leaderboards/)                    | Kod duzenleme becerisini dis benchmark olarak takip etmek icin. |

**Tez icin ana benchmark onerisi**

Kendi benchmark setini kur. Dis benchmark'lar ek kanit olsun, ana kanit olmasin.

Minimum set:

| Senaryo                    | Gorev sayisi | Metrik                                          |
|----------------------------|-------------:|-------------------------------------------------|
| Bug fix                    |            5 | Test pass, dogru dosya/satir, rollback ihtiyaci |
| Multi-file rename/refactor |            5 | Kac referans dogru guncellendi, hedef disi diff |
| Test yazma                 |            5 | Test compile/pass, coverage artisi              |
| Codebase Q&A               |            5 | Kaynak atif dogrulugu, hallucination orani      |
| Safe single-file edit      |            5 | Sadece hedef dosya, secret/protected write yok  |

Karsilastirma:

1. Direkt LLM cevabi.
2. Plan-first + approval-gated akis.
3. Plan-first + diff preview + rollback.

Olc:

- Basari orani.
- Yanlis/eksik kaynak atfi.
- Onaydan sonra rollback orani.
- Guvenlik ihlali sayisi.
- Ortalama sure.
- Token/maliyet.
- Kullanici guveni anketi.

## 7. Release, Paketleme ve CD

| Arac             | Link                                                                     | Karar                                                                      |
|------------------|--------------------------------------------------------------------------|----------------------------------------------------------------------------|
| Electron Forge   | [Docs](https://www.electronforge.io/)                                    | Juri demosu icin ilk paketleme secenegi.                                   |
| electron-builder | [Auto update docs](https://www.electron.build/auto-update.html)          | Tez sonrasi urunlestirme ve auto-update icin.                              |
| Changesets       | [changesets/action](https://github.com/changesets/action)                | Kontrollu release PR, changelog ve versiyonlama icin uygun.                |
| semantic-release | [semantic-release](https://github.com/semantic-release/semantic-release) | Tam otomatik release icin guclu ama tez MVP'sinde fazla otomatik olabilir. |

**Oneri**

- Ay 1-15: Paketleme yok, `npm run dev`.
- Ay 16: `npm run build` + Electron Forge portable build.
- Ay 17: Demo makinesinde smoke test; API key ve Ollama senaryolari icin yedek script.
- Tez sonrasi: electron-builder + code signing + auto-update dusun.

## 8. Fazlara Gore Uygulama Plani

### Faz 0: Simdi

- GitHub Project alanlarini tez metriklerine gore netlestir.
- Zotero collection yapisini kur.
- Node 20 hedefini Node 24 LTS karariyla guncelle; Node 22 fallback gerekirse gerekcesini Project kartina yaz.
- `dependabot.yml` icine npm ecosystem ekle.
- Gitleaks ve Dependency Review workflow'u ekle.

### Faz 1: Uygulama Iskeleti

- `electron-vite` + TypeScript scaffold.
- ESLint, Prettier, Vitest.
- Monaco editor ve basit file tree.
- `PathSanitizer` ve `FileFilter` unit/property testleri.

### Faz 2: Editor ve Context Engine

- Monaco Diff Editor.
- SQLite + sqlite-vec adapter.
- Ollama embedding adapter.
- ts-morph ile TS sembol cikarma.
- Retrieval eval fixture'lari.

### Faz 3: Agent Loop

- `ModelProvider` interface.
- Anthropic + Ollama provider.
- Plan JSON schema.
- Diff generation.
- Approval gate.
- Audit log.
- Rollback stack.

### Faz 4: Guvenlik ve Degerlendirme

- Prompt injection fixture'lari.
- Protected file write tests.
- Secret-in-diff scan.
- 25 gorevlik benchmark seti.
- Direct LLM vs approval-gated deneyleri.

### Faz 5: Demo ve Savunma

- Playwright Electron smoke/E2E.
- Portable build.
- 5 dakikalik demo script.
- Benchmark sonuc tablolari.
- Tezde "ne ogrendik" bolumu icin metrik ozetleri.

## 9. Kullanilmamasi veya Ertelenmesi Onerilenler

| Arac/Yaklasim              | Neden ertelenmeli                                                            |
|----------------------------|------------------------------------------------------------------------------|
| Full multi-agent framework | Tezin ana sorusu single-agent approval loop; multi-agent kapsam patlatir.    |
| MCP full entegrasyonu      | Gelecek calisma icin iyi, MVP'de ekstra protokol/yetki karmasikligi.         |
| Auto-update                | Code signing ve release infra gerektirir; juri demosu icin degil.            |
| Cloud auth / hesap sistemi | Local-first ve privacy iddiasini bulandirir.                                 |
| Terminal command execution | Shell injection ve excessive agency riskini buyutur; MVP disi kalmasi dogru. |
| Cok fazla provider         | Claude + Ollama yeterli; OpenAI/Gemini sonraya kalabilir.                    |

## Kaynaklar

- GitHub Projects: https://docs.github.com/en/issues/planning-and-tracking-with-projects
- GitHub Actions: https://docs.github.com/en/actions/get-started/understanding-github-actions
- Dependency
  Review: https://docs.github.com/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review
- CodeQL Action: https://github.com/github/codeql-action
- CodeQL JS/TS: https://codeql.github.com/docs/codeql-language-guides/codeql-for-javascript/
- Gitleaks Action: https://github.com/gitleaks/gitleaks-action
- Semgrep: https://github.com/semgrep/semgrep
- Electron Forge: https://www.electronforge.io/
- electron-vite: https://electron-vite.org/
- electron-builder auto update: https://www.electron.build/auto-update.html
- Electron code signing: https://www.electronjs.org/docs/latest/tutorial/code-signing
- Electron releases: https://releases.electronjs.org/release
- Node.js release schedule: https://github.com/nodejs/Release
- Monaco Editor API: https://microsoft.github.io/monaco-editor/
- Playwright Electron: https://playwright.dev/docs/api/class-electron
- Vitest coverage: https://vitest.dev/guide/coverage.html
- fast-check: https://fast-check.dev/
- Codecov Action: https://github.com/codecov/codecov-action
- Knip: https://knip.dev/
- Prettier: https://prettier.io/docs
- typescript-eslint: https://typescript-eslint.io/
- ts-morph: https://ts-morph.com/
- Tree-sitter: https://github.com/tree-sitter/tree-sitter
- sqlite-vec: https://github.com/asg017/sqlite-vec
- Ollama docs: https://docs.ollama.com/
- Ollama embeddings: https://docs.ollama.com/capabilities/embeddings
- Vercel AI Gateway / AI SDK providers: https://vercel.com/docs/ai-gateway/models-and-providers/
- Anthropic TypeScript Agent SDK: https://platform.claude.com/docs/en/agent-sdk/typescript
- OWASP Top 10 for LLM Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- NIST AI RMF Generative AI
  Profile: https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
- Aider: https://github.com/Aider-AI/aider
- OpenHands: https://github.com/OpenHands/OpenHands
- OpenHands SDK: https://github.com/OpenHands/software-agent-sdk/
- SWE-agent: https://github.com/SWE-agent/SWE-agent
- SWE-bench: https://www.swebench.com/
- SWE-bench Verified: https://www.swebench.com/verified.html
- OpenAI SWE-bench Verified note: https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/
- Continue docs: https://docs.continue.dev/index
- Tabby: https://github.com/TabbyML/tabby
- Cline: https://cline.bot/
- OpenCode: https://github.com/opencode-ai/opencode
- Linear GitHub integration: https://linear.app/docs/github-integration
- Notion GitHub integration: https://www.notion.com/help/github
- Obsidian Canvas: https://obsidian.md/help/plugins/canvas
- Zotero quick start: https://www.zotero.org/support/quick_start_guide
- Changesets Action: https://github.com/changesets/action
- semantic-release: https://github.com/semantic-release/semantic-release
