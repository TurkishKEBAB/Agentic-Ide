import { BrowserWindow } from 'electron';

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
  void window.loadURL(input.source.url);
  return window;
}
