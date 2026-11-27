import { redactSecrets } from './safety.ts';
import { approvalTime } from './review.ts';
import { button, escapeHtml as h, fileName, icon } from './markup.ts';
import { documentationRequest, planChanges, type Change, type Plan, type Source } from './plan.ts';
import { syntax } from './project.ts';
import { exampleRequest, modelLabels, type WorkspaceState } from './state.ts';

export function intentView(plan: Plan | null): string {
  if (!plan) return `
    <div class="eyebrow intent-kicker">${icon('target', 15)} NİYET SAYFASI <span>/</span> HAZIR</div>
    <h1>Yeni bir niyet aç</h1>
    <p class="lede">Kodunu keşfet veya tek giriş satırına ajandan istediğin değişikliği yaz.</p>`;
  const { request } = plan;
  const title = request.text === exampleRequest ? 'AuthSession arayüzüne <em>expiresAt</em> ekle' : h(request.text);
  return `
    <div class="intent-top">
      <div class="eyebrow intent-kicker">${icon('target', 15)} NİYET SAYFASI <span>/</span> ${request.id}</div>
      <span class="workspace-note">${icon('layers', 14)} Bellek içi çalışma alanı</span>
    </div>
    <h1>${title}</h1>
    <p class="lede">${request.text === documentationRequest ? 'Giriş akışının süre sabitini hangi amaçla kullandığını kodda belirt.' : 'Oturum sözleşmesini ve iki kullanımını aynı değişiklik setinde güncelle.'}</p>`;
}

export function workflowView(plan: Plan, position: number): string {
  const stages = [
    ['İstek', 'request-detail'], ['Plan', 'plan-detail'], ['Diff', 'review'],
    ['Kontroller', 'safety'], ['Uygulama', 'apply-view'],
  ];
  return `<nav class="workflow" aria-label="Değişiklik süreci">${stages.map(([name, action], index) =>
    `<button type="button" class="workflow-step ${index === position ? 'current' : index < position ? 'done' : ''}" data-act="${action}"${index === position ? ' aria-current="step"' : ''}>
      <span class="workflow-num">${index < position ? icon('check', 13) : String(index + 1).padStart(2, '0')}</span><span>${name}</span>${index === position ? '<span class="sr-only"> · Geçerli adım</span>' : ''}
    </button>`).join('')}<span class="workflow-revision">PLAN / v${plan.revision}</span></nav>`;
}

export function requestDetail(plan: Plan): string {
  return `<p class="sheet-intro">Ajan bu kullanıcı isteğiyle başlatıldı.</p>
    <div class="request-quote"><span class="eyebrow">${plan.request.id} · İSTEK</span><p>${h(plan.request.text)}</p><small>${modelLabels[plan.request.model]} · Simülasyon</small></div>`;
}

export function planDetail(plan: Plan): string {
  return `<p class="sheet-intro">v${plan.revision} · ${modelLabels[plan.request.model]} · ${planChanges(plan).length} dosya</p>
    <div class="plan-details">${plan.groups.map(group => `
      <section class="detail-group">
        <div class="detail-group-head"><h3>${h(group.title)}</h3>${group.linked ? '<span class="tag">Bağlı grup</span>' : ''}</div>
        <p>${h(group.detail)}</p>
        ${group.changes.map(change => `<div class="detail-change"><code>${h(change.path)}</code><strong>${h(change.title)}</strong><p>${h(change.reason)}</p></div>`).join('')}
      </section>`).join('')}</div>`;
}

