# Geliştirme pilotu

Beş görev: her kategoriden bir örnek. Bunlar final 20 görevden ayrıdır; advisor-reviewed/frozen benchmark değildir.
Fixture bu proje için özgün yazılmıştır; üçüncü taraf repo veya gerçek kullanıcı verisi içermez. Repo'nun mevcut
lisans durumu geçerlidir. `numbers.ts` bilinçli kusurludur; test dosyası bilinçli boştur.
Bu fixture uygulamanın src/tests lint/typecheck kapsamına dahil edilmez; kendi disposable evaluation ortamında değerlendirilir.

`pilot-*.json` dosyaları task schema'sına göre doğrulanır. `oracle-specification.json` bağımsız rubric/gold beklentisini
belgeler; task schema'sı değildir. Agent'a yalnız `fixtures/pilot` workspace'i açılır; oracle ve pilot task cevapları
retrieval index'ine eklenmez. Referans çözüm ve çalıştırılabilir scoring runner #98'in uygulama işidir.

Bu örneklerle yalnız veri biçimi, izin verilen dosyalar ve kaynak yolları doğrulanmıştır. Typecheck/test çalıştırıldığı,
mutant öldürüldüğü veya modelin görevi başardığı iddia edilmez. Testler IDE dışında disposable kopyada çalışacaktır.

Formal fixture seçimi/tag, dış oracle incelemesi, final görev yazımı ve veri-öncesi freeze #96/#25/#54 altında kalır.
