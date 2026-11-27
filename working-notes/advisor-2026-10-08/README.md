# 8 Ekim 2026 ilk danışman toplantısı hazırlığı

İnceleme tarihi: 7 Ekim 2026. Repo planlama aşamasında; uygulama ve deney sonuçları yok.

## Hızlı kullanım

1. [Claude Design promptunu](CLAUDE_DESIGN_PROMPT.md) kopyala. İsim/bölüm alanlarını isteğe göre doldur.
2. [Toplantı gündemindeki](../../ADVISOR_MEETING_AGENDA.md) beş kararı sunumun sonunda açık bırak.
3. [Genel inceleme raporunu](REVIEW_REPORT.md) oku; teknik gerekçeler aşağıdaki alt raporlarda.

Sunum varsayımı 15 dakika; ardından yaklaşık 30 dakika karar tartışması. Gerçek süreye göre sıkıştırılabilir.

## Ayrıntılı inceleme

- [Backlog, milestone ve bütün issue'lar](BACKLOG_REVIEW.md)
- [Mimari, ADR, sözleşme ve güvenlik](ARCHITECTURE_REVIEW.md)
- [Benchmark, istatistik, insan çalışması ve takvim](EVALUATION_REVIEW.md)

## Tamamlanan planlama ekleri

- [Değişiklik yaşam döngüsü sözleşmesi](../../docs/CHANGE_LIFECYCLE_CONTRACT.md)
- [Değerlendirme protokolü](../../docs/EVALUATION_PROTOCOL.md)
- [Requirement → davranış → test → kanıt matrisi](../../docs/REQUIREMENTS_TRACEABILITY.md)
- [Literatür ve iddia sınırları](../../docs/LITERATURE_AND_CLAIMS.md)

İnceleme önerileri, danışman onayı ve çalışan kod kanıtı ayrı tutulur. Protokol veya mimari sözleşmenin yazılmış olması
uygulandığı anlamına gelmez. Milestone tarihleri akademik takvim teyidinden sonra atanacak.

## Kaynak kayıtları

`github-*-snapshot.json` dosyaları inceleme başlangıcındaki canlı GitHub durumunu kaydeder. `github-sync-plan.json`
ve `github-sync-applied.json` planlanan ve uygulanan bounded güncellemeleri kaydeder. Snapshot'lar ilk durumdur;
inceleme sonrasında yapılan güncellemeleri temsil etmez. Son durum `github-verification.json` içinde doğrulanır.
Bu büyük ham kayıtlar toplantı sunumuna konmaz; ana rapor ve kaynak linkleri yeterlidir.
Ham snapshot'lar ve tek-seferlik hazırlık/senkronizasyon araçları yerel çalışma paketinde tutulur;
draft PR'a sunum belgeleri, son doğrulama ve güncelleme özeti eklenir.

Yereldeki önceki kullanıcı değişiklikleri korunmuştur. Hazırlanan draft PR, incelenmiş belge sürümlerini bir araya getirir;
önceki çalışma kopyasında bulunan kapsam netleştirmelerini de korur. `main` dalına birleştirme yapılmaz.
