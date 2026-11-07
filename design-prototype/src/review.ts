import { button, escapeHtml as h, fileName, icon } from './markup.ts';
import { diffLines, patchCounts } from './patch.ts';
import type { Change, Plan } from './plan.ts';
import { redactSecrets } from './safety.ts';
import { syntax } from './project.ts';
import type { WorkspaceState } from './state.ts';

export type DiffMode = 'split' | 'unified';

interface DiffLine { number: number; text: string; }
interface DiffBlock { same: boolean; old: DiffLine[]; next: DiffLine[]; }

function blocks(change: Change): DiffBlock[] {
  const result: DiffBlock[] = [];
  let oldLine = 1;
  let nextLine = 1;
  for (const part of diffLines(change.before, change.after)) {
    const same = !part.removed && !part.added;
    let block = result.at(-1);
    if (!block || block.same !== same) {
      block = { same, old: [], next: [] };
      result.push(block);
    }
    for (const text of part.value) {
      if (!part.added) block.old.push({ number: oldLine++, text });
      if (!part.removed) block.next.push({ number: nextLine++, text });
    }
  }
  return result;
}

function diffCell(line: DiffLine | undefined, type: 'same' | 'removed' | 'added'): string {
  if (!line) return '<span class="diff-cell diff-blank" aria-hidden="true"></span>';
  const sign = type === 'added' ? '+' : type === 'removed' ? '−' : ' ';
  return `<span class="diff-cell ${type}"><span class="diff-number">${line.number}</span><span class="diff-sign">${sign}</span><code>${syntax(redactSecrets(line.text), h)}</code></span>`;
}

export function changeDiff(change: Change, mode: DiffMode): string {
  const content = blocks(change);
  if (mode === 'unified') return `<div class="diff-canvas unified" role="region" tabindex="0" aria-label="Birleşik diff">
    <div class="diff-labels"><span>BİRLEŞİK YAMA</span></div>
    <div class="diff-lines">${content.map(block => block.same
      ? block.next.map(line => diffCell(line, 'same')).join('')
      : block.old.map(line => diffCell(line, 'removed')).join('') + block.next.map(line => diffCell(line, 'added')).join('')).join('')}</div>
  </div>`;
  return `<div class="diff-canvas split" role="region" tabindex="0" aria-label="Yan yana diff">
    <div class="diff-labels"><span>ÖNCE</span><span>ÖNERİ</span></div>
    <div class="diff-lines">${content.map(block => Array.from({ length: Math.max(block.old.length, block.next.length) }, (_, index) =>
      `<div class="diff-row">${diffCell(block.old[index], block.same ? 'same' : 'removed')}${diffCell(block.next[index], block.same ? 'same' : 'added')}</div>`).join('')).join('')}</div>
  </div>`;
}

export function remaining(expiresAt: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function approvalTime(state: WorkspaceState): string {
  return state.approval
    ? `<span class="approval-time">${icon('clock', 15)} <strong data-lease-time>${remaining(state.approval.expiresAt)}</strong><span>kalan</span></span>`
    : '<span class="quiet">Onay verildiğinde 10:00 sürer.</span>';
}

function groupPicker(state: WorkspaceState, plan: Plan, activePath: string): string {
  return `<fieldset class="group-picker">
    <legend>Değişiklik grupları</legend>
    ${plan.groups.map(group => `<div class="group-box ${state.isSelected(group.id) ? 'selected' : ''}">
      <label class="group-label"><input type="checkbox" id="group-${group.id}" data-group="${group.id}"${state.isSelected(group.id) ? ' checked' : ''} />
        <span><strong>${h(group.title)}</strong><small>${group.linked ? 'Bağlı grup · ' : ''}${group.changes.length} dosya</small></span>
      </label>
      <div class="group-files">${group.changes.map(change => `<button type="button" data-act="review-file" data-value="${h(change.path)}"${change.path === activePath ? ' aria-current="true"' : ''} title="${h(change.path)}">${icon(group.linked ? 'link' : 'file', 13)}<code>${h(fileName(change.path))}</code></button>`).join('')}</div>
    </div>`).join('')}
    <p class="quiet">Bağlı dosyalar birlikte seçilir.</p>
  </fieldset>`;
}

export function reviewView(state: WorkspaceState, plan: Plan, change: Change, mode: DiffMode): string {
  const counts = patchCounts(change.before, change.after);
  const security = state.security!;
  const gate = security.blocking.length > 0
    ? `<div class="notice amber review-gate">${icon('shield')}<span><strong>Uygulama engellendi</strong><small>${security.blocking.length} engelleyici bulgu · Planın yeni sürümü gerekiyor.</small></span>${button('safety', 'Kontrolleri aç', { suffix: 'arrow', className: 'ghost' })}</div>`
    : security.large && !state.largeReviewed
      ? `<div class="notice amber review-gate">${icon('alert')}<span><strong>Büyük düzenleme</strong><small>${security.files} dosya · ${security.lines} değişen satır · Ayrı inceleme kararı gerekir.</small></span>${button('safety', 'Zorunlu inceleme', { suffix: 'arrow', className: 'ghost' })}</div>`
      : `<div class="review-ok">${icon('shield', 15)} ${security.large ? 'Büyük düzenleme incelendi' : 'Yazma kontrolleri temiz'}${button('safety', 'Kontrol ayrıntısı', { className: 'ghost mini', suffix: 'upRight' })}</div>`;
  return `<div class="review-meta"><span class="state-outline proposed">Önerildi</span><code>${plan.request.id} · PLAN v${plan.revision}</code><span>${state.selectedChanges.length} dosya seçili</span></div>
    <div class="review-grid">
      ${groupPicker(state, plan, change.path)}
      <section class="review-code" aria-label="Dosya yaması">
        <div class="review-file-head">
          <div><code>${h(change.path)}</code><span class="patch-count"><span>+${counts.added}</span> <span>−${counts.removed}</span></span></div>
          <div class="segmented" role="group" aria-label="Diff görünümü">
            <button type="button" data-act="diff-mode" data-value="split" aria-pressed="${mode === 'split'}">${icon('split', 14)} Yan yana</button>
            <button type="button" data-act="diff-mode" data-value="unified" aria-pressed="${mode === 'unified'}">${icon('unified', 14)} Birleşik</button>
          </div>
        </div>
        <p class="review-reason"><b>Gerekçe</b> ${h(change.reason)}</p>
        ${changeDiff(change, mode)}
      </section>
    </div>
    ${gate}
    <div class="decision-footer">
      <div class="decision-copy">${approvalTime(state)}${state.approvalNotice ? `<p>${h(state.approvalNotice)}</p>` : ''}</div>
      <div class="decision-buttons">
        ${button('cancel-task', 'Görevi iptal et', { className: 'ghost' })}
        ${state.approval ? button('expire-approval', 'Süre dolumunu göster', { glyph: 'clock', className: 'ghost' }) : ''}
        ${state.approval ? button('apply', 'Onaylı yamayı uygula', { glyph: 'check', suffix: 'arrow', className: 'primary', disabled: !state.canApply() }) : button('approve', 'Seçili grupları onayla', { glyph: 'check', className: 'primary', disabled: !state.canApprove })}
      </div>
    </div>`;
}
