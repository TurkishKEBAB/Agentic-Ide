import { type ChangeSet } from './history.ts';
import { button, escapeHtml as h, icon, type Icon } from './markup.ts';
import { paths } from './project.ts';

export type VisionCard = 'tests' | 'verifier' | 'note' | 'risk';

const cards: { id: VisionCard; glyph: Icon; title: string; description: string; action: string }[] = [
  { id: 'tests', glyph: 'flask', title: 'Test kanıtı', description: 'Uygulanan setin test sonuçları, kanıt olarak aynı kayda eklenir.', action: 'Test sonuçlarını aç' },
  { id: 'verifier', glyph: 'shield', title: 'İkinci ajan', description: 'Bağımsız bir doğrulayıcı, dosyalar arası tutarlılığı inceler.', action: 'Görüşü aç' },
  { id: 'note', glyph: 'note', title: 'Proaktif not', description: 'Sessiz bir not var. Açtığında bir takip isteği hazırlayabilirsin.', action: 'Notu aç' },
  { id: 'risk', glyph: 'scales', title: 'Riske göre onay', description: 'Risk arttığında, açık onaydan önce dosya dosya inceleme yapılır.', action: 'İki yolu karşılaştır' },
];

export const visionBadge = '<span class="vision-badge">Vizyon · MVP dışı</span>';

export function visionPanel(): string {
  return `<section class="panel vision-peek"><div class="panel-head"><span class="tile-icon">${icon('spark', 18)}</span><div><p class="eyebrow section-kicker">08 / KANIT</p><h2>Vizyon katmanı</h2></div></div>
    <p>Test kanıtı, doğrulayıcı ve proaktif not.</p>
    <div>${visionBadge}${button('vision', 'Kartları aç', { className: 'ghost mini', suffix: 'upRight' })}</div></section>`;
}

export function visionOverview(set: ChangeSet | undefined): string {
  return `<div class="vision-intro"><p class="sheet-intro">${set?.applied ? `<code>${set.id}</code> · ${set.example ? 'Önceden uygulanmış demo kaydı' : 'Uygulanan set'}` : 'Dört örnek özellik. Kanıt kartı bir set uygulandığında açılır.'}</p></div>
    <div class="vision-grid">${cards.map(card => `<article class="vision-card">
      <div class="vision-card-top"><span class="tile-icon">${icon(card.glyph, 21)}</span>${visionBadge}</div>
      <h3>${card.title}</h3><p>${card.description}</p>
      ${button('vision-card', card.action, { value: card.id, className: 'ghost', suffix: 'arrow', disabled: card.id === 'tests' && !set?.applied })}
    </article>`).join('')}</div>`;
}

function testEvidence(set: ChangeSet | undefined): string {
  const applied = set?.frames.findLast(frame => frame.stage === 'applied');
  if (!set || !applied) return '<p>Kanıt kartı bir set uygulandığında açılır.</p>';
  const checks = [
    ['Oturum tipi bitiş tarihini içeriyor', /expiresAt:\s*Date/.test(applied.files[paths.session] ?? '')],
    ['Giriş bitiş tarihini üretiyor', /new Date\(Date\.now\(\) \+ SESSION_TTL_MS\)/.test(applied.files[paths.login] ?? '')],
    ['Ara katman süresi dolan oturumu reddediyor', /expiresAt\.getTime\(\) > Date\.now\(\)/.test(applied.files[paths.middleware] ?? '')],
  ] as const;
  const passed = checks.filter(([, result]) => result).length;
  return `<div class="vision-result"><strong>${passed}/${checks.length} kontrol geçti</strong><p>Sentetik test kanıtı · ${set.id} uygulama görüntüsü</p></div>
    <ul class="vision-checks">${checks.map(([name, result]) => `<li>${icon(result ? 'check' : 'alert', 16)} <span>${name}</span><b>${result ? 'Geçti' : 'Eksik'}</b></li>`).join('')}</ul>`;
}

export function visionDetail(card: VisionCard, set: ChangeSet | undefined): { title: string; body: string } {
  const title = cards.find(item => item.id === card)!.title;
  const content = card === 'tests' ? testEvidence(set)
    : card === 'verifier' ? `<div class="vision-result"><strong>${set?.applied ? 'Bağlı grup bütünlüğü incelendi' : 'Örnek doğrulayıcı görüşü'}</strong><p>Bağımsız doğrulayıcı · Simüle edilmiş değerlendirme</p></div>
      <p class="vision-detail-copy">Arayüzdeki bitiş tarihi, girişte üretilen değer ve ara katmandaki karşılaştırma aynı sözleşmeyi izliyor. Doğrulayıcı eşitlik sınırının testte açıkça belirtilmesini öneriyor.</p>`
      : `<div class="vision-result"><strong>Süre sabitinin amacını belgele</strong><p>Oturum süresinin kaynağı <code>src/auth/token.ts</code> dosyasında. Kısa bir yorum, bu sabitin giriş sırasında kullanıldığını görünür kılar.</p></div>
      <div class="sheet-actions">${button('vision-note-request', 'Giriş satırında isteği hazırla', { className: 'primary', glyph: 'terminal', suffix: 'arrow' })}</div>`;
  return { title, body: `<div class="vision-detail-head">${visionBadge}${button('vision', 'Tüm kartlar', { className: 'ghost mini', glyph: 'back' })}</div>${content}` };
}

export function riskView(high: boolean, checked: ReadonlySet<string>, confirmed: boolean): string {
  const reviewFiles = [paths.session, paths.login, paths.middleware];
  return `<div class="vision-detail-head">${visionBadge}${button('vision', 'Tüm kartlar', { className: 'ghost mini', glyph: 'back' })}</div>
    <div class="segmented risk-switch" role="group" aria-label="Örnek risk seviyesi">
      <button type="button" data-act="vision-risk-mode" data-value="low" aria-pressed="${!high}">Düşük risk</button>
      <button type="button" data-act="vision-risk-mode" data-value="high" aria-pressed="${high}">Yüksek risk</button>
    </div>
    <p class="vision-detail-copy">${high ? 'Her dosyanın inceleme kararını işaretle, sonra bağlı gruba tek bir açık onay ver.' : 'Küçük değişiklik için tek bir açık onay yeterli.'}</p>
    ${high ? `<div class="risk-file-list">${reviewFiles.map(path => `<label><input type="checkbox" data-risk-file="${h(path)}"${checked.has(path) ? ' checked' : ''} /><code>${h(path)}</code><span>İncelendi</span></label>`).join('')}</div>` : ''}
    ${confirmed ? `<div class="vision-result"><strong>${icon('check')} Örnek onay kaydedildi</strong><p>Bu karar vizyon gösterimine aittir.</p></div>` : ''}
    <div class="sheet-actions">${button('vision-risk-approve', 'Örnek onay ver', { glyph: 'check', className: 'primary', disabled: confirmed || (high && checked.size !== reviewFiles.length) })}</div>`;
}
