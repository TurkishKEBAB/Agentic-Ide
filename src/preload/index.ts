import { contextBridge, ipcRenderer } from 'electron';

import {
  IPC_CHANNELS,
  type AgentIdeApi,
  type FileContent,
  type FileListing,
  type IpcResult,
  type WorkspaceSummary,
} from '../shared/ipc-contract';

/**
 * Sandboxed preload. The renderer receives only the named workspace capabilities;
 * there is no generic `ipcRenderer`, filesystem or process access. Arguments are
 * forwarded as-is: the main-process broker validates sender, shape and workspace policy.
 */
const api: AgentIdeApi = {
  chooseWorkspace: () =>
    ipcRenderer.invoke(IPC_CHANNELS.chooseWorkspace) as Promise<IpcResult<WorkspaceSummary | null>>,
  listFiles: () => ipcRenderer.invoke(IPC_CHANNELS.listFiles) as Promise<IpcResult<FileListing>>,
  readFile: (relativePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.readFile, relativePath) as Promise<IpcResult<FileContent>>,
  saveFile: (relativePath: string, content: string, expectedRevision: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveFile, relativePath, content, expectedRevision) as Promise<
      IpcResult<FileContent>
    >,
};

contextBridge.exposeInMainWorld('agentIde', Object.freeze(api));
