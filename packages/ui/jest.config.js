let baseConfig;
try {
    baseConfig = require('@family-routine/config/jest');
} catch (e) {
    baseConfig = require('../config/jest');
}

module.exports = {
    ...baseConfig,
    rootDir: '.',
    testMatch: [
        '**/*.test.(js|jsx|ts|tsx)',
        '**/tests/**/*.spec.(js|jsx|ts|tsx)',
    ],
    moduleNameMapper: {
        ...baseConfig.moduleNameMapper,
        '^@family-routine/ui/(.*)$': '<rootDir>/$1',
    },
};
