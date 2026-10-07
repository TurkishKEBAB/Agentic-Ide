# İlk danışman toplantısı için proje incelemesi

İnceleme: 7 Ekim 2026. Görüşme: 8 Ekim 2026. Proje: Agentic IDE lisans bitirme prototipi.

## Genel değerlendirme

Plan, güvenlik ve izlenebilirlik açısından ayrıntılı; uygulanacak ilk dilim ve sınanacak ana araştırma iddiası
ise fazla sayıda alternatif arasında kalmış. İlk toplantının hedefi 95 kartı tek tek anlatmak değil, araştırma sorusunu,
kapsamı, deney tasarımını ve gerçek teslim takvimini karara bağlamak olmalı.

Repo henüz planlama aşamasında. Electron/Monaco, single-agent, no-shell ve manuel sağlayıcı seçimi repo kararlarıdır;
danışmanın onayı ve çalışan uygulama kanıtı ayrı şeylerdir. 18 ay, %60 başarı veya sıfır ihlal birer plan/hedef olabilir;
ölçülmüş sonuç olarak sunulamaz.

## İncelenen kapsam

- GitHub'daki 95 issue'nun tamamı, 17 epic, Project #8 alanları ve üç milestone.
- Issue body'leri, native parent/dependency ilişkileri ve yorum/karar kanıtı. Başlangıçta yorum sayısı sıfırdı.
- Ürün, sistem, roadmap, VDD, thesis, evaluation, risk, maliyet, privacy, UX ve CI/readiness belgeleri.
- ADR-001–009, plan/config/audit/benchmark/requirements şemaları ve ilgili use-case diyagramları.
- GitHub seed/setup/readiness mantığı, kaynak iddiaları ve güncel resmî ürün/literatür kaynakları.

Yerelde görüşmeden önce var olan değişiklikler korunmuştur. `create-issues.sh` kullanıcıya ait önceki tek-seferlik
script olarak korunmuş ve çalıştırılmamıştır; resmî senkronizasyon yolu canonical seed + PowerShell setup'tır.
Genel setup script'i canlı advisor prose'unu değiştirebildiğinden bu incelemede dar güncellemeler kullanılmıştır.

## En önemli bulgular ve yapılan düzeltmeler

| Öncelik | Bulgu | Bu incelemede tamamlanan | Danışman / uygulama için kalan |
|----------|-------|-------------------------|--------------------------------|
| P0 | VDD ana odak notu ile approval-gate ana odak belgeleri farklı. | K1'de iki seçenek ve dar VDD önerisi açıklandı. | Ana soru ve katkı konumlandırması; sonuç kararı henüz verilmedi. |
| P0 | “Rakiplerde diff/rollback yok”, “literatür yok” ve kaynaklandırılmamış üretkenlik sayıları. | Ürün planı ve supervisor brief düzeltildi; birincil kaynak/iddia matrisi eklendi. | Tam metin okuma ve sistematik yakın çalışma matrisi. |
| P0 | Seed 69, canlı backlog 95: 26 mevcut kart canonical planda yok. | Seed 95'e tamamlandı; yeni issue açılmadı. | İlerleme/evidence gelecekte düzenli güncellenmeli. |
| P0 | 26 kartın yapısal alanları ve native ilişkileri eksik. | 21 parent ve 81 upstream ilişki eklendi; metadata/summary alanları tamamlandı. | Görev sahibi ve gerçek takvim görüşmede atanmalı. |
| P0 | P0/Advisor Review otomatik Ready; Approved otomatik Validated olabiliyordu. | Setup'ın semantiği düzeltildi; canlı yanlış readiness atamaları güncellendi. | Ready için DoR, Validated için gerçek DoD/kanıt incelemesi. |
| P0 | 20/25 görev çelişkisi ve A/B/C'nin “tek değişken garantisi” iddiası. | Canonical dağılım 5/4/4/3/4=20; A/C toplam akış, B/C gate sınırı açıklandı. | Large-edit politikasını eşitleme, görev/model/bütçe ve formal freeze onayı. |
| P0 | Rubrik formal deneyden önce değil, tez yazımından önce hazırlanıyordu. | #99 gereksinimi ve bağımlılığı düzeltildi; protokol eklendi. | Oracle, rater, tekrarlar ve analizin veri öncesi dondurulması. |
| P0 | Reject/rollback ve otomatik benchmark üzerinden güven sonucuna geçiliyordu. | Uygulanabilir metrikler/payda ve insan çalışması sınırı yazıldı. | Pilot kararı; gerekliyse kurumun izin/onam süreci. |
| P0 | Tek dosya rename'i çok dosya atomikliği gibi anlatılıyordu; stale onay/recovery boştu. | Patch/base'e bağlı onay, dirty-buffer, journal/recovery ve rollback çakışma sözleşmesi eklendi; #31 güçlendirildi. | Sürüm kontrollü schema genişletmesi ve crash/conflict testleri. |
| P0 | Verifier ayrı model olunca bağımsız doğrulayıcı varsayılıyordu. | #68'de yetki/oracle sınırları ve single-agent uyumu düzeltildi. | Verifier MVP rolü mü, future work mü; ayrı ablation gerekip gerekmediği. |
| P0 | API anahtarı raw config'te “güvenli” saklama; local endpoint ve ignore ayarı daraltılabiliyordu. | Privacy/retention/UC belgeleri, proposed ADR-010 ve config schema hizalandı; #52/#106 güçlendirildi. | OS-backed storage, IPC sender ve runtime ağ/gizlilik testleri. |
| P1 | Audit örneği schema'yla uyumsuz; OWASP kodları hatalı. | Audit örneği ve OWASP eşleştirmesi düzeltildi; uygulama kanıtı beklediği belirtildi. | Gerçek runtime audit doğrulaması. |
| P1 | Audit-log clear kontrolü epic'te vaat edilip child işte yoktu. | #106'ya ayrı log-clear, onay/retention/recovery davranışı eklendi. | UI ve silme/aktif transaction testleri. |
| P1 | Beş teknik faz ile üç milestone farklı; tarihler ve kapasite belirsiz. | Crosswalk, milestone çıkış kapıları ve K5 karar alanı eklendi. | Başlangıç/teslim tarihleri, haftalık saat ve danışman görüşme sıklığı. |

