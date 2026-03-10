# ACIMASIZ TEKNIK ELESTIRI (CRITICAL_ANALYSIS)

> **Rol:** Kıdemli AI ürün mimarı, developer tools uzmanı ve acımasız teknik eleştirmen.
> **Amaç:** Bu fikrin güçlü ve zayıf yanlarını, kör noktaları ve gerçekçi MVP kapsamını ortaya koymak.
> **Not:** Bu analiz projeyi engellemek için değil, onu kurtarmak için yazılmıştır.

---

## 1. Fikrin Güçlü Tarafları

Eleştiriye başlamadan önce gerçekten değerli olan kısımları teslim etmek gerekir:

- **Doğru problem tespiti.** Geliştiricilerin AI araçlarıyla bağlam kesintisi yaşaması gerçek bir acı noktasıdır. Bu problemi editörün içinde çözmek akıllıca bir yöndür.
- **"Human-in-the-loop" önceliği.** Onaysız değişiklik yapılmaması kararı doğrudur ve birçok rekabetçi araçta hâlâ eksik olan bir olgunluktur.
- **Diff önizleme + geri alma.** Bu iki özellik güven inşa etmek için zorunludur ve doğru tespit edilmiştir.
- **Hibrit model stratejisi.** Basit görevler için yerel model, karmaşık görevler için bulut modeli mantığı hem maliyet hem de gizlilik açısından sağlıklı bir yaklaşımdır.
- **Akademik katkı potansiyeli.** "Proaktif ajan döngüsü + güvenli dosya değişikliği" kombinasyonu için ölçülebilir bir değerlendirme çerçevesi kurulabilirse, bu gerçek bir akademik katkıya dönüşebilir.

---

## 2. En Kritik 10 Risk

### Risk 1 — Kapsam, 1.5 Yılı Çoktan Aştı

Mevcut belgeler 2 yıllık (4 dönemlik) bir plan içermektedir. Problem tanımı ise 1.5 yıldan söz etmektedir. Listede şunlar var: tam editör UI'sı, terminal entegrasyonu, RAG sistemi, multi-agent mimarisi, 5 farklı model sağlayıcısı, güvenlik duvarları, CI/CD, paketleme. Bu liste, deneyimli bir 3 kişilik startup ekibinin 2 yılda tamamlayabileceği bir kapsamdır. Tek kişilik bir bitirme projesi için bu, tamamlanmama riskidir — başarısızlık değil, yetişememe.

### Risk 2 — "Copilot'ın Yaptığı Her Şeyi Yapsın" Hedefi Ölümcül Derecede Belirsiz

GitHub Copilot, JetBrains AI, Cursor ve Windsurf'ün arkasında yüzlerce mühendis ve milyonlarca dolarlık altyapı bulunmaktadır. Bu araçlarla "feature parité" hedefi, ölçülemeyen ve sürekli kaçan bir çıta oluşturur. Hedef "Copilot gibi" değil, "şu spesifik problemi şu ölçülebilir metrikle çöz" olmalıdır. Aksi takdirde tez savunmasında "Neden Cursor'dan iyi?" sorusuna cevap verilemez.

### Risk 3 — Proaktif (İstenmeden) Yorum Yapan Ajan Kullanıcıyı Terk Ettirir

Belgeler, ajana "kullanıcı prompt yazmasa bile otomatik analiz" yapma özelliği kazandırmayı planlamaktadır. Bu, araştırma literatüründe "alert fatigue" (uyarı yorgunluğu) olarak bilinen bir UX tuzağıdır. Yazılımcı bir akışa girdiğinde — "flow state" — her kesinti maliyetlidir. Ajan her dosya açıldığında veya her tuşa basıldığında yorum yaparsa, kullanıcı birkaç saat içinde ya bu özelliği kapatır ya da uygulamayı siler. Windows'un Clippy asistanı bu hatanın en ikonik örneğidir. Çözüm: Proaktif yorumlar yalnızca yüksek güven + yüksek risk kesişiminde tetiklenmelidir.

