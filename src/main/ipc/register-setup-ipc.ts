import { SETUP_CHANNELS } from '../../shared/ipc-contract';
import {
  guardedIpcHandler,
  INVALID_REQUEST,
  type AuthorizedSender,
  type IpcMainLike,
} from './register-guarded-ipc';
import type { SetupBroker } from './setup-broker';

type SetupOperations = Pick<
  SetupBroker,
  'getSetup' | 'configureCloud' | 'selectLocalProfile' | 'removeCloudKey' | 'openRecentWorkspace'
>;

export function registerSetupIpc(
  ipcMain: IpcMainLike,
  setup: SetupOperations,
  isAuthorized: AuthorizedSender,
): void {
  const handle = guardedIpcHandler(ipcMain, isAuthorized);
  handle(SETUP_CHANNELS.getSetup, (args) =>
    args.length === 0 ? setup.getSetup() : INVALID_REQUEST,
  );
  handle(SETUP_CHANNELS.configureCloud, (args) =>
    args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'boolean'
      ? setup.configureCloud(args[0], args[1])
      : INVALID_REQUEST,
  );
  handle(SETUP_CHANNELS.selectLocalProfile, (args) =>
    args.length === 0 ? setup.selectLocalProfile() : INVALID_REQUEST,
  );
  handle(SETUP_CHANNELS.removeCloudKey, (args) =>
    args.length === 0 ? setup.removeCloudKey() : INVALID_REQUEST,
  );
  handle(SETUP_CHANNELS.openRecentWorkspace, (args) =>
    args.length === 1 && typeof args[0] === 'string'
      ? setup.openRecentWorkspace(args[0])
      : INVALID_REQUEST,
  );
}
