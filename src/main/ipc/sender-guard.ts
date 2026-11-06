import type { IpcMainInvokeEvent } from 'electron';

import { isTrustedRendererUrl, type RendererSource } from '../renderer-source';

/** What an IPC sender must match to use a broker capability. */
export interface SenderPolicy {
  readonly source: RendererSource;
  /** `webContents.id` of the application window, or `null` before it exists. */
  readonly appWebContentsId: () => number | null;
}

type InvokeEventLike = Pick<IpcMainInvokeEvent, 'sender' | 'senderFrame'>;

/**
 * Authenticates an IPC call: only the main frame of the application window, currently on
 * the trusted renderer origin, may call broker capabilities. Sub-frames, other windows,
 * destroyed/navigated frames and foreign origins are rejected.
 */
export function isAuthorizedSender(event: InvokeEventLike, policy: SenderPolicy): boolean {
  const frame = event.senderFrame;
  if (frame === null) {
    return false;
  }
  if (frame.parent !== null) {
    return false;
  }
  const expectedId = policy.appWebContentsId();
  if (expectedId === null || event.sender.id !== expectedId) {
    return false;
  }
  return isTrustedRendererUrl(frame.url, policy.source);
}