### Risk 4 — Tüm Repo Context Yaklaşımı Hem Yanlış Hem Verimsiz

"Tüm repo context olarak kullanılmak isteniyor" ifadesi teknik açıdan ciddi sorunlar doğurur. 100.000 satırlık bir projede tüm bağlamı modele göndermek: (a) context window'u aşar, (b) token maliyetini aşırı artırır, (c) sinyal-gürültü oranını bozar ve modelin dikkatini dağıtır. Modern yaklaşım tüm repoyu göndermek değil, **ihtiyaç duyulan bağlamı akıllıca retrieve etmektir** (RAG, AST tabanlı sembole erişim, embedding search). Tüm repo context bir araştırma hipotezi olarak savunulabilir, ancak bunu "default yaklaşım" olarak almak hem pahalı hem de teknik açıdan zayıftır.

### Risk 5 — Multi-Agent Mimari Bu Aşamada Gereksiz Karmaşıklıktır

Belgeler multi-agent mimariden söz etmektedir. Peki hangi ajan neyi yapar? Aralarındaki iletişim nasıl koordine edilir? Bir ajan başarısız olursa sistem nasıl davranır? Bu soruların yanıtları mevcut belgelerde yoktur. Single-agent, iyi tasarlanmış bir döngüyle (Gözlemle → Planla → Onay Al → Uygula) demoyu çok daha erken teslim edebilir. Multi-agent mimari, single-agent'ın başarısız olduğunu kanıtladıktan sonra gündeme gelmelidir; başlangıç mimarisinde değil.

### Risk 6 — Güvenlik Modeli Yüzeyseldir

`rm -rf` yasaklamak bir güvenlik modeli değildir; bir yakalama listesidir. Gerçek tehlikeler şunlardır: (a) ajana verilen file system izni — hangi dizinler yazılabilir? (b) ajan tarafından çalıştırılan kod terminale shell injection açıklığı yaratabilir, (c) kullanıcı onayı alındıktan sonra yapılan değişikliklerin audit logu tutulmazsa ne olur? (d) API anahtarları `.env` dosyalarında açıkça bırakılırsa ajan bunları loglara mı yazar? Güvenlik modeli, yasaklı komut listesinden değil, **en küçük yetki ilkesinden (principle of least privilege)** başlamalıdır.

### Risk 7 — Kullanıcı Bu Ürünü Sevmeyebilir: Güven Açığı

Bir IDE kullanıcısı araçlarına güvenir; terapistin odasındaki yazı tahtasını okuyan birine değil. Ajan proaktif olarak "Bu kodda risk var" dediğinde kullanıcının aklında ilk soru şudur: "Bu yapay zeka kaç kez yanlış söyledi?" Eğer false positive oranı yüksekse güven hızla erir. Eğer kullanıcıya sürekli onay sorulursa bu da başka bir sürtüşme noktasıdır. Güven; hız, doğruluk ve sessizlik dengesine bağlıdır — bu denge kurulmadan ürün sevilmez.

### Risk 8 — Demo Etkileyici, Gerçek Kullanım Hayal Kırıklığı Yaratır

Demo için "Buton rengini değiştir" gibi küçük ve iyi tanımlanmış görevler seçilecektir. Gerçek kullanımda ise kullanıcılar belirsiz, bağlam ağır, çok dosyalı ve legacy kodla dolu görevler getirir. Ajan bu görevlerde: (a) yanlış dosyayı düzenleyebilir, (b) mevcut kodun mantığını anlayamayabilir, (c) derlenmeyen kod üretebilir. "Demo success rate ≠ real-world success rate" farkı, ölçüm metodolojisi kurulmadan kapatılamaz. %60 başarı hedefi, gerçek kullanım senaryolarıyla ölçülmezse tez savunmasında saldırıya açıktır.

