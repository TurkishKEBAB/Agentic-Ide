# Use Case Diyagramları

Bu dizin, Agentic IDE projesi için hazırlanan PlantUML use case diyagramlarını içerir.

## MVP UC'leri

- `UC-01-genel-sistem-gorunumu.puml`: Sistemin ana aktörlerini ve MVP kapsamındaki çekirdek yetenekleri gösterir. (Reactive safety check ilişkisi içerir; background proaktif çıkarılmıştır.)
- `UC-02-kod-degisikligi-yasam-dongusu.puml`: Observe/retrieve → plan → diff → reactive safety check → onay al → uygula → rollback akışına odaklanır.
- `UC-03A-reactive-safety-warnings.puml`: **MVP içi.** Plan üretildikten sonra apply öncesi tetiklenen reactive safety uyarıları (workspace boundary violation, protected file write, large edit threshold, secret-in-diff). Background scanning içermez.
- `UC-04-benchmark-ve-degerlendirme.puml`: Tez kapsamındaki benchmark, ablation tasarımı (A / B = approval-gate-disabled / C), metrik toplama ve raporlama akışlarını gösterir.
- `UC-05-konfigurasyon-ve-onboarding.puml`: İlk açılış, workspace seçimi, model/gizlilik tercihi ve güvenli API key saklama akışını gösterir.
- `UC-06-bulut-yerel-model-fallback.puml`: Manuel model seçimi, provider health check ve kullanıcı aracılı yerel fallback akışını gösterir.
- `UC-07-audit-log-inceleme.puml`: Audit geçmişi inceleme, safety kararları, rollback izleri ve anonim metrik raporu akışlarını gösterir.

## Future Work UC'leri (`future/` klasörü)

Bu use case'ler **MVP DIŞIDIR**, yalnızca tez gelecek çalışma bölümünde referans olarak korunur.

- `future/UC-03B-proactive-background-monitoring.puml`: Background scanning, save-time / idle-time tetikleyiciler, alert queue, debounce, snooze, mute davranışı. (Eski UC-03 dosyasından taşındı.)

## Tasarım kuralları

- Tüm diyagramlar PlantUML formatındadır.
- "Sandbox" terimi kullanılmaz; bunun yerine **workspace boundary**, **path normalization** ve **write boundary** kavramları kullanılır.
- Proaktif (background) ve reactive (apply-öncesi) uyarılar açıkça ayrılır; karıştırılmaz.
- B koşulu Agentic IDE'nin ayrı bir sürümü değil, **approval-gate-disabled experimental flag** ile çalıştırılan aynı sistemdir.
- İç guard/detector bileşenleri aktör gibi modellenmez; gerekiyorsa use case içinde kontrol adımı olarak gösterilir.

Diyagramlar proje belgelerindeki Product, System, UX, Privacy, Safety ve Proactive Behavior kararlarına göre hazırlanmıştır.
