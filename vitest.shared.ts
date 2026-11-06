import type { ViteUserConfig } from 'vitest/config';

/**
 * Shared Vitest settings. Only `tests/` is collected: benchmark fixtures under `docs/`
 * contain their own `*.test.ts` files that are evaluation inputs, not project tests.
 */
export const sharedTestConfig = {
  environment: 'node',
  exclude: ['**/node_modules/**', 'tests/e2e/**'],
  restoreMocks: true,
  testTimeout: 15_000,
} satisfies NonNullable<ViteUserConfig['test']>;
