module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
  },
  extends: [
    'plugin:vue/recommended',
    '@vue/airbnb',
  ],
  rules: {
    'import/extensions': 0,
    'no-restricted-syntax': 0,
    'import/first': 0,
    'import/no-cycle': 'off',
    'import/no-unresolved': 0,
    'import/no-import-module-exports': 'off',
    'no-console': 'off',
    'no-debugger': 'off',
    'no-param-reassign': [2, { props: false }],
    'no-case-declarations': 0,
    indent: ['error', 2],
    'default-case-last': 'off',
    'vue/max-len': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/no-use-v-if-with-v-for': 'off',
    'vue/no-v-html': 'off',
    'vue/html-button-has-type': 'off',
    'vuejs-accessibility/click-events-have-key-events': 'off',
    'vuejs-accessibility/form-control-has-label': 'off',
    'vuejs-accessibility/mouse-events-have-key-events': 'off',
    'arrow-parens': 'off',
  },
  settings: {
    'import/resolver': {
      'babel-plugin-root-import': {
        rootPathPrefix: '@server',
        rootPathSuffix: 'server',
      },
      alias: {
        map: [
          ['@', './src'],
          ['@server', './server'],
          ['shared', './server/shared'],
          ['root', './server'],
        ],
        extensions: ['.js', '.vue', '.json'],
      },
    },
  },
  parserOptions: {
    parser: '@babel/eslint-parser',
    requireConfigFile: false,
    babelOptions: {
      presets: ['@vue/cli-plugin-babel/preset'],
    },
  },
};
