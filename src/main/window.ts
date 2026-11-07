import { BrowserWindow, dialog } from 'electron';

import type { RendererSource } from './renderer-source';
import { buildMainWindowOptions } from './window-options';

/** Creates the single application window and loads the trusted renderer entry. */
export function createMainWindow(input: {
  readonly preloadPath: string;
  readonly source: RendererSource;
  readonly allowDevTools: boolean;
}): BrowserWindow {
  const window = new BrowserWindow(
    buildMainWindowOptions({ preloadPath: input.preloadPath, allowDevTools: input.allowDevTools }),
  );
  window.once('ready-to-show', () => {
    window.show();
  });
  window.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning',
      title: 'Kaydedilmemiş dosyalar',
      message: 'Yerel çalışma alanında kaydedilmemiş düzenlemeler var.',
      buttons: ['Editöre dön', 'Düzenlemeleri bırak'],
      defaultId: 0,
      cancelId: 0,
    });
    if (choice === 1) event.preventDefault();
  });
  void window.loadURL(input.source.url);
  return window;
}
