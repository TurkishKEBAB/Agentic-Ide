# Teknoloji ve model sözleşmesi

4 Kasım 2026 teknik baz çizgisi: [IMPLEMENTATION_BASELINE](docs/IMPLEMENTATION_BASELINE.md).
Bu belge seçilmiş mühendislik yönünü anlatır; uygulama, donanım uyumu veya model kalitesi ölçülmüş değildir.

## Seçilmiş yığın

| Bileşen | Seçim | Kilitleme/doğrulama |
|---------|-------|---------------------|
| Geliştirme runtime | Node 24, npm | .nvmrc; scaffold'ta engines/packageManager ve package-lock |
| Masaüstü | Electron + Monaco + TypeScript | Desteklenen sürümler ve native ABI scaffold/demo OS testinde kilitlenir |
| Build/UI | electron-vite, vanilla TS renderer | tsup/esbuild/React ayrı aktif alternatif değildir |
| Veri | Yerel SQLite + ContextStore arkasında sqlite-vec | Extension yükleme/cihaz spike'ı; fallback lexical politika olarak sürümlenir |
| Test | Vitest, security property testleri, Playwright Electron | CI required scripts; runtime delili olmadan passed sonucu yok |
| Kod modeli | Anthropic + loopback Ollama adaptörleri | Immutable ID/digest, parametre ve fiyat manifesti formal freeze'de kaydedilir |
| Embedding | Yerel Ollama embedding capability | Chat ve embedding için local-only ağ kontrolü aynı uygulanır |

Eski Electron 30+/model RAM/context-window tabloları aktif sürüm garantisi değildir ve kaldırılmıştır.
Model etiketi/digest, quantization, cihaz RAM/GPU ve TTFT ölçülür; bir model ailesi adına dayanarak tool reliability
veya performans seviyesi atanmaz. Güncel desteklenen release seçimi scaffold'ın uyumluluk işidir.

## Model seçimi ve privacy

Yeni kurulum local-only'dır. manual-hybrid/cloud-only kullanıcı seçimi ve açık aktarım tercihidir.
Sağlayıcı değişimi yeni run başlatır; yarım stream veya eski provider patch'i yeniden kullanılmaz. Otomatik router,
buluta retry fallback veya bütçe bitince gizli model geçişi yoktur. Remote Ollama URL MVP'de reddedilir.
Anahtarlar main broker'da OS-backed secret store'dan çözülür; config yalnız apiKeyRef tutar.

## Provider ve tool arayüzü

`stream(messages, tools, budget, signal)` normalize chunk/finishReason/usage; `health(signal)` availability/capabilities
üretir. Cancel/timeout/retry/budget ve invalid-tool-output davranışları bütün adaptörlerde aynı kontrat testlerinden geçer.
Token count/pricing bilinmiyorsa maliyet unknown; bulut çağrısı fail-closed olur.

Model read_file/list_files/search_symbols/retrieve/propose_change önerilerini üretir. `write_file` eski adı gerçek
fs write anlamına gelmez. Gerçek apply yalnız broker'ın valid approval/fixture capability kontrolünden geçer.
Shell, generic IPC ve process çalıştırma tool'u yoktur. Structured output desteği olmayan model otomatik apply'e
yükseltilmez; şema doğrulanamıyorsa explain-only sonucuyla durur.

MCP, model sayısını artırma ve ikinci model verifier, mevcut araştırma değişkenlerini genişlettiği için future work'tür;
standartların olgunluğu hakkında kaynaklandırılmamış iddia gerektirmez.

İlgili ADR'ler: [001](docs/adr/ADR-001-electron-monaco-editor-shell.md),
[002](docs/adr/ADR-002-node-runtime-target.md), [003](docs/adr/ADR-003-local-retrieval-storage.md),
[004](docs/adr/ADR-004-manual-model-selection.md), [005](docs/adr/ADR-005-cloud-local-provider-boundary.md),
[010](docs/adr/ADR-010-secret-storage-and-ipc-broker.md).
