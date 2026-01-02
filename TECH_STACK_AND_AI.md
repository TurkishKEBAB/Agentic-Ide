# TEKNOLOJI_VE_YZ_ONERISI (TECH_STACK_AND_AI)

Hocam, teknik tarafta kullanmayı planladığım araçları ve yapay zeka stratejisini aşağıda özetledim. Onayınıza sunarım.

## 1. Dil ve Platform Önerisi
**TypeScript ve Electron** ikilisini öneriyorum.
- **Gerekçem**: İki yıl uzun bir süre gibi görünse de, ajanın zekasına odaklanmak istiyorsak arayüzle çok vakit kaybetmemeliyiz. TypeScript ile hızlıca prototip çıkarıp, asıl işimiz olan "Zeki Ajan" kısmına odaklanabiliriz. Evet doğrusunu demek gerekirse TypeScript ve Electron ikilisini daha önce hiç öğrenmedim, ama bu projeyi klasikleşmiş High Level language'lar ile yapılabileceği konusunda şüphelerim var. Siz ne düşünüyorsunuz

## 2. Ajan Döngüsü Tasarımı
Ajanın çalışma mantığını şöyle kurgulamayı düşünüyorum:
1. **Gözlemle**: Editördeki hatayı veya isteği anla.
2. **Plan Sun**: Kullanıcıya "Şunu yapmayı öneriyorum" de.
3. **Onay Al**: Kullanıcı "Tamam" demeden işlem yapma.
4. **Uygula ve Test Et**: Değişikliği yap ve terminalde test et.

Bu döngü sizce de makul müdür?

## 3. Hibrit Model Stratejisi
Maliyetleri düşürmek için şöyle bir yapı kurmayı planlıyorum:
- Basit işleri öğrencinin bilgisayarındaki modeller (Llama vb.) yapsın (Bedava).
- Zor işleri (Planlama) bulut modelleri (GPT-5.2/ ve favori AI'ım Claude) yapsın (Ücretli ama bence mükemmel derecede çalışıyor ve ben buna bütçe ayırabilirim hocam).

