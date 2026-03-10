# AJAN MİMARİSİ ANALİZİ (AGENT_ARCHITECTURE_ANALYSIS)

> **Belge amacı:** Bu belge, Agentic IDE projesi için single-agent ve multi-agent mimari seçeneklerini
> karşılaştırır; projenin kısıtları (1.5 yıl, tek geliştirici, lisans tezi) altında en savunulabilir
> mimariyi önerir.  
> Mimari karar için → `SYSTEM_PLAN.md § 7`

---

## Analiz Bağlamı

Bu analiz aşağıdaki sabit kısıtlar altında yapılmaktadır:

| Kısıt | Değer |
|---|---|
| Toplam süre | 18 ay |
| Geliştirici sayısı | 1 |
| Proje türü | Lisans bitirme tezi |
| Başarı kriteri | Akademik savunma + çalışan demo |
| En büyük riskler | Güvenlik ihlali, yanlış dosya bozma |
| Değerlendirme gerekliliği | Ölçülebilir metrikler, karşılaştırılabilir sonuçlar |

---

## 1. Tek Ajan mı Daha Mantıklı?

### Öneri
Evet — MVP ve tez kapsamı için tek ajan her zaman daha mantıklıdır.

Tek ajan, tüm görev döngüsünü (gözlemle → planla → onay al → uygula) tek bir kontrol akışı içinde yürütür.
Mimari şeffaftır: her adım debug edilebilir, her karar izlenebilir, her hata yereldir.

```
Kullanıcı İsteği → [TEK AJAN] → Plan → Onay → Uygulama → Sonuç
       ↑                ↓
       └─── Feedback ───┘
```

Karmaşık görünen her görev (çok dosyalı refactor, test yazma, hata düzeltme) aslında
sıralı araç çağrıları zinciridir — paralel ajan koordinasyonu gerektirmez.

### Gerekçe
Tek ajan şunları sağlar:
- **Determinizm**: Aynı girdi, aynı araç zincirini tetikler. Test edilebilir.
- **Gözlemlenebilirlik**: Tüm adımlar tek bir çalıştırma izi (trace) üzerinde görünür.
- **Güvenlik kontrolü**: Tüm `write_file` çağrıları tek bir güvenlik katmanından geçer.
- **Hata lokalizasyonu**: Bir şey yanlış giderse, nerede yanlış gittiği açıktır.

### Trade-off
Tek ajan, uzun ve karmaşık görevlerde (örn. 50 dosyalı tam uygulama refaktorü)
context window sınırına erken ulaşabilir. Paralel çalışma mümkün değildir.
Ancak bu kısıt, 20-görevlik benchmark tasarımında "sistem sınırı" olarak belgelenebilir
ve akademik açıdan savunulabilir bir bulgu üretir.

### Yanlış yapılırsa ne bozulur?
"Tek ajan yeterli değil, multi-agent yapalım" kararı verilirse ve multi-agent koordinasyon
altyapısı inşa edilmeye başlanırsa:
- İlk 3 ay koordinasyon protokolü (mesaj formatı, hata recovery, state senkronizasyonu) ile geçer.
- Demo'ya asla yetişilmez.
- Tez savunmasında "neden iki ajan arasındaki mesajlaşma çalışmıyor?" sorusuyla karşılaşılır.

---

## 2. Planner / Executor / Reviewer / Safety Agent Ayrımı Gerekli mi?

### Öneri
Hayır — bu ayrımı mimari değil, **fonksiyon** düzeyinde yapın.

Aynı ajan döngüsü içinde farklı "roller" prompt mühendisliğiyle simüle edilebilir:

```
┌─────────────────────────────────────────────────────────────────────┐
│  TEK AJAN — ReAct Döngüsü                                           │
│                                                                     │
│  Adım 1: PLANNER modu → Hangi dosyalar, hangi değişiklikler?        │
│  Adım 2: SAFETY CHECK modu → Güvenlik kuralları ihlal ediliyor mu?  │
│  Adım 3: EXECUTOR modu → Araç çağrıları (read_file, write_file)     │
│  Adım 4: REVIEWER modu → Değişiklik mantıklı mı, diff doğru mu?     │
│                                                                     │
│  Her "mod" aynı model, farklı system prompt segmenti                │
└─────────────────────────────────────────────────────────────────────┘
```

