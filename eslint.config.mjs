// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const NODE_BUILTINS_MESSAGE =
  'The renderer is untrusted: it must not import Node built-ins or Electron. Use the typed preload API.';

export default defineConfig(
  {
    ignores: [
      'node_modules/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      // Frozen evaluation inputs and planning material are not application code.
      'docs/**',
      'diagrams/**',
      'working-notes/**',
      'scripts/**',
      'github-projects/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.web.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'off',
      '@typescript-eslint/no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // ADR-006: no shell/process execution tools in the MVP.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'child_process', message: 'ADR-006: no process execution in the MVP.' },
            { name: 'node:child_process', message: 'ADR-006: no process execution in the MVP.' },
            { name: 'worker_threads', message: 'Not part of the S1 broker surface.' },
            { name: 'node:worker_threads', message: 'Not part of the S1 broker surface.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/preload/**/*.ts'],
    rules: {
      // Sandboxed preload scripts can only use the Electron renderer modules.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!electron$|\\.{1,2}/).*',
              message: 'Sandboxed preload may only import electron and shared contracts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/renderer/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'electron', message: NODE_BUILTINS_MESSAGE }],
          patterns: [
            { regex: '^node:', message: NODE_BUILTINS_MESSAGE },
            {
              regex: '^(fs|path|os|child_process|net|http|https|crypto|module|process)(/.*)?$',
              message: NODE_BUILTINS_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', '*.config.ts', 'vitest.shared.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
