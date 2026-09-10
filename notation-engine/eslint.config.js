// @ts-check
import js from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': js,
    },
    rules: {
      ...js.configs['recommended'].rules,
      ...js.configs['recommended-requiring-type-checking']?.rules,
      // The engine's config objects (Phase 7/48) are meant to be plain data
      // -- no-explicit-any stays off only for the few spots that genuinely
      // need it (documented inline with an eslint-disable comment), not
      // relaxed globally.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'quick-demo/**'],
  },
];
