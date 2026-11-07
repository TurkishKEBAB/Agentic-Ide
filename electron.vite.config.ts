import { fileURLToPath } from 'node:url';

import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';

import { patchedDomPurifyPlugin } from './design-prototype/monaco-sanitizer';
import { buildContentSecurityPolicy, CSP_PLACEHOLDER } from './src/shared/csp';

/** Injects the renderer CSP `<meta>`; fails the build if the placeholder disappears. */
function cspMetaPlugin(dev: boolean): Plugin {
  return {
    name: 'agentic-ide:csp-meta',
    transformIndexHtml(html) {
      if (!html.includes(CSP_PLACEHOLDER)) {
        throw new Error('index.html must contain the CSP placeholder');
      }
      return html.replace(CSP_PLACEHOLDER, buildContentSecurityPolicy({ dev, delivery: 'meta' }));
    },
  };
}

export default defineConfig(({ command }) => {
  const dev = command === 'serve';
  return {
    main: {
      build: { sourcemap: dev },
    },
    preload: {
      build: { sourcemap: dev },
    },
    renderer: {
      publicDir: fileURLToPath(new URL('./design-prototype/public', import.meta.url)),
      // The separate browser preview may also have its own node_modules. Always resolve
      // desktop assets and the sanitizer patch from the root lockfile.
      resolve: {
        dedupe: [
          '@fontsource-variable/inter',
          '@fontsource/jetbrains-mono',
          'diff',
          'dompurify',
          'monaco-editor',
        ],
      },
      plugins: [patchedDomPurifyPlugin(), cspMetaPlugin(dev)],
      build: { sourcemap: false },
      worker: { format: 'es' },
    },
  };
});
