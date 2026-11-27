import type { IpcMain, IpcMainInvokeEvent } from 'electron';

import type { IpcResult } from '../../shared/ipc-contract';

export type IpcMainLike = Pick<IpcMain, 'handle' | 'removeHandler'>;
export type AuthorizedSender = (event: IpcMainInvokeEvent) => boolean;

const UNAUTHORIZED: IpcResult<never> = {
  ok: false,
  error: { code: 'UNAUTHORIZED_SENDER', message: 'The caller is not allowed to use this API.' },
};

export const INVALID_REQUEST: IpcResult<never> = {
  ok: false,
  error: { code: 'INVALID_REQUEST', message: 'The request is malformed.' },
};

const INTERNAL: IpcResult<never> = {
  ok: false,
  error: { code: 'INTERNAL', message: 'The operation failed unexpectedly.' },
};

/** Check the sender before interpreting arguments. Report unexpected errors without payloads. */
export function guardedIpcHandler(ipcMain: IpcMainLike, isAuthorized: AuthorizedSender) {
  return (
    channel: string,
    run: (args: readonly unknown[]) => Promise<IpcResult<unknown>> | IpcResult<never>,
  ): void => {
    ipcMain.handle(channel, async (event, ...args: unknown[]) => {
      if (!isAuthorized(event)) return UNAUTHORIZED;
      try {
        return await run(args);
      } catch {
        return INTERNAL;
      }
    });
  };
}
