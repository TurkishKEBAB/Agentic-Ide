import { button, escapeHtml as h, icon } from './markup.ts';
import { milestoneLabels, type ChangeSet, type HistoryFrame, type UndoConflict } from './history.ts';
import { redactSecrets } from './safety.ts';
import type { WorkspaceState } from './state.ts';

export interface Snapshot { id: string; frame: number; }

export function timeLabel(time: number): string {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' }).format(time);
}

export function historyStrip(state: WorkspaceState, snapshot: Snapshot | null): string {
  if (!state.open) return '<span class="quiet">Henüz bir değişiklik seti yok.</span>';
  return `<button class="history-chip" type="button" data-act="history-open" data-value="initial" aria-pressed="${snapshot?.id === 'initial'}">${icon('eye', 13)} Başlangıç</button>`
    + state.history.slice(-4).map(set => {
      const frame = set.frames.at(-1)!;
      const solid = frame.stage === 'applied' || frame.stage === 'reverted';
      return `<button class="history-chip ${solid ? 'solid' : 'proposed'}" type="button" data-act="history-open" data-value="${set.id}" aria-pressed="${snapshot?.id === set.id}" title="${h(set.request.text)}">
        <span class="dot"></span><code>${set.id}</code> ${milestoneLabels[frame.stage]}</button>`;
    }).join('')
    + (state.history.length ? button('history-menu', 'Tüm setler', { glyph: 'list', className: 'ghost mini' }) : '');
}

export function historyList(state: WorkspaceState): string {
  return `<p class="sheet-intro">Bir seti açarak o andaki kodu gör. Geri alma işlemi için ayrı bir düğme kullan.</p>
    <div class="history-list">${state.history.toReversed().map(set => {
      const frame = set.frames.at(-1)!;
      return `<article>
        <span class="state-outline ${set.applied ? 'solid' : 'proposed'}">${milestoneLabels[frame.stage]}</span>
        <div><code>${set.id} · ${timeLabel(frame.time)}</code><h3>${h(set.request.text)}</h3></div>
        ${button('history-open', 'Görüntüle', { value: set.id, glyph: 'eye', className: 'ghost' })}
        ${set.applied && set.reverted === undefined ? button('undo', 'Geri al', { value: set.id, glyph: 'back', className: 'ghost', disabled: !state.canRollback(set.id) }) : ''}
      </article>`;
    }).join('') || '<p>Henüz bir değişiklik seti yok.</p>'}
    ${button('history-open', 'Başlangıç kodunu görüntüle', { value: 'initial', glyph: 'eye', className: 'ghost' })}</div>`;
}

export function historyIntent(set: ChangeSet | undefined, frame: HistoryFrame | undefined): string {
  return `<div class="intent-top"><div class="eyebrow intent-kicker">${icon('history', 16)} GEÇMİŞ GÖRÜNTÜSÜ <span>/</span> ${set?.id ?? 'BAŞLANGIÇ'}</div>
    <span class="state-outline">${icon('lock', 13)} Salt okunur</span></div>
    <h1>${set ? h(set.request.text) : 'Çalışma alanının başlangıcı'}</h1>
    <p class="lede">${frame ? `${milestoneLabels[frame.stage]} · ${timeLabel(frame.time)} · ${h(frame.detail)}` : 'Projenin ilk dosya içerikleri.'}</p>`;
}

export function snapshotBar(set: ChangeSet | undefined, frame: number, canRollback: boolean): string {
  return `<div class="snapshot-bar">
    <div class="snapshot-steps" role="group" aria-label="Setin geçmiş adımları">${set?.frames.map((item, index) =>
      `<button type="button" data-act="history-frame" data-value="${index}"${frame === index ? ' aria-current="step"' : ''} title="${h(item.detail)}">
        ${String(index + 1).padStart(2, '0')} ${milestoneLabels[item.stage]}${item.stage === 'plan' && item.revision ? ` v${item.revision}` : ''}
      </button>`).join('') ?? '<span class="quiet">İlk içerik</span>'}</div>
    <div class="snapshot-actions">
      ${set && canRollback ? button('undo', 'Bu seti geri al', { value: set.id, glyph: 'back', className: 'ghost' }) : ''}
      ${button('return-live', 'Canlıya dön', { suffix: 'arrow', className: 'primary' })}
    </div>
  </div>`;
}

export function setReceipt(set: ChangeSet, canRollback: boolean): string {
  const last = set.frames.at(-1)!;
  const reverted = set.reverted !== undefined;
  return `<section class="panel receipt-panel">
    <div class="panel-head"><span class="tile-icon">${icon(reverted ? 'history' : 'check', 20)}</span><div><p class="eyebrow section-kicker">DEĞİŞİKLİK SETİ</p><h2>${reverted ? 'Set geri alındı' : 'Set uygulandı'}</h2></div>
    <span class="state-outline solid">${set.id}</span></div>
    <p class="lede">${h(last.detail)}</p>
    <div class="receipt-files">${set.applied?.changes.map(change => `<span>${icon('file', 13)}<code>${h(change.path)}</code></span>`).join('')}</div>
    <div class="plan-actions">${button('history-open', 'Seti görüntüle', { value: set.id, glyph: 'eye', className: 'ghost' })}
      ${canRollback ? button('undo', 'Bu seti geri al', { value: set.id, glyph: 'back', className: 'ghost undo-button' }) : ''}</div>
  </section>`;
}

export function conflictView(conflicts: UndoConflict[]): string {
  return `<div class="notice amber">${icon('alert')}<span><strong>Geri alma durdu</strong><small>Sonraki bir elle düzenleme, ters yamanın dokunduğu satırlarla çakışıyor. Tüm dosyaların canlı içeriği korundu.</small></span></div>
    <div class="conflict-list">${conflicts.map(conflict => `<article>
      <div class="detail-group-head"><h3><code>${h(conflict.path)}:${conflict.line}</code></h3></div>
      <div class="conflict-code"><div><span>UYGULANAN</span><pre>${h(conflict.expected.map(redactSecrets).join('\n') || '(satır yok)')}</pre></div>
        <div><span>CANLI DÜZENLEME</span><pre>${h(conflict.current.map(redactSecrets).join('\n') || '(satır silindi)')}</pre></div></div>
      ${button('resolve-conflict', 'Canlı dosyada aç', { value: `${conflict.path}:${conflict.line}`, glyph: 'pen', className: 'ghost' })}
    </article>`).join('')}</div>`;
}
