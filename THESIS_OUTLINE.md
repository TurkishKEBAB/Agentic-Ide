# TEZ_TASLAGI (THESIS_OUTLINE)

Ahmet hocam, tezi şu ana başlıklar altında toplamayı planlıyorum. Sizin görüşlerinizle şekillendirebiliriz:

## Bölüm 1: Giriş
- **Problem Ne?**: Geliştiriciler kod yazarken sürekli bağlam değiştiriyor, yapay zeka araçları (ChatGPT vb.) editörden kopuk çalışıyor.
- **Çözümümüz**: Editörün içine gömülü, projeyi tanıyan ve kendi kendine iş yapabilen (autonomous) bir ajan.

## Bölüm 2: Literatür ve Arka Plan
- Mevcut IDE'ler nasıl çalışıyor?
- SLM - LLM (Büyük Dil Modelleri) ve Ajanlar nedir?
- RAG (Retrieval-Augmented Generation) nedir, neden kod için önemlidir?

## Bölüm 3: Tasarım ve Mimari
- **Neden Electron?**: VS Code benzeri bir deneyim için en mantıklı yol. Önerilerinizi merakla bekliyorum.
- **Ajan Döngüsü**: Gör -> Planla -> Uygula -> Kontrol Et döngüsünü nasıl kurduk?

## Bölüm 4: Uygulama (Implementation)
- Kullandığımız teknolojiler (TypeScript, Monaco Editor).
- Güvenlik önlemleri (Kullanıcı onayı olmadan rm -rf çalıştıramamak vb.).

## Bölüm 5: Değerlendirme ve Deneyler
- **Başarı Kriteri**: Ajan, verilen 10 görevden kaçını insan müdahalesi olmadan bitirebildi?
- **Performans**: Editör ne kadar hızlı açılıyor, cevaplar ne kadar sürede geliyor?

## Bölüm 6: Sonuç ve Gelecek Çalışmalar
- Neleri başardık, neleri yetiştiremedik veya daha iyi yapılabilir?

## Ekler
- Kullandığımız prompt şablonları.
- Deney sonuçlarının detaylı tabloları.
