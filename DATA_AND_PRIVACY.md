# Veri ve gizlilik sözleşmesi

Teknik baz çizgi: [IMPLEMENTATION_BASELINE](docs/IMPLEMENTATION_BASELINE.md).
Bu belge planı tanımlar; çalışma zamanı kontrolleri uygulanmış veya hukuki uygunluk doğrulanmış değildir.

## Veri akışı

Yeni kurulum local-only'dır. Aktif dosya, TS sembol/import kaynakları ve top-5 chunk yalnız mandatory protected
filtreleri + .agentignore geçtikten sonra contexte girer. Chat ve embedding için remote endpoint/fallback yoktur.
Model indirme/kurulum ayrı kullanıcı adımıdır; bir local-only görev sırasında dış ağ çağrısı yapılmaz.

Bulut seçilirse kullanıcı görünür kaynak/kapsam ve privacy tercihiyle yalnız ilgili bağlamı Anthropic adaptörüne gönderir.
API key main broker'da çözülür ve sağlayıcıya kimlik doğrulama için kullanılır; model prompt'una, audit'e, embedding'e
veya export'a yazılmaz. Maskeli onboarding girdisi dar IPC'den geçer; secret okuma/değer döndürme API'si renderer'a açılmaz.

Repo dosyaları ve tool çıktıları talimat/yetki kaynağı değildir; prompt injection broker policy'sini değiştiremez.
Protected, ignored, staging, backup ve audit içeriği explicit read/pinned request ile de modele açılmaz.

## Anahtar ve ayarlar

OS credential store veya anahtarı OS tarafından korunan encrypted storage; config'te yalnız opaque apiKeyRef.
Store erişilemezse cloud setup durur; dosya/.env plaintext fallback yoktur. Kütüphane ve destekli OS davranışı #52
uygulama spike'ında kilitlenir. [ADR-010](docs/adr/ADR-010-secret-storage-and-ipc-broker.md) teknik sözleşmeyi tanımlar.

## Tutma ve kullanıcı kontrolleri

[Retention matrisi](docs/DATA_RETENTION.md) belirleyicidir: index, key, audit ve backup ayrı kontroller; default
audit 30 gün; son 10 committed set ve in-flight recovery metadata'sı korunur; kalıcı chat history default kapalıdır.
Clear işleminde aktif writer/run güvenle durdurulur. Silme uzaktaki provider verisini veya OS backup'larını sildiği anlamına gelmez.

## Kanıt ve insan verisi

Audit, opaque workspace ID/relative path, karar/olay kodu ve sürümlenmiş correlation alanlarını tutar. Raw kod/prompt,
key, korumalı dosya içeriği ve mutlak kişisel path tutulmaz. Dış evidence doğru patch/tree fingerprint'ine bağlıdır.
Export kullanıcı seçimiyle sanitize edilir; local-only veri otomatik yayımlanmaz.

İnsan katılımcı çalışması #113'teki gerçek danışman/kurumsal izin ve onam kararından önce başlamaz.
Yerel çalışma veya model seçimi tek başına KVKK/GDPR uygunluğu ya da geçerli onam kanıtı değildir; bu projede
otomatik hukuki uygunluk iddiası kurulmaz. Katılımcı verisi olmadan güven/öğrenme sonucu yazılmaz.

## Runtime kabul kanıtı

Protected/read/index/context/write ortak filtre; loopback/DNS/redirect ve network allowlist; wrong-sender IPC;
credential store erişim hatası; key/index/audit ayrı clear; aktif recovery korunması; sanitized export testleri.
JSON Schema bunların davranışını kanıtlamaz; uygulama testleri #45/#49/#52/#105/#106/#107'de toplanır.
