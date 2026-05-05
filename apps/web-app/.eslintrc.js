module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended',
    'airbnb-base',
    '@vue/airbnb',
  ],
  parserOptions: {
    parser: 'babel-eslint',
  },
  rules: {
    'no-restricted-globals': 'off',
    'no-alert': 'off',
    'no-console': 'off',
    'linebreak-style': 0,
    'max-len': ['warn', { code: 150 }],
    'vue/valid-v-for': 'off',
    'vue/no-unused-components': 'warn',
    'no-underscore-dangle': 'off',
    'class-methods-use-this': 'off',
    'import/prefer-default-export': 'off',
    'no-restricted-syntax': 'off',
    'no-continue': 'off',
    'import/extensions': 'off',
    'no-useless-escape': 'warn',
    'no-case-declarations': 'warn',
    'import/no-extraneous-dependencies': 'off',
  },
  overrides: [
    {
      files: [
        '**/__tests__/*.{j,t}s?(x)',
        '**/tests/unit/**/*.spec.{j,t}s?(x)',
      ],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-expressions': 'off',
      },
    },
  ],
  globals: {
    importScripts: true,
  },
};
