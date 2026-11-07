export type NativeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } };

export interface NativeEntry {
  readonly path: string;
  readonly kind: 'file' | 'directory';
}

export interface NativeFileContent {
  readonly path: string;
  readonly content: string;
  readonly sizeBytes: number;
  readonly readOnly: boolean;
  readonly revision: string;
}

interface NativeWorkspace {
  readonly name: string;
}

interface NativeListing {
  readonly entries: readonly NativeEntry[];
  readonly truncated: boolean;
}

export interface NativeWorkspaceApi {
  chooseWorkspace(): Promise<NativeResult<NativeWorkspace | null>>;
  listFiles(): Promise<NativeResult<NativeListing>>;
  readFile(path: string): Promise<NativeResult<NativeFileContent>>;
  saveFile(path: string, content: string, expectedRevision: string): Promise<NativeResult<NativeFileContent>>;
}

type FileStatus = 'clean' | 'dirty' | 'saving' | 'conflict' | 'readonly';

interface OpenFile {
  snapshot: NativeFileContent;
  conflict: boolean;
}

function success<T>(value: T): NativeResult<T> {
  return { ok: true, value };
}

function failure(code: string, message: string): NativeResult<never> {
  return { ok: false, error: { code, message } };
}

const busy = () => failure('BUSY', 'A folder choice or file save is in progress.');
const stale = () => failure('STALE', 'A newer action superseded this request.');
const noWorkspace = () => failure('NO_WORKSPACE', 'No workspace folder is open.');
const notOpen = () => failure('NOT_FOUND', 'The file is not open.');

async function request<T>(operation: () => Promise<NativeResult<T>>): Promise<NativeResult<T>> {
  try {
    return await operation();
  } catch {
    return failure('INTERNAL', 'The workspace request could not be completed.');
  }
}

export class NativeFiles {
  readonly files: Record<string, string> = {};
  readonly #api: NativeWorkspaceApi;
  readonly #openFiles = new Map<string, OpenFile>();
  readonly #reads = new Map<string, symbol>();
  readonly #saves = new Set<string>();
  #name: string | null = null;
  #entries: readonly NativeEntry[] = [];
  #listing: symbol | undefined;
  #choosing = false;

  constructor(api: NativeWorkspaceApi) {
    this.#api = api;
    Object.setPrototypeOf(this.files, null);
  }

  get name(): string | null { return this.#name; }
  get entries(): readonly NativeEntry[] { return this.#entries; }

  /** Folder choices and saves cannot be superseded; reads and listings can. */
  get busy(): boolean { return this.#choosing || this.#saves.size > 0; }

  dirtyPaths(): string[] {
    return [...this.#openFiles].filter(([path, file]) => this.#dirty(path, file)).map(([path]) => path);
  }

  status(path: string): FileStatus | null {
    const file = this.#openFiles.get(path);
    if (!file) return null;
    if (this.#saves.has(path)) return 'saving';
    if (file.conflict) return 'conflict';
    if (this.#dirty(path, file)) return 'dirty';
    return file.snapshot.readOnly ? 'readonly' : 'clean';
  }

  /** The last verified disk snapshot, separate from the editable text in files. */
  metadata(path: string): NativeFileContent | null {
    return this.#openFiles.get(path)?.snapshot ?? null;
  }

  writable(path: string): boolean {
    return !this.#choosing && this.metadata(path)?.readOnly === false;
  }

  edit(path: string, text: string): boolean {
    if (!this.writable(path) || this.files[path] === text) return false;
    this.#reads.delete(path);
    this.files[path] = text;
    return true;
  }

  /** Call after confirming any drafts that would be discarded on a successful choice. */
  async choose(): Promise<NativeResult<NativeWorkspace | null>> {
    if (this.busy) return busy();
    this.#choosing = true;
    try {
      const result = await request(() => this.#api.chooseWorkspace());
      if (result.ok && result.value !== null) {
        this.#name = result.value.name;
        this.#entries = [];
        this.#listing = undefined;
        this.#reads.clear();
        this.#openFiles.clear();
        for (const path of Object.keys(this.files)) delete this.files[path];
      }
      return result;
    } finally {
      this.#choosing = false;
    }
  }

  async list(): Promise<NativeResult<NativeListing>> {
    if (this.#choosing) return busy();
    if (this.#name === null) return noWorkspace();
    const token = Symbol();
    this.#listing = token;
    const result = await request(() => this.#api.listFiles());
    if (this.#listing !== token) return stale();
    this.#listing = undefined;
    if (result.ok) this.#entries = result.value.entries;
    return result;
  }

  async open(path: string): Promise<NativeResult<NativeFileContent>> {
    if (this.#choosing) return busy();
    if (this.#name === null) return noWorkspace();
    const snapshot = this.metadata(path);
    return snapshot ? success(snapshot) : this.#read(path);
  }

  /** An explicit reload replaces the draft only if no newer action touches this file. */
  async reload(path: string): Promise<NativeResult<NativeFileContent>> {
    if (this.#choosing || this.#saves.has(path)) return busy();
    if (!this.#openFiles.has(path)) return notOpen();
    return this.#read(path);
  }

  async save(path: string): Promise<NativeResult<NativeFileContent>> {
    if (this.#choosing || this.#saves.has(path)) return busy();
    const file = this.#openFiles.get(path);
    if (!file) return notOpen();
    if (file.snapshot.readOnly) return failure('READ_ONLY', 'This file is read-only.');
    if (!this.#dirty(path, file)) return success(file.snapshot);

    const content = this.files[path];
    if (content === undefined) return notOpen();
    const revision = file.snapshot.revision;
    this.#reads.delete(path);
    this.#saves.add(path);
    try {
      const result = await request(() => this.#api.saveFile(path, content, revision));
      if (result.ok) {
        file.snapshot = result.value;
        file.conflict = false;
        if (this.files[path] === content) this.files[path] = result.value.content;
      } else if (result.error.code === 'TARGET_CHANGED') {
        file.conflict = true;
      }
      return result;
    } finally {
      this.#saves.delete(path);
    }
  }

  /** Call after confirming any draft discard. A pending save keeps the buffer open. */
  close(path: string): void {
    if (this.#saves.has(path)) return;
    this.#reads.delete(path);
    this.#openFiles.delete(path);
    delete this.files[path];
  }

  #dirty(path: string, file: OpenFile): boolean {
    return file.conflict || this.files[path] !== file.snapshot.content;
  }

  async #read(path: string): Promise<NativeResult<NativeFileContent>> {
    const token = Symbol();
    this.#reads.set(path, token);
    const result = await request(() => this.#api.readFile(path));
    if (this.#reads.get(path) !== token) return stale();
    this.#reads.delete(path);
    if (result.ok) {
      this.#openFiles.set(path, { snapshot: result.value, conflict: false });
      this.files[path] = result.value.content;
    }
    return result;
  }
}
