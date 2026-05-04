module.exports = {
    testEnvironment: 'jsdom',
    moduleFileExtensions: ['js', 'json', 'vue'],
    transform: {
        '^.+\\.vue$': '@vue/vue2-jest',
        '^.+\\.js$': 'babel-jest',
    },
    transformIgnorePatterns: ['/node_modules/(?!(@vue/composition-api|@babel/runtime)/)'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass|styl|stylus)$': 'jest-transform-stub',
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
    coverageReporters: ['html', 'text', 'lcov', 'text-summary'],
};
