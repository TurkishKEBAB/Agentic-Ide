import type { FileEntry, IpcError } from '../../shared/ipc-contract';
import { monaco } from './monaco-setup';
import { depthOf, languageForPath, messageForError } from './presentation';

export interface WorkspaceViewElements {
  readonly openButton: HTMLButtonElement;
  readonly workspaceName: HTMLElement;
  readonly tree: HTMLElement;
  readonly filePath: HTMLElement;
  readonly status: HTMLElement;
}

/** Wires the S1 read-only workflow: choose folder → list files → display one file. */
export class WorkspaceView {
  #activeButton: HTMLButtonElement | null = null;
  /** Incremented per file request and per workspace change; stale responses are dropped. */
  #requestGeneration = 0;

  constructor(
    private readonly elements: WorkspaceViewElements,
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
  ) {
    elements.openButton.addEventListener('click', () => {
      void this.chooseWorkspace();
    });
    // Enabled only once the handler exists (the Monaco bundle loads before this runs).
    elements.openButton.disabled = false;
  }

  /** Asks the main process for a folder; on success resets the view and lists the new tree. */
  async chooseWorkspace(): Promise<void> {
    this.elements.openButton.disabled = true;
    try {
      const result = await window.agentIde.chooseWorkspace();
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      if (result.value === null) {
        this.setStatus('Klasör seçimi iptal edildi.');
        return;
      }
      this.resetWorkspaceView(result.value.name);
      await this.refreshTree();
    } finally {
      this.elements.openButton.disabled = false;
    }
  }

  /** Re-lists the open workspace into the file tree. */
  async refreshTree(): Promise<void> {
    const generation = this.#requestGeneration;
    const listing = await window.agentIde.listFiles();
    if (generation !== this.#requestGeneration) {
      return;
    }
    if (!listing.ok) {
      this.showError(listing.error);
      return;
    }
    this.renderTree(listing.value.entries);
    const suffix = listing.value.truncated ? ' (liste sınırına ulaşıldı)' : '';
    this.setStatus(`${listing.value.entries.length} öğe listelendi${suffix}. Salt okunur.`);
  }

  /** Shows one file read-only; only the most recent request may update the editor. */
  async openFile(relativePath: string, button: HTMLButtonElement): Promise<void> {
    this.#requestGeneration += 1;
    const generation = this.#requestGeneration;
    const file = await window.agentIde.readFile(relativePath);
    if (generation !== this.#requestGeneration) {
      return;
    }
    if (!file.ok) {
      this.showError(file.error);
      return;
    }
    this.replaceModel(file.value.content, languageForPath(file.value.path));
    this.#activeButton?.removeAttribute('aria-current');
    button.setAttribute('aria-current', 'true');
    this.#activeButton = button;
    this.elements.filePath.textContent = file.value.path;
    this.setStatus(`${file.value.path} — ${file.value.sizeBytes} bayt, salt okunur.`);
  }

  /** Drops everything shown from the previous workspace (tree, file, pending requests). */
  private resetWorkspaceView(name: string): void {
    this.#requestGeneration += 1;
    this.#activeButton = null;
    this.elements.workspaceName.textContent = name;
    this.elements.tree.replaceChildren();
    this.elements.filePath.textContent = '';
    this.replaceModel('', 'plaintext');
  }

  private replaceModel(content: string, language: string): void {
    const previous = this.editor.getModel();
    this.editor.setModel(monaco.editor.createModel(content, language));
    previous?.dispose();
  }

  private renderTree(entries: readonly FileEntry[]): void {
    const list = document.createElement('ul');
    for (const entry of entries) {
      const item = document.createElement('li');
      item.style.paddingLeft = `${depthOf(entry.path) * 12}px`;
      const name = entry.path.slice(entry.path.lastIndexOf('/') + 1);
      if (entry.kind === 'directory') {
        const label = document.createElement('div');
        label.className = 'directory';
        label.textContent = `${name}/`;
        item.append(label);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = name;
        button.title = entry.path;
        button.dataset.path = entry.path;
        button.addEventListener('click', () => {
          void this.openFile(entry.path, button);
        });
        item.append(button);
      }
      list.append(item);
    }
    this.elements.tree.replaceChildren(list);
  }

  private setStatus(text: string): void {
    this.elements.status.removeAttribute('data-kind');
    this.elements.status.removeAttribute('data-code');
    this.elements.status.textContent = text;
  }

  private showError(error: IpcError): void {
    this.elements.status.dataset.kind = 'error';
    this.elements.status.dataset.code = error.code;
    this.elements.status.textContent = messageForError(error.code);
  }
}
