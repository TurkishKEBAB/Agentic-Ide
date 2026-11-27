import { escapeHtml, fileName, icon } from './markup.ts';
import type { Files } from './project.ts';

export const commands = [
  ['/dosyalar', 'Çalışma setine dosya ekle'],
  ['/plan', 'Geçerli planı incele'],
  ['/diff', 'Önerilen yamayı aç'],
  ['/kontroller', 'Güvenlik kontrollerini aç'],
  ['/geçmiş', 'Değişiklik setlerini gör'],
  ['/tema', 'Temayı değiştir'],
  ['/vizyon', 'Vizyon kartlarını aç'],
  ['/yardım', 'İlk Görev ve klavye kısayolları'],
] as const;

export function matchingFiles(files: Files, query: string): string[] {
  const term = query.trim().toLowerCase();
  const rank = (path: string) => {
    const lower = path.toLowerCase();
    const name = fileName(lower);
    if (lower === term || name === term || name.replace(/\.ts$/, '') === term) return 0;
    if (lower.includes(term)) return 1;
    if (files[path]?.toLowerCase().includes(term)) return 2;
    return 3;
  };
  return Object.keys(files).map(path => ({ path, rank: rank(path) }))
    .filter(entry => entry.rank < 3).sort((a, b) => a.rank - b.rank).map(entry => entry.path);
}

interface Match {
  value: string;
  detail: string;
  mode: 'file' | 'command';
}

export function mountCommand(
  form: HTMLFormElement,
  input: HTMLInputElement,
  popup: HTMLElement,
  getFiles: () => Files,
  run: (value: string) => void,
): { refresh: () => void; hide: () => void } {
  let matches: Match[] = [];
  let active = -1;

  function hide(): void {
    matches = [];
    active = -1;
    popup.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function draw(): void {
    const visible = matches.length > 0;
    popup.hidden = !visible;
    input.setAttribute('aria-expanded', String(visible));
    popup.innerHTML = matches.map((match, i) => `
      <button type="button" tabindex="-1" role="option" id="command-match-${i}" data-match="${i}" aria-selected="${i === active}">
        ${icon(match.mode === 'file' ? 'file' : 'terminal', 15)}
        <code>${escapeHtml(match.value)}</code>
        <span>${escapeHtml(match.detail)}</span>
      </button>`).join('');
    if (active >= 0) input.setAttribute('aria-activedescendant', `command-match-${active}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function refresh(): void {
    if (input.disabled) return hide();
    const raw = input.value.trimStart();
    const query = raw.slice(1).trim().toLowerCase();
    if (raw.startsWith('@')) {
      const files = getFiles();
      matches = matchingFiles(files, query).slice(0, 40)
        .map(path => ({ value: `@${path}`, detail: 'Dosyayı aç', mode: 'file' }));
    } else if (raw.startsWith('/')) {
      matches = commands.filter(([command]) => command.includes(query))
        .map(([value, detail]) => ({ value, detail, mode: 'command' }));
    } else {
      hide();
      return;
    }
    active = -1;
    draw();
  }

  function submit(value: string): void {
    if (!value.trim() || input.disabled) return;
    input.value = '';
    hide();
    run(value.trim());
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    submit(matches[active]?.value ?? input.value);
  });
  input.addEventListener('input', refresh);
  input.addEventListener('focus', refresh);
  form.addEventListener('focusout', event => {
    if (!form.contains(event.relatedTarget as Node | null)) hide();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !popup.hidden) {
      event.stopPropagation();
      hide();
      return;
    }
    if (!matches.length || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    active = active < 0 ? (delta > 0 ? 0 : matches.length - 1) : (active + delta + matches.length) % matches.length;
    draw();
    document.getElementById(`command-match-${active}`)?.scrollIntoView({ block: 'nearest' });
  });
  popup.addEventListener('pointerdown', event => event.preventDefault());
  popup.addEventListener('click', event => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-match]');
    if (row) submit(matches[Number(row.dataset.match)]?.value ?? '');
  });
  document.addEventListener('pointerdown', event => {
    if (!form.contains(event.target as Node)) hide();
  });
  return { refresh, hide };
}
