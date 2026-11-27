import type { Session, WebContents } from 'electron';

/**
 * Denies every Chromium permission (camera, notifications, clipboard-read, ...) and
 * downloads. S1 needs none of them; new needs require an explicit, reviewed allowlist.
 */
export function hardenSession(session: Session): void {
  session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.setPermissionCheckHandler(() => false);
  session.setDevicePermissionHandler(() => false);
  session.on('will-download', (event) => {
    event.preventDefault();
  });
}

/**
 * Blocks navigation away from the trusted renderer origin, new windows and `<webview>`
 * attachment for every web contents the app creates.
 */
export function hardenWebContents(
  contents: WebContents,
  isTrustedUrl: (url: string) => boolean,
): void {
  contents.on('will-navigate', (event, url) => {
    if (!isTrustedUrl(url)) {
      event.preventDefault();
    }
  });
  contents.on('will-redirect', (event, url) => {
    if (!isTrustedUrl(url)) {
      event.preventDefault();
    }
  });
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
}
