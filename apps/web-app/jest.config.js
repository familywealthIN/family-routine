module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.vue$': '@vue/vue2-jest',
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(@vue/composition-api|@babel/runtime|@family-routine)/)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@family-routine/ui/(.*)$': '<rootDir>/../../packages/ui/$1',
    '^@family-routine/ui$': '<rootDir>/../../packages/ui/index.js',
    // Pin core-js requests from hoisted @babel/runtime to web-app's local
    // core-js@2 install. Without this, Node resolution finds the root's
    // core-js@3 which doesn't expose the es7.* module paths Babel asks for.
    '^core-js/modules/((?:es[567]|web)\\..+)$': '<rootDir>/node_modules/core-js/modules/$1.js',
    '\\.(css|less|scss|sass)$': 'jest-transform-stub',
    '\\.(jpg|jpeg|png|gif|svg|ttf|woff|woff2)$': 'jest-transform-stub',
  },
  testMatch: [
    '**/tests/unit/**/*.spec.(js|jsx|ts|tsx)',
    '**/__tests__/*.(js|jsx|ts|tsx)',
  ],
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  collectCoverage: false,
  collectCoverageFrom: [
    'src/composables/**/*.js',
    'src/mixins/**/*.js',
    '!src/composables/index.js',
    '!src/composables/graphql/**',
    '!**/node_modules/**',
  ],
  coverageReporters: ['html', 'text', 'lcov', 'text-summary'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
