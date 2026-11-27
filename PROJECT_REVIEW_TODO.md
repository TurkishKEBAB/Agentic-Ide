# Proje Inceleme Todo Listesi

Bu dosya, Agentic IDE reposunu sonraki oturumlarda parca parca incelemek ve
mimari, planlama, GitHub Project, dokumantasyon, diyagram ve workflow
duzenlemelerini takip etmek icin olusturuldu.

Olusturulma tarihi: 2026-05-06

## 7 Ekim 2026 kapsamlı inceleme kaydı

İlk danışman toplantısı için repo belgeleri ve canlı GitHub'daki 95 issue incelendi. Bulgular, düzeltmeler ve kalan
danışman kararları [inceleme raporunda](working-notes/advisor-2026-10-08/REVIEW_REPORT.md) kayıtlıdır.

- [x] Repo/dirty-file ve GitHub başlangıç envanteri kaydedildi; önceki yerel değişiklikler korundu.
- [x] Ürün/tez iddiaları ve VDD odak çelişkisi incelendi; karar K1 olarak açık tutuldu.
- [x] Mimari, ADR, şema, onay/apply/rollback ve verification boşlukları incelendi; sözleşme ve proposed ADR eklendi.
- [x] Eksik 26 mevcut issue canonical seed'e alındı; native hierarchy/dependency ve Project alanları tamamlandı.
- [x] Readiness/workflow otomatik onay varsayımları düzeltildi; milestone çıkış kapıları yazıldı.
- [x] 20/25 benchmark ve metrik/causal-design çelişkileri düzeltildi; formal evaluation protokolü hazırlandı.
- [x] İlk toplantı gündemi ve Claude Design promptu hazırlandı.
- [ ] K1–K5 danışman kararlarını 8 Ekim toplantısında kaydet.
- [ ] Gerçek teslim tarihleri/haftalık kapasiteye göre milestone ve Target Date alanlarını doldur.
- [ ] Schema extension, IPC/secret storage ve transaction sözleşmelerini ilk uygulama dilimlerinde kanıtla.

Aşağıdaki eski checklist ayrıntılı takip için korunur; bu inceleme uygulama işlerini veya danışman onaylarını
tamamlandı saymaz. `create-issues.sh` bir önceki tek-seferlik çalışma dosyası olarak korundu ve çalıştırılmadı.

## Kullanim

- Her oturumda bir bolum sec.
- Inceleme sonunda bulunan karar, celiski, eksik veya aksiyonlari bu dosyada
  ilgili basligin altina isle.
- Tamamlanan maddeleri `[x]`, devam edenleri `[~]`, bekleyenleri `[ ]` olarak
  isaretle.
- Kod veya dokuman degisikligi yapilmadan once ilgili kaynak dosyalar ve
  beklenen cikti netlestirilsin.

## Oncelik Efsanesi

- P0: Implementasyona baslamadan once netlesmesi gereken konu.
- P1: Ilk MVP sprintleri sirasinda netlesmesi gereken konu.
- P2: Tez, sunum, operasyon veya gelecek calisma kalitesini artiran konu.

## 0. Baslangic Envanteri

- [ ] P0 - Repo durumunu kaydet: `git status --short`, aktif branch, izlenmeyen
  dosyalar ve yerel degisiklikler.
- [ ] P0 - `create-issues.sh` dosyasinin neden untracked oldugunu incele:
  kalacak mi, `scripts/` altina mi tasinacak, yoksa silinecek mi?
- [ ] P0 - Ana kaynak haritasini cikar: top-level `.md` dosyalari, `docs/`,
  `diagrams/`, `.github/`, `github-projects/`, `scripts/`.
- [ ] P0 - README'deki "Current Status" ile repo gerceginin uyumunu kontrol et.
- [ ] P1 - Dokumanlarda karakter/encoding bozulmasi var mi incele.
  Ozellikle bazi Turkce basliklar terminal ciktisinda bozuk gorunuyor.

## 1. Urun Kapsami ve Akademik Konumlandirma

Kaynaklar:

- `README.md`
- `SUPERVISOR_BRIEF.md`
- `PRODUCT_PLAN.md`
- `SYSTEM_PLAN.md`
- `VERIFICATION_DRIVEN_DEVELOPMENT.md`
- `CRITICAL_ANALYSIS.md`
- `THESIS_OUTLINE.md`

