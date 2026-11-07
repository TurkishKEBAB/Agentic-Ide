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

const MONACO_VENDORED_DOMPURIFY = './dompurify/dompurify.js';
const MONACO_SANITIZER_DIR = '/monaco-editor/esm/vs/base/browser/';

/**
 * Monaco 0.57 bundles its own DOMPurify 3.4.15 (DOM XSS, GHSA-p98j-92pf-mc4p) and renders
 * markdown hovers from untrusted workspace text with it. This routes Monaco's import to the
 * patched `dompurify` package pinned in package.json. A production build fails if the import
 * was never redirected, so a Monaco upgrade cannot silently bring the vendored copy back.
 * Remove once Monaco ships a fixed DOMPurify.
 */
function patchedDomPurifyPlugin(): Plugin {
  let isBuild = false;
  let redirected = false;
  return {
    name: 'agentic-ide:patched-dompurify',
    enforce: 'pre',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    async resolveId(source, importer) {
      if (
        source !== MONACO_VENDORED_DOMPURIFY ||
        importer?.replaceAll('\\', '/').includes(MONACO_SANITIZER_DIR) !== true
      ) {
        return null;
      }
      const patched = await this.resolve('dompurify', importer, { skipSelf: true });
      if (patched === null) {
        this.error('The patched dompurify package could not be resolved');
      }
      redirected = true;
      return patched;
    },
    buildEnd(error) {
      if (isBuild && error === undefined && !redirected) {
        this.error("Monaco's vendored DOMPurify import was not redirected to the patched package");
      }
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
      plugins: [patchedDomPurifyPlugin(), cspMetaPlugin(dev)],
      build: { sourcemap: false },
      worker: { format: 'es' },
    },
  };
});
