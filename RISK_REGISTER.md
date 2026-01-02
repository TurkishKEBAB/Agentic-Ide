# RISK_ANALIZI_VE_ONLEMLER (RISK_REGISTER)

Hocam, projenin önündeki olası engelleri ve bunlara karşı B planlarımı listeledim. Görüşlerinize sunarım.

## Risk 1: Ajanın Hata Yapması
Yapay zeka bazen yanlış kod üretebilir.
- **Önerdiğim Önlem**: Kullanıcı onayı olmadan kod değişmemeli.
- **B Planı**: Eğer AI çok hata yaparsa (kullanıcı bir günde ~10 isteği reddederse ya da AI'ın yazdığı kod üst üste 10 defa çalışmazsa vb.), otonomluğu kısıtlayıp sadece "okuma/cevaplama" moduna çekebiliriz.

## Risk 2: Maliyet (API Ücretleri)
Bulut modelleri pahalı olabilir.
- **Önerdiğim Önlem**: Sadece zor işlerde buluta çıkmak, basit işleri yerel modellerle çözmek.
- **B Planı**: Gerekirse tamamen yerel modele dönüp kaliteden biraz feragat edebiliriz.

## Risk 3: Zamanın Yetmemesi
Her ne kadar 2 yılımız olsa da, takvim kayabilir.
- **Önerdiğim Önlem**: Sİzin **raodpath'inize sıkı sıkı tutunmam**, Trello repo'nuzu sıkıca takip etmem.
- **B Planı**: "Başarılı" değil, "Çalışan"ı (MVP) hedeflemek.

Bu risk tablosuna eklememi istediğiniz başka bir madde var mı?