## Canlı GitHub sonucu

[Project #8](https://github.com/users/TurkishKEBAB/projects/8) ve
[repo](https://github.com/TurkishKEBAB/Agentic-Ide) üzerinde doğrulanan son durum:

- 95 issue = 95 canonical seed kaydı = 95 Project item.
- Native parent ilişkileri: **57 → 78**. Native upstream dependencies: **112 → 193**.
- 12 mevcut issue'ya önceki metni koruyan düzeltme/kabul ölçütü eki yazıldı:
  #20, #25, #31, #52, #54, #66, #68, #71, #95, #99, #106, #113.
- 689 Project field değeri güncellendi; yeni kartların structured alanları, bağlantı özetleri ve yanlış readiness
  durumları düzeltildi. Bu sayı tamamlanan iş sayısı değildir.
- Üç milestone'un çıkış kapısı açıklaması tamamlandı. Dağılım **36 / 39 / 20 açık issue** olarak kaldı.
- Hiçbir issue kapatılmadı, advisor approval işaretlenmedi ve yorum/mesaj gönderilmedi.
- Milestone due date ve Target Date değerleri akademik takvim teyidi bekler; rastgele tarih atanmadı.

Son durum kontrolü: [github-verification.json](github-verification.json). Ham başlangıç snapshot'ları tarihsel
kanıttır; bu sayılarla karıştırılmamalıdır. Özellikle BACKLOG_REVIEW tablosu inceleme öncesini kaydeder.

## Görüşmede anlatmanı önerdiğim sıra

**Açılış cümlesi:** “Hocam, çok dosyalı AI kod değişikliklerinde doğrulama ve insan kararını izlenebilir bir prototipte
incelemek istiyorum. Bugün özellikle araştırma sorusunu, minimum kapsamı ve bunu nasıl ölçeceğimizi netleştirmek istiyorum.”

Önce problem ve katkı adayını anlat. Ardından VDD/approval-gate kararını açıkça göster. Kısa bir süreç ve mimari
diyagramından sonra A/B/C'nin hangi soruyu yanıtladığını anlat. Sonunda beş karar kartını aç ve notları doldur.
GitHub backlog'unun tamamı ve ayrıntılı teknoloji seçenekleri soru gelirse kullanılacak ek malzeme olsun.

1. **K1 — Odak:** VDD dar proje çerçevesi mi, approval-gate ana araştırma değişkeni mi? Verifier ayrı soru olacak mı?
2. **K2 — Kapsam:** Öğrenci/junior hedefi; single-agent, no-shell MVP ve ilk uçtan uca senaryo onaylanıyor mu?
3. **K3 — Yöntem:** 20 görev, A/C workflow ve B/C gate tasarımı, bağımsız oracle, formal freeze ve dış rater yeterli mi?
4. **K4 — İnsan çalışması:** Pilot gerekli mi? Yapılmazsa güven/öğrenme iddiasını çıkarmak uygun mu?
5. **K5 — Takvim:** Gerçek teslim/savunma tarihi, haftalık kapasite, milestone kapıları ve iki haftalık ilk çıktı nedir?

Kararın çıktısı “genel olarak güzel” yorumu değil; seçilen kapsam, gerekçe, sorumlu, teslim tarihi ve bir sonraki
görüşmede gösterilecek somut kanıt olmalı. Onay kaydı görüşme sırasında doldurulur.

## İki haftalık öneri

İlk hedef: çalışan Electron/Monaco shell, workspace seçimi, tek dosya görüntüleme; workspace/protected-file negatif
testleri ve CI; kapasite uygunsa beş schema-valid pilot benchmark örneği. Agent, embedding, çok dosyalı transaction,
verifier ve bütün deney runner'ını aynı iki haftaya taahhüt etme.

Dosya erişiminin ilk diliminden itibaren güvenlik zemini kurulmalı. İlk model entegrasyonu read-only olabilir.
Gerçek write, onay/policy/recovery testleri hazır olmadan açılmaz. Başarısız veya olumsuz bulgular tezde raporlanabilir;
tezin tamamlanma koşulu tüm hipotezlerin olumlu çıkması değildir.

## Sunum ve kaynak paketi

[Claude Design promptu](CLAUDE_DESIGN_PROMPT.md) 12 ana + 2 ek slayt, konuşmacı notları, görsel yön ve
uydurulmaması gereken sonuçları içerir. [Toplantı gündemi](../../ADVISOR_MEETING_AGENDA.md) görüşmede doldurulacak
karar kaydını sağlar. Ayrıntılar:

- [Mimari inceleme](ARCHITECTURE_REVIEW.md)
- [Değerlendirme incelemesi](EVALUATION_REVIEW.md)
- [Backlog incelemesi](BACKLOG_REVIEW.md)
- [Literatür ve iddia sınırları](../../docs/LITERATURE_AND_CLAIMS.md)
- [Secret/config doğrulama kaydı](CONFIG_SCHEMA_VALIDATION.md)

Bu paket ilk toplantı hazırlığını ve planlama eksiklerini tamamlar. Uygulama geliştirme, danışman kararları, gerçek
benchmark görev seti ve deney koşuları daha sonra kanıt üretilecek işlerdir; bu inceleme onları tamamlandı saymaz.
