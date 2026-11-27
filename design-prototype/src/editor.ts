import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/editor/contrib/hover/browser/hoverContribution.js';
import 'monaco-editor/editor/contrib/find/browser/findController.js';
import 'monaco-editor/languages/definitions/typescript/register.js';
import { typescriptDefaults, ScriptTarget, ModuleResolutionKind } from 'monaco-editor/languages/features/typescript/register.js';
import CoreWorker from 'monaco-editor/editor/editor.worker.js?worker';
import TypeScriptWorker from 'monaco-editor/languages/features/typescript/ts.worker.js?worker';
import type { Files } from './project.ts';

globalThis.MonacoEnvironment = {
  getWorker: (_moduleId, label) => label === 'typescript' || label === 'javascript'
    ? new TypeScriptWorker()
    : new CoreWorker(),
};

typescriptDefaults.setCompilerOptions({
  target: ScriptTarget.ESNext,
  moduleResolution: ModuleResolutionKind.NodeJs,
  strict: true,
  noEmit: true,
});

monaco.editor.defineTheme('intention-dark', {
  base: 'vs-dark', inherit: true,
  rules: [
    { token: 'comment', foreground: 'A4A5BB' },
    { token: 'keyword', foreground: 'D4B8FF' },
    { token: 'type', foreground: 'A6C5FF' },
    { token: 'string', foreground: 'F1C590' },
    { token: 'number', foreground: 'AFDFC0' },
  ],
  colors: {
    'editor.background': '#12141C',
    'editor.foreground': '#E6E4EF',
    'editorLineNumber.foreground': '#9A9BB4',
    'editorLineNumber.activeForeground': '#D9CFFF',
    'editor.lineHighlightBackground': '#1C1E2A',
    'editor.selectionBackground': '#4F426F',
    'editorCursor.foreground': '#D0C1FF',
    'editorIndentGuide.background1': '#2A2D3D',
    'editorIndentGuide.activeBackground1': '#5E537C',
  },
});
monaco.editor.defineTheme('intention-light', {
  base: 'vs', inherit: true,
  rules: [
    { token: 'comment', foreground: '59526B' },
    { token: 'keyword', foreground: '5A37A3' },
    { token: 'type', foreground: '235599' },
    { token: 'string', foreground: '80520F' },
    { token: 'number', foreground: '156141' },
  ],
  colors: {
    'editor.background': '#F8F7FC',
    'editor.foreground': '#211D30',
    'editorLineNumber.foreground': '#5D5772',
    'editorLineNumber.activeForeground': '#5A37A3',
    'editor.lineHighlightBackground': '#EEEBF8',
    'editor.selectionBackground': '#DDD0F2',
    'editorCursor.foreground': '#5A37A3',
    'editorIndentGuide.background1': '#DFD9E9',
  },
});

export function mountEditor(host: HTMLElement, onEdit: (path: string, text: string) => void) {
  const workspaces = new Map<string, Map<string, monaco.editor.ITextModel>>();
  const viewStates = new Map<monaco.editor.ITextModel, monaco.editor.ICodeEditorViewState | null>();
  let updating = false;
  let activePath = '';
  let activeScope = '';
  let readOnly = false;
  const editor = monaco.editor.create(host, {
    model: null,
    theme: 'intention-dark',
    automaticLayout: true,
    ariaLabel: 'Monaco kod düzenleyicisi',
    accessibilitySupport: 'auto',
    tabFocusMode: true,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 13,
    lineHeight: 20,
    fontLigatures: false,
    tabSize: 2,
    minimap: { enabled: false },
    lineNumbersMinChars: 3,
    glyphMargin: false,
    folding: false,
    scrollBeyondLastLine: false,
    renderLineHighlight: 'line',
    renderLineHighlightOnlyWhenFocus: true,
    overviewRulerLanes: 0,
    padding: { top: 7, bottom: 7 },
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
    wordWrap: 'off',
    stickyScroll: { enabled: false },
    contextmenu: true,
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
  });

  editor.onDidChangeModelContent(() => {
    if (!updating && !readOnly && activePath) onEdit(activePath, editor.getValue());
  });

  function sync(files: Files, path: string, scope: string, locked: boolean): void {
    updating = true;
    try {
      let models = workspaces.get(scope);
      if (!models) {
        models = new Map();
        workspaces.set(scope, models);
      }
      for (const [name, content] of Object.entries(files)) {
        const existing = models.get(name);
        if (!existing) {
          const uri = monaco.Uri.from({ scheme: 'file', path: `/${scope}/${name}` });
          models.set(name, monaco.editor.createModel(content, /\.tsx?$/i.test(name) ? 'typescript' : 'plaintext', uri));
        } else if (existing.getValue() !== content) {
          existing.setValue(content);
        }
      }
      const model = models.get(path) ?? null;
      const previous = editor.getModel();
      if (previous !== model) {
        if (previous) viewStates.set(previous, editor.saveViewState());
        editor.setModel(model);
        const view = model && viewStates.get(model);
        if (view) editor.restoreViewState(view);
      }
      for (const [name, stale] of models) {
        if (Object.hasOwn(files, name)) continue;
        viewStates.delete(stale);
        models.delete(name);
        stale.dispose();
      }
      activePath = path;
      activeScope = scope;
      readOnly = locked || !model;
      editor.updateOptions({ readOnly, ariaLabel: path ? `${path} · ${readOnly ? 'salt okunur' : 'kod düzenleyicisi'}` : 'Dosya seçilmedi' });
      editor.layout();
    } finally {
      updating = false;
    }
  }

  return {
    sync,
    reset(scope: string) {
      if (scope === activeScope) {
        editor.setModel(null);
        activePath = '';
      }
      for (const model of workspaces.get(scope)?.values() ?? []) {
        viewStates.delete(model);
        model.dispose();
      }
      workspaces.delete(scope);
    },
    focus(line?: number) {
      if (line) {
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.revealLineInCenterIfOutsideViewport(line);
      }
      editor.focus();
    },
    theme(isLight: boolean) {
      monaco.editor.setTheme(isLight ? 'intention-light' : 'intention-dark');
    },
  };
}
