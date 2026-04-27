# DANI^MAN TOPLANTI G�NDEM0 (ADVISOR_MEETING_AGENDA)

> **Belge amac1:** Dan1_man toplant1lar1nda sorulacak karar sorular1n1 ve aksiyon maddelerini haz1rlar.  
> Bu belge toplant1 �ncesi g�ncellenir, toplant1 sonras1 aksiyonlar eklenir.

---

## 1. Toplant1 Bilgileri

- **Tarih:** [belirtilecek]
- **Kat1l1mc1lar:** [�renci] + [dan1_man]
- **S�re:** ~60 dakika
- **Format:** Belge tak1m1 �zerinden inceleme + karar alma

---

## 2. Toplant1 Hedefi

Bu toplant1n1n amac1, proje belge setindeki ana kararlar1 dan1_man onay1yla netle_tirmektir:

- Ara_t1rma sorusunun nihai form�lasyonu
- 18 ayl1k takvimin uygulanabilirlii
- Electron + Monaco ba_lang1� mimarisi onay1
- Single-agent stratejisinin yeterlilii
- Deerlendirme metodolojisinin akademik savunulabilirlii
- MVP kapsam1  dahil edilecek ve �1kar1lacak �zellikler

---

## 3. Karar Bekleyen Sorular

### 3.1 Ara_t1rma Sorusu
- [ ] Ana ara_t1rma sorusu kabul edildi mi? � _"Plan-first, approval-gated d�ng� hata oran1n1 ve g�veni iyile_tirir mi?"_
- [ ] Alt ara_t1rma sorular1 (retrieval etkinlii, g�venlik maliyeti) teze dahil mi?
- [ ] Hipotez net mi? J�ri i�in savunulabilir mi?

### 3.2 Mimari Karar
- [ ] Electron + Monaco karar1 kilitlensin mi? Tauri gelecek �al1_ma olarak m1 b1rak1ls1n?
- [ ] Multi-agent yakla_1m1n1 MVP d1_1 b1rakma karar1 savunulabilir mi?
- [ ] VS Code extension yerine ba1ms1z edit�r geli_tirme gerek�esi yeterli mi?

### 3.3 Kapsam ve Takvim
- [ ] 18 ayl1k / 3 fazl1 plan hocam'1n beklentisiyle uyumlu mu?
- [ ] Proaktif analiz �zellii kesinlikle MVP d1_1 m1? (PROACTIVE_BEHAVIOR_DESIGN.md "gelecek �al1_ma" olarak belgelendi)
- [ ] Terminal entegrasyonu tez kapsam1nda m1?
- [ ] `.exe` paketleme gerekli mi, yoksa demo i�in `npm run dev` yeterli mi?

### 3.4 Deerlendirme
- [ ] 20 g�revlik benchmark seti tez �l�ei i�in yeterli mi?
- [ ] Baseline ��l� kar_1la_t1rma (dorudan LLM, onays1z ajan, Agentic IDE) uygun mu?
- [ ] Kullan1c1 �al1_mas1 (5-10 ki_i) zorunlu mu, yoksa opsiyonel mi?
- [ ] SWE-bench ile kendi benchmark'1m1z1n konumland1rmas1 kabul edilebilir mi?

### 3.5 G�venlik ve Etik
- [ ] Diff + onay + rollback hatt1 zorunlu tutulmal1 m1?
- [ ] Audit log mekanizmas1 tez i�in yeterli mi?
- [ ] Bulut modele kod g�nderme konusunda etik kurul onay1 gerekli mi?

---

## 4. Toplant1 �ncesi Haz1rl1k Listesi

- [ ] `SUPERVISOR_BRIEF.md` okundu mu? (hocama g�nderildi mi?)
- [ ] `PRODUCT_PLAN.md` son haline getirildi mi?
- [ ] `EVALUATION_PLAN.md` metrik tablosu sade s�r�me indirildi mi?
- [ ] `SYSTEM_PLAN.md` ajan d�ng�s� k1sa �zeti haz1rland1 m1?
- [ ] 1 sayfal1k karar �zeti haz1rland1 m1? (karar, alternatif, risk)
- [ ] Meeting board HTML son s�r�m m�? (PlantUML diyagramlar g�r�n�yor mu?)

---

## 5. Toplant1 Sonras1 Aksiyon ^ablonu

Toplant1dan sonra a_a1daki formatla doldurulur:

### Al1nan Kararlar
| # | Karar | Detay |
|---|---|---|
| K1 | | |
| K2 | | |
| K3 | | |

### Aksiyonlar
| # | Aksiyon | Sorumlu | Teslim Tarihi |
|---|---|---|---|
| A1 | | | |
| A2 | | | |

### A�1k Kalan Sorular
- [ ] 
- [ ] 

### Sonraki Toplant1
- **Tarih:** 
- **G�ndem:** 

---

## 6. 0lgili Belgeler

Okunma s1ras1 �nerisi:

1. `SUPERVISOR_BRIEF.md`  Genel bak1_
2. `PRODUCT_PLAN.md`  Problem, ara_t1rma sorusu, MVP kapsam1
3. `SYSTEM_PLAN.md`  Ajan mimarisi, g�venlik
4. `EVALUATION_PLAN.md`  Benchmark ve metrikler
5. `ARCHITECTURE_OPTIONS.md`  Electron vs. Tauri karar1
6. `TECH_STACK_AND_AI.md`  Model ve teknoloji se�imi
7. `PROJECT_ROADMAP.md`  18 ayl1k takvim
8. `CRITICAL_ANALYSIS.md`  Risklerin ele_tirel deerlendirmesi

---

*Toplant1 g�ndemi i�in � bu belge.*  
*Dan1_man brifingi i�in � `SUPERVISOR_BRIEF.md`*
