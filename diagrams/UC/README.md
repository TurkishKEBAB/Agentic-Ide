# Use Case Diyagramları

Bu dizin, Agentic IDE projesi için hazırlanan PlantUML use case diyagramlarını içerir.

## MVP UC'leri (Faz 1–3 kapsamında)

- `UC-01-genel-sistem-gorunumu.puml`: Sistemin ana aktörlerini ve MVP kapsamındaki çekirdek yetenekleri gösterir. (Reactive safety warning include ilişkisi içerir; background proaktif çıkarılmıştır.)
- `UC-02-kod-degisikligi-yasam-dongusu.puml`: Plan → reactive safety check → diff göster → onay al → uygula → rollback akışına odaklanır.
- `UC-03A-reactive-safety-warnings.puml`: **MVP içi.** Plan üretildikten sonra apply öncesi tetiklenen reactive safety uyarıları (workspace boundary violation, protected file write, large edit threshold, secret-in-diff). Background scanning içermez.
- `UC-04-benchmark-ve-degerlendirme.puml`: Tez kapsamındaki benchmark, ablation tasarımı (A / B = approval-gate-disabled / C), metrik toplama ve raporlama akışlarını gösterir.

> Sonraki sürümde eklenecek MVP UC'leri (Dalga 4): UC-05 (Konfigürasyon ve Onboarding), UC-06 (Bulut/Yerel Fallback), UC-07 (Audit Log İnceleme).

## Future Work UC'leri (`future/` klasörü)

Bu use case'ler **MVP DIŞIDIR**, yalnızca tez gelecek çalışma bölümünde referans olarak korunur.

- `future/UC-03B-proactive-background-monitoring.puml`: Background scanning, save-time / idle-time tetikleyiciler, alert queue, debounce, snooze, mute davranışı. (Eski UC-03 dosyasından taşındı.)

## Tasarım kuralları

- Tüm diyagramlar PlantUML formatındadır.
- "Sandbox" terimi kullanılmaz; bunun yerine **workspace boundary**, **path normalization** ve **write boundary** kavramları kullanılır.
- Proaktif (background) ve reactive (apply-öncesi) uyarılar açıkça ayrılır; karıştırılmaz.
- B koşulu Agentic IDE'nin ayrı bir sürümü değil, **approval-gate-disabled experimental flag** ile çalıştırılan aynı sistemdir.

Diyagramlar proje belgelerindeki Product, System, UX, Privacy, Safety ve Proactive Behavior kararlarına göre hazırlanmıştır.
