const glyphs = {
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  upRight: '<path d="M6 18 18 6M9 6h9v9"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  terminal: '<path d="m4 7 5 5-5 5m8 1h8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  history: '<path d="M3 12a9 9 0 1 1 3 6.7M3 12V6m0 6h6m3-5v5l3 2"/>',
  spark: '<path d="M12 2.5 14.7 9.3 21.5 12l-6.8 2.7-2.7 6.8-2.7-6.8L2.5 12l6.8-2.7L12 2.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.9 13.4A8.9 8.9 0 0 1 10.6 3.1 9 9 0 1 0 20.9 13.4Z"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/><rect x="10" y="10" width="4" height="4" rx=".5"/>',
  cloud: '<path d="M7 18a4 4 0 1 1 .4-8A5 5 0 0 1 17 9a4.5 4.5 0 0 1 .5 9Z"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
  shield: '<path d="M12 22c4-2 8-5 8-11V5l-8-3-8 3v6c0 6 4 9 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  alert: '<path d="M10.3 4.5 2.8 18a1.5 1.5 0 0 0 1.3 2.3h15.8a1.5 1.5 0 0 0 1.3-2.3L13.7 4.5a2 2 0 0 0-3.4 0ZM12 9v4m0 3h.01"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  link: '<path d="M10 13a4 4 0 0 0 5.7 0l3-3A4 4 0 1 0 13 4.3l-1.5 1.5m2.5 5.2a4 4 0 0 0-5.7 0l-3 3A4 4 0 1 0 11 19.7l1.5-1.5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  diff: '<path d="M4 7h7M7.5 3.5v7M13 17h7M7 17h.01M17 7h.01"/>',
  split: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/>',
  unified: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10m-10 4h10"/>',
  back: '<path d="M4 10h10a5 5 0 0 1 0 10h-2M4 10l5 5m-5-5 5-5"/>',
  eye: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  pen: '<path d="m4 16-1 5 5-1L20 8l-4-4L4 16Zm10-10 4 4"/>',
  note: '<path d="M5 3h14v14l-4 4H5zM9 8h6m-6 4h6m0 9v-4h4"/>',
  flask: '<path d="M9 3h6m-5 0v7L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M7 15h10"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>',
  scales: '<path d="M12 3v18m-7 0h14M4 7h16M4 7l-3 6h6L4 7Zm16 0-3 6h6l-3-6Z"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 14h6"/>',
} as const;

export type Icon = keyof typeof glyphs;

export function icon(name: Icon, size = 16): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${glyphs[name]}</svg>`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function fileName(path: string): string {
  return path.split('/').at(-1)!;
}

export function button(action: string, label: string, options: {
  className?: string; glyph?: Icon; value?: string; disabled?: boolean; suffix?: Icon;
} = {}): string {
  const { className = '', glyph, value, disabled, suffix } = options;
  return `<button type="button" class="button ${className}" data-act="${action}"${value === undefined ? '' : ` data-value="${escapeHtml(value)}"`}${disabled ? ' disabled' : ''}>${glyph ? icon(glyph) : ''}<span>${label}</span>${suffix ? icon(suffix) : ''}</button>`;
}

export function iconButton(action: string, label: string, glyph: Icon, value?: string): string {
  return `<button type="button" class="icon-button" data-act="${action}"${value === undefined ? '' : ` data-value="${escapeHtml(value)}"`} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon(glyph, 17)}</button>`;
}

export function select<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}
