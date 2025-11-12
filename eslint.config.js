import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore patterns (e.g., ignore the 'dist' folder)
  {
    ignores: ['**/*.d.ts', 'dist/**'],
  },
  // Base JavaScript recommended rules
  js.configs.recommended,
  // TypeScript recommended rules (targets .ts and .tsx files)
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Custom configuration for React and TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'], // Lint all .ts and .tsx files
    languageOptions: {
      globals: {
        ...globals.browser, // Add browser globals (e.g., window, document)
      },
      ecmaVersion: 2020, // Support modern ECMAScript features
    },
    plugins: {
      'react-hooks': reactHooks, // Rules for React hooks
      'react-refresh': reactRefresh, // Ensure React Refresh compatibility
    },
    rules: {
      // React Hooks recommended rules
      ...reactHooks.configs.recommended.rules,
      // Disable overly strict set-state-in-effect rule (legitimate patterns in our hooks)
      'react-hooks/set-state-in-effect': 'off',
      // React Refresh rule to enforce component exports
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Treat unused variables as warnings instead of errors
      '@typescript-eslint/no-unused-vars': 'warn',
      // Treat 'any' type as a warning instead of an error
      '@typescript-eslint/no-explicit-any': 'warn',
      // Skip unsafe call and member access checks
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      // Additional rules that are helpful but not critical to set as warnings for AI-generated code
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'prefer-const': 'warn',
      'no-console': 'warn',
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
      'no-fallthrough': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-useless-escape': 'warn',
      'react-hooks/purity': 'warn',

      // Add this rule to catch undefined variables
      'no-undef': 'error',
    },
  },
);
