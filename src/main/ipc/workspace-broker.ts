import type {
  FileContent,
  FileListing,
  IpcError,
  IpcResult,
  WorkspaceSummary,
} from '../../shared/ipc-contract';
import { DEFAULT_LIST_LIMITS, listWorkspace, type ListLimits } from '../workspace/list-workspace';
import type { WorkspacePolicyError } from '../workspace/policy-result';
import { readVerifiedTextFile } from '../workspace/verified-read';
import { openWorkspaceRoot, type WorkspaceRoot } from '../workspace/workspace-root';

/** Opens the native folder picker; resolves to an absolute path or `null` when cancelled. */
export type FolderPicker = () => Promise<string | null>;

const NO_WORKSPACE: IpcError = { code: 'NO_WORKSPACE', message: 'No workspace folder is open.' };
const INVALID_REQUEST: IpcError = {
  code: 'INVALID_REQUEST',
  message: 'The request is malformed.',
};

/**
 * Main-process broker for the S1 read-only capabilities. It owns the single workspace root;
 * the renderer never supplies or receives absolute paths. Every operation goes through the
 * #49 workspace policy. There is deliberately no write, delete or execute capability.
 */
export class WorkspaceBroker {
  #root: WorkspaceRoot | null = null;

  constructor(
    private readonly pickFolder: FolderPicker,
    private readonly listLimits: ListLimits = DEFAULT_LIST_LIMITS,
  ) {}

  /** Lets the user pick a folder; an invalid choice keeps the previous workspace. */
  async chooseWorkspace(): Promise<IpcResult<WorkspaceSummary | null>> {
    const selected = await this.pickFolder();
    if (selected === null) {
      return { ok: true, value: null };
    }
    const opened = await openWorkspaceRoot(selected);
    if (!opened.ok) {
      return failure(opened.error);
    }
    this.#root = opened.value;
    return { ok: true, value: { name: opened.value.displayName } };
  }

  /** Lists files and directories under the open workspace. */
  async listFiles(): Promise<IpcResult<FileListing>> {
    if (this.#root === null) {
      return { ok: false, error: NO_WORKSPACE };
    }
    const listing = await listWorkspace(this.#root, this.listLimits);
    if (!listing.ok) {
      return failure(listing.error);
    }
    return { ok: true, value: listing.value };
  }

  /** Reads one UTF-8 file for read-only display. `relativePath` is untrusted input. */
  async readFile(relativePath: unknown): Promise<IpcResult<FileContent>> {
    if (this.#root === null) {
      return { ok: false, error: NO_WORKSPACE };
    }
    if (typeof relativePath !== 'string') {
      return { ok: false, error: INVALID_REQUEST };
    }
    const file = await readVerifiedTextFile(this.#root, relativePath);
    if (!file.ok) {
      return failure(file.error);
    }
    return {
      ok: true,
      value: {
        path: file.value.relativePath,
        content: file.value.content,
        sizeBytes: file.value.sizeBytes,
        readOnly: true,
      },
    };
  }
}

function failure(error: WorkspacePolicyError): { readonly ok: false; readonly error: IpcError } {
  return { ok: false, error: { code: error.code, message: error.message } };
}
