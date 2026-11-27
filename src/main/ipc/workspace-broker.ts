import { randomBytes } from 'node:crypto';

import type {
  FileContent,
  FileListing,
  IpcError,
  IpcResult,
  WorkspaceSummary,
} from '../../shared/ipc-contract';
import { listAgentWorkspace, readAgentWorkspaceFile } from '../workspace/agent-workspace';
import { DEFAULT_LIST_LIMITS, listWorkspace, type ListLimits } from '../workspace/list-workspace';
import { policyFail, type WorkspacePolicyError } from '../workspace/policy-result';
import { checkEditorDataAccess, checkWorkspaceProtection } from '../workspace/protected-paths';
import { readWorkspaceTextSnapshot, type VerifiedTextFile } from '../workspace/verified-read';
import {
  hasWritableMode,
  revisionForSnapshot,
  saveVerifiedTextFile,
} from '../workspace/verified-save';
import { openWorkspaceRoot, sameIdentity, type WorkspaceRoot } from '../workspace/workspace-root';

/** Opens the native folder picker; resolves to an absolute path or `null` when cancelled. */
export type FolderPicker = () => Promise<string | null>;
type WorkspaceOpened = (root: WorkspaceRoot) => Promise<void>;

interface WorkspaceOpenOptions {
  readonly onOpened?: WorkspaceOpened | undefined;
  readonly expectedRoot?: Pick<WorkspaceRoot, 'canonicalPath' | 'identity'>;
}

const NO_WORKSPACE: IpcError = { code: 'NO_WORKSPACE', message: 'No workspace folder is open.' };
const INVALID_REQUEST: IpcError = {
  code: 'INVALID_REQUEST',
  message: 'The request is malformed.',
};
const SAVE_IN_PROGRESS: IpcError = {
  code: 'SAVE_IN_PROGRESS',
  message: 'A file is already being saved.',
};
const WORKSPACE_OPEN_IN_PROGRESS: IpcError = {
  code: 'WORKSPACE_OPEN_IN_PROGRESS',
  message: 'A workspace is already being opened.',
};

interface OpenWorkspace {
  readonly root: WorkspaceRoot;
  readonly revisionKey: Buffer;
}

/**
 * Main-process broker for the selected workspace. Reads and manual saves go through the
 * workspace policy; the renderer never supplies or receives absolute paths.
 */
export class WorkspaceBroker {
  #workspace: OpenWorkspace | null = null;
  #saving = false;
  #opening = false;
  #picking = false;

  constructor(
    private readonly pickFolder: FolderPicker,
    private readonly listLimits: ListLimits = DEFAULT_LIST_LIMITS,
    private readonly privateDataRoots: readonly string[] = [],
  ) {}

