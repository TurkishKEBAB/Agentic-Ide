import './styles.css';

import { monaco } from './monaco-setup';

const WELCOME_TEXT = [
  '// Agentic IDE — S1 güvenli editör kabuğu',
  '// Bu sürümde editör salt okunurdur; ajan yazma yetkisi yoktur.',
  '',
].join('\n');

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing #${id} element`);
  }
  return element;
}

const editor = monaco.editor.create(requireElement('editor'), {
  value: WELCOME_TEXT,
  language: 'typescript',
  readOnly: true,
  domReadOnly: true,
  automaticLayout: true,
  minimap: { enabled: false },
  theme: 'vs-dark',
  ariaLabel: 'Salt okunur kod editörü',
});
editor.focus();
requireElement('status').textContent = 'Hazır';
