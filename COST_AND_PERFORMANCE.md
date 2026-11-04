# Maliyet ve performans sözleşmesi

Aktif kapsam: [uygulama baz çizgisi](docs/IMPLEMENTATION_BASELINE.md). Hedefler henüz ölçülmüş sonuç değildir.

## Kaynak bütçeleri

- Açılış ≤5 saniye; ~100 dosyalı fixture ilk indeks ≤30 saniye hedefi. OS, cihaz, warm/cold durum ve sürümler kaydedilir.
- Bir run/workspace; renderer ağır indeksleme yapmaz. Cancel ve streaming UI'ı kilitlemez.
- İlk context politikası top-5 / 8.000 input token; provider'ın gerçek limiti ayrıca kontrol edilir.
- Üretim run bütçesi en fazla 8 tur / 120 saniye; en fazla 2 transient retry. Deney bütçesi protokolde farklı ise açık kaydedilir.

## Cloud kullanım tavanı

Cloud başlangıçta kapalıdır. Kullanıcı açık günlük bütçe belirler; adaptör sürümlü fiyat/token manifestiyle en kötü
izin verilen token rezervasyonu yapar, gerçek usage ile uzlaştırır. Fiyat/usage bilinmiyorsa unknown, yeni çağrı yok.
Cancel/retry ve varsa cache ücretleri ledger'a dahildir. Kullanıcıya tahminin sağlayıcı faturası garantisi olmadığı
açık gösterilir. Bütçe bitince yeni model/provider otomatik seçilmez.

Bu doküman değişken API fiyatı veya toplam tez bütçesi uydurmaz. Formal model seçilirken sağlayıcının güncel birincil
fiyatı ve tarih/hash kaydı manifestte tutulur; pilot maliyeti ölçülerek tekrar sayısı veri öncesinde dondurulur.

## Raporlama

TTFT, toplam model süresi, insan review süresi, toplam görev süresi, input/output/cache token ve estimated cost ayrı
alanlardır. Başarısız/timeout koşuları silinmez. Yerel model için cihaz/RAM/quantization/digest yazılır; API fiyatı yok
diye latency/enerji maliyeti sıfır varsayılmaz. Retrieval token tasarrufu mevcut A/B/C'den tek başına çıkarılmaz;
ayrı eşlenik bağlam ablation'ı ve görev doğruluğu birlikte gerekir.

Ongoing işler: #37 usage/latency kaydı, #101 görünür özet, #102 güvenli kullanım tavanı, #103 demo cihazı ölçümleri.