### Risk 9 — TypeScript + Electron'u Bilmeden Başlamak Ciddi Zaman Kaybıdır

Belgeler, TypeScript ve Electron'un daha önce kullanılmadığını açıkça belirtmektedir. Bunları öğrenirken aynı zamanda bir IDE mimarisi inşa etmeye çalışmak, öğrenme borcu (learning debt) ile teknik borcun (technical debt) aynı anda biriktirilmesi anlamına gelir. İlk 3 ay yalnızca öğrenmeye, sonraki 3 ay temel altyapıya harcansa, geriye kalan 9 ay asıl hedefe (ajan zekası) kalır — bu çok kısıdır.

### Risk 10 — Başarı Kriterleri Akademik Saldırıya Karşı Savunmasızdır

"10 görevden kaçını yapabildi?" sorusu iyi bir başlangıçtır, ancak eksiktir. Kim bu görevleri seçti? Görevler ne kadar temsili? Karşılaştırma noktası (baseline) nedir — bir insan mı, Copilot mu, yoksa hiç araç kullanmamak mı? Değerlendirme kör (blind) bir şekilde mi yapıldı? Bu soruların yanıtsız kalması, tez jürisinin "Başarı kriterlerinizi kendiniz belirlediniz, onları da siz geçtiniz" argümanını güçlendirir.

---

## 3. Muhtemel Kör Noktalar

- **Kendi kullanımını referans almak:** Projenin tek kullanıcısı geliştirici olursa, UX sorunları görünmez hale gelir. Gerçek kullanıcı testleri olmadan "kullanıcı dostu" iddiası savunulamaz.
- **Model kalitesini sabit varsaymak:** Bugün çalışan bir prompt, 6 ay sonra model güncellemesiyle bozulabilir. Prompt şablonlarının model versiyonuna bağımlılığı ele alınmamıştır.
- **Editör hızını küçümsemek:** "VS Code'a yakın performans" hedefi, Electron'un bellek kullanımı göz önüne alındığında ciddi mühendislik çabası gerektirir. Bu satır belgede bir cümleyle geçiştirilmiştir.
- **İnternet bağlantısı varsayımı:** Hibrit model stratejisi bağlantı gerektiren senaryolara dayanmaktadır. Yerel model kalitesi henüz değerlendirilmemiştir.
- **Lisans ve telif hakları:** Monaco editörü MIT lisanslıdır; ancak üzerine inşa edilen her şeyin lisans uyumluluğu tez tesliminde sorun çıkarabilir.

---

## 4. Teknik Olarak Gereksiz Karmaşıklıklar

| Karmaşıklık | Neden Gereksiz | Alternatif |
|---|---|---|
| Multi-agent mimari | Tek bir iyi tasarlanmış ajan döngüsü yeterlidir | Single-agent ReAct döngüsü |
| 5 farklı model sağlayıcısı | Her sağlayıcı farklı API, farklı hata yönetimi gerektirir | 1 bulut (Claude/GPT) + 1 yerel (Ollama) |
| Tam VS Code feature parité | Hiçbir zaman tamamlanamaz | Minimal editör: dosya aç/kaydet/sekme |
| Özel RAG sistemi sıfırdan | Var olan kütüphaneler (LlamaIndex, LangChain) mevcuttur | Mevcut kütüphaneyle hızlı prototip |
| CI/CD pipeline (tez aşamasında) | Akademik bir proje için aşırı | Tek bir `npm test` scripti yeterlidir |
| `.exe` paketi (ilk dönem hedefi olarak) | Demo için gerekli değil | `npm run dev` demosu yeterlidir |

---

## 5. UX / Trust Problemleri

