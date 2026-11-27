import { button, escapeHtml as h, icon, iconButton } from './markup.ts';
import { tutorialSteps, type FirstTaskTutorial } from './tutorial.ts';

const twoDigits = (value: number): string => String(value).padStart(2, '0');

function header(coach: FirstTaskTutorial): string {
  const segments = tutorialSteps.map((_, index) => {
    const status = index < coach.index || (index === coach.index && coach.completed)
      ? 'done' : index === coach.index ? 'current' : '';
    return `<span class="${status}"></span>`;
  }).join('');
  return `<header class="tutorial-head">
    <div class="tutorial-identity"><span class="tutorial-mark">${icon('target', 17)}</span><p class="eyebrow">İlk Görev</p></div>
    <div class="tutorial-progress">
      <span class="tutorial-count">Adım ${twoDigits(coach.index + 1)} / ${twoDigits(tutorialSteps.length)}</span>
      <div class="tutorial-segments" aria-hidden="true">${segments}</div>
    </div>
    ${coach.phase === 'finished' ? '' : iconButton('tutorial-exit', 'İlk Görev rehberini kapat', 'close')}
  </header>`;
}

function activeCard(coach: FirstTaskTutorial): string {
  const step = coach.current;
  const next = tutorialSteps[coach.index + 1];
  const action = coach.completed
    ? `<p class="tutorial-feedback" role="status">${icon('check', 16)}<span>${h(step.feedback)}</span></p>
      ${next ? `<p class="tutorial-note"><b>Sırada</b> ${h(next.title)}</p>` : ''}`
    : `<div class="tutorial-task">
      <p class="tutorial-action"><b>Şimdi</b><span>${h(step.action)}${step.example ? ` <code>${h(step.example)}</code>` : ''}</span></p>
      ${step.event === 'request-sent' ? button('example', 'Örnek isteği kullan', { glyph: 'terminal', className: 'ghost tutorial-example' }) : ''}
    </div>`;

  return `<div class="tutorial-body">
    <div class="tutorial-copy">
      <h2 id="tutorial-title" tabindex="-1">${h(step.title)}</h2>
      <p class="tutorial-what">${h(step.what)}</p>
      ${action}
      <p class="tutorial-note" id="tutorial-why"${coach.why ? '' : ' hidden'}><b>Neden?</b> ${h(step.why)}</p>
      <p class="tutorial-note" id="tutorial-hint"${coach.hints && !coach.completed ? '' : ' hidden'}><b>İpucu:</b> ${h(step.hint)}</p>
    </div>
    <div class="tutorial-controls">
      <div class="tutorial-nav" role="group" aria-label="Rehber adımları">
        ${button('tutorial-prev', 'Önceki açıklama', { className: 'ghost', disabled: coach.index === 0 })}
        ${button('tutorial-next', coach.index === tutorialSteps.length - 1 ? 'Bitir' : 'İleri', { className: 'primary', suffix: 'arrow', disabled: !coach.completed })}
      </div>
      <div class="tutorial-tools" role="group" aria-label="Rehber seçenekleri">
        <button type="button" class="tutorial-tool" data-act="tutorial-why" aria-expanded="${coach.why}" aria-controls="tutorial-why">Neden?</button>
        <button type="button" class="tutorial-tool" data-act="tutorial-hint" aria-pressed="${coach.hints}" aria-controls="tutorial-hint">İpuçları</button>
        <button type="button" class="tutorial-tool" data-act="tutorial-pause">Duraklat</button>
      </div>
    </div>
  </div>`;
}

function pausedCard(): string {
  return `<div class="tutorial-body tutorial-terminal">
    <div class="tutorial-copy"><h2 id="tutorial-title" tabindex="-1">Rehber duraklatıldı</h2>
      <p>Hazır olduğunda kaldığın adımdan devam edebilirsin.</p></div>
    <div class="tutorial-nav">${button('tutorial-pause', 'Rehbere dön', { className: 'primary', suffix: 'arrow' })}</div>
  </div>`;
}

function finishedCard(): string {
  return `<div class="tutorial-body tutorial-terminal">
    <div class="tutorial-copy"><h2 id="tutorial-title" tabindex="-1">İlk Görev tamamlandı</h2>
      <p>Planın kaynaklarına baktın, güvenlik uyarısından sonra yeni diff’i inceledin ve yamayı onaylayıp uyguladın.</p>
      <p class="tutorial-feedback">${icon('check', 16)}<span>Seti geri aldın ve sonradan kaydettiğin yorum korundu.</span></p></div>
    <div class="tutorial-nav" role="group" aria-label="İlk Görev sonrası seçenekler">
      ${button('tutorial-restart', 'Baştan başla', { className: 'ghost' })}
      ${button('tutorial-unguided', 'İpucu olmadan dene', { className: 'ghost' })}
      ${button('tutorial-exit', 'Proje aç', { className: 'primary', glyph: 'folder', suffix: 'arrow' })}
    </div>
  </div>`;
}

export function tutorialCard(coach: FirstTaskTutorial): string {
  if (coach.phase === 'idle') return '';
  const body = coach.phase === 'active' ? activeCard(coach) : coach.phase === 'paused' ? pausedCard() : finishedCard();
  return `<section class="tutorial-card" data-phase="${coach.phase}" aria-labelledby="tutorial-title">${header(coach)}${body}</section>`;
}
