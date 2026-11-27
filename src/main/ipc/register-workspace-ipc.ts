import { IPC_CHANNELS } from '../../shared/ipc-contract';
import {
  guardedIpcHandler,
  INVALID_REQUEST,
  type AuthorizedSender,
  type IpcMainLike,
} from './register-guarded-ipc';
import type { WorkspaceBroker } from './workspace-broker';

type BrokerLike = Pick<WorkspaceBroker, 'chooseWorkspace' | 'listFiles' | 'readFile' | 'saveFile'>;
/**
 * Registers the named workspace capabilities. Each call is checked in order: sender (frame,
 * window and origin), exact argument count/type, then the broker's workspace policy.
 * Unexpected exceptions become a generic INTERNAL result so no stack or path leaks.
 * Returns an unregister function.
 */
export function registerWorkspaceIpc(
  ipcMain: IpcMainLike,
  broker: BrokerLike,
  isAuthorized: AuthorizedSender,
): () => void {
  const handle = guardedIpcHandler(ipcMain, isAuthorized);

  handle(IPC_CHANNELS.chooseWorkspace, (args) =>
    args.length === 0 ? broker.chooseWorkspace() : INVALID_REQUEST,
  );
  handle(IPC_CHANNELS.listFiles, (args) =>
    args.length === 0 ? broker.listFiles() : INVALID_REQUEST,
  );
  handle(IPC_CHANNELS.readFile, (args) =>
    args.length === 1 && typeof args[0] === 'string' ? broker.readFile(args[0]) : INVALID_REQUEST,
  );
  handle(IPC_CHANNELS.saveFile, (args) =>
    args.length === 3 &&
    typeof args[0] === 'string' &&
    typeof args[1] === 'string' &&
    typeof args[2] === 'string'
      ? broker.saveFile(args[0], args[1], args[2])
      : INVALID_REQUEST,
  );

  return () => {
    for (const channel of Object.values(IPC_CHANNELS)) {
      ipcMain.removeHandler(channel);
    }
  };
}