export function planPanel(plan: Plan, state: WorkspaceState): string {
  const stale = state.planStale;
  const ready = state.canApply();
  const changes = planChanges(plan);
  const core = plan.groups.find(group => group.id === 'core') ?? plan.groups[0];
  return `<section class="panel plan-panel" aria-labelledby="plan-title">
    <div class="panel-head">
      <span class="tile-icon">${icon('list', 19)}</span>
      <div><p class="eyebrow section-kicker">02 / ÖNERİ</p><h2 id="plan-title">Plan <span class="version">v${plan.revision}</span></h2></div>
      ${iconButtonPlan()}
    </div>
    <div class="plan-meta"><span>${changes.length} dosya</span><span>${plan.groups.length} grup</span>${plan.groups.some(group => group.linked) ? `<span>${icon('link', 13)} Bağlı grup</span>` : ''}</div>
    <ol class="plan-rows">${core?.changes.map((change, index) => `<li>
      <span class="plan-index">${String(index + 1).padStart(2, '0')}</span>
      <div><h3>${h(change.title)}</h3><p>${h(change.reason)}</p></div>
      <code>${h(fileName(change.path))}</code>
    </li>`).join('') || '<li class="quiet">Oturum sözleşmesi için yeni yama yok.</li>'}</ol>
    ${plan.variant === 'initial' ? `<button type="button" data-act="safety" class="notice amber compact-notice">${icon('alert', 16)} <span><strong>Bir adım kontrol gerektiriyor</strong><small><code>.env</code> · Korumalı dosya</small></span>${icon('right', 14)}</button>` : ''}
    ${stale ? `<div class="notice amber">${icon('pen')} <span>İçerik değişti. Bu planı yeniden oluştur.</span></div>` : ''}
    ${state.approval ? `<div class="main-approval">${approvalTime(state)}</div>` : ''}
    ${state.approvalNotice && !stale ? `<p class="approval-message">${h(state.approvalNotice)}</p>` : ''}
    <div class="plan-actions">${button(ready ? 'apply' : stale ? 'revise-plan' : 'review', ready ? 'Onaylı yamayı uygula' : stale ? 'Planı yenile' : 'Diff’i incele', { glyph: ready ? 'check' : stale ? 'history' : 'diff', suffix: 'arrow', className: 'primary' })}
      ${button(ready ? 'review' : 'plan-detail', ready ? 'Diff’i gör' : 'Plan ayrıntısı', { className: 'ghost' })}
      ${button('cancel-task', 'Görevi iptal et', { className: 'ghost' })}</div>
  </section>`;
}

function iconButtonPlan(): string {
  return `<span class="state-outline proposed"><span class="dot"></span> Önerildi</span>`;
}

export function sourcePanel(sources: Source[]): string {
  return `<section class="panel source-panel" aria-labelledby="source-title">
    <div class="panel-head"><span class="tile-icon">${icon('target', 18)}</span>
      <div><p class="eyebrow section-kicker">DAYANAK</p><h2 id="source-title">Bağlam kaynakları</h2></div>
      <span class="source-count">${sources.length}</span>
    </div>
    <div class="source-list">${sources.map(source => `<button type="button" data-act="inspect-source" data-value="${h(source.path)}" aria-label="${h(source.path)}, satır ${source.from}–${source.to}, bağlamı aç">
      <span class="source-index">${icon('file', 14)}</span><code>${h(fileName(source.path))}</code><span class="range">L${source.from}–${source.to}</span>${icon('upRight', 13)}
    </button>`).join('')}</div>
  </section>`;
}

export function sourceDetail(source: Source): string {
  return `<p class="sheet-intro">${h(source.reason)}</p>
    <div class="source-code"><div><code>${h(source.path)}</code><span class="range">L${source.from}–${source.to}</span></div>
      <pre>${source.lines.map((line, index) => `<span class="source-code-line"><span aria-hidden="true">${source.from + index}</span><code>${syntax(line, h)}</code></span>`).join('')}</pre></div>
    <div class="sheet-actions">${button('focus-source', 'Monaco’da aç', { value: source.path, glyph: 'code', suffix: 'upRight', className: 'primary' })}</div>`;
}

export function sourcePreview(source: Source): string {
  const line = source.lines[source.focus - source.from] ?? '';
  return `<button type="button" class="preview-row" data-act="inspect-source" data-value="${h(source.path)}">
    <span class="ts-mark">TS</span><span><code>${h(source.path)} <span class="range">L${source.from}–${source.to}</span></code>
    <span class="why-line"><b>Neden burada</b> ${h(source.reason)}</span>
    <small>${syntax(line, h)}</small></span>${icon('upRight', 15)}</button>`;
}

export function proposalView(change: Change, revision: number, applied = false): string {
  const line = change.after.split('\n').find(value => value.includes('expiresAt') && !change.before.split('\n').includes(value))
    ?? change.after.split('\n').find(value => value && !change.before.split('\n').includes(value));
  if (!line) return '';
  return `<div class="proposal-frame ${applied ? 'applied' : ''}">
    ${applied ? '' : '<span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>'}
    <div class="proposal-top"><span>${icon(applied ? 'check' : 'spark', 14)} ${applied ? 'UYGULANDI' : 'ÖNERİLDİ'} <i></i> PLAN v${revision}</span>
      ${applied ? '<span>Set ile işlendi</span>' : button('review-file', 'Farkı aç', { value: change.path, className: 'ghost mini', suffix: 'upRight' })}
    </div>
    <div class="proposal-code"><span aria-hidden="true">+</span><code>${syntax(redactSecrets(line.trimStart()), h)}</code></div>
  </div>`;
}