Bu yaklaşıma **"Role-Prompted Single Agent"** denir. Akademik literatürde (ReAct, Reflexion,
SWE-agent) tek ajan içinde iç denetim döngüleri (self-critique, self-correction) olarak
belgelenmiştir ve karmaşık ayrı ajan mimarisine gerek kalmaksızın benzer kalite artışı sağlar.

### Gerekçe
Ayrı ajan = ayrı çalışma zamanı, ayrı state, ayrı hata modu.
Her ayrım bir koordinasyon protokolü gerektirir:
- Planner → Executor: "Plan formatı ne? Executor bunu parse edemezse?"
- Executor → Reviewer: "Reviewer hangi bilgiye erişebilir? Executor state'ini paylaşabilir mi?"
- Reviewer → Safety: "Safety ajan kararı veto ederse ne olur? Kilitlenme?"

Bu soruların her birinin cevabı ayrı bir mühendislik görevi demektir.

### Trade-off
Tek ajan + rol prompt'ları, gerçek multi-agent sistemlerin paralel çalışma ve uzmanlaşma
avantajlarını sağlamaz. Ancak bu avantajlar 1.5 yıllık bir tez projesi için gereksizdir;
asıl görev araştırma sorusunu yanıtlamaktır.

### Yanlış yapılırsa ne bozulur?
Dört ayrı ajan tasarlanır, her birinin araç erişimi, sistem prompt'u ve hata yönetimi
ayrı ayrı kodlanır. Güvenlik ajanı bir işlemi bloke ettiğinde executor askıda kalır.
Bu durumun recovery senaryosu tezin asıl konusundan çok daha fazla zaman alır.

---

## 3. Üç Mimari Seçenek

---

### A) Single-Agent (Tek Ajan)

**Tanım:** Tüm görev döngüsü tek bir LLM çağrısı zinciri tarafından yürütülür.
Roller (planner, executor, reviewer, safety) aynı ajan içinde prompt segmentleri olarak uygulanır.

```
[Kullanıcı] → [Single Agent: ReAct Loop] → [Tool Calls] → [Diff] → [Onay] → [Apply]
                      │
                 [self-critique]
                 [safety check]
                 [plan review]
```

**Artılar:**
- ✅ Minimal kurulum: bir model, bir döngü, bir araç sistemi
- ✅ Tam gözlemlenebilirlik: tek trace, her adım görünür
- ✅ Güvenlik kontrolü merkezi: tek bir noktadan tüm `write_file` geçer
- ✅ Debug kolaylığı: hata lokasyonu her zaman açık
- ✅ Test edilebilirlik: deterministik araç zinciri, birim testler mümkün
- ✅ Akademik karşılaştırma kolaylığı: "ajan vs. ajan yok" baseline net
- ✅ 18 ay içinde biten ilk prototip mümkün: ay 7–10 hedefi gerçekçi

**Eksiler:**
- ❌ Paralel çalışma yok: büyük değişiklik setleri sıralı işlenir
- ❌ Uzmanlaşma sınırı: tüm görev türleri aynı model mimarisi üzerinden geçer
- ❌ Context window baskısı: çok adımlı görevlerde bağlam birikir, eski bilgi düşer
- ❌ Gerçek "agent swarm" araştırmalarıyla karşılaştırma zorlaşır (fakat bu gerekli değil)

---

### B) Minimal Multi-Agent (2 Ajan: Orchestrator + Executor)

**Tanım:** İki ajan kullanılır. Orchestrator görevi planlar ve onay akışını yönetir;
Executor araç çağrılarını (dosya okuma/yazma) gerçekleştirir.

```
[Kullanıcı] → [Orchestrator Agent]
                    │ görev planı + onay
                    ▼
              [Executor Agent] → [Tool Calls] → [Diff] → [Onay] → [Apply]
                    │
              [Sonuç Raporu]
                    │
              [Orchestrator] → [Kullanıcıya Sunum]
```

**Artılar:**
- ✅ Planlama ve uygulama ayrışır: orchestrator bozulsa executor durur (daha güvenli)
- ✅ Executor izole edilebilir ve bağımsız test edilebilir
- ✅ Gelecekte 3. ajan (reviewer) eklemek mümkün
- ✅ Akademik literatürde (AutoGen, CrewAI, LangGraph) paralel çalışmalar mevcuttur

