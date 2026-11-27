import { defineConfig } from 'vitest/config';

import { sharedTestConfig } from './vitest.shared';

/** Security property suite (QUALITY_GATES G2): workspace boundary, IPC and Electron hardening. */
export default defineConfig({
  test: {
    ...sharedTestConfig,
    include: ['tests/safety/**/*.test.ts', 'tests/security/**/*.test.ts'],
  },
});
