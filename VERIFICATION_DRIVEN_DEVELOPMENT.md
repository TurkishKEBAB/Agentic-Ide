# Verification-Driven Development: sınırlandırılmış tez çerçevesi

4 Kasım 2026 akademik teklif; ilk danışman görüşmesi 5 Kasım. Akademik isim/ana hipotez onaylanmadı.
Teknik uygulama kapsamı [IMPLEMENTATION_BASELINE](docs/IMPLEMENTATION_BASELINE.md) ile sabittir.
Geniş metodoloji, eğitim ve multi-verifier alternatifleri [tarihsel arşivdedir](working-notes/planning-2026-11-04/ARCHIVE_VDD_ALTERNATIVES.md).

## Bu projede VDD

Gereksinim/acceptance criterion ve sürüm → plan → kesin patch → bağımsız kanıt → insan kararı → artifact/rollback
izini birlikte tutan proje-özel tasarım çerçevesi teklifidir. Agentic IDE bunun ölçüm prototipi; approval-gate
karşılaştırılacak bileşendir. Bu ad tek başına yeni bir metodoloji veya TDD'ye üstünlük kanıtı değildir.

TDD veya generated testler reddedilmez. Aynı modelin hem kod hem test üretmesi bağımsız kabul oracle'ının yerini
tutmaz; önceden hazırlanmış gereksinim, regresyon, fault variant ve dış review kanıtları ayrıca gerekir.
İnsan onayı da kod doğruluğunu tek başına kanıtlamaz. Literatür bağlantıları [iddia denetimindedir](docs/LITERATURE_AND_CLAIMS.md).

## Karar ve verification sorumluluğu

| Rol | Yetki | Kanıt sınırı |
|-----|-------|--------------|
| İnsan | İstek/kapsam ve kesin diff kararı | Kullanıcı güvenini ölçtüğümüz anlamına gelmez. |
| Tek implementation loop | Kaynak okuma/retrieval ve plan/patch önerisi | Doğrudan fs/shell veya policy değiştirme yok. |
| Deterministik broker | Policy, staged patch, approval, journal ve recovery | Guard pass, işlevsel başarı oracle'ı değildir. |
| Dış harness/rater | Önceden tanımlı kabul/regresyon/rubrik | Kanıt exact patch/tree ve sürüme bağlanır; stale/not-run geçmez. |

Ayrı model verifier ve öğrenci/profesyonel ürün modları MVP'de yoktur. Requirement değişirse revision/evidence
izi korunur; ayrı spiral ürün modu veya sınırsız AI yeniden-deneme akışı eklenmez. İkinci verifier araştırması
istenirse kendi ablation, bütçe, kapsam ve korelasyon sınırlılığı gerekir.

## Ölçülecek teklif

Kontrollü 20 görevde doğruluk, hatalı apply, review maliyeti ve izlenebilirlik. A/C workflow; B/C aynı üretim ve
safety üzerinde genel insan gate'i. Beş geliştirme pilotu ve adversarial paket ayrı. Formal protocol ve veri
freeze gerçek danışman kararı bekler. Teknik benchmark tek başına güven/öğrenme/üretkenlik artışı kanıtı üretmez.

İzlenebilirlik bağlantısının varlığı ve doğruluğu ayrı ölçülür; audit dosyası imzasız yerel metinse kurcalamaya
dayanıklı adli kanıt diye adlandırılmaz. Gereksinimden kanıta doğruluk yanlış/desteksiz kayıtlarla sağlanmış sayılmaz.

## Görüşmede açık kalacak karar

#20/#66: dar VDD çerçevesi ve birincil soru; #54/#25: yöntem/oracle/freeze; #113: insan çalışması gerekliliği;
#71: resmî takvim ve kapasite. Bunlar Recorded/Approved yapılmadı. S1 güvenli teknik temel bunların sonuçlanmasını
beklemez; formal araştırma ve insan verisi bekler. [Toplantı gündemi](ADVISOR_MEETING_AGENDA.md) karar kaydını içerir.
