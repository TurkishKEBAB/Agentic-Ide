import './styles.css';

import { monaco } from './monaco-setup';
import { WorkspaceView } from './workspace-view';

const WELCOME_TEXT = [
  '// Agentic IDE — S1 güvenli editör kabuğu',
  '// "Klasör Aç" ile bir çalışma klasörü seçin ve bir dosyayı salt okunur görüntüleyin.',
  '// Bu sürümde ajan yazma yetkisi yoktur.',
  '',
].join('\n');

function requireElement<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`Missing #${id} element`);
  }
  return element;
}

const editor = monaco.editor.create(requireElement('editor', HTMLElement), {
  value: WELCOME_TEXT,
  language: 'typescript',
  readOnly: true,
  domReadOnly: true,
  automaticLayout: true,
  minimap: { enabled: false },
  theme: 'vs-dark',
  ariaLabel: 'Salt okunur kod editörü',
});

new WorkspaceView(
  {
    openButton: requireElement('open-folder', HTMLButtonElement),
    workspaceName: requireElement('workspace-name', HTMLElement),
    tree: requireElement('file-tree', HTMLElement),
    filePath: requireElement('file-path', HTMLElement),
    status: requireElement('status', HTMLElement),
  },
  editor,
);
requireElement('status', HTMLElement).textContent = 'Hazır — salt okunur.';
