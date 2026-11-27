# İlk danışman görüşmesi: proje özeti

Görüşme: 5 Kasım 2026. Hazırlık: 4 Kasım 2026. Daha önce danışman görüşmesi yapılmadı; onay kaydı yok.

## Araştırma teklifi

Agentic IDE, öğrenci/junior geliştiricinin AI kod değişikliğini gereksinim → plan → diff → insan kararı →
kontrollü apply → doğrulama kanıtı → rollback hattında inceleyebildiği bir tez prototipidir.
Dar VDD çerçevesi, izlenebilirlik dilini; approval-gate karşılaştırılabilir bileşeni ifade eder. Akademik ad ve
ana hipotez danışman kararı bekler. Mevcut araçlarda benzer kontroller bulunduğu için özellik yokluğu/üstünlük iddiası kurulmaz.

**Ana soru teklifi:** Bu akış, sabit görev/model koşullarında doğruluğu, hatalı değişikliklerin uygulanmasını ve
insan inceleme maliyetini nasıl etkiler? Kullanıcı güveni/öğrenmesi ayrı insan çalışması gerektirir.

## Sabit teknik plan

Electron + Monaco + TypeScript; Windows ilk demo; tek kullanıcı tetiklemeli ajan; manuel bir bulut/bir yerel
sağlayıcı; protected workspace, exact-patch onayı, journal/recovery ve son 10 set rollback. Shell, multi-agent,
arka plan AI başlatma, extension uyumluluğu ve öğrenci/profesyonel ayrı modları MVP dışıdır.

Repo planlama dokümanları ve şemaları içerir; uygulama kodu ve ölçülmüş deney sonucu yoktur.
[Teknik baz çizgi](docs/IMPLEMENTATION_BASELINE.md) S1 güvenli shell/saf policy dilimi için uygulanabilir devri tanımlar.
Native modül/model sürümlerinin cihazda kilitlenmesi ve runtime testleri uygulama işidir.

## Değerlendirme planı

20 görev: 5 tek dosya, 4 refactor, 4 bugfix, 3 test, 4 Q&A. Beş ayrı geliştirme pilotu hazır; final görev/fixture
freeze ve dış oracle incelemesi daha sonra. A/C toplam workflow'u, B/C aynı üretim/safety üzerinde genel insan
gate'ini karşılaştırır. Q&A ve adversarial safety ayrı paydalardadır. Formal protokol veri öncesinde onaylanıp dondurulur.
Sıfır gözlenen ihlal evrensel güvenlik garantisi; düşük rollback oranı tek başına güven kanıtı değildir.

## Görüşmede alınacak beş karar

1. Dar VDD ve ana araştırma sorusu yeterli mi? #20/#66.
2. Single-agent/no-shell ve dar kapsam, verification sorumluluk ayrımıyla uygun mu?
3. 20 görev, B/C yöntemi, bağımsız oracle ve dış puanlayıcı nasıl onaylanacak? #54/#25.
4. İnsan katılımcı çalışması gerekli mi; değilse güven/öğrenme iddiası çıkarılacak mı? #113.
5. Gerçek teslim/savunma tarihi, haftalık kapasite ve ilk iki haftanın kanıtı nedir? #71.

18 ay eski göreli taslaktır; üniversite takvimi veya geçmişte başlamış süre olduğu varsayılmaz.
İlk teslim önerisi güvenli shell + workspace policy testleri + beş pilotun schema kanıtıdır.

Okuma sırası: [toplantı gündemi](ADVISOR_MEETING_AGENDA.md), [uygulama baz çizgisi](docs/IMPLEMENTATION_BASELINE.md),
[değerlendirme protokolü](docs/EVALUATION_PROTOCOL.md), [kaynak/iddia matrisi](docs/LITERATURE_AND_CLAIMS.md).