**Eksiler:**
- ❌ Koordinasyon protokolü gerektirir: mesaj formatı, state paylaşımı, hata recovery
- ❌ İki ajan arasındaki hata modları: deadlock, mesaj kaybolması, format uyumsuzluğu
- ❌ Gözlemlenebilirlik zorlaşır: iki ayrı trace, ortak debugger yok
- ❌ 6-8 hafta ek geliştirme süresi (coordination layer)
- ❌ Test altyapısı çift katmana çıkar (her ajan için ayrı birim testler)

---

### C) Full Multi-Agent (4 Ajan: Planner + Executor + Reviewer + Safety Guard)

**Tanım:** Her sorumluluk ayrı bir ajana verilir. Planner görevi çözer ve adımları sıralar;
Executor araçları çağırır; Reviewer çıktıyı denetler; Safety Guard her `write_file`
öncesinde güvenlik kontrolü yapar.

```
[Kullanıcı] → [Planner Agent]
                    │ adım listesi
                    ▼
              [Executor Agent] ←→ [Safety Guard Agent]
                    │ çıktı
                    ▼
              [Reviewer Agent]
                    │ onay/ret
                    ▼
              [Planner] → [Kullanıcıya Sunum / Yeniden Planlama]
```

**Artılar:**
- ✅ Teorik olarak en yüksek kalite: her ajan kendi uzmanlık alanında çalışır
- ✅ Safety Guard tamamen izole: her yazma işlemi bağımsız güvenlik denetimine girer
- ✅ Akademik özgünlük: bu mimarinin IDE bağlamında değerlendirilmesi literatürde nadir
- ✅ Her ajan bağımsız değiştirilebilir (plug-and-play)

**Eksiler:**
- ❌ Koordinasyon altyapısı tezin büyük bölümünü tüketir (6–9 ay tahmini)
- ❌ Her ajan arası geçiş noktası bir hata modu: 4 ajan = en az 6 kenar (edge), her kenar bir protokol
- ❌ Partial failure: Safety Guard çöktüğünde sistem ne yapacak? Executor askıda mı kalacak?
- ❌ Debugging için distributed tracing altyapısı gerekir (OpenTelemetry vb.) — 2 hafta ek çalışma
- ❌ Akademik karşılaştırma neredeyse imkânsız: "4 ajan sistemi vs. 4 ajan sistemi" baseline nedir?
- ❌ 18 ay içinde çalışan demo ihtimali düşük

---

## 4. Multi-Agent Mimarinin Getirdiği Gerçek Faydalar

### Öneri
Multi-agent mimarinin gerçek faydaları şunlardır — ancak bu projedeki geçerlilikleri parantez içinde belirtilmiştir:

| Fayda | Gerçek mi? | Bu Proje İçin Geçerli mi? |
|---|---|---|
| Uzmanlaşma: her ajan bir konuda daha iyi | Evet | Hayır — 1 model, farklı prompt'lar aynı etkiyi üretir |
| Paralel çalışma: birden fazla görev eş zamanlı | Evet | Hayır — kullanıcı tetiklemeli, sıralı görev akışı |
| İzolasyon: bir ajan çöker, diğerleri devam eder | Evet | Kısmen — safety guard izolasyonu faydalı olabilir |
| Ölçeklenebilirlik: yeni görev türü = yeni ajan | Evet | Hayır — MVP'de 5 görev türü, hepsi aynı döngüde |
| Akademik literatür uyumu | Evet | Kısmen — ama araştırma sorusuyla bağlantısı zayıf |

### Gerekçe
Multi-agent'ın gerçek değeri, **sürekli çalışan, paralel görevler yürüten, farklı uzmanlık
gerektiren büyük sistemlerde** ortaya çıkar (ör. Google'ın AlphaCode 2 altyapısı, production
CI/CD agentlar). Bu proje kullanıcı tetiklemeli, sıralı, küçük ölçekli görevler üzerinde
çalışmaktadır — bu özellikler multi-agent'ın avantajlarını anlamsız kılar.

