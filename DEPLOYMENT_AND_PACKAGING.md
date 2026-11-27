# Kaynak teslimi ve paketleme

4 Kasım 2026 teknik baz çizgisi: **source-first teslim zorunlu, portable paket opsiyonel**.
Henüz package.json yok; aşağıdaki npm komutları scaffold tamamlandığında doğrulanacak sözleşmedir.

## Geliştirme ve temiz kurulum

Node 24 (.nvmrc), Git ve scaffold'ta kilitlenecek npm/package-lock kullanılır. Electron'un gömülü Node/native ABI
uyumu Windows demo cihazında kaydedilir; Node 22 fallback ancak ADR-002 revisit kaydıyla seçilir.

```powershell
git clone https://github.com/TurkishKEBAB/Agentic-Ide.git
cd Agentic-Ide
npm ci
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:security
npm run build
```

Yeni clone'da çalışma kanıtı #110'da üretilir. Model/embedding kurulumu ayrı opsiyonel adımdır; fixture görevleri ve
testler gerçek API anahtarı gerektirmez. Provider key UI üzerinden OS-backed store'a girilir; ürüne ANTHROPIC_API_KEY
veya .env plaintext fallback'i eklenmez. Örnek konfigürasyon yalnız non-secret ayar/apiKeyRef içerir.

## CI ve sürümleme

Gerçek workflow'lar [.github/workflows/ci.yml](.github/workflows/ci.yml),
[governance.yml](.github/workflows/governance.yml), [docs.yml](.github/workflows/docs.yml) ve
[QUALITY_GATES](docs/QUALITY_GATES.md) kaynağıdır. Eski örnek workflow kopyaları aktif pipeline değildir.
package.json bulunduğunda eksik required npm script'i gate'i düşürür; sessiz skip yoktur.

## Savunma teslimi

Zorunlu: source tag, package-lock, temiz kurulum raporu, beş senaryo/dış oracle kanıtı, 5 dakika demo ve fallback
videosu, tez/limitations/protokol export'u. Ölçülmüş sonuç ve ekler gerçek sürüme bağlıdır.

Portable Windows paket yalnız kaynak demo kararlı olduktan sonra üretilir; native modüller, ilk açılış, credential
store erişimi ve cache/backup temizliği tekrar test edilir. Installer, code signing, auto-update ve çok platform
destek garantisi MVP kapsamında değildir. Seçilecek paketleyici opsiyonel uygulama spike'ıdır.

Repo lisansı henüz seçilmedi; source teslimi açık kaynak lisansı verildiği anlamına gelmez.