- **Onay yorgunluğu:** Her işlem için onay istemek, kullanıcıyı her şeyi kabul eden bir "OK robot"a dönüştürür. Kritik işlemlerde ayrıntılı onay, rutin işlemlerde sessiz çalışma gerekir.
- **Proaktif yorum sinyali kalitesi:** Ajan hatalı uyarı verirse (false positive), kullanıcı uyarıları görmezden gelmeye başlar. Bu, gerçek uyarıların da gözden kaçmasına neden olur — güvenlik açığı.
- **"Ajan ne düşünüyor?" şeffaflığı:** Ajanın hangi bağlamı gördüğü, hangi kararla değişikliği önerdiği kullanıcıya görünmezse, güven asla kurulmaz. "Explain reasoning" özelliği zorunludur.
- **Geri alma sınırları:** "Her değişiklik geri alınabilir" hedefi güzel, ancak ajan 10 dosyayı aynı anda değiştirdiyse geri alma ne kadar geriye gider? Atomik işlem sınırı tanımlanmamıştır.
- **İlk açılış deneyimi:** Bir kullanıcı uygulamayı açtığında hangi repo üzerinde çalışacağını nasıl belirtir? Bağlam kurma akışı belgelerde yoktur.

---

## 6. Güvenlik Problemleri

- **Principle of Least Privilege ihlali:** Ajana file system üzerinde geniş erişim vermek yerine, yalnızca izin verilen dizinleri (sandbox) tanımlanmış bir manifest üzerinden erişilebilir kılmak gerekir.
- **Shell injection riski:** Ajan, kullanıcının isteğinden türetilen bir komutu doğrudan terminale yazarsa, kötü niyetli bir girdi (ya da modelin ürettiği beklenmedik bir çıktı) shell injection açığına yol açabilir. Komutlar parametrize edilmeli, `eval()` veya shell string interpolation'dan kaçınılmalıdır.
- **Hassas veri sızıntısı:** `.env`, `.pem`, `id_rsa` gibi dosyaların içeriğinin yanlışlıkla bulut modeline gönderilmesi, API anahtarları ve sertifikaların sızmasına neden olabilir. Context pipeline'ına bir gizli veri filtresi eklenmesi zorunludur.
- **API anahtar yönetimi:** Kullanıcının model API anahtarları nerede saklanıyor? Electron ana sürecinde clear-text mi? Sistem keychain entegrasyonu gereklidir.
- **Audit log yokluğu:** Ajanın hangi dosyayı ne zaman değiştirdiğinin kaydı tutulmazsa, kullanıcı güvenini kaybettiğinde inceleme yapılamaz.

---

## 7. Kapsam Daraltma Önerisi

Aşağıdaki özellikler **kesinlikle çıkarılmalıdır** (1.5 yıl için):

1. **Multi-agent mimari** → Single-agent ile başlayın, ikinci ajan yalnızca kanıtlanmış ihtiyaçta eklensin.
2. **5 farklı AI model sağlayıcısı** → 2 sağlayıcı yeterlidir (1 bulut, 1 yerel). Soyutlama katmanı yerleştirin; sağlayıcı eklemek kolay olsun.
3. **Proaktif/otomatik analiz (kullanıcı tetiklemeden)** → Bu özellik UX açısından en riskli olandır. MVP'den çıkarın, araştırma sorusu olarak belgeleyin.
4. **Tam IDE feature parité (sekme yönetimi, extension sistemi, debug adaptörü)** → Bu, asıl hedefiniz değil araçtır.
5. **CI/CD ve otomatik paketleme** → Tez döneminde gerekli değil; eğer kalacaksa son 2 aya bırakın.
6. **"Tüm repo context"** → Bunu tüm repoyu göndermek olarak değil, akıllı retrieval sistemi olarak yeniden tanımlayın.

---

## 8. 1.5 Yıla Uygun Gerçekçi MVP

Aşağıdaki kapsamın 1.5 yılda **gerçekten tamamlanabilir** ve **savunulabilir** olduğu değerlendirilmektedir:

### MVP Kapsamı