### Trade-off
Multi-agent yaklaşım seçilirse, akademik katkı "ajan kalitesi" yerine "koordinasyon mimarisi"
üzerine kayar. Bu, araştırma sorusunu değiştirir — ve yeni araştırma sorusu çok daha zor
yanıtlanabilir hale gelir.

### Yanlış yapılırsa ne bozulur?
"Multi-agent daha akademik görünür" düşüncesiyle mimari karmaşıklaştırılırsa, tez savunmasında
"Koordinasyon mimarinizin başarısını nasıl ölçtünüz?" sorusu yanıtsız kalır.

---

## 5. Debugging ve Observability Karşılaştırması

### Öneri
Gözlemlenebilirlik açısından single-agent açık ara kazanır.

| Boyut | Single-Agent | Minimal Multi-Agent | Full Multi-Agent |
|---|---|---|---|
| **Hata konumu** | Tek trace, her adım görünür | 2 trace, ortak log gerekir | 4 trace, distributed tracing gerekir |
| **State inspection** | Tek LLM state | 2 ayrı state, sync protokolü | 4 ayrı state, senkronizasyon kritik |
| **Reproduzibilite** | Yüksek: aynı input → aynı trace | Orta: timing bağımlı olabilir | Düşük: race condition olasılığı |
| **Test izolasyonu** | Araç seviyesinde mock yeterli | Her ajanı ayrı mock etmek gerekir | Her kenarı ayrı test etmek gerekir |
| **Breakpoint debug** | Doğrudan: döngü adımına koy | Zorlaştırılmış: hangi ajanda? | Neredeyse imkânsız geleneksel debugger ile |
| **Log analizi** | Tek dosya, sıralı okuma | İki log, zaman damgasına göre birleştirme | Merkezi log aggregator gerekir |
| **Hata mesajı anlamlılığı** | "3. adımda güvenlik kuralı ihlal" | "Executor başarısız, orchestrator ne yapacak?" | "Safety Guard timeout: Executor askıda kaldı" |

### Gerekçe
Tek geliştirici + 18 ay kısıtı altında, her debug süresi kritik kaynaktır.
Multi-agent sistemlerde bir hata 1 saat yerine 4 saatte çözülebilir — sadece log'ların
hangi ajana ait olduğunu anlamak bile zaman alır.

### Trade-off
Single-agent'ın gözlemlenebilirlik avantajı, sistemin büyüdükçe azalır. 10 araç çağrısından
oluşan uzun bir görevde single-agent trace'i de okunması zor hale gelebilir. Bu durumda
çözüm multi-agent değil, daha iyi structured logging'dir.

### Yanlış yapılırsa ne bozulur?
Multi-agent sisteme debug altyapısı kurulmadan geçilirse: bir ajan diğerini beklerken
sistem donduğunda, nedenin hangi ajanda olduğu bilinemez. Saatler harcandıktan sonra
"sistemin tamamını yeniden başlatayım" noktasına gelinir.

---

## 6. Lisans Bitirme Projesi İçin En İyi Denge

### Öneri
**Tek ajan + rol-prompt'lara dayalı iç denetim döngüsü** (Role-Prompted Single Agent with
Self-Critique) — bu yapı "tek ajan basitliğini" ve "çok ajan kalite güvencesini" dengeler.

Pratik uygulama:

```
[Kullanıcı İsteği]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│  TEK AJAN — 4 Fazlı ReAct Döngüsü                               │
│                                                                  │
│  FAZ 1 — PLAN (Planner rolü)                                     │
│  System prompt: "Sen bir kod planlayıcısın.                    │
│   Hangi dosyalar etkilenecek? Değişiklik sırası ne?"             │
│                                                                  │
│  FAZ 2 — SAFETY CHECK (Safety Guard rolü)                        │
│  System prompt: "Planı güvenlik açısından gözden geçir.          │
│   Korumalı dosya var mı? Sandbox dışı erişim var mı?"            │
│  → İhlal varsa: kullanıcıya bildir, döngüyü durdur               │
│                                                                  │
│  FAZ 3 — EXECUTE (Executor rolü)                                 │
│  Tool calls: read_file, write_file (sandbox içi)                 │
│  Her write_file öncesi güvenlik katmanından geçer                │
│                                                                  │
│  FAZ 4 — REVIEW (Reviewer rolü)                                  │
│  System prompt: "Yapılan değişiklikleri gözden geçir.            │
│   Plan ile örtüşüyor mu? Yan etki var mı?"                       │
│  → Sorun varsa: kullanıcıya bildir, rollback öner                │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
[Diff Göster → Kullanıcı Onayı → Uygula]
```

