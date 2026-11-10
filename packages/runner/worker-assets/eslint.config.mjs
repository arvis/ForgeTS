import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { process: 'readonly' } },
    rules: { 'no-debugger': 'error' },
  },
);
