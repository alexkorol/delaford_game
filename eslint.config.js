import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import importPlugin from 'eslint-plugin-import-x';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'build/**'],
  },
  {
    files: ['**/*.js', '**/*.vue'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.vue', '.json'],
        },
        alias: {
          map: [
            ['@', './src'],
            ['@shared', './server/shared'],
            ['@server', './server'],
            ['#server', './server'],
            ['#shared', './server/shared'],
          ],
          extensions: ['.js', '.vue', '.json'],
        },
      },
    },
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^virtual:'] }],
      'import/order': ['error', {
        alphabetize: { order: 'asc', caseInsensitive: true },
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        newlines-between: 'always',
      }],
    },
  },
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
];
