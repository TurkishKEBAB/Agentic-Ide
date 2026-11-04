# Yerel veri yaşam döngüsü

4 Kasım 2026 teknik kontratı; runtime enforcement uygulanmadı. Aktif kaynak:
[IMPLEMENTATION_BASELINE](IMPLEMENTATION_BASELINE.md), [ADR-010](adr/ADR-010-secret-storage-and-ipc-broker.md).

| Veri | Yer | Tutma | Silme/koruma davranışı |
|------|-----|-------|-----------------------|
| Index/embedding/cache | Main broker'ın opaque workspace-ID uygulama dizini | Kullanıcı temizleyene veya workspace kaldırılana kadar | Aktif index işi iptal edilir; DB kapanır; ilgili index/vector/cache silinir; agent yeniden indekslemeyi otomatik başlatmaz. |
| Audit | Yerel uygulama verisi | Default 30 gün; kullanıcı kısaltabilir/temizleyebilir | Aktif recovery ve retained son 10 setin zorunlu metadata'sı çözülene kadar korunur. |
| Committed backup | Agent context'inden dışlanan broker deposu | Son 10 committed değişiklik seti | Daha eski snapshot yalnız aktif recovery referansı yoksa temizlenir. |
| In-flight journal/staging | Broker deposu; stage aynı filesystem'de geçici korumalı konum | Recovery tamamlanana kadar | Clear/audit retention tarafından sessiz silinemez; yeni write çözümden önce bloklanır. |
| API key | OS credential/OS-backed encrypted store | Provider kaldırılana kadar | Secret ve config referansı silinir, bellekten erişim bırakılır; plaintext fallback yoktur. |
| Chat | Oturum belleği | Kalıcı history default kapalı | Run/oturum sonu bırakılır; opt-in history eklenirse ayrı veri kararı gerekir. |
| Thesis export | Kullanıcının seçtiği sanitized export | Akademik teslim ihtiyacına göre kullanıcı kontrolü | Raw key/kod/kimlik yok; insan verisi retention kararı #113'e bağlıdır. |

Index, audit, key ve backup temizleme **ayrı** kontrollerdir. Kullanıcıya hangi verinin silineceği ve evidence kaybı
anlatılır. Aktif transaction/recovery varken geri dönüşsüz clear kabul edilmez; güvenli sonuç veya açık recovery-required
gerekir. Kullanıcı workspace dosyaları veri temizleme adıyla silinmez. Staging dizinleri her read/index/provider yolunda
mandatory exclusions içindedir; hedef dışı app state yazması broker'ın kendi sabit capability'sidir.

Silme, yerel mantıksal silmedir; SSD/OS backup'tan adli silme veya uzaktaki sağlayıcı verisini kaldırma garantisi değildir.
Testler ayrı clear eylemlerini, korunan recovery kayıtlarını, credential/log redaction'ını ve export temizliğini gözlemlemelidir.
