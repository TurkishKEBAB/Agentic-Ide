import type { RecentWorkspace, SetupSummary } from '../../src/shared/ipc-contract';
import { button, escapeHtml, icon } from './markup.ts';

export function recentWorkspaces(projects: readonly RecentWorkspace[]): string {
  if (projects.length === 0) return '';
  return `<section class="native-recents" aria-label="Son projeler">
    <h2>Son projeler</h2>
    <ul>${projects.map(project => `<li>${button('open-recent', escapeHtml(project.name), {
      value: project.id, glyph: 'folder', className: 'ghost',
    })}</li>`).join('')}</ul>
  </section>`;
}

export function setupView(setup: SetupSummary, message: string, error: boolean): string {
  return `<div class="native-setup">
    ${message ? `<p class="setup-message" role="${error ? 'alert' : 'status'}">${escapeHtml(message)}</p>` : ''}
    <section class="setup-section" aria-labelledby="setup-profile-title">
      <h3 id="setup-profile-title">Model profili</h3>
      <p class="setup-current">${icon(setup.profile === 'local-only' ? 'chip' : 'cloud')}
        <strong>${setup.profile === 'local-only' ? 'Yalnızca yerel' : 'Manuel hibrit'}</strong>
      </p>
      ${setup.profile === 'manual-hybrid' ? button('setup-local', 'Yalnızca yerele geç', { className: 'ghost' }) : ''}
    </section>
    <section class="setup-section" aria-labelledby="setup-cloud-title">
      <h3 id="setup-cloud-title">Anthropic</h3>
      ${setup.cloudConfigured ? `<p>API anahtarı kayıtlı.</p>${button('setup-remove-key', 'Bulut anahtarını kaldır', { className: 'ghost' })}` : ''}
      ${setup.cloudAvailable ? cloudForm(setup.cloudConfigured) : '<p>Güvenli depolama kullanılamıyor. Yerel profille devam edebilirsin.</p>'}
    </section>
    ${recentWorkspaces(setup.recentWorkspaces)}
  </div>`;
}

function cloudForm(configured: boolean): string {
  return `<form class="setup-cloud" id="setup-cloud">
    <label for="setup-key">${configured ? 'Yeni Anthropic API anahtarı' : 'Anthropic API anahtarı'}</label>
    <input id="setup-key" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="4096" required />
    <label class="setup-consent"><input id="setup-consent" type="checkbox" required />
      <span>Bulut modelini seçtiğimde ilgili çalışma alanı bağlamının Anthropic’e gönderilmesine izin veriyorum.</span>
    </label>
    <button type="submit" class="button primary">${configured ? 'Anahtarı güncelle' : 'Bulut profilini etkinleştir'}</button>
  </form>`;
}
