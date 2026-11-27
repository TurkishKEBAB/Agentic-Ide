import { escapeHtml, icon } from './markup.ts';

export interface Entry {
  path: string;
  kind: 'directory' | 'file';
}

interface Branch extends Entry {
  name: string;
  children: Map<string, Branch>;
}

function fileRow(path: string, label: string): string {
  const escaped = escapeHtml(path);
  return `<li><button type="button" class="picker-row" data-act="pick-file" data-value="${escaped}" data-path="${escaped}" title="${escaped}">${icon('file', 15)}<span>${escapeHtml(label)}</span></button></li>`;
}

export function pickerRows(entries: readonly Entry[], query: string, tree: boolean): string {
  const term = query.trim().toLocaleLowerCase('tr');
  if (!tree || term) {
    const files = entries.filter(entry => entry.kind === 'file' && entry.path.toLocaleLowerCase('tr').includes(term));
    const list = files.slice(0, 200).map(entry => fileRow(entry.path, entry.path)).join('');
    return list ? `<ul class="picker-list">${list}</ul>${files.length > 200 ? '<p class="quiet">Sonuçları daraltmak için dosya adını yaz.</p>' : ''}` : '<p class="quiet">Eşleşen dosya bulunamadı.</p>';
  }

  const roots = new Map<string, Branch>();
  for (const entry of entries) {
    const segments = entry.path.split('/');
    let children = roots;
    for (const [index, name] of segments.entries()) {
      const kind = index === segments.length - 1 ? entry.kind : 'directory';
      let branch = children.get(name);
      if (!branch) {
        branch = { name, kind, path: segments.slice(0, index + 1).join('/'), children: new Map() };
        children.set(name, branch);
      }
      children = branch.children;
    }
  }

  function render(children: Map<string, Branch>, depth = 0): string {
    const sorted = [...children.values()].sort((a, b) =>
      Number(b.kind === 'directory') - Number(a.kind === 'directory') || a.name.localeCompare(b.name),
    );
    return `<ul class="picker-list">${sorted.map(branch => branch.kind === 'directory'
      ? `<li><details${depth < 2 ? ' open' : ''}><summary>${icon('folder', 15)} ${escapeHtml(branch.name)}</summary>${render(branch.children, depth + 1)}</details></li>`
      : fileRow(branch.path, branch.name)).join('')}</ul>`;
  }

  return roots.size ? render(roots) : '<p class="quiet">Bu klasörde açılabilir dosya bulunamadı.</p>';
}
