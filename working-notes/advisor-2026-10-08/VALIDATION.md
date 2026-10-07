# İnceleme doğrulama kaydı

Tarih: 7 Ekim 2026. Uygulama bulunmadığından runtime benchmark veya app testi çalıştırılmadı.

| Kontrol | Sonuç |
|---------|-------|
| Markdown yerel linkler | İlk kontrol 73, son yayın paketi 74 dosya; geçti. |
| PlantUML yapı kontrolü | 8 dosya; geçti. |
| Repository governance / workflow guardrails | Geçti. |
| Requirements setup dry-run | 19 custom field, 20 label, 95 issue; geçti. |
| Requirements Draft 2020-12 JSON Schema | Geçti; tüm 95 kayıt. |
| Seed dependency DAG | Döngü bulunmadı. |
| PowerShell AST ve readiness/workflow örnekleri | Geçti. |
| Config JSON Schema | 29 kabul/ret örneği geçti; [ayrıntılı kayıt](CONFIG_SCHEMA_VALIDATION.md). |
| Audit örneği JSON Schema / date-time | Geçti. |
| Türkçe metin encoding | Agenda ve backlog'da gerçek Türkçe codepoint'ler doğrulandı; lossy `?` sözcükleri düzeltildi. |
| Git diff whitespace kontrolü | Geçti. |
| Canlı GitHub seed/Project/native ilişkiler | 95/95/95 kayıt, 78 parent, 193 dependency; field/ilişki uyuşmazlığı yok. |

Canlı GitHub kontrolü [github-verification.json](github-verification.json) dosyasındadır. İlk snapshot ile son durum
ayrı kaydedilmiştir. 12 issue body eki, 3 milestone açıklaması, 21 parent, 81 dependency ve 689 field güncellemesi
uygulandı; yeni issue oluşturulmadı, hiçbir issue kapatılmadı, yorum gönderilmedi.

Bu kontroller plan belgelerinin/schema'nın tutarlılığını ve GitHub ilişkilerini doğrular. Secret storage, local-only ağ,
Electron IPC, retrieval, onay, transaction/recovery ve rollback davranışlarının çalıştığına ilişkin runtime kanıt değildir.
