import { contextBridge, ipcRenderer } from 'electron';

import {
  IPC_CHANNELS,
  SETUP_CHANNELS,
  type AgentIdeApi,
  type FileContent,
  type FileListing,
  type IpcResult,
  type SetupSummary,
  type WorkspaceSummary,
} from '../shared/ipc-contract';

/**
 * Sandboxed preload. The renderer receives only the named workspace and setup capabilities;
 * there is no generic `ipcRenderer`, filesystem or process access. Arguments are
 * forwarded as-is: the main-process broker validates sender, shape and workspace policy.
 */
const api: AgentIdeApi = {
  getSetup: () => ipcRenderer.invoke(SETUP_CHANNELS.getSetup) as Promise<IpcResult<SetupSummary>>,
  configureCloud: (key, consent) =>
    ipcRenderer.invoke(SETUP_CHANNELS.configureCloud, key, consent) as Promise<
      IpcResult<SetupSummary>
    >,
  selectLocalProfile: () =>
    ipcRenderer.invoke(SETUP_CHANNELS.selectLocalProfile) as Promise<IpcResult<SetupSummary>>,
  removeCloudKey: () =>
    ipcRenderer.invoke(SETUP_CHANNELS.removeCloudKey) as Promise<IpcResult<SetupSummary>>,
  openRecentWorkspace: (id) =>
    ipcRenderer.invoke(SETUP_CHANNELS.openRecentWorkspace, id) as Promise<
      IpcResult<WorkspaceSummary>
    >,
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
