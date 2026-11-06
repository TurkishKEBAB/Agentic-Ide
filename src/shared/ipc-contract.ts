/**
 * Typed IPC contract between the sandboxed renderer and the main-process broker (#33, S1).
 * The renderer can only call these named capabilities; there is no generic channel.
 * Paths crossing this boundary are always workspace-relative with `/` separators.
 */
export const IPC_CHANNELS = {
  chooseWorkspace: 'agent-ide:workspace/choose',
  listFiles: 'agent-ide:workspace/list-files',
  readFile: 'agent-ide:workspace/read-file',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

/** Broker-level failures plus the workspace policy codes from `src/main/workspace`. */
export type IpcErrorCode =
  | 'NO_WORKSPACE'
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED_SENDER'
  | 'INTERNAL'
  | 'INVALID_INPUT'
  | 'ABSOLUTE_PATH'
  | 'TRAVERSAL'
  | 'ENCODED_TRAVERSAL'
  | 'INVALID_SEGMENT'
  | 'OUTSIDE_WORKSPACE'
  | 'LINK_ESCAPE'
  | 'LINK_NOT_ALLOWED'
  | 'HARDLINK_UNSUPPORTED'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'NON_CANONICAL_PATH'
  | 'NOT_FOUND'
  | 'TARGET_CHANGED'
  | 'ROOT_UNSUPPORTED'
  | 'ROOT_CHANGED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_ENCODING'
  | 'IO_ERROR';

export interface IpcError {
  readonly code: IpcErrorCode;
  readonly message: string;
}

export type IpcResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: IpcError };

export interface WorkspaceSummary {
  /** Folder name only; the absolute path stays in the main process. */
  readonly name: string;
}

export interface FileEntry {
  /** Workspace-relative path with `/` separators. */
  readonly path: string;
  readonly kind: 'file' | 'directory';
}

export interface FileListing {
  readonly entries: readonly FileEntry[];
  /** True when the listing stopped at the entry/depth budget. */
  readonly truncated: boolean;
}

export interface FileContent {
  readonly path: string;
  readonly content: string;
  readonly sizeBytes: number;
  /** S1 has no write capability; the flag makes that explicit to the UI. */
  readonly readOnly: true;
}

/** The complete capability surface exposed on `window.agentIde`. */
export interface AgentIdeApi {
  /** Opens the native folder picker in the main process; `null` value when cancelled. */
  chooseWorkspace(): Promise<IpcResult<WorkspaceSummary | null>>;
  listFiles(): Promise<IpcResult<FileListing>>;
  readFile(relativePath: string): Promise<IpcResult<FileContent>>;
}
