import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import-x';
import vue from 'eslint-plugin-vue';
import globals from 'globals';

import { createAliasResolver } from './eslint/alias-resolver.js';

const resolverExtensions = ['.js', '.vue', '.json'];
const aliasMap = [
  ['@', './src'],
  ['@shared', './server/shared'],
  ['@server', './server'],
  ['#server', './server'],
  ['#shared', './server/shared'],
];

const aliasResolver = createAliasResolver({
  map: aliasMap,
  extensions: resolverExtensions,
});

const nodeResolver = importPlugin.createNodeResolver({
  extensions: resolverExtensions,
  conditionNames: ['import', 'require', 'default', 'module'],
});

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
      'import-x/resolver': [
        {
          name: 'alias',
          options: {
            map: aliasMap,
            extensions: resolverExtensions,
          },
          resolver: aliasResolver,
        },
        {
          name: 'node',
          options: {
            extensions: resolverExtensions,
            conditionNames: ['import', 'require', 'default', 'module'],
          },
          resolver: nodeResolver,
        },
      ],
    },
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^virtual:'] }],
      'import/order': ['error', {
        alphabetize: { order: 'asc', caseInsensitive: true },
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
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
  {
    files: ['tests/unit/**/*.{js,vue}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
