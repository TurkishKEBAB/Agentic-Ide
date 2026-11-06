import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';

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
      plugins: [cspMetaPlugin(dev)],
      build: { sourcemap: false },
      worker: { format: 'es' },
    },
  };
});
