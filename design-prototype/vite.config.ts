import { defineConfig } from 'vite';

import { patchedDomPurifyPlugin } from './monaco-sanitizer.ts';

export default defineConfig({
  base: './',
  plugins: [patchedDomPurifyPlugin()],
});
