import { contextBridge } from 'electron';

/**
 * Sandboxed preload. The renderer receives only named, typed capabilities; there is no
 * generic `ipcRenderer`, filesystem or process access. Workspace capabilities are added
 * together with the main-process workspace broker (#49).
 */
contextBridge.exposeInMainWorld('agentIde', Object.freeze({}));
