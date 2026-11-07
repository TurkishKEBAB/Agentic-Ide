export type TutorialEvent = 'file-opened' | 'practice-saved' | 'request-sent' | 'source-reviewed'
  | 'diff-reviewed' | 'safe-diff-reviewed' | 'patch-applied' | 'patch-undone';

export type TutorialPhase = 'idle' | 'active' | 'paused' | 'finished';

interface TutorialStep {
  event: TutorialEvent;
  target: string;
  title: string;
  what: string;
  why: string;
  action: string;
  example?: string;
  hint: string;
  feedback: string;
}

export const practiceComment = '// İlk görev notu';
export const laterPracticeComment = '// Geri almada korunacak not';

export const tutorialSteps: readonly [TutorialStep, ...TutorialStep[]] = [
  {
    event: 'file-opened',
    target: '[data-act="file-picker"]',
    title: 'Bir dosya aç',
    what: 'Oturum sözleşmesi, bu görevin başlangıç noktası.',
    why: 'Ajan bir değişiklik önermeden önce mevcut kodu görürsün.',
    action: 'Dosya aç düğmesine bas ve session.ts dosyasını seç.',
    hint: 'Dosya aç, çalışma setinin yanında. Listede src/auth/session.ts’yi seç.',
    feedback: 'session.ts kod alanında açıldı.',
  },
  {
    event: 'practice-saved',
    target: '#editor-host',
    title: 'Kendi notunu kaydet',
    what: 'Yazdığın yorum, ajanın yamasından bağımsız bir düzenleme olacak.',
    why: 'Görevin sonunda ajan değişikliklerini geri alıp kendi notunun yerinde kaldığını göreceksin.',
    action: 'Bu yorumu session.ts dosyasının sonuna ekle, sonra Kaydet’e bas.',
    example: practiceComment,
    hint: 'Kaydet yerine Ctrl+S veya ⌘S kullanabilirsin.',
    feedback: 'Kendi yorumun kaydedildi.',
  },
  {
    event: 'request-sent',
    target: '#command-input',
    title: 'Ajan isteğini gönder',
    what: 'Ajan, isteğini bir değişiklik planına dönüştürür.',
    why: 'Örnek metni yerleştirmek isteği göndermez. Metni okuyup gönderme kararını sen verirsin.',
    action: 'Örnek isteği kullan ile alanı doldur, sonra Gönder’e bas.',
    hint: 'İstek, AuthSession arayüzüne expiresAt: Date eklerken iki kullanımını da günceller.',
    feedback: 'İstek gönderildi ve plan v1 hazır.',
  },
  {
    event: 'source-reviewed',
    target: '.source-list',
    title: 'Planın kaynağını incele',
    what: 'Bağlam kaynakları, planın dayandığı dosyaları ve satırları gösterir.',
    why: 'Ajanın önerisini gerekçesiyle ve ilgili kodla karşılaştırabilirsin.',
    action: 'Bağlam kaynakları listesinden bir dosya satırını aç.',
    hint: 'session.ts satırında, ajanın hangi arayüze baktığını görebilirsin.',
    feedback: 'Bir kaynak açıldı; planın dayanağını gördün.',
  },
  {
    event: 'diff-reviewed',
    target: '[data-act="review"]',
    title: 'İlk diff’i incele',
    what: 'v1, oturum sözleşmesini ve onu kullanan dosyaları birlikte güncellemeyi öneriyor.',
    why: 'Diff, uygulamadan önce hangi satırların ekleneceğini ve çıkarılacağını gösterir.',
    action: 'Diff’i incele düğmesine bas ve v1’de değişen satırlara bak.',
    hint: 'Bağlı grupta session.ts, login.ts ve middleware.ts dosyalarını ayrı ayrı açabilirsin.',
    feedback: 'v1 diff’ini açtın. Kod henüz değişmedi.',
  },
  {
    event: 'safe-diff-reviewed',
    target: '[data-act="safety"]',
    title: 'Engelli adımı çıkar, v2’yi incele',
    what: 'v1, korumalı .env dosyasına sahte bir anahtar eklemeyi öneriyor. Güvenlik kontrolü yazmayı engelliyor.',
    why: 'Engelli adımı çıkarmak planı değiştirir. Onaydan önce yeni sürümün diff’ine bakman gerekir.',
    action: 'Kontroller’i aç, Engelli adımı plandan çıkar düğmesine bas ve v2 diff’ini incele.',
    hint: 'v2 diff’inde .env kaybolur. Seçili oturum grubu üç dosyayı birlikte günceller.',
    feedback: 'v2 diff’i incelendi ve yazma kontrolleri temiz.',
  },
  {
    event: 'patch-applied',
    target: '[data-act="approve"]',
    title: 'Onayla ve uygula',
    what: 'İncelediğin v2, oturum grubunu yazmaya hazır.',
    why: 'Onay bu plan ve grup seçimi için geçerlidir. Kod, uygulama düğmesine bastığında değişir.',
    action: 'Seçili grupları onayla, ardından Onaylı yamayı uygula düğmesine bas.',
    hint: 'Oturum bütünlüğü grubunu seçili bırak. Onay 10 dakika geçerli.',
    feedback: 'Yama uygulandı ve geçmişe bir değişiklik seti eklendi.',
  },
  {
    event: 'patch-undone',
    target: '[data-act="undo"]',
    title: 'Değişiklik setini geri al',
    what: 'Ajanın uyguladığı yama geçmişte bir set olarak duruyor.',
    why: 'Geri alma, setin değişikliklerini tersine çevirir. Ayrı satırdaki yorumun korunur.',
    action: 'Bu yeni yorumu session.ts sonuna ekle ve kaydet. Sonra Bu seti geri al düğmesine bas.',
    example: laterPracticeComment,
    hint: 'expiresAt alanı gider, dosyanın sonundaki yorum kalır.',
    feedback: 'Ajanın yaması geri alındı; sonradan kaydettiğin yorum korundu.',
  },
];

export class FirstTaskTutorial {
  #phase: TutorialPhase = 'idle';
  #index = 0;
  #completedThrough = -1;
  #why = false;
  hints = true;

  get phase(): TutorialPhase { return this.#phase; }
  get index(): number { return this.#index; }
  get current(): TutorialStep { return tutorialSteps[this.#index] ?? tutorialSteps[0]; }
  get completed(): boolean { return this.#index <= this.#completedThrough; }
  get why(): boolean { return this.#why; }

  start(hints = true): void {
    this.reset();
    this.#phase = 'active';
    this.hints = hints;
  }

  observe(event: TutorialEvent): boolean {
    if (this.#phase !== 'active' || this.completed || this.current.event !== event) return false;
    this.#completedThrough = this.#index;
    return true;
  }

  previous(): void {
    if (this.#phase !== 'active' || this.#index === 0) return;
    this.#index--;
    this.#why = false;
  }

  next(): void {
    if (this.#phase !== 'active' || !this.completed) return;
    if (this.#index === tutorialSteps.length - 1) this.#phase = 'finished';
    else this.#index++;
    this.#why = false;
  }

  pause(): void {
    if (this.#phase === 'active') this.#phase = 'paused';
  }

  resume(): void {
    if (this.#phase === 'paused') this.#phase = 'active';
  }

  toggleWhy(): void {
    if (this.#phase === 'active') this.#why = !this.#why;
  }

  reset(): void {
    this.#phase = 'idle';
    this.#index = 0;
    this.#completedThrough = -1;
    this.#why = false;
    this.hints = true;
  }
}