Todo:

- [ ] P0 - Tek cumlelik proje tanimini belirle ve tum dokumanlarda ayni hale getir.
- [ ] P0 - Ana arastirma sorusunu netlestir: "agentic IDE" mi,
  "verification-driven development" mi, yoksa "approval-gated AI coding" mi? Cevap verification driven development.
- [ ] P0 - MVP kapsaminda kesin icerde ve kesin disarda olan ozellikleri
  tek tabloya indir.
- [ ] P0 - "Proaktif davranis" kararini kontrol et: MVP disi oldugu her yerde
  tutarli mi?
- [ ] P1 - Hedef kullanici tanimini sadelestir: ogrenci, junior developer,
  profesyonel developer veya tez juri demosu. (öğrenci ve tez jüri demosu)
- [ ] P1 - Basari kriterlerini urun, guvenlik ve tez metrikleri olarak ayir.
- [ ] P1 - `CRITICAL_ANALYSIS.md` icindeki riskleri roadmap ve backlog ile
  baglantilandir.
- [ ] P2 - Danisman toplantisi icin acik karar sorularini tek sayfalik karar
  listesine indir.

Beklenen cikti:

- Net MVP kapsami.
- Tek kaynak proje tanimi.
- Guncellenmis danisman karar listesi.

## 2. Mimari ve ADR Tutarliligi

Kaynaklar:

- `ARCHITECTURE_OPTIONS.md`
- `AGENT_ARCHITECTURE_ANALYSIS.md`
- `SYSTEM_PLAN.md`
- `TECH_STACK_AND_AI.md`
- `docs/adr/`
- `docs/IMPLEMENTATION_READINESS.md`
- `docs/PRE_IMPLEMENTATION_AUDIT.md`

Todo:

- [ ] P0 - Electron + Monaco kararinin hala dogru varsayimlara dayandigini
  kontrol et.
- [ ] P0 - Single-agent ReAct dongusu karari ile diger dokumanlardaki
  planner/executor/reviewer anlatimlari celisiyor mu incele.
- [ ] P0 - "No shell execution in MVP" kararinin tool sistemi, test akisi ve
  demo beklentileriyle uyumunu kontrol et.
- [ ] P0 - Context/retrieval mimarisini netlestir: dosya tarama, embedding,
  SQLite/sqlite-vec, indeks yenileme, ignore kurallari.
- [ ] P0 - Diff preview, human approval, atomic write, rollback ve audit log
  akislarini tek mimari akis olarak modelle.
- [ ] P1 - ADR-001 ile ADR-009 arasinda eksik "revisit condition" veya belirsiz
  sonuc var mi kontrol et.
- [ ] P1 - Yeni ADR gerektiren karar adaylarini belirle:
  proje dizin yapisi, IPC modeli, secret storage, telemetry/evidence logging,
  model provider interface, prompt registry.
- [ ] P1 - Guvenlik katmanlarini runtime mimarisine bagla:
  workspace boundary, write boundary, protected files, secret-in-diff detection.
- [ ] P2 - C4 tarzinda Context, Container ve Component diyagram ihtiyacini
  belirle.

Beklenen cikti:

- Guncel mimari karar matrisi.
- Eksik ADR listesi.
- Uygulamaya baslamak icin hedef klasor/modul yapisi.

## 3. GitHub Project ve Requirements Backlog

Kaynaklar:

- `github-projects/requirements-analysis.json`
- `github-projects/README.md`
- `docs/GITHUB_PROJECT_OPERATIONS.md`
- `docs/schemas/requirements-project.schema.json`
- `scripts/setup-requirements-github-project.ps1`
- `scripts/validate-github-governance.ps1`
- `.github/ISSUE_TEMPLATE/`

Todo:

- [ ] P0 - Requirements JSON dosyasini schema'ya gore dogrula.
- [ ] P0 - Project field listesi yeterli mi kontrol et:
  Requirement Status, Area, Requirement Type, Phase, Priority, Readiness,
  dependencies, evidence.
- [ ] P0 - Epic, issue ve acceptance criteria alanlarinin MVP kapsamiyla
  uyumlu oldugunu kontrol et.
- [ ] P0 - Faz isimlerini tutarli hale getir:
  "Faz 1 - Implementation Readiness", "Faz 2 - MVP",
  "Faz 3 - Evaluation & Thesis".
