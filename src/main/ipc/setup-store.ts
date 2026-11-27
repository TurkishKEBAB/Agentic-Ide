import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

import type { SetupSummary } from '../../shared/ipc-contract';

export const MAX_RECENT_WORKSPACES = 10;
export const OPAQUE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface StoredWorkspace {
  readonly id: string;
  readonly folder: string;
  readonly device: string;
  readonly inode: string;
}

export interface SetupState {
  readonly version: 1;
  readonly config: {
    readonly profile: SetupSummary['profile'];
    readonly apiKeyRef: string | null;
  };
  readonly credentials: {
    readonly id: string;
    readonly encryptedKey: string;
  } | null;
  readonly recentWorkspaces: readonly StoredWorkspace[];
}

const INITIAL_STATE: SetupState = {
  version: 1,
  config: { profile: 'local-only', apiKeyRef: null },
  credentials: null,
  recentWorkspaces: [],
};

/** Settings and the encrypted entry share one atomic commit so their references cannot diverge. */
export class SetupStore {
  constructor(private readonly file: string) {}

  async read(): Promise<SetupState> {
    let json: string;
    try {
      json = await readFile(this.file, 'utf8');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return INITIAL_STATE;
      throw error;
    }
    const value: unknown = JSON.parse(json);
    if (!isSetupState(value)) throw new Error('Invalid desktop setup state');
    return value;
  }

  async write(state: SetupState): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const staged = path.join(path.dirname(this.file), '.agentide-setup-' + randomUUID());
    const handle = await open(staged, 'wx', 0o600);
    try {
      try {
        await handle.writeFile(JSON.stringify(state), 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(staged, this.file);
    } catch (error) {
      await unlink(staged).catch(() => undefined);
      throw error;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOpaqueId(value: unknown): value is string {
  return typeof value === 'string' && OPAQUE_ID.test(value);
}

function isStoredWorkspace(value: unknown): value is StoredWorkspace {
  return (
    isRecord(value) &&
    Object.keys(value).length === 4 &&
    isOpaqueId(value.id) &&
    typeof value.folder === 'string' &&
    path.isAbsolute(value.folder) &&
    !value.folder.includes('\0') &&
    path.parse(value.folder).root !== value.folder &&
    !/^[\\/]{2}/.test(value.folder) &&
    typeof value.device === 'string' &&
    /^\d{1,20}$/.test(value.device) &&
    typeof value.inode === 'string' &&
    /^\d{1,20}$/.test(value.inode)
  );
}

function isSetupState(value: unknown): value is SetupState {
  if (!isRecord(value) || Object.keys(value).length !== 4 || value.version !== 1) return false;
  const { config, credentials, recentWorkspaces } = value;
  if (!isRecord(config) || Object.keys(config).length !== 2) return false;
  if (config.profile !== 'local-only' && config.profile !== 'manual-hybrid') return false;
  if (config.apiKeyRef === null) {
    if (credentials !== null || config.profile !== 'local-only') return false;
  } else if (
    !isOpaqueId(config.apiKeyRef) ||
    !isRecord(credentials) ||
    Object.keys(credentials).length !== 2 ||
    credentials.id !== config.apiKeyRef ||
    typeof credentials.encryptedKey !== 'string' ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(credentials.encryptedKey) ||
    credentials.encryptedKey.length % 4 !== 0
  ) {
    return false;
  }
  return (
    Array.isArray(recentWorkspaces) &&
    recentWorkspaces.length <= MAX_RECENT_WORKSPACES &&
    recentWorkspaces.every(isStoredWorkspace)
  );
}
