import type { IpcMain, IpcMainInvokeEvent } from 'electron';

import { IPC_CHANNELS, type IpcChannel, type IpcResult } from '../../shared/ipc-contract';
import type { WorkspaceBroker } from './workspace-broker';

type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;
type BrokerLike = Pick<WorkspaceBroker, 'chooseWorkspace' | 'listFiles' | 'readFile'>;

const UNAUTHORIZED: IpcResult<never> = {
  ok: false,
  error: { code: 'UNAUTHORIZED_SENDER', message: 'The caller is not allowed to use this API.' },
};
const INVALID_REQUEST: IpcResult<never> = {
  ok: false,
  error: { code: 'INVALID_REQUEST', message: 'The request is malformed.' },
};
const INTERNAL: IpcResult<never> = {
  ok: false,
  error: { code: 'INTERNAL', message: 'The operation failed unexpectedly.' },
};

/**
 * Registers the three S1 capabilities. Each call is checked in order: sender (frame,
 * window and origin), exact argument count/type, then the broker's workspace policy.
 * Unexpected exceptions become a generic INTERNAL result so no stack or path leaks.
 * Returns an unregister function.
 */
export function registerWorkspaceIpc(
  ipcMain: IpcMainLike,
  broker: BrokerLike,
  isAuthorized: (event: IpcMainInvokeEvent) => boolean,
): () => void {
  const handle = (
    channel: IpcChannel,
    run: (args: readonly unknown[]) => Promise<IpcResult<unknown>> | IpcResult<never>,
  ): void => {
    ipcMain.handle(channel, async (event, ...args: unknown[]) => {
      if (!isAuthorized(event)) {
        return UNAUTHORIZED;
      }
      try {
        return await run(args);
      } catch {
        return INTERNAL;
      }
    });
  };

  handle(IPC_CHANNELS.chooseWorkspace, (args) =>
    args.length === 0 ? broker.chooseWorkspace() : INVALID_REQUEST,
  );
  handle(IPC_CHANNELS.listFiles, (args) =>
    args.length === 0 ? broker.listFiles() : INVALID_REQUEST,
  );
  handle(IPC_CHANNELS.readFile, (args) =>
    args.length === 1 && typeof args[0] === 'string' ? broker.readFile(args[0]) : INVALID_REQUEST,
  );

  return () => {
    for (const channel of Object.values(IPC_CHANNELS)) {
      ipcMain.removeHandler(channel);
    }
  };
}
