# GitHub Backlog İncelemesi — 8 Ekim 2026 Danışman Toplantısı

İnceleme referansı: kullanıcının yerel tarihi 7 Ekim 2026; toplantı 8 Ekim 2026.
Aşağıdaki sayımlar, bu klasördeki **ilk inceleme anlık görüntülerine** aittir.
Sonraki sınırlı GitHub güncellemeleri için ana inceleme raporu ve işlem kaydı esas alınmalıdır.

## Doğrulanan Envanter

- Repo: [TurkishKEBAB/Agentic-Ide](https://github.com/TurkishKEBAB/Agentic-Ide).
- Project: [Agentic IDE - Thesis Backlog, #8](https://github.com/users/TurkishKEBAB/projects/8).
- 95 issue; tamamı açık. Project'te 95 kart; tamamı Issue, PR veya draft kart yok.
- 17 epic, 78 alt kapsam/task/requirement issue. Açık issue sayısı geliştirme ilerlemesi veya tamamlanma yüzdesi değildir.
- İlk canonical seed: 69 issue. Canlıdaki ek 26 issue: #88–#113.
- 32 Project alanı = 13 yerleşik + 19 canonical custom alan. Beklenen alan tanımı eksik değil.
- Workflow: Backlog 53, Review 33, Ready 9.
- Readiness: Ready 42, Needs Clarification 27, alanı boş 26.
- Requirement Status: Draft 36, Advisor Review 33, alanı boş 26.
- 95 issue'nun hiçbirinde yorum yok. Yorumlarda gözden kaçmış danışman onayı veya uygulama kanıtı bulunmuyor.

## Milestone Denetimi

| Milestone | Açık issue | Kapalı issue | Son tarih | Çıkış kapısı ihtiyacı |
|---|---:|---:|---|---|
| [Faz 1 - Implementation Readiness](https://github.com/TurkishKEBAB/Agentic-Ide/milestone/2) | 36 | 0 | Yok | Kapsam/ADR kararları, DoR/DoD, schema ve aktif governance doğrulaması |
| [Faz 2 - MVP](https://github.com/TurkishKEBAB/Agentic-Ide/milestone/3) | 39 | 0 | Yok | Güvenli editör ve kullanıcı tetiklemeli onay/uygulama/geri-al akışı; senaryo kanıtları |
| [Faz 3 - Evaluation & Thesis](https://github.com/TurkishKEBAB/Agentic-Ide/milestone/4) | 20 | 0 | Yok | Dondurulmuş deney protokolü, tekrar üretilebilir sonuçlar, tez ve savunma paketi |

Son tarih ve 95 kartın Target Date alanı boş. Akademik başlangıç, teslim ve haftalık çalışma süresi bilinmeden tarih atanması doğru olmaz. Bunlar toplantının karar maddesidir; milestone'ların gecikmiş olduğu sonucuna varılmadı.

PROJECT_ROADMAP.md mevcut taslakta 18 ay / 5 faz kullanırken Project 3 milestone kullanıyor. Bu iki görünümün eşlemesi açıklanmalı veya danışmanla tek plan seçilmeli. Ayrıca Faz 1 Project milestone'u “implementasyon öncesi” diyor fakat #33, #44, #19, #22 ve #52 çalışır ürün kapsamı taşıyor. Planlama kapısı ile ilk temel prototip teslimi ayrı anlaşılmalı; issue'lar takvim anlaşılmadan sessizce taşınmamalı.

## Eksikler, Etkileri ve En Küçük Düzeltmeler

| Öncelik | Bulgu | Kanıt / mevcut issue | En küçük düzeltme |
|---|---|---|---|
| P0 | Canlı ve canonical backlog farklı | #88–#113 canonical seed dışında; 26 kartın phase/priority/readiness/type/source/test/evidence alanları boş | Mevcut 26 issue'yu seed'e al; yeni issue açma. Alanları sınırlı patch ile doldur; canlı danışman metinlerini koru. |
| P0 | Yeni issue ilişkileri yalnızca metin | #89–#93, #95–#99, #101–#103, #105–#107, #109–#113 body'de parent/upstream listeliyor; native ilişkileri yok | Body'deki ilişkileri seed'de kaydet, sonra yalnızca bu ilişkileri native olarak ekle. |
| P0 | Ready durumu inceleme kanıtına dayanmıyor | Faz 1 P0 olan 9 Draft kart otomatik Ready; 33 Advisor Review kartı otomatik readiness Ready | Priority/phase/advisor-review'dan Ready türetmeyi kaldır. İnsan DoR kontrolü ve karar kaydı gerekir. |
| P0 | Approval ile validation aynı kabul ediliyor | Get-Readiness: Approved → Validated | Approved kararı uygulama kanıtı değildir. Validated yalnızca evidence-backed Done sonrasında kullanılmalı. |
| P0 | Arşivlenmiş öneri ile danışman onayı ayrımı belirsiz | ADR dosyaları Accepted; #54–#58, #66–#71 Advisor Review | “Mevcut teknik yön” ve “danışman tarafından onaylandı” ayrı kayıtlar olsun; gerçek toplantı kararını tarihli kaydet. |
| P0 | Benchmark task sayısı çelişkili | #25: 20; benchmark README: 5×5=25; #95 bunu çözmek için zaten var | Tek primary sayım ve kategoriler seç; ek safety fixture'larını primary denominator'dan ayır. Görev sayısı / koşul sayısı / tekrar sayısı ayrı yazılsın. |
| P0 | A/B/C sonuçlarına nedensellik fazla yükleniyor | #54, #25 ve EVALUATION_PLAN | B/C yalnızca onay politikasını karşılaştırır; A/C tüm iş akışını karşılaştırır. Aynı model/prompt/safety/reset kuralları ile farkları tanımla; tüm üç koşulda tek değişken iddiasını kaldır. |
| P0 | Rubric ve analysis geç dondurulabilir | #99 “thesis result writing'den önce”; #98'e bağlı | Formal run'dan önce protokol/rubric/metrik/tekrar/analiz planını dondur. Runner geliştirme ile formal run ayrı adımlardır; #98↔#99 dependency döngüsü kurma. |
| P0 | Çok dosyalı atomiklik ve undo fazla genel | #31 ve #90 yalnızca backup/rename + 10 set | Dosya atomik rename'i, çok dosyalı transaction/recovery'yi ve kullanıcı dosyayı değiştirdikten sonraki undo conflict davranışını ayrı kabul kriterleri yap. |
| P0 | Verifier rolü akademik bağımsızlık gibi sunulabilir | #68, #66, #71 | Ayrı rol/context/tool yüzeyi ve bağımsız test oracle'ı ayrımını yaz. Aynı LLM + farklı prompt doğruluk bağımsızlığını kanıtlamaz. |
| P1 | Güvenli key saklama kararı zayıf | #52: ~/.agentide/config.json AC; #106: key removal | Secret store sınırı ve plaintext fallback kararı mimariyle eşleştir; API key audit/context/index'e girmesin. |
| P1 | Audit log silme vaat edilmiş fakat alt kapsam eksik | #104 controls ve Blocks “Clear audit log”; #105/#106/#107'de yalnızca index/key/redaction/export | Yeni issue açmadan #106'ya retention/evidence-loss uyarılı açık audit-clear kriteri ekle veya #104 iddiasını daralt. |
| P1 | Kabul kriterleri çoğu yerde sadece doküman varlığını ölçüyor | Örn. #33 “Issue body Electron + Monaco tercihini belirtir”, #31 “Issue body backup mantığını açıklar” | Requirement specification ve uygulama DoD'sini ayır; mevcut senaryo/task issue'larını çalışır davranış/test/kanıt hedefleriyle kullan. |
| P1 | Test Target ve Thesis Evidence dolu fakat alan düzeyinde genel | İlk 69 kart setup scriptinde area bazlı kalıp değerler alıyor | Aktif issue için test dosyası/fixture, assertion, artifact path ve evidence version belirt; doluluk tamamlanma kanıtı değildir. |
| P1 | Çalışma sahibi, tahmin, zaman ve milestone mapping net değil | Source issue'lar ile roadmap akademik takvim paylaşmıyor | Haftalık kapasite, ilk sprint kapsamı, advisor cadence, deadline ve phase mapping toplantıda kararlaştırılsın. |
| P1 | İkinci issue yaratma yolu duplicate oluşturabilir | Yerel untracked create-issues.sh, 26 issue'yu gh issue create ile oluşturuyor | Tek resmi canonical seed/setup akışı kullanılsın. Legacy script yeniden çalıştırılmadan arşivlensin veya safe import olduğu belgelensin. |
| P1 | İnsan deneyi zorunlu mu belirsiz | #70, #71, #113 | Pilot/etik kararını açık ver; pilot yapılmazsa öğrenme/güven artışı için kanıtsız sonuç iddiası yok. |

## Bu İncelemede Tamamlanan Yerel İşler

- 26 canlı-only issue canonical seed'e eklendi. Önceki 69 entry korunarak toplam 95 oldu.
- 26 entry için body'deki metadata, acceptance criteria, source documents, hedef parent ve blocker ilişkileri taşındı. Danışman onayı üretilmedi: #113 Advisor Review, diğerleri Draft.
- Get-WorkflowStatus Done/Deferred/Advisor Review durumlarını eşliyor; phase, priority veya epic oluşu Ready atamıyor.
- Get-Readiness yalnızca evidence-backed Done için Validated, declared dependency/deferred/blocked için Blocked, diğerleri için Needs Clarification atıyor. Ready insan DoR incelemesidir.
- Canonical seed / live issue numarası eşlemesi github-issue-number-key-map.json dosyasına yazıldı.
- Behavior → verification → planned evidence matrisi [docs/REQUIREMENTS_TRACEABILITY.md](../../docs/REQUIREMENTS_TRACEABILITY.md) dosyasına eklendi.

Canlı body/Project/native-link/milestone güncellemeleri ana inceleme akışı tarafından sınırlı olarak yönetilir. Bu ajan GitHub mutation yapmadı. Tam setup sync canlı danışman yazılarını ve requirement/readiness kararlarını overwrite edebildiği için çalıştırılmadı.

## Doğrulama

- 95 issue, parent/sub-issue ve comments GraphQL ile tek sayfada doğrulandı; hasNextPage=false.
- 95 issue'nun native blocked_by ilişkileri REST ile okundu; API hatası yok.
- İlk seed69 için 57 native parent link ve 112 native dependency link seed'le birebir uyumlu. Yeni26 için başlangıçta native ilişki sıfır.
- JSON Schema Draft 2020-12 doğrulaması geçti; 95-entry dependency graph cycle kontrolü geçti.
- Setup -DryRun geçti: 19 custom field, 20 label, 95 issue.
- PowerShell AST parse + 8 semantik readiness/workflow kontrolü geçti.

## İlk Uygulama Dilimi

Toplantı kararları ve artifact incelemesi tamamlandıktan sonra ilk dilim dar tutulmalı:

1. Karar/altyapı önkoşulları: #55, #57, #58, #63, #72, #73, #74. Mevcut doküman/CI artefact'larını gözden geçir; sadece gerçekten eksik olanı tamamla.
2. Electron + Monaco açılış ve tek dosya görüntüleme: #33; #44'ün file-open alt kapsamı. Dosya ağacı/5 sekme/onboarding/retrieval'in tümünü aynı PR'a alma.
3. Workspace/protected pure guards: #49 + #45; test target #27. Okuma ve yazma için aynı boundary politikası çalışmalı.
4. Çıkış kanıtı: app launch/file-open smoke sonucu, traversal/sibling-prefix/symlink/junction/protected-file fixture sonucu, CI check'leri ve bir review edilebilir PR.

Agent loop #40/#18, retrieval #22/#43 ve çok dosyalı apply #30/#31 bu güvenli zeminden sonra gelir. Özelliklerin “Ready” sayılması artifact ve dependency incelemesine bağlıdır; bu sıra takvim veya tamamlanmış sonuç değildir.

## Toplantıda Alınması Gereken Kararlar

- Birincil tez katkısı ve savunulabilir iddia (#20,#66).
- Minimum VDD rol ayrımı / bağımsız verification kanıtı (#68).
- Benchmark taxonomy/count, repetitions, B/C farkı ve başarının nasıl ölçüleceği (#25,#54,#95,#99).
- İnsan deneyi/öğrenme iddiası scope'u (#70,#71,#113).
- Akademik bitiş tarihi, haftalık kapasite ve 18 ay/5 faz ↔ 3 milestone ilişkisi (#35,#71).
- İlk prototipin danışmana hangi kanıtla ve ne zaman gösterileceği (#33,#49,#45,#27).

## Tüm Issue'ların İlk Anlık Görüntü Denetimi

Workflow / Requirement / Readiness sütunları ilk canlı Project snapshot'ıdır.
Parent ve blocker sütunları native API sonucudur. Boş alanlar veya metin-only ilişki, sonraki yerel seed tamamlama veya canlı patch ile karıştırılmamalıdır.

| Issue | Canonical key | Phase / Priority | Workflow / Requirement / Readiness | Native parent | Native blockers |
|---|---|---|---|---|---|
| [#5](https://github.com/TurkishKEBAB/Agentic-Ide/issues/5) Epic: Agent Loop | `epic-agent-loop` | Faz 2 / P0 | Review / Advisor Review / Ready | — | — |
| [#8](https://github.com/TurkishKEBAB/Agentic-Ide/issues/8) Epic: Context and Retrieval | `epic-context-retrieval` | Faz 1 / P0 | Review / Advisor Review / Ready | — | — |
| [#9](https://github.com/TurkishKEBAB/Agentic-Ide/issues/9) Epic: Diff Approval and Rollback | `epic-diff-approval` | Faz 2 / P0 | Review / Advisor Review / Ready | — | — |
| [#10](https://github.com/TurkishKEBAB/Agentic-Ide/issues/10) Epic: Editor Foundation | `epic-editor-foundation` | Faz 1 / P0 | Review / Advisor Review / Ready | — | — |
| [#11](https://github.com/TurkishKEBAB/Agentic-Ide/issues/11) Epic: Model and Cost Strategy | `epic-model-cost` | Faz 2 / P1 | Review / Advisor Review / Ready | — | — |
| [#12](https://github.com/TurkishKEBAB/Agentic-Ide/issues/12) Epic: Research Scope and Success Criteria | `epic-research-scope` | Faz 1 / P0 | Review / Advisor Review / Ready | — | — |
| [#13](https://github.com/TurkishKEBAB/Agentic-Ide/issues/13) Epic: Safety and Privacy | `epic-safety-privacy` | Faz 2 / P0 | Review / Advisor Review / Ready | — | — |
| [#14](https://github.com/TurkishKEBAB/Agentic-Ide/issues/14) Epic: Testing and Evaluation | `epic-testing-evaluation` | Faz 3 / P0 | Review / Advisor Review / Ready | — | — |
| [#15](https://github.com/TurkishKEBAB/Agentic-Ide/issues/15) Epic: Thesis Roadmap and Final Deliverables | `epic-thesis-roadmap` | Faz 3 / P0 | Review / Advisor Review / Ready | — | — |
| [#16](https://github.com/TurkishKEBAB/Agentic-Ide/issues/16) Epic: UX and Interaction | `epic-ux-interaction` | Faz 2 / P1 | Review / Advisor Review / Ready | — | — |
| [#17](https://github.com/TurkishKEBAB/Agentic-Ide/issues/17) REQ: Ajan araclari whitelist yaklasimiyla sinirlansin ve explain-only akis desteklensin | `req-agent-tool-whitelist` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #5 | #18, #58, #74 |
| [#18](https://github.com/TurkishKEBAB/Agentic-Ide/issues/18) REQ: Ajan plani dosya bazli degisiklik ozeti ve gerekce ile sunmali | `req-agent-plan-first` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #5 | #40, #63, #68 |
| [#19](https://github.com/TurkishKEBAB/Agentic-Ide/issues/19) REQ: Always-on context aktif dosya, ilgili sembol ve proje agacini icermeli | `req-context-always-on` | Faz 1 / P0 | Ready / Draft / Ready | #8 | #33, #58, #63 |
| [#20](https://github.com/TurkishKEBAB/Agentic-Ide/issues/20) REQ: Ana ve alt arastirma sorulari resmi backlogda kayit altina alinsin | `req-research-question` | Faz 1 / P0 | Ready / Draft / Ready | #12 | — |
| [#21](https://github.com/TurkishKEBAB/Agentic-Ide/issues/21) REQ: Apply oncesi reactive safety check 4 trigger'i zorunlu calistirmali | `req-safety-reactive-warnings` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #13 | #45, #63 |
| [#22](https://github.com/TurkishKEBAB/Agentic-Ide/issues/22) REQ: Arka planda embedding index guncellensin ve .agentignore ile gizli dosyalar dislansin | `req-context-index-and-ignore` | Faz 1 / P0 | Ready / Draft / Ready | #8 | #19, #58, #74 |
| [#23](https://github.com/TurkishKEBAB/Agentic-Ide/issues/23) REQ: Audit log okuma, retrieval, yazma, onay ve rollback kararlarini kaydetmeli | `req-safety-audit-log` | Faz 2 / P1 | Backlog / Draft / Needs Clarification | #13 | #63, #74, #21 |
| [#24](https://github.com/TurkishKEBAB/Agentic-Ide/issues/24) REQ: Basari, guvenlik, rollback, halusinasyon, gecikme ve guven metrikleri toplanmali | `req-evaluation-metrics` | Faz 3 / P0 | Backlog / Draft / Needs Clarification | #14 | #59, #67 |
| [#25](https://github.com/TurkishKEBAB/Agentic-Ide/issues/25) REQ: Benchmark 20 gorev, ablation tasarimi (A/B/C) ile tanimlanmali | `req-evaluation-benchmark` | Faz 3 / P0 | Backlog / Draft / Needs Clarification | #14 | #59, #54, #24 |
| [#26](https://github.com/TurkishKEBAB/Agentic-Ide/issues/26) REQ: Bir bulut ve bir yerel model saglayicisi ortak adaptor katmaniyla desteklenmeli | `req-model-provider-abstraction` | Faz 2 / P1 | Backlog / Draft / Needs Clarification | #11 | #56, #57, #67 |
| [#27](https://github.com/TurkishKEBAB/Agentic-Ide/issues/27) REQ: Birim testleri diff, workspace boundary, retrieval ve audit modullerini kapsamali | `req-test-unit` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #14 | #72, #63, #58 |
| [#28](https://github.com/TurkishKEBAB/Agentic-Ide/issues/28) REQ: Cok dosyali degisikliklerde secmeli onay desteklenmeli | `req-diff-selective-approval` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #9 | #18, #30, #54 |
| [#29](https://github.com/TurkishKEBAB/Agentic-Ide/issues/29) REQ: Degerlendirme fazi basladiktan sonra yeni ana ozellik alinmamali | `req-thesis-freeze` | Faz 3 / P0 | Backlog / Draft / Needs Clarification | #15 | #61, #25 |
| [#30](https://github.com/TurkishKEBAB/Agentic-Ide/issues/30) REQ: Diff ekrani side-by-side ve unified gorunum sunmali | `req-diff-views` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #9 | #33 |
| [#31](https://github.com/TurkishKEBAB/Agentic-Ide/issues/31) REQ: Dosya uygulama atomik olmali ve son 10 degisiklik geri alinabilmeli | `req-diff-atomic-rollback` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #9 | #28, #58 |
| [#32](https://github.com/TurkishKEBAB/Agentic-Ide/issues/32) REQ: Durum cubugu aktif dosya ve ajan durumunu gostermeli | `req-editor-status-bar` | Faz 1 / P1 | Backlog / Draft / Needs Clarification | #10 | #33 |
| [#33](https://github.com/TurkishKEBAB/Agentic-Ide/issues/33) REQ: Electron + Monaco tabanli editor kabugu kurulmalı | `req-editor-shell` | Faz 1 / P0 | Ready / Draft / Ready | #10 | #55, #57, #72, #73 |
| [#34](https://github.com/TurkishKEBAB/Agentic-Ide/issues/34) REQ: Entegrasyon testleri plan-diff-apply-rollback-safety akislarini dogrulamali | `req-test-integration` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #14 | #27, #18, #28, #31, #21 |
| [#35](https://github.com/TurkishKEBAB/Agentic-Ide/issues/35) REQ: Faz 1, Faz 2 ve Faz 3 cikti kapilari Project icinde izlenmeli | `req-thesis-phase-gates` | Faz 1 / P0 | Ready / Draft / Ready | #15 | #75, #62 |
| [#36](https://github.com/TurkishKEBAB/Agentic-Ide/issues/36) REQ: Final teslimler demo, tez metni, sunum ve savunma paketi olarak takip edilmeli | `req-thesis-final-deliverables` | Faz 3 / P0 | Backlog / Draft / Needs Clarification | #15 | #25, #24, #29 |
| [#37](https://github.com/TurkishKEBAB/Agentic-Ide/issues/37) REQ: Gecikme ve maliyet yerel-bulut ayrimiyla raporlanmali | `req-model-cost-metrics` | Faz 3 / P1 | Backlog / Draft / Needs Clarification | #11 | #26, #24 |
| [#38](https://github.com/TurkishKEBAB/Agentic-Ide/issues/38) REQ: Her kritik adimda kontrol noktalari approve-reject-edit-undo olarak sunulmali | `req-ux-control-points` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #16 | #28, #31 |
| [#39](https://github.com/TurkishKEBAB/Agentic-Ide/issues/39) REQ: Kullanici diff ekraninda neden aciklamasini gorebilmeli | `req-ux-why-explanation` | Faz 2 / P1 | Backlog / Draft / Needs Clarification | #16 | #18, #28 |
| [#40](https://github.com/TurkishKEBAB/Agentic-Ide/issues/40) REQ: Kullanici tetiklemeli sohbet paneli gorev girisi saglamali | `req-agent-chat` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #5 | #33, #56, #67 |
| [#41](https://github.com/TurkishKEBAB/Agentic-Ide/issues/41) REQ: Model secimi kullanici tercihine birakilmali | `req-model-user-selection` | Faz 2 / P1 | Backlog / Draft / Needs Clarification | #11 | #26, #52 |
| [#42](https://github.com/TurkishKEBAB/Agentic-Ide/issues/42) REQ: MVP disi ve kapsam disi kararlar sabitlensin | `req-scope-guardrails` | Faz 1 / P0 | Ready / Draft / Ready | #12 | — |
| [#43](https://github.com/TurkishKEBAB/Agentic-Ide/issues/43) REQ: On-demand retrieval import-export, sembol arama ve benzer parca bulmayi desteklemeli | `req-context-on-demand` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #8 | #22 |
| [#44](https://github.com/TurkishKEBAB/Agentic-Ide/issues/44) REQ: Proje klasoru acma, dosya agaci, dosya ac-kaydet ve 5 sekme desteklensin | `req-editor-file-management` | Faz 1 / P0 | Ready / Draft / Ready | #10 | #33, #58 |
| [#45](https://github.com/TurkishKEBAB/Agentic-Ide/issues/45) REQ: Protected file kurallari gizli anahtar dosyalarinda indeksleme ve yazmayi engellemeli | `req-safety-protected-files` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #13 | #49, #74 |
| [#46](https://github.com/TurkishKEBAB/Agentic-Ide/issues/46) REQ: Reactive safety warnings yalnizca apply oncesi tetiklensin (background analiz MVP disi) | `req-ux-proactive-guards` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #16 | #21 |
| [#47](https://github.com/TurkishKEBAB/Agentic-Ide/issues/47) REQ: Tez basari ve tamamlanma kriterleri olculebilir olsun | `req-completion-criteria` | Faz 1 / P0 | Ready / Draft / Ready | #12 | — |
| [#48](https://github.com/TurkishKEBAB/Agentic-Ide/issues/48) REQ: Uctan uca testler partial approval, safety stop ve gercek kullanici akislarini simule etmeli | `req-test-e2e` | Faz 2 / P1 | Backlog / Draft / Needs Clarification | #14 | #34, #38, #76 |
| [#49](https://github.com/TurkishKEBAB/Agentic-Ide/issues/49) REQ: Workspace boundary + path normalization yalnizca proje dizini icinde calismali | `req-safety-sandbox` | Faz 2 / P0 | Backlog / Draft / Needs Clarification | #13 | #58, #74 |
| [#50](https://github.com/TurkishKEBAB/Agentic-Ide/issues/50) Risk: Bulut maliyeti kritikse local-only fallback plani hazir olmali | `risk-model-local-fallback` | Faz 2 / P1 | Backlog / Draft / Needs Clarification | #11 | #26 |
| [#51](https://github.com/TurkishKEBAB/Agentic-Ide/issues/51) Risk: Kalite veya guvenlik esikleri bozulursa ajan explain-only moda dusurulebilmeli | `risk-safety-readonly-fallback` | Faz 2 / P1 | Backlog / Draft / Needs Clarification | #13 | #21, #17 |
| [#52](https://github.com/TurkishKEBAB/Agentic-Ide/issues/52) REQ: Ilk acilis onboarding ve guvenli konfigurasyon akisi desteklenmeli | `req-editor-onboarding-configuration` | Faz 1 / P0 | Ready / Draft / Ready | #10 | #33, #56, #58, #74, #76 |
| [#53](https://github.com/TurkishKEBAB/Agentic-Ide/issues/53) Epic: Implementation Readiness and Planning Infrastructure | `epic-implementation-readiness` | Faz 1 / P0 | Review / Advisor Review / Ready | — | — |
| [#54](https://github.com/TurkishKEBAB/Agentic-Ide/issues/54) ADR: Approval-gate ablation baseline tasarimi sabitlensin | `adr-approval-gate-ablation-baseline` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | — |
| [#55](https://github.com/TurkishKEBAB/Agentic-Ide/issues/55) ADR: Electron + Monaco editor shell karari sabitlensin | `adr-electron-monaco-shell` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | — |
| [#56](https://github.com/TurkishKEBAB/Agentic-Ide/issues/56) ADR: MVP'de manuel model secimi ve provider siniri sabitlensin | `adr-manual-model-selection` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | — |
| [#57](https://github.com/TurkishKEBAB/Agentic-Ide/issues/57) ADR: Node runtime hedefi ve fallback politikasi sabitlensin | `adr-node-runtime-target` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | — |
| [#58](https://github.com/TurkishKEBAB/Agentic-Ide/issues/58) ADR: Workspace boundary terminolojisi ve no-shell MVP kurali sabitlensin | `adr-workspace-boundary-no-shell` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | — |
| [#59](https://github.com/TurkishKEBAB/Agentic-Ide/issues/59) TASK: Benchmark task template ve evidence matrix hazirlansin | `task-benchmark-template-evidence-matrix` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | #54, #63, #67 |
| [#60](https://github.com/TurkishKEBAB/Agentic-Ide/issues/60) TASK: Dokuman linkleri ve PlantUML diyagramlari CI'da dogrulansin | `task-doc-diagram-validation-ci` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | — |
| [#61](https://github.com/TurkishKEBAB/Agentic-Ide/issues/61) TASK: Faz 1 P0 kartlari advisor review sonrasi Ready kabul edilsin | `task-faz1-p0-ready-review` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | #54, #55, #56, #57, #58, #59, #62, #63, #72, #73, #74, #75 |
| [#62](https://github.com/TurkishKEBAB/Agentic-Ide/issues/62) TASK: Implementation readiness gate ve DoR/DoD tanimlansin | `task-readiness-gate-definition` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | #54, #58, #63, #74 |
| [#63](https://github.com/TurkishKEBAB/Agentic-Ide/issues/63) TASK: Plan, audit event, config ve benchmark task semalari tanimlansin | `task-core-planning-schemas` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | — |
| [#65](https://github.com/TurkishKEBAB/Agentic-Ide/issues/65) Epic: Verification-Driven Development Research Framing | `epic-vdd-research-framing` | Faz 1 / P0 | Review / Advisor Review / Ready | — | — |
| [#66](https://github.com/TurkishKEBAB/Agentic-Ide/issues/66) ADR: Decide VDD Terminology, TDD Stance, and Thesis Slogan | `adr-vdd-terminology-and-stance` | Faz 1 / P0 | Review / Advisor Review / Ready | #65 | — |
| [#67](https://github.com/TurkishKEBAB/Agentic-Ide/issues/67) ADR: Prompt ve model versioning stratejisi sabitlensin | `adr-prompt-model-versioning` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | #56, #63 |
| [#68](https://github.com/TurkishKEBAB/Agentic-Ide/issues/68) Requirement: Separate Implementation and Verification Agent Roles | `req-vdd-independent-verification-agent` | Faz 1 / P0 | Review / Advisor Review / Ready | #65 | — |
| [#69](https://github.com/TurkishKEBAB/Agentic-Ide/issues/69) Requirement: Spiral Requirements Control with Rollback Per Spin | `req-vdd-spiral-requirements-control` | Faz 1 / P0 | Review / Advisor Review / Ready | #65 | — |
| [#70](https://github.com/TurkishKEBAB/Agentic-Ide/issues/70) Requirement: Student and Professional VDD Interaction Modes | `req-vdd-student-professional-modes` | Faz 1 / P1 | Review / Advisor Review / Ready | #65 | — |
| [#71](https://github.com/TurkishKEBAB/Agentic-Ide/issues/71) Spike: Advisor Questions for VDD Scope and Metrics | `spike-vdd-advisor-open-questions` | Faz 1 / P0 | Review / Advisor Review / Ready | #65 | #66, #68, #69, #70 |
| [#72](https://github.com/TurkishKEBAB/Agentic-Ide/issues/72) TASK: Pre-implementation CI and quality gates baseline hazir olsun | `task-devops-quality-gates-baseline` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | #57, #60, #73 |
| [#73](https://github.com/TurkishKEBAB/Agentic-Ide/issues/73) TASK: Reproducible development environment baseline hazir olsun | `task-reproducible-dev-environment` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | #57 |
| [#74](https://github.com/TurkishKEBAB/Agentic-Ide/issues/74) TASK: Threat model, incident response ve data retention baseline hazir olsun | `task-security-threat-incident-retention` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | — |
| [#75](https://github.com/TurkishKEBAB/Agentic-Ide/issues/75) TASK: GitHub Project operations, templates ve label taxonomy hazir olsun | `task-github-project-ops-templates-labels` | Faz 1 / P0 | Review / Advisor Review / Ready | #53 | — |
| [#76](https://github.com/TurkishKEBAB/Agentic-Ide/issues/76) TASK: Accessibility plan quality gate olarak hazir olsun | `task-accessibility-quality-plan` | Faz 1 / P1 | Review / Advisor Review / Ready | #53 | #55, #72 |
| [#88](https://github.com/TurkishKEBAB/Agentic-Ide/issues/88) Epic: MVP Scenario Execution and Demo Coverage | `epic-mvp-scenario-execution` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#89](https://github.com/TurkishKEBAB/Agentic-Ide/issues/89) Scenario: Bug fix flow is executable end-to-end | `scenario-bug-fix-end-to-end` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#90](https://github.com/TurkishKEBAB/Agentic-Ide/issues/90) Scenario: Multi-file refactor flow updates references safely | `scenario-multi-file-refactor` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#91](https://github.com/TurkishKEBAB/Agentic-Ide/issues/91) Scenario: Test writing flow proposes relevant tests with reviewable diff | `scenario-test-writing` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#92](https://github.com/TurkishKEBAB/Agentic-Ide/issues/92) Scenario: Codebase Q&A flow returns source-cited answers | `scenario-codebase-qa` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#93](https://github.com/TurkishKEBAB/Agentic-Ide/issues/93) Scenario: Safe single-file edit flow prevents unintended changes | `scenario-safe-single-file-edit` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#94](https://github.com/TurkishKEBAB/Agentic-Ide/issues/94) Epic: Benchmark Evidence Pipeline | `epic-benchmark-evidence-pipeline` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#95](https://github.com/TurkishKEBAB/Agentic-Ide/issues/95) TASK: Benchmark task count discrepancy resolved and task taxonomy frozen | `task-benchmark-taxonomy-freeze` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#96](https://github.com/TurkishKEBAB/Agentic-Ide/issues/96) TASK: Frozen benchmark test project selected and tagged | `task-benchmark-project-freeze` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#97](https://github.com/TurkishKEBAB/Agentic-Ide/issues/97) TASK: First benchmark task JSON examples validate against schema | `task-benchmark-json-examples` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#98](https://github.com/TurkishKEBAB/Agentic-Ide/issues/98) TASK: Benchmark runner records A/B/C condition evidence | `task-benchmark-condition-runner` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#99](https://github.com/TurkishKEBAB/Agentic-Ide/issues/99) TASK: Rubric, anonymization, and statistical analysis package prepared | `task-benchmark-rubric-analysis` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#100](https://github.com/TurkishKEBAB/Agentic-Ide/issues/100) Epic: Performance and Cost Product Controls | `epic-performance-cost-controls` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#101](https://github.com/TurkishKEBAB/Agentic-Ide/issues/101) REQ: Token usage and model cost dashboard is visible to user | `req-token-cost-dashboard` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#102](https://github.com/TurkishKEBAB/Agentic-Ide/issues/102) REQ: Daily cloud API hard cap prevents budget overrun | `req-cloud-daily-hard-cap` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#103](https://github.com/TurkishKEBAB/Agentic-Ide/issues/103) REQ: Electron and indexing performance budgets are measured before demo | `req-demo-performance-budgets` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#104](https://github.com/TurkishKEBAB/Agentic-Ide/issues/104) Epic: Data Retention and Privacy Product Controls | `epic-data-retention-privacy-controls` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#105](https://github.com/TurkishKEBAB/Agentic-Ide/issues/105) REQ: Clear workspace index and embeddings action is available | `req-clear-workspace-index` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#106](https://github.com/TurkishKEBAB/Agentic-Ide/issues/106) REQ: Provider key removal and audit-log sanitization are supported | `req-provider-key-removal-audit-sanitization` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#107](https://github.com/TurkishKEBAB/Agentic-Ide/issues/107) REQ: Sanitized thesis evidence export excludes secrets and raw proprietary code | `req-sanitized-thesis-evidence-export` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#108](https://github.com/TurkishKEBAB/Agentic-Ide/issues/108) Epic: Final Release and Defense Package | `epic-final-release-defense-package` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#109](https://github.com/TurkishKEBAB/Agentic-Ide/issues/109) TASK: Five-minute defense demo script and fallback video prepared | `task-defense-demo-fallback` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#110](https://github.com/TurkishKEBAB/Agentic-Ide/issues/110) TASK: Installation guide and .env.example prepared for source-code delivery | `task-source-installation-guide` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#111](https://github.com/TurkishKEBAB/Agentic-Ide/issues/111) TASK: Portable build decision and packaging checklist completed | `task-portable-packaging-decision` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#112](https://github.com/TurkishKEBAB/Agentic-Ide/issues/112) TASK: Thesis limitations and future work document prepared | `task-thesis-limitations-future-work` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
| [#113](https://github.com/TurkishKEBAB/Agentic-Ide/issues/113) Spike: Optional pilot user study ethics and consent decision | `spike-pilot-study-ethics-consent` | Alan boş / Alan boş | Backlog / Alan boş / Alan boş | — | — |
