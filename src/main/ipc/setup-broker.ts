import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { IpcResult, SetupSummary, WorkspaceSummary } from '../../shared/ipc-contract';
import type { WorkspaceRoot } from '../workspace/workspace-root';
import { MAX_RECENT_WORKSPACES, OPAQUE_ID, type SetupState, type SetupStore } from './setup-store';
import type { WorkspaceBroker } from './workspace-broker';

export interface CredentialEncryption {
  isAsyncEncryptionAvailable(): Promise<boolean>;
  encryptStringAsync(value: string): Promise<Buffer>;
}

const INVALID_REQUEST = {
  ok: false,
  error: { code: 'INVALID_REQUEST', message: 'The setup request is malformed.' },
} as const;
const SECURE_STORAGE_UNAVAILABLE = {
  ok: false,
  error: {
    code: 'SECURE_STORAGE_UNAVAILABLE',
    message: 'OS-protected credential storage is unavailable.',
  },
} as const;
const UNKNOWN_WORKSPACE = {
  ok: false,
  error: { code: 'NOT_FOUND', message: 'The recent workspace is not available.' },
} as const;

/** Main-process settings and write-only credential submission for the desktop. */
export class SetupBroker {
  #pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: Pick<SetupStore, 'read' | 'write'>,
    private readonly encryption: CredentialEncryption,
    private readonly workspace: Pick<WorkspaceBroker, 'openWorkspaceFolder'>,
    private readonly platform = process.platform,
  ) {}

  getSetup(): Promise<IpcResult<SetupSummary>> {
    return this.#serialized(async () => this.#summarize(await this.store.read()));
  }

  async configureCloud(key: unknown, consent: unknown): Promise<IpcResult<SetupSummary>> {
    if (
      consent !== true ||
      typeof key !== 'string' ||
      key.length === 0 ||
      key.length > 4096 ||
      /[^\x21-\x7e]/.test(key)
    ) {
      return INVALID_REQUEST;
    }
    return this.#serialized(async () => {
      const state = await this.store.read();
      if (!(await this.#cloudAvailable())) return SECURE_STORAGE_UNAVAILABLE;
      let encryptedKey: string;
      try {
        const encrypted = await this.encryption.encryptStringAsync(key);
        if (encrypted.length === 0) return SECURE_STORAGE_UNAVAILABLE;
        encryptedKey = encrypted.toString('base64');
      } catch {
        return SECURE_STORAGE_UNAVAILABLE;
      }
      const id = randomUUID();
      const next: SetupState = {
        ...state,
        config: { profile: 'manual-hybrid', apiKeyRef: id },
        credentials: { id, encryptedKey },
      };
      await this.store.write(next);
      return this.#summarize(next, true);
    });
  }

  selectLocalProfile(): Promise<IpcResult<SetupSummary>> {
    return this.#serialized(async () => {
      const state = await this.store.read();
      if (state.config.profile === 'local-only') return this.#summarize(state);
      const next: SetupState = { ...state, config: { ...state.config, profile: 'local-only' } };
      await this.store.write(next);
      return this.#summarize(next);
    });
  }

  removeCloudKey(): Promise<IpcResult<SetupSummary>> {
    return this.#serialized(async () => {
      const state = await this.store.read();
      if (state.credentials === null) return this.#summarize(state);
      const next: SetupState = {
        ...state,
        config: { profile: 'local-only', apiKeyRef: null },
        credentials: null,
      };
      await this.store.write(next);
      return this.#summarize(next);
    });
  }

  /** Recent folders originate from the native picker and stay on the main-process side. */
  async rememberWorkspace(root: WorkspaceRoot): Promise<void> {
    await this.#serialized(async () => {
      await this.#remember(await this.store.read(), root);
    }).catch(() => {
      // A history write failure must not invalidate an already opened workspace.
    });
  }

  async openRecentWorkspace(id: unknown): Promise<IpcResult<WorkspaceSummary>> {
    if (typeof id !== 'string' || !OPAQUE_ID.test(id)) return INVALID_REQUEST;
    return this.#serialized(async () => {
      const state = await this.store.read();
      const entry = state.recentWorkspaces.find((candidate) => candidate.id === id);
      if (entry === undefined) return UNKNOWN_WORKSPACE;
      return this.workspace.openWorkspaceFolder(entry.folder, {
        expectedRoot: {
          canonicalPath: entry.folder,
          identity: { dev: BigInt(entry.device), ino: BigInt(entry.inode) },
        },
        onOpened: async (root) => {
          await this.#remember(state, root).catch(() => {
            // The workspace remains usable even if its history could not be reordered.
          });
        },
      });
    });
  }

  async #remember(state: SetupState, root: WorkspaceRoot): Promise<void> {
    const folder = root.canonicalPath;
    const previous = state.recentWorkspaces.find((entry) => entry.folder === folder);
    const device = root.identity.dev.toString();
    const inode = root.identity.ino.toString();
    const unchanged = previous?.device === device && previous.inode === inode;
    if (unchanged && state.recentWorkspaces[0] === previous) return;
    const recentWorkspaces = [
      unchanged ? previous : { id: randomUUID(), folder, device, inode },
      ...state.recentWorkspaces.filter((entry) => entry !== previous),
    ].slice(0, MAX_RECENT_WORKSPACES);
    await this.store.write({ ...state, recentWorkspaces });
  }

  async #cloudAvailable(): Promise<boolean> {
    // Windows is the validated demo target. The async Linux API can select an insecure fallback.
    if (this.platform !== 'win32') return false;
    try {
      return await this.encryption.isAsyncEncryptionAvailable();
    } catch {
      return false;
    }
  }

  async #summarize(state: SetupState, cloudAvailable?: boolean): Promise<IpcResult<SetupSummary>> {
    const available = cloudAvailable ?? (await this.#cloudAvailable());
    return {
      ok: true,
      value: {
        profile: available ? state.config.profile : 'local-only',
        cloudAvailable: available,
        cloudConfigured: state.credentials !== null,
        recentWorkspaces: state.recentWorkspaces.map(({ id, folder }) => ({
          id,
          name: path.basename(folder),
        })),
      },
    };
  }

  #serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#pending.then(operation);
    this.#pending = result.catch(() => undefined);
    return result;
  }
}
