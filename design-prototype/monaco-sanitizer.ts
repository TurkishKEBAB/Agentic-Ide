import type { Plugin } from 'vite';

const MONACO_VENDORED_DOMPURIFY = './dompurify/dompurify.js';
const MONACO_SANITIZER_DIR = '/monaco-editor/esm/vs/base/browser/';

/**
 * Monaco 0.57 bundles DOMPurify 3.4.15 (GHSA-p98j-92pf-mc4p) for markdown hovers.
 * Redirect its vendored import to the patched package in both desktop and browser builds.
 * Fail a production build if a Monaco upgrade changes the import without updating this guard.
 * Remove once Monaco ships a fixed DOMPurify.
 */
export function patchedDomPurifyPlugin(): Plugin {
  let isBuild = false;
  let redirected = false;
  return {
    ...redirectMonacoSanitizer(() => {
      redirected = true;
    }),
    config(_config, { command }) {
      if (command === 'serve') {
        // Vite's development prebundle uses a separate Rolldown plugin pipeline.
        return { optimizeDeps: { rolldownOptions: { plugins: [redirectMonacoSanitizer()] } } };
      }
      return undefined;
    },
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    buildEnd(error) {
      if (isBuild && error === undefined && !redirected) {
        this.error("Monaco's vendored DOMPurify import was not redirected to the patched package");
      }
    },
  };
}

function redirectMonacoSanitizer(onRedirect?: () => void): Plugin {
  return {
    name: 'agentic-ide:patched-dompurify',
    enforce: 'pre',
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
      onRedirect?.();
      return patched;
    },
  };
}