- [ ] P1 - Label politikasini issue template'leri ile karsilastir.
- [ ] P1 - GitHub Project view onerilerini gercek takip ihtiyacina gore
  guncelle: Roadmap, Risk, Readiness, Evaluation Evidence, Blocked.
- [ ] P1 - `setup-requirements-github-project.ps1` scriptinin idempotent
  calisip calismadigini dry-run ile incele.
- [ ] P1 - `create-issues.sh` ile PowerShell setup scripti arasinda tekrar veya
  celiski var mi incele.
- [ ] P2 - GitHub UI'da manuel yapilmasi gereken ayarlari ayri checklist yap:
  branch protection, project views, automation, required checks.

Beklenen cikti:

- Temiz requirements backlog.
- Tek resmi GitHub Project setup yolu.
- Issue template ve label standardi.

## 4. Dokumantasyon Mimarisi

Kaynaklar:

- Top-level `.md` dosyalari
- `docs/`
- `working-notes/`
- `README.md`
- `CONTRIBUTING.md`
- `CONTRIBUTION_AND_STANDARDS.md`
- `SECURITY.md`

Todo:

- [ ] P0 - Hangi dokumanin source of truth oldugunu belirle:
  product, architecture, safety, roadmap, evaluation, thesis.
- [ ] P0 - Ayni bilginin birden fazla dosyada farkli yazildigi yerleri bul.
- [ ] P0 - README'deki core document listesi eksik veya fazla mi kontrol et.
- [ ] P0 - Link dogrulama scriptini calistir:
  `powershell -ExecutionPolicy Bypass -File .\scripts\validate-doc-links.ps1`.
- [ ] P1 - Turkce/English dosya dili stratejisini belirle.
- [ ] P1 - Encoding bozulmasi olan dosyalari tespit et ve duzeltme planini yaz.
- [ ] P1 - Glossary'deki terimler ile dokuman kullanimi uyumlu mu kontrol et:
  workspace boundary, write boundary, approval gate, reactive safety warning,
  audit log, VDD.
- [ ] P1 - `working-notes/` icin kalici dokumana donusecek notlari sec.
- [ ] P2 - Danisman icin "okuma sirasi" dokumanini sadelestir.
- [ ] P2 - Lisans kararini netlestir: repo su an lisanssiz ve tum haklari sakli.

Beklenen cikti:

- Dokuman sahiplik haritasi.
- Cakisan veya eskimis dokuman listesi.
- Dil ve encoding duzeltme plani.

## 5. Diyagramlar

Kaynaklar:

- `diagrams/UC/`
- `diagrams/UC/future/`
- `diagrams/UC/README.md`
- `scripts/validate-plantuml.ps1`

Todo:

- [ ] P0 - Mevcut use case diyagramlarini product ve system planla
  karsilastir.
- [ ] P0 - UC-03A reactive safety ile UC-03B proactive future ayrimi tutarli mi
  kontrol et.
- [ ] P0 - UC-02 kod degisikligi yasam dongusunun plan, diff, approval,
  apply, rollback, audit akislarini kapsadigini dogrula.
- [ ] P1 - Eksik diyagram ihtiyaclarini belirle:
  system context, container, component, sequence, data flow, threat model.
- [ ] P1 - PlantUML validate scriptini calistir:
  `powershell -ExecutionPolicy Bypass -File .\scripts\validate-plantuml.ps1`.
- [ ] P1 - Diyagramlarda kullanilan terimleri glossary ve ADR-008 ile
  uyumlu hale getir.
- [ ] P2 - Tez icin hangi diyagramlarin final gorsel olarak kullanilacagini
  sec.

Beklenen cikti:

- Guncel diyagram listesi.
- Eksik diyagram backlog'u.
- Tez ve README icin kullanilacak gorsel set.

## 6. GitHub Workflow, CI ve Governance

Kaynaklar:

- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/docs.yml`
- `.github/workflows/governance.yml`
- `.github/workflows/security.yml`
- `.github/workflows/supply-chain.yml`
- `.github/dependabot.yml`
- `.github/pull_request_template.md`
- `docs/QUALITY_GATES.md`
- `TESTING_AND_CI.md`

Todo:

- [ ] P0 - Workflow'larin planning-only repo durumunda dogru davrandigini
  kontrol et.
- [ ] P0 - App scaffold geldikten sonra beklenen npm scriptlerini netlestir:
  `format:check`, `lint`, `typecheck`, `test`, `test:security`, `build`.
- [ ] P0 - `ci.yml` ile `docs/QUALITY_GATES.md` arasinda script ve gate
  uyumu var mi kontrol et.
- [ ] P0 - `codeql.yml` icindeki GitHub Actions ve JavaScript/TypeScript
  analiz stratejisini gozden gecir.
- [ ] P1 - Action surumleri, izinleri ve branch protection beklentilerini
  kontrol et.
- [ ] P1 - `security.yml` icindeki dependency review ve Gitleaks akislarini
  app scaffold sonrasi ihtiyaclara gore ayarla.
- [ ] P1 - `supply-chain.yml` icindeki npm audit, SBOM ve OpenSSF Scorecard
  akislarini gozden gecir.
- [ ] P1 - Dependabot kapsamini npm, GitHub Actions ve diger paket yoneticileri
  icin degerlendir.
- [ ] P2 - Release, paketleme ve artifact uretimi icin gelecekteki workflow
  ihtiyacini belirle.

Beklenen cikti:

- CI kalite kapisi listesi.
- Branch protection checklist.
- Scaffold sonrasi workflow guncelleme plani.

## 7. Guvenlik, Gizlilik ve Threat Model

Kaynaklar:

- `SAFETY_AND_GUARDRAILS.md`
- `DATA_AND_PRIVACY.md`
- `docs/THREAT_MODEL.md`
- `docs/DATA_RETENTION.md`
- `docs/INCIDENT_RESPONSE.md`
- `SECURITY.md`
- `docs/schemas/audit-event.schema.json`

Todo:

- [ ] P0 - Workspace boundary ve path normalization kurallarini testlenebilir
  hale getir.
- [ ] P0 - Protected file/write boundary listesini netlestir:
  `.git`, `.env`, secret dosyalari, OS path edge case'leri.
- [ ] P0 - Secret-in-diff detection kapsam ve limitlerini belirle.
- [ ] P0 - API key saklama yaklasimini mimari karara bagla.
- [ ] P0 - Audit event schema'sinin approval, rejection, rollback, safety
  warning ve model metadata ihtiyaclarini karsiladigini kontrol et.
- [ ] P1 - Prompt injection ve context poisoning risklerini threat model'e ekle.
- [ ] P1 - KVKK/GDPR bolumlerini MVP gercegine gore sadelestir.
- [ ] P1 - Incident response runbook'un local-first desktop app icin anlamli
  olup olmadigini kontrol et.
- [ ] P2 - Security test suite icin minimum test matrisi hazirla.

Beklenen cikti:

- Testlenebilir guardrail tanimlari.
- Guncel threat model.
- Audit ve veri saklama kararlari.

## 8. Uygulama Iskeleti Hazirligi

Kaynaklar:

- `docs/IMPLEMENTATION_READINESS.md`
- `docs/PRE_IMPLEMENTATION_AUDIT.md`
- `DEPLOYMENT_AND_PACKAGING.md`
- `TECH_STACK_AND_AI.md`
- `CONTRIBUTION_AND_STANDARDS.md`
- `.editorconfig`
- `.markdownlint.json`
- `.nvmrc`

Todo:

- [ ] P0 - Ilk app scaffold icin karar ver:
  Electron + Vite + React + TypeScript mi, yoksa daha sade Electron + TS mi?
- [ ] P0 - Hedef klasor yapisini yaz:
  `src/main`, `src/preload`, `src/renderer`, `src/shared`, `src/agent`,
  `src/safety`, `src/retrieval`, `tests`.
- [ ] P0 - package manager kararini netlestir:
  npm lockfile bekleniyor mu, yoksa pnpm/yarn dusunulecek mi?
- [ ] P0 - Minimum npm script listesini belirle.
- [ ] P1 - ESLint, Prettier, TypeScript strict, Vitest ve Playwright Electron
  kurulum planini yaz.
- [ ] P1 - IPC boundary, file access API ve renderer-main ayrimini tasarla.
- [ ] P1 - Ilk vertical slice'i belirle:
  workspace sec, dosya oku, diff planla, onayla, uygula, audit kaydet.
- [ ] P2 - Packaging hedeflerini ayir:
  dev demo, thesis defense artifact, source delivery.

Beklenen cikti:

- Scaffold checklist.
- Ilk sprint issue listesi.
- Minimum calisan MVP slice tanimi.

## 9. Test, Benchmark ve Degerlendirme

Kaynaklar:

- `TESTING_AND_CI.md`
- `EVALUATION_PLAN.md`
- `docs/benchmark/README.md`
- `VERIFICATION_DRIVEN_DEVELOPMENT.md`
- `docs/QUALITY_GATES.md`
- `docs/schemas/benchmark-task.schema.json`

Todo:

- [ ] P0 - Birim, entegrasyon, security ve E2E test hedeflerini modullere bagla.
- [ ] P0 - Benchmark gorev seti icin minimum 20 gorev kararini dogrula veya
  revize et.
- [ ] P0 - Ablation tasarimini netlestir:
  A baseline, B approval-gate-disabled, C full Agentic IDE.
- [ ] P0 - Birincil metrikleri kesinlestir:
  task success rate, unauthorized write count, rollback/reject behavior,
  hallucination/factual accuracy.
- [ ] P1 - Evidence matrix ile GitHub Project alanlari baglantili mi kontrol et.
- [ ] P1 - Test fixture reposu veya mini benchmark proje ihtiyacini belirle.
- [ ] P1 - Deney protokolu icin veri toplama formatini schema'ya bagla.
- [ ] P2 - Kullanici calismasi yapilacaksa etik, katilimci ve form
  gereksinimlerini ayir.

Beklenen cikti:

- Degerlendirme protokolu.
- Benchmark backlog'u.
- CI'ya baglanacak test hedefleri.

## 10. UX, Onboarding ve Accessibility

Kaynaklar:

- `UX_AND_INTERACTION.md`
- `docs/ACCESSIBILITY_PLAN.md`
- `PRODUCT_PLAN.md`
- `diagrams/UC/UC-05-konfigurasyon-ve-onboarding.puml`

Todo:

- [ ] P0 - Ana uygulama ekranini netlestir:
  editor, chat/agent paneli, diff preview, approval controls, audit/history.
- [ ] P0 - Ilk acilis ve workspace secim akislarini MVP icin sadelestir.
- [ ] P0 - Approval fatigue riskine karsi UX kararlarini testlenebilir hale getir.
- [ ] P1 - Error states ve safety warning metinlerini tasarla.
- [ ] P1 - Rollback akisini kullanici perspektifinden tekrar incele.
- [ ] P1 - Accessibility minimum hedeflerini UI component backlog'una bagla.
- [ ] P2 - Tez demosu icin kullanilacak senaryoyu storyboard olarak yaz.

Beklenen cikti:

- MVP UI akisi.
- Wireframe/diyagram ihtiyac listesi.
- Accessibility kabul kriterleri.

## 11. Model, Maliyet ve Performans

Kaynaklar:

- `TECH_STACK_AND_AI.md`
- `COST_AND_PERFORMANCE.md`
- `docs/adr/ADR-004-manual-model-selection.md`
- `docs/adr/ADR-005-cloud-local-provider-boundary.md`
- `docs/adr/ADR-009-prompt-model-versioning.md`

Todo:

- [ ] P0 - Model provider interface ihtiyaclarini belirle:
  chat, tool call, streaming, structured output, token usage, error handling.
- [ ] P0 - Cloud/local provider boundary kararini UX ve privacy ile bagla.
- [ ] P0 - Prompt ve model versiyonlama kararini audit/evaluation ile bagla.
- [ ] P1 - Maliyet tablolarini guncel resmi kaynaklarla daha sonra dogrula.
- [ ] P1 - Retrieval maliyet/performans varsayimlarini test planina ekle.
- [ ] P1 - Local model fallback kararinin MVP icin gercekci olup olmadigini
  tekrar degerlendir.
- [ ] P2 - Demo ortami icin minimum donanim ve model senaryosunu belirle.

Beklenen cikti:

- Model abstraction backlog'u.
- Maliyet ve performans varsayim listesi.
- Guncellenmesi gereken dis kaynak listesi.

## 12. Tez ve Danisman Sureci

Kaynaklar:

- `THESIS_OUTLINE.md`
- `SUPERVISOR_BRIEF.md`
- `ADVISOR_MEETING_AGENDA.md`
- `EVALUATION_PLAN.md`
- `VERIFICATION_DRIVEN_DEVELOPMENT.md`

Todo:

- [ ] P0 - Tez katkisini netlestir:
  yeni bir IDE mi, guvenli agent loop mu, yoksa VDD uygulama modeli mi?
- [ ] P0 - Danismanin karar vermesi gereken konulari "onay bekleyen kararlar"
  listesine indir.
- [ ] P1 - Tez bolumlerinin repo artefact'lariyla baglantisini kur.
- [ ] P1 - Literatur taramasi icin eksik kaynak kategorilerini belirle.
- [ ] P1 - Deney sonuclari icin hangi verinin nasil saklanacagini planla.
- [ ] P2 - Final sunum ve demo akisini simdiden backlog'a ekle.

Beklenen cikti:

- Danisman gorusme dosyasi.
- Tez artefact haritasi.
- Arastirma sorusu ve metrik uyumu.

## 13. Repo Standartlari ve Operasyon

Kaynaklar:

- `.commitlintrc.json`
- `.editorconfig`
- `.gitattributes`
- `.gitignore`
- `.markdownlint.json`
- `.nvmrc`
- `CONTRIBUTING.md`
- `CONTRIBUTION_AND_STANDARDS.md`
- `.github/pull_request_template.md`

Todo:

- [ ] P0 - Commitlint kurallari ile contributing dokumani uyumlu mu kontrol et.
- [ ] P0 - `.gitignore` app scaffold sonrasi yeterli olacak mi incele.
- [ ] P1 - Markdown lint kurallari dokuman yapisina uygun mu degerlendir.
- [ ] P1 - PR template kalite kapilari, evidence ve safety kontrollerini
  yeterince soruyor mu kontrol et.
- [ ] P1 - Branch stratejisi ve release/tag stratejisini netlestir.
- [ ] P2 - Repo lisans karari icin secenekleri hazirla.

Beklenen cikti:

- Repo governance duzeltme listesi.
- PR ve commit standardi.
- Lisans karar notu.

## 14. Dis Kaynak ve Guncellik Kontrolu

Kaynaklar:

- `TOOLING_AND_REFERENCE_RECOMMENDATIONS.md`
- `COST_AND_PERFORMANCE.md`
- `TECH_STACK_AND_AI.md`
- `EVALUATION_PLAN.md`

Todo:

- [ ] P1 - Model fiyatlari, model kabiliyetleri ve API ozelliklerini resmi
  kaynaklardan guncelle.
- [ ] P1 - Electron, Monaco, Playwright, Vitest ve sqlite-vec secimlerinin
  guncel durumunu kontrol et.
- [ ] P1 - SWE-bench, HumanEval, MBPP ve benzeri benchmark referanslarini
  tarih ve uygunluk acisindan dogrula.
- [ ] P2 - Rakip urunler ve AI coding agent repo listesi guncellenecek mi
  karar ver.

Beklenen cikti:

- Guncel referans listesi.
- Degismesi gereken teknoloji veya varsayim listesi.

## 15. Onerilen Oturum Plani

- [ ] Oturum 1 - Baslangic envanteri, dokuman source-of-truth haritasi,
  celiski listesi.
- [ ] Oturum 2 - Mimari, ADR'ler, agent loop, retrieval ve safety kararlarini
  netlestirme.
- [ ] Oturum 3 - GitHub Project, issue backlog, labels, templates ve governance.
- [ ] Oturum 4 - `.github/workflows`, CI, CodeQL, security, supply-chain ve
  branch protection.
- [ ] Oturum 5 - Diyagram seti: use case temizligi, sequence, C4 ve threat model
  diyagramlari.
- [ ] Oturum 6 - App scaffold hazirligi ve ilk vertical MVP slice.
- [ ] Oturum 7 - Test, benchmark, evaluation ve thesis evidence modeli.
- [ ] Oturum 8 - Tez/danisman paketleme: supervisor brief, agenda, roadmap ve
  final sunum hazirligi.

## 16. Her Oturum Sonu Handoff Checklist

- [ ] Degisen dosyalar listelendi.
- [ ] Alinan kararlar yazildi.
- [ ] Acik kalan sorular yazildi.
- [ ] Bir sonraki oturumun ilk isi belirlendi.
- [ ] Gerekirse GitHub issue veya Project item onerisi yazildi.
- [ ] Calistirilan komutlar ve sonuc ozeti kaydedildi.
