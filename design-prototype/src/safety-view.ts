import { button, escapeHtml as h, icon, type Icon } from './markup.ts';
import type { Finding, SafetyReport } from './safety.ts';
import type { WorkspaceState } from './state.ts';

function findingList(findings: Finding[]): string {
  return findings.map(finding => `<span class="finding-path"><code>${h(finding.path)}${finding.line ? `:${finding.line}` : ''}</code>
    ${finding.rule === 'secret' ? '<code>sk_test_••••••••</code>' : ''}</span>`).join('');
}

function control(
  title: string, description: string, glyph: Icon, findings: Finding[], large = false, reviewed = false,
): string {
  const status = findings.length ? 'Engel' : large ? (reviewed ? 'İncelendi' : 'Zorunlu') : 'Temiz';
  return `<div class="control-row">
    <span class="control-icon ${findings.length || large ? 'warn' : ''}">${icon(glyph, 17)}</span>
    <div><h3>${title}</h3><p>${description}</p>${findingList(findings)}</div>
    <span class="control-status ${findings.length ? 'blocked' : large && !reviewed ? 'warn' : ''}">${status}</span>
  </div>`;
}

export function safetyView(state: WorkspaceState, report: SafetyReport): string {
  const blocked = report.blocking.length > 0;
  const large = report.large;
  const plan = state.plan!;
  const description = blocked
    ? 'Engelli adımı yeni bir plan sürümünden çıkar. Yeni diff ve yeni onay gerekir.'
    : large && !state.largeReviewed ? 'Bu yama için grup onayından önce ayrı bir inceleme kararı ver.' : 'Geçerli seçim için yazma kontrolleri tamamlandı.';
  return `<div class="safety-summary ${blocked ? 'blocked' : large && !state.largeReviewed ? 'warn' : ''}">
      <span class="tile-icon">${icon(blocked ? 'lock' : large ? 'alert' : 'shield', 24)}</span>
      <div><p class="eyebrow">${plan.request.id} · PLAN v${plan.revision}</p><h3>${blocked ? 'Uygulama engellendi' : large && !state.largeReviewed ? 'Zorunlu inceleme bekleniyor' : 'Yazma kontrolleri tamamlandı'}</h3><p>${description}</p></div>
    </div>
    <div class="control-list">
      ${control('Çalışma alanı sınırı', 'Yalnızca auth-lab içindeki göreli dosya yolları kabul edilir.', 'target', report.blocking.filter(finding => finding.rule === 'boundary'))}
      ${control('Korumalı dosya', '.env, anahtar dosyaları ve .agentignore kapsamı yazmaya kapalı.', 'lock', report.blocking.filter(finding => finding.rule === 'protected'))}
      ${control('Diff’te sır', 'Eklenen satırlarda kimlik bilgisi desenleri aranır.', 'shield', report.blocking.filter(finding => finding.rule === 'secret'))}
      ${control('Büyük düzenleme', `${report.files} dosya · ${report.lines} değişen satır. Eşik 20 dosya veya 500 satırın üzeridir.`, 'scales', [], large, state.largeReviewed)}
      ${report.blocking.some(finding => finding.rule === 'anchor') ? control('Bağlam değişti', 'Yama için gereken kod satırı bulunamadı. Dosyayı incele ve planı yenile.', 'file', report.blocking.filter(finding => finding.rule === 'anchor')) : ''}
    </div>
    <div class="sheet-actions">
      ${button('review', 'Diff’e dön', { glyph: 'diff', className: 'ghost' })}
      ${blocked ? button('safe-revision', 'Engelli adımı plandan çıkar', { glyph: 'history', suffix: 'arrow', className: 'primary', disabled: plan.anchorProblems.length > 0 })
        : large && !state.largeReviewed ? button('review-large', 'Büyük düzenlemeyi inceledim', { glyph: 'check', className: 'primary', disabled: !state.canReviewLarge })
          : ''}
    </div>
    <details class="demo-controls">
      <summary>Diğer güvenlik örnekleri</summary>
      <div>${button('safety-example', 'Çalışma alanı sınırı', { value: 'outside', className: 'ghost' })}
        ${button('safety-example', 'Büyük düzenleme', { value: 'large', className: 'ghost' })}
        ${button('safety-example', 'Korumalı dosya ve sır', { value: 'initial', className: 'ghost' })}</div>
    </details>`;
}
