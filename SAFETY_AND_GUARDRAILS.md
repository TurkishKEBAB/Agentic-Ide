# GUVENLIK_ONLEMLERI_ONERISI (SAFETY_AND_GUARDRAILS)

Hocam, bu durum benim başıma çok geldiği için eğer bu projeyi biz yaparsak neyi farklı yapardım diye düşündüğüm soruların başında yer alan "Yapay zeka kodlarımı silerse?" endişesini gidermek için şu güvenlik katmanlarını düşündüm:

## 1. Yasaklı Komutlar
Ajana `rm -rf` gibi komutları yasaklamayı planlıyorum.

## 2. Kullanıcı Onayı (Human-in-the-loop)
Ajanın her önemli eylemde "Bunu yapayım mı?" diye sorması zorunlu olsun diyorum. Onaysız işlem yapılmasın.

## 3. Geri Alma (Undo)
Her değişikliği geri alınabilir şekilde tasarlamayı öneriyorum.

Sizce bu önlemler güvenlik için yeterli midir?