**Editör Çekirdeği (3 ay)**
- Monaco editörü üzerinde çalışan minimal bir Electron uygulaması
- Dosya aç / kaydet / sekme (en fazla 3-4 sekme) — daha fazlası değil
- Temel sözdizim vurgulama

**Bağlam ve RAG Altyapısı (3 ay)**
- Proje dosyalarının embedding ile indekslenmesi (mevcut kütüphane kullanılarak)
- Aktif dosya + alakalı semboller bağlamının modele gönderilmesi
- "Tüm repo" değil, "ilgili bağlam" paradigması

**Ajan Döngüsü — Kullanıcı Tetiklemeli (4 ay)**
- Kullanıcı prompt yazar → Ajan plan üretir → Diff önizleme → Kullanıcı onaylar → Değişiklik uygulanır
- Geri alma (son 10 değişiklik)
- Temel güvenlik duvarı: hassas dosya filtreleme, komut parametrizasyonu

**Değerlendirme ve Tez (3 ay)**
- 20 standart görevden oluşan benchmark (insanlar tarafından oluşturulmuş, kör değerlendirme)
- Karşılaştırma noktası: araçsız geliştirici vs. bu araçla geliştirici
- Tez yazımı

### Dışarıda Bırakılanlar
- Proaktif/otomatik analiz
- Multi-agent
- Terminal entegrasyonu (opsiyonel, son 1 ay eklenebilir)
- 5 model sağlayıcısı (2 ile başlayın)
- VS Code extension uyumluluğu

---

## 9. Son Hüküm: Bu Projeyi Neden Bu Haliyle Riskli Buluyorum?

Bu proje şu anda üç ayrı tuzak içermektedir ve bunlar birbirini beslemektedir:

**Tuzak 1 — Genişlik-Derinlik Çelişkisi.**
Belgeler geniş bir kapsam tanımlamakta, ancak akademik katkının nerede olduğunu net biçimde ortaya koymamaktadır. Tez jürisi şunu sorar: "Bu araç var olan araçlardan akademik olarak ne öğretiyor?" Eğer cevap "proaktif ajan döngüsü"yse, o zaman editör UI'sı, terminal entegrasyonu ve model sağlayıcı çeşitliliği akademik değil, ürün kapsamıdır. Ürün yapmak mı, yoksa araştırma yapmak mı istediğiniz 1. ayda netleştirilmemişse, 18. ayda ikisi de tamamlanmamış olur.

**Tuzak 2 — Öğrenme Borcu + Teknik Borç + Kapsam Borcu.**
Electron ve TypeScript sıfırdan öğrenilecek, IDE altyapısı sıfırdan inşa edilecek, multi-agent sistemi sıfırdan tasarlanacak — bunların hepsi aynı 1.5 yıl içinde. Bu borçlar biriktiğinde proje yavaşlar, motivasyon düşer ve "çalışan bir şey" yerine "yarım kalmış bir şey" teslim edilir.

**Tuzak 3 — Ölçüm Metodolojisinin Yokluğu.**
"10 görev" değerlendirmesi iyi bir fikirdir, ancak kimse bu görevleri henüz tasarlamamıştır. Ölçüm metodolojisi yazılmadan başlanan projede, ne üretildiği tamamlandığında ölçülecek — bu tersine mühendisliktir ve savunmada saldırıya açıktır.

**Tavsiyem:** Projeyi öldürmeyin — kurtarın. Bunu yapmanın yolu şudur: (1) akademik katkıyı tek bir net araştırma sorusuna indirgemek, (2) editörü araç olarak değil zemin olarak konumlandırmak, (3) proaktif analizi ilk sürümden çıkarıp araştırma hipotezi olarak belgelemek. Bu üç karar yapılırsa, kalan kapsam 1.5 yılda savunulabilir ve üretilebilir bir teze dönüşür.

---

*Bu doküman projenin düşmanı değil, en sert müttefikidir.*