Bu yaklaşım:
- Multi-agent sistemin rollerini (planner, safety, executor, reviewer) simüle eder
- Koordinasyon protokolü gerektirmez
- Tek trace, tek debug noktası
- 18 ayda tamamlanabilir

### Gerekçe
Akademik katkı, mimari karmaşıklığı değil araştırma sorusunun yanıtını gerektirir.
Araştırma sorusu: "Güvenli ajan döngüsü daha iyi sonuç üretir mi?"
Bu soruyu yanıtlamak için 4 ayrı çalışan sürece ihtiyaç yoktur.

### Trade-off
Bu yaklaşım, "gerçek" multi-agent sistemlerle karşılaştırma yapmak isteyen araştırmacıların
beklentisini karşılamayabilir. Ancak tez danışmanıyla bu yaklaşımın "pragmatik uygulama"
olarak framing'i savunulabilir ve literatürde örnekleri mevcuttur.

### Yanlış yapılırsa ne bozulur?
"4 fazlı prompt yeterince akademik değil" düşüncesiyle gerçek 4-ajan sisteme geçilirse:
koordinasyon kodu tezin asıl konusunun önüne geçer ve 18. ayda yarım kalmış bir mimari
demo yerine tam bir araştırma sorusu yanıtı sunulamaz.

---

## 7. Sonuç: Kaç Agent ile Başlamalısınız?

### Öneri: **1 Agent. Başka seçenek yok.**

Karar sürecini şematize etmek gerekirse:

```
Multi-agent mı ihtiyacınız var?
              │
              ▼
      Paralel görevler var mı? ──► HAYIR ──► Tek ajan yeterli
              │
             EVET
              │
              ▼
    Kullanıcı tetiklemeli mi? ──► EVET ──► Tek ajan yeterli
              │
             HAYIR
              │
              ▼
    1.5 yıl mı süreniz? ──► EVET ──► Tek ajan yeterli
              │
             HAYIR (>3 yıl)
              │
              ▼
    O zaman multi-agent değerlendirilebilir.
```

Bu projenin her dalı "Tek ajan yeterli" sonucuna çıkmaktadır.

### Pratik Yol Haritası

| Aşama | Mimari | Neden |
|---|---|---|
| **Ay 1–6** | Tek ajan, 2 faz (plan + execute) | Öğrenme, prototip, temel akış |
| **Ay 7–10** | Tek ajan, 4 faz (plan + safety + execute + review) | Güvenlik ve kalite güvencesi eklenir |
| **Ay 11–15** | Tek ajan, 4 faz + structured logging | Benchmark ve ölçüm için trace kaydı |
| **Ay 16–18** | Tek ajan sistemi sabitlenir | Tez yazımı, demo, savunma |
| **Tez sonrası** | 2-ajan minimal mimari araştırılabilir | Orchestrator + Executor ayrımı B planı olarak belgelenir |

### Nihai Karar

> **1 ajan ile başlayın. 4 fazlı rol-prompt döngüsü kullanın.  
> Multi-agent'ı tez sonrası "gelecek çalışmalar" bölümüne yazın.  
> Bu karar hem savunulabilir hem de tamamlanabilirdir.**

---

## Referanslar ve İlgili Belgeler

- `SYSTEM_PLAN.md § 7` — Önerilen ajan mimarisinin teknik detayları  
- `SYSTEM_PLAN.md § 9` — Güvenlik katmanları (Safety Guard rolünün uygulaması)  
- `SYSTEM_PLAN.md § 13` — Risk kaydı (multi-agent riski dahil)  
- `PRODUCT_PLAN.md § 6` — MVP dışı bırakılan özellikler (multi-agent listede)  
- `CRITICAL_ANALYSIS.md § Risk 5` — Multi-agent mimarinin gereksiz karmaşıklık olduğuna dair detaylı analiz