  /** Lets the user pick a folder; an invalid choice keeps the previous workspace. */
  async chooseWorkspace(onOpened?: WorkspaceOpened): Promise<IpcResult<WorkspaceSummary | null>> {
    if (this.#picking || this.#opening) return { ok: false, error: WORKSPACE_OPEN_IN_PROGRESS };
    this.#picking = true;
    let selected: string | null;
    try {
      selected = await this.pickFolder();
    } finally {
      this.#picking = false;
    }
    if (selected === null) {
      return { ok: true, value: null };
    }
    return this.openWorkspaceFolder(selected, { onOpened });
  }

  /** Accepts a trusted native picker or recent-workspace path from the main process. */
  async openWorkspaceFolder(
    folder: string,
    { onOpened, expectedRoot }: WorkspaceOpenOptions = {},
  ): Promise<IpcResult<WorkspaceSummary>> {
    if (this.#opening || this.#picking) return { ok: false, error: WORKSPACE_OPEN_IN_PROGRESS };
    this.#opening = true;
    try {
      const opened = await openWorkspaceRoot(folder);
      if (!opened.ok) return failure(opened.error);
      const root = opened.value;
      if (
        expectedRoot &&
        (root.canonicalPath !== expectedRoot.canonicalPath ||
          !sameIdentity(root.identity, expectedRoot.identity))
      ) {
        return policyFail('ROOT_CHANGED');
      }
      if (this.#saving) return { ok: false, error: SAVE_IN_PROGRESS };
      this.#workspace = { root, revisionKey: randomBytes(32) };
      await onOpened?.(root);
      return { ok: true, value: { name: root.displayName } };
    } finally {
      this.#opening = false;
    }
  }

  /** Lists files and directories under the open workspace. */
  async listFiles(): Promise<IpcResult<FileListing>> {
    const workspace = this.#workspace;
    if (workspace === null) {
      return { ok: false, error: NO_WORKSPACE };
    }
    const listing = await listWorkspace(workspace.root, this.listLimits);
    if (!listing.ok) {
      return failure(listing.error);
    }
    return { ok: true, value: listing.value };
  }

  /** Reads one UTF-8 file and its opaque revision. `relativePath` is untrusted input. */
  async readFile(relativePath: unknown): Promise<IpcResult<FileContent>> {
    const workspace = this.#workspace;
    if (workspace === null) {
      return { ok: false, error: NO_WORKSPACE };
    }
    if (typeof relativePath !== 'string') {
      return { ok: false, error: INVALID_REQUEST };
    }
    const file = await readWorkspaceTextSnapshot(workspace.root, relativePath);
    if (!file.ok) {
      return failure(file.error);
    }
    const accessible = await checkEditorDataAccess(
      file.value.resolved.canonicalPath,
      this.privateDataRoots,
    );
    if (!accessible.ok) return failure(accessible.error);
    const readOnly =
      workspace.root.identity.ino === 0n ||
      file.value.resolved.followedLink ||
      !hasWritableMode(file.value.stats) ||
      !(
        await checkWorkspaceProtection(
          workspace.root,
          file.value.relativePath,
          this.privateDataRoots,
        )
      ).ok;
    if (workspace !== this.#workspace) return policyFail('ROOT_CHANGED');
    return presentFile(
      file.value,
      revisionForSnapshot(workspace.revisionKey, file.value),
      readOnly,
    );
  }

  /** Main-process context and index discovery. This capability is not registered over IPC. */
  async listAgentFiles(): Promise<IpcResult<FileListing>> {
    const workspace = this.#workspace;
    if (workspace === null) return { ok: false, error: NO_WORKSPACE };
    const result = await listAgentWorkspace(workspace.root, this.listLimits, this.privateDataRoots);
    return workspace === this.#workspace ? result : policyFail('ROOT_CHANGED');
  }

  /** Main-process agent source access. Explicit or pinned requests receive the same checks. */
  async readAgentFile(relativePath: unknown): Promise<IpcResult<VerifiedTextFile>> {
    const workspace = this.#workspace;
    if (workspace === null) return { ok: false, error: NO_WORKSPACE };
    const result = await readAgentWorkspaceFile(
      workspace.root,
      relativePath,
      this.privateDataRoots,
    );
    return workspace === this.#workspace ? result : policyFail('ROOT_CHANGED');
  }

  /** The sole write capability: replaces an existing, writable file at its opened revision. */
  async saveFile(
    relativePath: unknown,
    content: unknown,
    expectedRevision: unknown,
  ): Promise<IpcResult<FileContent>> {
    const workspace = this.#workspace;
    if (workspace === null) return { ok: false, error: NO_WORKSPACE };
    if (
      typeof relativePath !== 'string' ||
      typeof content !== 'string' ||
      typeof expectedRevision !== 'string' ||
      !/^[a-f0-9]{64}$/.test(expectedRevision)
    ) {
      return { ok: false, error: INVALID_REQUEST };
    }
    if (this.#saving) return { ok: false, error: SAVE_IN_PROGRESS };

    this.#saving = true;
    try {
      const saved = await saveVerifiedTextFile(
        workspace.root,
        workspace.revisionKey,
        relativePath,
        content,
        expectedRevision,
        this.privateDataRoots,
      );
      if (!saved.ok) return failure(saved.error);
      return presentFile(saved.value, saved.value.revision, false);
    } finally {
      this.#saving = false;
    }
  }
}

function presentFile(
  file: VerifiedTextFile,
  revision: string,
  readOnly: boolean,
): IpcResult<FileContent> {
  const { relativePath: path, content, sizeBytes } = file;
  return { ok: true, value: { path, content, sizeBytes, revision, readOnly } };
}

function failure(error: WorkspacePolicyError): { readonly ok: false; readonly error: IpcError } {
  return { ok: false, error: { code: error.code, message: error.message } };
}
