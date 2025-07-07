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
    "linebreak-style": 0,
    "max-len": ["error", { "code": 150 }],
    "vue/valid-v-for": "off",
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
    },
  ],
  globals: {
    importScripts: true,
  },
};
